import { useState, useEffect } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './forget.css';

const API_FORGET = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/forget";
const API_OTP_CREATE = "https://hmpffcv3r3.execute-api.ap-south-1.amazonaws.com/dev/otp/create";
const API_OTP_VERIFY = "https://hmpffcv3r3.execute-api.ap-south-1.amazonaws.com/dev/otp/verify";

// Auth headers like personalDetails.jsx
const authHeaders = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
};

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

  // Step 1: Check email in backend (Firebase & users table) & send OTP if valid
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Don't proceed if email is empty
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Sending OTP for email:", email.trim());
      
      // First check if email exists using the forget password endpoint
      const res = await axios.post(API_FORGET, { 
        email: email.trim(),
        action: "request"
      });
      console.log("Email check response:", res.data);
      
      if (res.data?.message) {
        // Email exists, now send OTP
        try {
          // Get the user's firebase_uid for OTP creation (like personalDetails.jsx)
          const userRes = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
          const users = userRes.data;
          const user = users.find(u => u.email === email.trim().toLowerCase() && u.is_active === 1);
          
          if (!user) {
            toast.error("User not found");
            return;
          }
          
          const normalizedEmail = email.trim().toLowerCase();
          const otpPayload = { 
            email: normalizedEmail,
            firebase_uid: user.firebase_uid 
          };
          console.log("Sending OTP with payload:", otpPayload);
          console.log("Email for OTP creation:", JSON.stringify(otpPayload.email));
          console.log("Firebase UID for OTP creation:", user.firebase_uid);
          
          const otpRes = await axios.post(API_OTP_CREATE, otpPayload, authHeaders);
          console.log("OTP send response:", otpRes.data);
          console.log("OTP send status:", otpRes.status);
          
          if (otpRes.data?.success) {
            toast.success("OTP sent to your email.");
            setStep(2);
            setResendTimer(30); // 30 sec before allowing resend
          } else {
            toast.error(otpRes.data?.message || "Failed to send OTP");
          }
        } catch (otpErr) {
          console.error("OTP send error:", otpErr.response?.data);
          
          // If it's a rate limiting error but OTP was sent, proceed to next step
          if (otpErr.response?.data?.message?.includes("Too many OTP requests")) {
            toast.warning("OTP already sent. Please check your email.");
            setStep(2);
            setResendTimer(30); // 30 sec before allowing resend
          } else {
            toast.error(otpErr.response?.data?.message || "Failed to send OTP");
          }
        }
      } else {
        toast.error("Email not registered");
      }
    } catch (err) {
      console.error("Send OTP error:", err.response?.data);
      // If backend responds with not found, show user-friendly message
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Email not registered");
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
      // Get the user's firebase_uid for OTP verification (like personalDetails.jsx)
      const userRes = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
      const users = userRes.data;
      const user = users.find(u => u.email === email.trim().toLowerCase() && u.is_active === 1);
      
      if (!user) {
        toast.error("User not found");
        setLoading(false);
        return;
      }
      
      // Normalize email to lowercase to ensure consistency
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedOtp = otp.trim();
      
      const payload = { 
        email: normalizedEmail, 
        otp: normalizedOtp
      };
      console.log("Verifying OTP:", payload);
      console.log("Email being sent:", JSON.stringify(payload.email));
      console.log("OTP being sent:", JSON.stringify(payload.otp));
      console.log("User found:", user.email);
      console.log("Current timestamp:", new Date().toISOString());
      
      const resp = await axios.post(API_OTP_VERIFY, payload);
      console.log("OTP verification response:", resp.data);
      console.log("Full response status:", resp.status);
      
      // Check for different possible success indicators
      console.log("Checking success conditions:");
      console.log("resp.data?.success:", resp.data?.success);
      console.log("resp.data?.status:", resp.data?.status);
      console.log("resp.status:", resp.status);
      
      if (resp.data?.success === true || resp.data?.status === true || resp.status === 200) {
        toast.success("OTP verified successfully");
        setStep(3);
      } else {
        toast.error(resp.data?.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP verification error:", err.response?.data);
      console.error("Full error response:", err.response);
      console.error("Error status:", err.response?.status);
      console.error("Error message:", err.message);
      toast.error(err.response?.data?.message || "Invalid OTP");
    }
    setLoading(false);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      // Get the user's firebase_uid for OTP creation (like personalDetails.jsx)
      const userRes = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
      const users = userRes.data;
      const user = users.find(u => u.email === email.trim().toLowerCase() && u.is_active === 1);
      
      if (!user) {
        toast.error("User not found");
        setLoading(false);
        return;
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      const otpPayload = { 
        email: normalizedEmail,
        firebase_uid: user.firebase_uid 
      };
      await axios.post(API_OTP_CREATE, otpPayload, authHeaders);
      toast.success("OTP resent to your email.");
      setResendTimer(30);
    } catch (err) {
      toast.error("Failed to resend OTP");
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
      // Update password using the forget password reset endpoint
      const payload = {
        email: email.trim(),
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
    <Container className="my-5 py-5">
      <div className="forget-password-container">
        <h3 className="forget-password-title">Change Password</h3>
        {!isCompleted ? (
          <>
            {step === 1 && (
              <div className="forget-password-form">
                <Form.Group className="mb-3">
                  <div className='input-wrapper'>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      required
                      autoComplete="email"
                    />
                    <span className="custom-tooltip">Registered Email</span>
                  </div>
                </Form.Group>
                <div className="button-group">
                  <Button 
                    variant="primary" 
                    type="button" 
                    disabled={loading || !email.trim()}
                    onClick={handleSendOTP}
                  >
                    {loading ? 'Checking...' : 'Send OTP'}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="forget-password-form">
                <Form.Group className="mb-3">
                  <div className='input-wrapper'>
                    <Form.Control
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="Enter OTP sent to your email"
                      required
                    />
                    <span className="custom-tooltip">OTP</span>
                  </div>
                </Form.Group>
                <div className="button-group mb-2">
                  <Button 
                    variant="primary" 
                    type="button" 
                    disabled={loading || !otp.trim()}
                    onClick={handleVerifyOTP}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <Button
                    variant="warning"
                    type="button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleResendOTP}
                    style={{ marginLeft: 8 }}
                  >
                    {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="forget-password-form">
                <Form.Group className="mb-3">
                  <div className='input-wrapper'>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      isInvalid={showValidationErrors && !passwordValidation.length}
                    />
                    <span className="custom-tooltip">New password</span>
                  </div>
                  {showValidationErrors && (
                    <Form.Text className="text-danger">
                      <ul className="password-requirements mt-2 mb-0">
                        {!passwordValidation.length && (<li>At least 8 characters</li>)}
                        {!passwordValidation.uppercase && (<li>One uppercase letter</li>)}
                        {!passwordValidation.lowercase && (<li>One lowercase letter</li>)}
                        {!passwordValidation.number && (<li>One number</li>)}
                        {!passwordValidation.special && (<li>One special character (!@#$%^&*)</li>)}
                      </ul>
                    </Form.Text>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <div className='input-wrapper'>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      isInvalid={showValidationErrors && !passwordValidation.match}
                    />
                    <span className="custom-tooltip">Confirm password</span>
                  </div>
                  {showValidationErrors && !passwordValidation.match && (
                    <Form.Text className="text-danger">
                      Passwords do not match
                    </Form.Text>
                  )}
                </Form.Group>
                <div className="button-group">
                  <Button 
                    variant="primary" 
                    type="button" 
                    disabled={loading}
                    onClick={handleResetPassword}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <p>Your password has been changed successfully!</p>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
};

export default ForgetPassword;