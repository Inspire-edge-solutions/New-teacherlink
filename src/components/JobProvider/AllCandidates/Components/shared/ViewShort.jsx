import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import '../styles/cv-style.css';
import '../styles/cv-pdf-print.css';
import '../styles/view.css';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  cleanContentForPrint, 
  generatePrintHTML,
  generatePDF
} from '../utils/printPdfUtils.jsx';
import { useAuth } from "../../../../../Context/AuthContext";

const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const COIN_HISTORY_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const UNLOCK_COST = 50;
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';

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

const ViewShort = ({
  candidate, onBack, onNext, onPrevious,
  isFirstProfile, isLastProfile, checkedProfiles
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Decode the candidate data to ensure we have real firebase_uid for API calls
  //const decodedCandidate = decodeCandidateData(candidate);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: [], dynamoData: [] });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDownloading, setIsDownloading] = useState(false);

  // Unlock logic state
  const userId = user?.firebase_uid || user?.uid;
  const candidateId = decodedCandidate?.firebase_uid;
  const unlockKey = `unlocked_${userId}_${candidateId}`;
  // Always compute initial unlock from localStorage
  const [isUnlocked, setIsUnlocked] = useState(() => localStorage.getItem(unlockKey) === '1');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState(""); // "success" | "error" | ""
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 30-day validity logic
  useEffect(() => {
    if (!userId || !candidateId) return setIsUnlocked(false);

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
  }, [userId, candidateId, unlockKey]);

  useEffect(() => {
    const checkUnlocked = async () => {
      try {
        const { data } = await axios.get(REDEEM_API);
        const found = Array.isArray(data) ? data.find(
          d => d.firebase_uid === userId
        ) : null;
        setCoinValue(found?.coin_value ?? null);
      } catch (e) {
        setUnlockError('Could not check coins. Try again.');
      }
    };
    if (userId && candidateId) checkUnlocked();
  }, [userId, candidateId, unlockKey]);

  const handleUnlockClick = () => {
    setShowUnlockModal(true);
    setUnlockStatus("");
    setUnlockError("");
    document.body.classList.add('modal-open');
  };

  const handleCloseModal = () => {
    setShowUnlockModal(false);
    document.body.classList.remove('modal-open');
  };

  const handleConfirmUnlock = async () => {
    setUnlockLoading(true);
    setUnlockError("");
    setUnlockStatus("");
    try {
      // Get current coins again
      const { data } = await axios.get(REDEEM_API);
      const found = Array.isArray(data) ? data.find(d => d.firebase_uid === userId) : null;
      const coins = found?.coin_value ?? 0;
      setCoinValue(coins);

      if (coins < UNLOCK_COST) {
        setUnlockStatus("error");
        setUnlockError("Not enough coins to unlock details!");
        setUnlockLoading(false);
        return;
      }

      // Subtract coins
      await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - UNLOCK_COST
      });

      // Get organization ID for the current user
      let candidateId = null;
      try {
        const orgResponse = await axios.get(`${ORGANISATION_API}?firebase_uid=${encodeURIComponent(userId)}`);
        if (orgResponse.status === 200 && Array.isArray(orgResponse.data) && orgResponse.data.length > 0) {
          candidateId = orgResponse.data[0].id;
        }
      } catch (orgError) {
        console.error("Error fetching organization data:", orgError);
      }

      // Record coin history with unblocked_candidate_id and unblocked_candidate_name from /personal
      let unblocked_candidate_id = null;
      let unblocked_candidate_name = null;
      try {
        const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: candidateId } });
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
          coin_value: coins - UNLOCK_COST,
          reduction: UNLOCK_COST,
          reason: "Unblocked the candidate details",
          unblocked_candidate_id,
          unblocked_candidate_name
        });
      } catch (historyError) {}

      setUnlockStatus("success");
      setUnlockLoading(false);

      setTimeout(() => {
        setShowUnlockModal(false);
        localStorage.setItem(unlockKey, JSON.stringify({
          unlocked: true,
          timestamp: new Date().toISOString()
        }));
        setIsUnlocked(true);
      }, 2000);
    } catch (e) {
      setUnlockStatus("error");
      let msg = "Something went wrong.";
      if (e?.response?.status === 500) msg = "Internal server error. Please try again.";
      setUnlockError(msg);
      setUnlockLoading(false);
    }
  };

  // Data fetchers
  const fetchProfilePhoto = useCallback(async () => {
    try {
      if (!candidateId) return;
      const params = { firebase_uid: candidateId, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      if (data?.url) {
        setPhotoUrl(data.url);
        setPhotoError(false);
      }
    } catch (error) {
      setPhotoError(true);
    }
  }, [candidateId]);

  const fetchEducationData = useCallback(async () => {
    if (!candidateId) return;
    try {
      const response = await axios.get(EDUCATION_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateEducation = response.data.filter(edu => edu.firebase_uid === candidateId);
        // Decode the education data
        const decodedEducation = candidateEducation.map(edu => decodeCandidateData(edu));
        setEducationData(decodedEducation);
      }
    } catch {}
  }, [candidateId]);

  const fetchProfileData = useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(FULL_API, {
        params: { firebase_uid: candidateId, t: Date.now() }
      });
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateRecord = response.data.find(r => r.firebase_uid === candidateId);
        // Decode the profile data
        const decodedProfile = candidateRecord ? decodeCandidateData(candidateRecord) : null;
        setProfileData(decodedProfile);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  const fetchExperienceData = useCallback(async () => {
    if (!candidateId) return;
    try {
      const response = await axios.get(EXPERIENCE_API);
      if (response.status === 200) {
        const { mysqlData, dynamoData } = response.data;
        const candidateMysqlData = mysqlData.find(exp => exp.firebase_uid === candidateId) || null;
        const candidateDynamoData = dynamoData.find(exp => exp.firebase_uid === candidateId) || null;
        
        // Decode the experience data
        const decodedMysqlData = candidateMysqlData ? decodeCandidateData(candidateMysqlData) : {};
        const decodedDynamoData = candidateDynamoData ? decodeCandidateData(candidateDynamoData) : {};
        
        setExperienceData({ 
          mysqlData: decodedMysqlData,
          dynamoData: decodedDynamoData
        });
      }
    } catch {}
  }, [candidateId]);

  const fetchJobPreferenceData = useCallback(async () => {
    if (!candidateId) return;
    try {
      const response = await axios.get(JOB_PREFERENCE_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidatePreference = response.data.find(pref => pref.firebase_uid === candidateId);
        // Decode the job preference data
        const decodedPreference = candidatePreference ? decodeCandidateData(candidatePreference) : null;
        setJobPreferenceData(decodedPreference);
      }
    } catch {}
  }, [candidateId]);

  useEffect(() => {
    fetchProfileData();
    fetchEducationData();
    fetchExperienceData();
    fetchJobPreferenceData();
    fetchProfilePhoto();
  }, [fetchProfileData, fetchEducationData, fetchExperienceData, fetchJobPreferenceData, fetchProfilePhoto]);

  // Util for PDF/print image fetch
  const getFreshImageUrl = async (firebase_uid) => {
    try {
      const params = { firebase_uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      return data?.url || null;
    } catch {
      return null;
    }
  };

  // Print
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

  // PDF
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

  if (!candidate) {
    return (
      <div className="alert alert-warning text-center">
        No candidate selected.
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

  // -------- Helper renderers --------
  const getEducationTypeTitle = (type) => {
    const titles = {
      grade10: 'Grade 10',
      grade12: 'Grade 12',
      degree: 'Degree',
      masterDegree: 'Master\'s Degree',
      doctorate: 'Doctorate',
      nttMtt: 'NTT/MTT',
      dEd: 'D.Ed/D.EID',
      bEd: 'B.Ed',
      certificate: 'Certificate/Other Course'
    };
    return titles[type] || type;
  };

  const renderEducationBlocks = () => {
    if (!educationData || educationData.length === 0) {
      return <div>No education details available</div>;
    }
    return educationData.map((education, index) => (
      <div key={`${education.education_type}-${index}`} className="education-block">
        <div className="education-title">{getEducationTypeTitle(education.education_type)}</div>
        {education.yearOfPassing && (
          <div className="education-detail">Year of Passing: {education.yearOfPassing}</div>
        )}
        {education.courseName && (
          <div className="education-detail">Course Name: {education.courseName}</div>
        )}
      </div>
    ));
  };

  const getExperienceText = () => {
    if (!experienceData?.mysqlData) return null;
    const { teaching_experience_years, teaching_experience_months, total_experience_years, total_experience_months } = experienceData.mysqlData;
    if ((teaching_experience_years === undefined || teaching_experience_years === null) && 
        (total_experience_years === undefined || total_experience_years === null)) {
      return null;
    }
    return (
      <div className="experience-summary">
        {total_experience_years !== undefined && total_experience_years !== null && (
          <div>Total Experience: {total_experience_years} Years {total_experience_months || 0} Months</div>
        )}
        {teaching_experience_years !== undefined && teaching_experience_years !== null && (
          <div>Teaching Experience: {teaching_experience_years} Years {teaching_experience_months || 0} Months</div>
        )}
      </div>
    );
  };

  const renderExperienceBlocks = () => {
    if (!experienceData?.dynamoData?.experienceEntries || 
        experienceData.dynamoData.experienceEntries?.length === 0) {
      return null;
    }
    return experienceData.dynamoData.experienceEntries.map((exp, index) => {
      if (!exp || !exp.organizationName) return null;
      const designation = exp.jobType === 'teaching' ? exp.teachingDesignation :
                         exp.jobType === 'administration' ? exp.adminDesignation :
                         exp.jobType === 'teachingAndAdministration' ? 
                           (exp.teachingAdminDesignations && exp.teachingAdminDesignations.length > 0 ? 
                             exp.teachingAdminDesignations.join(', ') : '') :
                         exp.designation || '';
      // Format the date range
      const startDate = exp.work_from_month && exp.work_from_year ? 
                      `${exp.work_from_month} / ${exp.work_from_year}` : '';
      const endDate = exp.currentlyWorking ? 
                    'till date' : 
                    (exp.work_till_month && exp.work_till_year ? 
                     `${exp.work_till_month} / ${exp.work_till_year}` : '');
      const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
      // Calculate experience duration if available
      let durationText = '';
      if (exp.experience_years || exp.experience_months) {
        durationText = ` (${exp.experience_years || 0} Years ${exp.experience_months || 0} Months)`;
      }
      // Format job type and nature
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
          {/* Organization and date row */}
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
            {/* Teaching specific fields */}
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
            {/* TeachingAndAdministration specific fields */}
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
            {/* Administration specific fields (if any additional fields needed) */}
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

  // -------- Render --------
  return (
    <div>
      {/* PROFILE ACTIONS BAR - TOP */}
      <div className="profile-actions">
        {/* SHOW Unlock button only if not unlocked */}
        {!isUnlocked && (
          <button 
            className="unlock-btn-top"
            style={{ minWidth: 170 }}
            onClick={handleUnlockClick}
            disabled={isUnlocked}
          >
            <span role="img" aria-label="coin" className="coin-icon">💰</span>
            Unlock Details
          </button>
        )}
        <div className="back-button">
          <button className="btn btn-warning" onClick={onBack}>
            Back to List
          </button>
        </div>
      </div>

      {/* Unlock Modal */}
      <UnlockModal
        isOpen={showUnlockModal}
        onClose={handleCloseModal}
        userId={userId}
        onUnlock={handleConfirmUnlock}
        coinValue={coinValue}
        loading={unlockLoading}
        unlockStatus={unlockStatus}
        error={unlockError}
      />

      {/* Actual card content */}
      <div className="cv-container">
        {checkedProfiles && checkedProfiles.candidates?.length > 1 && (
          <div className="profile-counter">
            Profile {checkedProfiles.currentIndex + 1} of {checkedProfiles.candidates.length}
          </div>
        )}

        <div className="cv-header">
          <div className="cv-profile-photo">
            <AvatarImage
              src={photoUrl}
              alt={`${profileData.fullName || 'User'}'s profile photo`}
              gender={profileData.gender}
            />
          </div>
          <div className="header-content" style={{ flex: 1, paddingLeft: '20px' }}>
            <h1 className="candidate-name">{profileData.fullName || 'Candidate Name'}</h1>
            <div className="personal-meta" style={{ marginBottom: '8px' }}>
              {profileData.gender && <span>{profileData.gender}</span>}
              {profileData.dateOfBirth && (
                <span style={{ marginLeft: '15px' }}>
                  DOB: {new Date(profileData.dateOfBirth).toLocaleDateString('en-US', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </span>
              )}
              {profileData.email && (
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
            <div className="contact-grid" style={{ 
              display: 'grid',
              gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
              gap: '15px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px'
            }}>
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
                  <span><strong>Phone:</strong>{" "}
                    <BlurWrapper isUnlocked={isUnlocked}>
                      {isUnlocked
                        ? profileData.callingNumber || "N/A"
                        : profileData.callingNumber
                          ? <span style={{ letterSpacing: "1px" }}>{profileData.callingNumber.replace(/\d/g, "•")}</span>
                          : "N/A"
                      }
                    </BlurWrapper>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaWhatsapp style={{ marginRight: '8px', color: '#25D366', fontSize: '16px' }} />
                  <span><strong>WhatsApp:</strong>{" "}
                    <BlurWrapper isUnlocked={isUnlocked}>
                      {isUnlocked
                        ? profileData.whatsappNumber || "N/A"
                        : profileData.whatsappNumber
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
          </div>
        </div>

        <div className="cv-body">
          <div className="cv-sidebar">
            <div className="cv-section education-section">
              <h2 className="section-title" style={{ 
                fontSize: '18px',
                borderBottom: '2px solid #1967d2',
                paddingBottom: '8px',
                marginBottom: '15px',
                fontWeight: '700',
                color: '#1967d2',
                textTransform: 'uppercase',
                textAlign: 'left'
              }}>EDUCATION</h2>
              {renderEducationBlocks()}
            </div>
          </div>
          <div className="cv-main">
            <div className="cv-section experience-section">
              <h2 className="section-title" style={{ 
                textAlign: 'center',
                borderBottom: '1px solid #000',
                marginBottom: '15px',
                paddingBottom: '5px',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#1967d2'
              }}>
                WORK EXPERIENCE
              </h2>
              {getExperienceText()}
              {renderExperienceBlocks()}
            </div>
            {jobPreferenceData && hasJobPreferencesData() && (
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
          </div>
        </div>

        <div className="navigation-buttons mt-4 text-center">
          <div className="btn-group" role="group" aria-label="Profile navigation">
            {!isFirstProfile && (
              <button 
                onClick={onPrevious}
                className="theme-btn btn-style-one"
                type="button"
              >
                <i className="fas fa-arrow-left me-2"></i>
                Previous Profile
              </button>
            )}
            {!isLastProfile && (
              <button 
                onClick={onNext}
                className="theme-btn btn-style-two ms-3"
                type="button"
              >
                Next Profile
                <i className="fas fa-arrow-right ms-2"></i>
              </button>
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
    </div>
  );
}

const MemoizedViewShort = React.memo(ViewShort);
export { MemoizedViewShort as default };