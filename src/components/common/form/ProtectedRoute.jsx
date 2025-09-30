import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

export const ProtectedRoute = ({ requiredUserType }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Handle both Teacher and Candidate types for the candidates dashboard
  if (requiredUserType === 'Candidate' && (user.user_type === 'Teacher' || user.user_type === 'Candidate')) {
    return <Outlet />;
  }

  // Handle Employer type
  if (requiredUserType === 'Employer' && user.user_type === 'Employer') {
    return <Outlet />;
  }

  // Only redirect to home if not already in a dashboard route
  if (!location.pathname.includes('dashboard')) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
};