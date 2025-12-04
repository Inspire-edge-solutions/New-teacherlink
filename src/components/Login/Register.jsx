import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { Skeleton } from "@mui/material";
import TermsPrivacy from "../website/TermsPrivacy";
import LoginWithSocial from "./LoginWithSocial";
import InputWithTooltip from "../../services/InputWithTooltip";
import LoadingState from "../common/LoadingState";
import loginImage from "../../assets/login.png";

// Terms and Privacy Policy version tracking
const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const Register = ({ user_type }) => {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const requiredUserType = searchParams.get('requiredUserType');
  
  // Determine initial user type based on URL parameter
  const getInitialUserType = () => {
    // First check requiredUserType (from available-jobs/available-candidates pages)
    if (requiredUserType === 'Candidate') {
      return "Job Seeker";
    } else if (requiredUserType === 'Employer') {
      return "Job Provider";
    }
    
    // Fallback to role parameter (for backward compatibility)
    if (roleFromUrl === 'job-seeker') {
      return "Job Seeker";
    } else if (roleFromUrl === 'job-provider') {
      return "Job Provider";
    }
    
    return "Job Seeker"; // Default
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [number, setNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [phoneValidation, setPhoneValidation] = useState({
    isValid: false,
    length: false,
    onlyNumbers: false
  });
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState(() => getInitialUserType());
  const navigate = useNavigate();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadTermsAndPrivacy, setHasReadTermsAndPrivacy] = useState(false);

  // Update user type when URL parameter changes
  useEffect(() => {
    if (roleFromUrl === 'job-seeker') {
      setSelectedUserType("Job Seeker");
    } else if (roleFromUrl === 'job-provider') {
      setSelectedUserType("Job Provider");
    }
  }, [roleFromUrl]);

  const getWelcomeText = () => {
    if (selectedUserType === "Job Seeker") {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
            Looking for a teaching or non-teaching job in educational institutions?
          </h1>
          <h2 className="text-2xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
            You're in the right place!
          </h2>
          <p className="text-lg text-gray-700 leading-normal tracking-tight">
            Create your account today and unlock endless opportunities in the education sector! 🚀
          </p>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
            Looking to hire top talent for your educational institution?
          </h1>
          <h2 className="text-2xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
            You're in the right place!
          </h2>
          <p className="text-lg text-gray-700 leading-normal tracking-tight">
            Create your account today and connect with qualified educators and professionals effortlessly! 🎯
          </p>
        </div>
      );
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setHasStartedTyping(true);
  };

  const handlePhoneChange = (e) => {
    const newNumber = e.target.value.replace(/[^0-9]/g, "");
    setNumber(newNumber);
    setHasStartedTyping(true);
    
    setPhoneValidation({
      length: newNumber.length === 10,
      onlyNumbers: /^\d+$/.test(newNumber),
      isValid: newNumber.length === 10 && /^\d+$/.test(newNumber)
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (number.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the Terms and Conditions to proceed.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'https://s8vhnlhoc2.execute-api.ap-south-1.amazonaws.com/dev/register',
        {
          name,
          email,
          password,
          number,
          user_type: selectedUserType === "Job Seeker" ? "Candidate" : "Employer",
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      // Handle successful registration
      if (response.status === 201) {
        setShowLoginPrompt(true);
      }
    } catch (error) {
      console.error("Registration Error:", error);
      
      if (error.response) {
        // Backend returned an error response
        const errorMessage = error.response.data?.error || error.response.data?.message || 
        "Registration failed. Please try again.";
        toast.error(errorMessage);
      } else if (error.request) {
        // Network error
        toast.error("No response from server. Please try again.");
      } else {
        // Other error
        toast.error(error.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getMissingPhoneRequirements = () => {
    const missing = [];
    
    if (!phoneValidation.length) {
      missing.push("Must be exactly 10 digits");
    }
    if (!phoneValidation.onlyNumbers) {
      missing.push("Must contain only numbers");
    }
    
    return missing;
  };

  // Function to handle terms and privacy modal scroll
  const handleTermsAndPrivacyScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if user has scrolled to bottom
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setHasReadTermsAndPrivacy(true);
    }
  };

  // Combined Terms and Privacy Modal Component
  const TermsAndPrivacyModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-2 sm:p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 max-w-4xl max-h-[90vh] w-full flex flex-col">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-center bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
          Terms and Conditions & Privacy Policy
        </h3>
        <div 
          className="flex-1 overflow-y-auto p-2 sm:p-4 border border-gray-200 rounded-lg mb-4"
          onScroll={handleTermsAndPrivacyScroll}
        >
          <TermsPrivacy />
        </div>
        <div className="text-center">
          <button 
            className={`text-white border-none rounded-lg px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors duration-200 ${
              hasReadTermsAndPrivacy 
                ? 'bg-gradient-brand cursor-pointer hover:opacity-90' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
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
    <div className="flex flex-col lg:flex-row lg:min-h-screen font-sans">
      {loading ? (
        <>
          {/* Left Section - Promotional (Still visible during loading) */}
          <div className="hidden lg:flex lg:flex-[1.2] bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden justify-center p-8">
            {/* Decorative shapes */}
            <div className="absolute top-[10%] right-[10%] w-15 h-15 bg-pink-200/30 rounded-full rotate-45"></div>
            <div className="absolute bottom-[20%] left-[5%] w-10 h-10 bg-gray-300/40" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
            <div className="absolute top-[30%] left-[15%] w-8 h-8 bg-pink-200/20 rotate-45"></div>

            {/* Content */}
            <div className="z-10 relative flex flex-col justify-center items-center h-full space-y-8">
              {/* Welcome Text */}
              <div className="text-center max-w-lg">
                {getWelcomeText()}
              </div>
              
              {/* Login Image */}
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden p-4">
                <img 
                  src={loginImage} 
                  alt="Login Illustration" 
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
            
              {/* Additional Info */}
              <div className="text-center max-w-lg">
                <p className="text-lg text-gray-600 leading-normal tracking-tight">
                  Join thousands of educators and institutions who trust TeacherLink for their career and hiring needs.
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Enhanced Loading Experience */}
          <div className="w-full lg:flex-1 bg-white flex items-center justify-center px-3 sm:px-4 md:px-6 py-8 sm:py-12 lg:py-6 lg:pt-8 lg:pb-6 relative lg:rounded-tl-[3rem] lg:rounded-bl-[3rem] overflow-hidden lg:border-l-4 lg:border-t-4 lg:border-b-4 border-red-300 shadow-lg lg:-ml-12">
            <div className="relative w-full max-w-md">
              <LoadingState
                title="Creating your account!"
                subtitle="We're setting up your TeacherLink profile right now."
                layout="card"
                className="shadow-xl"
              >
                <p className="mt-6 text-sm text-slate-600 text-center">
                  One moment while we prepare your account.
                </p>
              </LoadingState>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Left Section - Promotional */}
          <div className="hidden lg:flex lg:flex-[1.2] bg-gradient-to-br from-red-50 to-red-100 relative overflow-hidden justify-center p-8">
            {/* Decorative shapes */}
            <div className="absolute top-[10%] right-[10%] w-15 h-15 bg-pink-200/30 rounded-full rotate-45"></div>
            <div className="absolute bottom-[20%] left-[5%] w-10 h-10 bg-gray-300/40" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
            <div className="absolute top-[30%] left-[15%] w-8 h-8 bg-pink-200/20 rotate-45"></div>

            {/* Content */}
            <div className="z-10 relative flex flex-col justify-center items-center h-full space-y-8">
              {/* Welcome Text */}
              <div className="text-center max-w-lg">
                {getWelcomeText()}
              </div>
              
              {/* Login Image */}
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden p-4">
                <img 
                  src={loginImage} 
                  alt="Login Illustration" 
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
            
              {/* Additional Info */}
              <div className="text-center max-w-lg">
                <p className="text-lg text-gray-600 leading-normal tracking-tight">
                  Join thousands of educators and institutions who trust TeacherLink for their career and hiring needs.
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Form */}
          <div className="w-full lg:flex-1 bg-white flex items-center justify-center px-3 sm:px-4 md:px-6 py-8 sm:py-12 lg:py-6 lg:pt-8 lg:pb-6 relative lg:rounded-tl-[3rem] lg:rounded-bl-[3rem] overflow-hidden lg:border-l-4 lg:border-t-4 lg:border-b-4 border-red-300 shadow-lg lg:-ml-12">
            {/* Form Container */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-white p-3 sm:p-4 md:p-6 relative">

            <h2 className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 sm:mb-6 text-center leading-tight tracking-tight">
              Create Account
            </h2>

          {/* User Type Selection */}
          <div className="flex mb-4 sm:mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setSelectedUserType("Job Seeker")}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium cursor-pointer transition-all duration-200 text-base leading-normal tracking-tight ${
                selectedUserType === "Job Seeker" 
                  ? 'bg-red-200 text-red-600' 
                  : 'bg-transparent text-gray-500'
              }`}
            >
              Job Seeker
            </button>
            <button
              type="button"
              onClick={() => setSelectedUserType("Job Provider")}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none rounded-md font-medium cursor-pointer transition-all duration-200 text-base leading-normal tracking-tight ${
                selectedUserType === "Job Provider" 
                  ? 'bg-red-200 text-red-600' 
                  : 'bg-transparent text-gray-500'
              }`}
            >
              Job Provider
            </button>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4 sm:gap-6 md:gap-8">
            {/* Full Name */}
            <InputWithTooltip label="Full Name" required>
              <div className="relative">
                <input
                  type="text"
                  placeholder=" Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full py-3 sm:py-4 md:py-5 border-b-2 border-gray-300 bg-transparent text-base outline-none transition-colors duration-200 focus:border-red-600 placeholder:text-black leading-normal tracking-tight"
                />
              </div>
            </InputWithTooltip>

            {/* Email */}
            <InputWithTooltip label="Email" required>
              <div className="relative">
                <input
                  type="email"
                  placeholder=" Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full py-3 sm:py-4 md:py-5 border-b-2 border-gray-300 bg-transparent text-base outline-none transition-colors duration-200 focus:border-red-600 placeholder:text-black leading-normal tracking-tight"
                />
              </div>
            </InputWithTooltip>

            {/* Password */}
            <InputWithTooltip label="Password" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder=" Password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="w-full py-3 sm:py-4 md:py-5 pr-10 border-b-2 border-gray-300 bg-transparent text-sm sm:text-base md:text-lg outline-none transition-colors duration-200 focus:border-red-600 placeholder:text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-gray-500 text-xl"
                >
                  {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                </button>
              </div>
            </InputWithTooltip>

            {/* Phone Number */}
            <InputWithTooltip label="Mobile Number" required>
              <div className="relative">
                <input
                  type="tel"
                  placeholder=" Mobile Number (10 digits)"
                  value={number}
                  onChange={handlePhoneChange}
                  required
                  minLength={10}
                  maxLength={10}
                  className="w-full py-3 sm:py-4 md:py-5 border-b-2 border-gray-300 bg-transparent text-base outline-none transition-colors duration-200 focus:border-red-600 placeholder:text-black leading-normal tracking-tight"
                  onFocus={() => setShowPhoneValidation(true)}
                  onBlur={() => setShowPhoneValidation(false)}
                />
                {showPhoneValidation && hasStartedTyping && !phoneValidation.isValid && (
                  <div className="absolute top-full left-0 right-0 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-600 z-10">
                    <div className="font-semibold mb-1">
                      Phone number requirements:
                    </div>
                    {getMissingPhoneRequirements().map((requirement, index) => (
                      <div key={index} className="text-red-600">
                        • {requirement}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </InputWithTooltip>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  if (e.target.checked && (!hasReadTermsAndPrivacy)) {
                    toast.error("Please read Terms & Conditions and Privacy Policy first");
                    e.preventDefault();
                    return;
                  }
                  setAcceptedTerms(e.target.checked);
                }}
                required
                className="mt-1"
              />
              <label htmlFor="terms-checkbox" className="text-base text-black-500 leading-normal tracking-tight">
                I agree to the{" "}
                <span
                  className="text-red-600 cursor-pointer underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTermsModal(true);
                  }}
                >
                  Terms & Conditions and privacy policy
                </span>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className={`w-full py-3 sm:py-3.5 md:py-4 text-white border-none rounded-lg text-base font-semibold transition-colors duration-200 leading-normal tracking-tight ${
                loading || !acceptedTerms 
                  ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                  : 'bg-gradient-brand hover:opacity-90 cursor-pointer'
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-4 sm:mt-6 md:mt-8">
            <span className="text-black-500 text-lg sm:text-base leading-normal tracking-tight">
              Already have an account?{" "}
            </span>
            <Link
              to="/login"
              className="text-red-600 no-underline font-medium text-base leading-normal tracking-tight"
            >
              Login
            </Link>
          </div>

          {/* Google Sign Up */}
          <div className="mt-4 sm:mt-6 md:mt-8">
            {/* <button
              type="button"
              className="w-full py-3 sm:py-3.5 md:py-4 bg-white text-black-700 border border-gray-300 rounded-lg text-xs sm:text-sm md:text-base font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors duration-200 hover:border-gray-400"
            >
              <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              Sign up with Google
            </button> */}
            <LoginWithSocial />
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modals */}
      {(showTermsModal || showPrivacyModal) && <TermsAndPrivacyModal />}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-[#F0D8D9] rounded-xl p-4 sm:p-6 md:p-8 max-w-md w-full text-center">
            <h3 className="text-xl font-bold mb-4 leading-tight tracking-tight">
              Welcome to TeacherLink! 🌟
            </h3>
            <p className="text-gray-900 mb-4 sm:mb-6 leading-normal tracking-tight text-lg sm:text-base">
              🎉 Your account is ready. <br/> 
              Hire passionate educators or explore rewarding teaching opportunities. <br/>
              🚀 Log in now to continue your journey.
            </p>
            <button
              onClick={() => {
                // Preserve query parameters when redirecting to login
                const redirect = searchParams.get('redirect');
                const action = searchParams.get('action');
                const id = searchParams.get('id');
                const requiredUserType = searchParams.get('requiredUserType');
                
                // Build login URL with preserved params
                const params = new URLSearchParams();
                if (redirect) params.set('redirect', redirect);
                if (action) params.set('action', action);
                if (id) params.set('id', id);
                if (requiredUserType) params.set('requiredUserType', requiredUserType);
                
                // Also store in sessionStorage as backup
                if (action && id) {
                  sessionStorage.setItem('pendingAction', action);
                  sessionStorage.setItem('pendingId', id);
                  if (redirect === '/available-candidates') {
                    sessionStorage.setItem('pendingCandidateAction', action);
                    sessionStorage.setItem('pendingCandidateId', id);
                  } else if (redirect === '/available-jobs') {
                    sessionStorage.setItem('pendingJobAction', action);
                    sessionStorage.setItem('pendingJobId', id);
                  }
                }
                
                const queryString = params.toString();
                const loginUrl = '/login' + (queryString ? `?${queryString}` : '');
                window.location.href = loginUrl;
              }}
              className="bg-gradient-brand text-white border-none rounded-lg px-4 sm:px-6 py-2 sm:py-3 text-base font-semibold cursor-pointer hover:opacity-90 transition-colors duration-200 leading-normal tracking-tight"
            >
              Proceed to Login ➡️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
