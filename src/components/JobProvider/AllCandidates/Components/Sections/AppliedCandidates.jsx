import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AiOutlineEye, AiOutlineFileText, AiOutlineSave, AiFillSave, AiOutlineDownload, AiOutlineHeart, AiFillHeart, AiOutlinePrinter } from 'react-icons/ai';
import { useAuth } from '../../../../../Context/AuthContext';
import SearchBar from '../shared/SearchBar';
import CandidateDetail from '../shared/ViewFull';
import { default as ViewShort } from '../shared/ViewShort';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { generatePDFfromHTML, generatePrintHTML, cleanContentForPrint, processProfileImage } from '../../Components/utils/printPdfUtils.jsx';
import { decodeCandidatesData } from '../../../../../utils/dataDecoder';
import '../styles/search.css';
import '../styles/candidates.css';

const APPLIED_CANDIDATES_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const CANDIDATES_PROFILE_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

// Profile Type Selection Modal Component (simplified)
const ProfileTypeModal = ({ isOpen, onClose, onConfirm, selectedCount, isDownloading }) => {
  if (!isOpen) return null;

  return (
    <div className="tl-modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 2000
    }}>
      <div className="tl-modal-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <div className="tl-modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: 0, color: '#1967d2' }}>Select profile type</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            &times;
          </button>
        </div>

        <div className="tl-modal-body" style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => onConfirm('short')}
              disabled={isDownloading}
              style={{
                padding: '10px 16px',
                minWidth: '150px',
                borderRadius: '8px',
                border: 'none',
                background: '#1967d2',
                color: 'white',
                fontWeight: 600,
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
            >
              Short profiles
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => onConfirm('full')}
              disabled={isDownloading}
              style={{
                padding: '10px 16px',
                minWidth: '150px',
                borderRadius: '8px',
                border: '1px solid #1967d2',
                background: 'white',
                color: '#1967d2',
                fontWeight: 600,
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
            >
              Complete profiles
            </button>
          </div>
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="btn btn-light"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: 'white',
                color: '#333',
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppliedCandidates = () => {
  const { user } = useAuth();
  const [appliedCandidates, setAppliedCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [enrichedCandidates, setEnrichedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [lastSelectedCandidateId, setLastSelectedCandidateId] = useState(null);
  
  // User-specific candidate actions (for UI)
  const [savedCandidateUids, setSavedCandidateUids] = useState([]);
  const [favCandidateUids, setFavCandidateUids] = useState([]);
  const [downloadedCandidateUids, setDownloadedCandidateUids] = useState([]);
  const [userFeatures, setUserFeatures] = useState([]);
  const [canViewContactDetails, setCanViewContactDetails] = useState(false);
  const [checkedProfiles, setCheckedProfiles] = useState(null);
  const [candidatePhotos, setCandidatePhotos] = useState({});

  // New state for checkbox selection
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // New state for profile type modal
  const [showProfileTypeModal, setShowProfileTypeModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'print' or 'download'

  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPageOptions = [5, 10, 20, 30, 50];

  // Status options for institute
  const STATUS_OPTIONS = [
    'Not Selected',
    'Selected',
    'Interview Scheduled',
    'Profile in Review'
  ];

  const getCandidateStatus = useCallback((c) => {
    const candidates = [
      c.application_status,
      c.status,
      c.stage,
      c.status_text,
      c.current_status
    ].filter(Boolean);
    const raw = String(candidates[0] || '').trim();
    if (!raw) return 'Profile in Review';
    // Normalize known variants
    if (/not\s*selected/i.test(raw)) return 'Not Selected';
    if (/selected/i.test(raw)) return 'Selected';
    if (/interview/i.test(raw)) return 'Interview Scheduled';
    if (/review|screen/i.test(raw)) return 'Profile in Review';
    return raw;
  }, []);

  const updateApplicationStatus = useCallback(async (candidate, newStatus, revert) => {
    try {
      const payload = {
        job_id: candidate.job_id,
        user_id: candidate.user_id,
        status: newStatus
      };
      await axios.put(APPLIED_CANDIDATES_API, payload);
      toast.success('Status updated');
    } catch (error) {
      if (typeof revert === 'function') revert();
      toast.error('Failed to update status. Please try again.');
    }
  }, []);

  // Helper functions to parse candidate data (similar to CandidateShort component)
  const getExperience = (years) => {
    if (!years || isNaN(years)) return 'Not specified';
    const numYears = parseFloat(years);
    return `${numYears} ${numYears === 1 ? 'year' : 'years'}`;
  };

  const getFreshImageUrl = async (firebase_uid) => {
    if (!firebase_uid) return null;
    try {
      const params = { firebase_uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      return data?.url || null;
    } catch (error) {
      console.error(`Error fetching photo for candidate ${firebase_uid}:`, error);
      return null;
    }
  };

  // Offscreen render of actual components to capture the exact CV markup
  const renderSelectedProfilesHTML = async (candidates, profileType) => {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    host.style.top = '0';
    host.style.width = '1px';
    host.style.height = '1px';
    document.body.appendChild(host);

    const waitForCv = (container) => new Promise((resolve, reject) => {
      const start = Date.now();
      const poll = () => {
        const el = container.querySelector('.cv-container');
        if (el) return resolve(el);
        if (Date.now() - start > 10000) return reject(new Error('Timeout waiting for CV content'));
        setTimeout(poll, 120);
      };
      poll();
    });

    const blocks = [];
    for (const c of candidates) {
      const wrapper = document.createElement('div');
      host.appendChild(wrapper);
      const root = createRoot(wrapper);
      const Comp = profileType === 'short' ? ViewShort : CandidateDetail;
      try {
        root.render(<Comp candidate={{ firebase_uid: c.user_id }} onBack={() => {}} />);
        const cvNode = await waitForCv(wrapper);
        // Clone and clean like views
        const cloned = cvNode.cloneNode(true);
        cleanContentForPrint(cloned, false);
        // Attempt to normalize profile images similar to views' PDF flow
        const images = cloned.querySelectorAll('.cv-profile-photo img, .profile-photo img');
        for (const img of images) {
          try {
            await processProfileImage(img, await getFreshImageUrl(c.user_id));
          } catch {}
        }
        blocks.push(cloned.outerHTML);
      } catch (e) {
        // Fallback to minimal generated HTML if render fails
        blocks.push(profileType === 'short' ? generateShortProfileHTMLDirect(c) : generateFullProfileHTMLDirect(c));
      } finally {
        try { root.unmount(); } catch {}
      }
    }

    if (host.parentNode) host.parentNode.removeChild(host);
    return blocks.join('');
  };

  // Generate HTML content for short profile (matching ViewShort component structure)
  const generateShortProfileHTMLDirect = (candidate) => {
    const getExperience = (years) => {
      if (!years || isNaN(years)) return 'Not specified';
      const numYears = parseFloat(years);
      return `${numYears} ${numYears === 1 ? 'year' : 'years'}`;
    };

    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return 'Invalid Date';
      }
    };

    return `
      <div class="cv-container">
        <div class="cv-header">
          <div class="profile-photo">
            <div class="avatar-placeholder">
              ${(candidate.fullName || 'C').charAt(0).toUpperCase()}
            </div>
          </div>
          <div class="header-content">
            <h1 class="candidate-name">${candidate.fullName || 'Unknown Candidate'}</h1>
            <p class="candidate-title">Applied for: ${candidate.job_name || 'Unknown Position'}</p>
            <div class="contact-info">
              <p><strong>Experience:</strong> ${candidate.experience ? getExperience(candidate.experience) : 'Not specified'}</p>
              <p><strong>Expected Salary:</strong> ₹${candidate.expectedSalary?.toLocaleString() || 'Not specified'}</p>
              <p><strong>Location:</strong> ${candidate.location || 'Not specified'}</p>
              <p><strong>Education:</strong> ${candidate.education || 'Not specified'}</p>
              <p><strong>Core Expertise:</strong> ${candidate.coreExpertise || 'Not specified'}</p>
              <p><strong>Applied Date:</strong> ${formatDate(candidate.applied_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Generate HTML content for full profile (matching ViewFull component structure)
  const generateFullProfileHTMLDirect = (candidate) => {
    const getExperience = (years) => {
      if (!years || isNaN(years)) return 'Not specified';
      const numYears = parseFloat(years);
      return `${numYears} ${numYears === 1 ? 'year' : 'years'}`;
    };

    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return 'Invalid Date';
      }
    };

    return `
      <div class="cv-container">
        <div class="cv-header">
          <div class="profile-photo">
            <div class="avatar-placeholder">
              ${(candidate.fullName || 'C').charAt(0).toUpperCase()}
            </div>
          </div>
          <div class="header-content">
            <h1 class="candidate-name">${candidate.fullName || 'Unknown Candidate'}</h1>
            <p class="candidate-title">Applied for: ${candidate.job_name || 'Unknown Position'}</p>
            <div class="contact-info">
              <p><strong>Experience:</strong> ${candidate.experience ? getExperience(candidate.experience) : 'Not specified'}</p>
              <p><strong>Expected Salary:</strong> ₹${candidate.expectedSalary?.toLocaleString() || 'Not specified'}</p>
              <p><strong>Location:</strong> ${candidate.location || 'Not specified'}</p>
              <p><strong>Education:</strong> ${candidate.education || 'Not specified'}</p>
              <p><strong>Core Expertise:</strong> ${candidate.coreExpertise || 'Not specified'}</p>
              <p><strong>Applied Date:</strong> ${formatDate(candidate.applied_at)}</p>
            </div>
          </div>
        </div>
        
        <div class="cv-body">
          <div class="cv-sidebar">
            <div class="section">
              <h3>Personal Information</h3>
              <p><strong>Gender:</strong> ${candidate.gender || 'Not specified'}</p>
              <p><strong>Job Type:</strong> ${candidate.jobType || 'Not specified'}</p>
              ${candidate.profile ? `
                <p><strong>Date of Birth:</strong> ${candidate.profile.date_of_birth || 'Not specified'}</p>
                <p><strong>Marital Status:</strong> ${candidate.profile.marital_status || 'Not specified'}</p>
                <p><strong>Present City:</strong> ${candidate.profile.present_city_name || 'Not specified'}</p>
                <p><strong>Present State:</strong> ${candidate.profile.present_state_name || 'Not specified'}</p>
              ` : ''}
            </div>
          </div>
          
          <div class="cv-main">
            ${candidate.profile && candidate.profile.education_details_json ? `
              <div class="section">
                <h3>Education Details</h3>
                ${(() => {
                  try {
                    const educationDetails = JSON.parse(candidate.profile.education_details_json);
                    if (Array.isArray(educationDetails)) {
                      return educationDetails.map((edu, eduIndex) => `
                        <div class="education-item">
                          <h4>${edu.education_type || 'Education'} ${eduIndex + 1}</h4>
                          <p><strong>Institution:</strong> ${edu.institution || 'Not specified'}</p>
                          <p><strong>Year:</strong> ${edu.year || 'Not specified'}</p>
                          <p><strong>Percentage/CGPA:</strong> ${edu.percentage || edu.cgpa || 'Not specified'}</p>
                        </div>
                      `).join('');
                    }
                    return '<p>Education details not available</p>';
                  } catch (e) {
                    return '<p>Education details not available</p>';
                  }
                })()}
              </div>
            ` : ''}
            
            ${candidate.profile && candidate.profile.work_experience_json ? `
              <div class="section">
                <h3>Work Experience</h3>
                ${(() => {
                  try {
                    const workExperience = JSON.parse(candidate.profile.work_experience_json);
                    if (Array.isArray(workExperience)) {
                      return workExperience.map((exp, expIndex) => `
                        <div class="experience-item">
                          <h4>${exp.designation || 'Position'} ${expIndex + 1}</h4>
                          <p><strong>Organization:</strong> ${exp.organization || 'Not specified'}</p>
                          <p><strong>Duration:</strong> ${exp.duration || 'Not specified'}</p>
                          <p><strong>Description:</strong> ${exp.description || 'Not specified'}</p>
                        </div>
                      `).join('');
                    }
                    return '<p>Work experience not available</p>';
                  } catch (e) {
                    return '<p>Work experience not available</p>';
                  }
                })()}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    };

  const parseEducationDetails = (eduJson) => {
    if (!eduJson) return 'Not specified';
    
    try {
      const jsonObjects = eduJson.match(/\{[^}]+\}/g);
      if (jsonObjects && jsonObjects.length > 0) {
        for (const jsonStr of jsonObjects) {
          try {
            const details = JSON.parse(jsonStr);
            if (details.education_type) {
              return details.education_type;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      return 'Education details not available';
    } catch (error) {
      console.error('Error parsing education details:', error);
      return 'Error parsing education details';
    }
  };

  const getLocationString = (candidate) => {
    const city = candidate.present_city_name || candidate.permanent_city_name;
    const state = candidate.present_state_name || candidate.permanent_state_name;
    
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return 'Location not specified';
  };

  const parseCoreExpertise = (candidate) => {
    const formatSubjects = (subjects) => {
      if (!Array.isArray(subjects)) return subjects;
      
      // Limit to first 2 subjects for compact display in applied candidates
      if (subjects.length <= 2) {
        return subjects.join(', ');
      } else {
        const displayedSubjects = subjects.slice(0, 2).join(', ');
        const remainingCount = subjects.length - 2;
        return `${displayedSubjects} +${remainingCount} more`;
      }
    };
    
    // Try different expertise fields
    if (candidate.teaching_coreExpertise && candidate.teaching_coreExpertise.length > 0) {
      return formatSubjects(candidate.teaching_coreExpertise);
    }
    
    if (candidate.teaching_subjects && candidate.teaching_subjects.length > 0) {
      return formatSubjects(candidate.teaching_subjects);
    }
    
    if (candidate.teaching_administrative_coreExpertise && candidate.teaching_administrative_coreExpertise.length > 0) {
      return formatSubjects(candidate.teaching_administrative_coreExpertise);
    }
    
    if (candidate.grades_taught) {
      return `Grade ${candidate.grades_taught}`;
    }
    
    if (candidate.curriculum_taught) {
      return candidate.curriculum_taught;
    }
    
    return 'Not specified';
  };

  // Fetch applied candidates data and enrich with profile details
  const fetchAppliedCandidates = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch applied candidates and all candidate profiles in parallel
      const [appliedResponse, profilesResponse] = await Promise.all([
        axios.get(APPLIED_CANDIDATES_API),
        axios.get(CANDIDATES_PROFILE_API)
      ]);
      
      if (appliedResponse.status === 200 && Array.isArray(appliedResponse.data)) {
        // Filter candidates who applied to jobs posted by current employer
        const employerCandidates = appliedResponse.data.filter(
          candidate => candidate.firebase_uid === user.uid
        );
        
        // Create a map of candidate profiles for quick lookup
        const profilesMap = new Map();
        if (profilesResponse.status === 200 && Array.isArray(profilesResponse.data)) {
          profilesResponse.data.forEach(profile => {
            profilesMap.set(profile.firebase_uid, profile);
          });
        }
        
        // Enrich applied candidates with profile data
        const enrichedCandidates = employerCandidates.map(appliedCandidate => {
          const profile = profilesMap.get(appliedCandidate.user_id);
          return {
            ...appliedCandidate,
            // Add profile data if found
            profile: profile || null,
            // Convenience fields for easier access
            experience: profile?.full_time_offline || null,
            expectedSalary: profile?.expected_salary || null,
            location: profile ? getLocationString(profile) : 'Not specified',
            education: profile ? parseEducationDetails(profile.education_details_json) : 'Not specified',
            coreExpertise: profile ? parseCoreExpertise(profile) : 'Not specified',
            gender: profile?.gender || null,
            jobType: profile?.Job_Type || null
          };
        });
        
        // Sort by application date (most recent first)
        const sortedCandidates = enrichedCandidates.sort(
          (a, b) => new Date(b.applied_at) - new Date(a.applied_at)
        );
        
        // Decode the candidates data
        const decodedCandidates = decodeCandidatesData(sortedCandidates);
        setAppliedCandidates(decodedCandidates);
        setFilteredCandidates(decodedCandidates);
        setEnrichedCandidates(sortedCandidates);
      } else {
        setAppliedCandidates([]);
        setFilteredCandidates([]);
        setEnrichedCandidates([]);
      }
    } catch (err) {
      setError('Failed to load applied candidates');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Search handler
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredCandidates(appliedCandidates);
      return;
    }

    const filtered = appliedCandidates.filter(candidate =>
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.education?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.coreExpertise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.jobType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredCandidates(filtered);
  }, [appliedCandidates]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Fetch user features (saved, favorite, downloaded states)
  useEffect(() => {
    if (!user) return;
    const fetchUserFeatures = async () => {
      try {
        const { data } = await axios.get(FAV_API);
        const added_by = user.firebase_uid || user.uid;
        const filteredForUser = Array.isArray(data)
          ? data.filter(row => row.added_by === added_by)
          : [];
        setUserFeatures(filteredForUser);
        setFavCandidateUids(filteredForUser.filter(f => f.favroute_candidate === 1 || f.favroute_candidate === true).map(f => f.firebase_uid));
        setSavedCandidateUids(filteredForUser.filter(f => f.saved_candidate === 1 || f.saved_candidate === true).map(f => f.firebase_uid));
        setDownloadedCandidateUids(filteredForUser.filter(f => f.dowloaded_candidate === 1 || f.dowloaded_candidate === true).map(f => f.firebase_uid));
      } catch (error) {
        setUserFeatures([]);
        setFavCandidateUids([]);
        setSavedCandidateUids([]);
        setDownloadedCandidateUids([]);
      }
    };
    fetchUserFeatures();
  }, [user]);

  const postOrPutUserFeature = async (candidateId, updatePayload) => {
    if (!user) return;
    const added_by = user.firebase_uid || user.uid;
    try {
      // Check if the row for this (firebase_uid, added_by) exists
      const { data: allFeatures } = await axios.get(FAV_API);
      const existing = Array.isArray(allFeatures)
        ? allFeatures.find(row => row.firebase_uid === candidateId && row.added_by === added_by)
        : null;

      if (existing) {
        // Only update your own row
        await axios.put(FAV_API, { ...updatePayload, firebase_uid: candidateId, added_by });
      } else if (Object.values(updatePayload).some(val => val === 1)) {
        // Only POST if not found AND you're marking (never create for unmark)
        await axios.post(FAV_API, { ...updatePayload, firebase_uid: candidateId, added_by });
      }
      
      // Always refresh features for UI
      const { data: afterUpdate } = await axios.get(FAV_API);
      const filteredForUser = Array.isArray(afterUpdate)
        ? afterUpdate.filter(row => row.added_by === added_by)
        : [];
      setUserFeatures(filteredForUser);
      setFavCandidateUids(filteredForUser.filter(f => f.favroute_candidate === 1 || f.favroute_candidate === true).map(f => f.firebase_uid));
      setSavedCandidateUids(filteredForUser.filter(f => f.saved_candidate === 1 || f.saved_candidate === true).map(f => f.firebase_uid));
      setDownloadedCandidateUids(filteredForUser.filter(f => f.dowloaded_candidate === 1 || f.dowloaded_candidate === true).map(f => f.firebase_uid));
    } catch (err) {
      toast.error('Error updating candidate status');
    }
  };

  const handleCandidateSelect = async (candidate, type) => {
    // Clear any existing highlights when selecting a new candidate
    document.querySelectorAll('.highlighted-candidate').forEach(el => {
      el.classList.remove('highlighted-candidate');
    });

    try {
      // Get full profile data
      const { data: profileData } = await axios.get(CANDIDATES_PROFILE_API);
      const fullProfile = profileData.find(p => p.firebase_uid === candidate.user_id);
      
      if (!fullProfile) {
        toast.error('Could not load candidate profile');
        return;
      }

      // Combine applied candidate data with full profile
      const enrichedCandidate = {
        ...fullProfile,
        // Keep application specific data
        job_id: candidate.job_id,
        job_name: candidate.job_name,
        applied_at: candidate.applied_at,
        is_applied: candidate.is_applied,
        // Ensure we use the correct ID for API calls
        firebase_uid: candidate.user_id
      };

      setSelected(enrichedCandidate);
      setViewType(type);
      setCheckedProfiles(null);

      // Coin check for contact details visibility
      setCanViewContactDetails(false); // default: blur/hide
      try {
        const currentUid = user?.firebase_uid || user?.uid;
        if (!currentUid) {
          setCanViewContactDetails(false);
          return;
        }
        // API call to check coin
        const { data } = await axios.get(
          `https://mgwnmhp62h.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral?firebase_uid=${currentUid}`
        );
        
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          data[0].coin_value &&
          Number(data[0].coin_value) > 20
        ) {
          setCanViewContactDetails(true);
        } else {
          setCanViewContactDetails(false);
        }
        
      } catch (err) {
        setCanViewContactDetails(false); // on API error, blur as fallback
      }
    } catch (error) {
      console.error('Error loading candidate profile:', error);
      toast.error('Failed to load candidate profile');
    }
  };

  // Function to scroll to a specific candidate
  const scrollToCandidate = (candidateId) => {
    if (!candidateId) return;
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        // Add highlight effect - this will persist until new selection
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  const handleBack = () => {
    // Store the selected candidate ID before clearing selection
    if (selected) {
      setLastSelectedCandidateId(selected.firebase_uid);
    }
    
    setSelected(null);
    setViewType(null);
    setCheckedProfiles(null);
    
    // Scroll to the previously selected candidate
    if (selected) {
      scrollToCandidate(selected.firebase_uid);
    }
  };

  const handleSaveCandidate = async (candidate) => {
    const isCurrentlySaved = savedCandidateUids.includes(candidate.user_id);
    await postOrPutUserFeature(candidate.user_id, { saved_candidate: isCurrentlySaved ? 0 : 1 });
    toast[isCurrentlySaved ? 'info' : 'success'](`${candidate.fullName || 'Candidate'} ${isCurrentlySaved ? 'removed from saved list!' : 'has been saved successfully!'}`);
  };

  const handleDownloadCandidate = async (candidate) => {
    await postOrPutUserFeature(candidate.user_id, { dowloaded_candidate: 1 });
    
    // Download profile data
    const dataStr = JSON.stringify(candidate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `candidate_${candidate.fullName || 'unknown'}_${candidate.user_id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success(`${candidate.fullName || 'Candidate'} profile downloaded successfully!`);
  };

  const handleToggleFavourite = async (candidateId, candidate) => {
    const isFavourite = !favCandidateUids.includes(candidateId);
    await postOrPutUserFeature(candidateId, { favroute_candidate: isFavourite ? 1 : 0 });
    toast[isFavourite ? 'success' : 'info'](`${candidate.fullName || 'Candidate'} ${isFavourite ? 'added to favourites!' : 'removed from favourites!'}`);
  };

  const fetchCandidatePhotos = useCallback(async () => {
    if (!Array.isArray(enrichedCandidates) || enrichedCandidates.length === 0) return;

    const photoPromises = enrichedCandidates.map(async (candidate) => {
      if (!candidate.user_id) return null;
      
      try {
        const params = { firebase_uid: candidate.user_id, action: "view" };
        const { data } = await axios.get(IMAGE_API_URL, { params });
        
        if (data?.url) {
          return { id: candidate.user_id, url: data.url };
        }
      } catch (error) {
        console.error(`Error fetching photo for candidate ${candidate.user_id}:`, error);
      }
      return null;
    });

    const results = await Promise.allSettled(photoPromises);
    const photoMap = {};
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        photoMap[result.value.id] = result.value.url;
      }
    });

    setCandidatePhotos(photoMap);
  }, [enrichedCandidates]);

  // Handle individual candidate selection
  const handleCandidateSelection = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
    
    // Update select all state
    const allCurrentCandidateIds = new Set(currentCandidates.map(c => c.user_id));
    setSelectAll(newSelected.size === allCurrentCandidateIds.size && allCurrentCandidateIds.size > 0);
  };

  // Handle select all candidates on current page
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const newSelected = new Set(selectedCandidates);
    const currentCandidateIds = currentCandidates.map(c => c.user_id);
    
    if (newSelectAll) {
      currentCandidateIds.forEach(id => newSelected.add(id));
    } else {
      currentCandidateIds.forEach(id => newSelected.delete(id));
    }
    
    setSelectedCandidates(newSelected);
  };

  // New function to handle profile type selection
  const handleProfileTypeConfirm = async (profileType) => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate');
      return;
    }

    const selectedCandidatesData = enrichedCandidates.filter(candidate => 
      selectedCandidates.has(candidate.user_id)
    );

    if (pendingAction === 'download') {
      // Render actual components and generate a PDF using the shared print CSS
      const html = await renderSelectedProfilesHTML(selectedCandidatesData, profileType);
      const res = await generatePDFfromHTML({
        htmlContent: html,
        title: `Selected Candidates - ${profileType === 'short' ? 'Short' : 'Complete'} Profiles`,
        setIsDownloading,
        isUnlocked: false
      });
      if (res.success) toast.success(`Downloaded ${selectedCandidatesData.length} ${profileType} profile(s)`);
      else toast.error('Failed to generate PDF');
    } else if (pendingAction === 'print') {
      const html = await renderSelectedProfilesHTML(selectedCandidatesData, profileType);
      const printWindow = window.open('', '_blank');
      const doc = generatePrintHTML(html, 'Selected Candidates', false);
      printWindow.document.write(doc);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      };
      // No toast notifications
    }

    setShowProfileTypeModal(false);
    setPendingAction(null);
    setIsDownloading(false);
  };

  // Modified print function
  const handlePrintSelected = () => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to print');
      return;
    }

    setPendingAction('print');
    setShowProfileTypeModal(true);
  };

  // Modified download function
  const handleDownloadSelected = () => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to download');
      return;
    }

    setPendingAction('download');
    setShowProfileTypeModal(true);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedCandidates(new Set());
    setSelectAll(false);
  };

  const handleRecordsPerPageChange = (e) => {
    const newCandidatesPerPage = parseInt(e.target.value);
    setCandidatesPerPage(newCandidatesPerPage);
    setCurrentPage(1);
    localStorage.setItem('candidatesPerPage', newCandidatesPerPage.toString());
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Calculate pagination values BEFORE useEffect hooks that depend on them
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // ALL useEffect hooks must be called before any conditional returns
  useEffect(() => {
    const savedCandidatesPerPage = localStorage.getItem('candidatesPerPage');
    if (savedCandidatesPerPage) setCandidatesPerPage(parseInt(savedCandidatesPerPage));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCandidates]);

  // Add useEffect to fetch photos when candidates change
  useEffect(() => {
    fetchCandidatePhotos();
  }, [fetchCandidatePhotos]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAppliedCandidates();
  }, [fetchAppliedCandidates]);

  // Update select all state when current candidates change
  useEffect(() => {
    const allCurrentCandidateIds = new Set(currentCandidates.map(c => c.user_id));
    const selectedFromCurrent = Array.from(selectedCandidates).filter(id => 
      allCurrentCandidateIds.has(id)
    );
    setSelectAll(selectedFromCurrent.length === allCurrentCandidateIds.size && allCurrentCandidateIds.size > 0);
  }, [currentCandidates, selectedCandidates]);

  // Simplified pagination: just show page numbers, Previous/Next are separate
  const getPageNumbers = () => {
    if (totalPages <= 10) {
      return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after 1 if needed
    if (startPage > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page (excluding 1 and last page)
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots before last page if needed
    if (endPage < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  // If a candidate is selected for viewing
  if (selected) {
    if (viewType === 'short') {
      return <ViewShort 
        candidate={selected} 
        onBack={handleBack}
        canViewContactDetails={canViewContactDetails}
      />;
    }
    if (viewType === 'full') {
      return <CandidateDetail 
        candidate={selected} 
        onBack={handleBack}
        canViewContactDetails={canViewContactDetails}
      />;
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="applied-candidates-container">
        <div className="widget-title d-flex justify-content-between align-items-center">
          <h4>Applied Candidates</h4>
        </div>
        <div className="widget-content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="applied-candidates-container">
        <div className="widget-title d-flex justify-content-between align-items-center">
          <h4>Applied Candidates</h4>
        </div>
        <div className="widget-content">
          <div className="alert alert-danger">
            <h6>Error Loading Data</h6>
            <p>{error}</p>
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={fetchAppliedCandidates}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No candidates found
  if (appliedCandidates.length === 0) {
    return (
      <div className="applied-candidates-container">
        <div className="widget-title d-flex justify-content-between align-items-center">
          <h4>Applied Candidates</h4>
        </div>
        <div className="widget-content">
          <div className="alert alert-info">
            <h6>No Applications Yet</h6>
            <p>No candidates have applied to your job postings yet. Keep checking back as applications come in!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="applied-candidates-container">
      <div className="widget-title d-flex justify-content-between align-items-center">
        <div className="title-area">
          <h4>Applied Candidates <span className="badge bg-primary">{appliedCandidates.length}</span></h4>
          {selectedCandidates.size > 0 && (
            <span className="badge bg-success ms-2">{selectedCandidates.size} selected</span>
          )}
        </div>
        <div className="chosen-outer d-flex align-items-center">
          {selectedCandidates.size > 0 && (
            <>
              <button
                className="btn btn-sm btn-outline-primary me-2"
                onClick={handlePrintSelected}
                title="Print Selected Candidates"
              >
                <AiOutlinePrinter /> Print Profiles ({selectedCandidates.size})
              </button>
              <button
                className="btn btn-sm btn-outline-success me-3"
                onClick={handleDownloadSelected}
                title="Download Selected Candidates as PDF"
              >
                <AiOutlineDownload /> Download PDF ({selectedCandidates.size})
              </button>
              <button
                className="btn btn-sm btn-outline-secondary me-3"
                onClick={handleClearSelection}
                title="Clear Selection"
              >
                Clear Selection
              </button>
            </>
          )}
          <SearchBar 
            onSearch={handleSearch} 
            placeholder="Search by name, job, location, education, or expertise..."
          />
          {filteredCandidates.length !== appliedCandidates.length && (
            <div className="me-3">
              <span className="text-muted">
                Showing {filteredCandidates.length} of {appliedCandidates.length} candidates
              </span>
            </div>
          )}
          <div className="records-per-page me-3">
            <select
              className="form-select records-dropdown"
              value={candidatesPerPage}
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
      
      <div className="widget-content">
        {filteredCandidates.length === 0 ? (
          <div className="alert alert-warning">
            <p>No candidates match your search criteria.</p>
          </div>
        ) : (
          <div className="candidate-list-container">
            {/* Select All Checkbox */}
            <div className="select-all-container mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="selectAllCandidates"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <label className="form-check-label" htmlFor="selectAllCandidates">
                  <strong>Select All Candidates on This Page</strong>
                  {selectedCandidates.size > 0 && (
                    <span className="text-muted ms-2">({selectedCandidates.size} total selected)</span>
                  )}
                </label>
              </div>
            </div>

            <div className="candidate-list">
              {currentCandidates.map((candidate, index) => (
                <div key={`${candidate.job_id}-${candidate.user_id}-${index}`} className="candidate-item compact">
                  <div className="candidate-row">
                    {/* Checkbox for selection */}
                    <div className="candidate-checkbox-section">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`candidate-${candidate.user_id}`}
                          checked={selectedCandidates.has(candidate.user_id)}
                          onChange={() => handleCandidateSelection(candidate.user_id)}
                        />
                      </div>
                    </div>

                    <div className="candidate-avatar-section">
                      <div className="candidate-avatar">
                        <AvatarImage
                          src={candidatePhotos[candidate.user_id] || candidate.profile?.profile_picture}
                          alt={candidate.fullName || 'Candidate'}
                          gender={candidate.profile?.gender}
                          className="rounded-circle candidate-avatar-img"
                        />
                      </div>
                    </div>

                    <div className="candidate-info-section">
                      <div className="candidate-header">
                        <div className="name-designation-section">
                          <h5 className="candidate-name">
                            {candidate.fullName || 'Unknown Candidate'} 
                            <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                              applied for <span style={{ fontWeight: 'bold' }}>{candidate.job_name || 'Unknown Position'}</span>
                            </span>
                          </h5>
                        </div>
                        
                        <div className="action-icons">
                          <button
                            className="action-icon-btn view-full-btn"
                            onClick={() => handleCandidateSelect(candidate, 'full')}
                            title="View Full Profile"
                          >
                            <AiOutlineEye />
                          </button>
                          <button
                            className="action-icon-btn view-short-btn"
                            onClick={() => handleCandidateSelect(candidate, 'short')}
                            title="View Short Profile"
                          >
                            <AiOutlineFileText />
                          </button>
                          <button
                            className={`action-icon-btn save-btn ${savedCandidateUids.includes(candidate.user_id) ? 'saved' : ''}`}
                            onClick={() => handleSaveCandidate(candidate)}
                            title={savedCandidateUids.includes(candidate.user_id) ? 'Remove from Saved' : 'Save Candidate'}
                          >
                            {savedCandidateUids.includes(candidate.user_id) ? <AiFillSave /> : <AiOutlineSave />}
                          </button>
                          <button
                            className={`action-icon-btn favourite-btn ${favCandidateUids.includes(candidate.user_id) ? 'favourited' : ''}`}
                            onClick={() => handleToggleFavourite(candidate.user_id, candidate)}
                            title={favCandidateUids.includes(candidate.user_id) ? 'Remove from Favourites' : 'Mark as Favourite'}
                          >
                            {favCandidateUids.includes(candidate.user_id) ? <AiFillHeart /> : <AiOutlineHeart />}
                          </button>
                        </div>
                      </div>

                      <div className="candidate-details-compact">
                        <div className="details-row">
                          <div className="detail-item">
                            <i className="icon-briefcase"></i>
                            <span>Exp: {candidate.experience ? getExperience(candidate.experience) : 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-wallet"></i>
                            <span>₹{candidate.expectedSalary?.toLocaleString() || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-location-pin"></i>
                            <span>{candidate.location}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-graduation"></i>
                            <span>{candidate.education}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-star"></i>
                            <span>{candidate.coreExpertise}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-calendar"></i>
                            <span>Applied: {formatDate(candidate.applied_at)}</span>
                          </div>
                          <div className="detail-item" style={{ marginLeft: 'auto' }}>
                            <label className="me-2" style={{ color: '#666',fontWeight:'500' }}>Status:</label>
                            <select
                              className="form-select form-select-sm"
                              value={getCandidateStatus(candidate)}
                              onChange={(e) => {
                                const prev = getCandidateStatus(candidate);
                                const newStatus = e.target.value;
                                // Optimistic UI update
                                const prevRef = { ...candidate };
                                candidate.status = newStatus;
                                setFilteredCandidates(prevList => prevList.map(c => (
                                  c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: newStatus } : c
                                )));
                                setAppliedCandidates(prevList => prevList.map(c => (
                                  c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: newStatus } : c
                                )));
                                setEnrichedCandidates(prevList => prevList.map(c => (
                                  c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: newStatus } : c
                                )));
                                updateApplicationStatus(candidate, newStatus, () => {
                                  // Revert on failure
                                  candidate.status = prev;
                                  setFilteredCandidates(prevList => prevList.map(c => (
                                    c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: prev } : c
                                  )));
                                  setAppliedCandidates(prevList => prevList.map(c => (
                                    c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: prev } : c
                                  )));
                                  setEnrichedCandidates(prevList => prevList.map(c => (
                                    c.user_id === candidate.user_id && c.job_id === candidate.job_id ? { ...c, status: prev } : c
                                  )));
                                });
                              }}
                              style={{ minWidth: '180px' }}
                            >
                              {STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {filteredCandidates.length > candidatesPerPage && (
              <div className="pagination-box">
                <nav>
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {pageNumbers.map(number => (
                      <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => paginate(number)}
                        >
                          {number}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
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
                  Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filteredCandidates.length)} of {filteredCandidates.length} candidates
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showProfileTypeModal && (
        <ProfileTypeModal
          isOpen={showProfileTypeModal}
          onClose={() => setShowProfileTypeModal(false)}
          onConfirm={handleProfileTypeConfirm}
          selectedCount={selectedCandidates.size}
          isDownloading={isDownloading}
        />
      )}
      
      {/* Enhanced highlight styles for recently viewed candidate */}
      <style>{`
        .candidate-item.compact.highlighted-candidate {
          border: 3px solid #2196f3 !important;
          background-color: #e3f2fd !important;
          background: #e3f2fd !important;
          border-radius: 8px !important;
          transform: scale(1.02) !important;
          transition: all 0.3s ease-in-out !important;
          position: relative !important;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3) !important;
        }
        
        .highlighted-candidate::before {
          content: "Recently Viewed";
          position: absolute;
          top: -8px;
          right: -8px;
          background: #2196f3;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Smooth transition for all candidate cards */
        [data-candidate-id] {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AppliedCandidates; 
