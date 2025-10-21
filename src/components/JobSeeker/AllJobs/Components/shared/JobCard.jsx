import React from 'react';
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
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
  showApplicationStatus = false
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
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-4 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9] cursor-pointer" 
      data-job-id={jobId}
      onClick={() => onViewJob && onViewJob(job)}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-800 leading-tight">
              {job.job_title || 'Position not specified'}
            </h3>
            <span className="bg-pink-100 text-red-500 text-xs px-2 py-0.5 rounded-full font-medium">
              {formatTimeAgo(job.created_at || job.posted_at)}
            </span>
          </div>
          {job.institute_name && (
            <p className="text-gray-600 text-lg">
              {job.institute_name}
            </p>
          )}
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center gap-1 ml-3">
          {showApplicationStatus && (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
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
        </div>
      </div>

      {/* Details Section with Apply Button */}
      <div className="flex justify-between items-end">
        {/* Details Section - Two Columns with 60-40 ratio */}
        <div className="grid grid-cols-5 gap-2 flex-1">
          {/* Left Column - 60% space (3 columns) */}
          <div className="col-span-3 space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <BsMortarboard className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-lg">{formatQualification(job.qualification)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <IoLocationOutline className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-lg">{formatLocation(job.city, job.state_ut)}</span>
            </div>
          </div>
          
          {/* Right Column - 40% space (2 columns) */}
          <div className="col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <BsCash className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-lg">{formatSalary(job.min_salary, job.max_salary)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <BsBriefcase className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-lg">{job.job_type || 'Type not specified'}</span>
            </div>
          </div>
        </div>

        {/* Apply Button - Same line as details */}
        <div className="ml-4">
          {job.is_closed === 1 ? (
            <button 
              className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed"
              disabled
            >
              Closed
            </button>
          ) : isApplied ? (
            <button 
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium cursor-not-allowed"
              disabled
            >
              Applied ✓
            </button>
          ) : (
            <button 
              className="px-4 py-2 bg-gradient-brand text-white rounded-lg text-sm font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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