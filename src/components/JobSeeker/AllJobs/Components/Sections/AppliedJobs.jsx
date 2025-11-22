import React, { useState, useEffect, useCallback, useRef } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import ApplyModal from '../shared/ApplyModal';
import JobCard from '../shared/JobCard';
import JobApiService from '../shared/JobApiService';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import { toast } from "react-toastify";
import { useAuth } from "../../../../../Context/AuthContext";
import { formatQualification } from '../../utils/formatUtils';
import ViewJobs from "../ViewJobs";
import noJobsIllustration from '../../../../../assets/Illustrations/No jobs.png';
import useJobMessaging from '../hooks/useJobMessaging';
import JobMessagingModals from '../shared/JobMessagingModals';
import LoadingState from '../../../../common/LoadingState';
import JobActionConfirmationModal from '../shared/JobActionConfirmationModal';

// API Endpoints
const APPLY_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';

const AppliedJobs = ({ highlightJobId }) => {
  const { user, loading: userLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [appliedJobsData, setAppliedJobsData] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [favouriteJobs, setFavouriteJobs] = useState([]);
  const [pendingScrollJob, setPendingScrollJob] = useState(null);
  const skipPageResetRef = useRef(false);
  const [highlightedJobId, setHighlightedJobId] = useState(null);
  const [showFavouriteConfirmModal, setShowFavouriteConfirmModal] = useState(false);
  const [jobToFavourite, setJobToFavourite] = useState(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [jobToSave, setJobToSave] = useState(null);


  const getJobId = (job) => Number(job.id);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedJobs = useCallback(async () => {
    if (!user) {
      setAppliedJobIds([]);
      setAppliedJobsData([]);
      return;
    }
    try {
      const res = await fetch(APPLY_API + `?user_id=${user.firebase_uid || user.uid}`);
      const data = await res.json();
      const appliedJobs = Array.isArray(data)
        ? data.filter(j => j.is_applied === 1)
        : [];
      
      // Sort by applied_at in descending order (most recent first)
      appliedJobs.sort((a, b) => {
        const dateA = new Date(a.applied_at || 0);
        const dateB = new Date(b.applied_at || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      

      
      const ids = appliedJobs.map(j => Number(j.job_id));
      setAppliedJobIds(ids);
      setAppliedJobsData(appliedJobs);
    } catch (err) {
      setAppliedJobIds([]);
      setAppliedJobsData([]);
    }
  }, [user]);

  // Derive human-readable application status from applied row (backend stores dropdown value in application_status)
  const deriveStatusInfo = (appliedRow) => {
    if (!appliedRow || typeof appliedRow !== 'object') {
      return { text: 'Profile sent', variant: 'sent' };
    }
    const candidates = [
      appliedRow.application_status,
      appliedRow.status,
      appliedRow.stage,
      appliedRow.status_text,
      appliedRow.current_status,
    ].filter(Boolean);
    const raw = String(candidates[0] || '').trim();

    // Expire after 30 days if institute did not update any status
    if (!raw) {
      const appliedAt = appliedRow.applied_at || appliedRow.appliedAt || appliedRow.appliedDate;
      let isExpired = false;
      try {
        const appliedTs = appliedAt ? new Date(appliedAt).getTime() : 0;
        if (appliedTs) {
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          isExpired = Date.now() - appliedTs > THIRTY_DAYS_MS;
        }
      } catch {}
      if (isExpired) return { text: 'Expired', variant: 'expired' };
      return { text: 'Profile sent', variant: 'sent' };
    }
    const v = raw.toLowerCase();

    // Explicit dropdown values first
    if (/\bnot\s*selected\b/i.test(raw)) return { text: 'Not Selected', variant: 'rejected' };
    if (/\bselected\b/i.test(raw)) return { text: 'Selected', variant: 'hired' };
    if (/\binterview\s*scheduled\b/i.test(raw) || v.includes('interview')) return { text: 'Interview scheduled', variant: 'interview' };
    if (/\bprofile\s*in\s*review\b/i.test(raw) || v.includes('review') || v.includes('screen')) return { text: 'Under review', variant: 'review' };

    // Other common statuses
    if (v.includes('shortlist')) return { text: 'Shortlisted', variant: 'shortlisted' };
    if (v.includes('reject')) return { text: 'Rejected', variant: 'rejected' };
    if (v.includes('offer')) return { text: 'Offer made', variant: 'offer' };
    if (v.includes('hire')) return { text: 'Hired', variant: 'hired' };

    return { text: raw, variant: 'custom' };
  };

  const fetchSavedAndFavJobs = useCallback(async () => {
    try {
      const { savedJobs, favouriteJobs } = await JobApiService.fetchUserJobPreferences(user);
      setSavedJobs(savedJobs);
      setFavouriteJobs(favouriteJobs);
    } catch (error) {
      console.error('Error fetching user job preferences:', error);
      setSavedJobs([]);
      setFavouriteJobs([]);
    }
  }, [user]);

  const upsertJobAction = async (job, { favroute_jobs, saved_jobs }) => {
    if (!user) {
      toast.error("Please login to save jobs.");
      return;
    }
    try {
      const jobId = getJobId(job);
      const added_by = user.firebase_uid || user.uid || user.id;

      // First check if the job preference exists
      const res = await fetch(FAV_API);
      const data = await res.json();
      const existingPref = Array.isArray(data) 
        ? data.find(r => Number(r.id) === jobId && String(r.added_by) === String(added_by))
        : null;

      const payload = {
        id: jobId,
        firebase_uid: job.firebase_uid,
        job_name: job.job_title,
        added_by,
        favroute_jobs: favroute_jobs ? 1 : 0,
        saved_jobs: saved_jobs ? 1 : 0
      };

      const response = await fetch(FAV_API, {
        method: existingPref ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update job preference');
      }

      // Update local state immediately for better UX
      setSavedJobs(prev => {
        if (saved_jobs) {
          return [...new Set([...prev, jobId])];
        } else {
          return prev.filter(id => id !== jobId);
        }
      });

      setFavouriteJobs(prev => {
        if (favroute_jobs) {
          return [...new Set([...prev, jobId])];
        } else {
          return prev.filter(id => id !== jobId);
        }
      });

      // Fetch updated data from server to ensure sync
      await fetchSavedAndFavJobs();
    } catch (err) {
      console.error('Error updating job preference:', err);
      toast.error("Could not update job preference. Please try again.");
      // Revert local state by fetching fresh data
      await fetchSavedAndFavJobs();
    }
  };

  const handleSaveJob = async (job) => {
    if (!user) {
      toast.error("Please login to save jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isSaved = savedJobs.includes(jobId);
    
    // If saving (not removing), show confirmation modal first
    if (!isSaved) {
      setJobToSave({ job, isSaved });
      setShowSaveConfirmModal(true);
      return;
    }
    
    // If removing from saved, proceed directly
    try {
      await JobApiService.toggleSaveJob(job, user, false);
      await fetchSavedAndFavJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to update job preference. Please try again.");
    }
  };

  // Handle confirm save after modal confirmation
  const handleConfirmSave = async () => {
    if (!jobToSave || !user) {
      setShowSaveConfirmModal(false);
      setJobToSave(null);
      return;
    }
    
    const { job } = jobToSave;
    
    try {
      await JobApiService.toggleSaveJob(job, user, true);
      await fetchSavedAndFavJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to update job preference. Please try again.");
    } finally {
      setShowSaveConfirmModal(false);
      setJobToSave(null);
    }
  };

  // Handle cancel save confirmation
  const handleCancelSave = () => {
    setShowSaveConfirmModal(false);
    setJobToSave(null);
  };

  const handleFavouriteJob = async (job) => {
    if (!user) {
      toast.error("Please login to favourite jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isFavourite = favouriteJobs.includes(jobId);
    
    // If adding to favourites, show confirmation modal first
    if (!isFavourite) {
      setJobToFavourite({ job, isFavourite });
      setShowFavouriteConfirmModal(true);
      return;
    }
    
    // If removing from favourites, proceed directly
    try {
      await JobApiService.toggleFavouriteJob(job, user, false);
      await fetchSavedAndFavJobs();
    } catch (error) {
      console.error('Error favouriting job:', error);
      toast.error("Failed to update job preference. Please try again.");
    }
  };

  // Handle confirm favourite after modal confirmation
  const handleConfirmFavourite = async () => {
    if (!jobToFavourite || !user) {
      setShowFavouriteConfirmModal(false);
      setJobToFavourite(null);
      return;
    }
    
    const { job } = jobToFavourite;
    
    try {
      await JobApiService.toggleFavouriteJob(job, user, true);
      await fetchSavedAndFavJobs();
    } catch (error) {
      console.error('Error favouriting job:', error);
      toast.error("Failed to update job preference. Please try again.");
    } finally {
      setShowFavouriteConfirmModal(false);
      setJobToFavourite(null);
    }
  };

  // Handle cancel favourite confirmation
  const handleCancelFavourite = () => {
    setShowFavouriteConfirmModal(false);
    setJobToFavourite(null);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchAppliedJobs();
    fetchSavedAndFavJobs();
  }, [user, fetchAppliedJobs, fetchSavedAndFavJobs]);

  useEffect(() => {
    if (jobs.length && appliedJobsData.length) {
      // Create a map of job details for quick lookup
      const jobsMap = {};
      jobs.forEach(job => {
        jobsMap[Number(job.id)] = job;
      });
      // Create a map of applied rows for quick lookup
      const appliedMap = {};
      appliedJobsData.forEach(row => {
        appliedMap[Number(row.job_id)] = row;
      });

      // Build the filtered jobs array in the correct order based on appliedJobsData
      const appliedJobs = appliedJobsData
        .map(appliedJob => {
          const jobDetails = jobsMap[Number(appliedJob.job_id)];
          if (jobDetails) {
            const statusInfo = deriveStatusInfo(appliedJob);
            return {
              ...jobDetails,
              applied_at: appliedJob.applied_at, // Add the application timestamp
              application_status_text: statusInfo.text,
              application_status_variant: statusInfo.variant
            };
          }
          return null;
        })
        .filter(Boolean); // Remove null entries where job details weren't found

      setFilteredJobs(appliedJobs);
    } else {
      setFilteredJobs([]);
    }
    setCurrentPage(1);
  }, [jobs, appliedJobsData]);

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const isJobApplied = useCallback(() => true, []);

  const handleViewJob = useCallback((job) => {
    if (!job) return;
    console.log('AppliedJobs: Viewing job:', job.id);
    setSelectedJob(job);
  }, []);

  const getJobPage = useCallback(
    (jobId) => {
      if (jobId === undefined || jobId === null) return null;

      const numericJobId = Number(jobId);
      const jobIndex = filteredJobs.findIndex(job => Number(job.id) === numericJobId);

      if (jobIndex === -1) return null;

      return Math.floor(jobIndex / jobsPerPage) + 1;
    },
    [filteredJobs, jobsPerPage]
  );

  const {
    selectedJobs,
    showMessageModal,
    jobToMessage,
    handleMessage,
    handleMessageModalOk,
    handleMessageModalContinue,
    showApplyPrompt,
    jobToApplyPrompt,
    handleApplyPromptClose,
    handleApplyPromptApplyJob,
    showBulkMessageModal,
    handleCloseBulkMessageModal,
    bulkChannel,
    bulkMessage,
    bulkMessageChars,
    bulkError,
    coinBalance,
    handleChannelSelect,
    handleBulkMessageChange,
    handlePrepareBulkSend,
    showConfirmModal,
    bulkSummary,
    handleCancelConfirmation,
    handleConfirmSend,
    isSendingBulk,
    showInsufficientCoinsModal,
    requiredCoins,
    handleCloseInsufficientCoinsModal,
    handleRechargeNavigate
  } = useJobMessaging({
    user,
    filteredJobs,
    currentJobs,
    getJobId,
    isJobApplied,
    onViewJob: handleViewJob
  });

  const getVisiblePageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    rangeWithDots.push(...range);
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }
    return rangeWithDots;
  };

  const pageNumbers = totalPages <= 10 ? Array.from({ length: totalPages }, (_, i) => i + 1) : getVisiblePageNumbers();
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


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

  const scrollToJob = useCallback((jobId) => {
    if (!jobId) {
      console.warn('AppliedJobs scrollToJob: No jobId provided');
      return 'done';
    }

    const numericJobId = Number(jobId);
    if (!Number.isFinite(numericJobId)) {
      console.warn('AppliedJobs scrollToJob: Invalid job ID', jobId);
      return 'done';
    }

    const jobIndex = filteredJobs.findIndex(job => Number(job.id) === numericJobId);

    if (jobIndex !== -1) {
      const targetPage = Math.floor(jobIndex / jobsPerPage) + 1;
      const indexOfLastJob = currentPage * jobsPerPage;
      const indexOfFirstJob = indexOfLastJob - jobsPerPage;
      const isOnCurrentPage = jobIndex >= indexOfFirstJob && jobIndex < indexOfLastJob;

      if (!isOnCurrentPage) {
        skipPageResetRef.current = true;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        return 'pending';
      }
    }

    const tryFindAndScroll = (attempt = 0) => {
      const maxAttempts = 10;
      const delay = 100 + attempt * 50;

      setTimeout(() => {
        let jobElement = document.querySelector(`[data-job-id="${numericJobId}"]`);
        if (!jobElement) {
          jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
        }

        if (jobElement) {
          jobElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          setHighlightedJobId(numericJobId);
        } else if (attempt < maxAttempts) {
          tryFindAndScroll(attempt + 1);
        } else {
          console.warn('AppliedJobs scrollToJob: Job element not found in DOM');
        }
      }, delay);
    };

    tryFindAndScroll();
    return 'done';
  }, [filteredJobs, jobsPerPage, currentPage]);

  const handleBackFromJobView = useCallback((jobId) => {
    console.log('AppliedJobs handleBackFromJobView called, jobId:', jobId);
    if (!jobId) return;

    skipPageResetRef.current = true;
    setSelectedJob(null); // Clear selected job when going back

    const targetPage = getJobPage(jobId);
    if (targetPage && currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }
  }, [getJobPage, currentPage]);

  useEffect(() => {
    if (!highlightJobId) return;
    if (highlightedJobId === Number(highlightJobId)) return;
    skipPageResetRef.current = true;
    const result = scrollToJob(highlightJobId);
    if (result === 'pending') {
      setPendingScrollJob(String(highlightJobId));
    } else {
      setPendingScrollJob(null);
      skipPageResetRef.current = false;
    }
  }, [highlightJobId, scrollToJob, highlightedJobId]);

  // Function to handle viewing a job
  const isInitialising = loading || userLoading;

  return (
    <div className="widget-content">
      {isInitialising ? (
        <div className="py-10">
          <LoadingState
            title="Loading applied jobs…"
            subtitle="We’re gathering the positions you’ve already applied to so you can track progress."
            layout="card"
          />
        </div>
      ) : selectedJob ? (
        <ViewJobs job={selectedJob} onBack={handleBackFromJobView} />
      ) : (
        <>
          <div className="job-listing">
            <div className="widget-title mb-3">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
                  {`${filteredJobs.length} Jobs Applied`}
                </h3>
                <RecordsPerPageDropdown 
                  itemsPerPage={jobsPerPage}
                  onItemsPerPageChange={setJobsPerPage}
                />
              </div>
            </div>

            {currentJobs.length > 0 ? (
              <div className="job-results">
                <div className="job-list">
                  {currentJobs.map((job) => {
                    const jobId = getJobId(job);
                    const isSaved = savedJobs.includes(jobId);
                    const isFavourite = favouriteJobs.includes(jobId);
                    
                    return (
                      <JobCard
                        key={jobId}
                        job={job}
                        isSaved={isSaved}
                        isFavourite={isFavourite}
                        isApplied={true} // Always true in AppliedJobs
                        loading={loading}
                        showApplicationStatus={true} // Show application status in AppliedJobs
                        onViewJob={handleViewJob}
                        onSaveJob={handleSaveJob}
                        onFavouriteJob={handleFavouriteJob}
                        onMessage={handleMessage}
                        messageDisabled={false}
                        messageTooltip=""
                        isHighlighted={highlightedJobId === jobId}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="no-results text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <img 
                    src={noJobsIllustration} 
                    alt="No applied jobs" 
                    className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
                  />
                  <p className="text-gray-600 text-lg font-medium">No applied jobs available.</p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={paginate}
            totalItems={filteredJobs.length}
            itemsPerPage={jobsPerPage}
            currentPageStart={indexOfFirstJob + 1}
            currentPageEnd={Math.min(indexOfLastJob, filteredJobs.length)}
          />
        </>
      )}

      {/* Favourite Confirmation Modal */}
      <JobActionConfirmationModal
        isOpen={showFavouriteConfirmModal && !!jobToFavourite}
        actionType="favorite"
        onConfirm={handleConfirmFavourite}
        onCancel={handleCancelFavourite}
      />

      {/* Save Confirmation Modal */}
      <JobActionConfirmationModal
        isOpen={showSaveConfirmModal && !!jobToSave}
        actionType="save"
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />

      <JobMessagingModals
        showApplyPrompt={showApplyPrompt}
        jobToApplyPrompt={jobToApplyPrompt}
        onApplyPromptClose={handleApplyPromptClose}
        onApplyPromptApply={handleApplyPromptApplyJob}
        showMessageModal={showMessageModal}
        jobToMessage={jobToMessage}
        onMessageModalOk={handleMessageModalOk}
        onMessageModalContinue={handleMessageModalContinue}
        showBulkMessageModal={showBulkMessageModal}
        bulkChannel={bulkChannel}
        bulkMessage={bulkMessage}
        bulkMessageChars={bulkMessageChars}
        coinBalance={coinBalance}
        selectedCount={selectedJobs.size}
        bulkError={bulkError}
        onChannelSelect={handleChannelSelect}
        onBulkMessageChange={handleBulkMessageChange}
        onCloseBulkMessageModal={handleCloseBulkMessageModal}
        onPrepareBulkSend={handlePrepareBulkSend}
        showConfirmModal={showConfirmModal}
        bulkSummary={bulkSummary}
        isSendingBulk={isSendingBulk}
        onCancelConfirmation={handleCancelConfirmation}
        onConfirmSend={handleConfirmSend}
        showInsufficientCoinsModal={showInsufficientCoinsModal}
        requiredCoins={requiredCoins}
        onCloseInsufficientCoinsModal={handleCloseInsufficientCoinsModal}
        onRechargeNavigate={handleRechargeNavigate}
      />
    </div>
  );
};

export default AppliedJobs;