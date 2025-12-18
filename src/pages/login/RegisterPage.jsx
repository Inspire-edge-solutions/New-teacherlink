import React from 'react';
import { useAuth } from '../../Context/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import Register from '../../components/Login/Register';

const getDashboardPath = (user) => {
  if (!user) {
    return null;
  }

  if (user.user_type === 'Employer') {
    return '/provider/dashboard';
  }

  if (user.user_type === 'Candidate' || user.user_type === 'Teacher') {
    return '/seeker/dashboard';
  }

  return '/home';
};

const RegisterPage = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  // CRITICAL: Check if Google profile completion is in progress
  const googleProfileIncomplete = sessionStorage.getItem('googleProfileIncomplete');
  
  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is already logged in AND not in the middle of Google profile completion
  // check for pending redirects (similar to LoginPage)
  if (user && googleProfileIncomplete !== 'true') {
    const redirectUrl = searchParams.get('redirect');
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    
    // Check sessionStorage as backup
    const pendingAction = sessionStorage.getItem('pendingAction') || 
                         (redirectUrl === '/available-candidates' ? sessionStorage.getItem('pendingCandidateAction') : null) ||
                         (redirectUrl === '/available-jobs' ? sessionStorage.getItem('pendingJobAction') : null);
    const pendingId = sessionStorage.getItem('pendingId') || 
                     (redirectUrl === '/available-candidates' ? sessionStorage.getItem('pendingCandidateId') : null) ||
                     (redirectUrl === '/available-jobs' ? sessionStorage.getItem('pendingJobId') : null);
    
    // If we have candidate tracking info, redirect to all-candidates
    if (user.user_type === 'Employer' && redirectUrl === '/available-candidates' && (action || pendingAction) && (id || pendingId)) {
      const queryParams = new URLSearchParams();
      if (action || pendingAction) queryParams.set('action', action || pendingAction);
      if (id || pendingId) queryParams.set('id', id || pendingId);
      const queryString = queryParams.toString();
      const targetPath = '/provider/all-candidates' + (queryString ? `?${queryString}` : '');
      return <Navigate to={targetPath} replace />;
    }
    
    // If we have job tracking info, redirect to all-jobs
    if ((user.user_type === 'Candidate' || user.user_type === 'Teacher') && redirectUrl === '/available-jobs' && (action || pendingAction) && (id || pendingId)) {
      const queryParams = new URLSearchParams();
      if (action || pendingAction) queryParams.set('action', action || pendingAction);
      if (id || pendingId) queryParams.set('id', id || pendingId);
      const queryString = queryParams.toString();
      const targetPath = '/seeker/all-jobs' + (queryString ? `?${queryString}` : '');
      return <Navigate to={targetPath} replace />;
    }
    
    // Otherwise, redirect to dashboard
    const dashboardPath = getDashboardPath(user);
    return <Navigate to={dashboardPath} replace />;
  }

  // User is not logged in, show register form (query params will be passed through)
  return (
    <div>
        <Register />
    </div>
  )
}

export default RegisterPage