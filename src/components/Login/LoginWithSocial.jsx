import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FcGoogle } from "react-icons/fc";
import { Skeleton } from "@mui/material";
import TermsPrivacy from "../website/TermsPrivacy";

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
  const [selectedRole, setSelectedRole] = useState('Candidate');
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
        // Get redirect URL from query params if available
        const redirectUrl = searchParams.get('redirect');
        
        // Validate user type if requiredUserType is specified
        if (requiredUserType) {
          const userType = data.user.user_type;
          const isValidUserType = 
            (requiredUserType === 'Candidate' && (userType === 'Candidate' || userType === 'Teacher')) ||
            (requiredUserType === 'Employer' && userType === 'Employer');
          
          if (!isValidUserType) {
            // Wrong user type - sign out and show error
            const auth = getFirebaseAuth();
            await signOut(auth);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            
            const pageName = requiredUserType === 'Candidate' ? 'available jobs' : 'available candidates';
            const correctUserType = requiredUserType === 'Candidate' ? 'Candidate/Teacher' : 'Employer';
            
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
        
        // Determine redirect path
        let redirectPath;
        if (redirectUrl && requiredUserType) {
          // If we came from a public page and validation passed, redirect to authenticated version
          const userType = data.user.user_type;
          if (redirectUrl === '/available-jobs' && (userType === 'Candidate' || userType === 'Teacher')) {
            redirectPath = '/seeker/all-jobs';
          } else if (redirectUrl === '/available-candidates' && userType === 'Employer') {
            redirectPath = '/provider/all-candidates';
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
        
        // Add small delay for mobile devices to ensure cleanup is complete
        if (isMobile()) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        navigate(redirectPath);
        
      } else if (data.need_profile) {
        // User exists but profile incomplete - show role selection
        console.log("Profile incomplete, showing role selection");
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
    if (!selectedRole) return setRoleError('Please select a role');
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
        setShowRoleSelection(false);
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
        
        // Show success modal
        setShowLoginPrompt(true);
        
      } else {
        throw new Error(data.error || data.message || "Registration failed!");
      }
    } catch (error) {
      console.error("Registration error:", error);
      await cleanUpFirebaseUser();
      toast.error(error.message || "Server error during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    await cleanUpFirebaseUser();
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
            className="w-full py-3 px-6 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
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
      <div className="w-full">
        {loading ? (
          <button
            className="w-full flex items-center justify-center gap-3 py-3 px-6 border-2 border-gray-300 text-gray-500 font-medium rounded-lg transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
            type="button"
            disabled
            aria-live="polite"
          >
            <FcGoogle className="w-5 h-5 animate-pulse" />
            Connecting to Google…
          </button>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-3 py-3 px-6 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
          >
            <FcGoogle className="w-5 h-5" />
            Log In via Google
          </button>
        )}
      </div>

      {showRoleSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h4 className="text-xl font-semibold text-gray-800 text-center mb-6 leading-tight tracking-tight">Complete Your Profile</h4>
              
              {/* Role Selection Buttons
              <div className="flex gap-3 mb-6">
                {["Employer", "Candidate"].map(role => (
                  <button
                    key={role}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedRole === role 
                        ? 'bg-[#f4656a] text-white shadow-md' 
                        : 'bg-[#FFB0B2] text-gray-700 hover:bg-[#FFB0B2] hover:opacity-80'
                    }`}
                    onClick={() => { setSelectedRole(role); setRoleError(''); }}
                    type="button"
                  >
                    {role === 'Employer' ? 'Job Provider' : 'Job Seeker'}
                  </button>
                ))}
              </div> */}
 {/* User Type Selection */}
 <div className="flex mb-4 sm:mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setSelectedRole("Candidate")}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium cursor-pointer transition-all duration-200 text-base leading-normal tracking-tight ${
                selectedRole === "Candidate" 
                  ? 'bg-red-200 text-red-600' 
                  : 'bg-transparent text-gray-500'
              }`}
            >
              Job Seeker
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("Employer")}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium cursor-pointer transition-all duration-200 text-base leading-normal tracking-tight ${
                selectedRole === "Employer" 
                  ? 'bg-red-200 text-red-600' 
                  : 'bg-transparent text-gray-500'
              }`}
            >
              Job Provider
            </button>
          </div>

              {roleError && <div className="text-red-500 text-base mb-4 leading-normal tracking-tight">{roleError}</div>}
              
              {/* Phone Number Input */}
              <div className="mb-6">
                <label className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Phone Number</label>
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
                {phoneError && <div className="text-red-500 text-base mt-1 leading-normal tracking-tight">{phoneError}</div>}
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
                  <label htmlFor="terms-checkbox-google" className="ml-2 text-base text-gray-600 leading-normal tracking-tight">
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
              <h3 className="text-2xl font-bold text-gray-800 mb-4 leading-tight tracking-tight">
                Welcome to TeacherLink! 
                <span className="ml-2">🌟</span>
              </h3>
              <p className="text-gray-600 mb-6 text-lg sm:text-base leading-normal tracking-tight">
                <span className="mr-1">🎉</span>
                Your account is ready! <br/> You can now {selectedRole === 'Employer' ? 'start hiring!' : 'explore all teaching & non-teaching opportunities'}.
                <br/>
                <span className="mr-1">🚀</span> Your dashboard awaits - let&apos;s get started!
              </p>
              <button 
                className="w-full py-3 px-6 text-white font-medium rounded-lg transition-all duration-200 text-base leading-normal tracking-tight" 
                style={{ background: 'linear-gradient(90deg, #FA5357 0%, #A2035D 100%)' }}
                onClick={async () => {
                  const userType = selectedRole;
                  const redirectPath = userType === "Employer"
                    ? "/employers-dashboard/dashboard"
                    : userType === "Candidate"
                      ? "/candidates-dashboard/dashboard"
                      : "/";
                  
                  // Reset state before navigation
                  resetComponentState();
                  
                  // Add delay for mobile devices
                  if (isMobile()) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                  
                  navigate(redirectPath);
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
