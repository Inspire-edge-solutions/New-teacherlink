import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';
import JobDetailsView from '../Shared/JobDetailsView';
import noJobsIllustration from '../../../../assets/Illustrations/No jobs.png';

// Confirmation Modal Component
const ConfirmationModal = ({ 
  showConfirmDialog, 
  setShowConfirmDialog, 
  selectedJob, 
  confirmPostSameJob 
}) => {
  if (!showConfirmDialog) return null;

  const handleClose = () => {
    setShowConfirmDialog(false);
  };

  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-20 z-[22222] flex items-center justify-center p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative flex flex-col animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                🔄
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 m-0">
                Post Same Job
              </h3>
            </div>
            <button 
              type="button" 
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xl"
              onClick={handleClose}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F0D8D9]">
          {/* Job Info Card */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💼</div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1 font-medium">Job Title</p>
                <p className="text-lg font-semibold text-gray-900 m-0">
                  {selectedJob?.job_title || 'Untitled Job'}
                </p>
              </div>
            </div>
          </div>

          {/* Information Message */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div>
                <p className="text-sm font-semibold text-blue-900 m-0 mb-2">
                  Post the same job again?
                </p>
                <p className="text-sm text-blue-800 m-0 leading-relaxed">
                  This will create a new job posting with the same details as the current one. The new posting will be active for 30 days from today.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button 
            type="button" 
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors min-w-[120px]"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-brand text-white font-medium hover:opacity-90 transition-opacity min-w-[150px] shadow-md"
            onClick={confirmPostSameJob}
          >
            🔄 Post Same Job
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Close Job Modal Component
const CloseJobModal = ({ 
  showCloseJobDialog, 
  setShowCloseJobDialog, 
  jobToClose, 
  closeReason, 
  setCloseReason, 
  customReason, 
  setCustomReason, 
  confirmCloseJob 
}) => {
  if (!showCloseJobDialog) return null;

  const handleClose = () => {
    setShowCloseJobDialog(false);
    setCloseReason('');
    setCustomReason('');
  };

  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-20 z-[22222] flex items-center justify-center p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative flex flex-col animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                ⚠️
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 m-0">
                Close Job Posting
              </h3>
            </div>
            <button 
              type="button" 
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xl"
              onClick={handleClose}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F0D8D9]">
          {/* Job Info Card */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💼</div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1 font-medium">Job Title</p>
                <p className="text-lg font-semibold text-gray-900 m-0">
                  {jobToClose?.job_title || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-xl">⚠️</span>
              <p className="text-sm text-amber-800 m-0 leading-relaxed">
                Are you sure you want to close this job? This action will stop accepting new applications. You can always reopen it later if needed.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="mb-4">
            <label 
              htmlFor="closeReason" 
              className="block text-sm font-semibold text-[#A1025D] mb-2"
            >
              📋 Reason for Closing
            </label>
            <select
              id="closeReason"
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm bg-white transition-all duration-300 focus:border-[#A1025D] focus:ring-4 focus:ring-pink-100 focus:outline-none hover:border-gray-400"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              required
            >
              <option value="" disabled>Select a reason...</option>
              <option value="position_filled_teacherlink">✅ Position Filled via TeacherLink</option>
              <option value="position_filled_other">🤝 Position Filled through Other Means</option>
              <option value="hiring_on_hold">⏳ Hiring On Hold / Deferred / No Suitable Applications</option>
              <option value="other">❌ Other Reason (please specify...)</option>
            </select>
          </div>
          
          {/* Custom Reason Textarea */}
          {closeReason === 'other' && (
            <div className="mt-4 animate-fadeIn">
              <label 
                htmlFor="customReason" 
                className="block text-sm font-semibold text-[#A1025D] mb-2"
              >
                ✏️ Please specify the reason
              </label>
              <textarea
                id="customReason"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm bg-white transition-all duration-300 focus:border-[#A1025D] focus:ring-4 focus:ring-pink-100 focus:outline-none hover:border-gray-400 resize-none"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please provide details about why you're closing this job..."
                rows="4"
                required
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-end gap-3">
          <button 
            type="button" 
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors min-w-[120px]"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-brand text-white font-medium hover:opacity-90 transition-opacity min-w-[150px] shadow-md"
            onClick={confirmCloseJob}
            disabled={!closeReason || (closeReason === 'other' && !customReason.trim())}
            style={{
              opacity: (!closeReason || (closeReason === 'other' && !customReason.trim())) ? 0.5 : 1,
              cursor: (!closeReason || (closeReason === 'other' && !customReason.trim())) ? 'not-allowed' : 'pointer'
            }}
          >
            🔒 Close Job
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const JobPostHistory = ({ onEditJob, onSwitchToCreateTab, refreshTrigger }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showCloseJobDialog, setShowCloseJobDialog] = useState(false);
  const [jobToClose, setJobToClose] = useState(null);
  const [closeReason, setCloseReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Fetch user's posted jobs
  useEffect(() => {
    if (user?.uid) {
      fetchUserJobs();
    }
  }, [user]);

  // Refresh jobs when refreshTrigger changes
  useEffect(() => {
    if (user?.uid && refreshTrigger > 0) {
      fetchUserJobs();
    }
  }, [refreshTrigger, user]);

  const fetchUserJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes?firebase_uid=${user.uid}`
      );
      
      console.log("API Response:", response.data);
      console.log("Current User UID:", user.uid);
      
      const allJobs = response.data || [];
      const userJobs = allJobs.filter(job => 
        job.firebase_uid === user.uid || 
        job.user_id === user.uid ||
        job.posted_by === user.uid
      );
      
      // Sort jobs by creation date (most recent first)
      const sortedJobs = userJobs.sort((a, b) => {
        const dateA = new Date(a.created_at || a.joining_date || 0);
        const dateB = new Date(b.created_at || b.joining_date || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      console.log("Filtered User Jobs:", sortedJobs);
      setJobs(sortedJobs);
      setFilteredJobs(sortedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch job history');
    } finally {
      setLoading(false);
    }
  };

  // Add search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredJobs(jobs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = jobs.filter(job => {
      const jobTitle = (job.job_title || '').toLowerCase();
      const jobId = (job.id || '').toString().toLowerCase();
      const postedDate = formatDate(job.created_at || job.joining_date).toLowerCase();
      const jobType = (job.job_type || '').toLowerCase();
      const location = (job.city || job.location || '').toLowerCase();

      return (
        jobTitle.includes(query) ||
        jobId.includes(query) ||
        postedDate.includes(query) ||
        jobType.includes(query) ||
        location.includes(query)
      );
    });

    setFilteredJobs(filtered);
  }, [searchQuery, jobs]);

  const handlePostSameJob = (job) => {
    setSelectedJob(job);
    setShowConfirmDialog(true);
  };

  const confirmPostSameJob = async () => {
    try {
      const jobData = { ...selectedJob };
      delete jobData.id; // Remove ID to create new job
      delete jobData.created_at; // Remove created date
      
      const response = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes",
        [jobData],
        { headers: { "Content-Type": "application/json" } }
      );
      
      toast.success('Job posted successfully!');
      setShowConfirmDialog(false);
      setSelectedJob(null);
      fetchUserJobs(); // Refresh the list
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    }
  };

  const handleEditAndPost = (job) => {
    // Debug: Log the job being edited
    console.log("Editing job - Original job data:", job);
    console.log("Job ID:", job.id, "Firebase UID:", job.firebase_uid);
    
    // Pass job data to parent component to fill the create form
    onEditJob(job);
    onSwitchToCreateTab();
  };

  const handleViewJob = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const handleCloseJob = (job) => {
    setJobToClose(job);
    setShowCloseJobDialog(true);
  };

  const confirmCloseJob = async () => {
    try {
      if (!closeReason.trim()) {
        toast.error('Please select a reason for closing the job.');
        return;
      }

      if (closeReason === 'other' && !customReason.trim()) {
        toast.error('Please specify the reason for closing the job.');
        return;
      }

      const finalReason = closeReason === 'other' ? customReason : closeReason;

      // Use the correct is_closed and reason fields
      const updatedJob = {
        ...jobToClose,
        is_closed: 1,
        reason: finalReason,
      };

      await axios.put(
        `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes`,
        [updatedJob], // Send as array as expected by the API
        { headers: { "Content-Type": "application/json" } }
      );

      toast.success('Job closed successfully!');
      setShowCloseJobDialog(false);
      setJobToClose(null);
      setCloseReason('');
      setCustomReason('');
      fetchUserJobs(); // Refresh the list
    } catch (error) {
      console.error('Error closing job:', error);
      toast.error('Failed to close job');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  if (loading) {
    return (
      <div className="w-full max-w-full">
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading job history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      {/* Render modals using portal */}
      <ConfirmationModal 
        showConfirmDialog={showConfirmDialog}
        setShowConfirmDialog={setShowConfirmDialog}
        selectedJob={selectedJob}
        confirmPostSameJob={confirmPostSameJob}
      />
      <CloseJobModal 
        showCloseJobDialog={showCloseJobDialog}
        setShowCloseJobDialog={setShowCloseJobDialog}
        jobToClose={jobToClose}
        closeReason={closeReason}
        setCloseReason={setCloseReason}
        customReason={customReason}
        setCustomReason={setCustomReason}
        confirmCloseJob={confirmCloseJob}
      />

      <div className="m-0 w-full">
        <div className="p-0 w-full max-w-full">
          {jobs.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">
                <img 
                  src={noJobsIllustration} 
                  alt="No jobs posted" 
                  className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
                />
                <h6 className="text-gray-700 text-lg font-semibold mb-2">No Jobs Posted Yet</h6>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 
                    'No jobs match your search criteria.' : 
                    'You haven\'t posted any jobs yet. Start by creating your first job post.'
                  }
                </p>
                {!searchQuery && onSwitchToCreateTab && (
                  <button 
                    className="px-6 py-3 bg-gradient-brand text-white font-medium rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                    onClick={onSwitchToCreateTab}
                  >
                    <i className="la la-plus"></i> Create New Job
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Job List
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-4 w-full">
                <h6 className="text-gray-700 text-base font-semibold whitespace-nowrap">Your Posted Jobs: {filteredJobs.length}</h6>
                <div className="relative w-full sm:flex-1 sm:max-w-md">
                  <input
                    type="text"
                    className="w-full p-2.5 px-4 pr-10 border border-gray-300 rounded-md text-sm transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Search by job title, ID, date, type, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <i className="la la-search absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base"></i>
                </div>
              </div>
              
              {filteredJobs.map((job, index) => (
                <div key={job.id || index} className={`mb-4 border border-gray-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden bg-white p-3 sm:p-4 w-full hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 hover:bg-[#F0D8D9] ${job.is_closed === 1 ? 'opacity-70 bg-gray-50 border-gray-200 relative' : ''}`}>
                  {job.is_closed === 1 && (
                    <div className="absolute top-2.5 right-2.5 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold z-10 shadow-md">
                      CLOSED
                    </div>
                  )}
                  {/* Job Card - Clean One Line */}
                  <div className="border-none shadow-none bg-none m-0 p-0 w-full">
                    <div className="p-0 m-0 bg-none w-full">
                      <div className="flex flex-row items-start m-0 w-full gap-3">
                        {/* Left Side: ID, Title, Date */}
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          {/* Top Row: ID and Title */}
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            {/* Job ID Section */}
                            <div className="flex-shrink-0 flex items-center">
                              <div className="bg-gradient-brand text-white px-3 py-1.5 rounded-xl text-xs font-semibold text-center inline-block whitespace-nowrap shadow-md w-fit">
                                ID: {job.id || `${index + 1}`}
                              </div>
                            </div>

                            {/* Job Title Section */}
                            <div className="flex-1 min-w-0 flex flex-col items-start justify-center">
                              <h6 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight m-0 mb-1 break-words sm:truncate w-full" title={job.job_title || 'Untitled Job'}>
                                {job.job_title || 'Untitled Job'}
                              </h6>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-2">
                                <p className="m-0 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded inline-block w-fit">
                                  {job.job_type ? job.job_type.replace('_', ' ').toUpperCase() : 'N/A'}
                                </p>
                              </div>
                              {job.is_closed === 1 && job.reason && (
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words sm:truncate w-full" title={job.reason}>
                                  <strong>Reason:</strong> {job.reason}
                                </p>
                              )}
                            </div>

                            {/* Posted Date Section - Hidden on mobile, shown on tablet+ */}
                            <div className="hidden md:flex flex-shrink-0 px-2 text-center flex-col items-center">
                              <p className="m-0 mb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                                Posted
                              </p>
                              <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                                {formatDate(job.created_at || job.joining_date)}
                              </p>
                            </div>
                          </div>

                          {/* Posted Date Section - Mobile only */}
                          <div className="md:hidden flex flex-shrink-0 text-left flex-row items-center gap-2">
                            <p className="m-0 text-xs text-gray-500 font-medium uppercase tracking-wide">
                              Posted:
                            </p>
                            <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                              {formatDate(job.created_at || job.joining_date)}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Action Buttons Section - Vertical on mobile, Horizontal on larger screens */}
                        <div className="flex-shrink-0 px-2">
                          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center lg:flex-nowrap">
                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handlePostSameJob(job)}
                            >
                              Post Same
                            </button>

                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleEditAndPost(job)}
                            >
                              Edit & Post
                            </button>

                            <button
                              className={`border-none rounded-md py-2 px-3 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md ${expandedJobId === (job.id || index) ? 'opacity-90' : ''}`}
                              onClick={() => handleViewJob(job.id || index)}
                            >
                              {expandedJobId === (job.id || index) ? 'Hide' : 'View'}
                            </button>

                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() => handleCloseJob(job)}
                              disabled={job.is_closed === 1}
                            >
                              {job.is_closed === 1 ? 'Closed' : 'Close Job'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Job Details - Clean One Line Style */}
                    {expandedJobId === (job.id || index) && (
                      <div className="border-t border-gray-200 p-4 sm:p-5 -mx-4 -mb-4 w-[calc(100%+32px)]">
                        <JobDetailsView 
                          jobData={job} 
                          variant="expanded"
                          formatDate={formatDate}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPostHistory;