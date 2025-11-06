import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/candidates.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AvatarImage } from '../utils/avatarUtils.jsx';
import { 
  AiOutlineEye, 
  AiOutlineFileText, 
  AiOutlineSave, 
  AiFillSave,
  AiOutlineHeart, 
  AiFillHeart 
} from 'react-icons/ai';
import { MdOutlineFileDownload, MdOutlineFileDownloadDone } from 'react-icons/md';

const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

const CandidateList = ({ 
  candidates = [], 
  onSelect, 
  showCheckboxes = false,
  onSave,
  onDownload,
  onToggleFavourite,
  savedCandidateUids = [],
  favCandidateUids = [],
  downloadedCandidateUids = [],
  // New optional props to allow parent-controlled selection
  onCheckedIdsChange,
  externalCheckedIds
}) => {
  // State to track checked candidates
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [candidatePhotos, setCandidatePhotos] = useState({});
  // State to track favourite candidates
  const [favouriteIds, setFavouriteIds] = useState(new Set());

  // Initialize from parent-controlled selection (if provided)
  // Otherwise, start with no selection and let user/parent drive changes

  // Sync internal selection from parent when provided
  useEffect(() => {
    if (externalCheckedIds) {
      const next = new Set(Array.isArray(externalCheckedIds) ? externalCheckedIds : Array.from(externalCheckedIds));
      setCheckedIds(next);
    }
  }, [externalCheckedIds]);

  // Load favourites from localStorage on component mount
  useEffect(() => {
    const savedFavourites = localStorage.getItem('favouriteCandidates');
    if (savedFavourites) {
      try {
        const favourites = JSON.parse(savedFavourites);
        setFavouriteIds(new Set(favourites));
      } catch (error) {
        console.error('Error loading favourites from localStorage:', error);
      }
    }
  }, []);

  // Handle checkbox change
  const handleCheckboxChange = (id) => {
    const newCheckedIds = new Set(checkedIds);
    if (newCheckedIds.has(id)) {
      newCheckedIds.delete(id);
    } else {
      newCheckedIds.add(id);
    }
    setCheckedIds(newCheckedIds);
    if (typeof onCheckedIdsChange === 'function') {
      onCheckedIdsChange(Array.from(newCheckedIds));
    }
  };

  // Handle favourite toggle
  const handleToggleFavourite = (candidateId, candidate) => {
    const newFavouriteIds = new Set(favouriteIds);
    const isFavourite = newFavouriteIds.has(candidateId);
    
    if (isFavourite) {
      newFavouriteIds.delete(candidateId);
    } else {
      newFavouriteIds.add(candidateId);
    }
    
    setFavouriteIds(newFavouriteIds);
    
    // Save to localStorage
    localStorage.setItem('favouriteCandidates', JSON.stringify(Array.from(newFavouriteIds)));
    
    // Call parent callback if provided
    if (onToggleFavourite) {
      onToggleFavourite(candidateId, candidate, !isFavourite);
    }
  };

  // Handle save action
  const handleSave = (candidate) => {
    if (onSave) {
      onSave(candidate);
    } else {
      // Default behavior - show success message
      toast.success(`Candidate ${candidate.name || 'Unknown'} saved successfully!`);
    }
  };

  // Handle download action
  const handleDownload = (candidate) => {
    if (onDownload) {
      onDownload(candidate);
    } else {
      // Default behavior - download candidate data as JSON
      const dataStr = JSON.stringify(candidate, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `candidate_${candidate.name || 'unknown'}_${candidate.firebase_uid}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  // Safety check for candidates prop
  if (!Array.isArray(candidates)) {
    console.error('CandidateList: candidates prop must be an array');
    return (
      <div className="no-results">
        <h3>Error Loading Candidates</h3>
        <p>There was an error loading the candidate data. Please try again later.</p>
      </div>
    );
  }

//const name = candidates.map(candidate => candidate.name);

  const getExperience = (years) => {
    if (!years || isNaN(years)) return 'Not specified';
    const numYears = parseFloat(years);
    return `${numYears} ${numYears === 1 ? 'year' : 'years'}`;
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

  const parseCoreExpertise = (candidate) => {
    // Try different possible fields where core expertise might be stored
    // Based on debug logs, these are the actual fields available:
    
    const formatSubjects = (subjects) => {
      if (!Array.isArray(subjects)) return subjects;
      
      // Limit to first 3 subjects for compact display
      if (subjects.length <= 3) {
        return subjects.join(', ');
      } else {
        const displayedSubjects = subjects.slice(0, 3).join(', ');
        const remainingCount = subjects.length - 3;
        const allSubjects = subjects.join(', ');
        return {
          display: `${displayedSubjects} +${remainingCount} more`,
          full: allSubjects,
          hasMore: true
        };
      }
    };
    
    // 1. Teaching core expertise (most specific)
    if (candidate.teaching_coreExpertise && candidate.teaching_coreExpertise.length > 0) {
      return formatSubjects(candidate.teaching_coreExpertise);
    }
    
    // 2. Teaching subjects
    if (candidate.teaching_subjects && candidate.teaching_subjects.length > 0) {
      return formatSubjects(candidate.teaching_subjects);
    }
    
    // 3. Teaching administrative core expertise
    if (candidate.teaching_administrative_coreExpertise && candidate.teaching_administrative_coreExpertise.length > 0) {
      return formatSubjects(candidate.teaching_administrative_coreExpertise);
    }
    
    // 4. Teaching administrative subjects
    if (candidate.teaching_administrative_subjects && candidate.teaching_administrative_subjects.length > 0) {
      return formatSubjects(candidate.teaching_administrative_subjects);
    }
    
    // 5. Fallback to other possible fields
    if (candidate.subjects_taught && candidate.subjects_taught.length > 0) {
      return formatSubjects(candidate.subjects_taught);
    }
    
    if (candidate.core_subjects && candidate.core_subjects.length > 0) {
      return formatSubjects(candidate.core_subjects);
    }
    
    // 6. Experience-based fallbacks
    if (candidate.grades_taught) {
      return `Grade ${candidate.grades_taught}`;
    }
    
    if (candidate.curriculum_taught) {
      return candidate.curriculum_taught;
    }
    
    return 'Core expertise not available';
  };

  const getLocationString = (candidate) => {
    const city = candidate.present_city_name || candidate.permanent_city_name;
    const state = candidate.present_state_name || candidate.permanent_state_name;
    
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return 'Location not specified';
  };

  const handleViewSelected = (type) => {
    if (checkedIds.size > 0) {
      onSelect({ checkedIds: Array.from(checkedIds) }, type);
    }
  };

  const fetchCandidatePhotos = useCallback(async () => {
    if (!Array.isArray(candidates) || candidates.length === 0) return;

    const photoPromises = candidates.map(async (candidate) => {
      if (!candidate.firebase_uid) return null;
      
      try {
        const params = { firebase_uid: candidate.firebase_uid, action: "view" };
        const { data } = await axios.get(IMAGE_API_URL, { params });
        
        if (data?.url) {
          return { id: candidate.firebase_uid, url: data.url };
        }
      } catch (error) {
        console.error(`Error fetching photo for candidate ${candidate.firebase_uid}:`, error);
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
  }, [candidates]);

  // Add this useEffect to fetch photos when candidates change
  useEffect(() => {
    fetchCandidatePhotos();
  }, [fetchCandidatePhotos]);



  return (
    <div className="candidate-list-container">
      {showCheckboxes && checkedIds.size > 0 && (
        <div className='filtered-candidates-list'> 
          <div className="bulk-actions">
            <span>{checkedIds.size} candidates selected</span>
            <button onClick={() => handleViewSelected('full')} className="btn btn-primary">
              View Full
            </button>
            <button onClick={() => handleViewSelected('short')} className="btn btn-outline-primary">
              View Short
            </button>
          </div>
        </div>
      )}
      
      <div className="table-outer">
        <div className="candidate-list">
          {candidates.map(candidate => {
            try {
              return (
                <div key={candidate.firebase_uid} className="candidate-item compact" data-candidate-id={candidate.firebase_uid}>
                  <div className="candidate-row">
                    {showCheckboxes && (
                      <div className="candidate-checkbox">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={checkedIds.has(candidate.firebase_uid)}
                            onChange={() => handleCheckboxChange(candidate.firebase_uid)}
                            id={`candidate-${candidate.firebase_uid}`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="candidate-avatar-section">
                      <div className="candidate-avatar">
                        <AvatarImage
                          src={candidatePhotos[candidate.firebase_uid] || candidate.profile_picture}
                          alt={candidate.name || 'Candidate'}
                          gender={candidate.gender}
                          className="rounded-circle candidate-avatar-img"
                        />
                      </div>
                    </div>

                    <div className="candidate-info-section">
                      <div className="candidate-header">
                        <div className="name-designation-section">
                          <h5 className="candidate-name">
                            {candidate.name || 'Name not available'}
                          </h5>
                          {candidate.designation && (
                            <span className="candidate-designation">{candidate.designation}</span>
                          )}
                        </div>
                        
                        <div className="action-icons">
                          <button
                            className="action-icon-btn view-full-btn"
                            onClick={() => onSelect(candidate, 'full')}
                            title="View Full Profile"
                          >
                            <AiOutlineEye />
                          </button>
                          <button
                            className="action-icon-btn view-short-btn"
                            onClick={() => onSelect(candidate, 'short')}
                            title="View Short Profile"
                          >
                            <AiOutlineFileText />
                          </button>
                          <button
                            className={`action-icon-btn save-btn ${savedCandidateUids.includes(candidate.firebase_uid) ? 'saved' : ''}`}
                            onClick={() => handleSave(candidate)}
                            title={savedCandidateUids.includes(candidate.firebase_uid) ? 'Remove from Saved' : 'Save Candidate'}
                          >
                            {savedCandidateUids.includes(candidate.firebase_uid) ? <AiFillSave /> : <AiOutlineSave />}
                          </button>
                        
                          <button
                            className={`action-icon-btn favourite-btn ${favCandidateUids.includes(candidate.firebase_uid) ? 'favourited' : ''}`}
                            onClick={() => handleToggleFavourite(candidate.firebase_uid, candidate)}
                            title={favCandidateUids.includes(candidate.firebase_uid) ? 'Remove from Favourites' : 'Mark as Favourite'}
                          >
                            {favCandidateUids.includes(candidate.firebase_uid) ? <AiFillHeart /> : <AiOutlineHeart />}
                          </button>
                        </div>
                      </div>

                      <div className="candidate-details-compact">
                        <div className="details-row">
                          <div className="detail-item">
                            <i className="icon-briefcase"></i>
                            <span>Exp: {getExperience(candidate.total_experience_years)}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-wallet"></i>
                            <span>₹{candidate.expected_salary?.toLocaleString() || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-location-pin"></i>
                            <span>{getLocationString(candidate)}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-graduation"></i>
                            <span>{parseEducationDetails(candidate.education_details_json)}</span>
                          </div>
                          <div className="detail-item">
                            <i className="icon-star"></i>
                            <span>
                              {(() => {
                                const expertise = parseCoreExpertise(candidate);
                                if (typeof expertise === 'object' && expertise.hasMore) {
                                  return (
                                    <span title={expertise.full} style={{ cursor: 'help' }}>
                                      {expertise.display}
                                    </span>
                                  );
                                }
                                return expertise;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } catch (error) {
              console.error('Error rendering candidate:', error);
              return null;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default CandidateList;