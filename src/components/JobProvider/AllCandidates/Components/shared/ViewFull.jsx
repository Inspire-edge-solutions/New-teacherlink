import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/cv-pdf-print.css';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { cleanContentForPrint, generatePrintHTML, generatePDF } from '../utils/printPdfUtils.jsx';
import { useAuth } from "../../../../../Context/AuthContext";
import { decodeCandidateData } from '../../../../../utils/dataDecoder';
import CandidateApiService from './CandidateApiService';

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
const UNLOCK_INFO_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/unlock_details';

// -- Unlock Modal Component with Portal-based display
function UnlockModal({ isOpen, onClose, userId, onUnlock, coinValue, loading, unlockStatus, error }) {
  // Simple coin icon for animation
  

  if (!isOpen) return null;

  // Portal modal content
  const modalContent = (
    <div className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all" onClick={onClose}>
          &times;
        </button>
        
        {unlockStatus === "success" ? (
          <>
            <div className="flex items-center justify-center my-5 animate-coinDrop">
              <span role="img" aria-label="coin">🪙</span>
              <span className="text-[#f7b901] font-bold text-xl ml-1.5">-50</span>
            </div>
            <div className="text-[#2e7d32] text-xl font-semibold text-center my-4">Unlocked! <span role="img" aria-label="unlocked">🔓</span></div>
            <div className="text-gray-500 text-sm text-center">Details unlocked successfully.</div>
          </>
        ) : unlockStatus === "error" ? (
          <>
            <div className="flex items-center justify-center my-5 opacity-85 grayscale">
              <span role="img" aria-label="coin">🪙</span>
              <span className="text-[#d72660] font-bold text-xl ml-1.5">×</span>
            </div>
            <div className="text-[#d32f2f] text-base font-medium text-center my-4">{error || "Could not unlock details."}</div>
          </>
        ) : (
          <>
            <div className="mb-4 mt-0.5">
              <span className="font-semibold text-[17px]">Unlock candidate details?</span>
            </div>
            <div className="text-gray-500 text-[15px] mb-1.5 text-center">
              Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
            </div>
            <div className="text-gray-800 text-[15px] mb-2.5 text-center">
              <span>Use <b>50 Coins</b> to view email, phone, WhatsApp, and social details.</span>
            </div>
            
            <div className="text-red-600 text-[15px] mb-4 text-center">
              <i>Unlocked details remain visible for <b>30 days.</b></i>
            </div>
            <button 
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg hover:opacity-90 hover:shadow-xl active:opacity-100 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none w-full justify-center mb-1.5"
              disabled={loading}
              onClick={onUnlock}
            >
              {loading ? "Unlocking..." : <>Unlock <span className="inline-flex items-center justify-center animate-bounce"><span role="img" aria-label="coin">🪙</span></span> 50</>}
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
  return isUnlocked ? children : <span className="blur-sm select-none cursor-not-allowed relative after:content-['🔒'] after:absolute after:-right-6 after:top-1/2 after:-translate-y-1/2 after:text-sm">{children}</span>;
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

function CandidateDetail({ candidate, onBack }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
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
  const [unlockedInfo, setUnlockedInfo] = useState(null);
    
  
  
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
        
        // Fetch unlock info if already unlocked
        if (isUnlocked) {
          try {
            const unlockInfoResponse = await axios.post(UNLOCK_INFO_API, {
              firebase_uid: candidate.firebase_uid
            });
            if (unlockInfoResponse.status === 200 && unlockInfoResponse.data.length > 0) {
              setUnlockedInfo(unlockInfoResponse.data[0]);
            }
          } catch (unlockError) {
            console.error("Error fetching unlock info:", unlockError);
          }
        }
        
        setShowUnlock(true);
      } catch (e) {
      const errorMsg = 'Could not check coins. Please try again.';
      setUnlockError(errorMsg);
      toast.error(errorMsg);
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
  }, [userId, candidateId, isUnlocked]);

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
      let msg = "Failed to unlock candidate details.";
      if (e?.response?.status === 500) {
        msg = "Server error. Please try again later.";
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
  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;


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

      // 2. Subtract 50 coins via PUT
      const redeemResponse = await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - 50
      });

      if (redeemResponse.status !== 200) {
        throw new Error("Failed to deduct coins");
      }

      // 3. Mark candidate as unlocked in database FIRST (so it appears in unlocked list)
      try {
        await CandidateApiService.upsertCandidateAction(candidate, user, { unlocked_candidate: 1 });
      } catch (dbError) {
        console.error("Error updating unlock status in database:", dbError);
        // Still continue - we'll try again, but don't fail the whole unlock
      }

      // 4. Call unlock info API after successful unlock and database update
      try {
        const unlockInfoResponse = await axios.post(UNLOCK_INFO_API, {
          firebase_uid: candidate.firebase_uid
        });
        if (unlockInfoResponse.status === 200 && unlockInfoResponse.data.length > 0) {
          setUnlockedInfo(unlockInfoResponse.data[0]);
        }
      } catch (unlockError) {
        console.error("Error fetching unlock info:", unlockError);
      }

      // 5. Get organization ID for the current user
      let orgId = null;
      try {
        const orgResponse = await axios.get(`${ORGANISATION_API}?firebase_uid=${encodeURIComponent(userId)}`);
        if (orgResponse.status === 200 && Array.isArray(orgResponse.data) && orgResponse.data.length > 0) {
          orgId = orgResponse.data[0].id;
        }
      } catch (orgError) {
        console.error("Error fetching organization data:", orgError);
      }

      // 6. Record coin history with unblocked_candidate_id and unblocked_candidate_name from /personal
      let unblocked_candidate_id = null;
      let unblocked_candidate_name = null;
      try {
        const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: candidate.firebase_uid } });
        if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
          unblocked_candidate_id = personalRes.data[0].id;
          unblocked_candidate_name = personalRes.data[0].fullName;
        }
      } catch (personalError) {}
      try {
        await axios.post(COIN_HISTORY_API, {
          firebase_uid: userId,
          candidate_id: orgId,
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
      candidate?.fullName || candidate?.name || 'Candidate',
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
      
      const params = { firebase_uid: candidate.firebase_uid, action: "view" };
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
        params: { firebase_uid: candidate.firebase_uid }
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
        const candidateEducation = response.data.filter(edu => edu.firebase_uid === candidate.firebase_uid);
        setEducationData(candidateEducation);
      }
    } catch (err) {}
  }, [candidate]);

  const fetchProfileData = useCallback(async () => {
    if (!candidate?.firebase_uid) return;
    setIsLoading(true);
    try {
      const response = await axios.post(FULL_API, {
        firebase_uid: candidate.firebase_uid
      });
      
      // Decode the data before setting it
      if (Array.isArray(response.data)) {
        // Find the matching candidate record from array
        const candidateRecord = response.data.find(r => r.firebase_uid === candidate.firebase_uid) || response.data[0];
        const decodedData = decodeCandidateData(candidateRecord);
        setProfileData(decodedData);
      } else {
        const decodedData = decodeCandidateData(response.data);
        setProfileData(decodedData);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err.response?.data || err.message);
      toast.error('Unable to load candidate profile. Please try again.');
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
          ? mysqlData.find(exp => exp.firebase_uid === candidate.firebase_uid) 
          : null;
        let candidateDynamoData = null;
        if (Array.isArray(dynamoData)) {
          candidateDynamoData = dynamoData.find(exp => exp.firebase_uid === candidate.firebase_uid);
        } else if (dynamoData && typeof dynamoData === 'object') {
          if (dynamoData.firebase_uid === candidate.firebase_uid) {
            candidateDynamoData = dynamoData;
          }
        }
        
        setExperienceData({
          mysqlData: candidateMysqlData || {
          teaching_experience_years: 0,
          teaching_experience_months: 0,
          non_teaching_experience_years: 0,
          non_teaching_experience_months: 0,
          total_experience_years: 0,
          total_experience_months: 0
          },
          dynamoData: candidateDynamoData || { experienceEntries: [] }
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
        const candidatePreference = response.data.find(pref => pref.firebase_uid === candidate.firebase_uid);
        setJobPreferenceData(candidatePreference);
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
        const candidateInfo1 = response1.data.find(info => info.firebase_uid === candidate.firebase_uid);
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

      const params = { firebase_uid: candidate.firebase_uid, action: "view" };
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

      const params = { firebase_uid: candidate.firebase_uid, action: "view" };
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
  }, [candidate?.firebase_uid]); // Only depend on the ID, not the entire candidate object or callbacks
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
        <div className={`${isMobile ? 'mb-3' : 'mb-5'} p-4 bg-[#f5f7fc] rounded-lg`} key={index}>
          <div className="text-base text-[#202124] mb-2.5 font-semibold">{educationType}</div>
          <div>
            {details.map((detail, i) => (
              <div key={i} className="my-1.5 text-gray-600 text-sm">{detail}</div>
            ))}
            <div className="text-sm text-gray-500 mt-1">
              {additionalInfo.join(' | ')}
            </div>
            {education.coreSubjects && (
              <div className="mt-2 text-sm">
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
        <div className="mb-4 p-2.5 border-b border-gray-200">
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
      <div className="mb-4 p-2.5 border-b border-gray-200">
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
        <div className="p-4 text-center text-gray-600 bg-gray-50 rounded-lg mb-5">
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
        <div key={index} className="mb-6 text-base leading-relaxed">
          <div className="flex justify-between font-bold mb-1">
            <div className="text-base">{exp.organizationName}</div>
            <div>
              {dateRange}
              <span className="font-normal text-gray-600">{durationText}</span>
            </div>
          </div>
          <div className="mb-1.5 text-gray-600">{location}</div>
          <div className="mb-1.5">
            {jobTypeText.join(' | ')}
          </div>
          <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-x-0 gap-y-1' : isTablet ? 'gap-x-3 gap-y-1.5' : 'gap-x-5 gap-y-1.5'}`}>
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
    const isMobile = windowWidth <= 768;
    const isTablet = windowWidth > 768 && windowWidth <= 1024;
    return (
      <div className={`${isMobile ? 'mb-6 p-3' : isTablet ? 'mb-7 p-3.5' : 'mb-8 p-4'} bg-gray-50 rounded-lg`}>
        <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>WORK EXPOSURE</h2>
        <div className={`flex flex-wrap ${isMobile ? 'gap-2' : isTablet ? 'gap-2.5' : 'gap-2.5'}`}>
          {workTypes.map(type => (
            <div key={type.key} style={{ flex: `0 0 ${columnWidth}` }} className={`bg-white rounded-md ${isMobile ? 'p-2' : isTablet ? 'p-2.5' : 'p-2.5'} shadow-sm flex justify-between items-center`}>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{type.label}</div>
              <div className={`${isMobile ? 'w-5 h-5 text-xs' : 'w-6 h-6'} rounded-full flex items-center justify-center ${isWorkTypeEnabled(type.key) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
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

    const LanguageItem = ({ label, languages }) => {
      const isMobile = windowWidth <= 768;
      return (
        <div className={`language-item flex ${isMobile ? 'mb-2 py-1' : 'mb-1.5 py-1'} flex-row items-start flex-wrap`}>
          <span className={`font-semibold mr-2 text-gray-800 ${isMobile ? 'text-base' : 'text-[16px]'} min-w-fit`}>
            {label}:
          </span>
          <span className={`${isMobile ? 'text-base' : 'text-[16px]'} leading-[1.5] flex-1 text-gray-700 font-medium`}>
            {languages.length > 0 ? languages.join(', ') : <span className="text-gray-500 italic font-normal">None</span>}
          </span>
        </div>
      );
    };

    return (
      <div>
        <LanguageItem label="Speak" languages={speakLanguages} />
        <LanguageItem label="Read" languages={readLanguages} />
        <LanguageItem label="Write" languages={writeLanguages} />
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
        <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
          <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold ${isMobile ? 'text-[13px]' : 'text-sm'} text-gray-800 shrink-0`}>
            {label}:
          </span>
          <span className={`${isMobile ? 'text-[13px]' : 'text-sm'} leading-[1.4] ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600`}>
            {value}
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
      <>
        {/* Optimized grid layout for better space utilization */}
        <div className={`${isMobile ? 'block' : 'grid'} ${isMobile ? '' : isTablet ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${isMobile ? 'gap-0' : isTablet ? 'gap-x-3 gap-y-0' : 'gap-x-4 gap-y-0'}`}>
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
        
        {/* Full width items for longer content */}
        <div className={`${isMobile ? 'mt-2' : 'mt-[5px]'} w-full`}>
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
      </>
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
    <div className={`${isMobile ? 'max-w-full' : isTablet ? 'max-w-[1000px]' : 'max-w-[1200px]'} mx-auto ${isMobile ? 'px-2 py-3' : isTablet ? 'p-5' : 'p-6 md:p-8'} bg-white shadow-md rounded-lg overflow-hidden font-sans text-gray-800 relative`}>
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
      {/* Navigation */}
      <div className={`flex flex-col sm:flex-row justify-between items-stretch sm:items-center ${isMobile ? 'mb-4' : 'mb-6'} w-full ${isMobile ? 'gap-2' : 'gap-4'} ${isMobile ? 'px-1' : 'px-2'}`}>
        {/* SHOW Unlock button only if not unlocked */}
        {!isUnlocked && (
          <button 
            className={`inline-flex items-center justify-center gap-2.5 ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3 text-base'} bg-gradient-brand text-white border-none rounded-lg font-semibold cursor-pointer transition-all duration-300 shadow-lg hover:opacity-90 hover:shadow-xl active:opacity-100 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${isMobile ? 'w-full sm:w-auto sm:min-w-[180px]' : 'w-[250px]'} flex-shrink-0`}
            onClick={handleUnlockClick}
            disabled={isUnlocked}
          >
            <span role="img" aria-label="coin" className="inline-flex items-center justify-center animate-bounce">💰</span>
            Unlock Details
          </button>
        )}
        <div className={`${isMobile ? 'w-full sm:w-auto sm:ml-auto' : 'ml-auto'} flex gap-2.5 items-center`}>
          <button onClick={handleBack} className={`w-full sm:w-auto ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-base'} bg-gradient-brand hover:opacity-90 text-white rounded-lg transition-all whitespace-nowrap font-medium`}>
            Back to List
          </button>
        </div>
      </div>

      {/* Header Section with Photo and Basic Info */}
      <div className={`${isMobile ? 'flex-col items-center text-center px-2 py-2' : isTablet ? 'flex flex-row items-start p-4' : 'flex flex-row items-start p-6'} bg-white border-b border-gray-200 mb-2.5`}>
        {/* Left Side: Profile Picture + Basic Info */}
        <div className={`flex ${isMobile ? 'flex-col' : ''} ${isMobile ? 'gap-3' : 'gap-5'} ${isMobile ? 'mb-2 items-center' : isTablet ? 'w-1/2 pr-3' : 'w-1/2 pr-4'}`}>
          {/* Profile Picture */}
          <div className={`profile-photo ${isMobile ? 'w-[100px] h-[100px] mb-2.5' : isTablet ? 'w-[110px] h-[110px]' : 'w-[120px] h-[120px]'} rounded-full overflow-hidden border-[3px] border-gray-100 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${isMobile ? 'm-0' : 'mr-2.5'} shrink-0`}>
            <AvatarImage
              src={photoUrl}
              alt={`${candidate?.fullName || candidate?.name || 'User'}'s profile photo`}
              name={candidate?.fullName || candidate?.name}
              gender={profileData?.gender || candidate?.gender}
              className="w-full h-full object-cover"
              style={{ 
                border: 'none',
                transform: 'scale(1.4) translateY(7%)',
                transformOrigin: 'center'
              }}
            />
          </div>
          
          {/* Basic Information */}
          <div className="flex-1">
            <h1 className={`candidate-name mb-1 ${isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl'} bg-gradient-brand bg-clip-text text-transparent`}>
              {candidate?.fullName || candidate?.name || 'Candidate Name'}
            </h1>
            
            {/* Personal Details */}
            <div className={`mb-0.5 ${isMobile ? 'text-sm' : isTablet ? 'text-[14px]' : 'text-[15px]'} text-gray-600`}>
              {profileData?.gender && <span>{profileData.gender}</span>}
              {profileData?.dateOfBirth && (
                <span> | Age: {new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()} Years</span>
              )}
              {experienceData?.mysqlData?.total_experience_years > 0 && (
                <span> | Experience: {experienceData.mysqlData.total_experience_years} Years {experienceData.mysqlData.total_experience_months || 0} Months</span>
              )}
            </div>
            
            {/* Email */}
            {(profileData?.email || unlockedInfo?.email) && (
              <div className={`flex items-center ${isMobile ? 'text-sm' : isTablet ? 'text-[14px]' : 'text-[15px]'}`}>
                <FaEnvelope className="mr-1.5 text-gray-400" />
                <BlurWrapper isUnlocked={isUnlocked}>
                  <a href={isUnlocked ? `mailto:${unlockedInfo?.email || profileData?.email}` : undefined} className={`no-underline text-[#1967d2] ${!isUnlocked ? 'pointer-events-none' : ''}`}>
                    {isUnlocked && unlockedInfo?.email ? unlockedInfo.email : (profileData?.email || 'N/A')}
                  </a>
                </BlurWrapper>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Contact Information */}
        <div className={`font-sans ${isMobile ? 'text-[13px] w-full' : 'text-sm w-1/2'} leading-[1.4] ${isMobile ? 'mt-2' : isTablet ? 'pl-3' : 'pl-4'}`}>
          {/* Address Information */}
          <div className={`flex ${isMobile ? 'flex-row' : 'flex-col'} ${isMobile ? 'gap-[15px]' : 'gap-1.5'} ${isMobile ? 'mb-1.5 flex-wrap' : 'mb-2'}`}>
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'}`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Present:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'}`}>
                {[
                  profileData?.present_city_name,
                  profileData?.present_state_name,
                  profileData?.present_country_name
                ].filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
            
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'}`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Permanent:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'}`}>
                {[
                  profileData?.permanent_city_name,
                  profileData?.permanent_state_name,
                  profileData?.permanent_country_name
                ].filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Phone Numbers - Responsive layout */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} ${isMobile ? 'gap-2' : isTablet ? 'gap-3' : 'gap-4'} ${isMobile ? 'mb-2' : 'mb-2'}`}>
            <div className="flex items-center flex-wrap gap-1.5">
              <FaPhone className="text-[#1a73e8] text-[13px] shrink-0" />
              <span className="font-semibold shrink-0">Phone:</span>
              <BlurWrapper isUnlocked={isUnlocked}>
                {isUnlocked
                  ? unlockedInfo?.phone_number || profileData?.callingNumber || "N/A"
                  : (unlockedInfo?.phone_number || profileData?.callingNumber)
                    ? <span className="tracking-wide break-all">{(unlockedInfo?.phone_number || profileData?.callingNumber).replace(/\d/g, "•")}</span>
                    : "N/A"
                }
              </BlurWrapper>
            </div>
             
            <div className="flex items-center flex-wrap gap-1.5">
              <FaWhatsapp className="text-[#25D366] text-[13px] shrink-0" />
              <span className="font-semibold shrink-0">WhatsApp:</span>
              <BlurWrapper isUnlocked={isUnlocked}>
                {isUnlocked
                  ? unlockedInfo?.whatsup_number || profileData?.whatsappNumber || "N/A"
                  : (unlockedInfo?.whatsup_number || profileData?.whatsappNumber)
                    ? <span className="tracking-wide break-all">{(unlockedInfo?.whatsup_number || profileData?.whatsappNumber).replace(/\d/g, "•")}</span>
                    : "N/A"
                }
              </BlurWrapper>
            </div>
          </div>
          
          {/* Social Links */}
          {(socialLinks.facebook || socialLinks.linkedin) && (
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-col gap-1.5'} items-start`}>
              {socialLinks?.facebook && (
                <div className="flex items-start flex-wrap gap-1.5">
                  <FaFacebook className="text-[#385898] text-[13px] shrink-0 mt-0.5" /> 
                  <span className="font-semibold shrink-0">Facebook:</span>
                  <BlurWrapper isUnlocked={isUnlocked}>
                    <a href={isUnlocked ? socialLinks.facebook : undefined} className={`no-underline text-[#385898] break-all ${!isUnlocked ? 'pointer-events-none' : ''}`}>
                      {socialLinks.facebook}
                    </a>
                  </BlurWrapper>
                </div>
              )}
              
              {socialLinks?.linkedin && (
                <div className="flex items-start flex-wrap gap-1.5">
                  <FaLinkedin className="text-[#0077b5] text-[13px] shrink-0 mt-0.5" /> 
                  <span className="font-semibold shrink-0">LinkedIn:</span>
                  <BlurWrapper isUnlocked={isUnlocked}>
                    <a href={isUnlocked ? socialLinks.linkedin : undefined} className={`no-underline text-[#0077b5] break-all ${!isUnlocked ? 'pointer-events-none' : ''}`}>
                      {socialLinks.linkedin}
                    </a>
                  </BlurWrapper>
                </div>
              )}
            </div>
          )}

          {/* Candidate Materials Icons - Only show when unlocked */}
          {isUnlocked && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-600 mr-1">Demo & Resume:</span>
              
              {/* Demo Video Icon */}
              <button 
                onClick={handleViewVideo}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-brand hover:opacity-90 text-white border-none rounded text-xs cursor-pointer transition-colors"
                title="View Demo Video"
              >
                <span role="img" aria-label="video">🎥</span>
                Video
              </button>
              
              {/* Resume Icon */}
              <button 
                onClick={handleViewResume}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white border-none rounded text-xs cursor-pointer transition-colors"
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
      <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[300px,1fr]'} ${isMobile ? 'gap-4' : isTablet ? 'gap-6' : 'gap-8'} mt-0`}>
        {/* Left Sidebar */}
        <div className={`bg-gray-100 ${isMobile ? 'px-2 py-3' : isTablet ? 'p-4' : 'p-5'} lg:w-auto`}>
          {/* Education Section */}
          {educationData && educationData.length > 0 && (
            <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
              <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>EDUCATION</h2>
              <div>
                {renderEducationBlocks()}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className={`${isMobile ? 'px-2 py-3' : isTablet ? 'p-4' : 'p-5'}`}>
          {/* Experience Section */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'} mt-0 pt-0`}>
            <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>WORK EXPERIENCE</h2>
            <div>
              {getExperienceText()}
              {renderExperienceBlocks()}
            </div>
          </div>

          {/* Work Exposure Matrix */}
          {renderWorkExposureMatrix()}

          {/* Job Preferences Section */}
          {hasJobPreferencesData() && (
            <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
              <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>JOB PREFERENCES</h2>
              <div className={`mb-6 ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-5'} bg-[#f5f7fc] rounded-lg ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                {/* Two-column details grid */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-x-0 gap-y-1' : isTablet ? 'gap-x-3 gap-y-1.5' : 'gap-x-5 gap-y-1.5'}`}>
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
            <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
              <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>LANGUAGE PROFICIENCY</h2>
              <div className={`${isMobile ? 'bg-white rounded-lg p-3 border border-gray-200' : 'bg-gray-50 rounded-lg p-3 border border-gray-200'}`}>
                {renderLanguageProficiency()}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {additionalInfo1 && (
            <div className={`mb-[30px] ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-[15px]'} bg-gray-50 rounded-lg border border-gray-200`}>
              <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold ${isMobile ? 'text-base' : 'text-lg'} bg-gradient-brand bg-clip-text text-transparent`}>
                ADDITIONAL INFORMATION
              </h2>
              {renderAdditionalInfo()}
            </div>
          )}
        </div>
      </div>

      {/* Download and Print Section */}
      <div className={`flex flex-col sm:flex-row justify-center ${isMobile ? 'gap-2' : 'gap-4'} ${isMobile ? 'mt-6 pt-4' : 'mt-10 pt-5'} border-t border-gray-200`}>
        <button 
          onClick={downloadPDF} 
          disabled={isDownloading}
          className={`inline-flex items-center justify-center gap-2 ${isMobile ? 'px-4 py-2.5 text-sm w-full sm:w-auto' : 'px-6 py-3 text-base'} ${isMobile ? 'sm:min-w-[160px]' : 'min-w-[200px]'} bg-gradient-brand hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
          className={`inline-flex items-center justify-center gap-2 ${isMobile ? 'px-4 py-2.5 text-sm w-full sm:w-auto' : 'px-6 py-3 text-base'} ${isMobile ? 'sm:min-w-[160px]' : 'min-w-[200px]'} bg-gradient-brand hover:opacity-90 text-white rounded-lg transition-all`}
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
