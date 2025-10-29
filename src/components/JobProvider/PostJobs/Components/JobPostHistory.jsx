import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';

// Confirmation Modal Component
const ConfirmationModal = ({ 
  showConfirmDialog, 
  setShowConfirmDialog, 
  selectedJob, 
  confirmPostSameJob 
}) => {
  if (!showConfirmDialog) return null;

  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowConfirmDialog(false);
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative border border-gray-200 animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-gray-200 relative bg-gray-50">
          <h5 className="m-0 text-xl font-semibold text-gray-900 leading-tight pr-10">
            Confirm Job Posting
          </h5>
          <button 
            type="button" 
            className="absolute top-5 right-5 bg-none border-none text-xl cursor-pointer p-1 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => setShowConfirmDialog(false)}
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <p className="m-0 mb-4 leading-relaxed text-gray-700">
            Are you sure you want to post the same job again?
          </p>
          <p className="m-0 mb-0 leading-relaxed text-gray-700">
            <strong className="text-gray-900 font-semibold">Job Title:</strong> {selectedJob?.job_title}
          </p>
        </div>
        <div className="p-4 pt-4 flex justify-end gap-3 border-t border-gray-200 bg-gray-50">
          <button 
            type="button" 
            className="px-5 py-2.5 rounded-md cursor-pointer border border-gray-500 bg-gray-500 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px hover:bg-gray-600 hover:border-gray-600"
            onClick={() => setShowConfirmDialog(false)}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="px-5 py-2.5 rounded-md cursor-pointer border border-blue-600 bg-blue-600 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px hover:bg-blue-700 hover:border-blue-700"
            onClick={confirmPostSameJob}
          >
            Yes, Post Job
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
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative border border-gray-200 animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-gray-200 relative bg-gray-50">
          <h5 className="m-0 text-xl font-semibold text-gray-900 leading-tight pr-10">
            Close Job
          </h5>
          <button 
            type="button" 
            className="absolute top-5 right-5 bg-none border-none text-xl cursor-pointer p-1 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <p className="m-0 mb-4 leading-relaxed text-gray-700">
            Are you sure you want to close this job?
          </p>
          <p className="m-0 mb-0 leading-relaxed text-gray-700">
            <strong className="text-gray-900 font-semibold">Job Title:</strong> {jobToClose?.job_title}
          </p>
          <div className="mt-3">
            <label htmlFor="closeReason" className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
              <strong className="text-gray-900">Reason for closing:</strong>
            </label>
            <select
              id="closeReason"
              className="w-full p-2.5 px-4 border-2 border-gray-200 rounded-md text-sm transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              required
            >
              <option value="" disabled>Select a reason</option>
              <option value="position_filled_teacherlink">✅ Position Filled via TeacherLink</option>
              <option value="position_filled_other">🤝 Position Filled through Other Means</option>
              <option value="hiring_on_hold">⏳ Hiring On Hold / Deferred / No Suitable Applications</option>
              <option value="other">❌ Other Reason (please specify...)</option>
            </select>
          </div>
          
          {closeReason === 'other' && (
            <div className="mt-3">
              <label htmlFor="customReason" className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
                <strong className="text-gray-900">Please specify the reason:</strong>
              </label>
              <textarea
                id="customReason"
                className="w-full p-2.5 px-4 border-2 border-gray-200 rounded-md text-sm transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please provide details about why you're closing this job..."
                rows="3"
                required
              />
            </div>
          )}
        </div>
        <div className="p-4 pt-4 flex justify-end gap-3 border-t border-gray-200 bg-gray-50">
          <button 
            type="button" 
            className="px-5 py-2.5 rounded-md cursor-pointer border border-gray-500 bg-gray-500 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px hover:bg-gray-600 hover:border-gray-600"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="px-5 py-2.5 rounded-md cursor-pointer border border-blue-600 bg-blue-600 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px hover:bg-blue-700 hover:border-blue-700"
            onClick={confirmCloseJob}
          >
            Close Job
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
              <div className="text-5xl text-gray-300 mb-4">
                <i className="la la-briefcase"></i>
              </div>
              <h6 className="text-gray-500 text-lg font-semibold mb-2">No Jobs Posted Yet</h6>
              <p className="text-gray-500">
                You haven't posted any jobs yet. Start by creating your first job post.
              </p>
            </div>
          ) : (
            // Job List
            <div className="w-full">
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4 w-full">
                <h6 className="text-gray-700 text-base font-semibold">Your Posted Jobs: {filteredJobs.length}</h6>
                <div className="relative flex-1 max-w-md min-w-[250px]">
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
                <div key={job.id || index} className={`mb-4 border border-gray-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden bg-white p-4 w-full hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 ${job.is_closed === 1 ? 'opacity-70 bg-gray-50 border-gray-200 relative' : ''}`}>
                  {job.is_closed === 1 && (
                    <div className="absolute top-2.5 right-2.5 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold z-10 shadow-md">
                      CLOSED
                    </div>
                  )}
                  {/* Job Card - Clean One Line */}
                  <div className="border-none shadow-none bg-none m-0 p-0 w-full">
                    <div className="p-0 m-0 bg-none w-full">
                      <div className="flex items-center m-0 w-full">
                        {/* Job ID Section */}
                        <div className="flex-none max-w-[10%] min-w-[80px] px-2 flex items-center">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold text-center inline-block whitespace-nowrap shadow-md w-fit">
                            ID: {job.id || `${index + 1}`}
                          </div>
                        </div>

                        {/* Job Title Section */}
                        <div className="flex-none max-w-[35%] min-w-[200px] px-2 flex flex-col items-start justify-center">
                          <h6 className="text-xl font-semibold text-gray-800 leading-tight m-0 mb-1 break-words">
                            {job.job_title || 'Untitled Job'}
                          </h6>
                          <p className="m-0 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded inline-block">
                            {job.job_type ? job.job_type.replace('_', ' ').toUpperCase() : 'N/A'}
                          </p>
                          {job.is_closed === 1 && job.reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Reason:</strong> {job.reason}
                            </p>
                          )}
                        </div>

                        {/* Posted Date Section */}
                        <div className="flex-none max-w-[15%] min-w-[120px] px-2 text-center flex flex-col items-center w-full">
                          <p className="m-0 mb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                            Posted
                          </p>
                          <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {formatDate(job.created_at || job.joining_date)}
                          </p>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="flex-1 max-w-[40%] min-w-[250px] px-2">
                          <div className="flex flex-row gap-2 justify-end flex-nowrap items-center pl-2.5 w-full">
                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handlePostSameJob(job)}
                            >
                              Post Same
                            </button>

                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleEditAndPost(job)}
                            >
                              Edit & Post
                            </button>

                            <button
                              className={`border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md ${expandedJobId === (job.id || index) ? 'opacity-90' : ''}`}
                              onClick={() => handleViewJob(job.id || index)}
                            >
                              {expandedJobId === (job.id || index) ? 'Hide' : 'View'}
                            </button>

                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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
                      <div className="border-t border-gray-200 bg-gray-50 p-5 -mx-4 -mb-4 w-[calc(100%+32px)]">
                        <div className="border-t border-gray-200 pt-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="mb-3 text-base font-semibold text-blue-600">
                                Job Information
                              </h6>
                              <div className="text-sm leading-relaxed text-gray-600">
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Type:</strong> {job.job_type || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Openings:</strong> {job.no_of_opening || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Salary:</strong> {job.min_salary && job.max_salary ? `₹${job.min_salary} - ₹${job.max_salary}` : 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Location:</strong> {job.city || job.location || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Joining Date:</strong> {formatDate(job.joining_date)}</div>
                              </div>
                            </div>
                            <div>
                              <h6 className="mb-3 text-base font-semibold text-red-600">
                                Requirements
                              </h6>
                              <div className="text-sm leading-relaxed text-gray-600">
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Qualifications:</strong> {Array.isArray(job.qualification) ? job.qualification.join(', ') : job.qualification || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Experience:</strong> {job.total_experience_min_years ? `${job.total_experience_min_years}+ years` : 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Subjects:</strong> {Array.isArray(job.subjects) ? job.subjects.join(', ') : job.subjects || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Gender:</strong> {job.gender || 'Any'}</div>
                              </div>
                            </div>
                          </div>
                          {job.job_description && (
                            <div className="mt-4">
                              <div className="w-full">
                                <h6 className="mb-3 text-base font-semibold text-purple-600">
                                  Job Description
                                </h6>
                                <p className="text-gray-600 leading-relaxed m-0 text-sm bg-white p-3 rounded-md border border-gray-200">
                                  {job.job_description}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
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