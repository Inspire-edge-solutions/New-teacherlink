import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { toast } from "react-toastify";
import './styles/viewJob.css';
import './styles/modal.css';
import { BsArrowLeft, BsBriefcase, BsClock, BsCash, BsMortarboard } from 'react-icons/bs';
import { IoLocationOutline, IoMailOutline, IoGlobeOutline, IoCallOutline } from 'react-icons/io5';
import { FaUsers, FaCalendarAlt, FaStar, FaPlus, FaTasks, FaBook, FaChalkboard, FaCheck } from 'react-icons/fa';
import { useAuth } from "../../../../Context/AuthContext";
import { formatQualification } from '../utils/formatUtils';

// === Add your new API endpoints for WhatsApp, login/org, RCS ===
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const APPLY_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const JOB_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
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
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";

function CoinModal({ isOpen, onClose, onConfirm, loading, coinValue, minCoins, status, errorMsg }) {
  

  if (!isOpen) return null;

  // Portal modal content
  const modalContent = (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="portal-modal-close-btn" onClick={onClose}>
          &times;
        </button>
        
        {status === "success" ? (
          <>
            <div className="coins-anim">
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#36b037", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>-100</span>
            </div>
            <div className="unlock-success-text">Application Submitted! <span role="img" aria-label="applied">✅</span></div>
            <div style={{ color: '#888', fontSize: 14, textAlign: "center" }}>You have successfully applied for this job.</div>
          </>
        ) : status === "already" ? (
          <>
            <div className="coins-anim" style={{ animation: "none", opacity: 0.85, filter: "grayscale(1)" }}>
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#1976D2", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>✓</span>
            </div>
            <div className="unlock-error-text" style={{ color: "#1976D2" }}>You already applied for this job.</div>
          </>
        ) : status === "error" ? (
          <>
            <div className="coins-anim" style={{ animation: "none", opacity: 0.85, filter: "grayscale(1)" }}>
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#d72660", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>×</span>
            </div>
            <div className="unlock-error-text">{errorMsg || "Could not apply for this job."}</div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 15, marginTop: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 17 }}>Apply for this job?</span>
            </div>
            <div style={{ color: "#888", fontSize: 15, marginBottom: 15 }}>
              Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
            </div>
            <div style={{ color: "#333", fontSize: "15px", marginBottom: 10 }}>
              <span>Use <b>100 Coins</b> to apply for this job.</span>
            </div>
           
            {coinValue !== null && coinValue < minCoins ? (
              <div style={{ color: "#d72660", fontWeight: 500, marginBottom: 10 }}>
                You don't have enough coins to apply for this job.
              </div>
            ) : null}
            <button
              className="unlock-btn-top"
              style={{ width: "100%", justifyContent: "center", marginBottom: 6, fontSize: 16 }}
              disabled={loading || (coinValue !== null && coinValue < minCoins)}
              onClick={onConfirm}
            >
              {loading ? "Applying..." : <>Apply <span className="coin-icon"><span role="img" aria-label="coin">🪙</span></span> 100</>}
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Render modal using Portal
  return ReactDOM.createPortal(modalContent, document.body);
}

const BlurWrapper = ({ isUnlocked, children }) => {
  return isUnlocked
    ? children
    : <span className="blurred-contact" tabIndex={-1}>{children}</span>;
};

const BlurredOrLink = ({ isUnlocked, type, value, href, children }) => {
  if (!isUnlocked) {
    return <span className="blurred-contact" tabIndex={-1}>{value}</span>;
  }
  if (type === 'email') {
    return <a href={`mailto:${value}`} className="info-value link">{value}</a>;
  }
  if (type === 'phone') {
    return <a href={`tel:${value}`} className="info-value link">{value}</a>;
  }
  if (type === 'website') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="info-value link">
        {children}
      </a>
    );
  }
  return <span className="info-value">{value}</span>;
};

function UnlockModal({ isOpen, onClose, userId, onUnlock, coinValue, loading, unlockStatus, error }) {
  

  if (!isOpen) return null;

  // Portal modal content
  const modalContent = (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="portal-modal-close-btn" onClick={onClose}>
          &times;
        </button>
        
        {unlockStatus === "success" ? (
          <>
            <div className="coins-anim">
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#f7b901", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>-50</span>
            </div>
            <div className="unlock-success-text">Unlocked! <span role="img" aria-label="unlocked">🔓</span></div>
            <div style={{ color: '#888', fontSize: 14 }}>Details unlocked successfully.</div>
          </>
        ) : unlockStatus === "error" ? (
          <>
            <div className="coins-anim" style={{ animation: "none", opacity: 0.85, filter: "grayscale(1)" }}>
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#d72660", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>×</span>
            </div>
            <div className="unlock-error-text">{error || "Could not unlock details."}</div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 15, marginTop: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 17 }}>Unlock institute details?</span>
            </div>
            <div style={{ color: "#888", fontSize: 15, marginBottom: 6 }}>
              Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
            </div>
            <div style={{ color: "#333", fontSize: "15px", marginBottom: 10 }}>
              <span>Use <b>50 Coins</b> to view address, contact, email, phone, and website details.</span>
            </div>
          
            <div style={{ color: "red", fontSize: 15,textAlign: "center", marginBottom: 15 }}>
              <i>Unlocked details remain visible for <b>30 days.</b></i>
            </div>
            <button
              className="unlock-btn-top"
              style={{ width: "100%", justifyContent: "center", marginBottom: 6, fontSize: 16 }}
              disabled={loading}
              onClick={onUnlock}
            >
              {loading ? "Unlocking..." : <>Unlock <span className="coin-icon"><span role="img" aria-label="coin">🪙</span></span> 50</>}
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Render modal using Portal
  return ReactDOM.createPortal(modalContent, document.body);
}

const ViewJobs = ({ job, onBack }) => {
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
      axios.get(REDEEM_API)
        .then(({ data }) => {
          const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
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
      const { data } = await axios.get(REDEEM_API);
      const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
      const coins = found?.coin_value ?? 0;
      setCoinValue(coins);

      if (coins < 50) {
        setUnlockStatus("error");
        setUnlockError("Not enough coins to unlock details!");
        setUnlockLoading(false);
        return;
      }
      await axios.put(REDEEM_API, {
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
    axios.get(REDEEM_API)
      .then(({ data }) => {
        const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
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

  // --- RCS sending function (called after WhatsApp) ---
  const sendRcsApply = async ({ phone, userName, orgName }) => {
    try {
      const contactId = phone.startsWith("91") ? phone : `91${phone}`;
      await axios.post(RCS_API, {
        contactId: contactId,
        templateName: "job_apply",
        customParam: {
          NAME: userName,
          SCHOOL: orgName
        },
        sent_by: "suhas",
        sent_email: "suhas75@gmail.com"
      });
    } catch (err) {}
  };

  // --- WhatsApp sending function after apply success ---
  const sendWhatsAppApply = async () => {
    let phone = "";
    let userName = "";
    let orgName = "";
    let errors = [];

    try {
      const loginRes = await axios.get(`${LOGIN_API}?firebase_uid=${userId}`);
      const loginData = loginRes.data;
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
        const orgRes = await axios.get(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
        const orgData = orgRes.data;
        if (Array.isArray(orgData) && orgData.length > 0) {
          orgName = orgData[0].name || "";
        }
      }
      if (!orgName) orgName = job.institute_name || "";
      if (!orgName) errors.push("Organisation name not found for WhatsApp.");
    } catch (err) {
      if (!orgName) errors.push("Failed to fetch organisation name.");
    }

    if (errors.length) return;

    try {
      console.log('📤 Sending WhatsApp confirmation to candidate...');
      console.log('📱 Candidate Phone:', phone);
      console.log('📋 Template: applied_job');

      await axios.post(WHATSAPP_API, {
        phone: formatPhone(phone),
        templateName: "applied_1_thing", // Use working template first
        language: "en",
        bodyParams: [
          { type: "text", text: "0" },
          { type: "text", text: "Click here to recharge" }
        ],
        sent_by: "Suhas",
        sent_email: "suhas@teacherlink.in"
      });

      console.log('✅ WhatsApp confirmation sent to candidate successfully');
      // --- After WhatsApp, send RCS also ---
      await sendRcsApply({ phone, userName, orgName });
    } catch (err) {
      console.error('❌ Failed to send WhatsApp confirmation:', err);
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
      const { data: coinsData } = await axios.get(REDEEM_API);
      const found = Array.isArray(coinsData) ? coinsData.find(d => d.firebase_uid === userId) : null;
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

      // 5. Deduct 30 coins
      await axios.put(REDEEM_API, {
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

  const formatSubjects = (subjects) => {
    if (!subjects) return [];
    if (Array.isArray(subjects)) return subjects;
    if (typeof subjects === 'string') {
      return subjects.split(/[,;]/).map(subject => subject.trim()).filter(Boolean);
    }
    return [String(subjects)];
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const coreSubjects = formatSubjects(job.core_subjects);
  const otherSubjects = formatSubjects(job.other_subjects);

  if (!job) {
    return (
      <div className="no-job-selected">
        <p>No job selected</p>
        <button className="btn btn-primary" onClick={onBack}>Back to Jobs</button>
      </div>
    );
  }

  return (
    <div className="job-view-container">
      {/* Top Navigation Bar */}
      <div className="view-header-bar">
        <h1 className="job-view-title">Job Details</h1>
        <button className="btn-back-jobs" onClick={() => onBack('list')}>
          Back to Jobs <BsArrowLeft />
        </button>
      </div>

      <div className="job-content-grid">
        {/* Main Content Column */}
        <div className="main-content">
          {/* Job Title and Highlights */}
          <div className="job-header-section">
            <div className="job-title-section">
              <h1 className="job-title">{job.job_title || 'Position not specified'}</h1>
              {job.institute_name && (
                <h2 className="institute-name">{job.institute_name}</h2>
              )}
            </div>
            <div className="job-meta-grid">
              <div className="meta-item">
                <BsBriefcase className="meta-icon" />
                <div className="meta-label"><strong>Job Type</strong></div>
                <div className="meta-value">{(job.job_type && job.job_type.toString().trim()) || 'Not specified'}</div>
              </div>
              <div className="meta-item">
                <IoLocationOutline className="meta-icon" />
                <div className="meta-label"><strong>Location</strong></div>
                <div className="meta-value">{job.city && job.state_ut ? `${job.city}, ${job.state_ut}` : 'Not specified'}</div>
              </div>
              <div className="meta-item">
                <FaCalendarAlt className="meta-icon" />
                <div className="meta-label"><strong>Joining Date</strong></div>
                <div className="meta-value">{formatDate(job.joining_date)}</div>
              </div>
              <div className="meta-item">
                <FaUsers className="meta-icon" />
                <div className="meta-label"><strong>Openings</strong></div>
                <div className="meta-value">{(job.no_of_opening && job.no_of_opening.toString().trim()) || 'Not specified'}</div>
              </div>
              <div className="meta-item">
                <BsCash className="meta-icon" />
                <div className="meta-label"><strong>Salary Range</strong></div>
                <div className="meta-value">{job.min_salary && job.max_salary ? `₹${job.min_salary} - ₹${job.max_salary}` : 'Not specified'}</div>
              </div>
              <div className="meta-item">
                <BsClock className="meta-icon" />
                <div className="meta-label"><strong>Experience</strong></div>
                <div className="meta-value">{job.experience_required ? `${job.experience_required} years` : 'Not specified'}</div>
              </div>
            </div>
          </div>

          {/* Subjects Required */}
          {(coreSubjects.length > 0 || otherSubjects.length > 0) && (
            <div className="content-section">
              <h3 className="section-title"><strong>Subject Requirements</strong></h3>
              <div className="content-box">
                {coreSubjects.length > 0 && (
                  <div className="subjects-section">
                    <h4><strong>Core Subjects</strong></h4>
                    <div className="expertise-tags">
                      {coreSubjects.map((subject, index) => (
                        <span key={index} className="expertise-tag primary">
                          <FaStar />
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {otherSubjects.length > 0 && (
                  <div className="subjects-section">
                    <h4><strong>Additional Subjects</strong></h4>
                    <div className="expertise-tags">
                      {otherSubjects.map((subject, index) => (
                        <span key={index} className="expertise-tag secondary">
                          <FaPlus />
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Job Description */}
          {job.job_description && (
            <div className="content-section">
              <h3 className="section-title"><strong>Job Description</strong></h3>
              <div className="content-box description">
                {job.job_description}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="job-sidebar">
          {/* Job Requirements Card */}
          <div className="sidebar-card">
            <h3 className="section-title"><strong>JOB REQUIREMENTS</strong></h3>
            <div className="requirements-list">
              <div className="requirement-item">
                <BsMortarboard className="req-icon" />
                <div className="req-label"><strong>Qualification</strong></div>
                <div className="req-value">{formatQualification(job.qualification)}</div>
              </div>
              <div className="requirement-item">
                <FaTasks className="req-icon" />
                <div className="req-label"><strong>Selection Process</strong></div>
                <div className="req-value">{(job.job_process && job.job_process.toString().trim()) || 'Not specified'}</div>
              </div>
              <div className="requirement-item">
                <BsClock className="req-icon" />
                <div className="req-label"><strong>Working Shifts</strong></div>
                <div className="req-value">{(job.job_shifts && job.job_shifts.toString().trim()) || 'Not specified'}</div>
              </div>
              <div className="requirement-item">
                <FaBook className="req-icon" />
                <div className="req-label"><strong>Curriculum</strong></div>
                <div className="req-value">{(job.curriculum && job.curriculum.toString().trim()) || 'Not specified'}</div>
              </div>
              <div className="requirement-item">
                <FaChalkboard className="req-icon" />
                <div className="req-label"><strong>Board</strong></div>
                <div className="req-value">{(job.board && job.board.toString().trim()) || 'Not specified'}</div>
              </div>
            </div>
          </div>

          {/* Institute Info Section */}
          <div>
            <h3 className="section-title"><strong>INSTITUTE INFORMATION</strong></h3>
            {instituteLoading ? (
              <div className="loading-spinner-small"></div>
            ) : error ? (
              <div className="error-message">
                <p>{error}</p>
                <button
                  onClick={() => fetchInstituteData(job.firebase_uid)}
                  className="btn btn-sm btn-outline-primary"
                >
                  Retry
                </button>
              </div>
            ) : instituteData ? (
              <div className="institute-info">
                <h4 className="institute-name">
                  <BlurWrapper isUnlocked={isUnlocked}>
                    {instituteData.name}
                  </BlurWrapper>
                </h4>
                <div className="institute-details">
                  {instituteData.address && (
                    <div className="info-item">
                      <IoLocationOutline />
                      <span className="info-label"><strong>Address:</strong></span>
                      <BlurredOrLink
                        isUnlocked={isUnlocked}
                        value={instituteData.address}
                        type="text"
                      />
                    </div>
                  )}
                  {instituteData.contact_person_name && (
                    <div className="info-item">
                      <FaUsers />
                      <span className="info-label"><strong>Contact Person:</strong></span>
                      <BlurredOrLink
                        isUnlocked={isUnlocked}
                        value={instituteData.contact_person_name}
                        type="text"
                      />
                    </div>
                  )}
                  {instituteData.contact_person_email && (
                    <div className="info-item">
                      <IoMailOutline />
                      <span className="info-label"><strong>Email:</strong></span>
                      <BlurredOrLink
                        isUnlocked={isUnlocked}
                        value={instituteData.contact_person_email}
                        type="email"
                      />
                    </div>
                  )}
                  {instituteData.contact_person_phone1 && (
                    <div className="info-item">
                      <IoCallOutline />
                      <span className="info-label"><strong>Phone:</strong></span>
                      <BlurredOrLink
                        isUnlocked={isUnlocked}
                        value={instituteData.contact_person_phone1}
                        type="phone"
                      />
                    </div>
                  )}
                  {instituteData.website_url && (
                    <div className="info-item">
                      <IoGlobeOutline />
                      <span className="info-label"><strong>Website:</strong></span>
                      <BlurredOrLink
                        isUnlocked={isUnlocked}
                        value={instituteData.website_url}
                        type="website"
                        href={instituteData.website_url}
                      >
                        Visit Website
                      </BlurredOrLink>
                    </div>
                  )}
                  {/* === View Institution Details BUTTON BELOW WEBSITE === */}
                  {!isUnlocked && (
                    <div style={{ marginTop: 18 }}>
                      <button
                        className="unlock-btn-top"
                        style={{ width: '100%' }}
                        onClick={handleUnlockClick}
                      >
                        <span role="img" aria-label="coin" className="coin-icon">💰</span>
                        View Institution Details
                      </button>
                    </div>
                  )}
                </div>
                {instituteData.description && (
                  <div className="institute-description">
                    <h4><strong>About the Institute</strong></h4>
                    <p className="description-text">{instituteData.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="no-info">Institute details not available</p>
            )}
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

          {/* Application Deadline Card */}
          {job.application_deadline && (
            <div className="sidebar-card deadline-card">
              <h3 className="card-title">
                <i className="fas fa-hourglass-end"></i>
                Application Deadline
              </h3>
              <p className="deadline-date">{formatDate(job.application_deadline)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Apply Job Button */}
      <div className="apply-job-section">
        <button
          className={`apply-job-button ${isApplied ? 'applied' : ''}`}
          onClick={handleApplyJob}
          disabled={isApplied}
        >
          {isApplied ? (
            <>
              <FaCheck /> Applied
            </>
          ) : (
            'Apply for this Job'
          )}
        </button>
      </div>

      {/* Apply Modal */}
      <CoinModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onConfirm={handleConfirmApply}
        loading={applyLoading}
        coinValue={applyCoin}
        minCoins={100}
        status={applyStatus}
        errorMsg={applyError}
      />
    </div>
  );
};

export default ViewJobs;