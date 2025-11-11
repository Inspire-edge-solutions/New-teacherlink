import React, { useState, useEffect, useCallback, useRef } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { HiOutlineArrowRight } from "react-icons/hi";
import ApplyModal from '../shared/ApplyModal';
import JobCard from '../shared/JobCard';
import JobApiService from '../shared/JobApiService';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import { toast } from "react-toastify";
import SearchBar from '../shared/SearchBar';
import { searchJobs } from '../../utils/searchUtils';
import { formatQualification } from '../../utils/formatUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import noJobsIllustration from '../../../../../assets/Illustrations/No jobs.png';
import useJobMessaging from '../hooks/useJobMessaging';
import JobMessagingModals from '../shared/JobMessagingModals';
import LoadingState from '../../../../common/LoadingState';

// API Endpoints
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';

const FavouriteJobs = ({ onViewJob, onBackFromJobView, onNavigateTab, highlightJobId }) => {
  const { user, loading: userLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingScrollJob, setPendingScrollJob] = useState(null);
  const skipPageResetRef = useRef(false);
  const [highlightedJobId, setHighlightedJobId] = useState(null);

  const [favouriteJobs, setFavouriteJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  
  // Apply job state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // Sort helper: recent first using date-like fields or id fallback
  const sortJobsByRecency = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    const parseTime = (v) => { try { return v ? new Date(v).getTime() : 0; } catch { return 0; } };
    const getTs = (job) => {
      const ts = parseTime(job.posted_at || job.created_at || job.updated_at || job.published_at || job.timestamp || job.createdAt || job.updatedAt);
      if (ts) return ts;
      const idNum = Number(job.id || job.job_id);
      return isNaN(idNum) ? 0 : idNum;
    };
    return [...list].sort((a, b) => getTs(b) - getTs(a));
  }, []);

  // Fetch all jobs
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

  // Fetch user's favourite jobs, saved jobs, and applied jobs from backend (for this user only)
  const fetchFavAndSavedJobs = useCallback(async () => {
    try {
      const { savedJobs, favouriteJobs, appliedJobs } = await JobApiService.fetchUserJobPreferences(user);
      setSavedJobs(savedJobs);
      setFavouriteJobs(favouriteJobs);
      setAppliedJobs(appliedJobs);
    } catch (error) {
      console.error('Error fetching user job preferences:', error);
      setFavouriteJobs([]);
      setSavedJobs([]);
      setAppliedJobs([]);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchFavAndSavedJobs();
  }, [user, fetchFavAndSavedJobs]);

  // Only display jobs that are favourites and available in the jobs API
  const getVisibleJobs = useCallback(() => {
    const visible = jobs.filter(job => favouriteJobs.includes(Number(job.id)));
    return sortJobsByRecency(visible);
  }, [jobs, favouriteJobs, sortJobsByRecency]);

  // Keep filteredJobs in sync when jobs or favourites change
  useEffect(() => {
    setFilteredJobs(getVisibleJobs());
  }, [jobs, favouriteJobs, getVisibleJobs]);

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

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();

    if (!normalizedTerm) {
      setFilteredJobs(getVisibleJobs());
      setHighlightedJobId(null);
      if (isSearching && !skipPageResetRef.current) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      if (skipPageResetRef.current) {
        skipPageResetRef.current = false;
      }
      return;
    }
    setIsSearching(true);
    const results = searchJobs(getVisibleJobs(), normalizedTerm);
    setFilteredJobs(sortJobsByRecency(results));
    setHighlightedJobId(null);
    setCurrentPage(1);
  }, [getVisibleJobs, sortJobsByRecency, isSearching]);

  // JobID generator - always use .id from backend
  const getJobId = (job) => Number(job.id);

  // Pagination calculations
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  // Helper to check if job applied
  const isJobApplied = useCallback(
    (job) => appliedJobs.includes(getJobId(job)),
    [appliedJobs, getJobId]
  );

  // POST or PUT to backend for favourite (by id and added_by for current user only)
  const upsertJobAction = async (job, { favroute_jobs }) => {
    const added_by = user.firebase_uid || user.uid || user.id;
    const payload = {
      firebase_uid: job.firebase_uid,
      id: Number(job.id),
      favroute_jobs: favroute_jobs !== undefined ? favroute_jobs : undefined,
      added_by
    };

    // Check if already present (for THIS user only!)
    let isUpdate = false;
    try {
      const res = await fetch(FAV_API);
      const data = await res.json();
      isUpdate = Array.isArray(data) && data.some(
        r => String(r.id) === String(job.id) && String(r.added_by) === String(added_by)
      );
    } catch (error) {
      // Fail silent, just try POST and handle duplicate with PUT below
    }

    try {
      if (!isUpdate && favroute_jobs === 1) {
        const resp = await fetch(FAV_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('POST failed');
      } else {
        // PUT only affects this user's row
        const resp = await fetch(FAV_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: Number(job.id), added_by }) // id + added_by!
        });
        if (!resp.ok) throw new Error('PUT failed');
      }
    } catch (error) {
      throw error;
    }
  };

  // Remove from favourites (only for this user!)
  const handleRemoveFromFavourites = async (job) => {
    if (!user) {
      toast.error("Please login to remove favourites.");
      return;
    }
    const jobId = getJobId(job);
    try {
      await JobApiService.toggleFavouriteJob(job, user, false);
      await fetchFavAndSavedJobs();
      toast.info(`Removed "${job.job_title}" from your favourites.`);
    } catch (error) {
      console.error('Error removing from favourites:', error);
      toast.error(`Failed to remove "${job.job_title}" from favourites. Please try again.`);
    }
  };

  // Save job (for button UI, in case you want to support save/unsave here)
  const handleSaveJob = async (job) => {
    if (!user) {
      toast.error("Please login to save jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isSaved = savedJobs.includes(jobId);
    try {
      await JobApiService.toggleSaveJob(job, user, !isSaved);
      await fetchFavAndSavedJobs();
      toast.success(
        isSaved
          ? `Removed "${job.job_title}" from your saved jobs.`
          : `Saved "${job.job_title}" to your jobs!`
      );
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(
        isSaved
          ? `Failed to remove "${job.job_title}" from saved. Please try again.`
          : `Failed to save "${job.job_title}". Please try again.`
      );
    }
  };

  // === APPLY JOB ===
  const handleApplyClick = async (job) => {
    if (!user) {
      toast.error("Please login to apply for jobs.");
      return;
    }
    setSelectedJob(job);
    setShowApplyModal(true);
    setApplyStatus("");
    setApplyError("");
    setApplyLoading(false);
    setCoinValue(null);

    try {
      const coinRes = await fetch(REDEEM_API);
      const coinData = await coinRes.json();
      const found = Array.isArray(coinData)
        ? coinData.find(d => d.firebase_uid === (user.firebase_uid || user.uid))
        : null;
      setCoinValue(found?.coin_value ?? 0);
    } catch {
      setCoinValue(0);
    }
  };

  const handleViewJob = useCallback((job) => {
    if (job?.is_closed === 1) {
      toast.error("This job is closed and cannot be viewed");
      return;
    }
    onViewJob && onViewJob(job);
  }, [onViewJob]);

  const {
    selectedJobs,
    selectAll,
    handleCheckboxChange,
    handleSelectAll,
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
    handleOpenBulkMessageModal,
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
    onViewJob: handleViewJob,
    onApplyJob: handleApplyClick
  });

  // Function to scroll to a specific job
  const scrollToJob = useCallback((jobId) => {
    if (!jobId) {
      console.warn('FavouriteJobs scrollToJob: No jobId provided');
      return 'done';
    }

    const numericJobId = Number(jobId);
    if (!Number.isFinite(numericJobId)) {
      console.warn('FavouriteJobs scrollToJob: Invalid job ID', jobId);
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
          console.warn('FavouriteJobs scrollToJob: Job element not found in DOM');
        }
      }, delay);
    };

    tryFindAndScroll();
    return 'done';
  }, [filteredJobs, jobsPerPage, currentPage]);

  // Function to handle back from job view
  const handleBackFromJobView = useCallback((jobId) => {
    console.log('FavouriteJobs handleBackFromJobView called, jobId:', jobId);
    if (!jobId) return;

    skipPageResetRef.current = true;
    setHighlightedJobId(null);
    setPendingScrollJob(String(jobId));

    const targetPage = getJobPage(jobId);
    if (targetPage && currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }
  }, [getJobPage, currentPage]);

  // Handle back from job view - expose the handler to parent
  useEffect(() => {
    if (onBackFromJobView) {
      console.log('FavouriteJobs: Registering handleBackFromJobView with parent');
      onBackFromJobView(handleBackFromJobView);
    }
  }, [onBackFromJobView, handleBackFromJobView]);

  useEffect(() => {
    if (!pendingScrollJob) return;

    const timer = setTimeout(() => {
      const result = scrollToJob(pendingScrollJob);
      if (result !== 'pending') {
        setPendingScrollJob(null);
        skipPageResetRef.current = false;
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pendingScrollJob, scrollToJob, currentPage]);

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

  // ===== RCS Sending Function =====
  const sendRcsApply = async ({ phone, userName, orgName }) => {
    try {
      const contactId = phone.startsWith("91") ? phone : `91${phone}`;
      await fetch(RCS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contactId,
          templateName: "job_applied",
          customParam: {
            NAME: userName,
            SCHOOL: orgName
          },
          sent_by: "suhas",
          sent_email: "suhas75@gmail.com"
        })
      });
    } catch (err) {}
  };

  // WhatsApp sending function after apply success, now triggers RCS also
  const sendWhatsAppApply = async (job) => {
    let phone = "";
    let userName = "";
    let orgName = "";
    let errors = [];

    try {
      const loginRes = await fetch(`${LOGIN_API}?firebase_uid=${user.firebase_uid || user.uid}`);
      if (!loginRes.ok) throw new Error("Could not fetch user details");
      const loginData = await loginRes.json();
      if (Array.isArray(loginData) && loginData.length > 0) {
        phone = loginData[0].phone_number || "";
        userName = loginData[0].name || "";
      }
      if (!phone) errors.push("Phone number not found for WhatsApp.");
      if (!userName) errors.push("Name not found for WhatsApp.");
    } catch (err) {
      errors.push("Failed to fetch user phone/name.");
    }

    try {
      if (job.firebase_uid) {
        const orgRes = await fetch(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
        if (!orgRes.ok) throw new Error("Could not fetch org");
        const orgData = await orgRes.json();
        if (Array.isArray(orgData) && orgData.length > 0) {
          orgName = orgData[0].name || "";
        }
      }
      if (!orgName) orgName = job.institute_name || "";
      if (!orgName) errors.push("Organisation name not found for WhatsApp.");
    } catch (err) {
      if (!orgName) errors.push("Failed to fetch organisation name.");
    }

    if (errors.length) {
      return;
    }

    try {
      await fetch(WHATSAPP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.startsWith("91") ? phone : `91${phone}`,
          templateName: "applied_job",
          language: "en",
          bodyParams: [
            { type: "text", text: userName },
            { type: "text", text: `*${orgName}*` }
          ],
          sent_by: "suhas",
          sent_email: "suhas75@gmail.com"
        })
      });
      await sendRcsApply({ phone, userName, orgName });
    } catch (err) {
      toast.error("Failed to send WhatsApp or RCS notification.");
    }
  };

  const handleApplyJob = async () => {
    setApplyLoading(true);
    setApplyError("");
    setApplyStatus("");
    
    try {
      const result = await JobApiService.applyForJob(selectedJob, user, 30);
      
      if (result.status === "success") {
        setApplyStatus("success");
        setCoinValue(await JobApiService.getUserCoins(user));
        
        // Send WhatsApp notification
        await JobApiService.sendWhatsAppToInstitution(selectedJob, user);
        
        // Record coin history
        const personalDetails = await JobApiService.getUserPersonalDetails(user);
        if (personalDetails?.id) {
          await JobApiService.recordCoinHistory(selectedJob, user, 30, personalDetails.id);
        }
      } else if (result.status === "already") {
        setApplyStatus("already");
      } else {
        setApplyStatus("error");
        setApplyError(result.message);
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      setApplyStatus("error");
      setApplyError("Failed to apply for this job.");
    } finally {
      setApplyLoading(false);
    }
  };

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

  if (loading || userLoading) {
    return (
      <div className="widget-content">
        <div className="py-10">
          <LoadingState
            title="Loading favourite jobs…"
            subtitle="We’re gathering the roles you marked as favourites so you can return to them quickly."
            layout="card"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="widget-content">
      <div className="widget-title mb-3">
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="d-flex">
            <SearchBar onSearch={handleSearch} placeholder="Search favourite jobs..." />
          </div>
          <div className="d-flex">
          </div>
        </div>
      </div>

      <div className="job-listing">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
            {isSearching
              ? `Found ${filteredJobs.length} favourite job${filteredJobs.length !== 1 ? 's' : ''}`
              : `${filteredJobs.length} Favourite Jobs`
            }
          </h5>
          <RecordsPerPageDropdown 
            itemsPerPage={jobsPerPage}
            onItemsPerPageChange={setJobsPerPage}
          />
        </div>

        {currentJobs.length > 0 ? (
          <div className="job-results">
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="selectAllFavouriteJobs"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                  <label htmlFor="selectAllFavouriteJobs" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
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
            <div className="job-list">
              {currentJobs.map((job, index) => {
                const jobId = getJobId(job);
                const isSaved = savedJobs.includes(jobId);
                const isApplied = appliedJobs.includes(jobId);
                
                return (
                  <JobCard
                    key={jobId}
                    job={job}
                    isSaved={isSaved}
                    isFavourite={true} // Always true in FavouriteJobs
                    isApplied={isApplied}
                    loading={loading}
                    onViewJob={handleViewJob}
                    onSaveJob={handleSaveJob}
                    onFavouriteJob={handleRemoveFromFavourites}
                    onApplyClick={handleApplyClick}
                    onMessage={handleMessage}
                    messageDisabled={!isApplied}
                    messageTooltip={!isApplied ? 'Apply to message this institute' : ''}
                    isHighlighted={highlightedJobId === jobId}
                  />
                );
              })}
            </div>
          </div>
        ) : isSearching ? (
          <div className="no-results text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <img 
                src={noJobsIllustration} 
                alt="No favourite jobs found" 
                className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
              />
              <h5 className="text-gray-700 text-lg font-semibold mb-2">No Results Found</h5>
              <p className="text-gray-600">
                No favourite jobs match your search criteria. Try adjusting your search terms.
              </p>
            </div>
          </div>
        ) : (
          <div className="no-results text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <img 
                src={noJobsIllustration} 
                alt="No favourite jobs" 
                className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
              />
              <h5 className="text-gray-700 text-lg font-semibold mb-2">No Favourite Jobs</h5>
              <p className="text-gray-600 mb-4">
                You haven't marked any jobs as favourites yet. Star the jobs you love most to find them easily later.
              </p>
              <button
                className="px-4 py-2 bg-gradient-brand text-white rounded-lg text-sm font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab('all');
                    return;
                  }
                  const allJobsTab = document.querySelector('[data-tab="all"]');
                  if (allJobsTab) allJobsTab.click();
                }}
              >
                <span>Find Your Dream Jobs</span>
                <HiOutlineArrowRight className="text-lg" />
              </button>
            </div>
          </div>
        )}

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

        {/* Apply Job Modal */}
        <ApplyModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onApply={handleApplyJob}
          coinValue={coinValue}
          loading={applyLoading}
          applyStatus={applyStatus}
          error={applyError}
        />
      </div>

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

export default FavouriteJobs;
