import React from "react";
import { useAuth } from "../../Context/AuthContext";
import { Navigate, useSearchParams, useLocation } from "react-router-dom";
import Login from "../../components/Login/LoginForm";

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

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is already logged in, check if there's a pending redirect
  if (user) {
    // Check if there's a redirect URL in query params
    const redirectUrl = searchParams.get('redirect');
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    
    // Check sessionStorage as backup (both generic and type-specific)
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
      console.log('LoginPage: Redirecting to all-candidates with candidate tracking:', targetPath);
      return <Navigate to={targetPath} replace />;
    }
    
    // If we have job tracking info, redirect to all-jobs
    if ((user.user_type === 'Candidate' || user.user_type === 'Teacher') && redirectUrl === '/available-jobs' && (action || pendingAction) && (id || pendingId)) {
      const queryParams = new URLSearchParams();
      if (action || pendingAction) queryParams.set('action', action || pendingAction);
      if (id || pendingId) queryParams.set('id', id || pendingId);
      const queryString = queryParams.toString();
      const targetPath = '/seeker/all-jobs' + (queryString ? `?${queryString}` : '');
      console.log('LoginPage: Redirecting to all-jobs with job tracking:', targetPath);
      return <Navigate to={targetPath} replace />;
    }
    
    // Otherwise, redirect to dashboard
    const dashboardPath = getDashboardPath(user);
    return <Navigate to={dashboardPath} replace />;
  }

  // User is not logged in, show login form
  return (
    <div>
      <Login/>
    </div>
  );
}
