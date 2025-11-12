import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../Context/AuthContext.jsx';

const getDefaultRedirect = (user) => {
  if (!user) {
    return '/';
  }

  if (user.user_type === 'Employer') {
    return '/provider/dashboard';
  }

  if (user.user_type === 'Candidate' || user.user_type === 'Teacher') {
    return '/seeker/dashboard';
  }

  return '/';
};

export const ProtectedRoute = ({ requiredUserType }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/home" state={{ from: location }} replace />;
  }

  if (requiredUserType === 'Candidate') {
    if (user.user_type === 'Candidate' || user.user_type === 'Teacher') {
      return <Outlet />;
    }
    return <Navigate to={getDefaultRedirect(user)} replace />;
  }

  if (requiredUserType === 'Employer') {
    if (user.user_type === 'Employer') {
      return <Outlet />;
    }
    return <Navigate to={getDefaultRedirect(user)} replace />;
  }

  return <Outlet />;
};