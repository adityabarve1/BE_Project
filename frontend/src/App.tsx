import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import pages
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentList from './pages/StudentList';
import StudentDetail from './pages/StudentDetail';
import DocumentUpload from './pages/DocumentUpload';
import NotFound from './pages/NotFound';

// Import components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Import theme
import theme from './theme';

// Root redirect component
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  return null;
};

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    // Show loading state
    return <div>Loading...</div>;
  }
  
  if (!user) {
    // Redirect to login and remember the page user tried to access
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return <>{children}</>;
};

// Layout component with sidebar and header
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box h="100vh">
      <Sidebar />
      <Box ml={{ base: 0, md: 60 }} transition="all 0.3s">
        <Header />
        <Box as="main" p={4}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with main layout */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <TeacherDashboard />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/students" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <StudentList />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/students/:studentId" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <StudentDetail />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DocumentUpload />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App;