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

const API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const PROFILE_APPROVED_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved';

const AllCandidates = () => {
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
  const [userFeatures, setUserFeatures] = useState([]);

  // Profile approval data
  const [approvedCandidates, setApprovedCandidates] = useState([]);

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



  useEffect(() => {
    if (!user && !loading) {
      toast.error("Please log in to view candidates.");
      setDataLoading(false);
    }
  }, [user, loading]);

  // Fetch all candidates (profile details) - only approved candidates
  useEffect(() => {
    if (!user) return;
    const fetchCandidates = async () => {
      try {
        const { data } = await axios.get(API);
        // Decode obfuscated data back to real data for application use
        // const decodedData = decodeCandidatesData(data);
        // const normalizedData = decodedData.map(candidate => ({
        //   ...candidate,
        //   permanent_country_name: candidate.permanent_country_name?.trim(),
        //   permanent_state_name: candidate.permanent_state_name?.trim(),
        //   permanent_city_name: candidate.permanent_city_name?.trim(),
        //   Job_Type: candidate.Job_Type?.trim(),
        //   languages: candidate.languages || '',
        //   education_details_json: candidate.education_details_json || ''
        // }));
        const checkRes = data[0];
        console.log(checkRes);
        // Filter only approved candidates (if approvedCandidates is available)
        const approvedOnly = approvedCandidates.length > 0 
          ? checkRes.filter(candidate => 
              approvedCandidates.includes(candidate.firebase_uid)
            )
          : []; // Show no candidates if no approved candidates yet
        
        setAll(approvedOnly); // This array will be used for search - contains only approved candidates
        setFiltered(approvedOnly);
      } catch (error) {
        console.error('Error fetching candidates:', error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchCandidates();
  }, [user, approvedCandidates]);

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
      } catch (error) {
        setUserFeatures([]);
        setFavCandidateUids([]);
        setSavedCandidateUids([]);
      }
    };
    fetchUserFeatures();
  }, [user]);

  // Fetch profile approval data
  useEffect(() => {
    const fetchApprovedCandidates = async () => {
      try {
        const { data } = await axios.get(PROFILE_APPROVED_API);
        // Filter only approved candidates (isApproved === 1)
        const approved = Array.isArray(data)
          ? data.filter(candidate => candidate.isApproved === 1).map(candidate => candidate.firebase_uid)
          : [];
        setApprovedCandidates(approved);
      } catch (error) {
        console.error('Error fetching approved candidates:', error);
        setApprovedCandidates([]);
      }
    };
    fetchApprovedCandidates();
  }, []);



  // SEARCH - Only searches through approved candidates
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      // Show only approved candidates when search is cleared
      setFiltered(all);
      return;
    }
    setIsSearching(true);
    // Search only through approved candidates (all array already contains only approved candidates)
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
      // firebase_uid is now kept as plain text, no decoding needed
      const decodedCandidate = selection;
      
      setCheckedProfiles(null);
      setSelected(decodedCandidate);
      setViewType(type);
    }

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
      console.log("RedeemGeneral data:", data);
      
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
  };
  const handlePrevious = () => {
    if (checkedProfiles && checkedProfiles.currentIndex > 0) {
      const prevIndex = checkedProfiles.currentIndex - 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: prevIndex
      });
      setSelected(checkedProfiles.candidates[prevIndex]);
    }
  };
  const handleNext = () => {
    if (checkedProfiles && checkedProfiles.currentIndex < checkedProfiles.candidates.length - 1) {
      const nextIndex = checkedProfiles.currentIndex + 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: nextIndex
      });
      setSelected(checkedProfiles.candidates[nextIndex]);
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

  // --- Corrected POST/PUT for (firebase_uid, added_by) only, never affect others
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
    } catch (err) {
      toast.error('Error updating candidate status');
    }
  };

  // Save/Unsave
  const handleSaveCandidate = async (candidate) => {
    const isCurrentlySaved = savedCandidateUids.includes(candidate.firebase_uid);
    await postOrPutUserFeature(candidate.firebase_uid, { saved_candidate: isCurrentlySaved ? 0 : 1 });
    toast[isCurrentlySaved ? 'info' : 'success'](`${candidate.fullName || 'Candidate'} ${isCurrentlySaved ? 'removed from saved list!' : 'has been saved successfully!'}`);
  };

  // Mark/unmark Favourite (heart) for current user only
  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    await postOrPutUserFeature(candidate.firebase_uid, { favroute_candidate: isFavourite ? 1 : 0 });
    toast[isFavourite ? 'success' : 'info'](`${candidate.fullName || 'Candidate'} ${isFavourite ? 'added to favourites!' : 'removed from favourites!'}`);
  };

  // ===== RENDER LOGIC =====
  if (loading || dataLoading) {
    return <div className="loading-ring">Loading...</div>;
  }
  if (!user) {
    return (
      <div className="no-results-message alert alert-danger">
        Please log in to view candidates.
      </div>
    );
  }

  return (
    <>
      <div className="widget-title d-flex justify-content-between align-items-center">
        <div className="title-area">
          <h4>All Candidates</h4>
        </div>
        <div className="chosen-outer d-flex align-items-center">
          <SearchBar onSearch={handleSearch} />
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
            No candidates match the selected filters. Try adjusting your criteria.
          </div>
        ) : (
          <>
            <CandidateShort
              candidates={currentCandidates}
              onSelect={handleCandidateSelect}
              showCheckboxes={false}
              onSave={handleSaveCandidate}
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
                  Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filtered.length)} of {filtered.length} candidates
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

export default AllCandidates;