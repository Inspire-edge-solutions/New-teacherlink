import React from 'react';
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart, AiOutlineMessage } from "react-icons/ai";
import { formatQualification } from '../../utils/formatUtils';

/**
 * Shared JobCard component used across all job sections
 * Displays job information with action buttons
 */
const JobCard = ({ 
  job, 
  isSaved = false, 
  isFavourite = false, 
  isApplied = false, 
  loading = false,
  onViewJob,
  onSaveJob,
  onFavouriteJob,
  onApplyClick,
  showApplicationStatus = false,
  onMessage,
  showCheckbox = false,
  isChecked = false,
  onCheckboxChange,
  messageDisabled = false,
  messageTooltip = '',
  isHighlighted = false
}) => {
  const jobId = Number(job.id);
  
  // Helper functions for formatting
  const formatSalary = (minSalary, maxSalary) => {
    if (!minSalary && !maxSalary) return 'Salary not specified';
    if (!maxSalary) return `₹${minSalary}`;
    if (!minSalary) return `₹${maxSalary}`;
    return `₹${minSalary} - ₹${maxSalary}`;
  };

  const formatLocation = (city, state) => {
    if (!city && !state) return 'Location not specified';
    if (!state) return city;
    if (!city) return state;
    return `${city}, ${state}`;
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  return (
    <div 
      key={jobId} 
      className={`bg-white rounded-lg shadow-sm border border-gray-500 p-4 sm:p-5 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9] cursor-pointer ${isHighlighted ? 'highlighted-job' : ''}`} 
      data-job-id={jobId}
      onClick={() => onViewJob && onViewJob(job)}
    >
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4 overflow-x-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap mb-1 overflow-x-hidden">
            {showCheckbox && (
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheckboxChange && onCheckboxChange(job);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <h3 className="text-xl font-bold text-gray-800 leading-tight tracking-tight break-words max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {job.job_title || 'Position not specified'}
            </h3>
            <span className="bg-pink-100 text-red-500 text-base px-2 py-0.5 rounded-full font-medium leading-normal tracking-tight">
              {formatTimeAgo(job.created_at || job.posted_at)}
            </span>
          </div>
          {job.institute_name && (
            <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">
              {job.institute_name}
            </p>
          )}
        </div>
        {/* Action Icons */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:gap-1 md:ml-3">
          {showApplicationStatus && (
            <span className={`px-2 py-0.5 text-base rounded-full font-medium leading-normal tracking-tight ${
              job.application_status_variant === 'hired' ? 'bg-green-100 text-green-700' :
              job.application_status_variant === 'rejected' ? 'bg-red-100 text-red-700' :
              job.application_status_variant === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {job.application_status_text || 'Profile sent'}
            </span>
          )}
          <button
            className={`p-1.5 transition-colors ${
              isSaved 
                ? 'text-green-500 hover:text-green-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSaveJob && onSaveJob(job);
            }}
            title={isSaved ? 'Remove from saved' : 'Save job'}
            disabled={loading}
          >
            <AiOutlineSave className="w-7 h-7" />
          </button>
          <button
            className={`p-1.5 transition-colors ${
              isFavourite 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onFavouriteJob && onFavouriteJob(job);
            }}
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            disabled={loading}
          >
            {isFavourite ? <AiFillHeart className="w-7 h-7" /> : <AiOutlineHeart className="w-7 h-7" />}
          </button>
          {onMessage && (
            <button
              className={`p-1.5 transition-colors ${
                messageDisabled
                  ? 'text-gray-400 hover:text-gray-400'
                  : 'text-indigo-500 hover:text-indigo-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onMessage(job);
              }}
              title={messageTooltip || (messageDisabled ? 'Apply to message this institute' : 'Message institute')}
            >
              <AiOutlineMessage className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>

      {/* Details Section with Apply Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Details Section - Two Columns with 60-40 ratio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 flex-1">
          {/* Left Column - 60% space (3 columns) */}
          <div className="space-y-2 sm:col-span-2 md:col-span-3">
            <div className="flex items-center gap-2 text-gray-600 break-words">
              <BsMortarboard className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-lg sm:text-base leading-normal tracking-tight">{formatQualification(job.qualification)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 break-words">
              <IoLocationOutline className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-base md:text-lg">{formatLocation(job.city, job.state_ut)}</span>
            </div>
          </div>
          
          {/* Right Column - 40% space (2 columns) */}
          <div className="flex flex-row flex-wrap items-center gap-3 sm:flex-col sm:items-start sm:space-y-2 sm:gap-2 sm:col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 text-gray-600 break-words">
              <BsCash className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-base md:text-lg">{formatSalary(job.min_salary, job.max_salary)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 break-words">
              <BsBriefcase className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-base md:text-lg">{job.job_type || 'Type not specified'}</span>
            </div>
          </div>
        </div>

        {/* Apply Button - Same line as details */}
        <div className="md:ml-4 md:flex-shrink-0">
          {job.is_closed === 1 ? (
            <button 
              className="w-full md:w-auto px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-base font-medium cursor-not-allowed leading-normal tracking-tight"
              disabled
            >
              Closed
            </button>
          ) : isApplied ? (
            <button 
              className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded-lg text-base font-medium cursor-not-allowed leading-normal tracking-tight"
              disabled
            >
              Applied ✓
            </button>
          ) : (
            <button 
              className="w-full md:w-auto px-4 py-2 bg-gradient-brand text-white rounded-lg text-base font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                onApplyClick && onApplyClick(job);
              }}
            >
              {loading ? 'Processing...' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;