/**
 * Utility for translating Firebase error codes to user-friendly error messages
 */

/**
 * Map Firebase authentication error codes to user-friendly error messages
 */
export const getFirebaseErrorMessage = (errorCode) => {
  // Define mappings from Firebase error codes to user-friendly messages
  const errorMessages = {
    // Authentication errors
    'auth/user-not-found': 'No account found with this email address. Please check your email or sign up.',
    'auth/wrong-password': 'Incorrect password. Please try again or use the forgot password option.',
    'auth/invalid-email': 'The email address format is invalid. Please enter a valid email.',
    'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
    'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
    'auth/email-already-in-use': 'This email address is already registered. Please use a different email or login instead.',
    'auth/operation-not-allowed': 'This login method is not enabled. Please contact support.',
    'auth/weak-password': 'Your password is too weak. Please use a stronger password.',
    'auth/too-many-requests': 'Too many failed login attempts. Please try again later or reset your password.',
    'auth/network-request-failed': 'Network connection error. Please check your internet connection and try again.',
    'auth/popup-closed-by-user': 'The login popup was closed. Please try again.',
    'auth/popup-blocked': 'Login popup was blocked by your browser. Please allow popups for this site.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials. Try signing in using a different method.',
    'auth/requires-recent-login': 'This operation requires recent authentication. Please log in again.',
    'auth/credential-already-in-use': 'This credential is already associated with a different user account.',
    'auth/timeout': 'The operation has timed out. Please try again.',
    'auth/cancelled-popup-request': 'The popup operation was cancelled.',
    'auth/missing-password': 'Please enter your password.',
    'auth/missing-email': 'Please enter your email address.',
    
    // Default fallback for any other Firebase errors
    'default': 'An error occurred during authentication. Please try again.'
  };

  // Return the mapped error message or the default message if not found
  return errorMessages[errorCode] || errorMessages.default;
}; 