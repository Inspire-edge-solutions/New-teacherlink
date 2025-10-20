import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../styles/cv-style.css';
import '../styles/cv-pdf-print.css';
import '../styles/view.css';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { cleanContentForPrint, generatePrintHTML, generatePDF } from '../utils/printPdfUtils.jsx';
import { useAuth } from "../../../../../Context/AuthContext";

const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/candidate_details_byid';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const ADDITIONAL_INFO1_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1';
const SOCIAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile';
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const COIN_HISTORY_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';

// -- Unlock Modal Component with Portal-based display
function UnlockModal({ isOpen, onClose, userId, onUnlock, coinValue, loading, unlockStatus, error }) {
  // Simple coin icon for animation
  

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
            <div style={{ color: '#888', fontSize: 14, textAlign: "center" }}>Details unlocked successfully.</div>
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
              <span style={{ fontWeight: 600, fontSize: 17 }}>Unlock candidate details?</span>
            </div>
            <div style={{ color: "#888", fontSize: 15, marginBottom: 6, textAlign: "center" }}>
              Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
            </div>
            <div style={{ color: "#333", fontSize: "15px", marginBottom: 10, textAlign: "center" }}>
              <span>Use <b>50 Coins</b> to view email, phone, WhatsApp, and social details.</span>
            </div>
            
            <div style={{ color: "red", fontSize: 15, marginBottom: 15, textAlign: "center" }}>
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

const BlurWrapper = ({ children, isUnlocked }) => {
  return isUnlocked ? children : <span className="blurred-contact">{children}</span>;
};

  

const Field = ({ label, value }) => {
  if (!value) return null;
  const displayValue = Array.isArray(value) ? value.join(', ') : 
                    typeof value === 'string' ? value.split(',').join(', ') : 
                    value;
  return (
    <div className="form-group col-12 mb-3">
      <div className="input-wrapper" style={{ position: 'relative' }}>
        <div className="form-control" style={{ 
          padding: '12px 15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          {displayValue}
        </div>
        <span className="custom-tooltip" style={{
          position: 'absolute',
          top: '-8px',
          left: '12px',
          backgroundColor: '#fff',
          padding: '0 8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#1967d2',
          zIndex: 1,
          borderRadius: '4px'
        }}>{label}</span>
      </div>
    </div>
  );
};

const isPositiveValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const lowercaseValue = value.toLowerCase().trim();
    return lowercaseValue === 'yes' || lowercaseValue === '1' || lowercaseValue === 'true';
  }
  if (typeof value === 'object' && value !== null) {
    if ('value' in value) {
      return isPositiveValue(value.value);
    }
    return false;
  }
  return false;
};

const hasValidContent = (value1, value2) => {
  const checkArray = (arr) => {
    return Array.isArray(arr) && arr.length > 0 && arr.some(item => item && item.trim());
  };
  const checkString = (str) => {
    return str && typeof str === 'string' && str.trim() !== '';
  };
  return checkArray(value1) || checkArray(value2) || checkString(value1) || checkString(value2);
};

function CandidateDetail({ candidate, onBack, onNext, onPrevious, isFirstProfile, isLastProfile, checkedProfiles }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Decode the candidate data (firebase_uid stays as plain text)
  //const decodedCandidate = decodeCandidateData(candidate);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: {}, dynamoData: [] });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [additionalInfo1, setAdditionalInfo1] = useState(null);
  const [socialLinks, setSocialLinks] = useState({ facebook: "", linkedin: "" });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- Unlock state
  const userId = user?.firebase_uid || user?.uid;
  const candidateId = candidate?.firebase_uid;
  const unlockKey = `unlocked_${userId}_${candidateId}`;
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const stored = localStorage.getItem(unlockKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.unlocked && parsed.timestamp) {
          const unlockTime = new Date(parsed.timestamp);
          const now = new Date();
          const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30;
        }
      } catch (e) {}
    }
    return false;
  });
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState(""); // "success" | "error" | ""
  const [unlockError, setUnlockError] = useState("");
  const [checkingCoins, setCheckingCoins] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showCoinAnim, setShowCoinAnim] = useState(false);
  const [photoError, setPhotoError] = useState(false);
    
  
  
  // Check unlock status when userId or candidateId changes
  useEffect(() => {
    if (!userId || !candidateId) {
      setIsUnlocked(false);
      return;
    }

    const stored = localStorage.getItem(unlockKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.unlocked && parsed.timestamp) {
          const unlockTime = new Date(parsed.timestamp);
          const now = new Date();
          const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
          setIsUnlocked(daysDiff <= 30);
          return;
        }
      } catch (e) {}
    }
    setIsUnlocked(false);
  }, [userId, candidateId, unlockKey]);

  useEffect(() => {
    let cancelled = false;
    const checkUnlocked = async () => {
      setCheckingCoins(true);
      setShowUnlock(false);
      setUnlockError('');
      try {
        const { data } = await axios.get(REDEEM_API);
        const found = Array.isArray(data) ? data.find(
          d => d.firebase_uid === userId
        ) : null;
        setCoinValue(found?.coin_value ?? null);
        setShowUnlock(true);
      } catch (e) {
        setUnlockError('Could not check coins. Try again.');
        setShowUnlock(true);
      } finally {
        if (!cancelled) setCheckingCoins(false);
      }
    };
    if (userId && candidateId) {
      checkUnlocked();
    } else {
      setIsUnlocked(false);
      setShowUnlock(false);
      setCheckingCoins(false);
    }
    return () => { cancelled = true; };
  }, [userId, candidateId]);

  const handleUnlockDetails = async () => {
    setUnlockError('');
    setCheckingCoins(true);
    try {
      const { data } = await axios.get(REDEEM_API);
      const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
      if (!found) {
        setUnlockError("Don't have enough coin in your account");
        setCheckingCoins(false);
        return;
      }
      if (found.coin_value < 50) {
        setUnlockError("Don't have enough coin in your account");
        setCheckingCoins(false);
        return;
      }
      await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - 50
      });
      
      setShowCoinAnim(true);
      setTimeout(() => {
        setShowCoinAnim(false);
        setIsUnlocked(true);
        localStorage.setItem(unlockKey, JSON.stringify({
          unlocked: true,
          timestamp: new Date().toISOString()
        }));
        setShowUnlock(false);
        setCheckingCoins(false);
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

  // Responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const getResponsiveColumnCount = (desktop, tablet, mobile) => {
    if (windowWidth <= 576) return mobile;
    if (windowWidth <= 992) return tablet;
    return desktop;
  };


  // Fetch coins on modal open
  useEffect(() => {
    if (showUnlockModal && userId) {
      axios.get(REDEEM_API)
        .then(({ data }) => {
          const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
          setCoinValue(found?.coin_value ?? 0);
        }).catch(() => setCoinValue(0));
    }
  }, [showUnlockModal, userId]);

  // -- Top "Unlock Details" button click handler
  const handleUnlockClick = () => {
    setShowUnlockModal(true);
    setUnlockStatus("");
    setUnlockError("");
  };

  // -- Actual unlock logic (with animation, error handling)
  const handleConfirmUnlock = async () => {
    setUnlockLoading(true);
    setUnlockError("");
    setUnlockStatus("");
    try {
      // 1. Get current coins again (in case concurrent changes)
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

      // 2. Subtract 20 coins via PUT
      await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - 50
      });

      // 3. Get organization ID for the current user
      let candidateId = null;
      try {
        const orgResponse = await axios.get(`${ORGANISATION_API}?firebase_uid=${encodeURIComponent(userId)}`);
        if (orgResponse.status === 200 && Array.isArray(orgResponse.data) && orgResponse.data.length > 0) {
          candidateId = orgResponse.data[0].id;
        }
      } catch (orgError) {
        console.error("Error fetching organization data:", orgError);
      }

      // 4. Record coin history with unblocked_candidate_id and unblocked_candidate_name from /personal
      let unblocked_candidate_id = null;
      let unblocked_candidate_name = null;
      try {
        const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: firebase_uid } });
        if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
          unblocked_candidate_id = personalRes.data[0].id;
          unblocked_candidate_name = personalRes.data[0].fullName;
        }
      } catch (personalError) {}
      try {
        await axios.post(COIN_HISTORY_API, {
          firebase_uid: userId,
          candidate_id: candidateId,
          job_id: null,
          coin_value: coins - 50,
          reduction: 50,
          reason: "Unblocked the candidate details",
          unblocked_candidate_id,
          unblocked_candidate_name
        });
      } catch (historyError) {}

      setUnlockStatus("success");
      setUnlockLoading(false);
      // Show animation for 2s, then unlock and close popup
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

  const handleBack = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else if (typeof onBack === 'function') {
      onBack();
    } else if (typeof handleClose === 'function') {
      handleClose();
    } else {
      if (window.history && window.history.length > 1) {
        window.history.back();
      }
    }
  };

  const getFreshImageUrl = async (firebase_uid) => {
    try {
      const params = { firebase_uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      return data?.url || null;
    } catch (error) {
      console.error("Error getting fresh image URL:", error);
      return null;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const cvContainer = document.querySelector('.cv-container');
    if (!cvContainer) {
      alert('CV content not found');
      return;
    }
    const clonedContent = cvContainer.cloneNode(true);
    cleanContentForPrint(clonedContent, isUnlocked);
    const printContent = generatePrintHTML(
      clonedContent.outerHTML,
      profileData?.fullName || 'Candidate',
      isUnlocked
    );
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };
  };

  const downloadPDF = async () => {
    const cvElement = document.querySelector('.cv-container');
    const result = await generatePDF({
      cvElement,
      profileData,
      candidate,
      getFreshImageUrl,
      setIsDownloading,
      isUnlocked
    });
    if (!result.success) {
      alert('Could not generate PDF. Please try using the Print option instead. Error: ' + result.error);
    }
  };

  const fetchProfilePhoto = useCallback(async () => {
    try {
      
      const params = { firebase_uid: firebase_uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      if (data?.url) {
        setPhotoUrl(data.url);
        setPhotoError(false);
      }
    } catch (error) {
      setPhotoError(true);
      if (error.response?.status !== 404) {
        console.log("Error loading profile photo");
      }
    }
  }, [candidate]);

  const fetchSocialLinks = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    try {
      const response = await axios.get(SOCIAL_API, {
        params: { firebase_uid: firebase_uid }
      });
      if (response.status === 200 && response.data.length > 0) {
        const record = response.data[0];
        setSocialLinks({
          facebook: record.facebook || "",
          linkedin: record.linkedin || ""
        });
      }
    } catch (err) {}
  }, [candidate]);

  const fetchEducationData = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    try {
      const response = await axios.get(EDUCATION_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateEducation = response.data.filter(edu => edu.firebase_uid === firebase_uid);
        // Decode the education data
        // const decodedEducation = candidateEducation.map(edu => decodeCandidateData(edu));
        // setEducationData(decodedEducation);
      }
    } catch (err) {}
  }, [candidate]);

  const fetchProfileData = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(FULL_API, {
        firebase_uid: candidate.firebase_uid
        // params: { firebase_uid: decodedCandidate.firebase_uid, t: Date.now() }
      });
      // if (response.status === 200 && Array.isArray(response.data)) {
      //   const candidateRecord = response.data.find(r => 
      //     r.firebase_uid === decodedCandidate.firebase_uid || 
      //     (r.email && r.email.toLowerCase() === candidate.email?.toLowerCase())
      // );
        console.log(response.data);
        // Decode the profile data
        // const decodedProfile = candidateRecord ? decodeCandidateData(candidateRecord) : null;
        setProfileData(response.data);
      //}
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [candidate]);

  const fetchExperienceData = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    try {
      const response = await axios.get(EXPERIENCE_API);
      if (response.status === 200) {
        const { mysqlData, dynamoData } = response.data;
        const candidateMysqlData = Array.isArray(mysqlData) 
          ? mysqlData.find(exp => exp.firebase_uid === firebase_uid) 
          : null;
        let candidateDynamoData = null;
        if (Array.isArray(dynamoData)) {
          candidateDynamoData = dynamoData.find(exp => exp.firebase_uid === decodedCandidate.firebase_uid);
        } else if (dynamoData && typeof dynamoData === 'object') {
          if (dynamoData.firebase_uid === decodedCandidate.firebase_uid) {
            candidateDynamoData = dynamoData;
          }
        }
        
        // Decode the experience data
        const decodedMysqlData = candidateMysqlData ? decodeCandidateData(candidateMysqlData) : {
          teaching_experience_years: 0,
          teaching_experience_months: 0,
          non_teaching_experience_years: 0,
          non_teaching_experience_months: 0,
          total_experience_years: 0,
          total_experience_months: 0
        };
        const decodedDynamoData = candidateDynamoData ? decodeCandidateData(candidateDynamoData) : { experienceEntries: [] };
        
        setExperienceData({
          mysqlData: decodedMysqlData,
          dynamoData: decodedDynamoData
        });
      }
    } catch (err) {
      setExperienceData({ 
        mysqlData: {
          teaching_experience_years: 0,
          teaching_experience_months: 0,
          non_teaching_experience_years: 0,
          non_teaching_experience_months: 0,
          total_experience_years: 0,
          total_experience_months: 0
        }, 
        dynamoData: { experienceEntries: [] } 
      });
    }
  }, [candidate]);

  const fetchJobPreferenceData = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    try {
      const response = await axios.get(JOB_PREFERENCE_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidatePreference = response.data.find(pref => pref.firebase_uid === decodedCandidate.firebase_uid);
        // Decode the job preference data
        const decodedPreference = candidatePreference ? decodeCandidateData(candidatePreference) : null;
        setJobPreferenceData(decodedPreference);
      }
    } catch (err) {}
  }, [candidate]);

  const fetchAdditionalInfo = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    try {
      const [response1, response2] = await Promise.all([
        axios.get(ADDITIONAL_INFO1_API),
        axios.get(ADDITIONAL_INFO1_API)
      ]);
      if (response1.status === 200 && Array.isArray(response1.data)) {
        const candidateInfo1 = response1.data.find(info => info.firebase_uid === decodedCandidate.firebase_uid);
        setAdditionalInfo1(candidateInfo1 || null);
      }
    } catch (err) {}
  }, [candidate]);

  // Video and Resume API endpoints
  const VIDEO_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-video";
  const RESUME_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-resume";

  // Handle viewing demo video
  const handleViewVideo = async () => {
    try {
      if (!candidate?.firebase_uid) {
        toast.error("Candidate ID not available");
        return;
      }

      const params = { firebase_uid: decodedCandidate.firebase_uid, action: "view" };
      const { data } = await axios.get(VIDEO_API_URL, { params });
      
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No demo video available for this candidate");
      }
    } catch (error) {
      console.error("Error retrieving video:", error);
      toast.error(error.response?.status === 404 
        ? "No demo video available for this candidate" 
        : "Error retrieving video. Please try again later."
      );
    }
  };

  // Handle viewing resume
  const handleViewResume = async () => {
    try {
      if (!candidate?.firebase_uid) {
        toast.error("Candidate ID not available");
        return;
      }

      const params = { firebase_uid: decodedCandidate.firebase_uid, action: "view" };
      const { data } = await axios.get(RESUME_API_URL, { params });
      
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No resume available for this candidate");
      }
    } catch (error) {
      console.error("Error retrieving resume:", error);
      toast.error(error.response?.status === 404 
        ? "No resume available for this candidate" 
        : "Error retrieving resume. Please try again later."
      );
    }
  };

  useEffect(() => {
    if (candidate?.firebase_uid) {
      fetchProfileData();
      fetchEducationData();
      fetchExperienceData();
      fetchJobPreferenceData();
      fetchAdditionalInfo();
      fetchProfilePhoto();
      fetchSocialLinks();
    }
  }, [
    fetchProfileData,
    fetchEducationData,
    fetchExperienceData,
    fetchJobPreferenceData,
    fetchAdditionalInfo,
    fetchProfilePhoto,
    fetchSocialLinks,
    candidate
  ]);
  if (!candidate?.firebase_uid) {
    return (
      <div className="alert alert-warning text-center">
        No candidate data available.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Error loading profile: {error}
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="alert alert-info">
        No profile data found for this candidate.
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseLanguages = (languagesData) => {
    if (!languagesData) return null;
    try {
      if (Array.isArray(languagesData)) return languagesData;
      if (typeof languagesData === 'string') {
        const parsed = JSON.parse(languagesData);
        return Array.isArray(parsed) ? parsed : null;
      }
      if (typeof languagesData === 'object') {
        return Object.entries(languagesData).map(([language, details]) => ({
          language,
          ...details
        }));
      }
      return null;
    } catch {
      return null;
    }
  };

  const languages = parseLanguages(profileData.languages);

  const renderEducationBlocks = () => {
    if (!educationData || educationData.length === 0) return null;  
    return educationData.map((education, index) => {
      if (!education) return null;
      const educationType = getEducationTypeTitle(education.education_type);
      let details = [];
      if (education.schoolName) details.push(`${education.schoolName}`);
      if (education.collegeName) details.push(`${education.collegeName}`);
      if (education.universityName) details.push(`${education.universityName}`);
      if (education.instituteName) details.push(`${education.instituteName}`);
      let additionalInfo = [];
      if (education.yearOfPassing) additionalInfo.push(`${education.yearOfPassing}`);
      if (education.percentage) additionalInfo.push(`${education.percentage}%`);
      if (education.mode) additionalInfo.push(`${education.mode}`);
      if (education.syllabus) additionalInfo.push(`${education.syllabus}`);
      if (education.courseStatus) additionalInfo.push(`${education.courseStatus}`);
      if (education.courseName) additionalInfo.push(`${education.courseName}`);
      if (education.placeOfStudy) additionalInfo.push(`${education.placeOfStudy}`);
      if (education.affiliatedTo) additionalInfo.push(`Affiliated to: ${education.affiliatedTo}`);
      if (education.courseDuration) additionalInfo.push(`Duration: ${education.courseDuration}`);
      if (education.specialization) additionalInfo.push(`${education.specialization}`);
      return (
        <div className="education-block" key={index}>
          <div className="education-title">{educationType}</div>
          <div className="education-details">
            {details.map((detail, i) => (
              <div key={i} className="education-detail">{detail}</div>
            ))}
            <div className="education-meta">
              {additionalInfo.join(' | ')}
            </div>
            {education.coreSubjects && (
              <div className="core-subjects">
                <strong>Core Subjects:</strong> {
                  Array.isArray(education.coreSubjects) 
                    ? education.coreSubjects.join(', ') 
                    : typeof education.coreSubjects === 'string'
                      ? JSON.parse(education.coreSubjects).join(', ')
                      : ''
                }
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const getEducationTypeTitle = (type) => {
    const titles = {
      grade10: 'Grade 10',
      grade12: 'Grade 12',
      degree: 'Degree',
      masterDegree: "Master's Degree",
      doctorate: 'Doctorate',
      nttMtt: 'NTT/MTT',
      dEd: 'D.Ed/D.EID',
      bEd: 'B.Ed',
      certificate: 'Certificate/Other Course'
    };
    return titles[type] || type;
  };

  const getExperienceText = () => {
    if (!experienceData?.mysqlData) {
      return (
        <div style={{ marginBottom: '15px', padding: '10px', borderBottom: '1px solid #eee' }}>
          <div><strong>Total Teaching Experience</strong>: Not specified</div>
          <div><strong>Total Experience (Teaching + Non-Teaching)</strong>: Not specified</div>
        </div>
      );
    }
    const teachingYears = experienceData.mysqlData.teaching_experience_years || 0;
    const teachingMonths = experienceData.mysqlData.teaching_experience_months || 0;
    const nonTeachingYears = experienceData.mysqlData.non_teaching_experience_years || 0;
    const nonTeachingMonths = experienceData.mysqlData.non_teaching_experience_months || 0;
    let totalYears = experienceData.mysqlData.total_experience_years;
    let totalMonths = experienceData.mysqlData.total_experience_months;
    if (totalYears === undefined || totalMonths === undefined) {
      const rawTotalMonths = (teachingMonths + nonTeachingMonths);
      totalMonths = rawTotalMonths % 12;
      const extraYears = Math.floor(rawTotalMonths / 12);
      totalYears = teachingYears + nonTeachingYears + extraYears;
    }
    return (
      <div style={{ marginBottom: '15px', padding: '10px', borderBottom: '1px solid #eee' }}>
        <div><strong>Total Teaching Experience</strong>: {teachingYears} Years & {teachingMonths} months</div>
        <div><strong>Total Experience (Teaching + Non-Teaching)</strong>: {totalYears} Years & {totalMonths} months</div>
      </div>
    );
  };

  const renderExperienceBlocks = () => {
    const hasExperience = experienceData?.dynamoData?.experienceEntries && 
                         experienceData.dynamoData.experienceEntries.length > 0;
    if (!hasExperience) {
      return (
        <div className="no-experience-message" style={{ 
          padding: '15px', 
          textAlign: 'center', 
          color: '#555',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          No work experience information available
        </div>
      );
    }
    return experienceData.dynamoData.experienceEntries.map((exp, index) => {
      if (!exp || !exp.organizationName) return null;
      const designation = exp.jobType === 'teaching' ? exp.teachingDesignation :
                         exp.jobType === 'administration' ? exp.adminDesignation :
                         exp.jobType === 'teachingAndAdministration' ? 
                           (exp.teachingAdminDesignations && exp.teachingAdminDesignations.length > 0 ? 
                             exp.teachingAdminDesignations.join(', ') : '') :
                         exp.designation || '';
      const startDate = exp.work_from_month && exp.work_from_year ? 
                      `${exp.work_from_month} / ${exp.work_from_year}` : '';
      const endDate = exp.currentlyWorking ? 
                    'till date' : 
                    (exp.work_till_month && exp.work_till_year ? 
                     `${exp.work_till_month} / ${exp.work_till_year}` : '');
      const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
      let durationText = '';
      if (exp.experience_years || exp.experience_months) {
        durationText = ` (${exp.experience_years || 0} Years ${exp.experience_months || 0} Months)`;
      }
      let jobTypeText = [];
      if (exp.jobType === 'teaching') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Teaching)');
      } else if (exp.jobType === 'administration') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Non-Teaching)');
      } else if (exp.jobType === 'teachingAndAdministration') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Teaching + Non-Teaching)');
      } else {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Non-Teaching)');
      }
      if (exp.jobMode) {
        jobTypeText.push(`${exp.jobMode === 'offline' ? 'Regular (Offline)' : 'Regular (Online)'}`);
      }
      if (exp.salary) {
        jobTypeText.push(`${exp.salary} LPA`);
      }
      const location = [exp.city, exp.state, exp.country].filter(Boolean).join(', ');
      return (
        <div className="experience-block" key={index} style={{ 
          marginBottom: '25px',
          fontSize: '15px',
          lineHeight: '1.5'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            <div style={{ fontSize: '16px' }}>{exp.organizationName}</div>
            <div>
              {dateRange}
              <span style={{ fontWeight: 'normal', color: '#555' }}>{durationText}</span>
            </div>
          </div>
          <div style={{ marginBottom: '6px', color: '#555' }}>{location}</div>
          <div style={{ marginBottom: '6px' }}>
            {jobTypeText.join(' | ')}
          </div>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
            columnGap: '20px',
            rowGap: '5px'
          }}>
            <div>
              <strong>Designation:</strong> {designation}
            </div>
            {exp.jobType === 'teaching' && exp.teachingGrades && (
              <div>
                <strong>Grades handled:</strong> {Array.isArray(exp.teachingGrades) ? 
                  exp.teachingGrades.join(', ') : exp.teachingGrades}
              </div>
            )}
            {exp.jobType === 'teaching' && exp.teachingSubjects && (
              <div>
                <strong>Subject handled:</strong> {Array.isArray(exp.teachingSubjects) ? 
                  exp.teachingSubjects.join(', ') : exp.teachingSubjects}
              </div>
            )}
            {exp.jobType === 'teaching' && exp.teachingCoreExpertise && (
              <div>
                <strong>Core Expertise:</strong> {Array.isArray(exp.teachingCoreExpertise) ? 
                  exp.teachingCoreExpertise.join(', ') : exp.teachingCoreExpertise}
              </div>
            )}
            {exp.jobType === 'teaching' && exp.teachingCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.teachingCurriculum}
              </div>
            )}
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminGrades && (
              <div>
                <strong>Grades handled:</strong> {Array.isArray(exp.teachingAdminGrades) ? 
                  exp.teachingAdminGrades.join(', ') : exp.teachingAdminGrades}
              </div>
            )}
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminSubjects && (
              <div>
                <strong>Subject handled:</strong> {Array.isArray(exp.teachingAdminSubjects) ? 
                  exp.teachingAdminSubjects.join(', ') : exp.teachingAdminSubjects}
              </div>
            )}
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminCoreExpertise && (
              <div>
                <strong>Core Expertise:</strong> {Array.isArray(exp.teachingAdminCoreExpertise) ? 
                  exp.teachingAdminCoreExpertise.join(', ') : exp.teachingAdminCoreExpertise}
              </div>
            )}
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.teachingAdminCurriculum}
              </div>
            )}
            {exp.jobType === 'administration' && exp.adminCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.adminCurriculum}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const renderWorkExposureMatrix = () => {
    if (!experienceData?.mysqlData) return null;
    const workTypes = [
      { key: 'Ed_Tech_Company', label: 'Ed.Tech companies' },
      { key: 'on_line', label: 'Online tutoring' },
      { key: 'coaching_tuitions_center', label: 'Coaching / Tuition Centers' },
      { key: 'group_tuitions', label: 'Group tutoring' },
      { key: 'private_tuitions', label: 'Private tutoring' },
      { key: 'home_tuitions', label: 'Home Tuitions' }
    ];
    const columns = getResponsiveColumnCount(3, 2, 1);
    const columnWidth = `calc(${100 / columns}% - ${columns > 1 ? '10px' : '0px'})`;
    const isWorkTypeEnabled = (key) => {
      if (!experienceData?.mysqlData) return false;
      const value = experienceData.mysqlData[key];
      return value === 1 || value === '1' || value === true || value === 'true' || value === 'yes' || value === 'Yes';
    };
    return (
      <div className="work-exposure" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h6 className="work-exposure-title" style={{ marginBottom: '15px', color: '#1967d2', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>Work Exposure</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {workTypes.map(type => (
            <div key={type.key} style={{ 
              flex: `0 0 ${columnWidth}`,
              backgroundColor: 'white', 
              borderRadius: '6px',
              padding: '10px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{type.label}</div>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isWorkTypeEnabled(type.key) ? '#e6f7ed' : '#fdf1f0',
                color: isWorkTypeEnabled(type.key) ? '#34a853' : '#ea4335'
              }}>
                {isWorkTypeEnabled(type.key) ? '✓' : '×'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLanguageProficiency = () => {
    if (!languages || languages.length === 0) return null;
    
    const speakLanguages = languages.filter(lang => lang.speak).map(lang => lang.language);
    const readLanguages = languages.filter(lang => lang.read).map(lang => lang.language);
    const writeLanguages = languages.filter(lang => lang.write).map(lang => lang.language);
    
    // Only show section if there are any languages
    if (!speakLanguages.length && !readLanguages.length && !writeLanguages.length) return null;

    const displayLanguages = (languageArray) => {
      return languageArray.length > 0 
        ? languageArray.join(', ').toLowerCase()
        : 'none';
    };

    return (
      <div>
        <div style={{ 
          borderBottom: '1px solid #ccc',
          marginBottom: '10px'
        }}></div>
        <div>
          <div style={{ 
            display: 'flex',
            marginBottom: '4px',
            alignItems: 'center'
          }}>
            <span style={{ 
              width: '80px',
              color: '#202124'
            }}>Speak</span>
            <span style={{ 
              flex: 1,
              paddingLeft: '20px',
              color: '#333'
            }}>{displayLanguages(speakLanguages)}</span>
          </div>
          <div style={{ 
            display: 'flex',
            marginBottom: '4px',
            alignItems: 'center'
          }}>
            <span style={{ 
              width: '80px',
              color: '#202124'
            }}>Read</span>
            <span style={{ 
              flex: 1,
              paddingLeft: '20px',
              color: '#333'
            }}>{displayLanguages(readLanguages)}</span>
          </div>
          <div style={{ 
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ 
              width: '80px',
              color: '#202124'
            }}>Write</span>
            <span style={{ 
              flex: 1,
              paddingLeft: '20px',
              color: '#333'
            }}>{displayLanguages(writeLanguages)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAdditionalInfo = () => {
    // Check if there's any actual data to display
    const hasData = [
      additionalInfo1?.religion,
      additionalInfo1?.marital_status,
      additionalInfo1?.computer_skills,
      additionalInfo1?.accounting_knowledge,
      additionalInfo1?.citizenship,
      additionalInfo1?.differently_abled,
      additionalInfo1?.certifications,
      additionalInfo1?.accomplishments,
      additionalInfo1?.projects,
      additionalInfo1?.research_publications,
      additionalInfo1?.additional_info
    ].some(value => value !== undefined && value !== null && value !== '');

    if (!hasData) return null;

    const InfoItem = ({ label, value }) => {
      if (!value) return null;
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: windowWidth <= 576 ? 'column' : 'row',
          marginBottom: '8px'
        }}>
          <span style={{ 
            width: windowWidth <= 576 ? '100%' : '170px', 
            fontWeight: 'bold',
            marginBottom: windowWidth <= 576 ? '4px' : '0',
            color: '#333'
          }}>
            {label}
          </span>
          <span style={{ 
            display: 'flex',
            flex: 1,
            paddingLeft: windowWidth <= 576 ? '0' : '8px'
          }}>
            {windowWidth > 576 ? ': ' : ''}{value}
          </span>
        </div>
      );
    };

    const formatComputerSkills = () => {
      let skills = additionalInfo1?.computer_skills;
      if (!skills) return '';
      if (typeof skills === 'string') {
        try {
          const parsed = JSON.parse(skills);
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
          return skills;
        } catch (e) {
          return skills;
        }
      }
      if (Array.isArray(skills)) {
        return skills.join(', ');
      }
      return skills || '';
    };

    return (
      <div className="additional-information" style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        backgroundColor: '#f9f9f9', 
        borderRadius: '8px'
      }}>
        <h6 className="info-title" style={{ 
          marginBottom: '15px', 
          color: '#1967d2', 
          borderBottom: '1px solid #ddd', 
          paddingBottom: '8px' 
        }}>
          Additional Information
        </h6>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '10px'
        }}>
          <div style={{ 
            flex: '1 1 300px',
            minWidth: windowWidth <= 768 ? '100%' : '0'
          }}>
            {additionalInfo1?.religion && (
              <InfoItem label="Religion" value={additionalInfo1.religion} />
            )}
            {additionalInfo1?.marital_status && (
              <InfoItem label="Marital Status" value={additionalInfo1.marital_status} />
            )}
            {additionalInfo1?.computer_skills && (
              <InfoItem label="Computer skills" value={formatComputerSkills()} />
            )}
            {additionalInfo1?.accounting_knowledge !== undefined && (
              <InfoItem 
                label="Accounting Knowledge" 
                value={isPositiveValue(additionalInfo1.accounting_knowledge) ? 'Yes' : 'No'} 
              />
            )}
          </div>
          <div style={{ 
            flex: '1 1 300px',
            minWidth: windowWidth <= 768 ? '100%' : '0'
          }}>
            {additionalInfo1?.citizenship && (
              <InfoItem label="Citizenship" value={additionalInfo1.citizenship} />
            )}
            {additionalInfo1?.differently_abled && (
              <InfoItem label="Differently abled" value={additionalInfo1.differently_abled} />
            )}
            {additionalInfo1?.certifications && (
              <InfoItem label="Certifications" value={additionalInfo1.certifications} />
            )}
            {additionalInfo1?.accomplishments && (
              <InfoItem label="Accomplishments" value={additionalInfo1.accomplishments} />
            )}
          </div>
        </div>
        <div style={{ marginTop: windowWidth <= 768 ? '5px' : '15px' }}>
          {additionalInfo1?.projects && (
            <InfoItem label="Projects" value={additionalInfo1.projects} />
          )}
          {additionalInfo1?.research_publications && (
            <InfoItem label="Research publications" value={additionalInfo1.research_publications} />
          )}
          {additionalInfo1?.additional_info && (
            <InfoItem label="Anything more about yourself" value={additionalInfo1.additional_info} />
          )}
        </div>
      </div>
    );
  };

  // Get the most recent designation from experience entries
  const getCurrentDesignation = () => {
    if (!experienceData?.dynamoData?.experienceEntries || 
        experienceData.dynamoData.experienceEntries.length === 0) {
      return null;
    }
    const currentJob = experienceData.dynamoData.experienceEntries.find(
      exp => exp.currentlyWorking === true
    );
    const mostRecentJob = currentJob || experienceData.dynamoData.experienceEntries[0];
    if (!mostRecentJob) return null;
    return mostRecentJob.jobType === 'teaching' ? mostRecentJob.teachingDesignation :
           mostRecentJob.jobType === 'administration' ? mostRecentJob.adminDesignation :
           mostRecentJob.designation;
  };

  // Get highest education qualification
  const getHighestEducation = () => {
    if (!educationData || educationData.length === 0) return null;
    const educationHierarchy = [
      'grade10', 'grade12', 'certificate', 'bEd', 'dEd', 'nttMtt', 'degree', 'masterDegree', 'doctorate'
    ];
    let highestEducation = educationData[0];
    educationData.forEach(education => {
      const currentRank = educationHierarchy.indexOf(education.education_type);
      const highestRank = educationHierarchy.indexOf(highestEducation.education_type);
      if (currentRank > highestRank) {
        highestEducation = education;
      }
    });
    let educationText = getEducationTypeTitle(highestEducation.education_type);
    if (highestEducation.courseName) {
      educationText += ` in ${highestEducation.courseName}`;
    } else if (highestEducation.specialization) {
      educationText += ` in ${highestEducation.specialization}`;
    }
    return educationText;
  };

  // Helper function to check if job preferences have meaningful data
  const hasJobPreferencesData = () => {
    if (!jobPreferenceData) {
      return false;
    }
    
    // Check basic fields
    const basicFields = ['Job_Type', 'expected_salary', 'notice_period', 'preferred_country', 'preferred_state', 'preferred_city'];
    const hasBasicData = basicFields.some(field => 
      jobPreferenceData[field] && 
      jobPreferenceData[field] !== '' && 
      jobPreferenceData[field] !== null &&
      jobPreferenceData[field] !== undefined
    );
    
    // Check conditional fields based on job type
    const jobType = jobPreferenceData.Job_Type;
    let hasConditionalData = false;
    
    if (jobType === 'teaching') {
      const teachingFields = ['teaching_designations', 'teaching_curriculum', 'teaching_subjects', 'teaching_grades', 'teaching_coreExpertise'];
      hasConditionalData = teachingFields.some(field => {
        const value = jobPreferenceData[field];
        return value && value !== '' && value !== null && value !== undefined && 
               (Array.isArray(value) ? value.length > 0 : true);
      });
    } else if (jobType === 'administration') {
      const adminFields = ['administrative_designations', 'administrative_curriculum'];
      hasConditionalData = adminFields.some(field => {
        const value = jobPreferenceData[field];
        return value && value !== '' && value !== null && value !== undefined && 
               (Array.isArray(value) ? value.length > 0 : true);
      });
    } else if (jobType === 'teachingAndAdmin') {
      const teachingAdminFields = ['teaching_administrative_designations', 'teaching_administrative_curriculum', 'teaching_administrative_subjects', 'teaching_administrative_grades', 'teaching_administrative_coreExpertise'];
      hasConditionalData = teachingAdminFields.some(field => {
        const value = jobPreferenceData[field];
        return value && value !== '' && value !== null && value !== undefined && 
               (Array.isArray(value) ? value.length > 0 : true);
      });
    }
    
    return hasBasicData || hasConditionalData;
  };

  const currentDesignation = getCurrentDesignation();
  const highestEducation = getHighestEducation();

  // ----- MAIN JSX -----
  return (
    <div className="cv-container">
      {/* Unlock Modal */}
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
      {/* Profile counter for navigation between multiple profiles */}
      {checkedProfiles && checkedProfiles.candidates?.length > 1 && (
        <div className="profile-counter">
          Profile {checkedProfiles.currentIndex + 1} of {checkedProfiles.candidates.length}
        </div>
      )}
      {/* Navigation */}
      <div className="profile-actions">
        {/* SHOW Unlock button only if not unlocked */}
        {!isUnlocked && (
          <button 
            className="unlock-btn-top"
            onClick={handleUnlockClick}
            disabled={isUnlocked}
          >
            <span role="img" aria-label="coin" className="coin-icon">💰</span>
            Unlock Details
          </button>
        )}
        <div className="back-button">
          <button onClick={handleBack} className="btn btn-warning">
            Back to List
          </button>
          {/* Navigation buttons for multiple profiles */}
          {(onNext || onPrevious) && (
            <div className="navigation-buttons" style={{ marginLeft: '10px', display: 'inline-flex', gap: '10px' }}>
              {onPrevious && !isFirstProfile && (
                <button onClick={onPrevious} className="btn btn-outline-secondary">
                  <i className="fas fa-chevron-left me-1"></i>Previous
                </button>
              )}
              {onNext && !isLastProfile && (
                <button onClick={onNext} className="btn btn-outline-secondary">
                  Next<i className="fas fa-chevron-right ms-1"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header Section with Photo and Basic Info */}
      <div className="cv-header">
        <div className="cv-profile-photo">
          <AvatarImage
            src={photoUrl}
            alt={`${profileData?.fullName || 'User'}'s profile photo`}
            name={profileData?.fullName}
            gender={profileData?.gender}
          />
        </div>
        {/* Header Content */}
        <div className="header-content" style={{ flex: 1, paddingLeft: '20px' }}>
          <h1 className="candidate-name">{profileData?.fullName || 'Candidate Name'}</h1>
          <div className="personal-meta" style={{ marginBottom: '8px' }}>
          {profileData?.gender && <span>{profileData.gender}</span>}
            {profileData?.dateOfBirth && (
              <span style={{ marginLeft: '15px' }}>
                DOB: {new Date(profileData.dateOfBirth).toLocaleDateString('en-US', { 
                  day: '2-digit', month: '2-digit', year: 'numeric' 
                })}
              </span>
            )}
            {profileData?.email && (
              <div className="email-link" style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <FaEnvelope style={{ marginRight: '5px', color: '#A9A9A9' }} />
                <BlurWrapper isUnlocked={isUnlocked}>
                  <a href={isUnlocked ? `mailto:${profileData.email}` : undefined} style={{ pointerEvents: isUnlocked ? 'auto' : 'none', color: "#1766af" }}>
                    {profileData.email}
                  </a>
                </BlurWrapper>
              </div>
            )}
          </div>
          {/* Contact Information - Optimized Layout */}
          <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr', gap: '15px', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}>

            {/* Left Column - Addresses */}
            <div className="address-column">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <FaMapMarkerAlt style={{ marginRight: '8px', color: '#e74c3c', fontSize: '16px' }} /> 
                <span><strong>Present:</strong> {profileData.present_state_name || 'N/A'}</span>
              </div>
              {profileData.permanent_state_name && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaMapMarkerAlt style={{ marginRight: '8px', color: '#95a5a6', fontSize: '16px' }} />
                  <span><strong>Permanent:</strong> {profileData.permanent_state_name}</span>
                </div>
              )}
            </div>
            {/* Right Column - Phone Numbers */}
            <div className="phone-column">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <FaPhone style={{ marginRight: '8px', color: '#1a73e8', fontSize: '16px' }} />
  <span>
    <strong>Phone:</strong>{" "}
    <BlurWrapper isUnlocked={isUnlocked}>
  {isUnlocked
    ? profileData?.callingNumber || "N/A"
    : profileData?.callingNumber
      ? <span style={{ letterSpacing: "1px" }}>{profileData.callingNumber.replace(/\d/g, "•")}</span>
      : "N/A"
  }
</BlurWrapper>
  </span>
</div>

  <div style={{ display: 'flex', alignItems: 'center' }}>
    <FaWhatsapp style={{ marginRight: '8px', color: '#25D366', fontSize: '16px' }} />
    <span>
    <strong>WhatsApp:</strong>{" "}
    <BlurWrapper isUnlocked={isUnlocked}>
      {isUnlocked
        ? profileData?.whatsappNumber || "N/A"
        : profileData?.whatsappNumber
          ? <span style={{ letterSpacing: "1px" }}>{profileData.whatsappNumber.replace(/\d/g, "•")}</span>
          : "N/A"
      }
    </BlurWrapper>
  </span>
  </div>
</div>

          </div>
          {/* Additional Info Row */}
          {(profileData.aadharNumber || profileData.panNumber) && (
            <div className="additional-info" style={{ 
              marginTop: '10px',
              display: 'grid',
              gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              {profileData.aadharNumber && (
                <div><strong>Aadhar:</strong> {profileData.aadharNumber}</div>
              )}
              {profileData.panNumber && (
                <div><strong>PAN:</strong> {profileData.panNumber}</div>
              )}
            </div>
          )}
          {/* Social Links Row */}
          {(socialLinks.facebook || socialLinks.linkedin) && (
            <div className="social-links" style={{ 
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: '#666',
                marginRight: '4px'
              }}>Social Links:</span>
              <div style={{ 
                display: 'flex', 
                gap: '16px',
                flexWrap: 'wrap',
                flex: 1
              }}>
              {socialLinks?.facebook && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <FaFacebook style={{ marginRight: '7px', color: '#1877f2', fontSize: '16px' }} />
                  <BlurWrapper isUnlocked={isUnlocked}>
                    <a href={isUnlocked ? socialLinks.facebook : undefined} style={{ pointerEvents: isUnlocked ? 'auto' : 'none', color: "#1877f2" }}>
                      {socialLinks.facebook}
                    </a>
                  </BlurWrapper>
                </div>
              )}
              {socialLinks?.linkedin && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaLinkedin style={{ marginRight: '7px', color: '#0077b5', fontSize: '16px' }} />
                  <BlurWrapper isUnlocked={isUnlocked}>
                    <a href={isUnlocked ? socialLinks.linkedin : undefined} style={{ pointerEvents: isUnlocked ? 'auto' : 'none', color: "#0077b5" }}>
                      {socialLinks.linkedin}
                    </a>
                  </BlurWrapper>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Candidate Materials Icons - Only show when unlocked */}
          {isUnlocked && (
            <div className="candidate-materials-icons" style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: '#666',
                marginRight: '4px'
              }}>Demo & Resume:</span>
              
              {/* Demo Video Icon */}
              <button 
                onClick={handleViewVideo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                title="View Demo Video"
              >
                <span role="img" aria-label="video">🎥</span>
                Video
              </button>
              
              {/* Resume Icon */}
              <button 
                onClick={handleViewResume}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e7e34'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                title="View Resume/CV"
              >
                <span role="img" aria-label="resume">📄</span>
                Resume
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body Section - Two column layout */}
      <div className="cv-body" style={{ marginTop: '0' }}>
        {/* Left Sidebar */}
        <div className="cv-sidebar">
          {/* Education Section */}
          {educationData && educationData.length > 0 && (
            <div className="cv-section education-section">
              <h2 className="section-title">Education</h2>
              <div className="education-content">
                {renderEducationBlocks()}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className="cv-main">
          {/* Experience Section */}
          <div className="cv-section experience-section" style={{ marginTop: '0', paddingTop: '0' }}>
            <h2 className="section-title" style={{ marginTop: '0' }}>Work Experience</h2>
            <div className="experience-content">
              {getExperienceText()}
              {renderExperienceBlocks()}
            </div>
          </div>

          {/* Work Exposure Matrix */}
          {renderWorkExposureMatrix()}

          {/* Job Preferences Section */}
          {hasJobPreferencesData() && (
            <div className="cv-section job-preferences">
              <h2 className="section-title">Job Preferences</h2>
              <div className="job-preferences-block" style={{ 
                marginBottom: '25px',
                padding: '20px',
                background: '#f5f7fc',
                borderRadius: '8px',
                fontSize: '15px',
                lineHeight: '1.5'
              }}>
                {/* Two-column details grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
                  columnGap: '20px',
                  rowGap: '5px'
                }}>
                  {/* Basic Job Information */}
                  {jobPreferenceData.Job_Type && (
                    <div>
                      <strong>Job Type:</strong> {
                        jobPreferenceData.Job_Type === 'teaching' ? 'Education - Teaching' :
                        jobPreferenceData.Job_Type === 'administration' ? 'Education - Administration' :
                        jobPreferenceData.Job_Type === 'teachingAndAdmin' ? 'Education - Teaching + Administration' :
                        jobPreferenceData.Job_Type
                      }
                    </div>
                  )}
                  
                  {jobPreferenceData.expected_salary && (
                    <div><strong>Expected Salary:</strong> {jobPreferenceData.expected_salary}</div>
                  )}
                  
                  {jobPreferenceData.notice_period && (
                    <div><strong>Notice Period:</strong> {jobPreferenceData.notice_period}</div>
                  )}

                  {/* Conditional Data Based on Job Type */}
                  {jobPreferenceData.Job_Type === 'teaching' && (
                    <>
                      {jobPreferenceData.teaching_designations && Array.isArray(jobPreferenceData.teaching_designations) && jobPreferenceData.teaching_designations.length > 0 && (
                        <div>
                          <strong>Teaching Designations:</strong> {jobPreferenceData.teaching_designations.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_curriculum && Array.isArray(jobPreferenceData.teaching_curriculum) && jobPreferenceData.teaching_curriculum.length > 0 && (
                        <div>
                          <strong>Teaching Curriculum:</strong> {jobPreferenceData.teaching_curriculum.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_subjects && Array.isArray(jobPreferenceData.teaching_subjects) && jobPreferenceData.teaching_subjects.length > 0 && (
                        <div>
                          <strong>Teaching Subjects:</strong> {jobPreferenceData.teaching_subjects.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_grades && Array.isArray(jobPreferenceData.teaching_grades) && jobPreferenceData.teaching_grades.length > 0 && (
                        <div>
                          <strong>Teaching Grades:</strong> {jobPreferenceData.teaching_grades.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_coreExpertise && Array.isArray(jobPreferenceData.teaching_coreExpertise) && jobPreferenceData.teaching_coreExpertise.length > 0 && (
                        <div>
                          <strong>Core Expertise:</strong> {jobPreferenceData.teaching_coreExpertise.join(', ')}
                        </div>
                      )}
                    </>
                  )}

                  {jobPreferenceData.Job_Type === 'administration' && (
                    <>
                      {jobPreferenceData.administrative_designations && Array.isArray(jobPreferenceData.administrative_designations) && jobPreferenceData.administrative_designations.length > 0 && (
                        <div>
                          <strong>Administrative Designations:</strong> {jobPreferenceData.administrative_designations.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.administrative_curriculum && Array.isArray(jobPreferenceData.administrative_curriculum) && jobPreferenceData.administrative_curriculum.length > 0 && (
                        <div>
                          <strong>Administrative Curriculum:</strong> {jobPreferenceData.administrative_curriculum.join(', ')}
                        </div>
                      )}
                    </>
                  )}

                  {jobPreferenceData.Job_Type === 'teachingAndAdmin' && (
                    <>
                      {jobPreferenceData.teaching_administrative_designations && Array.isArray(jobPreferenceData.teaching_administrative_designations) && jobPreferenceData.teaching_administrative_designations.length > 0 && (
                        <div>
                          <strong>Teaching + Admin Designations:</strong> {jobPreferenceData.teaching_administrative_designations.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_administrative_curriculum && Array.isArray(jobPreferenceData.teaching_administrative_curriculum) && jobPreferenceData.teaching_administrative_curriculum.length > 0 && (
                        <div>
                          <strong>Teaching + Admin Curriculum:</strong> {jobPreferenceData.teaching_administrative_curriculum.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_administrative_subjects && Array.isArray(jobPreferenceData.teaching_administrative_subjects) && jobPreferenceData.teaching_administrative_subjects.length > 0 && (
                        <div>
                          <strong>Teaching + Admin Subjects:</strong> {jobPreferenceData.teaching_administrative_subjects.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_administrative_grades && Array.isArray(jobPreferenceData.teaching_administrative_grades) && jobPreferenceData.teaching_administrative_grades.length > 0 && (
                        <div>
                          <strong>Teaching + Admin Grades:</strong> {jobPreferenceData.teaching_administrative_grades.join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_administrative_coreExpertise && Array.isArray(jobPreferenceData.teaching_administrative_coreExpertise) && jobPreferenceData.teaching_administrative_coreExpertise.length > 0 && (
                        <div>
                          <strong>Teaching + Admin Core Expertise:</strong> {jobPreferenceData.teaching_administrative_coreExpertise.join(', ')}
                        </div>
                      )}
                    </>
                  )}

                  {/* Location Preferences */}
                  {(jobPreferenceData.preferred_country || jobPreferenceData.preferred_state || jobPreferenceData.preferred_city) && (
                    <div>
                      <strong>Preferred Locations:</strong> {
                        [
                          jobPreferenceData.preferred_country && `Country: ${jobPreferenceData.preferred_country}`,
                          jobPreferenceData.preferred_state && `State: ${jobPreferenceData.preferred_state}`,
                          jobPreferenceData.preferred_city && `City: ${jobPreferenceData.preferred_city}`
                        ].filter(Boolean).join(' | ')
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Language Proficiency */}
          {languages && languages.length > 0 && (
            <div className="cv-section">
              <h2 className="section-title">Language Proficiency</h2>
              <div style={{ padding: '15px' }}>
                {renderLanguageProficiency()}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {additionalInfo1 && (
            <div className="cv-section">
              <h2 className="section-title">Additional Information</h2>
              <div style={{ padding: '15px' }}>
                {renderAdditionalInfo()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download and Print Section */}
      <div className="download-section">
        <button 
          onClick={downloadPDF} 
          disabled={isDownloading}
          className="btn btn-primary"
          title={isDownloading ? "Generating PDF..." : "Download CV as PDF file"}
        >
          {isDownloading ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Generating PDF...
            </>
          ) : (
            <>
              <i className="fas fa-download"></i>
              Download PDF
            </>
          )}
        </button>
        
        <button 
          onClick={handlePrint}
          className="btn btn-outline-secondary"
          title="Open browser print dialog"
        >
          <i className="fas fa-print"></i>
          Print
        </button>
      </div>
    </div>
  );
}

export default React.memo(CandidateDetail);
