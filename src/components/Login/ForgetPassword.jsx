import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_FORGET = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/forget";
const API_OTP_VERIFY = "https://hmpffcv3r3.execute-api.ap-south-1.amazonaws.com/dev/otp/verify";

const ForgetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const navigate = useNavigate();

  // Password validation logic
  const passwordValidation = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    match: newPassword === confirmPassword && confirmPassword !== "",
  };

  // Handle resend timer countdown
  useEffect(() => {
    let timer = null;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Step 1: Send OTP (backend handles all validation)
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Don't proceed if email is empty
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log("Sending OTP request for email:", normalizedEmail);
      
      // Use the forget password endpoint which handles all validation
      // It will check Firebase Auth, users table, and send OTP - all in one call
      const response = await axios.post(API_FORGET, {
        email: normalizedEmail,
        action: "request"
      });
      
      console.log("Forget password response:", response.data);
      
      if (response.data?.message) {
        toast.success("OTP sent to your email.");
        setStep(2);
        setResendTimer(30); // 30 sec before allowing resend
      } else {
        toast.error("Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      console.error("Error message:", err.message);
      
      // Handle specific error messages from backend
      if (err.response?.status === 404) {
        toast.error("Email not registered. Please check your email or sign up.");
      } else if (err.response?.status === 400) {
        // Handle validation errors
        const errorMsg = err.response?.data?.message || "Invalid request. Please check your email and try again.";
        toast.error(errorMsg);
      } else if (err.response?.data?.message?.includes("Too many OTP requests")) {
        toast.warning("OTP already sent. Please check your email.");
        setStep(2);
        setResendTimer(30); // 30 sec before allowing resend
      } else if (err.response?.data?.message) {
        // Show the backend error message
        toast.error(err.response.data.message);
      } else if (err.message) {
        // Show network or other error messages
        toast.error(err.message);
      } else {
        toast.error("Failed to send OTP. Please try again.");
      }
    }
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    // Don't proceed if OTP is empty
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }
    
    setLoading(true);
    try {
      // Normalize email and OTP
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedOtp = otp.trim();
      
      const payload = { 
        email: normalizedEmail, 
        otp: normalizedOtp
      };
      console.log("Verifying OTP for email:", payload.email);
      
      const resp = await axios.post(API_OTP_VERIFY, payload);
      console.log("OTP verification response:", resp.data);
      console.log("Response status:", resp.status);
      
      // Check if OTP is valid based on backend response
      if (resp.data?.success === true || resp.data?.status === true) {
        toast.success("OTP verified successfully");
        setStep(3);
      } else {
        toast.error(resp.data?.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP verification error:", err.response?.data);
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    }
    setLoading(false);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log("Resending OTP for email:", normalizedEmail);
      
      // Use the forget password endpoint to resend OTP
      const response = await axios.post(API_FORGET, {
        email: normalizedEmail,
        action: "request"
      });
      
      if (response.data?.message) {
        toast.success("OTP resent to your email.");
        setResendTimer(30);
      } else {
        toast.error("Failed to resend OTP");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to resend OTP");
      }
    }
    setLoading(false);
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setShowValidationErrors(true);

    // Validate
    const isValid = Object.values(passwordValidation).every(Boolean);
    if (!isValid) {
      toast.error("Password does not meet all requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Normalize email to lowercase to ensure consistency
      const normalizedEmail = email.trim().toLowerCase();
      
      // Update password using the forget password reset endpoint
      const payload = {
        email: normalizedEmail,
        newPassword,
        confirmPassword,
        action: "reset"
      };
      const resp = await axios.post(API_FORGET, payload);
      if (resp.data?.message) {
        toast.success("Password changed successfully");
        setIsCompleted(true);
      } else {
        toast.error(resp.data?.message || "Failed to change password");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:min-h-screen bg-gradient-to-br from-red-50 to-red-100">
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
            <h1 className="text-4xl font-bold text-red-600 leading-tight">
              Reset Your Password
            </h1>
            <div className="space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed">
                Don't worry! We'll help you regain access to your account with a secure password reset process.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <span className="text-gray-700">Enter your registered email address</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <span className="text-gray-700">Verify with the OTP sent to your email</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <span className="text-gray-700">Create a new secure password</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Right Section - Forget Password Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center px-3 sm:px-6 md:px-8 py-8 sm:py-12 lg:py-6 lg:pt-8 lg:pb-6 relative lg:rounded-tl-[3rem] lg:rounded-bl-[3rem] overflow-hidden lg:border-l-4 lg:border-t-4 lg:border-b-4 border-red-300 shadow-lg">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black mb-4 sm:mb-6 text-center lg:text-left">Reset Password</h2>
          
          {!isCompleted ? (
            <>
              {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      required
                      autoComplete="email"
                      className="w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 border-gray-300 focus:border-red-500 focus:outline-none text-base sm:text-lg md:text-xl placeholder-black"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading || !email.trim()}
                    className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold py-3 sm:py-4 md:py-5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg md:text-xl"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="Enter OTP"
                      required
                      className="w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 border-gray-300 focus:border-red-500 focus:outline-none text-base sm:text-lg md:text-xl placeholder-black text-center tracking-widest"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading || !otp.trim()}
                    className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold py-3 sm:py-4 md:py-5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg md:text-xl"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  
                  <button
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleResendOTP}
                    className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 font-medium py-2 sm:py-3 md:py-4 px-4 rounded-lg transition-colors duration-200 text-base sm:text-lg md:text-xl"
                  >
                    {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="relative">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      required
                      className={`w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 focus:outline-none text-base sm:text-lg md:text-xl placeholder-black ${
                        showValidationErrors && !passwordValidation.length 
                          ? 'border-red-500' 
                          : 'border-gray-300 focus:border-red-500'
                      }`}
                    />
                  </div>
                  
                  {showValidationErrors && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                      <ul className="text-xs sm:text-sm text-red-600 space-y-1">
                        {!passwordValidation.length && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>At least 8 characters</li>)}
                        {!passwordValidation.uppercase && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>One uppercase letter</li>)}
                        {!passwordValidation.lowercase && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>One lowercase letter</li>)}
                        {!passwordValidation.number && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>One number</li>)}
                        {!passwordValidation.special && (<li className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>One special character (!@#$%^&*)</li>)}
                      </ul>
                    </div>
                  )}
                  
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className={`w-full px-0 py-3 sm:py-4 md:py-5 border-0 border-b-2 focus:outline-none text-base sm:text-lg md:text-xl placeholder-black ${
                        showValidationErrors && !passwordValidation.match 
                          ? 'border-red-500' 
                          : 'border-gray-300 focus:border-red-500'
                      }`}
                    />
                  </div>
                  
                  {showValidationErrors && !passwordValidation.match && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-red-600 flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                        Passwords do not match
                      </p>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold py-3 sm:py-4 md:py-5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg md:text-xl"
                  >
                    {loading ? "Changing Password..." : "Change Password"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2">Success!</h4>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">Your password has been changed successfully!</p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold py-3 sm:py-4 md:py-5 px-6 rounded-lg transition-all duration-200 text-base sm:text-lg md:text-xl"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;