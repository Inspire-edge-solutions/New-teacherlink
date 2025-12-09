import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getFirebaseAuth, getAuthMethods } from "../../firebase";
import { toast } from "react-toastify";
import LoginWithSocial from "./LoginWithSocial";
import { getFirebaseErrorMessage } from "../../utils/firebaseErrorMessages";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { cleanupModals } from "../../utils/modalCleanup";
import InputWithTooltip from "../../services/InputWithTooltip";
import LoadingState from "../common/LoadingState";
import loginImage from "../../assets/login.png";

const API_URL = "https://2u7ec1e22c.execute-api.ap-south-1.amazonaws.com/staging/users";
const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const BLOCK_REASON_API = "https://ripiv6jfrc.execute-api.ap-south-1.amazonaws.com/dev/block_reason";
const USER_ENTRY_API = "https://8ttpxl67x0.execute-api.ap-south-1.amazonaws.com/dev/userEntry";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState("");
  const [blockedTitle, setBlockedTitle] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requiredUserType = searchParams.get('requiredUserType'); // 'Candidate' or 'Employer'

  // ---- Block check function for candidate/institution ----
  const checkIfBlocked = async (firebase_uid, email) => {
    // 1. Check candidate details
    const personalURL = `${PERSONAL_API}?firebase_uid=${encodeURIComponent(firebase_uid)}`;
    try {
      const pRes = await fetch(personalURL);
      if (pRes.ok) {
        const arr = await pRes.json();
        if (Array.isArray(arr) && arr.length > 0) {
          const userData = arr[0];
          if (userData.isBlocked === 1 || userData.isBlocked === "1") {
            // Check block reason API
            const blockReason = await getBlockReason(firebase_uid);
            if (blockReason) {
              setBlockedTitle("⚠ Account Blocked");
              setBlockedMsg(blockReason);
            } else {
              setBlockedTitle("⚠ Account Blocked");
              setBlockedMsg("This account has been blocked due to a violation of our platform policies.\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed.");
            }
            return true;
          }
        }
      }
    } catch (error) {
      console.error("Error checking personal details:", error);
    }

    // 2. Check institution details by email or firebase_uid
    let orgUrl = ORG_API;
    if (firebase_uid) {
      orgUrl += `?firebase_uid=${encodeURIComponent(firebase_uid)}`;
    } else if (email) {
      orgUrl += `?contact_person_email=${encodeURIComponent(email)}`;
    }
    try {
      const oRes = await fetch(orgUrl);
      if (oRes.ok) {
        const arr = await oRes.json();
        if (Array.isArray(arr) && arr.length > 0) {
          // check all orgs (could be multiple)
          const org = arr.find(
            (o) => o.isBlocked === 1 || o.isBlocked === "1"
          );
          if (org) {
            // Check block reason API
            const blockReason = await getBlockReason(firebase_uid);
            if (blockReason) {
              setBlockedTitle("⚠ Account Blocked");
              setBlockedMsg(blockReason);
            } else {
              setBlockedTitle("⚠ Account Blocked");
              setBlockedMsg("This account has been blocked due to a violation of our platform policies.\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed.");
            }
            return true;
          }
        }
      }
    } catch (error) {
      console.error("Error checking organisation details:", error);
    }
    // Not blocked in either table
    return false;
  };



  // ---- Track user login entry ----
  const trackUserEntry = async (firebase_uid) => {
    try {
      // First, check if user entry exists for today
      const checkResponse = await fetch(`${USER_ENTRY_API}?firebase_uid=${encodeURIComponent(firebase_uid)}`);
      
      if (checkResponse.ok) {
        const entries = await checkResponse.json();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check if there's an entry for today
        const todayEntry = entries.find(entry => {
          const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
          return entryDate === today && entry.firebase_uid === firebase_uid;
        });
        
        if (todayEntry) {
          // Entry exists for today, increment the entry value
          const newEntryValue = todayEntry.entry + 1;
          const putResponse = await fetch(USER_ENTRY_API, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              firebase_uid: firebase_uid,
              entry: newEntryValue
            })
          });
          
          if (putResponse.ok) {
            console.log("User entry incremented successfully");
          } else {
            console.error("Failed to increment user entry");
          }
        } else {
          // No entry for today, create new entry with POST
          const postResponse = await fetch(USER_ENTRY_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              firebase_uid: firebase_uid,
              entry: 1
            })
          });
          
          if (postResponse.ok) {
            console.log("New user entry created successfully");
          } else {
            console.error("Failed to create user entry");
          }
        }
      }
    } catch (error) {
      console.error("Error tracking user entry:", error);
      // Don't block login flow if tracking fails
    }
  };

  // ---- Get block reason from API ----
  const getBlockReason = async (firebase_uid) => {
    try {
      const response = await fetch(BLOCK_REASON_API);
      if (response.ok) {
        const blockReasons = await response.json();
        const userBlockReason = blockReasons.find(
          (item) => item.firebase_uid === firebase_uid
        );
        
        if (userBlockReason) {
          if (userBlockReason.other_reason) {
            return `Your candidate profile has been blocked.\n\nFor details, contact us at info@inspireedgesolutions.com \nor \ncall ‪+91 9980333603‬.`;
          } else if (userBlockReason.reason) {
            return `This account has been blocked due to a violation of our platform policies.\n\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed.`;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching block reason:", error);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with email:", email);
    setLoading(true);
    setBlockedMsg("");
    setBlockedTitle("");

    try {
      // Step 1: Get Firebase auth and methods
      const auth = await getFirebaseAuth();
      const { signInWithEmailAndPassword, signOut } = await getAuthMethods();
      
      console.log("Attempting Firebase sign in...");
      // Step 2: Firebase sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase sign in successful");

      // Step 3: Track user login entry
      const firebase_uid = userCredential.user.uid;
      console.log("Tracking user login entry...");
      await trackUserEntry(firebase_uid);

      // Step 4: Block check via /personal and /organisation
      console.log("Checking if user is blocked...");
      const blocked = await checkIfBlocked(firebase_uid, email);

      if (blocked) {
        console.log("User is blocked, signing out...");
        // Sign out so session is cleared
        await signOut(auth);
        setLoading(false);
        return;
      }

      console.log("User is not blocked, proceeding with login...");
      // Step 4: Get auth token, continue as before
      const token = await userCredential.user.getIdToken();
      localStorage.setItem("token", token);

      // Step 5: Fetch user details from your backend
      console.log("Fetching user details from backend...");
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          route: "GetUser",
          email: email,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to retrieve user details");
      }

      console.log("User details fetched successfully:", data);
      
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
      
      console.log("Login redirect params:", { redirectUrl, requiredUserType: requiredUserTypeFromUrl });
      
      // Validate user type if requiredUserType is specified
      if (requiredUserTypeFromUrl) {
        const userType = data.user_type;
        const isValidUserType = 
          (requiredUserTypeFromUrl === 'Candidate' && (userType === 'Candidate' || userType === 'Teacher')) ||
          (requiredUserTypeFromUrl === 'Employer' && userType === 'Employer');
        
        if (!isValidUserType) {
          // Wrong user type - sign out and show error
          const auth = await getFirebaseAuth();
          const { signOut } = await getAuthMethods();
          await signOut(auth);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          
          const pageName = requiredUserTypeFromUrl === 'Candidate' ? 'available jobs' : 'available candidates';
          const correctUserType = requiredUserTypeFromUrl === 'Candidate' ? 'Candidate/Teacher' : 'Employer';
          
          toast.error(`This page is only for ${correctUserType} accounts. Please login with the correct account type to access ${pageName}.`);
          setLoading(false);
          
          // Redirect back to the original page
          if (redirectUrl) {
            navigate(redirectUrl);
          } else {
            navigate('/home');
          }
          return;
        }
      }
      
      // Store user data
      localStorage.setItem("user", JSON.stringify(data));
      console.log("User stored in localStorage:", data);

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
        const userType = data.user_type;
        
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
        const userType = data.user_type;
        redirectPath = userType === "Employer"
          ? "/provider/dashboard"
          : userType === "Candidate"
            ? "/seeker/dashboard"
            : "/";
        console.log("Redirecting to dashboard:", redirectPath);
      }

      // Clean up modal
      const modalElement = document.getElementById('loginPopupModal');
      if (modalElement) {
        modalElement.style.display = 'none';
      }
      
      // Use the utility function to clean up all modal remnants
      cleanupModals();

      // Use window.location.href for immediate redirect to prevent LoginPage from intercepting
      // This ensures the redirect happens before AuthContext updates and LoginPage redirects to dashboard
      console.log("Navigating to:", redirectPath);
      window.location.href = redirectPath;
      // Don't set loading to false - let the new page handle it
    } catch (error) {
      console.error("Login error:", error);
      if (error.code) {
        toast.error(getFirebaseErrorMessage(error.code));
      } else {
        toast.error(error.message || 'Failed to login. Please try again.');
      }
      setLoading(false);
    }
  };

  // ----- Blocked popup -----
  if (blockedMsg) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black bg-opacity-60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
        <div className="bg-white px-4 py-6 rounded-2xl relative z-[10000] max-w-[480px] w-full text-center shadow-[0_20px_40px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] animate-slideIn mx-4 sm:mx-0">
          <button
            onClick={() => {
              setBlockedMsg("");
              setBlockedTitle("");
              navigate("/login");
            }}
            className="absolute top-5 right-5 border-none bg-gradient-to-br from-gray-50 to-gray-200 text-xl cursor-pointer text-gray-500 font-bold w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-gradient-to-br hover:from-gray-200 hover:to-gray-300 hover:scale-105"
          >×</button>
          
          <div className="text-[clamp(2.5rem,8vw,3.5rem)] text-red-600 mb-6 drop-shadow-[0_3px_6px_rgba(220,53,69,0.2)] animate-gentlePulse">⚠</div>
          
          <h2 className="text-xl font-semibold mb-5 text-gray-800 bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent leading-tight tracking-tight">{blockedTitle}</h2>
          
          <div className="text-base leading-normal text-gray-600 whitespace-pre-line text-left bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] mt-2 tracking-tight">
            {blockedMsg}
          </div>
        </div>
      </div>
    );
  }

  // ----- Main login UI -----
  return (
    <div className="flex flex-col lg:flex-row lg:min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {
        loading ? (
          <>
            {/* Left Section - Promotional (Still visible during loading) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 w-32 h-32 bg-red-500 rounded-full"></div>
                <div className="absolute bottom-20 right-20 w-24 h-24 bg-red-400 rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-red-300 rounded-full"></div>
              </div>
              
              {/* Content */}
              <div className="flex flex-col justify-center px-12 py-16 relative z-10">
                <div className="space-y-6">
                  <h1 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
                    Welcome Back!
                  </h1>
                  <div className="space-y-4">
                    <p className="text-base text-gray-700 leading-normal tracking-tight">
                      Continue your journey with us and connect with qualified educators and professionals effortlessly!
                    </p>
                  </div>
                </div>
                
                {/* Illustration */}
                <div className="mt-10 relative">
                  <div className="w-80 h-64 bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-white">
                    <img 
                      src={loginImage} 
                      alt="Education professionals connecting" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Enhanced Loading Experience */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-3 sm:px-6 md:px-8 py-8 sm:py-12 lg:py-6 lg:pt-8 lg:pb-6 relative lg:rounded-tl-[3rem] lg:rounded-bl-[3rem] overflow-hidden lg:border-l-4 lg:border-t-4 lg:border-b-4 border-red-300 shadow-lg">
              <div className="relative w-full max-w-md">
                <LoadingState
                  title="Hold tight user!"
                  subtitle="We’re opening your Teacherlink dashboard right now."
                  layout="card"
                  className="shadow-xl"
                >
                  <p className="mt-6 text-sm text-slate-600 text-center">
                    One moment while we prepare your workspace.
                  </p>
                </LoadingState>
              </div>
            </div>
          </>
        ) : 
        <>
      
      {/* Left Section - Promotional */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-red-500 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-red-400 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-red-300 rounded-full"></div>
        </div>
        
        {/* Content */}
        <div className="flex flex-col justify-center px-12 py-16 relative z-10">
          <div className="space-y-6">
            <h1 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
              Welcome Back!
            </h1>
            <div className="space-y-4">
             
              <p className="text-base text-gray-700 leading-normal tracking-tight">
                Continue your journey with us and connect with qualified educators and professionals effortlessly!
              </p>
            </div>
          </div>
          
          {/* Illustration */}
          <div className="mt-10 relative">
            <div className="w-80 h-64 bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-white">
              <img 
                src={loginImage} 
                alt="Education professionals connecting" 
                className="w-full h-full object-cover"
              />
            </div>
           
          </div>
        </div>
      </div>

        {/* Right Section - Login Form */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center px-3 sm:px-6 md:px-8 py-8 sm:py-12 lg:py-6 lg:pt-8 lg:pb-6 relative lg:rounded-tl-[3rem] lg:rounded-bl-[3rem] overflow-hidden lg:border-l-4 lg:border-t-4 lg:border-b-4 border-red-300 shadow-lg">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
          <h2 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent mb-4 sm:mb-6 text-center lg:text-left leading-tight tracking-tight">Login</h2>
          
          <form onSubmit={handleSubmit} className="space-y-12 sm:space-y-8 md:space-y-8">
            {/* Email Field */}
            <InputWithTooltip label="Email" required>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  placeholder=" Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 border-gray-300 focus:border-red-500 focus:outline-none text-base placeholder-black"
                />
              </div>
            </InputWithTooltip>

            {/* Password Field */}
            <InputWithTooltip label="Password" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder=" Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 border-gray-300 focus:border-red-500 focus:outline-none text-base placeholder-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-3 sm:top-4 md:top-5 text-gray-500 hover:text-gray-700 text-xl sm:text-2xl md:text-3xl"
                >
                  {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                </button>
              </div>
            </InputWithTooltip>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-medium bg-gradient-brand hover:bg-gradient-primary-hover py-3 sm:py-8 sm:px-8 md:py-5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 text-base"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 sm:mt-6 mb-8 md:mt-8 text-center">
            <span className="text-gray-600 text-base leading-normal tracking-tight">Forgot Password? </span>
            <Link
              to="/forget-password"
              onClick={() => {
                const modalElement = document.getElementById('loginPopupModal');
                if (modalElement) {
                  modalElement.style.display = 'none';
                }
                cleanupModals();
              }}
              className="text-red-500 font-semibold hover:text-red-600 text-base leading-normal tracking-tight"
            >
              Click here to Change Password
            </Link>
          </div>

          {/* Signup Link */}
          <div className="mt-4 sm:mt-6 md:mt-8 text-center">
            <span className="text-gray-600 text-base leading-normal tracking-tight">Don't have an account? </span>
            <Link
              to={(() => {
                // Preserve query parameters when navigating to register
                const redirect = searchParams.get('redirect');
                const action = searchParams.get('action');
                const id = searchParams.get('id');
                const requiredUserType = searchParams.get('requiredUserType');
                
                const params = new URLSearchParams();
                if (redirect) params.set('redirect', redirect);
                if (action) params.set('action', action);
                if (id) params.set('id', id);
                if (requiredUserType) params.set('requiredUserType', requiredUserType);
                
                const queryString = params.toString();
                return '/register' + (queryString ? `?${queryString}` : '');
              })()}
              onClick={() => {
                const modalElement = document.getElementById('loginPopupModal');
                if (modalElement) {
                  modalElement.style.display = 'none';
                }
                cleanupModals();
              }}
              className="text-red-500 font-semibold hover:text-red-600 text-base leading-normal tracking-tight"
            >
              Signup Here
            </Link>
          </div>

         

          {/* Google Sign In */}
          <div className="mt-6 sm:mt-8 mb-6 md:mt-10">
            {/* <button className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 sm:py-4 md:py-5 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 text-sm sm:text-base md:text-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign up with Google</span>
            </button> */}
             <LoginWithSocial />
          </div>
        </div>
      </div>
      </>
      }
    </div>
  );
};

export default LoginForm;