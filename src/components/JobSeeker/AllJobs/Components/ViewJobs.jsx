import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { toast } from "react-toastify";
import { BsArrowLeft, BsBriefcase, BsClock, BsCash, BsMortarboard } from 'react-icons/bs';
import { IoLocationOutline, IoMailOutline, IoGlobeOutline, IoCallOutline } from 'react-icons/io5';
import { FaUsers, FaCalendarAlt, FaStar, FaPlus, FaTasks, FaBook, FaChalkboard, FaCheck } from 'react-icons/fa';
import { useAuth } from "../../../../Context/AuthContext";
import { formatQualification } from '../utils/formatUtils';
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

const formatSalary = (minSalary, maxSalary) => {
  if (!minSalary && !maxSalary) return 'Salary not specified';
  if (!maxSalary) return `₹${minSalary}`;
  if (!minSalary) return `₹${maxSalary}`;
  return `₹${minSalary} - ₹${maxSalary}`;
};

const BlurWrapper = ({ isUnlocked, children }) => {
  return isUnlocked
    ? children
    : <span className="blurred-contact text-gray-400 select-none" tabIndex={-1}>🔒 Contact details locked</span>;
};

const BlurredOrLink = ({ isUnlocked, type, value, href, children }) => {
  if (!isUnlocked) {
    return (
      <span className="blurred-contact text-gray-400 select-none" tabIndex={-1}>
        🔒 Contact details locked
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
  return <span className="info-value text-gray-800">{value}</span>;
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

const ViewJobs = ({ job, onBack, fromNotifications = false }) => {
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

  // Check if user profile is approved
  const checkProfileApproval = async () => {
    if (!userId) return false;
    
    try {
      const response = await axios.get(PROFILE_APPROVED_API);
      const data = response.data;
      
      if (Array.isArray(data)) {
        const userProfile = data.find(profile => 
          profile.firebase_uid === userId
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg sm:text-base mb-4 leading-normal tracking-tight">No job selected</p>
          <button 
          className="px-6 py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors text-base leading-normal tracking-tight"
            onClick={onBack}
          >
            {fromNotifications ? 'Back to Notifications' : 'Back to Jobs'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-2 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">Job Details</h1>
          <button 
          className="w-full sm:w-auto px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors font-medium text-center text-base leading-normal tracking-tight"
            onClick={() => onBack('list')}
          >
            {fromNotifications ? 'Back to Notifications' : 'Back to Jobs'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-6 py-2">
        {/* Job Header Section */}
        <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 leading-tight tracking-tight">{job.job_title || 'Position not specified'}</h1>
            {job.institute_name && (
              <h2 className="text-xl text-gray-600 leading-tight tracking-tight">{job.institute_name}</h2>
            )}
          </div>
          
          {/* Key Job Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <BsBriefcase className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500 leading-normal tracking-tight">Job Type:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{(job.job_type && job.job_type.toString().trim()) || 'Not specified'}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <IoLocationOutline className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500">Location:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{job.city && job.state_ut ? `${job.city}, ${job.state_ut}` : 'Not specified'}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <BsCash className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500">Salary Range:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{formatSalary(job.min_salary, job.max_salary)}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <BsClock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500">Experience:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{job.experience_required ? `${job.experience_required} years` : 'Not specified'}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <FaUsers className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500">Openings:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{(job.no_of_opening && job.no_of_opening.toString().trim()) || 'Not specified'}</span>
            </div>
            <div className="grid grid-cols-[auto,1fr] items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 col-span-1">
                <FaCalendarAlt className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-base font-medium text-gray-500">Joining Date:</span>
              </div>
              <span className="text-base font-semibold text-gray-800 col-span-1 leading-normal tracking-tight">{formatDate(job.joining_date)}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Job Details */}
          <div className="space-y-6">
            {/* Job Requirements */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 sm:p-6">
              <h3 className="text-xl font-semibold text-orange-500 text-center mb-4 pb-3 border-b border-gray-200 leading-tight tracking-tight">JOB REQUIREMENTS</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BsMortarboard className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-500">Qualification:</span>
                  </div>
                  <span className="text-base font-semibold text-gray-800">{formatQualification(job.qualification)}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaTasks className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-500">Selection Process:</span>
                  </div>
                  <span className="text-base font-semibold text-gray-800">{(job.job_process && job.job_process.toString().trim()) || 'Not specified'}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BsClock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-500">Working Shifts:</span>
                  </div>
                  <span className="text-base font-semibold text-gray-800">{(job.job_shifts && job.job_shifts.toString().trim()) || 'Not specified'}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaBook className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-500">Curriculum:</span>
                  </div>
                  <span className="text-base font-semibold text-gray-800">{(job.curriculum && job.curriculum.toString().trim()) || 'Not specified'}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaChalkboard className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium text-gray-500">Board:</span>
                  </div>
                  <span className="text-base font-semibold text-gray-800">{(job.board && job.board.toString().trim()) || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Subjects Required */}
            {(coreSubjects.length > 0 || otherSubjects.length > 0) && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
                <h3 className="text-xl font-semibold text-orange-500 text-center mb-4 pb-3 border-b border-gray-200 leading-tight tracking-tight">Subject Requirements</h3>
                <div className="space-y-4">
                  {coreSubjects.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-700 mb-3 leading-tight tracking-tight">Core Subjects</h4>
                      <div className="flex flex-wrap gap-2">
                        {coreSubjects.map((subject, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-base font-medium leading-normal tracking-tight">
                            <FaStar className="w-4 h-4" />
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherSubjects.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-700 mb-3 leading-tight tracking-tight">Additional Subjects</h4>
                      <div className="flex flex-wrap gap-2">
                        {otherSubjects.map((subject, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-base font-medium leading-normal tracking-tight">
                            <FaPlus className="w-4 h-4" />
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Institute Info & Job Description */}
          <div className="space-y-6">
            {/* Institute Info Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
              <h3 className="text-xl font-semibold text-orange-500 text-center mb-4 pb-3 border-b border-gray-200 leading-tight tracking-tight">INSTITUTE INFORMATION</h3>
              {instituteLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <p className="text-red-600 mb-3">{error}</p>
                  <button
                    onClick={() => fetchInstituteData(job.firebase_uid)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : instituteData ? (
                <div>
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-medium text-gray-800 mb-2 leading-tight tracking-tight">
                      <BlurWrapper isUnlocked={isUnlocked}>
                        {instituteData.name}
                      </BlurWrapper>
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {instituteData.address && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IoLocationOutline className="w-5 h-5 text-blue-500" />
                          <span className="text-base font-medium text-gray-500">Address:</span>
                        </div>
                        <div className="text-base font-semibold text-gray-800">
                          <BlurredOrLink
                            isUnlocked={isUnlocked}
                            value={instituteData.address}
                            type="text"
                          />
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_name && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaUsers className="w-5 h-5 text-blue-500" />
                          <span className="text-base font-medium text-gray-500">Contact Person:</span>
                        </div>
                        <div className="text-base font-semibold text-gray-800">
                          <BlurredOrLink
                            isUnlocked={isUnlocked}
                            value={instituteData.contact_person_name}
                            type="text"
                          />
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_email && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IoMailOutline className="w-5 h-5 text-blue-500" />
                          <span className="text-base font-medium text-gray-500">Email:</span>
                        </div>
                        <div className="text-base font-semibold text-gray-800">
                          <BlurredOrLink
                            isUnlocked={isUnlocked}
                            value={instituteData.contact_person_email}
                            type="email"
                          />
                        </div>
                      </div>
                    )}
                    {instituteData.contact_person_phone1 && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IoCallOutline className="w-5 h-5 text-blue-500" />
                          <span className="text-base font-medium text-gray-500">Phone:</span>
                        </div>
                        <div className="text-base font-semibold text-gray-800">
                          <BlurredOrLink
                            isUnlocked={isUnlocked}
                            value={instituteData.contact_person_phone1}
                            type="phone"
                          />
                        </div>
                      </div>
                    )}
                    {instituteData.website_url && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IoGlobeOutline className="w-5 h-5 text-blue-500" />
                          <span className="text-base font-medium text-gray-500">Website:</span>
                        </div>
                        <div className="text-base font-semibold text-gray-800">
                          <BlurredOrLink
                            isUnlocked={isUnlocked}
                            value={instituteData.website_url}
                            type="website"
                            href={instituteData.website_url}
                          >
                            Visit Website
                          </BlurredOrLink>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isUnlocked && (
                    <div className="mt-6">
                      <button
                        className="w-full bg-gradient-brand text-white py-4 px-6 rounded-lg font-semibold text-base hover:bg-gradient-primary-hover transition-colors flex items-center justify-center gap-3"
                        onClick={handleUnlockClick}
                      >
                        <span>💰</span>
                        Unlock Institution Details (50 Coins)
                      </button>
                    </div>
                  )}
                  {instituteData.description && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-xl font-medium text-gray-800 mb-3 leading-tight tracking-tight">About the Institute</h4>
                      <p className="text-gray-700 leading-relaxed">{instituteData.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Institute details not available</p>
              )}
            </div>

            {/* Job Description */}
            {job.job_description && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6">
                <h3 className="text-xl font-semibold text-orange-500 text-center mb-4 pb-3 border-b border-gray-200 leading-tight tracking-tight">Job Description</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed text-sm" style={{ fontSize: '14px', lineHeight: '1.4', padding: '8px 12px' }}>
                  {job.job_description}
                </div>
              </div>
            )}

            {/* Application Deadline Card */}
            {job.application_deadline && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-800 mb-3 flex items-center justify-center gap-2 leading-tight tracking-tight">
                  <i className="fas fa-hourglass-end"></i>
                  Application Deadline
                </h3>
                <p className="text-red-700 font-bold text-center text-lg sm:text-base leading-normal tracking-tight">{formatDate(job.application_deadline)}</p>
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
        <div className="flex justify-center mt-6 mb-4">
          <button
            className={`px-8 py-4 rounded-lg font-semibold text-base transition-all duration-300 flex items-center justify-center gap-3 leading-normal tracking-tight ${
              isApplied 
                ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                : 'bg-gradient-brand text-white hover:bg-gradient-primary-hover transition-colors shadow-lg hover:shadow-xl'
            }`}
            onClick={handleApplyJob}
            disabled={isApplied}
          >
            {isApplied ? (
              <>
                <FaCheck className="w-5 h-5" />
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