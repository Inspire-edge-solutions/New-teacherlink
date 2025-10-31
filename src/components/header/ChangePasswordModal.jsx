import React, { useState, useEffect } from 'react';
import { MdClose, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useAuth } from '../../Context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import ModalPortal from '../common/ModalPortal';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  // Fields for API
  const [email, setEmail] = useState(user?.email || '');
  const [firebaseUid, setFirebaseUid] = useState(user?.firebase_uid || user?.uid || '');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
    different: false
  });

  // Keep email and firebaseUid updated from context when login state changes
  useEffect(() => {
    setEmail(user?.email || '');
    setFirebaseUid(user?.firebase_uid || user?.uid || '');
  }, [user]);

  // Validate password on change
  useEffect(() => {
    const validations = validatePassword(newPassword);
    setPasswordValidation({
      ...validations,
      match: newPassword === confirmPassword,
      different: newPassword !== oldPassword && newPassword !== ''
    });
  }, [newPassword, confirmPassword, oldPassword]);

  function validatePassword(password) {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }

  // Password visibility togglers
  const toggleOldPasswordVisibility = () => setShowOldPassword(v => !v);
  const toggleNewPasswordVisibility = () => setShowNewPassword(v => !v);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(v => !v);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowValidationErrors(true);

    // Validate email
    if (!email || !email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      toast.error("Please enter a valid email.");
      return;
    }
    // Validate firebaseUid
    if (!firebaseUid) {
      toast.error("Firebase UID is missing.");
      return;
    }

    // Validate password requirements
    const validations = validatePassword(newPassword);
    if (!Object.values(validations).every(Boolean)) {
      toast.error('New password does not meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      toast.error('New password must be different from old password');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firebase_uid: firebaseUid,
        email,
        oldPassword,
        newPassword
      };
      const { data } = await axios.put(
        "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/change",
        JSON.stringify(payload),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      toast.success(data.message || "Password reset successful!");

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowValidationErrors(false);
      onClose(); // Close modal on success
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
            <p className="text-sm text-gray-600 mt-1">Update your account password</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6" autoComplete="off">
          {/* Old Password */}
          <div className="mb-4">
            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Old Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                id="oldPassword"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Enter your old password"
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={toggleOldPasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
              >
                {showOldPassword ? <MdVisibility className="w-5 h-5" /> : <MdVisibilityOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  setShowValidationErrors(false);
                }}
                onBlur={() => setShowValidationErrors(true)}
                required
                placeholder="Enter your new password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all ${
                  showValidationErrors && newPassword && !isPasswordValid ? 'border-red-500' : 'border-gray-300'
                }`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={toggleNewPasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
              >
                {showNewPassword ? <MdVisibility className="w-5 h-5" /> : <MdVisibilityOff className="w-5 h-5" />}
              </button>
            </div>
            {showValidationErrors && newPassword && !isPasswordValid && (
              <div className="mt-2 text-sm text-red-600">
                <p className="font-medium mb-1">Password must contain:</p>
                <ul className="space-y-1 ml-4">
                  {!passwordValidation.length && <li>• At least 8 characters</li>}
                  {!passwordValidation.uppercase && <li>• One uppercase letter</li>}
                  {!passwordValidation.lowercase && <li>• One lowercase letter</li>}
                  {!passwordValidation.number && <li>• One number</li>}
                  {!passwordValidation.special && <li>• One special character (!@#$%^&*)</li>}
                  {!passwordValidation.different && <li>• Must be different from old password</li>}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setShowValidationErrors(false);
                }}
                required
                placeholder="Confirm your new password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all ${
                  showValidationErrors && confirmPassword && !passwordValidation.match ? 'border-red-500' : 'border-gray-300'
                }`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
              >
                {showConfirmPassword ? <MdVisibility className="w-5 h-5" /> : <MdVisibilityOff className="w-5 h-5" />}
              </button>
            </div>
            {showValidationErrors && confirmPassword && !passwordValidation.match && (
              <p className="mt-2 text-sm text-red-600">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-[#F34B58] to-[#A1025D] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default ChangePasswordModal;

