import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineMessage } from "react-icons/ai";
import { formatQualification } from '../../utils/formatUtils';
import LoginConsentModal from '../../../../../components/common/LoginConsentModal';

/**
 * Public JobCard component for unauthenticated users
 * Redirects to login when user tries to interact
 */
const PublicJobCard = ({ job }) => {
  const navigate = useNavigate();
  const jobId = Number(job.id);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
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

  // Show consent modal before redirecting to login
  const handleAction = (action) => {
    setPendingAction(action);
    setShowConsentModal(true);
  };

  // Handle consent confirmation - redirect to login
  const handleConfirmLogin = () => {
    setShowConsentModal(false);
    navigate(`/login?redirect=/available-jobs&action=${pendingAction}&id=${jobId}&requiredUserType=Candidate`);
  };

  // Handle consent cancellation
  const handleCancel = () => {
    setShowConsentModal(false);
    setPendingAction(null);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-500 p-4 sm:p-5 mb-3 hover:shadow-md transition-all duration-200 hover:bg-[#F0D8D9]" 
      data-job-id={jobId}
    >
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-xl font-bold text-gray-800 leading-tight tracking-tight break-words">
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
      </div>

      {/* Details Section with Action Buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 flex-1">
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

        {/* Action Buttons */}
        <div className="md:ml-4 md:flex-shrink-0 flex flex-wrap gap-2">
          {job.is_closed === 1 ? (
            <button 
              className="w-full md:w-auto px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-base font-medium cursor-not-allowed leading-normal tracking-tight"
              disabled
            >
              Closed
            </button>
          ) : (
            <>
              <button 
                className="flex-1 md:flex-initial md:w-auto px-3 py-2 bg-gradient-brand-light md:bg-gradient-brand text-white rounded-lg text-base font-medium hover:bg-gradient-brand-light-hover md:hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md leading-normal tracking-tight"
                onClick={() => handleAction('view')}
              >
                <AiOutlineEye className="inline w-4 h-4 mr-1" />
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">View</span>
              </button>
              <button 
                className="flex-1 md:flex-initial md:w-auto px-3 py-2 bg-gradient-brand-light md:bg-gradient-brand text-white rounded-lg text-base font-medium hover:bg-gradient-brand-light-hover md:hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md leading-normal tracking-tight"
                onClick={() => handleAction('apply')}
              >
                Apply Now
              </button>
              <button 
                className="flex-1 md:flex-initial md:w-auto px-3 py-2 bg-gradient-brand-light md:bg-gradient-brand text-white rounded-lg text-base font-medium hover:bg-gradient-brand-light-hover md:hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md leading-normal tracking-tight"
                onClick={() => handleAction('message')}
              >
                <AiOutlineMessage className="inline w-4 h-4 mr-1" />
                Message
              </button>
            </>
          )}
        </div>
      </div>

      {/* Login Consent Modal */}
      <LoginConsentModal
        isOpen={showConsentModal}
        onClose={handleCancel}
        onConfirm={handleConfirmLogin}
        action={pendingAction}
        userType="Candidate"
      />
    </div>
  );
};

export default PublicJobCard;