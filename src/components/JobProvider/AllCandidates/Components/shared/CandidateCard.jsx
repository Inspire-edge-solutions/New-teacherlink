import React from 'react';
import { AiOutlineEye, AiOutlineFileText, AiOutlineSave, AiFillSave, AiOutlineHeart, AiFillHeart, AiOutlineMessage } from 'react-icons/ai';
import { FaBriefcase, FaWallet, FaMapMarkerAlt, FaGraduationCap, FaStar, FaBook, FaUser, FaBirthdayCake } from 'react-icons/fa';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  getExperience, 
  parseEducationDetails, 
  parseCoreExpertise, 
  getLocationString,
  formatSalary,
  getSubjectsString,
  getGenderString,
  getAgeString,
  getQualificationString
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
  candidatePhoto = null,
  showStatusControl = false,
  statusValue = '',
  statusOptions = [],
  onStatusChange,
  forceMobileLayout = false,
  candidateSelectionId = null // Optional: ID to use for checkbox selection (defaults to firebase_uid)
}) => {
  const candidateId = candidate.firebase_uid;
  // Use candidateSelectionId if provided, otherwise fallback to firebase_uid
  const selectionId = candidateSelectionId !== null ? candidateSelectionId : candidateId;

  const expertise = parseCoreExpertise(candidate);

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-3 sm:p-4 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9]"
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
                onCheckboxChange && onCheckboxChange(selectionId);
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
          <div className="flex flex-col gap-2">
            <div className={`flex flex-col ${forceMobileLayout ? '' : 'sm:flex-row'} justify-between items-start ${forceMobileLayout ? '' : 'sm:items-start'} gap-2 ${forceMobileLayout ? '' : 'sm:gap-0'}`}>
              <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 leading-tight tracking-tight truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {candidate.fullName || candidate.name || 'Name not available'}
                </h3>
                {(candidate.job_name || candidate.designation) && (
                  <p className="text-base text-gray-600 mt-0.5 truncate leading-normal tracking-tight max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
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

              {/* Action Icons - Desktop view */}
              <div className={`${forceMobileLayout ? 'hidden' : 'hidden sm:flex'} items-center gap-1.5 sm:gap-2.5 sm:ml-3 flex-shrink-0`}>
                {/* Status Dropdown */}
                {showStatusControl && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <select
                      className="text-base border border-gray-300 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px] sm:min-w-[140px]"
                      value={statusValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange && onStatusChange(e.target.value);
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* View Full Icon */}
                <button
                  className={`group relative ${forceMobileLayout ? 'p-2' : 'p-2 rounded-xl sm:p-2.5'} bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-200`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewFull && onViewFull(candidate);
                  }}
                  title="View Full Profile"
                  disabled={loading}
                >
                  <AiOutlineEye className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110`} />
                </button>
                
                {/* View Short Icon */}
                <button
                  className={`group relative ${forceMobileLayout ? 'p-2' : 'p-2 rounded-xl sm:p-2.5'} bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-purple-200`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewShort && onViewShort(candidate);
                  }}
                  title="View Short Profile"
                  disabled={loading}
                >
                  <AiOutlineFileText className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110`} />
                </button>
                
                {/* Save Icon */}
                <button
                  className={`group relative ${forceMobileLayout ? 'p-2' : 'p-2 rounded-xl sm:p-2.5'} border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
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
                    <AiFillSave className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110 group-hover:rotate-12`} />
                  ) : (
                    <AiOutlineSave className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110`} />
                  )}
                </button>
                
                {/* Favourite Icon */}
                <button
                  className={`group relative ${forceMobileLayout ? 'p-2' : 'p-2 rounded-xl sm:p-2.5'} border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
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
                    <AiFillHeart className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-125 group-hover:animate-pulse`} />
                  ) : (
                    <AiOutlineHeart className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110`} />
                  )}
                </button>
                
                {/* Message Icon */}
                <button
                  className={`group relative ${forceMobileLayout ? 'p-2' : 'p-2 rounded-xl sm:p-2.5'} bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-200`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage && onMessage(candidate);
                  }}
                  title="Message Candidate"
                  disabled={loading}
                >
                  <AiOutlineMessage className={`${forceMobileLayout ? 'w-4 h-4' : 'w-4 h-4 sm:w-6 sm:h-6'} transition-transform group-hover:scale-110`} />
                </button>
              </div>
            </div>

            {/* Status Dropdown and Action Icons - Mobile view */}
            <div className={`flex ${forceMobileLayout ? '' : 'sm:hidden'} flex-col gap-2`}>
              {/* Status Dropdown - Mobile */}
              {showStatusControl && (
                <div className="w-auto max-w-[200px]">
                  <select
                    className="w-auto min-w-[140px] max-w-[200px] text-base border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={statusValue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange && onStatusChange(e.target.value);
                    }}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Action Icons - Mobile */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {/* View Full Icon */}
                <button
                  className="group relative p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewFull && onViewFull(candidate);
                  }}
                  title="View Full Profile"
                  disabled={loading}
                >
                  <AiOutlineEye className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
                
                {/* View Short Icon */}
                <button
                  className="group relative p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-purple-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewShort && onViewShort(candidate);
                  }}
                  title="View Short Profile"
                  disabled={loading}
                >
                  <AiOutlineFileText className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
                
                {/* Save Icon */}
                <button
                  className={`group relative p-2 rounded-xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
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
                    <AiFillSave className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                  ) : (
                    <AiOutlineSave className="w-4 h-4 transition-transform group-hover:scale-110" />
                  )}
                </button>
                
                {/* Favourite Icon */}
                <button
                  className={`group relative p-2 rounded-xl border transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg ${
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
                    <AiFillHeart className="w-4 h-4 transition-transform group-hover:scale-125 group-hover:animate-pulse" />
                  ) : (
                    <AiOutlineHeart className="w-4 h-4 transition-transform group-hover:scale-110" />
                  )}
                </button>
                
                {/* Message Icon */}
                <button
                  className="group relative p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage && onMessage(candidate);
                  }}
                  title="Message Candidate"
                  disabled={loading}
                >
                  <AiOutlineMessage className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>

          {/* Details Grid for Desktop - After name/actions */}
          <div className={`${forceMobileLayout ? 'hidden' : 'hidden lg:block'} space-y-2 mt-2`}>
            {/* First Row - 4 cols on desktop */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-2 text-base leading-normal tracking-tight">
              {/* Gender */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaUser className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{getGenderString(candidate)}</span>
              </div>
              {/* Experience */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">Exp: {getExperience(candidate.total_experience_years)}</span>
              </div>
              {/* Subject */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaBook className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight" title={getSubjectsString(candidate)}>
                  {getSubjectsString(candidate)}
                </span>
              </div>
              {/* Core Expertise */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
                  {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
                </span>
              </div>
            </div>
            {/* Second Row - 4 cols on desktop */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-2 text-base leading-normal tracking-tight">
              {/* Qualification */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{getQualificationString(candidate.education_details_json)}</span>
              </div>
              {/* Age */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaBirthdayCake className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{getAgeString(candidate)}</span>
              </div>
              {/* Salary */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{formatSalary(candidate.expected_salary)}</span>
              </div>
              {/* Location */}
              <div className="flex items-center gap-2 text-gray-700 min-w-0">
                <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{getLocationString(candidate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid for Mobile - Starts below profile photo, aligned with photo left edge */}
      <div className={`${forceMobileLayout ? 'block' : 'lg:hidden'} space-y-2 mt-2 ${showCheckbox ? 'pl-6' : 'pl-0'}`}>
        {/* First Row - 2 cols on mobile */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-base leading-normal tracking-tight">
          {/* Gender */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaUser className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">{getGenderString(candidate)}</span>
          </div>
          {/* Experience */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaBriefcase className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight">Exp: {getExperience(candidate.total_experience_years)}</span>
          </div>
          {/* Subject */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaBook className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight" title={getSubjectsString(candidate)}>
                  {getSubjectsString(candidate)}
                </span>
          </div>
          {/* Core Expertise */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaStar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="truncate font-medium leading-normal tracking-tight" title={typeof expertise === 'object' && expertise.hasMore ? expertise.full : expertise}>
                  {typeof expertise === 'object' && expertise.hasMore ? expertise.display : expertise}
                </span>
          </div>
        </div>
        {/* Second Row - 2 cols on mobile */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-base leading-normal tracking-tight">
          {/* Qualification */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaGraduationCap className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{getQualificationString(candidate.education_details_json)}</span>
          </div>
          {/* Age */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaBirthdayCake className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{getAgeString(candidate)}</span>
          </div>
          {/* Salary */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaWallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{formatSalary(candidate.expected_salary)}</span>
          </div>
          {/* Location */}
          <div className="flex items-center gap-2 text-gray-700 min-w-0">
            <FaMapMarkerAlt className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="truncate font-medium">{getLocationString(candidate)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CandidateCard;