import React from "react";
import { useAuth } from "../../Context/AuthContext";
import { Navigate } from "react-router-dom";
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

  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is already logged in, redirect to their dashboard
  if (user) {
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
