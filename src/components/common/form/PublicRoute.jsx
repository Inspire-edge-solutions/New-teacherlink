import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../Context/AuthContext.jsx';

/**
 * PublicRoute - Redirects authenticated users to their dashboard
 * Use this for routes that should only be accessible to non-authenticated users (like login, register)
 */
const getDashboardPath = (user) => {
  if (!user) {
    return null; // No redirect needed
  }

  if (user.user_type === 'Employer') {
    return '/provider/dashboard';
  }

  if (user.user_type === 'Candidate' || user.user_type === 'Teacher') {
    return '/seeker/dashboard';
  }

  return '/home';
};

export const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is logged in, redirect to their dashboard
  if (user) {
    const dashboardPath = getDashboardPath(user);
    return <Navigate to={dashboardPath} replace />;
  }

  // User is not logged in, show the public route content
  return children ? children : <Outlet />;
};

