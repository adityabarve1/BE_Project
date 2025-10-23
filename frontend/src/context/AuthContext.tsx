import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase, getCurrentUser, signIn as apiSignIn, signOut as apiSignOut } from '../services/api';

// Define the User type
type User = {
  id: string;
  email: string;
  name?: string;
  role: 'teacher' | 'student' | 'admin';
} | null;

// Define the context type
interface AuthContextType {
  user: User;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  error: null,
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          // getCurrentUser already fetched user data from /auth/me
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            name: currentUser.full_name || currentUser.name || '',
            role: currentUser.role || 'teacher',
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // User signed in, check if we have the user data
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser({
              id: currentUser.id,
              email: currentUser.email || '',
              name: currentUser.full_name || currentUser.name || '',
              role: currentUser.role || 'teacher',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    // Cleanup function
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use our backend API for sign in
      const data = await apiSignIn(email, password);
      
      // Set user from response
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.full_name || data.user.name || '',
          role: data.user.role || 'teacher',
        });
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use our backend API for sign out
      await apiSignOut();
      
      setUser(null);
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign out');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;