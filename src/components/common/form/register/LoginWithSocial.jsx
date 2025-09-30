import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FcGoogle } from "react-icons/fc";
import '../login/login.css';
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

  // Ensure any Bootstrap modal/backdrop from the login/register popup is fully cleaned up
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
    <div className="modal-overlay">
      <div className="modal-content terms-modal">
        <h3>Terms and Conditions & Privacy Policy</h3>
        <div className="terms-content" onScroll={(e) => handleScrollCheck(e, setHasReadTerms)}>
          <TermsAndPrivacyText />
        </div>
        <div className="modal-actions">
          <button
            className="theme-btn btn-style-one"
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
            className="theme-btn google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
          >
            {loading ? "Loading..." : <> <FcGoogle style={{ marginRight: "8px", fontSize: "18px" }} /> Log In via Google</>}
          </button>
        </div>
      </div>

      {showRoleSelection && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="role-selection-container">
              <h4 className="role-selection-title">Complete Your Profile</h4>
              <div className="btn-box row role-selection-buttons">
                {["Employer", "Candidate"].map(role => (
                  <div className="col-lg-6 col-md-12" key={role}>
                    <button
                      className={`theme-btn ${selectedRole === role ? 'btn-style-two selected' : 'btn-style-three'}`}
                      onClick={() => { setSelectedRole(role); setRoleError(''); }}
                      type="button"
                    >
                      {role === 'Employer' ? 'Job Provider' : 'Job Seeker'}
                    </button>
                  </div>
                ))}
              </div>
              {roleError && <div className="error-message">{roleError}</div>}
              <div className="form-group">
                <label>Mobile Number:</label>
                <input
                  type="tel"
                  value={number}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  className={`phone-input ${phoneError ? 'error' : ''}`}
                  required
                />
                {phoneError && <div className="error-message">{phoneError}</div>}
              </div>
              <div className="form-group terms-checkbox">
                <div className="checkbox-wrapper">
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
                  <label htmlFor="terms-checkbox-google" className="checkbox-label">
                    I have read and agree to the{" "}
                    <span 
                      className="terms-link" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                    >
                      Terms & Conditions and Privacy Policy
                    </span>
                    {" "}of TeacherLink.in{" "}
                    <span className="company-text">(A Unit of Inspire Edge Innovation LLP)</span>
                  </label>
                </div>
              </div>
              <div className="submit-btn-container">
                <button
                  className="theme-btn btn-style-one"
                  onClick={handleSubmit}
                  type="button"
                  disabled={loading || !acceptedTerms}
                >
                  {loading ? "Processing..." : "Complete Registration"}
                </button>
                <button
                  className="theme-btn btn-style-three"
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="success-prompt">
              <h3>
                Welcome to TeacherLink! 
                <span className="success-emoji">🌟</span>
              </h3>
              <p>
                <span className="success-emoji">🎉</span>
                Your account is ready! <br/> You can now {selectedRole === 'Employer' ? 'hire passionate educators' : 'explore rewarding teaching opportunities'}.
                <br/>
                <span className="success-emoji">🚀</span> Your dashboard awaits - let's get started!
              </p>
              <button 
                className="theme-btn btn-style-one" 
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
                Go to Dashboard <span className="success-emoji">🚀</span>
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginWithSocial;