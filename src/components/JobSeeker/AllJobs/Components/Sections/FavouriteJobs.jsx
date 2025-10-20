import React, { useState, useEffect, useCallback } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import ApplyModal from '../shared/ApplyModal';
import { toast } from "react-toastify";
import SearchBar from '../shared/SearchBar';
import { searchJobs } from '../../utils/searchUtils';
import { formatQualification } from '../../utils/formatUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import '../styles/jobs.css';
import '../styles/modal.css';

const FAV_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs";
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const REDEEM_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral";
const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
const LOGIN_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const WHATSAPP_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp";
const RCS_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage";
const COIN_HISTORY_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history";


const FavouriteJobs = ({ onViewJob, onBackFromJobView }) => {
  const { user, loading: userLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [isSearching, setIsSearching] = useState(false);

  const [favouriteJobs, setFavouriteJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const recordsPerPageOptions = [10, 20, 30, 50];
  
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
      const response = await fetch(JOBS_API);
      const data = await response.json();
      setJobs(sortJobsByRecency(data));
    } catch (error) {
      toast.error("Could not load job list. Please refresh.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's favourite jobs, saved jobs, and applied jobs from backend (for this user only)
  const fetchFavAndSavedJobs = useCallback(async () => {
    if (!user) {
      setFavouriteJobs([]);
      setSavedJobs([]);
      setAppliedJobs([]);
      return;
    }
    try {
      const added_by = user.firebase_uid || user.uid || user.id;
      const res = await fetch(FAV_API);
      const data = await res.json();
      const userRows = Array.isArray(data)
        ? data.filter(row => String(row.added_by) === String(added_by))
        : [];
      setFavouriteJobs(userRows.filter(j => j.favroute_jobs === 1 || j.favroute_jobs === true).map(j => Number(j.id)));
      setSavedJobs(userRows.filter(j => j.saved_jobs === 1 || j.saved_jobs === true).map(j => Number(j.id)));
      
      // Fetch applied jobs
      try {
        const applyRes = await fetch(APPLY_API + `?user_id=${user.firebase_uid || user.uid}`);
        const applyData = await applyRes.json();
        const appliedIds = Array.isArray(applyData)
          ? applyData.filter(j => j.is_applied === 1).map(j => Number(j.job_id))
          : [];
        setAppliedJobs(appliedIds);
      } catch (err) {
        setAppliedJobs([]);
      }
    } catch (err) {
      toast.error("Could not load your favourites. Please refresh.");
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

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setIsSearching(false);
      setFilteredJobs(getVisibleJobs());
      setCurrentPage(1);
      return;
    }
    setIsSearching(true);
    const results = searchJobs(getVisibleJobs(), searchTerm);
    setFilteredJobs(sortJobsByRecency(results));
    setCurrentPage(1);
  }, [getVisibleJobs, sortJobsByRecency]);

  // JobID generator - always use .id from backend
  const getJobId = (job) => Number(job.id);

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
      await upsertJobAction(job, { favroute_jobs: 0 });
      await fetchFavAndSavedJobs();
      toast.info(`Removed "${job.job_title}" from your favourites.`);
    } catch (error) {
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
      await upsertJobAction(job, { saved_jobs: isSaved ? 0 : 1 });
      await fetchFavAndSavedJobs();
      toast.success(
        isSaved
          ? `Removed "${job.job_title}" from your saved jobs.`
          : `Saved "${job.job_title}" to your jobs!`
      );
    } catch (error) {
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

  // Function to scroll to a specific job
  const scrollToJob = (jobId) => {
    if (!jobId) {
      console.log('FavouriteJobs scrollToJob: No jobId provided');
      return;
    }
    
    console.log('FavouriteJobs scrollToJob: Looking for job with ID:', jobId);
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
      console.log('FavouriteJobs scrollToJob: Found job element:', !!jobElement);
      
      if (jobElement) {
        console.log('FavouriteJobs scrollToJob: Scrolling to job element');
        jobElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-job').forEach(el => {
          el.classList.remove('highlighted-job');
        });
        
        // Add highlight effect - this will persist until new selection
        jobElement.classList.add('highlighted-job');
        console.log('FavouriteJobs scrollToJob: Added highlight class');
      } else {
        console.log('FavouriteJobs scrollToJob: Job element not found in DOM');
      }
    }, 100);
  };

  // Function to handle back from job view
  const handleBackFromJobView = React.useCallback((jobId) => {
    console.log('FavouriteJobs handleBackFromJobView called, jobId:', jobId);
    // Scroll to the previously selected job
    if (jobId) {
      // Add a longer delay to ensure the list has fully rendered
      setTimeout(() => {
        scrollToJob(jobId);
      }, 300);
    }
  }, []);

  // Handle back from job view - expose the handler to parent
  React.useEffect(() => {
    if (onBackFromJobView) {
      console.log('FavouriteJobs: Registering handleBackFromJobView with parent');
      onBackFromJobView(handleBackFromJobView);
    }
  }, [onBackFromJobView, handleBackFromJobView]);

  // === VIEW JOB ===
  const handleViewJob = (job) => {
    if (job.is_closed === 1) {
      toast.error("This job is closed and cannot be viewed");
      return;
    }
    console.log('FavouriteJobs: Viewing job:', job.id);
    onViewJob && onViewJob(job);
  };

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
    const job = selectedJob;
    if (!job || !user) return;
    
    // 1. Get coins again (to avoid concurrency issues)
    try {
      const coinRes = await fetch(REDEEM_API);
      const coinData = await coinRes.json();
      const found = Array.isArray(coinData)
        ? coinData.find(d => d.firebase_uid === (user.firebase_uid || user.uid))
        : null;
      const coins = found?.coin_value ?? 0;
      setCoinValue(coins);

      if (coins < 30) {
        setApplyStatus("error");
        setApplyError("You do not have enough coins to apply for this job.");
        setApplyLoading(false);
        return;
      }
    } catch {
      setApplyStatus("error");
      setApplyError("Could not verify your coins. Try again.");
      setApplyLoading(false);
      return;
    }

    // 2. Check if already applied
    try {
      const res = await fetch(APPLY_API + `?job_id=${job.id}&user_id=${user.firebase_uid || user.uid}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setApplyStatus("already");
        setApplyLoading(false);
        return;
      }
    } catch { }

    // 3. Get personal details for fullName
    let fullName = "";
    try {
      const res = await fetch(PERSONAL_API + `?firebase_uid=${user.firebase_uid || user.uid}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        fullName = data[0].fullName || "";
      }
    } catch { fullName = ""; }

    // 4. Deduct coins by 30
    try {
      await fetch(REDEEM_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.firebase_uid || user.uid,
          coin_value: coinValue - 30
        })
      });
    } catch {
      setApplyStatus("error");
      setApplyError("Failed to deduct coins. Try again.");
      setApplyLoading(false);
      return;
    }

    // 5. Store apply job record
    try {
      await fetch(APPLY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(job.id),
          firebase_uid: job.firebase_uid,
          job_name: job.job_title,
          user_id: user.firebase_uid || user.uid,
          fullName,
          is_applied: 1
        })
      });
      setApplyStatus("success");
      setApplyLoading(false);
      sendWhatsAppApply(job);

      // === Coin History Logic ===
      try {
        let candidateId = null;
        const personalRes = await fetch(`${PERSONAL_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          if (Array.isArray(personalData) && personalData.length > 0) {
            candidateId = personalData[0].id;
          }
        }
        
        let unblocked_candidate_id = job.firebase_uid;
        let unblocked_candidate_name = null;
        try {
          const orgRes = await fetch(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
          if (orgRes.ok) {
            const orgData = await orgRes.json();
            if (Array.isArray(orgData) && orgData.length > 0) {
              unblocked_candidate_name = orgData[0].name;
            }
          }
        } catch {}
        
        await fetch(COIN_HISTORY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.firebase_uid || user.uid,
            candidate_id: candidateId,
            job_id: Number(job.id),
            coin_value: coinValue - 30,
            reduction: 30,
            reason: "Applied for the job",
            unblocked_candidate_id,
            unblocked_candidate_name
          })
        });
      } catch (coinHistoryError) {
        console.error("Error recording coin history:", coinHistoryError);
      }
    } catch (err) {
      setApplyStatus("error");
      setApplyError("Failed to apply for this job.");
      setApplyLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRecordsPerPageChange = (e) => {
    const newJobsPerPage = parseInt(e.target.value);
    setJobsPerPage(newJobsPerPage);
    setCurrentPage(1);
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
        <div className="loading-container text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading favourite jobs...</p>
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
            <select
              className="form-select form-select-sm"
              value={jobsPerPage}
              onChange={handleRecordsPerPageChange}
              aria-label="Records per page"
            >
              {recordsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="job-listing">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>
            {isSearching
              ? `Found ${filteredJobs.length} favourite job${filteredJobs.length !== 1 ? 's' : ''}`
              : `Favourite Jobs (${filteredJobs.length})`
            }
          </h5>
        </div>

        {currentJobs.length > 0 ? (
          <div className="job-results">
            <div className="job-list">
              {currentJobs.map((job, index) => {
                const jobId = getJobId(job);
                const isSaved = savedJobs.includes(jobId);
                return (
                  <div key={jobId} className="job-item compact" data-job-id={jobId}>
                    <div className="job-row">
                      <div className="job-info-section">
                        <div className="job-header">
                          <div className="job-title-section">
                            <h5 className="job-title">{job.job_title || 'Position not specified'}</h5>
                            {job.institute_name && (
                              <span className="company-name">{job.institute_name}</span>
                            )}
                          </div>
                          <div className="action-icons">
                            <button
                              className="action-icon-btn view-btn"
                              onClick={() => handleViewJob(job)}
                              title="View Job Details"
                            >
                              <AiOutlineEye />
                            </button>
                            <button
                              className={`action-icon-btn save-btn ${isSaved ? 'saved' : ''}`}
                              onClick={() => handleSaveJob(job)}
                              title={isSaved ? 'Remove from saved' : 'Save job'}
                              disabled={loading}
                            >
                              <AiOutlineSave />
                            </button>
                            <button
                              className="action-icon-btn favourite-btn favourited"
                              onClick={() => handleRemoveFromFavourites(job)}
                              title="Remove from favourites"
                              disabled={loading}
                            >
                              <AiFillHeart />
                            </button>
                            {job.is_closed === 1 ? (
                              <button className="btn btn-danger apply-btn" disabled>
                                Closed
                              </button>
                            ) : appliedJobs.includes(getJobId(job)) ? (
                              <button className="btn btn-success apply-btn" disabled>
                                Applied ✓
                              </button>
                            ) : (
                              <button 
                                className="btn btn-primary apply-btn" 
                                disabled={loading}
                                onClick={() => handleApplyClick(job)}
                              >
                                Apply Now
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="job-details-compact">
                          <div className="details-row">
                            <div className="detail-item">
                              <IoLocationOutline />
                              <span>{formatLocation(job.city, job.state_ut)}</span>
                            </div>
                            <div className="detail-item">
                              <BsBriefcase />
                              <span>{job.job_type || 'Type not specified'}</span>
                            </div>
                            <div className="detail-item">
                              <BsCash />
                              <span>{formatSalary(job.min_salary, job.max_salary)}</span>
                            </div>
                            <div className="detail-item">
                              <BsMortarboard />
                              <span>{formatQualification(job.qualification)}</span>
                            </div>
                          </div>
                        </div>
                        {/* {job.job_description && (
                          <div className="job-description-compact">
                            {job.job_description.substring(0, 150)}
                            {job.job_description.length > 150 && '...'}
                          </div>
                        )} */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isSearching ? (
          <div className="no-results text-center py-5">
            <AiFillHeart size={48} className="text-muted mb-3" />
            <h5 className="text-muted">No Results Found</h5>
            <p className="text-muted">
              No favourite jobs match your search criteria. Try adjusting your search terms.
            </p>
          </div>
        ) : (
          <div className="no-results text-center py-5">
            <AiFillHeart size={48} className="text-muted mb-3" />
            <h5 className="text-muted">No Favourite Jobs</h5>
            <p className="text-muted">
              You haven't marked any jobs as favourites yet. Star the jobs you love most to find them easily later.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                // Navigate to All Jobs tab
                const allJobsTab = document.querySelector('[data-tab="all"]');
                if (allJobsTab) allJobsTab.click();
              }}
            >
              Find Your Dream Jobs
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-box">
            <nav>
              <ul className="pagination">
                <li className={`page-item prev-btn ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {pageNumbers.map((number, index) => {
                  if (number === "...") {
                    return (
                      <li key={`dots-${index}`} className="page-item disabled">
                        <span className="page-link">...</span>
                      </li>
                    );
                  }
                  return (
                    <li key={number} className={`page-item page-number ${currentPage === number ? "active" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(number)}
                      >
                        {number}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item next-btn ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
            <div className="pagination-info mt-2">
              Showing {indexOfFirstJob + 1} to {Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} jobs
            </div>
          </div>
        )}

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
    </div>
  );
};

export default FavouriteJobs;