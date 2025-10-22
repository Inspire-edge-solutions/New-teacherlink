import React, { useState, useEffect, useCallback } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
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

// Additional API endpoints for specific functionality
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PRESENT_ADDRESS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress";
const APPLY_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';


const RecommendedJobs = ({ onViewJob, onBackFromJobView }) => {
  const { user, loading: userLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [savedJobs, setSavedJobs] = useState([]);
  const [favouriteJobs, setFavouriteJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [userJobPreferences, setUserJobPreferences] = useState(null);
  const [userPresentAddress, setUserPresentAddress] = useState(null);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);


  // Fetch user job preferences
  const fetchUserJobPreferences = useCallback(async () => {
    if (!user) {
      setUserJobPreferences(null);
      return;
    }
    try {
      const response = await fetch(JOB_PREFERENCE_API);
      const data = await response.json();
      const userPrefs = Array.isArray(data) 
        ? data.find(pref => pref.firebase_uid === (user.firebase_uid || user.uid))
        : null;
      setUserJobPreferences(userPrefs);
    } catch (error) {
      console.error("Error fetching job preferences:", error);
      setUserJobPreferences(null);
    }
  }, [user]);

  // Fetch user present address
  const fetchUserPresentAddress = useCallback(async () => {
    if (!user) {
      setUserPresentAddress(null);
      return;
    }
    try {
      const response = await fetch(PRESENT_ADDRESS_API);
      const data = await response.json();
      const userAddress = Array.isArray(data) 
        ? data.find(addr => addr.firebase_uid === (user.firebase_uid || user.uid))
        : null;
      console.log("User present address:", userAddress); // Debug log
      setUserPresentAddress(userAddress);
    } catch (error) {
      console.error("Error fetching present address:", error);
      setUserPresentAddress(null);
    }
  }, [user]);

  // Filter jobs based on user preferences and present address
  const filterJobsByPreferences = useCallback((allJobs, preferences, presentAddress) => {
    if (!allJobs || allJobs.length === 0) {
      return []; // Return empty array if no jobs available
    }

    // If no preferences and no present address, show NO jobs (user needs to set up profile)
    if (!preferences && !presentAddress) {
      console.log("No preferences or present address found - user needs to set up profile");
      return [];
    }

    return allJobs.filter(job => {
      let matchCount = 0;
      let availableCriteria = 0;

      // Count available criteria based on what data we have
      if (preferences) {
        if (preferences.full_time_online || preferences.full_time_offline) availableCriteria++;
        if (preferences.expected_salary) availableCriteria++;
        if (preferences.teaching_subjects) availableCriteria++;
        if (preferences.teaching_grades) availableCriteria++;
        if (preferences.preferred_country) availableCriteria++;
        if (preferences.preferred_state) availableCriteria++;
        if (preferences.preferred_city) availableCriteria++;
      }
      if (presentAddress) {
        if (presentAddress.state_name) availableCriteria++;
        if (presentAddress.city_name) availableCriteria++;
      }

      console.log(`Job ${job.id}: Available criteria: ${availableCriteria}, Preferences:`, preferences, "Present Address:", presentAddress);
      console.log(`Job ${job.id} data:`, {
        job_type: job.job_type,
        country: job.country,
        state_ut: job.state_ut,
        city: job.city,
        min_salary: job.min_salary,
        max_salary: job.max_salary,
        core_subjects: job.core_subjects
      });

      // 1. Job type match (enhanced to handle different job type formats)
      if (preferences) {
        const jobType = job.job_type ? job.job_type.toLowerCase() : '';
        
        // Check for online jobs (remote/work from home)
        if (preferences.full_time_online === "1" && (
          jobType === "online" || 
          jobType === "remote" || 
          jobType === "workfromhome" ||
          jobType === "wfh" ||
          jobType.includes("online")
        )) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Job type match - online/remote`);
        }
        // Check for offline jobs (fullTime, partTime, fullPart, etc.)
        else if (preferences.full_time_offline === "1" && (
          jobType === "offline" || 
          jobType === "fulltime" || 
          jobType === "parttime" || 
          jobType === "fullpart" ||
          jobType === "full_time" ||
          jobType === "part_time" ||
          jobType.includes("time") ||
          jobType === ""
        )) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Job type match - offline/in-person`);
        } else {
          console.log(`Job ${job.id}: ❌ Job type no match - pref online: ${preferences.full_time_online}, pref offline: ${preferences.full_time_offline}, job type: ${job.job_type}`);
        }
      }

      // 2. Salary range match (expected_salary vs min_salary/max_salary)
      if (preferences && preferences.expected_salary && job.min_salary && job.max_salary) {
        const prefSalary = preferences.expected_salary;
        const jobMinSalary = parseInt(job.min_salary);
        const jobMaxSalary = parseInt(job.max_salary);
        
        // Simple salary range matching
        if (prefSalary === "20k_40k" && jobMinSalary >= 20000 && jobMaxSalary <= 40000) {
          matchCount++;
        } else if (prefSalary === "40k_60k" && jobMinSalary >= 40000 && jobMaxSalary <= 60000) {
          matchCount++;
        } else if (prefSalary === "60k_80k" && jobMinSalary >= 60000 && jobMaxSalary <= 80000) {
          matchCount++;
        } else if (prefSalary === "80k_above" && jobMinSalary >= 80000) {
          matchCount++;
        }
      }

      // 3. Teaching subjects match (enhanced to include job titles)
      if (preferences && preferences.teaching_subjects) {
        const userSubjects = Array.isArray(preferences.teaching_subjects) 
          ? preferences.teaching_subjects 
          : [preferences.teaching_subjects];
        
        let hasSubjectMatch = false;
        
        // Check against core_subjects
        if (job.core_subjects) {
          const jobSubjects = Array.isArray(job.core_subjects) 
            ? job.core_subjects 
            : [job.core_subjects];
          
          hasSubjectMatch = userSubjects.some(userSubject => 
            jobSubjects.some(jobSubject => 
              jobSubject.toLowerCase().includes(userSubject.toLowerCase()) ||
              userSubject.toLowerCase().includes(jobSubject.toLowerCase())
            )
          );
        }
        
        // Check against job_title if no match found in core_subjects
        if (!hasSubjectMatch && job.job_title) {
          hasSubjectMatch = userSubjects.some(userSubject => 
            job.job_title.toLowerCase().includes(userSubject.toLowerCase()) ||
            userSubject.toLowerCase().includes(job.job_title.toLowerCase())
          );
        }
        
        if (hasSubjectMatch) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Teaching subjects match`);
        } else {
          console.log(`Job ${job.id}: ❌ Teaching subjects no match - user subjects: ${userSubjects}, job subjects: ${job.core_subjects}, job title: ${job.job_title}`);
        }
      }

      // 4. Preferred country match
      if (preferences && preferences.preferred_country && job.country) {
        if (preferences.preferred_country.toLowerCase() === job.country.toLowerCase()) {
          matchCount++;
        }
      }

      // 5. Preferred state match
      if (preferences && preferences.preferred_state && job.state_ut) {
        if (preferences.preferred_state.toLowerCase() === job.state_ut.toLowerCase()) {
          matchCount++;
        }
      }

      // 6. Preferred city match
      if (preferences && preferences.preferred_city && job.city) {
        if (preferences.preferred_city.toLowerCase() === job.city.toLowerCase()) {
          matchCount++;
        }
      }

      // 7. Teaching grades match (NEW - matches with job titles and core subjects)
      if (preferences && preferences.teaching_grades) {
        const userGrades = Array.isArray(preferences.teaching_grades) 
          ? preferences.teaching_grades 
          : [preferences.teaching_grades];
        
        let hasGradeMatch = false;
        
        // Check against job_title
        if (job.job_title) {
          hasGradeMatch = userGrades.some(userGrade => 
            job.job_title.toLowerCase().includes(userGrade.toLowerCase()) ||
            userGrade.toLowerCase().includes(job.job_title.toLowerCase())
          );
        }
        
        // Check against core_subjects if no match found in job_title
        if (!hasGradeMatch && job.core_subjects) {
          const jobSubjects = Array.isArray(job.core_subjects) 
            ? job.core_subjects 
            : [job.core_subjects];
          
          hasGradeMatch = userGrades.some(userGrade => 
            jobSubjects.some(jobSubject => 
              jobSubject.toLowerCase().includes(userGrade.toLowerCase()) ||
              userGrade.toLowerCase().includes(jobSubject.toLowerCase())
            )
          );
        }
        
        if (hasGradeMatch) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Teaching grades match`);
        } else {
          console.log(`Job ${job.id}: ❌ Teaching grades no match - user grades: ${userGrades}, job title: ${job.job_title}, job subjects: ${job.core_subjects}`);
        }
      }

      // 8. Present address state match (NEW)
      if (presentAddress && presentAddress.state_name && job.state_ut) {
        if (presentAddress.state_name.toLowerCase() === job.state_ut.toLowerCase()) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Present address state match - ${presentAddress.state_name} === ${job.state_ut}`);
        } else {
          console.log(`Job ${job.id}: ❌ Present address state no match - ${presentAddress.state_name} !== ${job.state_ut}`);
        }
      } else {
        console.log(`Job ${job.id}: ❌ Present address state missing data - presentAddress: ${!!presentAddress}, state_name: ${presentAddress?.state_name}, job.state_ut: ${job.state_ut}`);
      }

      // 9. Present address city match (NEW)
      if (presentAddress && presentAddress.city_name && job.city) {
        if (presentAddress.city_name.toLowerCase() === job.city.toLowerCase()) {
          matchCount++;
          console.log(`Job ${job.id}: ✅ Present address city match - ${presentAddress.city_name} === ${job.city}`);
        } else {
          console.log(`Job ${job.id}: ❌ Present address city no match - ${presentAddress.city_name} !== ${job.city}`);
        }
      } else {
        console.log(`Job ${job.id}: ❌ Present address city missing data - presentAddress: ${!!presentAddress}, city_name: ${presentAddress?.city_name}, job.city: ${job.city}`);
      }

      // Return true if job matches at least 2 criteria (more strict recommendation)
      // Require 2 matches for better relevance
      const requiredMatches = 2;
      console.log(`Job ${job.id}: Match count: ${matchCount}, Required: ${requiredMatches}, Available criteria: ${availableCriteria}`);
      
      if (matchCount >= requiredMatches) {
        console.log(`✅ Job ${job.id} RECOMMENDED - Matches ${matchCount} criteria`);
        return true;
      } else {
        console.log(`❌ Job ${job.id} NOT RECOMMENDED - Only matches ${matchCount} criteria (need ${requiredMatches})`);
        return false;
      }
    });
  }, []);

  // Get applied jobs but don't filter them out - just track which ones are applied
  const getAppliedJobs = useCallback(async (allJobs) => {
    if (!user) return allJobs;
    try {
      const res = await fetch(APPLY_API + `?user_id=${user.firebase_uid || user.uid}`);
      const data = await res.json();
      const appliedIds = Array.isArray(data)
        ? data.filter(j => j.is_applied === 1).map(j => Number(j.job_id))
        : [];
      setAppliedJobs(appliedIds);
      return allJobs; // Return all jobs, don't filter out applied ones
    } catch {
      setAppliedJobs([]);
      return allJobs;
    }
  }, [user]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      
      // Keep all jobs including closed ones
      const allJobs = await getAppliedJobs(data);
      
      // Filter jobs based on user preferences and present address
      console.log("Total jobs fetched:", allJobs.length);
      console.log("User job preferences:", userJobPreferences);
      console.log("User present address:", userPresentAddress);
      
      const filteredJobsByPreferences = filterJobsByPreferences(allJobs, userJobPreferences, userPresentAddress);
      
      console.log("Filtered jobs count:", filteredJobsByPreferences.length);
      
      // Only show jobs that match your profile - NO FALLBACK TO ALL JOBS
      setJobs(filteredJobsByPreferences);
      setFilteredJobs(filteredJobsByPreferences);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  }, [getAppliedJobs, filterJobsByPreferences, userJobPreferences, userPresentAddress]);

  // Fetch saved/fav jobs from backend for current user
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

  useEffect(() => {
    fetchUserJobPreferences();
  }, [fetchUserJobPreferences]);

  useEffect(() => {
    fetchUserPresentAddress();
  }, [fetchUserPresentAddress]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchSavedAndFavJobs();
  }, [user, fetchSavedAndFavJobs]);

  useEffect(() => {
    setFilteredJobs(jobs);
  }, [jobs]);

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      setFilteredJobs(jobs);
      setCurrentPage(1);
      return;
    }
    setIsSearching(true);
    const results = searchJobs(jobs, searchTerm);
    setSearchResults(results);
    setFilteredJobs(results);
    setCurrentPage(1);
  }, [jobs]);

  // JobID generator - always use .id from backend
  const getJobId = (job) => Number(job.id);

  // POST or PUT to backend for save/fav (by id)
  const upsertJobAction = async (job, { favroute_jobs, saved_jobs }) => {
    const added_by = user.firebase_uid || user.uid || user.id;
    const payload = {
      firebase_uid: job.firebase_uid,
      id: Number(job.id),
      favroute_jobs: favroute_jobs !== undefined ? favroute_jobs : undefined,
      saved_jobs: saved_jobs !== undefined ? saved_jobs : undefined,
      added_by
    };

    // Check if already present
    let isUpdate = false;
    try {
      const res = await fetch(FAV_API);
      const data = await res.json();
      isUpdate = Array.isArray(data) && data.some(
        r => String(r.id) === String(job.id) && String(r.added_by) === String(added_by)
      );
    } catch (error) { }

    try {
      if (!isUpdate && (favroute_jobs === 1 || saved_jobs === 1)) {
        const resp = await fetch(FAV_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('POST failed');
      } else {
        const resp = await fetch(FAV_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: Number(job.id) })
        });
        if (!resp.ok) throw new Error('PUT failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSaveJob = async (job) => {
    if (!user) {
      toast.error("Please login to save jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isSaved = savedJobs.includes(jobId);
    try {
      await JobApiService.toggleSaveJob(job, user, !isSaved);
      await fetchSavedAndFavJobs();
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

  const handleFavouriteJob = async (job) => {
    if (!user) {
      toast.error("Please login to favourite jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isFav = favouriteJobs.includes(jobId);
    try {
      await JobApiService.toggleFavouriteJob(job, user, !isFav);
      await fetchSavedAndFavJobs();
      toast.success(
        isFav
          ? `Removed "${job.job_title}" from favourites.`
          : `Marked "${job.job_title}" as favourite!`
      );
    } catch (error) {
      console.error('Error favouriting job:', error);
      toast.error(
        isFav
          ? `Failed to remove from favourites. Please try again.`
          : `Failed to mark as favourite. Please try again.`
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
      console.log('RecommendedJobs scrollToJob: No jobId provided');
      return;
    }
    
    console.log('RecommendedJobs scrollToJob: Looking for job with ID:', jobId);
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
      console.log('RecommendedJobs scrollToJob: Found job element:', !!jobElement);
      
      if (jobElement) {
        console.log('RecommendedJobs scrollToJob: Scrolling to job element');
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
        console.log('RecommendedJobs scrollToJob: Added highlight class');
      } else {
        console.log('RecommendedJobs scrollToJob: Job element not found in DOM');
      }
    }, 100);
  };

  // Function to handle back from job view
  const handleBackFromJobView = React.useCallback((jobId) => {
    console.log('RecommendedJobs handleBackFromJobView called, jobId:', jobId);
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
      console.log('RecommendedJobs: Registering handleBackFromJobView with parent');
      onBackFromJobView(handleBackFromJobView);
    }
  }, [onBackFromJobView, handleBackFromJobView]);

  // === VIEW JOB ===
  const handleViewJob = (job) => {
    if (job.is_closed === 1) {
      toast.error("This job is closed and cannot be viewed");
      return;
    }
    console.log('RecommendedJobs: Viewing job:', job.id);
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
      // toast.success("WhatsApp & RCS notification sent!");
    } catch (err) {
      toast.error("Failed to send WhatsApp or RCS notification.");
    }
  };

  const handleApplyJob = async () => {
    setApplyLoading(true);
    setApplyError("");
    setApplyStatus("");
    
    try {
      const result = await JobApiService.applyForJob(selectedJob, user, 100);
      
      if (result.status === "success") {
        setApplyStatus("success");
        setCoinValue(await JobApiService.getUserCoins(user));
        
        // Refresh jobs
        await fetchJobs();
        
        // Send WhatsApp notification
        await JobApiService.sendWhatsAppToInstitution(selectedJob, user);
        
        // Record coin history
        const personalDetails = await JobApiService.getUserPersonalDetails(user);
        if (personalDetails?.id) {
          await JobApiService.recordCoinHistory(selectedJob, user, 100, personalDetails.id);
        }
      } else if (result.status === "already") {
        setApplyStatus("already");
      await fetchJobs();
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

  // Pagination
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

  return (
    <div className="widget-content">
      <div className="widget-title mb-3">
        <div className="d-flex gap-3 align-items-center flex-nowrap">
          <div className="flex-shrink-0" style={{ whiteSpace: 'nowrap' }}>
            
          </div>
          <div style={{ flex: '3', minWidth: '200px' }} className="d-flex">
            <SearchBar onSearch={handleSearch} placeholder="Search jobs..." />
          </div>
          <div style={{ flex: '1', minWidth: '120px', maxWidth: '150px' }} className="flex-shrink-0">
          </div>
        </div>
      </div>

      <div className="job-listing">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
            {isSearching
              ? `Found ${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''}`
              : `${jobs.length} Jobs Recommended`
            }
          </h5>
          <RecordsPerPageDropdown 
            itemsPerPage={jobsPerPage}
            onItemsPerPageChange={setJobsPerPage}
          />
        </div>

        {currentJobs.length > 0 ? (
          <div className="job-results">
            <div className="job-list">
                          {currentJobs.map((job, index) => {
              const jobId = getJobId(job);
              const isSaved = savedJobs.includes(jobId);
              const isFavourite = favouriteJobs.includes(jobId);
              const isApplied = appliedJobs.includes(jobId);
              
              return (
                <JobCard
                  key={jobId}
                  job={job}
                  isSaved={isSaved}
                  isFavourite={isFavourite}
                  isApplied={isApplied}
                  loading={loading}
                  onViewJob={handleViewJob}
                  onSaveJob={handleSaveJob}
                  onFavouriteJob={handleFavouriteJob}
                  onApplyClick={handleApplyClick}
                />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="no-results text-center py-5">
            <p>No jobs available at the moment.</p>
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
    </div>
  );
};

export default RecommendedJobs;