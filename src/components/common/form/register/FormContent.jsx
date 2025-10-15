import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[1000] p-5">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col animate-modalSlideIn">
        <h3 className="m-0 p-5 text-2xl text-gray-800 border-b border-gray-200 text-center rounded-t-lg">
          Terms and Conditions & Privacy Policy
        </h3>
        <div 
          className="p-5 overflow-y-auto flex-1 bg-white" 
          onScroll={handleTermsScroll}
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

        <div className="form-group my-5 w-full">
          <div className="flex items-start gap-2.5 py-1">
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
            <label htmlFor="terms-checkbox" className="m-0 text-sm leading-relaxed text-gray-800 cursor-pointer">
              I have read and agree to the{" "}
              <span
                className="text-blue-600 underline cursor-pointer bg-none border-none p-0 m-0 inline text-inherit select-none hover:text-blue-800 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTermsModal(true);
                }}
              >
                Terms & Conditions and Privacy Policy
              </span>
              {" "}of TeacherLink.in{" "}
              <span className="text-gray-600 text-xs inline">(A Unit of Inspire Edge Innovation LLP)</span>
            </label>
          </div>
          {(!hasReadTerms || !hasReadPrivacy) && acceptedTerms && (
            <p className="text-red-600 text-xs mt-1">
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
                Your account is ready. <br/> Hire passionate educators or explore rewarding teaching opportunities. 
                <br/>
                <span className="text-xl mx-1 inline-block animate-successBounce">🚀</span> Log in now to continue your journey.
              </p>
              <button 
                className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white border-none py-4 px-8 text-base font-semibold rounded-full cursor-pointer transition-all duration-300 uppercase tracking-wide shadow-lg hover:from-blue-800 hover:to-blue-600 hover:-translate-y-0.5 hover:shadow-xl" 
                onClick={() => window.location.href = '/login'}
              >
                Proceed to Login <span className="text-xl mx-1 inline-block animate-successBounce">➡️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormContent;
