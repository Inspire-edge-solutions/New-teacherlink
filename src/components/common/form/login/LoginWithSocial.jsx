import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FcGoogle } from "react-icons/fc";
import TermsAndPrivacyText from "../../../pages-menu/terms/TermsAndPrivacyText";

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
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [googlePayload, setGooglePayload] = useState(null);
  const [number, setNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [roleError, setRoleError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
        // User exists and is complete - login successful
        toast.success("Login successful!");
        
        // Store user data in localStorage for consistency
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", await user.getIdToken());
        
        // Navigate based on user type
        const userType = data.user.user_type;
        const redirectPath = userType === "Employer"
          ? "/employers-dashboard/dashboard"
          : userType === "Candidate"
            ? "/candidates-dashboard/dashboard"
            : "/";
        
        console.log("Redirecting to:", redirectPath);
        // Close any open login modal/backdrop before navigating
        closeBootstrapModalIfAny();
        navigate(redirectPath);
        
      } else if (data.need_profile) {
        // User exists but profile incomplete - show role selection
        console.log("Profile incomplete, showing role selection");
        // Close any open login modal/backdrop before opening our inline modal
        closeBootstrapModalIfAny();
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
    if (!hasReadTerms || !hasReadPrivacy) return toast.error("Please read Terms & Privacy");

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
    setShowRoleSelection(false);
    setGooglePayload(null);
    setNumber('');
    setSelectedRole('');
    setAcceptedTerms(false);
    setHasReadTerms(false);
    setHasReadPrivacy(false);
    toast.info("Registration cancelled.");
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setNumber(value);
    setPhoneError(value.length === 10 ? '' : 'Enter valid 10-digit number');
  };

  const handleScrollCheck = (e, setter) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 1) setter(true);
  };

  const TermsAndPrivacyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[1000] p-5">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col animate-modalSlideIn">
        <h3 className="m-0 p-5 text-2xl text-gray-800 border-b border-gray-200 text-center rounded-t-lg">
          Terms and Conditions & Privacy Policy
        </h3>
        <div 
          className="p-5 overflow-y-auto flex-1 bg-white" 
          onScroll={(e) => handleScrollCheck(e, setHasReadTerms)}
          style={{ maxHeight: 'calc(80vh - 140px)' }}
        >
          <div>
            <style>{`
              .text-box { margin-bottom: 20px; }
              .text-box h3 { font-size: 18px; margin-bottom: 10px; color: #333; }
              .text-box p { margin-bottom: 15px; line-height: 1.6; color: #666; }
              .text-box h4 { font-size: 15px; color: #666; margin-top: 15px; margin-bottom: 10px; font-weight: 500; }
              .text-box ul { margin-bottom: 15px; padding-left: 20px; }
              .text-box li { margin-bottom: 8px; line-height: 1.6; color: #666; }
              .text-box li a { color: #1967d2; text-decoration: underline; word-break: break-word; display: inline-block; max-width: 100%; }
              .text-box li a:hover { color: #0d47a1; }
            `}</style>
            <TermsAndPrivacyText />
          </div>
        </div>
        <div className="p-4 bg-white border-t border-gray-200 flex justify-center rounded-b-lg">
          <button
            className="w-full min-w-[150px] bg-gradient-brand text-white py-2 sm:py-3 rounded-lg font-medium hover:bg-gradient-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-sm sm:text-base cursor-pointer"
            onClick={() => {
              setShowTermsModal(false);
              setShowPrivacyModal(false);
            }}
            disabled={!hasReadTerms}
          >
            {hasReadTerms ? "I Understand" : "Scroll to read full document"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="btn-box row">
        <div className="col-lg-6 col-md-12">
          <button
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
          >
            {loading ? "Loading..." : <> <FcGoogle style={{ fontSize: "18px" }} /> Log In via Google</>}
          </button>
        </div>
      </div>

      {showRoleSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[1000] p-5">
          <div className="bg-white rounded-lg w-full max-w-lg animate-modalSlideIn">
            <div className="p-6">
              <h4 className="text-xl font-semibold text-gray-800 mb-6 text-center">Complete Your Profile</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {["Employer", "Candidate"].map(role => (
                  <button
                    key={role}
                    className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedRole === role 
                        ? 'bg-gradient-brand text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                    onClick={() => { setSelectedRole(role); setRoleError(''); }}
                    type="button"
                  >
                    {role === 'Employer' ? 'Job Provider' : 'Job Seeker'}
                  </button>
                ))}
              </div>
              {roleError && <div className="text-red-600 text-sm mb-4">{roleError}</div>}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number:</label>
                <input
                  type="tel"
                  value={number}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    phoneError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {phoneError && <div className="text-red-600 text-sm mt-1">{phoneError}</div>}
              </div>
              <div className="mb-6">
                <div className="flex items-start gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="terms-checkbox-google"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      if (e.target.checked && (!hasReadTerms || !hasReadPrivacy)) {
                        toast.error("Please read both Terms & Privacy first");
                        return;
                      }
                      setAcceptedTerms(e.target.checked);
                    }}
                    required
                  />
                  <label htmlFor="terms-checkbox-google" className="text-sm leading-relaxed text-gray-800 cursor-pointer">
                    I have read and agree to the{" "}
                    <span 
                      className="text-blue-600 underline cursor-pointer hover:text-blue-800" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                    >
                      Terms & Conditions and Privacy Policy
                    </span>
                    {" "}of TeacherLink.in{" "}
                    <span className="text-gray-600 text-xs">(A Unit of Inspire Edge Innovation LLP)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 bg-gradient-brand text-white py-3 px-4 rounded-lg font-medium hover:bg-gradient-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                  onClick={handleSubmit}
                  type="button"
                  disabled={loading || !acceptedTerms}
                >
                  {loading ? "Processing..." : "Complete Registration"}
                </button>
                <button
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
                  onClick={handleCancelRegistration}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showTermsModal || showPrivacyModal) && <TermsAndPrivacyModal />}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[1000] p-5">
          <div className="bg-transparent rounded-lg w-full max-w-2xl relative p-0">
            <div className="text-center py-10 px-8 bg-gradient-to-br from-green-400 via-green-300 to-lime-300 rounded-xl relative border-none shadow-2xl animate-modalSlideIn">
              <div className="text-5xl mb-5 animate-bounce">🎉</div>
              <h3 className="text-indigo-900 text-3xl font-bold mb-5 drop-shadow-sm tracking-wide">
                Welcome to TeacherLink! 
                <span className="text-xl mx-1 inline-block animate-successBounce">🌟</span>
              </h3>
              <p className="text-gray-800 text-base font-semibold leading-relaxed mb-8 drop-shadow-sm">
                <span className="text-xl mx-1 inline-block animate-successBounce">🎉</span>
                Your account is ready! <br/> You can now {selectedRole === 'Employer' ? 'You can now start hiring!' : 'Explore all teaching & non-teaching opportunities'}.
                <br/>
                <span className="text-xl mx-1 inline-block animate-successBounce">🚀</span> Your dashboard awaits - let's get started!
              </p>
              <button 
                className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white border-none py-4 px-8 text-base font-semibold rounded-full cursor-pointer transition-all duration-300 uppercase tracking-wide shadow-lg hover:from-blue-800 hover:to-blue-600 hover:-translate-y-0.5 hover:shadow-xl" 
                onClick={() => {
                  const userType = selectedRole;
                  const redirectPath = userType === "Employer"
                    ? "/employers-dashboard/dashboard"
                    : userType === "Candidate"
                      ? "/candidates-dashboard/dashboard"
                      : "/";
                  navigate(redirectPath);
                }}
              >
                Go to Dashboard <span className="text-xl mx-1 inline-block animate-successBounce">🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginWithSocial;