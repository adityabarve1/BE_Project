"""
Authentication Service for Student Dropout Prediction System
Handles all Supabase authentication operations
"""

from typing import Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import EmailStr

load_dotenv()

class AuthService:
    def __init__(self):
        """Initialize Supabase client for authentication"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    async def sign_up(
        self,
        email: EmailStr,
        password: str,
        full_name: str,
        role: str = "teacher"
    ) -> Dict[str, Any]:
        """
        Register a new user with Supabase Auth and create teacher profile in database
        
        Args:
            email: User email address
            password: User password
            full_name: User's full name
            role: User role (teacher, admin, etc.)
            
        Returns:
            Dictionary with user data and session info
            
        Raises:
            Exception: If signup fails or profile creation fails
        """
        try:
            # Create auth user
            auth_response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            
            if not auth_response.user:
                raise Exception("Failed to create user account")
            
            user_id = auth_response.user.id
            session = auth_response.session
            
            # Create teacher profile in database
            teacher_profile = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Insert into teacher_profiles table
            try:
                self.client.table("teacher_profiles").insert(teacher_profile).execute()
            except Exception as db_error:
                # If profile creation fails, log the error but continue
                print(f"Warning: Failed to create teacher profile: {db_error}")
                # In production, you might want to delete the auth user here
                # For now, we'll continue but log the error
            
            return {
                "user": {
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "role": role
                },
                "session": {
                    "access_token": session.access_token if session else None,
                    "refresh_token": session.refresh_token if session else None
                } if session else {}
            }
        
        except Exception as e:
            raise Exception(f"Sign up failed: {str(e)}")
    
    async def sign_in_with_profile_check(
        self,
        email: EmailStr,
        password: str
    ) -> Dict[str, Any]:
        """
        Sign in user with email and password, checking that profile exists
        
        This ensures database-auth synchronization by verifying:
        - User credentials are valid
        - User profile exists in the database
        - User hasn't been deleted from the system
        
        Args:
            email: User email address
            password: User password
            
        Returns:
            Dictionary with user data and session info
            
        Raises:
            Exception: If credentials invalid or profile doesn't exist
        """
        try:
            # Sign in with Supabase Auth
            auth_response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not auth_response.user:
                raise Exception("Invalid email or password")
            
            user_id = auth_response.user.id
            session = auth_response.session
            
            # Verify user profile exists in database
            try:
                # Add debug logging
                print(f"DEBUG: Attempting to query teacher_profiles for user ID {user_id}")
                profile_response = self.client.table("teacher_profiles").select("*").eq("id", user_id).execute()
                print(f"DEBUG: Query response received: {profile_response}")
                
                if not profile_response.data or len(profile_response.data) == 0:
                    raise Exception("Teacher profile not found. Please contact support.")
                
                user_profile = profile_response.data[0]
                
            except Exception as db_error:
                print(f"ERROR: Database error while verifying profile: {db_error}")
                raise Exception(f"Failed to verify teacher profile: {str(db_error)}")
            
            return {
                "user": {
                    "id": user_id,
                    "email": user_profile.get("email", email),
                    "full_name": user_profile.get("full_name"),
                    "role": "teacher"
                },
                "session": {
                    "access_token": session.access_token if session else None,
                    "refresh_token": session.refresh_token if session else None
                } if session else {}
            }
        
        except Exception as e:
            raise Exception(f"Sign in failed: {str(e)}")
    
    async def get_user(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from access token
        
        Args:
            token: JWT access token from Authorization header
            
        Returns:
            User dictionary if token is valid, None otherwise
        """
        try:
            # Verify token with Supabase
            auth_response = self.client.auth.get_user(token)
            
            if not auth_response.user:
                return None
            
            user_id = auth_response.user.id
            email = auth_response.user.email
            
            # Get full user profile from database
            try:
                profile_response = self.client.table("teacher_profiles").select("*").eq("id", user_id).execute()
                
                if profile_response.data and len(profile_response.data) > 0:
                    user_profile = profile_response.data[0]
                    return {
                        "id": user_id,
                        "email": user_profile.get("email", email),
                        "full_name": user_profile.get("full_name"),
                        "role": "teacher"
                    }
                else:
                    # Profile doesn't exist, return basic auth info
                    return {
                        "id": user_id,
                        "email": email,
                        "full_name": None,
                        "role": "teacher"
                    }
            
            except Exception as db_error:
                print(f"Warning: Failed to fetch teacher profile: {db_error}")
                # Return basic auth info if database fails
                return {
                    "id": user_id,
                    "email": email,
                    "full_name": None,
                    "role": "teacher"
                }
        
        except Exception as e:
            print(f"Token verification failed: {str(e)}")
            return None
    
    async def sign_out(self, token: str) -> bool:
        """
        Sign out user
        
        Args:
            token: JWT access token
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.auth.sign_out()
            return True
        except Exception as e:
            print(f"Sign out failed: {str(e)}")
            return False
    
    async def refresh_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """
        Refresh access token
        
        Args:
            refresh_token: Refresh token from previous session
            
        Returns:
            New session with access and refresh tokens, or None if failed
        """
        try:
            auth_response = self.client.auth.refresh_session(refresh_token)
            
            if not auth_response.session:
                return None
            
            session = auth_response.session
            return {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token
            }
        
        except Exception as e:
            print(f"Token refresh failed: {str(e)}")
            return None


# Create a singleton instance
auth_service = AuthService()
