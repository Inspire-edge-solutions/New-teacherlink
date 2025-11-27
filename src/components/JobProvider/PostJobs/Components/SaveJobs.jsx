import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';
import JobDetailsView from '../Shared/JobDetailsView';
import noDataIllustration from '../../../../assets/Illustrations/No data found.png';
import LoadingState from '../../../common/LoadingState';

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
  
  // Bulk messaging state
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkChannel, setBulkChannel] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageChars, setBulkMessageChars] = useState(0);
  const [bulkError, setBulkError] = useState('');
  const [coinBalance, setCoinBalance] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [showInsufficientCoinsModal, setShowInsufficientCoinsModal] = useState(false);
  const [requiredCoins, setRequiredCoins] = useState(0);

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
        `https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobClose?firebase_uid=${user.uid}`
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
        `https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobClose`,
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
      const savedJobId = selectedJob?.id;
      delete jobData.id; // Remove ID to create new job
      delete jobData.created_at; // Remove created date
      
      await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes",
        [jobData],
        { headers: { "Content-Type": "application/json" } }
      );
      
      // Remove the saved job after successful posting so it no longer appears in drafts
      if (savedJobId) {
        try {
          await axios.delete(
            `https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobClose`,
            {
              data: [savedJobId],
              headers: { "Content-Type": "application/json" }
            }
          );
        } catch (deleteError) {
          console.error('Error removing saved job after posting:', deleteError);
        }
      }

      // Optimistically update local state to reflect removal
      setSavedJobs(prev => prev.filter(job => job.id !== savedJobId));
      setFilteredJobs(prev => prev.filter(job => job.id !== savedJobId));

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

  // Bulk messaging handlers
  const handleCheckboxChange = (jobId) => {
    setSelectedJobs((prevSelected) => {
      const next = new Set(prevSelected);
      const jobIdString = String(jobId);
      if (next.has(jobIdString)) {
        next.delete(jobIdString);
      } else {
        next.add(jobIdString);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectAll((prev) => {
      const nextSelectAll = !prev;
      setSelectedJobs((prevSelected) => {
        const next = new Set(prevSelected);
        if (nextSelectAll) {
          filteredJobs.forEach((job) => {
            next.add(String(job.id || job.job_id));
          });
        } else {
          filteredJobs.forEach((job) => {
            next.delete(String(job.id || job.job_id));
          });
        }
        return next;
      });
      return nextSelectAll;
    });
  };

  useEffect(() => {
    setSelectedJobs(new Set());
    setSelectAll(false);
  }, [filteredJobs]);

  useEffect(() => {
    const pageJobIds = new Set(filteredJobs.map(job => String(job.id || job.job_id)));
    const selectedFromPage = Array.from(selectedJobs).filter(id => pageJobIds.has(id));
    setSelectAll(pageJobIds.size > 0 && selectedFromPage.length === pageJobIds.size);
  }, [filteredJobs, selectedJobs]);

  const resetBulkMessageForm = () => {
    setBulkChannel(null);
    setBulkMessage('');
    setBulkMessageChars(0);
    setBulkError('');
    setBulkSummary(null);
    setIsSendingBulk(false);
  };

  const handleOpenBulkMessageModal = () => {
    if (selectedJobs.size === 0) {
      toast.info('Select at least one job to send a message.');
      return;
    }
    resetBulkMessageForm();
    setShowBulkMessageModal(true);
  };

  const handleCloseBulkMessageModal = () => {
    setShowBulkMessageModal(false);
    resetBulkMessageForm();
  };

  const handleChannelSelect = (channel) => {
    setBulkChannel(channel);
    setBulkError('');
  };

  const handleBulkMessageChange = (event) => {
    const value = event.target.value || '';
    if (value.length <= 500) {
      setBulkMessage(value);
      setBulkMessageChars(value.length);
    } else {
      const trimmed = value.slice(0, 500);
      setBulkMessage(trimmed);
      setBulkMessageChars(500);
    }
  };

  useEffect(() => {
    if (!showBulkMessageModal || !user) return;
    (async () => {
      try {
        const response = await axios.get(`https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem?firebase_uid=${user.uid}`);
        const data = response.data;
        const found = Array.isArray(data) && data.length > 0 ? data[0] : data;
        setCoinBalance(found?.coin_value ?? 0);
      } catch (error) {
        console.error('Error fetching coin balance:', error);
        setCoinBalance(0);
      }
    })();
  }, [showBulkMessageModal, user]);

  const getSelectedJobRecords = () => {
    if (selectedJobs.size === 0) return [];
    return filteredJobs.filter(job => selectedJobs.has(String(job.id || job.job_id)));
  };

  const handlePrepareBulkSend = () => {
    if (!bulkChannel) {
      setBulkError('Choose a channel to continue.');
      return;
    }
    const trimmedMessage = bulkMessage.trim();
    if (!trimmedMessage) {
      setBulkError('Enter a message to send.');
      return;
    }
    const selectedRecords = getSelectedJobRecords();
    if (selectedRecords.length === 0) {
      setBulkError('Could not find the selected jobs.');
      return;
    }
    
    setBulkSummary({
      channel: bulkChannel,
      message: trimmedMessage,
      jobs: selectedRecords
    });
    setShowConfirmModal(true);
    setShowBulkMessageModal(false);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    if (bulkSummary) {
      setBulkChannel(bulkSummary.channel);
      setBulkMessage(bulkSummary.message);
      setBulkMessageChars(bulkSummary.message.length);
      setBulkSummary(null);
      setBulkError('');
      setShowBulkMessageModal(true);
    } else {
      resetBulkMessageForm();
    }
  };

  const handleCloseInsufficientCoinsModal = () => {
    setShowInsufficientCoinsModal(false);
    setRequiredCoins(0);
  };

  const handleRechargeNavigate = () => {
    setShowInsufficientCoinsModal(false);
    // Navigate to provider account page
    window.location.href = '/provider/my-account';
  };

  const handleConfirmSend = async () => {
    if (!bulkSummary || !user) return;
    setIsSendingBulk(true);
    try {
      // For JobProvider's saved jobs, we need to get candidate firebase_uids who applied to these jobs
      // Since these are job posts, we'll need to fetch applied candidates for each job
      // For now, using job firebase_uid as placeholder - this might need adjustment based on actual requirements
      const sendedTo = bulkSummary.jobs.map((job, index) => {
        let firebaseUid = null;
        
        // Try to get firebase_uid from job (this would be the institute/organization uid)
        if (job.firebase_uid) {
          firebaseUid = job.firebase_uid;
        } else if (job.user_id) {
          firebaseUid = job.user_id;
        } else if (job.posted_by) {
          firebaseUid = job.posted_by;
        }
        
        if (!firebaseUid) {
          console.warn(`⚠️ No firebase_uid found for job at index ${index}:`, {
            jobId: job.id,
            jobTitle: job.job_title,
            jobKeys: job ? Object.keys(job) : []
          });
        }
        
        return firebaseUid;
      }).filter(uid => uid !== null && uid !== undefined);

      if (sendedTo.length === 0) {
        toast.error('No valid recipients found in selected jobs. Please ensure jobs have valid information.');
        setIsSendingBulk(false);
        return;
      }
      
      if (sendedTo.length < bulkSummary.jobs.length) {
        const missingCount = bulkSummary.jobs.length - sendedTo.length;
        console.warn(`⚠️ ${missingCount} job(s) missing firebase_uid and will be skipped`);
        toast.warning(`${missingCount} job(s) missing information and will be skipped.`);
      }

      const userFirebaseUid = user.firebase_uid || user.uid;
      if (!userFirebaseUid) {
        toast.error('User authentication required.');
        setIsSendingBulk(false);
        return;
      }

      if (!Array.isArray(sendedTo) || sendedTo.length === 0) {
        console.error('❌ Invalid sendedTo array:', sendedTo);
        toast.error('No valid recipients found. Cannot submit message for approval.');
        setIsSendingBulk(false);
        return;
      }

      const approvalPayload = {
        firebase_uid: userFirebaseUid,
        message: bulkSummary.message.trim(),
        sendedeTo: sendedTo,
        channel: bulkSummary.channel || 'whatsapp',
        isApproved: false,
        isRejected: false,
        reason: ""
      };
      
      if (!approvalPayload.sendedeTo || !Array.isArray(approvalPayload.sendedeTo) || approvalPayload.sendedeTo.length === 0) {
        console.error('❌ Validation failed - sendedeTo is invalid:', approvalPayload.sendedeTo);
        toast.error('Invalid recipient data. Please try again.');
        setIsSendingBulk(false);
        return;
      }

      const response = await fetch(
        'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/approveMessage',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approvalPayload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      await response.json();
      
      toast.success(`Bulk message request submitted successfully! Your message is pending admin approval.`);
      
    } catch (error) {
      console.error('Error submitting bulk message for approval:', error);
      toast.error('Failed to submit message request. Please try again.');
    } finally {
      setIsSendingBulk(false);
      setShowConfirmModal(false);
      setBulkSummary(null);
      resetBulkMessageForm();
      setSelectedJobs(new Set());
      setSelectAll(false);
    }
  };

  // Confirmation Modal Component
  const ConfirmationModal = () => {
    if (!showConfirmDialog) return null;

    const handleClose = () => {
      setShowConfirmDialog(false);
      setSelectedJob(null);
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
                  ✅
                </div>
                <h3 className="text-2xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent m-0">
                  Confirm Job Posting
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
                    Ready to post this job?
                  </p>
                  <p className="text-sm text-blue-800 m-0 leading-relaxed">
                    This saved job will be posted and become active for 30 days. Make sure all details are correct before posting.
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
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-brand text-white font-medium hover:bg-gradient-primary-hover transition-opacity transition-colors min-w-[150px] shadow-md"
              onClick={confirmPostSavedJob}
            >
              ✅ Post Job
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const DeleteModal = () => {
    if (!showDeleteDialog) return null;
    
    const handleClose = () => {
      setShowDeleteDialog(false);
      setJobToDelete(null);
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
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                  🗑️
                </div>
                <h3 className="text-2xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent m-0">
                  Delete Saved Job
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
                    {jobToDelete?.job_title || 'Untitled Job'}
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Warning Message */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-900 m-0 mb-2">
                    This action cannot be undone!
                  </p>
                  <p className="text-sm text-red-800 m-0 leading-relaxed">
                    Are you sure you want to permanently delete this saved job? All job details will be lost and you'll need to recreate it from scratch.
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
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-brand text-white font-medium hover:bg-gradient-primary-hover transition-colors min-w-[150px] shadow-md"
              onClick={confirmDeleteJob}
            >
              🗑️ Delete Job
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-full py-12">
        <LoadingState
          title="Loading saved drafts…"
          subtitle="We’re fetching the job drafts you’ve saved so you can edit or post them."
        />
      </div>
    );
  }

  const handlePostJob = (job) => {
    setSelectedJob(job);
    setShowConfirmDialog(true);
  };

  return (
    <div className="w-full max-w-full">
      <ConfirmationModal />
      <DeleteModal />

      <div className="m-0 w-full">
        <div className="p-0 w-full max-w-full">
          {savedJobs.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">
                <img 
                  src={noDataIllustration} 
                  alt="No saved jobs" 
                  className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
                />
                <h6 className="text-gray-900 text-lg font-semibold mb-2">No Saved Jobs Yet</h6>
                <p className="text-gray-500 mb-6">
                  You haven't saved any job drafts yet. Start by creating a new job post.
                </p>
                <div className="mt-3">
                  <button className="px-6 py-3 bg-gradient-brand text-white font-medium rounded-full hover:bg-gradient-primary-hover transition-colors inline-flex items-center gap-2" onClick={onCreateNewJob}>
                    Create New Job
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Job List
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-4 w-full">
                <h6 className="text-gray-700 text-base font-semibold whitespace-nowrap">Your Saved Jobs: {filteredJobs.length}</h6>
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
              
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="selectAllSavedJobs"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                    <label htmlFor="selectAllSavedJobs" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                      Select All Jobs on This Page
                      {selectedJobs.size > 0 && (
                        <span className="text-gray-500 ml-2">({selectedJobs.size} total selected)</span>
                      )}
                    </label>
                  </div>
                  {selectedJobs.size > 0 && (
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-brand rounded-lg shadow-lg hover:bg-gradient-primary-hover transition-colors"
                      onClick={handleOpenBulkMessageModal}
                    >
                      <span role="img" aria-label="message">💬</span>
                      Send Message
                    </button>
                  )}
                </div>
              </div>
              
              {filteredJobs.map((job, index) => {
                const jobId = String(job.id || job.job_id || index);
                return (
                <div key={job.id || index} className="mb-4 border border-gray-200 rounded-lg shadow-sm transition-all duration-300 overflow-hidden bg-white p-3 sm:p-4 w-full hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 hover:bg-[#F0D8D9]">
                  {/* Job Card - Clean One Line */}
                  <div className="border-none shadow-none bg-none m-0 p-0 w-full">
                    <div className="p-0 m-0 bg-none w-full">
                      <div className="flex flex-row items-start m-0 w-full gap-3 overflow-x-hidden">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 flex items-center pt-1">
                          <input
                            type="checkbox"
                            id={`job-checkbox-${jobId}`}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedJobs.has(jobId)}
                            onChange={() => handleCheckboxChange(job.id || job.job_id || index)}
                          />
                        </div>
                        
                        {/* Left Side: ID, Title, Date */}
                        <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-hidden">
                          {/* Top Row: ID and Title */}
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3 overflow-x-hidden">
                            {/* Job ID Section */}
                            <div className="flex-shrink-0 flex items-center">
                              <div className="bg-gradient-brand text-white px-3 py-1.5 rounded-xl text-xs font-semibold text-center inline-block whitespace-nowrap shadow-md w-fit">
                                ID: {job.id || `${index + 1}`}
                              </div>
                            </div>

                            {/* Job Title Section */}
                            <div className="flex-1 min-w-0 flex flex-col items-start justify-center overflow-hidden">
                              <h6 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight m-0 mb-1 break-words sm:truncate max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }} title={job.job_title || 'Untitled Job'}>
                                {job.job_title || 'Untitled Job'}
                              </h6>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-2">
                                <p className="m-0 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded inline-block w-fit">
                                  {job.job_type ? job.job_type.replace('_', ' ').toUpperCase() : 'Not specified'}
                                </p>
                              </div>
                            </div>

                            {/* Saved Date Section - Hidden on mobile, shown on tablet+ */}
                            <div className="hidden md:flex flex-shrink-0 px-2 text-center flex-col items-center">
                              <p className="m-0 mb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                                Saved
                              </p>
                              <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                                {formatDate(job.saved_date || job.created_at) || 'Not specified'}
                              </p>
                            </div>
                          </div>

                          {/* Saved Date Section - Mobile only */}
                          <div className="md:hidden flex flex-shrink-0 text-left flex-row items-center gap-2">
                            <p className="m-0 text-xs text-gray-500 font-medium uppercase tracking-wide">
                              Saved:
                            </p>
                            <p className="m-0 text-sm text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                              {formatDate(job.saved_date || job.created_at) || 'Not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Action Buttons Section - Vertical on mobile, Horizontal on larger screens */}
                        <div className="flex-shrink-0 px-2">
                          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center lg:flex-nowrap">
                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold duration-300 transition-colors inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:bg-gradient-primary-hover hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleViewJob(job.id || index)}
                            >
                              {expandedJobId === (job.id || index) ? 'Hide' : 'View'}
                            </button>

                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold duration-300 transition-colors inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:bg-gradient-primary-hover hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handlePostJob(job)}
                            >
                              Post
                            </button>

                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold duration-300 transition-colors inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:bg-gradient-primary-hover hover:-translate-y-0.5 hover:shadow-md"
                              onClick={() => handleEditAndPost(job)}
                            >
                              Edit
                            </button>

                            <button
                              className="border-none rounded-md py-2 px-3 text-xs font-semibold duration-300 transition-colors inline-flex items-center gap-1 justify-center whitespace-nowrap cursor-pointer no-underline min-h-[38px] w-[100px] bg-gradient-brand text-white hover:bg-gradient-primary-hover hover:-translate-y-0.5 hover:shadow-md"
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
              );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Message Modal */}
      {showBulkMessageModal && (
        <div
          className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
          onClick={handleCloseBulkMessageModal}
        >
          <div
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCloseBulkMessageModal}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center">
              <h3 className="font-semibold text-[18px] mb-4 text-gray-800">
                Send Bulk Message
              </h3>
              <div className="text-gray-600 text-[15px] leading-relaxed space-y-1">
                <p>
                  <strong>20 coins</strong> per recipient via WhatsApp
                </p>
                <p>
                  <strong>10 coins</strong> per recipient via RCS
                </p>
                {coinBalance !== null && (
                  <p className="text-sm text-gray-500 mt-2">
                    Current balance: <strong>{coinBalance}</strong> coins
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Coins will be deducted after admin approval
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${bulkChannel === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-white text-[#25D366] border-[#25D366]'}`}
                onClick={() => handleChannelSelect('whatsapp')}
              >
                Through WhatsApp
              </button>
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${bulkChannel === 'rcs' ? 'bg-[#0a84ff] text-white border-[#0a84ff]' : 'bg-white text-[#0a84ff] border-[#0a84ff]'}`}
                onClick={() => handleChannelSelect('rcs')}
              >
                Through RCS
              </button>
            </div>

            {bulkChannel && (
              <div className="space-y-3">
                <textarea
                  value={bulkMessage}
                  onChange={handleBulkMessageChange}
                  maxLength={500}
                  rows={5}
                  placeholder="Enter your message here..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gradient-brand resize-none"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected</span>
                  <span>{bulkMessageChars}/500</span>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="mt-3 text-sm text-red-500 text-left">
                {bulkError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCloseBulkMessageModal}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePrepareBulkSend}
                disabled={!bulkChannel || bulkMessageChars === 0}
              >
                Review & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Confirmation Modal */}
      {showConfirmModal && bulkSummary && (
        <div
          className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
          onClick={handleCancelConfirmation}
        >
          <div
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-lg relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCancelConfirmation}
              disabled={isSendingBulk}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center space-y-2">
              <h3 className="font-semibold text-[18px] text-gray-800">
                Confirm &amp; Submit for Approval
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                You are about to submit a <strong>{bulkSummary.channel === 'whatsapp' ? 'WhatsApp' : 'RCS'}</strong> message request for <strong>{bulkSummary.jobs.length}</strong> job{bulkSummary.jobs.length !== 1 ? 's' : ''} for admin approval.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Your message will be reviewed by admin before being sent.
              </p>
            </div>

            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {bulkSummary.jobs.map((job, idx) => (
                <div key={job.id || idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="font-semibold text-sm text-gray-800">
                    {job.job_title || 'Untitled Job'}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {job.id || 'N/A'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-left text-sm text-gray-700 whitespace-pre-line">
              {bulkSummary.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCancelConfirmation}
                disabled={isSendingBulk}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmSend}
                disabled={isSendingBulk}
              >
                {isSendingBulk ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Coins Modal */}
      {showInsufficientCoinsModal && (
        <div
          className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
          onClick={handleCloseInsufficientCoinsModal}
        >
          <div
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCloseInsufficientCoinsModal}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center space-y-3">
              <h3 className="font-semibold text-[18px] text-gray-800">
                Insufficient Coins
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                You need <strong>{requiredCoins}</strong> coins to send this bulk message.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Current balance: <strong>{coinBalance ?? 0}</strong> coins. You are short by <strong>{Math.max(requiredCoins - (coinBalance ?? 0), 0)}</strong> coins.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCloseInsufficientCoinsModal}
              >
                Close
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl"
                onClick={handleRechargeNavigate}
              >
                Recharge Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveJobs;