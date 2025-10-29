import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';

const SaveJobs = ({ onCreateNewJob, onEditJob, onSwitchToCreateTab }) => {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  // Fetch user's saved jobs
  useEffect(() => {
    if (user?.uid) {
      fetchSavedJobs();
    }
  }, [user]);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/closeJob?firebase_uid=${user.uid}`
      );
      
      console.log("=== SAVED JOBS DEBUG ===");
      console.log("API Response:", response.data);
      console.log("Current User UID:", user.uid);
      console.log("Response data type:", typeof response.data);
      console.log("Response data length:", Array.isArray(response.data) ? response.data.length : 'Not an array');
      
      const allJobs = response.data || [];
      console.log("All jobs from API:", allJobs);
      
      // Log each job to see its structure
      allJobs.forEach((job, index) => {
        console.log(`Job ${index}:`, {
          id: job.id,
          firebase_uid: job.firebase_uid,
          user_id: job.user_id,
          posted_by: job.posted_by,
          status: job.status,
          job_title: job.job_title,
          created_at: job.created_at
        });
      });
      
      const userSavedJobs = allJobs.filter(job => {
        const userMatch = job.firebase_uid === user.uid || 
                         job.user_id === user.uid ||
                         job.posted_by === user.uid;
        
        // Check if job has 'saved' status OR if it's a draft (empty job title)
        const statusMatch = job.status === 'saved' || 
                           job.status === undefined || 
                           !job.job_title || 
                           job.job_title.trim() === '';
        
        console.log(`Job ${job.id || 'no-id'}: userMatch=${userMatch}, statusMatch=${statusMatch}, status="${job.status}", job_title="${job.job_title}"`);
        
        return userMatch && statusMatch;
      });
      
      console.log("Filtered User Saved Jobs:", userSavedJobs);
      console.log("Final count:", userSavedJobs.length);
      console.log("=== END DEBUG ===");
      
      // Sort jobs by creation date (most recent first)
      const sortedJobs = userSavedJobs.sort((a, b) => {
        const dateA = new Date(a.created_at || a.saved_date || 0);
        const dateB = new Date(b.created_at || b.saved_date || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setSavedJobs(sortedJobs);
      setFilteredJobs(sortedJobs);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      toast.error('Failed to fetch saved jobs');
    } finally {
      setLoading(false);
    }
  };

  // Add search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredJobs(savedJobs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = savedJobs.filter(job => {
      const jobTitle = (job.job_title || '').toLowerCase();
      const jobId = (job.id || '').toString().toLowerCase();
      const savedDate = formatDate(job.created_at || job.saved_date).toLowerCase();
      const jobType = (job.job_type || '').toLowerCase();
      const location = (job.city || job.location || '').toLowerCase();

      return (
        jobTitle.includes(query) ||
        jobId.includes(query) ||
        savedDate.includes(query) ||
        jobType.includes(query) ||
        location.includes(query)
      );
    });

    setFilteredJobs(filtered);
  }, [searchQuery, savedJobs]);

  const handleEditAndPost = (job) => {
    onEditJob(job);
    onSwitchToCreateTab();
  };

  const handleViewJob = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const handleDeleteJob = (job) => {
    setJobToDelete(job);
    setShowDeleteDialog(true);
  };

  const confirmDeleteJob = async () => {
    try {
      if (!jobToDelete) return;
      
      // Send the job ID in the request body as JSON array, matching backend expectation
      await axios.delete(
        `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/closeJob`,
        {
          data: [jobToDelete.id], // Send as array as expected by backend
          headers: { "Content-Type": "application/json" }
        }
      );
      
      toast.success('Job deleted successfully!');
      setShowDeleteDialog(false);
      setJobToDelete(null);
      fetchSavedJobs(); // Refresh the list
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  const confirmPostSavedJob = async () => {
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
      fetchSavedJobs(); // Refresh the list
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null; // Return null so the || 'Not specified' works
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Confirmation Modal Component
  const ConfirmationModal = () => {
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
              Are you sure you want to post this saved job?
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
              onClick={confirmPostSavedJob}
            >
              Yes, Post Job
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const DeleteModal = () => {
    if (!showDeleteDialog) return null;
    
    return createPortal(
      <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-60 z-[9999] flex items-center justify-center p-5 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden relative border border-gray-200 animate-modalSlideIn">
          <div className="p-6 pb-4 border-b border-gray-200 relative bg-gray-50">
            <h5 className="m-0 text-xl font-semibold text-gray-900 leading-tight pr-10">
              Delete Saved Job
            </h5>
            <button 
              type="button" 
              className="absolute top-5 right-5 bg-none border-none text-xl cursor-pointer p-1 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setShowDeleteDialog(false)}
            >
              ×
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <p className="mb-3 text-gray-700 leading-relaxed">
              Are you sure you want to delete this saved job?
            </p>
            <p className="mb-3 text-gray-700 leading-relaxed">
              <strong className="text-gray-900 font-semibold">Job Title:</strong> {jobToDelete?.job_title || 'Untitled Job'}
            </p>
            <p className="mb-0 text-gray-700 leading-relaxed">
              This action cannot be undone.
            </p>
          </div>
          <div className="p-4 pt-4 flex justify-end gap-3 border-t border-gray-200 bg-gray-50">
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-md cursor-pointer border border-gray-500 bg-gray-500 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px hover:bg-gray-600 hover:border-gray-600"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-md cursor-pointer border border-red-600 bg-red-600 text-white text-sm font-medium transition-all duration-200 inline-flex items-center justify-center min-w-[80px] outline-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:translate-y-px hover:bg-red-700 hover:border-red-700"
              onClick={confirmDeleteJob}
            >
              Delete Job
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-full">
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <DeleteModal />

      <div className="m-0 w-full">
        <div className="p-0 w-full max-w-full">
          {savedJobs.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="text-5xl text-blue-600 mb-4">
                <i className="la la-bookmark"></i>
              </div>
              <h6 className="text-gray-900 text-lg font-semibold mb-2">No Saved Jobs Yet</h6>
              <p className="text-gray-500 mb-6">
                You haven't saved any job drafts yet. Start by creating a new job post.
              </p>
              <div className="mt-3">
                <button className="px-6 py-3 bg-gradient-brand text-white font-medium rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2" onClick={onCreateNewJob}>
                  Create New Job
                </button>
              </div>
            </div>
          ) : (
            // Job List
            <div className="w-full">
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4 w-full">
                <h6 className="text-gray-700 text-base font-semibold">Your Saved Jobs: {filteredJobs.length}</h6>
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
                <div key={job.id || index} className="mb-4 border border-gray-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden bg-white p-4 w-full hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300">
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
                            {job.job_type ? job.job_type.replace('_', ' ').toUpperCase() : 'Not specified'}
                          </p>
                        </div>

                        {/* Saved Date Section */}
                        <div className="flex-none max-w-[15%] min-w-[120px] px-2 text-center flex flex-col items-center w-full">
                          <p className="m-0 mb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                            Saved
                          </p>
                          <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {formatDate(job.saved_date || job.created_at)}
                          </p>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="flex-1 max-w-[40%] min-w-[250px] px-2">
                          <div className="flex flex-row gap-2 justify-end flex-nowrap items-center pl-2.5 w-full">
                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleViewJob(job.id)}
                            >
                              View
                            </button>

                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleEditAndPost(job)}
                            >
                              Edit
                            </button>

                            <button
                              className="border-none rounded-md py-2.5 px-3.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline flex-1 min-h-[38px] max-w-[120px] bg-gradient-brand text-white hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleDeleteJob(job)}
                            >
                              Delete
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
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Joining Date:</strong> {formatDate(job.joining_date) || 'Not specified'}</div>
                              </div>
                            </div>
                            <div>
                              <h6 className="mb-3 text-base font-semibold text-red-600">
                                Requirements
                              </h6>
                              <div className="text-sm leading-relaxed text-gray-600">
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Qualifications:</strong> {Array.isArray(job.qualification) ? job.qualification.join(', ') : job.qualification || 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Experience:</strong> {job.total_experience_min_years ? `${job.total_experience_min_years}+ years` : 'Not specified'}</div>
                                <div className="mb-2 py-1"><strong className="text-gray-900 font-semibold min-w-[120px] inline-block">Subjects:</strong> {(() => {
                                  if (Array.isArray(job.subjects)) {
                                    return job.subjects.length > 0 ? job.subjects.join(', ') : 'Not specified';
                                  }
                                  return job.subjects || 'Not specified';
                                })()}</div>
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

export default SaveJobs;