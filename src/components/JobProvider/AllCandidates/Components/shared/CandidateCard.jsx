import React from 'react';
import { AiOutlineEye, AiOutlineFileText, AiOutlineSave, AiFillSave, AiOutlineHeart, AiFillHeart, AiOutlineMessage } from 'react-icons/ai';
import { FaBriefcase, FaWallet, FaMapMarkerAlt, FaGraduationCap, FaStar } from 'react-icons/fa';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  getExperience, 
  parseEducationDetails, 
  parseCoreExpertise, 
  getLocationString,
  formatSalary
} from '../utils/candidateUtils.js';

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
  onMessage,
  showCheckbox = false,
  isChecked = false,
  onCheckboxChange,
  candidatePhoto = null
}) => {
  const candidateId = candidate.firebase_uid;

  const expertise = parseCoreExpertise(candidate);

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-3 sm:p-4 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9] cursor-pointer"
      data-candidate-id={candidateId}
    >
      {/* Top Row: Checkbox + Photo + Name/Actions */}
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Checkbox (if enabled) */}
        {showCheckbox && (
          <div className="flex items-center pt-1 flex-shrink-0">
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
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 leading-tight truncate">
                {candidate.fullName || candidate.name || 'Name not available'}
              </h3>
              {(candidate.job_name || candidate.designation) && (
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
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
            <div className="flex items-center gap-2 sm:gap-2.5 sm:ml-3 flex-shrink-0">
              {/* View Full Icon */}
              <button
                className="group relative p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewFull && onViewFull(candidate);
                }}
                title="View Full Profile"
                disabled={loading}
              >
                <AiOutlineEye className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
              
              {/* View Short Icon */}
              <button
                className="group relative p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-purple-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewShort && onViewShort(candidate);
                }}
                title="View Short Profile"
                disabled={loading}
              >
                <AiOutlineFileText className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
              
              {/* Save Icon */}
              <button
                className={`group relative p-2.5 rounded-xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
                  isSaved 
                    ? 'text-green-700 bg-green-50 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-green-200' 
                    : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-green-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave && onSave(candidate);
                }}
                title={isSaved ? 'Remove from Saved' : 'Save Candidate'}
                disabled={loading}
              >
                {isSaved ? (
                  <AiFillSave className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                ) : (
                  <AiOutlineSave className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                )}
              </button>
              
              {/* Favourite Icon */}
              <button
                className={`group relative p-2.5 rounded-xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
                  isFavourite 
                    ? 'text-red-600 bg-red-50 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-red-200' 
                    : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-red-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavourite && onToggleFavourite(candidateId, candidate, !isFavourite);
                }}
                title={isFavourite ? 'Remove from Favourites' : 'Mark as Favourite'}
                disabled={loading}
              >
                {isFavourite ? (
                  <AiFillHeart className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-125 group-hover:animate-pulse" />
                ) : (
                  <AiOutlineHeart className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                )}
              </button>
              
              {/* Message Icon */}
              <button
                className="group relative p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage && onMessage(candidate);
                }}
                title="Message Candidate"
                disabled={loading}
              >
                <AiOutlineMessage className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Details Grid for Desktop - After name/actions */}
          <div className="hidden lg:block space-y-2 mt-2">
            {/* First Row - 4 cols on desktop */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-2 text-sm sm:text-base">
              {/* Experience */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">Exp: {getExperience(candidate.total_experience_years)}</span>
              </div>
              {/* Salary */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">₹{candidate.expected_salary?.toLocaleString() || 'Not specified'}</span>
              </div>
              {/* Location */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">{getLocationString(candidate)}</span>
              </div>
              {/* Education */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium">{parseEducationDetails(candidate.education_details_json)}</span>
              </div>
            </div>
            {/* Second Row - Full width */}
            <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
              <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="truncate font-medium" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
                {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid for Mobile - Starts below profile photo, aligned with photo left edge */}
      <div className={`lg:hidden space-y-2 mt-2 ${showCheckbox ? 'pl-6' : 'pl-0'}`}>
        {/* First Row - 2 cols on mobile */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:text-base">
          {/* Experience */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">Exp: {getExperience(candidate.total_experience_years)}</span>
          </div>
          {/* Salary */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">₹{candidate.expected_salary?.toLocaleString() || 'Not specified'}</span>
          </div>
          {/* Location */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{getLocationString(candidate)}</span>
          </div>
          {/* Education */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{parseEducationDetails(candidate.education_details_json)}</span>
          </div>
        </div>
        {/* Second Row - Full width */}
        <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
          <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="truncate font-medium" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
            {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;