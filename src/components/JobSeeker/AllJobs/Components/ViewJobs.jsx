import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { toast } from "react-toastify";
import { BsArrowLeft, BsBriefcase, BsClock, BsCash, BsMortarboard } from 'react-icons/bs';
import { IoLocationOutline, IoMailOutline, IoGlobeOutline, IoCallOutline } from 'react-icons/io5';
import { FaUsers, FaCalendarAlt, FaStar, FaPlus, FaTasks, FaBook, FaChalkboard, FaCheck } from 'react-icons/fa';
import { useAuth } from "../../../../Context/AuthContext";
import { formatQualification, formatJobType } from '../utils/formatUtils';
import ApplyModal from './shared/ApplyModal';

// === Add your new API endpoints for WhatsApp, login/org, RCS ===
const REDEEM_API = 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem';
const APPLY_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const JOB_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp";

const RCS_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage";
const COIN_HISTORY_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history";
const EDUCATION_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";

// Consolidated helper functions
const formatPhone = (phone) => {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) clean = `+91${clean}`;
  return clean;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatSubjects = (subjects) => {
  if (!subjects) return [];
  if (Array.isArray(subjects)) return subjects;
  if (typeof subjects === 'string') {
    return subjects.split(/[,;]/).map(subject => subject.trim()).filter(Boolean);
  }
  return [String(subjects)];
};

// Convert salary value to LPA (Lakhs Per Annum) format
const convertSalaryToLPA = (salaryValue) => {
  if (!salaryValue && salaryValue !== 0) return null;
  
  // Convert to string and normalize
  let valueStr = String(salaryValue).trim();
  if (!valueStr) return null;
  
  // Handle "k" notation (e.g., "20k" = 20000)
  const hasK = /k$/i.test(valueStr);
  if (hasK) {
    valueStr = valueStr.replace(/k$/i, '');
  }
  
  // Extract numeric value
  const numericValue = parseFloat(valueStr);
  if (Number.isNaN(numericValue)) return null;
  
  // Convert "k" notation to actual number
  const actualValue = hasK ? numericValue * 1000 : numericValue;
  
  // Determine if it's monthly or annual
  // If value < 100000, assume it's monthly salary
  // If value >= 100000, assume it's already annual
  const annualSalary = actualValue < 100000 ? actualValue * 12 : actualValue;
  
  // Convert to LPA (divide by 100000)
  const lpa = annualSalary / 100000;
  
  // Format to 1 decimal place, remove trailing zeros
  const formattedLPA = parseFloat(lpa.toFixed(1));
  
  return `${formattedLPA} LPA`;
};

const formatSalary = (minSalary, maxSalary) => {
  if (!minSalary && !maxSalary) return 'Salary not specified';
  
  const minLPA = convertSalaryToLPA(minSalary);
  const maxLPA = convertSalaryToLPA(maxSalary);
  
  if (!minLPA && !maxLPA) return 'Salary not specified';
  if (minLPA && maxLPA) return `${minLPA} to ${maxLPA}`;
  if (minLPA) return `${minLPA}+`;
  if (maxLPA) return `Up to ${maxLPA}`;
  
  return 'Salary not specified';
};

const BlurWrapper = ({ isUnlocked, children }) => {
  return isUnlocked ? children : null;
};

const BlurredOrLink = ({ isUnlocked, type, value, href, children }) => {
  if (!isUnlocked) {
    return (
      <span className="blurred-contact text-gray-400 select-none" tabIndex={-1}>
        🔒 Details are locked
      </span>
    );
  }
  if (type === 'email') {
    return <a href={`mailto:${value}`} className="info-value link text-blue-600 hover:text-blue-800">{value}</a>;
  }
  if (type === 'phone') {
    return <a href={`tel:${value}`} className="info-value link text-blue-600 hover:text-blue-800">{value}</a>;
  }
  if (type === 'website') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="info-value link text-blue-600 hover:text-blue-800">
        {children}
      </a>
    );
  }
  return <span className="info-value text-gray-700">{value}</span>;
};

// Simplified UnlockModal with Tailwind CSS
function UnlockModal({ isOpen, onClose, userId, onUnlock, coinValue, loading, unlockStatus, error }) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        
        {unlockStatus === "success" ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🪙</div>
            <div className="text-green-600 font-semibold text-xl mb-2 leading-tight tracking-tight">Unlocked! 🔓</div>
            <div className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">Details unlocked successfully.</div>
          </div>
        ) : unlockStatus === "error" ? (
          <div className="text-center">
            <div className="text-4xl mb-4 opacity-50">🪙</div>
            <div className="text-red-600 font-semibold text-xl leading-tight tracking-tight">{error || "Could not unlock details."}</div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 leading-tight tracking-tight">Unlock institute details?</h3>
              <div className="text-gray-600 text-lg sm:text-base mb-2 leading-normal tracking-tight">
                Available Coins: <span className="font-semibold">{coinValue === null ? "..." : coinValue}</span>
              </div>
              <div className="text-gray-700 text-lg sm:text-base mb-4 leading-normal tracking-tight">
                Use <span className="font-semibold">50 Coins</span> to view address, contact, email, phone, and website details.
              </div>
              <div className="text-red-600 text-lg sm:text-base text-center italic mb-4 leading-normal tracking-tight">
                Unlocked details remain visible for <span className="font-semibold">30 days.</span>
              </div>
            </div>
            <button
              className="w-full bg-gradient-brand text-white py-3 px-4 rounded-lg font-medium hover:bg-gradient-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
              disabled={loading}
              onClick={onUnlock}
            >
              {loading ? "Unlocking..." : "🪙 Unlock 50"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

const ViewJobs = ({ job, onBack, fromNotifications = false, fromRecruiterActions = false }) => {
  const { user } = useAuth();
  const userId = user?.firebase_uid || user?.uid;
  const instituteUid = job?.firebase_uid;
  const unlockKey = `unlocked_${userId}_${instituteUid}`;

  const [instituteData, setInstituteData] = useState(null);
  const [instituteLoading, setInstituteLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Unlock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState(""); // "success" | "error" | ""
  const [unlockError, setUnlockError] = useState("");

  // --- Apply Job Button State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyCoin, setApplyCoin] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState(""); // "success", "already", "error", ""
  const [applyError, setApplyError] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  // Scroll to top when component mounts (when viewing a job)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [job?.id]);

  // --- Check Already Applied on Mount
  useEffect(() => {
    if (!job?.id || !userId) return;
    checkAlreadyApplied(job.id, userId);
    // eslint-disable-next-line
  }, [job?.id, userId]);

  async function checkAlreadyApplied(job_id, user_id) {
    try {
      const { data } = await axios.get(APPLY_API, { params: { job_id, user_id } });
      if (Array.isArray(data) && data.length > 0 && data[0].is_applied) {
        setIsApplied(true);
      } else {
        setIsApplied(false);
      }
    } catch (e) {
      setIsApplied(false);
    }
  }

  // --- Unlock Institution Logic ---
  useEffect(() => {
    if (!userId || !instituteUid) return setIsUnlocked(false);

    const stored = localStorage.getItem(unlockKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.unlocked && parsed.timestamp) {
          const unlockTime = new Date(parsed.timestamp);
          const now = new Date();
          const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 30) {
            setIsUnlocked(true);
            return;
          }
        }
      } catch (e) {}
    }
    setIsUnlocked(false);
  }, [userId, instituteUid, unlockKey]);

  useEffect(() => {
    if (showUnlockModal && userId) {
      axios.get(`${REDEEM_API}?firebase_uid=${userId}`)
        .then(({ data }) => {
          const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
          setCoinValue(found?.coin_value ?? 0);
        }).catch(() => setCoinValue(0));
    }
  }, [showUnlockModal, userId]);

  const handleUnlockClick = async () => {
    // Check if user profile is approved before allowing unlock
    const isApproved = await checkProfileApproval();
    if (!isApproved) {
      toast.error("Your Profile is Currently under admin review, Please wait until it get approved");
      return;
    }

    setShowUnlockModal(true);
    setUnlockStatus("");
    setUnlockError("");
  };

  // --- UNLOCK INSTITUTION DETAILS WITH COIN HISTORY ---
  const handleConfirmUnlock = async () => {
    setUnlockLoading(true);
    setUnlockError("");
    setUnlockStatus("");
    try {
      const { data } = await axios.get(`${REDEEM_API}?firebase_uid=${userId}`);
      const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const coins = found?.coin_value ?? 0;
      setCoinValue(coins);

      if (coins < 50) {
        setUnlockStatus("error");
        setUnlockError("Not enough coins to unlock details!");
        setUnlockLoading(false);
        return;
      }
      await axios.put(`${REDEEM_API}?firebase_uid=${userId}`, {
        firebase_uid: userId,
        coin_value: coins - 50
      });

      // --- COIN HISTORY LOGIC ---
      try {
        // 1. Get candidate_id from /personal
        let candidateId = null;
        const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: userId } });
        if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
          candidateId = personalRes.data[0].id;
        }
        // 2. Get unblocked_candidate_id and name from /organisation using job's firebase_uid
        let unblocked_candidate_id = null;
        let unblocked_candidate_name = null;
        if (instituteUid) {
          // Use the job's firebase_uid as unblocked_candidate_id
          unblocked_candidate_id = instituteUid;
          
          try {
            const orgRes = await axios.get(ORG_API, { params: { firebase_uid: instituteUid } });
            
            if (orgRes.status === 200 && Array.isArray(orgRes.data) && orgRes.data.length > 0) {
              unblocked_candidate_name = orgRes.data[0].name;
            } else {
            }
          } catch (orgError) {
          }
        } else {
        }
        // 3. POST to /coin_history
        const coinHistoryData = {
          firebase_uid: userId,
          candidate_id: candidateId,
          job_id: job.id,
          coin_value: coins - 50,
          reduction: 50,
          reason: "Unlocked Institution Details",
          unblocked_candidate_id,
          unblocked_candidate_name
        };
        
        const coinHistoryResponse = await axios.post(COIN_HISTORY_API, coinHistoryData);
      } catch (coinHistoryError) {
      }

      setUnlockStatus("success");
      setUnlockLoading(false);
      setTimeout(() => {
        setShowUnlockModal(false);
        setIsUnlocked(true);
        localStorage.setItem(unlockKey, JSON.stringify({
          unlocked: true,
          timestamp: new Date().toISOString()
        }));
      }, 2000);
    } catch (e) {
      setUnlockStatus("error");
      let msg = "Something went wrong.";
      if (e?.response?.status === 500) {
        msg = "Internal server error. Please try again.";
      }
      setUnlockError(msg);
      setUnlockLoading(false);
    }
  };

  // Check if user profile is approved (must check BOTH manditoryApprove AND profile_approved)
  const checkProfileApproval = async () => {
    if (!userId) return false;
    
    try {
      // Check both approval tables
      const [profileResponse, mandatoryResponse] = await Promise.all([
        axios.get(PROFILE_APPROVED_API),
        axios.get("https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/manditoryApprove?firebase_uid=" + userId)
      ]);
      
      const profileData = profileResponse.data;
      const mandatoryData = mandatoryResponse.data;
      
      // Check profile_approved table
      let profileApproved = false;
      if (Array.isArray(profileData)) {
        const userProfile = profileData.find(profile => profile.firebase_uid === userId);
        profileApproved = userProfile && userProfile.isApproved === 1;
      } else if (profileData && profileData.firebase_uid === userId) {
        profileApproved = profileData.isApproved === 1;
      }
      
      // Check manditoryApprove table
      let mandatoryApproved = false;
      if (Array.isArray(mandatoryData)) {
        const mandatoryRecord = mandatoryData.find(record => record.firebase_uid === userId);
        mandatoryApproved = mandatoryRecord && (mandatoryRecord.is_approved === true || mandatoryRecord.is_approved === 1);
      } else if (mandatoryData && mandatoryData.firebase_uid === userId) {
        mandatoryApproved = mandatoryData.is_approved === true || mandatoryData.is_approved === 1;
      }
      
      // Both must be approved
      return profileApproved && mandatoryApproved;
    } catch (error) {
      console.error('Error checking profile approval:', error);
      return false;
    }
  };

  // --- Apply Job Logic ---
  const openApplyModal = () => {
    setApplyModalOpen(true);
    setApplyStatus("");
    setApplyError("");
    // Fetch latest coins for apply modal
    axios.get(`${REDEEM_API}?firebase_uid=${userId}`)
      .then(({ data }) => {
        const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
        setApplyCoin(found?.coin_value ?? 0);
      }).catch(() => setApplyCoin(0));
  };

  const handleApplyJob = async () => {
    // Prevent if already applied
    if (isApplied) {
      setApplyStatus("already");
      setApplyModalOpen(true);
      return;
    }

    // Check if user profile is approved
    const isApproved = await checkProfileApproval();
    if (!isApproved) {
      toast.error("Your Profile is Currently under admin review, Please wait until it get approved");
      return;
    }

    openApplyModal();
  };

  // Consolidated WhatsApp and RCS functions
  const sendNotifications = async () => {
    try {
      // Get user data
      const [loginRes, orgRes] = await Promise.all([
        axios.get(`${LOGIN_API}?firebase_uid=${userId}`),
        axios.get(`${ORG_API}?firebase_uid=${job.firebase_uid}`)
      ]);

      const userData = Array.isArray(loginRes.data) ? loginRes.data[0] : {};
      const orgData = Array.isArray(orgRes.data) ? orgRes.data[0] : {};

      const phone = userData.phone_number || "";
      const userName = userData.name || "";
      const orgName = orgData.name || job.institute_name || "";

      if (!phone || !userName || !orgName) {
        console.warn('Missing data for notifications:', { phone: !!phone, userName: !!userName, orgName: !!orgName });
        return;
      }

      // Send WhatsApp to candidate
      await axios.post(WHATSAPP_API, {
        phone: formatPhone(phone),
        templateName: "applied_1_thing",
        language: "en",
        bodyParams: [
          { type: "text", text: "0" },
          { type: "text", text: "Click here to recharge" }
        ],
        sent_by: "Suhas",
        sent_email: "suhas@teacherlink.in"
      });

      // Send RCS
      const contactId = phone.startsWith("91") ? phone : `91${phone}`;
      await axios.post(RCS_API, {
        contactId: contactId,
        templateName: "job_apply",
        customParam: { NAME: userName, SCHOOL: orgName },
        sent_by: "suhas",
        sent_email: "suhas75@gmail.com"
      });

      console.log('✅ Notifications sent successfully');
    } catch (err) {
      console.error('❌ Failed to send notifications:', err);
    }
  };

  // WhatsApp function for institution notification with interactive button (matching AllJobs.jsx)
  const sendWhatsAppToInstitution = async () => {
    try {
      // Extract jobId from job object
      const jobId = job?.id;
      console.log('🔍 Job ID extracted:', jobId);
      
      // CRITICAL: Get candidate firebase_uid FIRST (needed for button context storage)
      const candidateFirebaseUid = userId;
      console.log('🔍 Candidate Firebase UID:', candidateFirebaseUid);

      // 1. Get organization phone from job's firebase_uid
      let orgPhone = "";
      try {
        const orgRes = await axios.get(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
        if (orgRes.status === 200) {
          const orgData = orgRes.data;
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
        const personalRes = await axios.get(`${PERSONAL_API}?firebase_uid=${userId}`);
        if (personalRes.status === 200) {
          const personalData = personalRes.data;
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
        const educationRes = await axios.get(`${EDUCATION_API}?firebase_uid=${userId}`);
        if (educationRes.status === 200) {
          const educationData = educationRes.data;
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

      // 5. Get candidate's phone number
      let candidatePhone = "";
      try {
        const personalRes = await axios.get(`${PERSONAL_API}?firebase_uid=${userId}`);
        if (personalRes.status === 200) {
          const personalData = personalRes.data;
          if (Array.isArray(personalData) && personalData.length > 0) {
            candidatePhone = personalData[0].callingNumber || "";
          }
        }
      } catch (err) {
        console.error("Failed to fetch candidate phone:", err);
        candidatePhone = "Not available";
      }

      // 6. Get expected salary from personal API
      let expectedSalary = "Not specified";
      try {
        const personalRes = await axios.get(`${PERSONAL_API}?firebase_uid=${userId}`);
        if (personalRes.status === 200) {
          const personalData = personalRes.data;
          if (Array.isArray(personalData) && personalData.length > 0) {
            expectedSalary = personalData[0].expectedSalary || "Not specified";
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

      // 8. Send candidate_apply_113 template to institution (template only, separate interactive button below)
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

      console.log('📦 WhatsApp Payload:', whatsappPayload);
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

      // Now send a separate interactive message with clickable button (EXACT same as AllJobs.jsx)
      // Wait 2 seconds to ensure template is delivered first
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📤 Sending interactive list message...');
      
      const interactivePayload = {
        phone: formatPhone(orgPhone),
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: `📋 Job ID: ${jobId}\n👤 Candidate: ${candidateName}\n🆔 Candidate ID: ${candidateFirebaseUid}\n\nSelect "View Profile" to see complete profile.\n\n*Note: Viewing full profile will deduct 5 coins.*`
          },
          action: {
            button: "View Options",
            sections: [{
              title: "Actions",
              rows: [{
                id: `job_${jobId}_candidate_${candidateFirebaseUid}`,
                title: "View Profile",
                description: "View complete candidate profile"
              }]
            }]
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
          console.log('✅ Interactive list message sent successfully');
        } else {
          console.error('❌ Failed to send interactive message:', interactiveResult);
        }
      } catch (interactiveErr) {
        console.error('❌ Error sending interactive message:', interactiveErr);
      }

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

        if (buttonContextResponse.ok) {
          const contextResult = await buttonContextResponse.json();
          console.log('✅ Button context stored successfully:', contextResult);
        } else {
          console.warn('⚠️ Failed to store button context (non-critical):', await buttonContextResponse.text());
        }
      } catch (contextErr) {
        console.warn('⚠️ Failed to store button context (non-critical):', contextErr);
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

  // --- Apply Modal Confirm (deduct coins, save to DB, send WhatsApp, COIN HISTORY) ---
  const handleConfirmApply = async () => {
    setApplyLoading(true);
    setApplyError("");
    setApplyStatus("");

    try {
      // 1. Check if already applied (safety double-check)
      const already = await axios.get(APPLY_API, { params: { job_id: job.id, user_id: userId } });
      if (Array.isArray(already.data) && already.data.length > 0 && already.data[0].is_applied) {
        setApplyStatus("already");
        setApplyLoading(false);
        setIsApplied(true);
        return;
      }

      // 2. Get latest coins
      const { data: coinsData } = await axios.get(`${REDEEM_API}?firebase_uid=${userId}`);
      const found = Array.isArray(coinsData) && coinsData.length > 0 ? coinsData[0] : null;
      const coins = found?.coin_value ?? 0;
      setApplyCoin(coins);

      if (coins < 100) {
        setApplyStatus("error");
        setApplyError("You don't have enough coins to apply for this job.");
        setApplyLoading(false);
        return;
      }

      // 3. Fetch fullName from personal API
      let fullName = "";
      try {
        const { data: personalList } = await axios.get(PERSONAL_API, { params: { firebase_uid: userId } });
        if (Array.isArray(personalList) && personalList.length > 0) {
          fullName = personalList[0].fullName || "";
        }
      } catch {}

      // 4. Get job_title/job_name from jobs API if needed (else use job.job_title)
      let job_name = job.job_title || "";
      if (!job_name && job.id) {
        try {
          const { data: jobsList } = await axios.get(JOB_API, { params: { id: job.id } });
          if (Array.isArray(jobsList) && jobsList.length > 0) {
            job_name = jobsList[0].job_title || "";
          }
        } catch {}
      }

      // 5. Deduct 100 coins
      await axios.put(`${REDEEM_API}?firebase_uid=${userId}`, {
        firebase_uid: userId,
        coin_value: coins - 100
      });

      // 6. Save apply record
      await axios.post(APPLY_API, {
        job_id: job.id,
        firebase_uid: job.firebase_uid,
        job_name,
        user_id: userId,
        fullName,
        is_applied: 1
      });

      // 7. Send WhatsApp notification to institution only
      sendWhatsAppToInstitution();

      // 8. COIN HISTORY LOGIC
      try {
        // 1. Get candidate_id from /personal
        let candidateId = null;
        const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: userId } });
        if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
          candidateId = personalRes.data[0].id;
        }
        // 2. Get unblocked_candidate_id and name from /organisation using job's firebase_uid
        let unblocked_candidate_id = null;
        let unblocked_candidate_name = null;
        if (instituteUid) {
          // Use the job's firebase_uid as unblocked_candidate_id
          unblocked_candidate_id = instituteUid;
          
          try {
            const orgRes = await axios.get(ORG_API, { params: { firebase_uid: instituteUid } });
            
            if (orgRes.status === 200 && Array.isArray(orgRes.data) && orgRes.data.length > 0) {
              unblocked_candidate_name = orgRes.data[0].name;
            } else {
            }
          } catch (orgError) {
          }
        } else {
        }
        // 3. POST to /coin_history
        const coinHistoryData = {
          firebase_uid: userId,
          candidate_id: candidateId,
          job_id: job.id,
          coin_value: coins - 100,
          reduction: 100,
          reason: "Applied for the job",
          unblocked_candidate_id,
          unblocked_candidate_name
        };
        
        const coinHistoryResponse = await axios.post(COIN_HISTORY_API, coinHistoryData);
      } catch (coinHistoryError) {
      }

      setApplyStatus("success");
      setIsApplied(true);
      setApplyLoading(false);
      setTimeout(() => setApplyModalOpen(false), 1800);
    } catch (e) {
      setApplyStatus("error");
      let msg = "Something went wrong.";
      if (e?.response?.data?.message) msg = e.response.data.message;
      setApplyError(msg);
      setApplyLoading(false);
    }
  };

  useEffect(() => {
    if (job?.firebase_uid) {
      fetchInstituteData(job.firebase_uid);
    }
    // eslint-disable-next-line
  }, [job?.firebase_uid]);

  const fetchInstituteData = async (firebase_uid) => {
    try {
      setInstituteLoading(true);
      setError(null);
      const response = await axios.get('https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation', {
        params: { firebase_uid }
      });
      if (response.data && Array.isArray(response.data)) {
        const institute = response.data.find(org => org.firebase_uid === firebase_uid);
        setInstituteData(institute || null);
        if (!institute) {
          setError('Institute details not available');
        }
      } else if (response.data) {
        setInstituteData(response.data);
      } else {
        setError('Institute details not available');
      }
    } catch (error) {
      setInstituteData(null);
      setError('Unable to fetch institute details');
    } finally {
      setInstituteLoading(false);
    }
  };


  const coreSubjects = formatSubjects(job.core_subjects);
  const otherSubjects = formatSubjects(job.other_subjects);

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg sm:text-base mb-4 leading-normal tracking-tight">No job selected</p>
          <button 
          className="px-6 py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors text-base leading-normal tracking-tight"
            onClick={onBack}
          >
            {fromRecruiterActions ? 'Back to Recruiter Actions' : fromNotifications ? 'Back to Notifications' : 'Back to Jobs'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-6 py-1.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent leading-normal tracking-tight">Job Details</h1>
          <button 
          className="w-full sm:w-auto px-3 py-1.5 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors font-medium text-center text-base leading-normal tracking-tight"
            onClick={() => onBack('list')}
          >
            {fromRecruiterActions ? 'Back to Recruiter Actions' : fromNotifications ? 'Back to Notifications' : 'Back to Jobs'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3">
        {/* Job Header Section */}
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-3 sm:p-5 mb-4">
          <div className="text-center mb-3">
            <h1 className="text-2xl font-normal bg-gradient-brand-text bg-clip-text text-transparent mb-1 leading-normal tracking-tight">{job.job_title || 'Position not specified'}</h1>
            {job.institute_name && (
              <h2 className="text-base text-gray-600 leading-normal tracking-tight">{job.institute_name}</h2>
            )}
          </div>
          
          {/* Key Job Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <BsBriefcase className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Job Type: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{formatJobType(job.job_type)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <IoLocationOutline className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Location: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{job.city && job.state_ut ? `${job.city}, ${job.state_ut}` : 'Not specified'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <BsCash className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Salary Range: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{formatSalary(job.min_salary, job.max_salary)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <BsClock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Experience: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{job.experience_required ? `${job.experience_required} years` : 'Not specified'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <FaUsers className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Openings: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{(job.no_of_opening && job.no_of_opening.toString().trim()) || 'Not specified'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg">
              <FaCalendarAlt className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Joining Date: </span>
                <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{formatDate(job.joining_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Left Column - Job Details */}
          <div className="space-y-4">
            {/* Job Requirements */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-5">
              <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent text-center mb-3 pb-2 border-b border-gray-200 leading-normal tracking-tight">JOB REQUIREMENTS</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-lg">
                  <BsMortarboard className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Qualification: </span>
                    <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{formatQualification(job.qualification)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg">
                  <FaTasks className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Selection Process: </span>
                    <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{(job.job_process && job.job_process.toString().trim()) || 'Not specified'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg">
                  <BsClock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Working Shifts: </span>
                    <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{(job.job_shifts && job.job_shifts.toString().trim()) || 'Not specified'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg">
                  <FaBook className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Curriculum: </span>
                    <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{(job.curriculum && job.curriculum.toString().trim()) || 'Not specified'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg">
                  <FaChalkboard className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Board: </span>
                    <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{(job.board && job.board.toString().trim()) || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects Required */}
            {(coreSubjects.length > 0 || otherSubjects.length > 0) && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-5">
                <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent text-center mb-3 pb-2 border-b border-gray-200 leading-normal tracking-tight">SUBJECT REQUIREMENTS</h3>
                <div className="space-y-3">
                  {coreSubjects.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg">
                      <FaStar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Core Subjects: </span>
                        <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{coreSubjects.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {otherSubjects.length > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg">
                      <FaPlus className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Additional Subjects: </span>
                        <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">{otherSubjects.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Institute Info & Job Description */}
          <div className="space-y-4">
            {/* Institute Info Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-5">
              <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent text-center mb-3 pb-2 border-b border-gray-200 leading-normal tracking-tight">INSTITUTE INFORMATION</h3>
              {instituteLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-center py-3">
                  <p className="text-base text-red-600 mb-2 leading-normal tracking-tight">{error}</p>
                  <button
                    onClick={() => fetchInstituteData(job.firebase_uid)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-base leading-normal tracking-tight"
                  >
                    Retry
                  </button>
                </div>
              ) : instituteData ? (
                <div>
                  <div className="text-center mb-0">
                    <h4 className="text-xl font-normal text-gray-800 mb-1 leading-normal tracking-tight">
                      <BlurWrapper isUnlocked={isUnlocked}>
                        {instituteData.name}
                      </BlurWrapper>
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    {instituteData.address && (
                      <div className="flex items-start gap-2 p-2 rounded-lg">
                        <IoLocationOutline className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Address: </span>
                          <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">
                            <BlurredOrLink
                              isUnlocked={isUnlocked}
                              value={instituteData.address}
                              type="text"
                            />
                          </span>
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_name && (
                      <div className="flex items-start gap-2 p-2 rounded-lg">
                        <FaUsers className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Contact Person: </span>
                          <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">
                            <BlurredOrLink
                              isUnlocked={isUnlocked}
                              value={instituteData.contact_person_name}
                              type="text"
                            />
                          </span>
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_email && (
                      <div className="flex items-start gap-2 p-2 rounded-lg">
                        <IoMailOutline className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Email: </span>
                          <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">
                            <BlurredOrLink
                              isUnlocked={isUnlocked}
                              value={instituteData.contact_person_email}
                              type="email"
                            />
                          </span>
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_phone1 && (
                      <div className="flex items-start gap-2 p-2 rounded-lg">
                        <IoCallOutline className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Phone: </span>
                          <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">
                            <BlurredOrLink
                              isUnlocked={isUnlocked}
                              value={instituteData.contact_person_phone1}
                              type="phone"
                            />
                          </span>
                        </div>
                      </div>
                    )}
                    {instituteData.website_url && (
                      <div className="flex items-start gap-2 p-2 rounded-lg">
                        <IoGlobeOutline className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 leading-normal tracking-tight">Website: </span>
                          <span className="text-base font-normal text-gray-700 leading-normal tracking-tight">
                            <BlurredOrLink
                              isUnlocked={isUnlocked}
                              value={instituteData.website_url}
                              type="website"
                              href={instituteData.website_url}
                            >
                              Visit Website
                            </BlurredOrLink>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isUnlocked && (
                    <div className="mt-2">
                      <button
                        className="w-full bg-gradient-brand text-white py-2 px-4 rounded-lg font-semibold text-base hover:bg-gradient-primary-hover transition-colors flex items-center justify-center gap-2 leading-normal tracking-tight"
                        onClick={handleUnlockClick}
                      >
                        <span>💰</span>
                        Unlock Institution Details (50 Coins)
                      </button>
                    </div>
                  )}
                  {instituteData.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-base font-medium text-gray-900 mb-2 leading-normal tracking-tight">About the Institute</h4>
                      <p className="text-base text-gray-700 leading-relaxed">{instituteData.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-base text-gray-500 text-center py-3 leading-normal tracking-tight">Institute details not available</p>
              )}
            </div>

            {/* Job Description */}
            {job.job_description && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-5">
                <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent text-center mb-3 pb-2 border-b border-gray-200 leading-normal tracking-tight">Job Description</h3>
                <div className="text-base text-gray-700 leading-relaxed">
                  {job.job_description}
                </div>
              </div>
            )}

            {/* Application Deadline Card */}
            {job.application_deadline && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent mb-2 flex items-center justify-center gap-2 leading-normal tracking-tight">
                  <FaCalendarAlt className="w-4 h-4" />
                  Application Deadline
                </h3>
                <p className="text-base text-red-700 font-normal text-center leading-normal tracking-tight">{formatDate(job.application_deadline)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Unlock Popup Modal */}
        <UnlockModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          userId={userId}
          onUnlock={handleConfirmUnlock}
          coinValue={coinValue}
          loading={unlockLoading}
          unlockStatus={unlockStatus}
          error={unlockError}
        />

        {/* Apply Job Button */}
        <div className="flex justify-center mt-4 mb-3">
          <button
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 leading-normal tracking-tight ${
              isApplied 
                ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                : 'bg-gradient-brand text-white hover:bg-gradient-primary-hover transition-colors shadow-lg hover:shadow-xl'
            }`}
            onClick={handleApplyJob}
            disabled={isApplied}
          >
            {isApplied ? (
              <>
                <FaCheck className="w-4 h-4" />
                Applied
              </>
            ) : (
              'Apply for this Job'
            )}
          </button>
        </div>

        {/* Apply Modal */}
        <ApplyModal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          onApply={handleConfirmApply}
          coinValue={applyCoin}
          loading={applyLoading}
          applyStatus={applyStatus}
          error={applyError}
        />
      </div>
    </div>
  );
};

export default ViewJobs;