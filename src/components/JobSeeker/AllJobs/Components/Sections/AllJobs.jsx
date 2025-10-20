import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import axios from "axios";
import { toast } from "react-toastify";
import SearchBar from '../shared/SearchBar';
import ApplyModal from '../shared/ApplyModal';
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

// Format phone number correctly with +91 prefix
const formatPhone = (phone) => {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, ""); // remove hidden chars
  if (!clean.startsWith("+")) clean = `+91${clean}`;
  return clean;
};
const RCS_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage";
const COIN_HISTORY_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history";
const EDUCATION_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails";
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";


const AllJobs = ({ onViewJob }) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();
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

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  const recordsPerPageOptions = [10, 20, 30, 50];

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
      const response = await fetch(JOBS_API);
      const data = await response.json();
      
      // Filter only approved jobs (isApproved === 1)
      const approvedJobs = Array.isArray(data) 
        ? data.filter(job => job.isApproved === 1)
        : [];
      
      // Keep all approved jobs including closed ones
      const allJobs = await getAppliedJobs(sortJobsByRecency(approvedJobs));
      
      setJobs(allJobs);
      setFilteredJobs(allJobs);
    } catch (error) {
      toast.error("Could not load job list. Please refresh.");
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  }, [getAppliedJobs, sortJobsByRecency]);

  // Fetch saved/fav jobs from backend for current user
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
      toast.error("Could not load your job preferences. Please refresh.");
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
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      setFilteredJobs(jobs);
      setCurrentPage(1);
      return;
    }
    setIsSearching(true);
    const results = searchJobs(jobs, searchTerm);
    const sorted = sortJobsByRecency(results);
    setSearchResults(sorted);
    setFilteredJobs(sorted);
    setCurrentPage(1);
  }, [jobs, sortJobsByRecency]);

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
      await upsertJobAction(job, { saved_jobs: isSaved ? 0 : 1 });
      await fetchSavedAndFavJobs();
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

  const handleFavouriteJob = async (job) => {
    if (!user) {
      toast.error("Please login to favourite jobs.");
      return;
    }
    const jobId = getJobId(job);
    const isFav = favouriteJobs.includes(jobId);
    try {
      await upsertJobAction(job, { favroute_jobs: isFav ? 0 : 1 });
      await fetchSavedAndFavJobs();
      toast.success(
        isFav
          ? `Removed "${job.job_title}" from favourites.`
          : `Marked "${job.job_title}" as favourite!`
      );
    } catch (error) {
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

      if (coins < 100) {
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
        await fetchJobs();
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

    // 4. Deduct coins by 100
    try {
      await fetch(REDEEM_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.firebase_uid || user.uid,
          coin_value: coinValue - 100
        })
      });
    } catch {
      setApplyStatus("error");
      setApplyError("Failed to deduct coins. Try again.");
      setApplyLoading(false);
      return;
    }

    // 5. Store apply job record
    // Note: job.id from jobPostInstitutes is mapped to job_id in applyCandidate API
    try {
      await fetch(APPLY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(job.id),                        // job.id → job_id (field name mapping)
          firebase_uid: user.firebase_uid || user.uid,   // ✅ CANDIDATE UID (for backend lookup)
          user_id: user.firebase_uid || user.uid,        // ✅ REQUIRED by API - same as firebase_uid
          job_firebase_uid: job.firebase_uid,            // ✅ INSTITUTION UID (for reference)
          job_name: job.job_title,
          fullName: fullName || "Candidate",
          is_applied: 1
        })
      });
      setApplyStatus("success");
      setApplyLoading(false);
      
      // Refresh the applied jobs list to show "Applied ✓" button immediately
      await refreshAppliedJobs(false); // Don't show toast (success toast already shown)
      
      await fetchJobs();
      // === Trigger WhatsApp message to institution only ===
      sendWhatsAppToInstitution(job);

      // === Coin History Logic ===
      try {
        // 1. Get candidate_id from /personal
        let candidateId = null;
        const personalRes = await fetch(`${PERSONAL_API}?firebase_uid=${user.firebase_uid || user.uid}`);
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          if (Array.isArray(personalData) && personalData.length > 0) {
            candidateId = personalData[0].id;
          }
        }
        // 2. Get unblocked_candidate_id and name from /organisation
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
        // 3. POST to /coin_history
        await fetch(COIN_HISTORY_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.firebase_uid || user.uid,
            candidate_id: candidateId,
            job_id: Number(job.id),
            coin_value: coinValue - 100,
            reduction: 100,
            reason: "Applied for the job",
            unblocked_candidate_id,
            unblocked_candidate_name
          })
        });
      } catch (coinHistoryError) {
        // Log but do not block application
        console.error("Error recording coin history:", coinHistoryError);
      }
    } catch (err) {
      setApplyStatus("error");
      setApplyError("Failed to apply for this job.");
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

  return (
    <div className="widget-content">
      <div className="widget-title mb-3">
        <div className="d-flex justify-content-between align-items-center w-100">
          
          <div className="d-flex gap-2 align-items-center">
            <SearchBar onSearch={handleSearch} placeholder="Search jobs..." />
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={refreshAppliedJobs}
              title="Refresh applied jobs status"
              style={{ whiteSpace: 'nowrap' }}
            >
              🔄 Refresh
            </button>
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
              ? `Found ${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''}`
              : `Available Jobs (${jobs.length} total)`
            }
          </h5>
        </div>

        {currentJobs.length > 0 ? (
          <div className="job-results">
            <div className="job-list">
                          {currentJobs.map((job, index) => {
              const jobId = getJobId(job);
              const isSaved = savedJobs.includes(jobId);
              const isFavourite = favouriteJobs.includes(jobId);
              const isApplied = appliedJobs.includes(jobId); // Check if job is applied
              return (
                  <div key={jobId} className="job-item compact">
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
                              className={`action-icon-btn favourite-btn ${isFavourite ? 'favourited' : ''}`}
                              onClick={() => handleFavouriteJob(job)}
                              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                              disabled={loading}
                            >
                              {isFavourite ? <AiFillHeart /> : <AiOutlineHeart />}
                            </button>
                            {job.is_closed === 1 ? (
                              <button className="btn btn-danger apply-btn" disabled>
                                Closed
                              </button>
                            ) : isApplied ? (
                              <button className="btn btn-success apply-btn" disabled>
                                Applied ✓
                              </button>
                            ) : (
                              <button className="btn btn-primary apply-btn"
                                disabled={loading}
                                onClick={() => handleApplyClick(job)}>
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
        ) : (
          <div className="no-results text-center py-5">
            <p>No jobs available at the moment.</p>
            <button className="btn btn-outline-primary" onClick={fetchJobs}>
              Refresh
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

export default AllJobs;
