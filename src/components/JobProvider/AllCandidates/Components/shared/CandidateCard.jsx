import React from 'react';
import { AiOutlineEye, AiOutlineFileText, AiOutlineSave, AiFillSave, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  getExperience, 
  parseEducationDetails, 
  parseCoreExpertise, 
  getLocationString,
  formatSalary
} from '../../utils/candidateUtils';

/**
 * Shared CandidateCard component used across all candidate sections
 * Displays candidate information with action buttons
 */
const CandidateCard = ({
  candidate,
  isSaved = false,
  isFavourite = false,
  isDownloaded = false,
  loading = false,
  onViewFull,
  onViewShort,
  onSave,
  onToggleFavourite,
  showCheckbox = false,
  isChecked = false,
  onCheckboxChange,
  candidatePhoto = null
}) => {
  const candidateId = candidate.firebase_uid;

  const expertise = parseCoreExpertise(candidate);

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-4 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9] cursor-pointer"
      data-candidate-id={candidateId}
    >
      {/* Candidate Row */}
      <div className="flex items-start gap-3">
        {/* Checkbox (if enabled) */}
        {showCheckbox && (
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                onCheckboxChange && onCheckboxChange(candidateId);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-transparent">
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

        {/* Candidate Info Section */}
        <div className="flex-1 min-w-0">
          {/* Header with Name and Actions */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-800 leading-tight truncate">
                {candidate.fullName || candidate.name || 'Name not available'}
              </h3>
              {candidate.designation && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {candidate.designation}
                </p>
              )}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                className="p-1.5 text-blue-500 hover:text-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewFull && onViewFull(candidate);
                }}
                title="View Full Profile"
                disabled={loading}
              >
                <AiOutlineEye className="w-6 h-6" />
              </button>
              <button
                className="p-1.5 text-purple-500 hover:text-purple-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewShort && onViewShort(candidate);
                }}
                title="View Short Profile"
                disabled={loading}
              >
                <AiOutlineFileText className="w-6 h-6" />
              </button>
              <button
                className={`p-1.5 transition-colors ${
                  isSaved 
                    ? 'text-green-500 hover:text-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave && onSave(candidate);
                }}
                title={isSaved ? 'Remove from Saved' : 'Save Candidate'}
                disabled={loading}
              >
                {isSaved ? <AiFillSave className="w-6 h-6" /> : <AiOutlineSave className="w-6 h-6" />}
              </button>
              <button
                className={`p-1.5 transition-colors ${
                  isFavourite 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavourite && onToggleFavourite(candidateId, candidate, !isFavourite);
                }}
                title={isFavourite ? 'Remove from Favourites' : 'Mark as Favourite'}
                disabled={loading}
              >
                {isFavourite ? <AiFillHeart className="w-6 h-6" /> : <AiOutlineHeart className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Details Grid - 4 fields in first row, 1 in second */}
          <div className="space-y-2">
            {/* First Row - 4 columns */}
            <div className="grid grid-cols-4 gap-x-3 text-base">
              {/* Experience */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <i className="icon-briefcase text-gray-500 flex-shrink-0"></i>
                <span className="truncate">Exp: {getExperience(candidate.total_experience_years)}</span>
              </div>
              {/* Salary */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <i className="icon-wallet text-gray-500 flex-shrink-0"></i>
                <span className="truncate">₹{candidate.expected_salary?.toLocaleString() || 'Not specified'}</span>
              </div>
              {/* Location */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <i className="icon-location-pin text-gray-500 flex-shrink-0"></i>
                <span className="truncate">{getLocationString(candidate)}</span>
              </div>
              {/* Education */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <i className="icon-graduation text-gray-500 flex-shrink-0"></i>
                <span className="truncate">{parseEducationDetails(candidate.education_details_json)}</span>
              </div>
            </div>
            {/* Second Row - Full width */}
            <div className="flex items-center gap-1.5 text-gray-600 text-base">
              <i className="icon-star text-gray-500 flex-shrink-0"></i>
              <span className="truncate" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
                {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;

