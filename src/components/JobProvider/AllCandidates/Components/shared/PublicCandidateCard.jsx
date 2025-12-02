import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineFileText, AiOutlineMessage } from 'react-icons/ai';
import { FaBriefcase, FaWallet, FaMapMarkerAlt, FaGraduationCap, FaStar } from 'react-icons/fa';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  getExperience, 
  parseEducationDetails, 
  parseCoreExpertise, 
  getLocationString,
  formatSalary
} from '../utils/candidateUtils.js';
import LoginConsentModal from '../../../../../components/common/LoginConsentModal';

/**
 * Public CandidateCard component for unauthenticated users
 * Redirects to login when user tries to interact
 */
const PublicCandidateCard = ({ candidate, candidatePhoto = null }) => {
  const navigate = useNavigate();
  const candidateId = candidate.firebase_uid;
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const expertise = parseCoreExpertise(candidate);

  // Show consent modal before redirecting to login
  const handleAction = (action) => {
    setPendingAction(action);
    setShowConsentModal(true);
  };

  // Handle consent confirmation - redirect to login
  const handleConfirmLogin = () => {
    setShowConsentModal(false);
    navigate(`/login?redirect=/available-candidates&action=${pendingAction}&id=${candidateId}&requiredUserType=Employer`);
  };

  // Handle consent cancellation
  const handleCancel = () => {
    setShowConsentModal(false);
    setPendingAction(null);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-3 sm:p-4 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9]"
      data-candidate-id={candidateId}
    >
      {/* Top Row: Photo + Name/Actions */}
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Avatar Section */}
        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-transparent">
          <AvatarImage
            src={candidatePhoto || candidate.profile_picture}
            alt={candidate.fullName || candidate.name || 'Candidate'}
            gender={candidate.gender}
            className="w-full h-full object-cover"
            style={{ 
              border: 'none', 
              outline: 'none', 
              display: 'block',
              transform: 'scale(1.4) translateY(7%)',
              transformOrigin: 'center'
            }}
          />
        </div>

        {/* Name and Actions Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0">
            <div className="flex-1 min-w-0 max-w-full overflow-hidden">
              <h3 className="text-xl font-bold text-gray-800 leading-tight truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {candidate.fullName || candidate.name || 'Name not available'}
              </h3>
              {(candidate.job_name || candidate.designation) && (
                <p className="text-lg sm:text-base text-gray-600 mt-0.5 truncate leading-normal tracking-tight max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {candidate.job_name ? (
                    <>
                      Applied for <span className="font-semibold">{candidate.job_name}</span>
                    </>
                  ) : (
                    candidate.designation
                  )}
                </p>
              )}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 sm:ml-3 flex-shrink-0">
              {/* View Full Icon */}
              <button
                className="group relative p-2 rounded-xl sm:p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-200"
                onClick={() => handleAction('view-full')}
                title="View Full Profile"
              >
                <AiOutlineEye className="w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
              
              {/* View Short Icon */}
              <button
                className="group relative p-2 rounded-xl sm:p-2.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-purple-200"
                onClick={() => handleAction('view-short')}
                title="View Short Profile"
              >
                <AiOutlineFileText className="w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
              
              {/* Unlock Icon (for full view) */}
              <button
                className="group relative p-2 rounded-xl sm:p-2.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-600 hover:text-white border border-yellow-200 hover:border-yellow-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-yellow-200"
                onClick={() => handleAction('unlock')}
                title="Unlock Details"
              >
                🔓
              </button>
              
              {/* Message Icon */}
              <button
                className="group relative p-2 rounded-xl sm:p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-200"
                onClick={() => handleAction('message')}
                title="Message Candidate"
              >
                <AiOutlineMessage className="w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Details Grid for Desktop */}
          <div className="hidden lg:block space-y-2 mt-2">
            <div className="grid grid-cols-4 gap-x-3 gap-y-2 text-lg sm:text-base leading-normal tracking-tight">
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">Exp: {getExperience(candidate.total_experience_years)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">{formatSalary(candidate.expected_salary)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">{getLocationString(candidate)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">{parseEducationDetails(candidate.education_details_json)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 text-lg sm:text-base leading-normal tracking-tight">
              <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="truncate font-medium" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
                {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid for Mobile */}
      <div className="lg:hidden space-y-2 mt-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-lg sm:text-base leading-normal tracking-tight">
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">Exp: {getExperience(candidate.total_experience_years)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{formatSalary(candidate.expected_salary)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{getLocationString(candidate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{parseEducationDetails(candidate.education_details_json)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-700 text-lg sm:text-base leading-normal tracking-tight">
          <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="truncate font-medium" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
            {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
          </span>
        </div>
      </div>

      {/* Login Consent Modal */}
      <LoginConsentModal
        isOpen={showConsentModal}
        onClose={handleCancel}
        onConfirm={handleConfirmLogin}
        action={pendingAction}
        userType="Employer"
      />
    </div>
  );
};

export default PublicCandidateCard;