import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import axios from "axios";
import { toast } from "react-toastify";
import SearchBar from '../shared/SearchBar';
import ApplyModal from '../shared/ApplyModal';
import JobCard from '../shared/JobCard';
import JobApiService from '../shared/JobApiService';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import FilterPanel from '../shared/FilterPanel';
import { searchJobs } from '../../utils/searchUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import noJobsIllustration from '../../../../../assets/Illustrations/No jobs.png';
import '../styles/job-highlight.css';
import LoadingState from '../../../../common/LoadingState';
import { applyJobFilters } from './searchJobFilters';
import useJobMessaging from '../hooks/useJobMessaging';
import JobMessagingModals from '../shared/JobMessagingModals';

// Additional API endpoints for specific functionality
const EDUCATION_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails";
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const APPLY_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const COIN_HISTORY_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history';


const AllJobs = ({ onViewJob, onBackFromJobView, highlightJobId }) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingScrollJob, setPendingScrollJob] = useState(null);
  const skipPageResetRef = useRef(false);
  const [highlightedJobId, setHighlightedJobId] = useState(null);

  const [savedJobs, setSavedJobs] = useState([]);
  const [favouriteJobs, setFavouriteJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const [filteredJobsByFilters, setFilteredJobsByFilters] = useState([]);
  const [currentFilters, setCurrentFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('jobFilters');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const { hasActiveFilters } = applyJobFilters([], parsed);
      return hasActiveFilters ? parsed : null;
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return null;
    }
  });


  // Profile navigation function
  const openMyProfile = (mode = "easy") => {
    const uid = user?.firebase_uid || user?.uid;
    if (!uid) return toast.error("No user id found for profile.");
    navigate(`/profile/${uid}?view=${mode}`);
  };

  // Sort helper: recent first using date fields or id fallback
  const sortJobsByRecency = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    const parseTime = (v) => {
      try { return v ? new Date(v).getTime() : 0; } catch { return 0; }
    };
    const getTs = (job) => {
      const ts = parseTime(job.posted_at || job.created_at || job.updated_at || job.published_at || job.timestamp || job.createdAt || job.updatedAt);
      if (ts) return ts;
      const idNum = Number(job.id || job.job_id);
      return isNaN(idNum) ? 0 : idNum;
    };
    return [...list].sort((a, b) => getTs(b) - getTs(a));
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

  // Refresh applied jobs list (without refetching all jobs)
  const refreshAppliedJobs = useCallback(async (showToast = true) => {
    if (!user) return;
    try {
      const res = await fetch(APPLY_API + `?user_id=${user.firebase_uid || user.uid}`);
      const data = await res.json();
      const appliedIds = Array.isArray(data)
        ? data.filter(j => j.is_applied === 1).map(j => Number(j.job_id))
        : [];
      setAppliedJobs(appliedIds);
      console.log('✅ Applied jobs refreshed:', appliedIds);
      if (showToast) {
        toast.success('Applied jobs updated!');
      }
    } catch (error) {
      console.error('❌ Failed to refresh applied jobs:', error);
      if (showToast) {
        toast.error('Failed to refresh applied jobs');
      }
    }
  }, [user]);

  // Auto-refresh when window/tab comes back into focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing applied jobs...');
      refreshAppliedJobs(false); // Don't show toast on auto-refresh
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshAppliedJobs]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      
      // Filter only approved jobs (isApproved === 1)
      const approvedJobs = Array.isArray(data) 
        ? data.filter(job => job.isApproved === 1)
        : [];
      
      // Keep all approved jobs including closed ones
      const allJobs = await getAppliedJobs(approvedJobs);
      
      setJobs(allJobs);
      setFilteredJobs(allJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  }, [getAppliedJobs]);

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
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchSavedAndFavJobs();
  }, [user, fetchSavedAndFavJobs]);

  useEffect(() => {
    setFilteredJobs(sortJobsByRecency(jobs));
  }, [jobs, sortJobsByRecency]);

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();

    if (!normalizedTerm) {
      setSearchResults([]);
      setFilteredJobs(jobs);
      setHighlightedJobId(null);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }
    setIsSearching(true);
    const results = searchJobs(jobs, normalizedTerm);
    const sorted = sortJobsByRecency(results);
    setSearchResults(sorted);
    setFilteredJobs(sorted);
    setHighlightedJobId(null);
    setCurrentPage(1);
  }, [jobs, sortJobsByRecency, isSearching]);

  // FILTER functionality
  const handleApplyFilters = useCallback((filters) => {
    setCurrentFilters(filters);
    const { filteredJobs, activeFilters, hasActiveFilters } = applyJobFilters(jobs, filters);

    setHasFiltersApplied(hasActiveFilters);

    if (hasActiveFilters) {
      setFilteredJobsByFilters(filteredJobs);
      setActiveFilters(new Set(activeFilters));
      if (filteredJobs.length === 0) {
        toast.info('No jobs match your filters. Try adjusting your selections.');
      }
    } else {
      setFilteredJobsByFilters([]);
      setActiveFilters(new Set());
    }
    if (!skipPageResetRef.current) {
      setHighlightedJobId(null);
      setCurrentPage(1);
    } else {
      skipPageResetRef.current = false;
    }
  }, [jobs]);

  const handleResetFilters = useCallback(() => {
    setCurrentFilters(null);
    setFilteredJobsByFilters([]);
    setActiveFilters(new Set());
    setHasFiltersApplied(false);
    if (!skipPageResetRef.current) {
      setHighlightedJobId(null);
      setCurrentPage(1);
    } else {
      skipPageResetRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!jobs.length) {
      return;
    }

    if (!currentFilters) {
      return;
    }

    const { filteredJobs, activeFilters: activeKeys, hasActiveFilters } = applyJobFilters(jobs, currentFilters);

    if (hasActiveFilters) {
      setFilteredJobsByFilters(filteredJobs);
      setActiveFilters(new Set(activeKeys));
      setHasFiltersApplied(true);
    } else {
      setFilteredJobsByFilters([]);
      setActiveFilters(new Set());
      setHasFiltersApplied(false);
    }
  }, [jobs, currentFilters]);

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

  // Check if user profile is approved
  const checkProfileApproval = async () => {
    if (!user) return false;
    
    try {
      const response = await fetch(PROFILE_APPROVED_API);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const userProfile = data.find(profile => 
          profile.firebase_uid === (user.firebase_uid || user.uid)
        );
        
        // Return true only if profile exists and isApproved === 1
        return userProfile && userProfile.isApproved === 1;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking profile approval:', error);
      return false;
    }
  };

  // === APPLY JOB ===
  const handleApplyClick = async (job) => {
    if (!user) {
      toast.error("Please login to apply for jobs.");
      return;
    }

    // Check if user profile is approved
    const isApproved = await checkProfileApproval();
    if (!isApproved) {
      toast.error("Your Profile is Currently under admin review, Please wait until it get approved");
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

  // === VIEW JOB ===
  const handleViewJob = (job) => {
    if (job.is_closed === 1) {
      toast.error("This job is closed and cannot be viewed");
      return;
    }
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
  // ✅ Sends confirmation to CANDIDATE (not institution) after they apply for a job
  // Template: applied_candidate_fineal (shows candidate name, job title, organization name)
  const sendWhatsAppApply = async (job) => {
    let phone = "";
    let userName = "";
    let orgName = "";
    let jobTitle = job?.job_title || job?.title || "Job Position";
    let jobCity = job?.city || job?.location || "Location";
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
      console.error('❌ Candidate WhatsApp Errors:', errors);
      console.error('❌ Phone:', phone);
      console.error('❌ UserName:', userName);
      console.error('❌ OrgName:', orgName);
      console.error('❌ JobTitle:', jobTitle);
      return;
    }

    try {
      console.log('📤 Sending WhatsApp confirmation to candidate...');
      console.log('📱 Candidate Phone:', phone);
      console.log('📋 Template: applied_candidate_fineal');
      console.log('📋 Job Title:', jobTitle);
      console.log('📋 Org Name:', orgName);
      console.log('📋 Job City:', jobCity);

      // ✅ Send proper candidate confirmation template (not applied_1_thing which is for institutions)
      const candidatePayload = {
        phone: formatPhone(phone),
        templateName: "applied_candidate_fineal", // Correct candidate confirmation template
        language: "en",
        bodyParams: [
          { type: "text", text: userName || "Candidate" },  // Candidate name
          { type: "text", text: jobTitle || "Position" },   // Job title
          { type: "text", text: orgName || "Organization" } // Organization name
        ],
        sent_by: "Suhas",
        sent_email: "suhas@teacherlink.in"
      };

      console.log('📦 Candidate WhatsApp Payload:', candidatePayload);

      const candidateResponse = await fetch(WHATSAPP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidatePayload)
      });

      const candidateResult = await candidateResponse.json();
      console.log('✅ Candidate WhatsApp API Response:', candidateResult);
      console.log('📊 Candidate Response Status:', candidateResponse.status);
      console.log('📋 Candidate Results Array:', candidateResult.results);

      if (candidateResult.results && candidateResult.results.length > 0) {
        const candidatePhoneResult = candidateResult.results[0];
        console.log('📱 Candidate Phone Result:', candidatePhoneResult);
        console.log('🔗 Candidate Full Telinfy Response:', JSON.stringify(candidatePhoneResult.telinfy, null, 2));
        if (candidatePhoneResult.status === 'FAILED') {
          console.log('❌ Candidate WhatsApp Error:', candidatePhoneResult.error);
          console.log('🔗 Candidate Telinfy Response:', candidatePhoneResult.telinfy);
        }
      }

      console.log('✅ WhatsApp confirmation sent to candidate successfully');
      await sendRcsApply({ phone, userName, orgName });
      // toast.success("WhatsApp & RCS notification sent!");
    } catch (err) {
      console.error('❌ Candidate WhatsApp Error:', err);
      console.error('❌ Error details:', err.message);
      console.error('❌ Full error object:', err);
      toast.error("Failed to send WhatsApp or RCS notification.");
    }
  };

  // New WhatsApp function for institution notification with detailed candidate info
  const sendWhatsAppToInstitution = async (job) => {
    try {
      // Extract job ID from job object
      const jobId = job.id || job.job_id || job.jobId;
      console.log('🔍 Job ID extracted:', jobId);
      
      // CRITICAL: Get candidate firebase_uid FIRST (needed for button context storage)
      const candidateFirebaseUid = user.firebase_uid || user.uid;
      console.log('🔍 Candidate Firebase UID:', candidateFirebaseUid);
      
      // 1. Get candidate phone from login API (will be overridden by personal API later)
      let candidatePhone = "";
      try {
        const loginRes = await fetch(`${LOGIN_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (Array.isArray(loginData) && loginData.length > 0) {
            candidatePhone = loginData[0].phone_number || "";
          }
        }
      } catch (err) {
        console.error("Failed to fetch candidate phone from login API:", err);
        candidatePhone = "";
      }

      // 2. Get organization phone from job's firebase_uid
      let orgPhone = "";
      try {
        const orgRes = await fetch(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (Array.isArray(orgData) && orgData.length > 0) {
            orgPhone = orgData[0].contact_person_phone1 || "";
          }
        }
      } catch (err) {
        console.error("Failed to fetch organization phone:", err);
        return;
      }

      if (!orgPhone) {
        console.error("Organization phone not found");
        return;
      }

      // 2. Get candidate's fullName from personal API
      let candidateName = "";
      try {
        const personalRes = await fetch(`${PERSONAL_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          if (Array.isArray(personalData) && personalData.length > 0) {
            candidateName = personalData[0].fullName || "";
          }
        }
      } catch (err) {
        console.error("Failed to fetch candidate name:", err);
        candidateName = "Candidate";
      }

      // 3. Get job title
      const jobTitle = job.job_title || "Position";

      // 4. Get highest education from education API
      let highestEducation = "";
      try {
        const educationRes = await fetch(`${EDUCATION_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (educationRes.ok) {
          const educationData = await educationRes.json();
          if (Array.isArray(educationData) && educationData.length > 0) {
            // Find the highest education level
            const educationLevels = educationData
              .filter(edu => edu.education_type)
              .map(edu => edu.education_type)
              .sort((a, b) => {
                // Simple sorting logic for education levels
                const levels = {
                  'grade 10': 1, 'grade 12': 2, 'diploma': 3, 'bachelor': 4, 
                  'master': 5, 'phd': 6, 'b.ed': 7, 'm.ed': 8
                };
                const aLevel = levels[a.toLowerCase()] || 0;
                const bLevel = levels[b.toLowerCase()] || 0;
                return bLevel - aLevel; // Highest first
              });
            highestEducation = educationLevels[0] || "Not specified";
          }
        }
      } catch (err) {
        console.error("Failed to fetch education details:", err);
        highestEducation = "Not specified";
      }

      // 5. Get candidate's phone number (override with personal API data)
      try {
        const personalRes = await fetch(`${PERSONAL_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          if (Array.isArray(personalData) && personalData.length > 0) {
            candidatePhone = personalData[0].callingNumber || candidatePhone;
          }
        }
      } catch (err) {
        console.error("Failed to fetch candidate phone from personal API:", err);
        // Keep the phone from login API if personal API fails
      }

      // 6. Get expected salary from jobPreference API
      let expectedSalary = "Not specified";
      try {
        const jobPreferenceRes = await fetch(`${JOB_PREFERENCE_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (jobPreferenceRes.ok) {
          const jobPreferenceData = await jobPreferenceRes.json();
          if (Array.isArray(jobPreferenceData) && jobPreferenceData.length > 0) {
            expectedSalary = jobPreferenceData[0].expected_salary || "Not specified";
          }
        }
      } catch (err) {
        console.error("Failed to fetch expected salary:", err);
        expectedSalary = "Not specified";
      }

      // 7. Generate encrypted profile link
      const candidateData = {
        phone: candidatePhone,
        name: candidateName,
        jobTitle: jobTitle,
        education: highestEducation,
        salary: expectedSalary
      };
      const encryptedData = btoa(JSON.stringify(candidateData)); // Use browser's btoa instead of Buffer
      const token = localStorage.getItem('token');
      const fullProfileLink = `https://yphjaiosk5.execute-api.ap-south-1.amazonaws.com/dev/view-profile/${encryptedData}?token=${token}`;

      console.log('📤 Sending WhatsApp message to institution...');
      console.log('📱 Raw org phone:', orgPhone);
      console.log('📱 Cleaned org phone:', formatPhone(orgPhone));
      console.log('📋 Template: candidate_apply_113');
      console.log('🔗 Profile Link:', fullProfileLink);

      // 8. Send candidate_apply_113 template to institution (template only, no custom buttons)
      const whatsappPayload = {
        phone: formatPhone(orgPhone),
        templateName: "candidate_apply_113",
        language: "en",
        bodyParams: [
          { type: "text", text: candidateName || "Suhas L" },
          { type: "text", text: jobTitle || "Cloud Engineer" },
          { type: "text", text: highestEducation || "MCA" },
          { type: "text", text: expectedSalary || "20000" }
        ],
        sent_by: "Suhas",
        sent_email: "suhas@teacherlink.in"
      };

      console.log('📦 WhatsApp Template Payload:', whatsappPayload);
      console.log('📋 Data being sent:', {
        candidateName,
        jobTitle, 
        highestEducation,
        expectedSalary
      });

      const whatsappResponse = await fetch(WHATSAPP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(whatsappPayload)
      });

      const whatsappResult = await whatsappResponse.json();
      console.log('✅ WhatsApp API Response:', whatsappResult);
      console.log('📊 Response Status:', whatsappResponse.status);
      console.log('📋 Results Array:', whatsappResult.results);

      if (whatsappResult.results && whatsappResult.results.length > 0) {
        const phoneResult = whatsappResult.results[0];
        console.log('📱 Phone Result:', phoneResult);
        console.log('🔗 Institution Full Telinfy Response:', JSON.stringify(phoneResult.telinfy, null, 2));
        if (phoneResult.status === 'FAILED') {
          console.log('❌ WhatsApp Error:', phoneResult.error);
          console.log('🔗 Telinfy Response:', phoneResult.telinfy);
          toast.error(`WhatsApp to institution failed: ${phoneResult.error}`);
        } else {
          toast.success("WhatsApp sent to institution!");
        }
      }

      console.log('WhatsApp notification sent to institution successfully');

      // 🔑 CRITICAL: Store button context for webhook lookup
      // When institution clicks "View Profile" on template, webhook will look up this mapping
      console.log('📦 Storing button context for webhook...');
      try {
        const buttonContextResponse = await fetch(
          'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/button-context',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              institutionPhone: formatPhone(orgPhone), // Normalized 10-digit phone
              candidateFirebaseUid: candidateFirebaseUid,
              jobId: jobId
            })
          }
        );
        const buttonContextResult = await buttonContextResponse.json();
        console.log('✅ Button context stored:', buttonContextResult);
      } catch (contextError) {
        console.error('⚠️ Failed to store button context (non-critical):', contextError);
        // Don't fail the whole flow if context storage fails
      }

      // Now send a separate interactive message with clickable button
      // Wait 2 seconds to ensure template is delivered first
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📤 Sending interactive button message...');
      console.log('🔍 Using Candidate Firebase UID:', candidateFirebaseUid);
      
      // Try list message instead of button for better payload preservation
      const interactivePayload = {
        phone: formatPhone(orgPhone),
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: "New Candidate Applied"
          },
          body: {
            text: `📋 Job ID: ${jobId}\n👤 Candidate: ${candidateName}\n🆔 Candidate ID: ${candidateFirebaseUid}\n\n*Note: Viewing full profile will deduct 5 coins.*`
          },
          action: {
            button: "View Options",
            sections: [
              {
                title: "Actions",
                rows: [
                  {
                    id: `job_${jobId}_candidate_${candidateFirebaseUid}`,
                    title: "View Profile",
                    description: `${candidateName} - ${jobTitle}`
                  }
                ]
              }
            ]
          }
        }
      };

      console.log('📦 Interactive Message Payload:', JSON.stringify(interactivePayload, null, 2));

      try {
        const interactiveResponse = await fetch(WHATSAPP_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(interactivePayload)
        });

        const interactiveResult = await interactiveResponse.json();
        console.log('✅ Interactive Message Response:', interactiveResult);

        if (interactiveResponse.ok) {
          console.log('✅ Interactive button sent successfully');
        } else {
          console.error('❌ Failed to send interactive message:', interactiveResult);
        }
      } catch (interactiveErr) {
        console.error('❌ Error sending interactive message:', interactiveErr);
      }

      console.log("WhatsApp notification sent to institution successfully");
      
      // applied_institution template will be sent when institution clicks "View Profile" button
    } catch (err) {
      console.error("Failed to send WhatsApp notification to institution:", err);
    }
  };

  // Send applied_institution template with actual candidate data
  const sendAppliedInstitutionTemplate = async (orgPhone, candidateName, jobTitle, highestEducation, candidatePhone, profileLink) => {
    try {
      console.log('📤 Sending applied_institution template with actual candidate data...');
      console.log('📱 Org Phone:', orgPhone);
      console.log('👤 Candidate Name:', candidateName);
      console.log('💼 Job Title:', jobTitle);
      console.log('🎓 Education:', highestEducation);
      console.log('📞 Phone:', candidatePhone);
      console.log('🔗 Profile Link:', profileLink);

      const appliedInstitutionPayload = {
        phone: formatPhone(orgPhone),
        templateName: "applied_institution",
        language: "en",
        bodyParams: [
          { type: "text", text: `*${candidateName}*` },
          { type: "text", text: jobTitle },
          { type: "text", text: highestEducation },
          { type: "text", text: `*${candidatePhone}*` },
          { type: "text", text: profileLink }
        ],
        sent_by: "Suhas",
        sent_email: "suhas@teacherlink.in"
      };

      console.log('📦 Applied Institution Payload:', appliedInstitutionPayload);

      const response = await fetch(WHATSAPP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appliedInstitutionPayload)
      });

      const result = await response.json();
      console.log('✅ Applied Institution Template Response:', result);

      if (result.results && result.results.length > 0) {
        const phoneResult = result.results[0];
        if (phoneResult.status === 'FAILED') {
          console.log('❌ Applied Institution Template Error:', phoneResult.error);
          toast.error(`Applied Institution template failed: ${phoneResult.error}`);
        } else {
          console.log('✅ Applied Institution template sent successfully!');
          toast.success("Applied Institution template sent with actual data!");
        }
      }
    } catch (err) {
      console.error('❌ Failed to send applied_institution template:', err);
      toast.error("Failed to send applied institution template");
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
      
        // Refresh data
        await refreshAppliedJobs(false);
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

  // Combine search and filter results
  const getCombinedResults = useCallback(() => {
    let baseJobs = jobs;

    if (hasFiltersApplied) {
      baseJobs = filteredJobsByFilters.length > 0 ? filteredJobsByFilters : jobs;
    }

    if (isSearching) {
      if (searchResults.length > 0) {
        return searchResults.filter(job =>
          filteredJobsByFilters.length === 0 ||
          filteredJobsByFilters.some(filteredJob => filteredJob.id === job.id)
        );
      }
      // No search matches; fall back to current baseJobs
    }

    return baseJobs;
  }, [jobs, hasFiltersApplied, filteredJobsByFilters, isSearching, searchResults]); 
 
  const finalFilteredJobs = getCombinedResults();

  const getJobPage = useCallback(
    (jobId) => {
      if (jobId === undefined || jobId === null) return null;

      const numericJobId = Number(jobId);
      const jobIndex = finalFilteredJobs.findIndex(
        (job) => Number(job.id) === numericJobId
      );

      if (jobIndex === -1) return null;

      return Math.floor(jobIndex / jobsPerPage) + 1;
    },
    [finalFilteredJobs, jobsPerPage]
  );

  // Pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = finalFilteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(finalFilteredJobs.length / jobsPerPage);

  const isJobApplied = useCallback(
    (job) => appliedJobs.includes(getJobId(job)),
    [appliedJobs]
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
    handleApplyPromptApply,
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
    filteredJobs: finalFilteredJobs,
    currentJobs,
    getJobId,
    isJobApplied,
    onViewJob: handleViewJob,
    onApplyJob: handleApplyClick
  });

  // Function to scroll to a specific job
  const scrollToJob = useCallback((jobId) => {
    if (!jobId) {
      console.warn('❌ scrollToJob called without jobId');
      return 'done';
    }

    const numericJobId = Number(jobId);
    if (Number.isNaN(numericJobId)) {
      console.warn('❌ Invalid jobId:', jobId);
      return 'done';
    }

    const filteredJobs = getCombinedResults();

    const jobExists = jobs.find(job => Number(job.id) === numericJobId);
    if (!jobExists) {
      console.warn('❌ Job not found in jobs list:', numericJobId);
      return 'done';
    }

    const jobIndex = filteredJobs.findIndex(job => Number(job.id) === numericJobId);

    if (jobIndex !== -1) {
      const targetPage = Math.floor(jobIndex / jobsPerPage) + 1;
      const indexOfLastJob = currentPage * jobsPerPage;
      const indexOfFirstJob = indexOfLastJob - jobsPerPage;
      const isOnCurrentPage = jobIndex >= indexOfFirstJob && jobIndex < indexOfLastJob;

      if (!isOnCurrentPage) {
        console.log(`Job is on page ${targetPage}, navigating...`);
        skipPageResetRef.current = true;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        return 'pending';
      }
    }

    const tryFindAndScroll = (attempt = 0) => {
      const maxAttempts = 10;
      const delay = 100 + (attempt * 50);

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
          console.log(`Attempt ${attempt + 1}: Job element not found, retrying...`);
          tryFindAndScroll(attempt + 1);
        } else {
          console.warn('❌ Could not find job element after multiple attempts:', numericJobId);
        }
      }, delay);
    };

    tryFindAndScroll();
    return 'done';
  }, [jobs, currentPage, jobsPerPage, getCombinedResults]);

  // Handle back from job view
  const handleBackFromJobView = useCallback((jobId) => {
    console.log('AllJobs handleBackFromJobView called, jobId:', jobId);
    if (!jobId) return;

    skipPageResetRef.current = true;
    setHighlightedJobId(null);
    setPendingScrollJob(String(jobId));

    const targetPage = getJobPage(jobId);
    if (targetPage && currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }
  }, [getJobPage, currentPage]);

  // Register back handler with parent
  useEffect(() => {
    if (onBackFromJobView) {
      console.log('AllJobs: Registering handleBackFromJobView with parent');
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



  if (loading || userLoading) {
    return (
      <div className="widget-content">
        <div className="py-10">
          <LoadingState
            title="Loading all job listings…"
            subtitle="We’re compiling the latest openings so you can explore what’s new."
            layout="card"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="widget-content">
      <div className="widget-title mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-3 sm:gap-4">
          <div className="w-full sm:flex-1">
            <SearchBar onSearch={handleSearch} placeholder="Search jobs..." />
          </div>
          <div className="flex sm:flex-shrink-0">
            <button 
              onClick={() => setShowFilters(true)}
              className={`w-full sm:w-auto px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeFilters.size > 0
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover transition-colors'
                  : 'bg-gradient-brand text-white hover:bg-gradient-primary-hover transition-colors'
              }`}
            >
              Apply Filters {activeFilters.size > 0 && `(${activeFilters.size})`}
            </button>
          </div>
        </div>
      </div>

      <div className="job-listing">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
            {isSearching || activeFilters.size > 0
              ? `Found ${finalFilteredJobs.length} job${finalFilteredJobs.length !== 1 ? 's' : ''}`
              : `${jobs.length} Jobs Available`
            }
          </h3>
          <RecordsPerPageDropdown
            className="w-full sm:w-auto justify-between sm:justify-end"
            itemsPerPage={jobsPerPage}
            onItemsPerPageChange={setJobsPerPage}
          />
        </div>

        {(hasFiltersApplied && filteredJobsByFilters.length === 0) || (isSearching && searchResults.length === 0) ? (
          <div className="p-4 mb-4 rounded bg-amber-50 border border-amber-200 text-amber-800">
            {hasFiltersApplied && filteredJobsByFilters.length === 0 && (
              <div className="mb-3">
                <p className="font-semibold mb-1">No jobs match your filters.</p>
                <p className="mb-3 text-sm">
                  We’re showing all available jobs instead. Adjust your selections or reset them to refine the results.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="px-4 py-2 bg-gradient-brand text-white rounded-md hover:bg-gradient-primary-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    onClick={() => setShowFilters(true)}
                  >
                    Adjust Filters
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                    onClick={handleResetFilters}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
            {isSearching && searchResults.length === 0 && (
              <div>
                <p className="font-semibold mb-1">No jobs match your search.</p>
                <p className="text-sm">
                  Showing all available jobs. Try a different keyword or clear your search to explore more opportunities.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {currentJobs.length > 0 ? (
          <div className="job-results">
            <div className="job-list">
              {currentJobs.map((job) => {
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
                  onMessage={handleMessage}
                  messageDisabled={!isApplied}
                  messageTooltip={!isApplied ? 'Apply to message this institute' : ''}
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
                alt="No jobs" 
                className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
              />
          {hasFiltersApplied ? (
            <>
              <p className="text-gray-700 text-lg font-semibold mb-2">
                No jobs match your filters.
              </p>
              <p className="text-gray-600 mb-4">
                Try adjusting your selections or clear them to see more opportunities.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowFilters(true)}
                >
                  Adjust Filters
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </button>
              </div>
            </>
          ) : isSearching ? (
            <>
              <p className="text-gray-700 text-lg font-semibold mb-2">
                No jobs found for your search.
              </p>
              <p className="text-gray-600">
                Try a different keyword or clear the search to explore all openings.
              </p>
            </>
          ) : (
            <p className="text-gray-600 text-lg font-medium">
              No jobs available at the moment.
            </p>
          )}
            </div>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={paginate}
          totalItems={finalFilteredJobs.length}
          itemsPerPage={jobsPerPage}
          currentPageStart={indexOfFirstJob + 1}
          currentPageEnd={Math.min(indexOfLastJob, finalFilteredJobs.length)}
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

        {/* Filter Panel */}
        <FilterPanel
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          activeFiltersCount={activeFilters.size}
        />

      </div>

      <JobMessagingModals
        showApplyPrompt={showApplyPrompt}
        jobToApplyPrompt={jobToApplyPrompt}
        onApplyPromptClose={handleApplyPromptClose}
        onApplyPromptApply={handleApplyPromptApply}
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

export default AllJobs;