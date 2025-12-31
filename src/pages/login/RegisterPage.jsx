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
  
  // Diagnostic logging for mobile debugging (stored in sessionStorage)
  React.useEffect(() => {
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      hasUser: !!user,
      hasUserType: !!(user && user.user_type),
      userType: user?.user_type || 'none',
      googleProfileIncomplete: googleProfileIncomplete,
      loading: loading,
      url: window.location.href
    };
    sessionStorage.setItem('registerPageDiagnostic', JSON.stringify(diagnosticData));
  }, [user, loading, googleProfileIncomplete]);
  
  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // Prevent redirect loops by tracking redirect attempts
  React.useEffect(() => {
    const redirectAttempts = parseInt(sessionStorage.getItem('registerRedirectAttempts') || '0', 10);
    if (redirectAttempts > 3) {
      // Too many redirect attempts - clear and allow register form to show
      sessionStorage.removeItem('registerRedirectAttempts');
      console.error('RegisterPage: Too many redirect attempts detected, preventing loop');
    }
  }, []);

  // If user is already logged in AND not in the middle of Google profile completion
  // check for pending redirects (similar to LoginPage)
  // CRITICAL: Also check if user has a valid user_type (prevents redirect loop with incomplete user data)
  if (user && googleProfileIncomplete !== 'true' && user.user_type) {
    const redirectAttempts = parseInt(sessionStorage.getItem('registerRedirectAttempts') || '0', 10);
    
    // Safety check: prevent infinite redirect loops
    if (redirectAttempts > 3) {
      sessionStorage.removeItem('registerRedirectAttempts');
      // Fall through to show register form instead of redirecting
    } else {
      sessionStorage.setItem('registerRedirectAttempts', String(redirectAttempts + 1));
      
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
        sessionStorage.removeItem('registerRedirectAttempts'); // Clear on successful redirect
        const queryParams = new URLSearchParams();
        if (action || pendingAction) queryParams.set('action', action || pendingAction);
        if (id || pendingId) queryParams.set('id', id || pendingId);
        const queryString = queryParams.toString();
        const targetPath = '/provider/all-candidates' + (queryString ? `?${queryString}` : '');
        return <Navigate to={targetPath} replace />;
      }
      
      // If we have job tracking info, redirect to all-jobs
      if ((user.user_type === 'Candidate' || user.user_type === 'Teacher') && redirectUrl === '/available-jobs' && (action || pendingAction) && (id || pendingId)) {
        sessionStorage.removeItem('registerRedirectAttempts'); // Clear on successful redirect
        const queryParams = new URLSearchParams();
        if (action || pendingAction) queryParams.set('action', action || pendingAction);
        if (id || pendingId) queryParams.set('id', id || pendingId);
        const queryString = queryParams.toString();
        const targetPath = '/seeker/all-jobs' + (queryString ? `?${queryString}` : '');
        return <Navigate to={targetPath} replace />;
      }
      
      // Otherwise, redirect to dashboard
      const dashboardPath = getDashboardPath(user);
      if (dashboardPath && dashboardPath !== '/register') {
        sessionStorage.removeItem('registerRedirectAttempts'); // Clear on successful redirect
        return <Navigate to={dashboardPath} replace />;
      } else {
        // Invalid redirect path - clear counter and show form
        sessionStorage.removeItem('registerRedirectAttempts');
      }
    }
  } else {
    // User not logged in or incomplete - clear redirect counter
    sessionStorage.removeItem('registerRedirectAttempts');
  }

  // User is not logged in, show register form (query params will be passed through)
  return (
    <div>
        <Register />
    </div>
  )
}

export default RegisterPage