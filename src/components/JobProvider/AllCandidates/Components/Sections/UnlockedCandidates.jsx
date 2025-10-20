import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CandidateShort from '../shared/CandidateShort';
import CandidateDetail from '../shared/ViewFull';
import { default as ViewShort } from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import { searchCandidates } from '../../utils/searchUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import '../styles/candidates.css';
import '../styles/search.css';

const API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';

const UnlockedCandidates = () => {
  const { user, loading } = useAuth();

  const [all, setAll] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [checkedProfiles, setCheckedProfiles] = useState(null);
  const [lastSelectedCandidateId, setLastSelectedCandidateId] = useState(null);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // User-specific candidate actions (for UI)
  const [savedCandidateUids, setSavedCandidateUids] = useState([]);
  const [favCandidateUids, setFavCandidateUids] = useState([]);
  const [downloadedCandidateUids, setDownloadedCandidateUids] = useState([]);
  const [userFeatures, setUserFeatures] = useState([]);

  // Blur logic state
  const [canViewContactDetails, setCanViewContactDetails] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const recordsPerPageOptions = [5, 10, 20, 30, 50];

  // For dropdown state (if you need for filter or custom UI)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && event.target.closest('.custom-dropdown') === null) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const savedCandidatesPerPage = localStorage.getItem('candidatesPerPage');
    if (savedCandidatesPerPage) setCandidatesPerPage(parseInt(savedCandidatesPerPage));
  }, []);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered]);

  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filtered.slice(indexOfFirstCandidate, indexOfLastCandidate);

  const totalPages = Math.ceil(filtered.length / candidatesPerPage);
  
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

    if (startPage > 2) {
      rangeWithDots.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      rangeWithDots.push(i);
    }

    if (endPage < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  // Get unlocked candidates from localStorage
  const getUnlockedCandidates = () => {
    if (!user) return [];
    
    const userId = user.firebase_uid || user.uid;
    const unlockedCandidates = [];
    
    // Check all localStorage keys for unlocked candidates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`unlocked_${userId}_`)) {
        try {
          const stored = localStorage.getItem(key);
          const parsed = JSON.parse(stored);
          
          if (parsed.unlocked && parsed.timestamp) {
            const unlockTime = new Date(parsed.timestamp);
            const now = new Date();
            const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
            
            // Only include if unlocked within 30 days
            if (daysDiff <= 30) {
              const candidateId = key.replace(`unlocked_${userId}_`, '');
              unlockedCandidates.push(candidateId);
            }
          }
        } catch (error) {
          console.error('Error parsing localStorage item:', key, error);
        }
      }
    }
    
    return unlockedCandidates;
  };

  // Fetch all candidates and filter for unlocked ones
  useEffect(() => {
    if (!user) return;
    
    const fetchCandidates = async () => {
      try {
        const { data } = await axios.get(API);
        const normalizedData = data.map(candidate => ({
          ...candidate,
          permanent_country_name: candidate.permanent_country_name?.trim(),
          permanent_state_name: candidate.permanent_state_name?.trim(),
          permanent_city_name: candidate.permanent_city_name?.trim(),
          Job_Type: candidate.Job_Type?.trim(),
          languages: candidate.languages || '',
          education_details_json: candidate.education_details_json || ''
        }));
        
        // Filter for unlocked candidates only
        const unlockedCandidateIds = getUnlockedCandidates();
        const unlockedCandidates = normalizedData.filter(candidate => 
          unlockedCandidateIds.includes(candidate.firebase_uid)
        );
        
        // Decode the candidates data
        // const decodedCandidates = decodeCandidatesData(unlockedCandidates);
        // setAll(decodedCandidates);
        // setFiltered(decodedCandidates);
        // setHasNoResults(unlockedCandidates.length === 0);
      } catch (error) {
        console.error('Error fetching candidates:', error);
        setHasNoResults(true);
      } finally {
        setDataLoading(false);
      }
    };
    fetchCandidates();
  }, [user]);

  // Fetch all user actions (UserFeature) for current user only
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

  // SEARCH
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      setFiltered(all);
      return;
    }
    setIsSearching(true);
    const results = searchCandidates(all, searchTerm);
    setSearchResults(results);
    setFiltered(results);
    setCurrentPage(1);
  }, [all]);

  // Candidate select/view logic
  const handleCandidateSelect = async (selection, type) => {
    // Clear any existing highlights when selecting a new candidate
    document.querySelectorAll('.highlighted-candidate').forEach(el => {
      el.classList.remove('highlighted-candidate');
    });

    if (selection.checkedIds) {
      const checkedCandidates = filtered.filter(c => selection.checkedIds.includes(c.firebase_uid));
      setCheckedProfiles({
        candidates: checkedCandidates,
        currentIndex: 0
      });
      setSelected(checkedCandidates[0]);
      setViewType(type);
    } else {
      setCheckedProfiles(null);
      setSelected(selection);
      setViewType(type);
    }

    // For unlocked candidates, contact details should always be visible
    setCanViewContactDetails(true);
  };

  const handlePrevious = () => {
    if (checkedProfiles && checkedProfiles.currentIndex > 0) {
      const newIndex = checkedProfiles.currentIndex - 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: newIndex
      });
      setSelected(checkedProfiles.candidates[newIndex]);
    }
  };

  const handleNext = () => {
    if (checkedProfiles && checkedProfiles.currentIndex < checkedProfiles.candidates.length - 1) {
      const newIndex = checkedProfiles.currentIndex + 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: newIndex
      });
      setSelected(checkedProfiles.candidates[newIndex]);
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

  const postOrPutUserFeature = async (candidateId, updatePayload) => {
    try {
      const added_by = user?.firebase_uid || user?.uid;
      const existingFeature = userFeatures.find(f => f.firebase_uid === candidateId && f.added_by === added_by);
      
      if (existingFeature) {
        await axios.put(`${FAV_API}/${existingFeature.id}`, updatePayload);
      } else {
        await axios.post(FAV_API, {
          firebase_uid: candidateId,
          added_by: added_by,
          ...updatePayload
        });
      }
      
      // Refresh user features
      const { data } = await axios.get(FAV_API);
      const filteredForUser = Array.isArray(data)
        ? data.filter(row => row.added_by === added_by)
        : [];
      setUserFeatures(filteredForUser);
    } catch (error) {
      console.error('Error updating user feature:', error);
      throw error;
    }
  };

  const handleSaveCandidate = async (candidate) => {
    try {
      await postOrPutUserFeature(candidate.firebase_uid, { saved_candidate: 1 });
      setSavedCandidateUids(prev => [...prev, candidate.firebase_uid]);
      toast.success('Candidate saved successfully!');
    } catch (error) {
      toast.error('Failed to save candidate');
    }
  };

  const handleDownloadCandidate = async (candidate) => {
    try {
      await postOrPutUserFeature(candidate.firebase_uid, { dowloaded_candidate: 1 });
      setDownloadedCandidateUids(prev => [...prev, candidate.firebase_uid]);
      toast.success('Candidate downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download candidate');
    }
  };

  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    try {
      await postOrPutUserFeature(candidateId, { favroute_candidate: isFavourite ? 0 : 1 });
      if (isFavourite) {
        setFavCandidateUids(prev => prev.filter(id => id !== candidateId));
      } else {
        setFavCandidateUids(prev => [...prev, candidateId]);
      }
      toast.success(isFavourite ? 'Removed from favourites!' : 'Added to favourites!');
    } catch (error) {
      toast.error('Failed to update favourite status');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading unlocked candidates...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="widget-title">
        <div className="chosen-outer">
          <div className="search-box">
            <SearchBar onSearch={handleSearch} placeholder="Search unlocked candidates..." />
          </div>
          <div className="records-per-page">
            <label htmlFor="recordsPerPage">Show:</label>
            <select
              id="recordsPerPage"
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
        {selected ? (
          viewType === 'full' ? (
            <CandidateDetail
              candidate={selected}
              onBack={handleBack}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstProfile={!checkedProfiles || checkedProfiles.currentIndex === 0}
              isLastProfile={!checkedProfiles || checkedProfiles.currentIndex === checkedProfiles.candidates.length - 1}
              checkedProfiles={checkedProfiles}
              canViewContactDetails={canViewContactDetails}
            />
          ) : (
            <ViewShort
              candidate={selected}
              onBack={handleBack}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstProfile={!checkedProfiles || checkedProfiles.currentIndex === 0}
              isLastProfile={!checkedProfiles || checkedProfiles.currentIndex === checkedProfiles.candidates.length - 1}
              checkedProfiles={checkedProfiles}
              canViewContactDetails={canViewContactDetails}
            />
          )
        ) : hasNoResults ? (
          <div className="no-results-message alert alert-info">
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <h4 style={{ color: '#1565c0', marginBottom: '15px' }}>🔓 No Unlocked Candidates</h4>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
                You haven't unlocked any candidate details yet.
              </p>
              <p style={{ fontSize: '14px', color: '#888' }}>
                Unlock candidate details using coins to view their contact information and full profiles.
              </p>
            </div>
          </div>
        ) : (
          <>
            <CandidateShort
              candidates={currentCandidates}
              onSelect={handleCandidateSelect}
              showCheckboxes={false}
              onSave={handleSaveCandidate}
              onDownload={handleDownloadCandidate}
              onToggleFavourite={handleToggleFavourite}
              savedCandidateUids={savedCandidateUids}
              favCandidateUids={favCandidateUids}
            />
            {/* Pagination */}
            {filtered.length > candidatesPerPage && (
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
                    {pageNumbers.map((number, index) => (
                      <li key={index} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => typeof number === 'number' ? paginate(number) : null}
                          disabled={typeof number !== 'number'}
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
                  Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filtered.length)} of {filtered.length} unlocked candidates
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Blur/overlay styles and enhanced highlight styles */}
      <style>{`
        .blurred-contact {
          filter: blur(5px);
          pointer-events: none;
          user-select: none;
          opacity: 0.5;
          position: relative;
        }
        .blurred-overlay {
          filter: none;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.8);
          color: #d72660;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: all;
          z-index: 2;
          border-radius: 6px;
        }
        
        /* Enhanced highlight styles for recently viewed candidate */
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
    </>
  );
};

export default UnlockedCandidates;
