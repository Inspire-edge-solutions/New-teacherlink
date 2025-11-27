import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../Context/AuthContext.jsx';

/**
 * RootRedirect - Handles root route (/) redirect
 * - Logged-in users → their dashboard
 * - Non-logged-in users → /home
 */
const getDashboardPath = (user) => {
  if (!user) {
    return '/home';
  }

  if (user.user_type === 'Employer') {
    return '/provider/dashboard';
  }

  if (user.user_type === 'Candidate' || user.user_type === 'Teacher') {
    return '/seeker/dashboard';
  }

  return '/home';
};

export const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const redirectPath = getDashboardPath(user);
  return <Navigate to={redirectPath} replace />;
};

