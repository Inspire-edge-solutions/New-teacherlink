// Validation patterns for common form fields
import { toast } from "react-toastify";
import { validatePincodeForState } from "./pincodeStateMapping";
// Export validation patterns
export const validationPatterns = {
  panNumber: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pincode: /^[1-9][0-9]{5}$/,
  websiteUrl: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[6-9]\d{9}$/
};

// Error messages for validation failures
export const errorMessages = {
  panNumber: "Enter 10-character PAN number (e.g., ABCDE1234F)",
  gstin: "Enter 15-character GSTIN (e.g., 27AAPFU0939F1Z5)",
  pincode: "Enter 6-digit pincode",
  websiteUrl: "Enter valid URL (e.g., https://example.com)",
  email: "Enter a valid email address",
  phone: "Enter a valid 10-digit Indian mobile number"
};

// Success messages for validation
export const successMessages = {
  panNumber: "Valid PAN format",
  gstin: "Valid GSTIN format",
  pincode: "Valid pincode format",
  websiteUrl: "Valid URL format",
  email: "Valid email format",
  phone: "Valid phone number"
};

/**
 * Validates a field value against specified pattern
 * @param {string} name - Field name that maps to a pattern
 * @param {string} value - Value to validate
 * @returns {boolean} Whether the value is valid
 */
export const validateField = (name, value) => {
  if (!value) return true; // Empty values don't show errors
  
  if (validationPatterns[name]) {
    return validationPatterns[name].test(value);
  }
  return true;
};

/**
 * Formats input value based on field type
 * @param {string} name - Field name
 * @param {string} value - Input value
 * @returns {string} Formatted value
 */
export const formatFieldValue = (name, value) => {
  switch (name) {
    case "panNumber":
    case "gstin":
      return value.toUpperCase();
    case "pincode":
      return value.replace(/\D/g, '');
    case "phone":
    case "phone1":
    case "phone2":
      return value.replace(/\D/g, '').slice(0, 10);
    default:
      return value;
  }
};

/**
 * Validates a field and shows toast message
 * @param {string} name - Field name to validate
 * @param {string} value - Value to validate
 * @param {boolean} showToast - Whether to show toast notifications
 * @returns {boolean} Whether validation passed
 */
export const validateWithFeedback = (name, value, showToast = false) => {
  console.log(`Validating ${name}:`, value);
  if (!value) return true; // Skip empty values
  
  const isValid = validateField(name, value);
  console.log(`${name} validation result:`, isValid ? 'valid' : 'invalid');
  
  // Show feedback based on minimum meaningful input lengths
  const shouldShowFeedback = 
    (name === 'panNumber' && value.length >= 5) || 
    (name === 'gstin' && value.length >= 5) ||
    (name === 'pincode' && value.length >= 4) ||
    (name === 'websiteUrl' && value.length > 8) ||
    (name === 'email' && value.includes('.') && value.includes('@')) ||
    (name === 'phone' && value.length >= 8);
  
  console.log(`Should show feedback for ${name}?:`, shouldShowFeedback, `showToast:`, showToast);
  
  if (showToast && shouldShowFeedback) {
    try {
      console.log(`Preparing to show toast for ${name}, valid:`, isValid);
      
      // Only show error toasts - users don't need confirmation of valid input
      if (!isValid) {
        console.log(`Calling toast.error for ${name}`);
        toast.error(errorMessages[name] || `Invalid ${name} format`, {
          toastId: `${name}-validation-${Date.now()}` // Only need unique ID, other settings come from ToastContainer
        });
      } else {
        console.log(`Field ${name} is valid - no toast needed`);
      }
    } catch (err) {
      console.error("Toast notification error:", err);
    }
  }
  
  return isValid;
};

/**
 * Validates pincode against selected state and shows toast message
 * @param {string} pincode - Pincode value
 * @param {string} state - State name
 * @param {boolean} showToast - Whether to show toast notifications
 * @returns {boolean} Whether validation passed
 */
export const validatePincodeForStateWithFeedback = (pincode, state, showToast = false) => {
  console.log(`Validating pincode ${pincode} for state:`, state);
  
  // First validate the pincode format
  const isFormatValid = validateField('pincode', pincode);
  
  if (!isFormatValid) {
    console.log('Pincode format invalid');
    if (showToast) {
      toast.error(errorMessages.pincode, {
        toastId: `pincode-format-validation-${Date.now()}`
      });
    }
    return false;
  }
  
  // Then validate pincode against state
  const { isValid, message } = validatePincodeForState(pincode, state);
  console.log(`Pincode-state validation result:`, isValid ? 'valid' : 'invalid', message);
  
  if (!isValid && showToast && message) {
    toast.error(message, {
      toastId: `pincode-state-validation-${Date.now()}`
    });
  }
  
  return isValid;
};

// Add direct toast test function - can be called from developer console
window.testToast = function() {
  try {
    toast.success("Toast test success", {
      position: "top-right",
      autoClose: 3000
    });
    console.log("Toast test function called");
    return true;
  } catch (err) {
    console.error("Toast test error:", err);
    return false;
  }
}; 