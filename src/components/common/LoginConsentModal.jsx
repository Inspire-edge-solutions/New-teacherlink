import React from 'react';
import { createPortal } from 'react-dom';
import { AiOutlineInfoCircle, AiOutlineClose } from 'react-icons/ai';
import { FaLock } from 'react-icons/fa';

const LoginConsentModal = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  userType
}) => {
  if (!isOpen) return null;

  // Map actions to user-friendly messages
  // userType helps determine context: 'Employer' = viewing candidates, 'Candidate' = viewing jobs
  const getActionMessage = (action, userType) => {
    switch (action) {
      case 'view':
        // 'view' is used for jobs (Candidate userType)
        return userType === 'Candidate' ? 'view job details' : 'view candidate details';
      case 'view-full':
        // 'view-full' is used for candidates (Employer userType)
        return userType === 'Employer' ? 'view full candidate profile' : 'view full job details';
      case 'view-short':
        // 'view-short' is used for candidates (Employer userType)
        return 'view short profile';
      case 'apply':
        return 'apply for this job';
      case 'unlock':
        return 'unlock candidate details';
      case 'message':
        return userType === 'Employer' ? 'message candidate' : 'message';
      default:
        return 'perform this action';
    }
  };

  const getUserTypeMessage = (userType) => {
    switch (userType) {
      case 'Candidate':
        return 'Job Seeker';
      case 'Employer':
        return 'Job Provider';
      default:
        return 'User';
    }
  };

  const actionMessage = getActionMessage(action, userType);
  const userTypeMessage = getUserTypeMessage(userType);

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#F0D8D9] rounded-lg shadow-2xl max-w-md w-full z-[10000] transform transition-all duration-300 animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-brand p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon with gradient background */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <FaLock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-0.5 leading-tight tracking-tight">
                  Login Required
                </h3>
                <p className="text-lg sm:text-base text-white/90 leading-normal tracking-tight">
                  Access restricted content
                </p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm"
            >
              <AiOutlineClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-[#F0D8D9]">
          <div className="mb-6">
            <p className="text-gray-700 mb-4 leading-relaxed text-lg sm:text-base tracking-tight">
              To <span className="font-semibold text-gray-900 px-2 py-1 rounded-md">{actionMessage},</span> you need to be logged in as a <span className="font-semibold text-gray-900 px-2 py-1 rounded-md">{userTypeMessage}.</span>
            </p>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <AiOutlineInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-lg sm:text-base leading-relaxed tracking-tight">
                Don't have an account? No worries! You can register during the login process in just a few steps.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-base leading-normal tracking-tight"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2 text-base leading-normal tracking-tight"
            >
              <span>Continue to Login</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default LoginConsentModal;