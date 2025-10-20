import React, { useState, useEffect, useCallback } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../Context/AuthContext";
import { formatQualification } from '../../utils/formatUtils';
import ViewJobs from "../ViewJobs";
import "../styles/jobs.css";

// API endpoints
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const FAV_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs";

const AppliedJobs = () => {
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
  const [lastSelectedJobId, setLastSelectedJobId] = useState(null);

  const recordsPerPageOptions = [10, 20, 30, 50];

  const getJobId = (job) => Number(job.id);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(JOBS_API);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      toast.error("Could not load job list. Please refresh.");
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
    if (!user) {
      setSavedJobs([]);
      setFavouriteJobs([]);
      return;
    }
    try {
      const added_by = user.firebase_uid || user.uid || user.id;
      const res = await fetch(FAV_API);
      const data = await res.json();
      const userRows = Array.isArray(data)
        ? data.filter(row => String(row.added_by) === String(added_by))
        : [];
      setSavedJobs(userRows.filter(j => j.saved_jobs === 1 || j.saved_jobs === true).map(j => Number(j.id)));
      setFavouriteJobs(userRows.filter(j => j.favroute_jobs === 1 || j.favroute_jobs === true).map(j => Number(j.id)));
    } catch (err) {
      console.error('Error fetching saved/fav jobs:', err);
      toast.error("Could not load your job preferences. Please refresh.");
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
    const jobId = getJobId(job);
    const isSaved = savedJobs.includes(jobId);
    await upsertJobAction(job, {
      favroute_jobs: favouriteJobs.includes(jobId) ? 1 : 0,
      saved_jobs: isSaved ? 0 : 1
    });
  };

  const handleFavouriteJob = async (job) => {
    const jobId = getJobId(job);
    const isFavourite = favouriteJobs.includes(jobId);
    await upsertJobAction(job, {
      favroute_jobs: isFavourite ? 0 : 1,
      saved_jobs: savedJobs.includes(jobId) ? 1 : 0
    });
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
          <p className="mt-2">Loading jobs...</p>
        </div>
      </div>
    );
  }

  // Function to scroll to a specific job
  const scrollToJob = (jobId) => {
    if (!jobId) {
      console.log('AppliedJobs scrollToJob: No jobId provided');
      return;
    }
    
    console.log('AppliedJobs scrollToJob: Looking for job with ID:', jobId);
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
      console.log('AppliedJobs scrollToJob: Found job element:', !!jobElement);
      
      if (jobElement) {
        console.log('AppliedJobs scrollToJob: Scrolling to job element');
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
        console.log('AppliedJobs scrollToJob: Added highlight class');
      } else {
        console.log('AppliedJobs scrollToJob: Job element not found in DOM');
      }
    }, 100);
  };

  // Function to handle back from job view
  const handleBackFromJobView = () => {
    console.log('AppliedJobs handleBackFromJobView called, lastSelectedJobId:', lastSelectedJobId);
    setSelectedJob(null);
    // Scroll to the previously selected job
    if (lastSelectedJobId) {
      // Add a longer delay to ensure the list has fully rendered
      setTimeout(() => {
        scrollToJob(lastSelectedJobId);
      }, 300);
    }
  };

  // Function to handle viewing a job
  const handleViewJob = (job) => {
    console.log('AppliedJobs: Viewing job:', job.id);
    setLastSelectedJobId(job.id);
    setSelectedJob(job);
  };

  return (
    <div className="widget-content">
      {selectedJob ? (
        <ViewJobs job={selectedJob} onBack={handleBackFromJobView} />
      ) : (
        <>
          <div className="job-listing">
            <div className="widget-title mb-3">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="d-flex">
                  <h5>
                    {`Applied Jobs (${filteredJobs.length} total)`}
                  </h5>
                </div>
                <div className="d-flex align-items-center">
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

            {currentJobs.length > 0 ? (
              <div className="job-results">
                <div className="job-list">
                  {currentJobs.map((job) => {
                    const jobId = getJobId(job);
                    const isSaved = savedJobs.includes(jobId);
                    const isFavourite = favouriteJobs.includes(jobId);
                    return (
                      <div key={jobId} className="job-item compact" data-job-id={jobId}>
                        <div className="job-row">
                          <div className="job-info-section">
                            <div className="job-header">
                              <div className="job-title-section">
                                <div className="job-title-line">
                                  <h5 className="job-title">{job.job_title || 'Position not specified'}</h5>
                                </div>
                                {job.institute_name && (
                                  <span className="company-name">{job.institute_name}</span>
                                )}
                              </div>
                              <div className="action-icons">
                                <span className={`status-pill status-${job.application_status_variant || 'sent'} status-inline`}>
                                  {job.application_status_text || 'Profile sent'}
                                </span>
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
                                  className={`action-icon-btn favourite-btn ${isFavourite ? 'favourited' : ''}`}
                                  onClick={() => handleFavouriteJob(job)}
                                  title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                                  disabled={loading}
                                >
                                  {isFavourite ? <AiFillHeart /> : <AiOutlineHeart />}
                                </button>
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
            ) : (
              <div className="no-results text-center py-5">
                <p>No applied jobs available.</p>
                <button className="btn btn-outline-primary" onClick={fetchJobs}>
                  Refresh
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
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
                      if (number === '...') {
                        return (
                          <li key={`dots-${index}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      return (
                        <li key={number} className={`page-item page-number ${currentPage === number ? 'active' : ''}`}>
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppliedJobs;