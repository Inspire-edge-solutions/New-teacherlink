import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFirebaseAuth, getAuthMethods } from "../../../../firebase";
import { toast } from "react-toastify";
import LoginWithSocial from "./LoginWithSocial";
import { getFirebaseErrorMessage } from "../../../../utils/firebaseErrorMessages";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { cleanupModals } from "../../../../utils/modalCleanup";

const API_URL = "https://2u7ec1e22c.execute-api.ap-south-1.amazonaws.com/staging/users";
const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const BLOCK_REASON_API = "https://ripiv6jfrc.execute-api.ap-south-1.amazonaws.com/dev/block_reason";
const USER_ENTRY_API = "https://8ttpxl67x0.execute-api.ap-south-1.amazonaws.com/dev/userEntry";

const FormContent = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState("");
  const [blockedTitle, setBlockedTitle] = useState("");
  const navigate = useNavigate();

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
      // Store user data
      localStorage.setItem("user", JSON.stringify(data));

      // Navigate based on user type
      const userType = data.user_type;
      const redirectPath = userType === "Employer"
        ? "/employers-dashboard/dashboard"
        : userType === "Candidate"
          ? "/candidates-dashboard/dashboard"
          : "/";

      console.log("Redirecting to:", redirectPath);

      // Clean up modal
      const modalElement = document.getElementById('loginPopupModal');
      if (modalElement) {
        modalElement.style.display = 'none';
      }
      
      // Use the utility function to clean up all modal remnants
      cleanupModals();

      navigate(redirectPath);
    } catch (error) {
      console.error("Login error:", error);
      if (error.code) {
        toast.error(getFirebaseErrorMessage(error.code));
      } else {
        toast.error(error.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ----- Blocked popup -----
  if (blockedMsg) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black bg-opacity-60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
        <div className="bg-white p-8 rounded-2xl relative z-[10000] max-w-[480px] w-full text-center shadow-2xl border border-white border-opacity-10 animate-[slideIn_0.3s_ease-out]">
          <button
            onClick={() => {
              setBlockedMsg("");
              setBlockedTitle("");
              navigate("/login");
            }}
            className="absolute top-5 right-5 border-none bg-gradient-to-br from-gray-50 to-gray-200 text-xl cursor-pointer text-gray-500 font-bold w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:bg-gradient-to-br hover:from-gray-200 hover:to-gray-300 hover:scale-105"
          >×</button>
          
          <div className="text-6xl text-red-500 mb-6 drop-shadow-lg animate-[gentlePulse_3s_infinite]">⚠</div>
          
          <h2 className="text-2xl mb-5 text-gray-900 font-bold bg-gradient-to-br from-red-500 to-red-600 bg-clip-text text-transparent">
            {blockedTitle}
          </h2>
          
          <div className="text-lg leading-relaxed text-gray-600 whitespace-pre-line text-left bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner mt-2">
            {blockedMsg}
          </div>
        </div>
      </div>
    );
  }

  // ----- Main login UI -----
  return (
    <div className="form-inner">
      <h3>Login to TeacherLink</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="input-wrapper">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <span className="custom-tooltip">Email</span>
          </div>
        </div>

        <div className="form-group">
          <div className="input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-xl text-black"
            >
              {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
            </span>
            <span className="custom-tooltip">Password</span>
          </div>
        </div>

        <div className="form-group">
          <button
            className="theme-btn btn-style-one"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>
      </form>

      <div className="text">
        Forgot Password? <Link to="/forgetpassword">Click here to Change Password </Link>
      </div>
      <div className="bottom-box">
        <div className="text">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            onClick={() => {
              // Close the modal before navigation
              const modalElement = document.getElementById('loginPopupModal');
              if (modalElement) {
                modalElement.style.display = 'none';
              }
              // Use the utility function to clean up all modal remnants
              cleanupModals();
            }}
          >
            Signup
          </Link>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <LoginWithSocial />
      </div>
    </div>
  );
};

export default FormContent;