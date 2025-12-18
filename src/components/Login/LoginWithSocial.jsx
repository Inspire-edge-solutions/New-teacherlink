import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FcGoogle } from "react-icons/fc";
import { Skeleton } from "@mui/material";
import TermsPrivacy from "../website/TermsPrivacy";
import LoadingState from "../common/LoadingState";

const GOOGLE_LOGIN_API = "https://ha69bxk1nb.execute-api.ap-south-1.amazonaws.com/dev/google";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let firebaseApp = null;
let firebaseAuth = null;
const googleProvider = new GoogleAuthProvider();

const getFirebaseAuth = () => {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
};

const LoginWithSocial = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requiredUserType = searchParams.get('requiredUserType'); // 'Candidate' or 'Employer'
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [googlePayload, setGooglePayload] = useState(null);
  const [number, setNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  // Initialize selectedRole based on requiredUserType from URL
  const getInitialRole = () => {
    if (requiredUserType === 'Employer') {
      return 'Employer';
    } else if (requiredUserType === 'Candidate') {
      return 'Candidate';
    }
    return 'Candidate'; // Default
  };
  const [selectedRole, setSelectedRole] = useState(() => getInitialRole());
  const [roleError, setRoleError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadTermsAndPrivacy, setHasReadTermsAndPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Reset all component state
  const resetComponentState = () => {
    setShowRoleSelection(false);
    setGooglePayload(null);
    setNumber('');
    setSelectedRole('');
    setRoleError('');
    setPhoneError('');
    setAcceptedTerms(false);
    setHasReadTermsAndPrivacy(false);
    setShowTermsModal(false);
    setShowPrivacyModal(false);
    setShowLoginPrompt(false);
    setLoading(false);
  };

  // Reset state when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Cleanup function - reset state when component unmounts
      resetComponentState();
    };
  }, []);

  // Detect if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
  };

  // Ensure any Bootstrap modal/backdrop from the login popup is fully cleaned up
  const closeBootstrapModalIfAny = () => {
    try {
      const modalElement = document.getElementById('loginPopupModal');
      if (modalElement) {
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        modalElement.setAttribute('aria-hidden', 'true');
      }

      document.body.classList.remove('modal-open');
      if (document.body.style) {
        document.body.style.removeProperty('padding-right');
      }
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((bd) => {
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      });

      // Additional cleanup for mobile devices
      if (isMobile()) {
        // Remove any remaining modal classes
        document.body.classList.remove('modal-open', 'modal-backdrop');
        // Force remove any inline styles that might interfere
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        // Small delay to ensure cleanup is complete
        return new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (_) {
      // no-op
    }
  };

  const cleanUpFirebaseUser = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      await signOut(auth);
    } catch (e) {
      console.warn("Cleanup error:", e.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log("Google sign-in successful:", user.email);

      // Call backend to check login/register status
      const res = await fetch(GOOGLE_LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firebase_uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0]
        }),
      });
      
      const data = await res.json();
      console.log("Backend response:", data);

      if (res.ok && data.success) {
        // Get redirect URL from query params, fallback to sessionStorage
        let redirectUrl = searchParams.get('redirect');
        let requiredUserTypeFromUrl = searchParams.get('requiredUserType') || requiredUserType;
        
        // If not in URL, check sessionStorage
        if (!redirectUrl) {
          // Try to infer from sessionStorage keys
          if (sessionStorage.getItem('pendingCandidateAction') || sessionStorage.getItem('pendingCandidateId')) {
            redirectUrl = '/available-candidates';
            if (!requiredUserTypeFromUrl) requiredUserTypeFromUrl = 'Employer';
          } else if (sessionStorage.getItem('pendingJobAction') || sessionStorage.getItem('pendingJobId')) {
            redirectUrl = '/available-jobs';
            if (!requiredUserTypeFromUrl) requiredUserTypeFromUrl = 'Candidate';
          }
        }
        
        // Validate user type if requiredUserType is specified
        if (requiredUserTypeFromUrl) {
          const userType = data.user.user_type;
          const isValidUserType = 
            (requiredUserTypeFromUrl === 'Candidate' && (userType === 'Candidate' || userType === 'Teacher')) ||
            (requiredUserTypeFromUrl === 'Employer' && userType === 'Employer');
          
          if (!isValidUserType) {
            // Wrong user type - sign out and show error
            const auth = getFirebaseAuth();
            await signOut(auth);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            
            const pageName = requiredUserTypeFromUrl === 'Candidate' ? 'available jobs' : 'available candidates';
            const correctUserType = requiredUserTypeFromUrl === 'Candidate' ? 'Candidate/Teacher' : 'Employer';
            
            toast.error(`This page is only for ${correctUserType} accounts. Please login with the correct account type to access ${pageName}.`);
            
            // Redirect back to the original page
            if (redirectUrl) {
              navigate(redirectUrl);
            } else {
              navigate('/home');
            }
            return;
          }
        }
        
        // User exists and is complete - login successful
        toast.success("Login successful!");
        
        // Store user data in localStorage for consistency
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", await user.getIdToken());
        console.log("User stored in localStorage:", data.user);
        
        // Get action and id from query params, fallback to sessionStorage
        let action = searchParams.get('action');
        let candidateId = searchParams.get('id');
        
        // If not in URL, check sessionStorage
        if (!action || !candidateId) {
          if (redirectUrl === '/available-candidates') {
            action = action || sessionStorage.getItem('pendingCandidateAction') || sessionStorage.getItem('pendingAction');
            candidateId = candidateId || sessionStorage.getItem('pendingCandidateId') || sessionStorage.getItem('pendingId');
          } else if (redirectUrl === '/available-jobs') {
            action = action || sessionStorage.getItem('pendingJobAction') || sessionStorage.getItem('pendingAction');
            candidateId = candidateId || sessionStorage.getItem('pendingJobId') || sessionStorage.getItem('pendingId');
          } else {
            // Generic fallback
            action = action || sessionStorage.getItem('pendingAction');
            candidateId = candidateId || sessionStorage.getItem('pendingId');
          }
        }
        
        console.log("Preserving query params - action:", action, "candidateId:", candidateId, "redirectUrl:", redirectUrl);
        
        // Store candidate/job info in sessionStorage as backup (survives page reloads)
        if (action && candidateId) {
          // Use generic names that work for both candidates and jobs
          sessionStorage.setItem('pendingAction', action);
          sessionStorage.setItem('pendingId', candidateId);
          // Also store type-specific for backward compatibility
          if (redirectUrl === '/available-candidates') {
            sessionStorage.setItem('pendingCandidateAction', action);
            sessionStorage.setItem('pendingCandidateId', candidateId);
          } else if (redirectUrl === '/available-jobs') {
            sessionStorage.setItem('pendingJobAction', action);
            sessionStorage.setItem('pendingJobId', candidateId);
          }
          console.log("Stored tracking info in sessionStorage:", { action, id: candidateId, redirectUrl });
        }
        
        // Determine redirect path
        let redirectPath;
        
        if (redirectUrl && (requiredUserTypeFromUrl || action)) {
          // If we came from a public page and validation passed, redirect to authenticated version
          const userType = data.user.user_type;
          
          // Check if we have tracking info (action and id) - this takes priority
          const hasTrackingInfo = action && candidateId;
          
          if (redirectUrl === '/available-jobs' && (userType === 'Candidate' || userType === 'Teacher')) {
            // Preserve action and id query parameters for job tracking
            const queryParams = new URLSearchParams();
            if (action) queryParams.set('action', action);
            if (candidateId) queryParams.set('id', candidateId); // candidateId is actually jobId in this context
            const queryString = queryParams.toString();
            redirectPath = '/seeker/all-jobs' + (queryString ? `?${queryString}` : '');
            console.log("Redirecting to all-jobs with query params:", redirectPath);
          } else if ((redirectUrl === '/available-candidates' || redirectUrl?.startsWith('/profile/')) && userType === 'Employer' && hasTrackingInfo) {
            // Preserve action and id query parameters for candidate tracking
            // Also handle profile page redirects
            const queryParams = new URLSearchParams();
            if (action) queryParams.set('action', action);
            if (candidateId) queryParams.set('id', candidateId);
            const queryString = queryParams.toString();
            redirectPath = '/provider/all-candidates' + (queryString ? `?${queryString}` : '');
            console.log("Redirecting to all-candidates with query params:", redirectPath);
          } else if (hasTrackingInfo && userType === 'Employer' && requiredUserTypeFromUrl === 'Employer') {
            // If we have tracking info for a candidate but redirectUrl doesn't match, still redirect to all-candidates
            const queryParams = new URLSearchParams();
            if (action) queryParams.set('action', action);
            if (candidateId) queryParams.set('id', candidateId);
            const queryString = queryParams.toString();
            redirectPath = '/provider/all-candidates' + (queryString ? `?${queryString}` : '');
            console.log("Redirecting to all-candidates with tracking info (fallback):", redirectPath);
          } else if (hasTrackingInfo && (userType === 'Candidate' || userType === 'Teacher') && requiredUserTypeFromUrl === 'Candidate') {
            // If we have tracking info for a job but redirectUrl doesn't match, still redirect to all-jobs
            const queryParams = new URLSearchParams();
            if (action) queryParams.set('action', action);
            if (candidateId) queryParams.set('id', candidateId);
            const queryString = queryParams.toString();
            redirectPath = '/seeker/all-jobs' + (queryString ? `?${queryString}` : '');
            console.log("Redirecting to all-jobs with tracking info (fallback):", redirectPath);
          } else {
            // Fallback to dashboard
            redirectPath = userType === "Employer"
              ? "/provider/dashboard"
              : userType === "Candidate"
                ? "/seeker/dashboard"
                : "/";
          }
          console.log("Redirecting to authenticated page:", redirectPath);
        } else {
          // Otherwise, navigate based on user type
          const userType = data.user.user_type;
          redirectPath = userType === "Employer"
            ? "/provider/dashboard"
            : userType === "Candidate"
              ? "/seeker/dashboard"
              : "/";
          console.log("Redirecting to dashboard:", redirectPath);
        }
        // Close any open login modal/backdrop before navigating
        await closeBootstrapModalIfAny();
        
        // Use window.location.href for immediate redirect to prevent LoginPage from intercepting
        // This ensures the redirect happens before AuthContext updates and LoginPage redirects to dashboard
        console.log("Navigating to:", redirectPath);
        window.location.href = redirectPath;
        
      } else if (data.need_profile) {
        // User exists but profile incomplete - show role selection
        console.log("Profile incomplete, showing role selection");
        
        // CRITICAL: Set flag to prevent AuthContext/LoginPage from redirecting
        // This flag tells LoginPage that profile completion is in progress
        sessionStorage.setItem('googleProfileIncomplete', 'true');
        sessionStorage.setItem('googleProfileFirebaseUid', user.uid);
        
        // Store tracking info in sessionStorage before showing role selection
        const redirectUrl = searchParams.get('redirect');
        const action = searchParams.get('action');
        const id = searchParams.get('id');
        let requiredUserTypeFromUrl = searchParams.get('requiredUserType') || requiredUserType;
        
        // Determine role based on redirect URL or requiredUserType
        // If user came from /available-candidates, they should be Employer
        // If user came from /available-jobs, they should be Candidate
        let defaultRole = 'Candidate'; // Default fallback
        if (redirectUrl === '/available-candidates') {
          defaultRole = 'Employer';
          if (!requiredUserTypeFromUrl) requiredUserTypeFromUrl = 'Employer';
        } else if (redirectUrl === '/available-jobs') {
          defaultRole = 'Candidate';
          if (!requiredUserTypeFromUrl) requiredUserTypeFromUrl = 'Candidate';
        } else if (requiredUserTypeFromUrl) {
          // Fallback to requiredUserType from URL
          defaultRole = requiredUserTypeFromUrl;
        }
        
        // Set the selected role based on where user came from
        setSelectedRole(defaultRole);
        console.log("Setting default role based on redirect URL:", { redirectUrl, defaultRole, requiredUserTypeFromUrl });
        
        if (action && id) {
          sessionStorage.setItem('pendingAction', action);
          sessionStorage.setItem('pendingId', id);
          if (redirectUrl === '/available-candidates') {
            sessionStorage.setItem('pendingCandidateAction', action);
            sessionStorage.setItem('pendingCandidateId', id);
          } else if (redirectUrl === '/available-jobs') {
            sessionStorage.setItem('pendingJobAction', action);
            sessionStorage.setItem('pendingJobId', id);
          }
          console.log("Stored tracking info in sessionStorage before role selection:", { action, id, redirectUrl });
        }
        
        // Close any open login modal/backdrop before opening our inline modal
        await closeBootstrapModalIfAny();
        
        // Add small delay for mobile devices
        if (isMobile()) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        setGooglePayload({
          firebase_uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0]
        });
        setShowRoleSelection(true);
      } else {
        // Error case
        throw new Error(data.error || data.message || "Login failed");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      await cleanUpFirebaseUser();
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Ensure role is set (should always be set due to initialization, but double-check)
    if (!selectedRole) {
      setRoleError('Role selection error. Please try again.');
      return;
    }
    
    if (!number || number.length !== 10) return setPhoneError('Enter valid 10-digit number');
    if (!acceptedTerms) return toast.error("Please accept Terms and Conditions");
    if (!hasReadTermsAndPrivacy) return toast.error("Please read Terms & Privacy");

    setLoading(true);
    try {
      const res = await fetch(GOOGLE_LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: googlePayload.firebase_uid,
          email: googlePayload.email,
          name: googlePayload.name,
          phone_number: number,
          user_type: selectedRole,
          term_accepted: 1,
          terms_version: 1,
          privacy_version: 1
        }),
      });
      
      const data = await res.json();
      console.log("Registration response:", data);

      if (res.ok && data.success) {
        // Get redirect URL and required user type from query params
        const redirectUrl = searchParams.get('redirect');
        let requiredUserTypeFromUrl = searchParams.get('requiredUserType') || requiredUserType;
        
        // Infer from sessionStorage if not in URL
        if (!requiredUserTypeFromUrl) {
          if (sessionStorage.getItem('pendingCandidateAction') || sessionStorage.getItem('pendingCandidateId')) {
            requiredUserTypeFromUrl = 'Employer';
          } else if (sessionStorage.getItem('pendingJobAction') || sessionStorage.getItem('pendingJobId')) {
            requiredUserTypeFromUrl = 'Candidate';
          }
        }
        
        // CRITICAL: Validate that registered user type matches required user type
        if (requiredUserTypeFromUrl) {
          const registeredType = selectedRole; // The role user just registered with
          const isValidUserType = 
            (requiredUserTypeFromUrl === 'Candidate' && registeredType === 'Candidate') ||
            (requiredUserTypeFromUrl === 'Employer' && registeredType === 'Employer');
          
          if (!isValidUserType) {
            // Wrong user type registered - show error and clean up
            const pageName = requiredUserTypeFromUrl === 'Candidate' ? 'available jobs' : 'available candidates';
            const correctUserType = requiredUserTypeFromUrl === 'Candidate' ? 'Job Seeker (Candidate)' : 'Job Provider (Employer)';
            
            toast.error(`You registered as ${registeredType === 'Candidate' ? 'Job Seeker' : 'Job Provider'}, but you need to be a ${correctUserType} to access ${pageName}. Please contact support or use a different account.`);
            
            // Clean up
            await cleanUpFirebaseUser();
            sessionStorage.removeItem('googleProfileIncomplete');
            sessionStorage.removeItem('googleProfileFirebaseUid');
            
            setLoading(false);
            setShowRoleSelection(false);
            
            // Redirect back to the original page after a delay
            setTimeout(() => {
              if (redirectUrl) {
                navigate(redirectUrl);
              } else {
                navigate('/home');
              }
            }, 3000);
            return;
          }
        }
        
        setShowRoleSelection(false);
        
        // CRITICAL: Clear the profile incomplete flag after successful registration
        sessionStorage.removeItem('googleProfileIncomplete');
        sessionStorage.removeItem('googleProfileFirebaseUid');
        console.log("Cleared googleProfileIncomplete flag after successful registration");
        
        //toast.success("Registration successful!");
        
        // Send email after successful Google registration
        try {
          await fetch('https://hmpffcv3r3.execute-api.ap-south-1.amazonaws.com/dev/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: googlePayload.name,
              email: googlePayload.email,
              user_type: "Candidate"
            })
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Don't show error to user as registration was successful
        }

        // Send RCS message after successful Google registration
        try {
          await fetch('https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactId: number,
              templateName: "welcom_register",
              sent_by: "Suhas l",
              sent_email: "lsuhas75@gmail.com"
            })
          });
        } catch (rcsError) {
          console.error("RCS sending failed:", rcsError);
          // Don't show error to user as registration was successful
        }
        
        // Store user data in localStorage for consistency
        localStorage.setItem("user", JSON.stringify(data.user));
        
        const auth = getFirebaseAuth();
        if (!auth.currentUser) {
          toast.error("Google authentication failed. Please try logging in again.");
          setLoading(false);
          return;
        }
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem("token", token);
        
        // Ensure tracking info is stored in sessionStorage (in case it wasn't stored earlier)
        // redirectUrl already declared above, reuse it
        const action = searchParams.get('action');
        const id = searchParams.get('id');
        
        if (action && id) {
          sessionStorage.setItem('pendingAction', action);
          sessionStorage.setItem('pendingId', id);
          if (redirectUrl === '/available-candidates') {
            sessionStorage.setItem('pendingCandidateAction', action);
            sessionStorage.setItem('pendingCandidateId', id);
          } else if (redirectUrl === '/available-jobs') {
            sessionStorage.setItem('pendingJobAction', action);
            sessionStorage.setItem('pendingJobId', id);
          }
          console.log("Stored tracking info in sessionStorage after Google registration:", { action, id, redirectUrl });
        }
        
        // Show success modal
        setShowLoginPrompt(true);
        
      } else {
        throw new Error(data.error || data.message || "Registration failed!");
      }
    } catch (error) {
      console.error("Registration error:", error);
      await cleanUpFirebaseUser();
      
      // Clear the profile incomplete flag on error
      sessionStorage.removeItem('googleProfileIncomplete');
      sessionStorage.removeItem('googleProfileFirebaseUid');
      
      toast.error(error.message || "Server error during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    await cleanUpFirebaseUser();
    
    // Clear the profile incomplete flag when user cancels
    sessionStorage.removeItem('googleProfileIncomplete');
    sessionStorage.removeItem('googleProfileFirebaseUid');
    
    resetComponentState();
    toast.info("Registration cancelled.");
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setNumber(value);
    setPhoneError(value.length === 10 ? '' : 'Enter valid 10-digit number');
  };

  // Function to handle terms and privacy modal scroll
  const handleTermsAndPrivacyScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if user has scrolled to bottom
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setHasReadTermsAndPrivacy(true);
    }
  };

  const TermsAndPrivacyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800 leading-tight tracking-tight">Terms and Conditions & Privacy Policy</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6" onScroll={handleTermsAndPrivacyScroll}>
          <TermsPrivacy />
        </div>
        <div className="p-6 border-t bg-gray-50">
          <button
            className="w-full py-3 px-6 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(90deg, #FA5357 0%, #A2035D 100%)' }}
            onClick={() => {
              setShowTermsModal(false);
              setShowPrivacyModal(false);
            }}
            disabled={!hasReadTermsAndPrivacy}
          >
            {hasReadTermsAndPrivacy ? "I Understand" : "Please read the entire document"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {loading && showRoleSelection === false ? (
        // Full-page loading state when Google login is in progress
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="relative w-full max-w-md px-4">
            <LoadingState
              title="Connecting to Google"
              subtitle="We're securely authenticating your account."
              layout="card"
              className="shadow-xl"
            >
              <p className="mt-6 text-sm text-slate-600 text-center">
                One moment while we verify your credentials.
              </p>
            </LoadingState>
          </div>
        </div>
      ) : null}
      
      <div className="w-full">
        <button
          className={`w-full flex items-center justify-center gap-3 py-3 px-6 border-2 transition-all duration-200 font-medium rounded-lg ${
            loading 
              ? 'border-gray-300 text-gray-500 cursor-not-allowed opacity-80' 
              : 'border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'
          }`}
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          aria-live="polite"
        >
          <FcGoogle className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Connecting to Google…' : 'Log In via Google'}
        </button>
      </div>

      {showRoleSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h4 className="text-xl font-semibold text-gray-800 text-center mb-2 leading-tight tracking-tight">Complete Your Profile</h4>
              {requiredUserType && (
                <p className="text-sm text-gray-600 text-center mb-4 leading-normal tracking-tight">
                  Just a few more details to get started!
                </p>
              )}
              
              {/* User Type Selection - Disabled if requiredUserType is present */}
              <div className="flex mb-4 sm:mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => !requiredUserType && setSelectedRole("Candidate")}
                  disabled={requiredUserType && requiredUserType !== 'Candidate'}
                  className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium transition-all duration-200 text-sm sm:text-base ${
                    selectedRole === "Candidate" 
                      ? 'bg-red-200 text-red-600' 
                      : 'bg-transparent text-gray-500'
                  } ${
                    requiredUserType && requiredUserType !== 'Candidate'
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  Job Seeker
                </button>
                <button
                  type="button"
                  onClick={() => !requiredUserType && setSelectedRole("Employer")}
                  disabled={requiredUserType && requiredUserType !== 'Employer'}
                  className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium transition-all duration-200 text-sm sm:text-base ${
                    selectedRole === "Employer" 
                      ? 'bg-red-200 text-red-600' 
                      : 'bg-transparent text-gray-500'
                  } ${
                    requiredUserType && requiredUserType !== 'Employer'
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  Job Provider
                </button>
              </div>

              {roleError && <div className="text-red-500 text-sm mb-4">{roleError}</div>}
              
              {/* Phone Number Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 leading-normal tracking-tight">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={number}
                    onChange={handlePhoneChange}
                    placeholder="+91 x x x x x x x x x x"
                    maxLength="10"
                    className={`w-full py-3 px-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      phoneError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                </div>
                {phoneError && <div className="text-red-500 text-sm mt-1">{phoneError}</div>}
              </div>
              
              {/* Terms and Conditions */}
              <div className="mb-6">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms-checkbox-google"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      if (e.target.checked && (!hasReadTermsAndPrivacy)) {
                        toast.error("Please read Terms & Conditions and Privacy Policy first");
                        e.preventDefault();
                        return;
                      }
                      setAcceptedTerms(e.target.checked);
                    }}
                    className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms-checkbox-google" className="ml-2 text-sm text-gray-600 leading-normal tracking-tight">
                    I have read and agree to the{" "}
                    <span 
                      className="text-pink-600 cursor-pointer hover:underline" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                    >
                      Terms & Conditions and Privacy Policy
                    </span>
                    {" "}of TeacherLink.in{" "}
                    <span className="text-gray-500">(A Unit of Inspire Edge Innovation LLP)</span>
                  </label>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="text-center">
                <button
                  className="py-3 px-8 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, #FA5357 0%, #A2035D 100%)' }}
                  onClick={handleSubmit}
                  type="button"
                  disabled={loading || !acceptedTerms}
                >
                  {loading ? "Processing..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showTermsModal || showPrivacyModal) && <TermsAndPrivacyModal />}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#efe1e1] rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 leading-tight tracking-tight">
                Welcome to TeacherLink! 
                <span className="ml-2">🌟</span>
              </h3>
              <p className="text-base text-gray-600 mb-6 leading-normal tracking-tight">
                <span className="mr-1">🎉</span>
                Your account is ready as a <strong>{selectedRole === 'Employer' ? 'Job Provider' : 'Job Seeker'}</strong>! <br/> 
                You can now {selectedRole === 'Employer' ? 'start hiring qualified educators!' : 'explore all teaching & non-teaching opportunities!'}.
                <br/>
                <span className="mr-1">🚀</span> Your dashboard awaits - let&apos;s get started!
              </p>
              <button 
                className="w-full py-3 px-6 text-white font-medium rounded-lg transition-all duration-200" 
                style={{ background: 'linear-gradient(90deg, #FA5357 0%, #A2035D 100%)' }}
                onClick={async () => {
                  // Get tracking info from URL params or sessionStorage
                  const redirectUrl = searchParams.get('redirect');
                  const action = searchParams.get('action');
                  const id = searchParams.get('id');
                  
                  // Check sessionStorage as backup
                  let trackingAction = action || sessionStorage.getItem('pendingAction') || 
                    (redirectUrl === '/available-candidates' ? sessionStorage.getItem('pendingCandidateAction') : null) ||
                    (redirectUrl === '/available-jobs' ? sessionStorage.getItem('pendingJobAction') : null);
                  let trackingId = id || sessionStorage.getItem('pendingId') || 
                    (redirectUrl === '/available-candidates' ? sessionStorage.getItem('pendingCandidateId') : null) ||
                    (redirectUrl === '/available-jobs' ? sessionStorage.getItem('pendingJobId') : null);
                  
                  const userType = selectedRole;
                  let redirectPath;
                  
                  // If we have tracking info, redirect to the appropriate page with params
                  if (redirectUrl && trackingAction && trackingId) {
                    if (redirectUrl === '/available-jobs' && (userType === 'Candidate' || userType === 'Teacher')) {
                      const queryParams = new URLSearchParams();
                      queryParams.set('action', trackingAction);
                      queryParams.set('id', trackingId);
                      redirectPath = '/seeker/all-jobs?' + queryParams.toString();
                    } else if (redirectUrl === '/available-candidates' && userType === 'Employer') {
                      const queryParams = new URLSearchParams();
                      queryParams.set('action', trackingAction);
                      queryParams.set('id', trackingId);
                      redirectPath = '/provider/all-candidates?' + queryParams.toString();
                    } else {
                      // Fallback to dashboard
                      redirectPath = userType === "Employer"
                        ? "/provider/dashboard"
                        : userType === "Candidate"
                          ? "/seeker/dashboard"
                          : "/";
                    }
                  } else {
                    // No tracking info, go to dashboard
                    redirectPath = userType === "Employer"
                      ? "/provider/dashboard"
                      : userType === "Candidate"
                        ? "/seeker/dashboard"
                        : "/";
                  }
                  
                  // Reset state before navigation
                  resetComponentState();
                  
                  // Add delay for mobile devices
                  if (isMobile()) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                  
                  // Use window.location.href for immediate redirect
                  window.location.href = redirectPath;
                }}
              >
                Go to Dashboard <span className="ml-2">🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginWithSocial;
