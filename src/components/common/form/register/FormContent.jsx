import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './register.css';
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import TermsAndPrivacyText from "../../../pages-menu/terms/TermsAndPrivacyText";

// Terms and Privacy Policy version tracking
const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const FormContent = ({ user_type }) => {
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
  const navigate = useNavigate();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setHasStartedTyping(true);
  };

  const handlePhoneChange = (e) => {
    const newNumber = e.target.value.replace(/[^0-9]/g, "");
    setNumber(newNumber);
    
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
          user_type,
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
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
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

  // Function to handle terms modal scroll
  const handleTermsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if user has scrolled to bottom
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setHasReadTerms(true);
    }
  };

  // Function to handle privacy modal scroll
  const handlePrivacyScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Check if user has scrolled to bottom
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setHasReadPrivacy(true);
    }
  };

  // Combined Terms and Privacy Modal Component
  const TermsAndPrivacyModal = () => (
    <div className="modal-overlay">
      <div className="modal-content terms-modal">
        <h3>Terms and Conditions & Privacy Policy</h3>
        <div className="terms-content" onScroll={handleTermsScroll}>
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
            {hasReadTerms ? "I Understand" : "Please read the entire document"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <div className="input-wrapper">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <span className="custom-tooltip">Name</span>
          </div>
        </div>

        <div className="form-group">
          <div className="input-wrapper">
          <input
            type="email"
            placeholder="Email"
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
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              // onBlur={() => setShowValidation(true)}
              // onFocus={() => setShowValidation(false)}
              // pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$"
              required
              style={{ width: '100%' }}
            />
           <span 
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: '20px',
                color: 'black'
              }}
            >
              {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
            </span>
            <span className="custom-tooltip">Password</span>
          </div>
          {/* {showValidation && getMissingRequirements().length > 0 && (
            <div className="password-requirements" style={{ fontSize: '0.8rem', marginTop: '5px' }}>
              <p style={{ color: 'red' }}>
                Password must have:
              </p>
              {getMissingRequirements().map((requirement, index) => (
                <p key={index} style={{ color: 'red', marginLeft: '10px' }}>
                  • {requirement}
                </p>
              ))}
            </div>
          )} */}
        </div>

        <div className="form-group">
          <div className="input-wrapper">
          <input
            type="text"
            name="phone"
            placeholder="Mobile Number"
            value={number}
            onChange={handlePhoneChange}
            onBlur={() => setShowPhoneValidation(true)}
            onFocus={() => setShowPhoneValidation(false)}
            maxLength="10"
            minLength="10"
            required
          />
          <span className="custom-tooltip">Mobile Number</span>
          </div>
          {showPhoneValidation && getMissingPhoneRequirements().length > 0 && (
            <div className="password-requirements" style={{ fontSize: '0.8rem', marginTop: '5px' }}>
              <p style={{ color: 'red' }}>
                Phone number:
              </p>
              {getMissingPhoneRequirements().map((requirement, index) => (
                <p key={index} style={{ color: 'red', marginLeft: '10px' }}>
                  • {requirement}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="form-group terms-checkbox">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                if (e.target.checked && (!hasReadTerms || !hasReadPrivacy)) {
                  toast.error("Please read both Terms & Conditions and Privacy Policy first");
                  e.preventDefault();
                  return;
                }
                setAcceptedTerms(e.target.checked);
              }}
              required
            />
            <label htmlFor="terms-checkbox" className="checkbox-label">
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
          {(!hasReadTerms || !hasReadPrivacy) && acceptedTerms && (
            <p className="validation-message">
              Please read both documents before accepting
            </p>
          )}
        </div>

        <div className="form-group">
          <button 
            className="theme-btn btn-style-one" 
            type="submit" 
            disabled={loading || !acceptedTerms}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </form>

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
                Your account is ready. <br/> Hire passionate educators or explore rewarding teaching opportunities. 
                <br/>
                <span className="success-emoji">🚀</span> Log in now to continue your journey.
                </p>
              <button 
                className="theme-btn btn-style-one" 
                onClick={() => window.location.href = '/login'}
              >
                Proceed to Login <span className="success-emoji">➡️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormContent;
