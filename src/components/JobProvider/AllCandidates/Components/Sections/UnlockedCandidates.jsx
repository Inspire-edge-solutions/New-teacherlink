import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import CandidateCard from '../shared/CandidateCard';
import CandidateDetail from '../shared/ViewFull';
import ViewShort from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import CandidateApiService from '../shared/CandidateApiService';
import { useAuth } from "../../../../../Context/AuthContext";
import useBulkCandidateActions from '../hooks/useBulkCandidateActions';
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';
import LoadingState from '../../../../common/LoadingState';

const UnlockedCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  const [unlockedCandidates, setUnlockedCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(() => {
    const saved = localStorage.getItem('candidatesPerPage');
    return saved ? parseInt(saved) : 10;
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [candidatePhotos, setCandidatePhotos] = useState({});

  // Get unlocked candidates from localStorage (backward compatibility)
  // This matches the old implementation's logic
  const getUnlockedCandidatesFromLocalStorage = useCallback(() => {
    if (!user) return [];
    
    const userId = user.firebase_uid || user.uid;
    if (!userId) return [];
    
    const unlockedCandidateIds = [];
    
    // Check all localStorage keys for unlocked candidates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`unlocked_${userId}_`)) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          
          const parsed = JSON.parse(stored);
          
          if (parsed.unlocked && parsed.timestamp) {
            const unlockTime = new Date(parsed.timestamp);
            const now = new Date();
            const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
            
            // Only include if unlocked within 30 days (matching old implementation)
            if (daysDiff <= 30) {
              const candidateId = key.replace(`unlocked_${userId}_`, '');
              if (candidateId) {
                unlockedCandidateIds.push(candidateId);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing localStorage item:', key, error);
          // Continue to next item if parsing fails
        }
      }
    }
    
    return unlockedCandidateIds;
  }, [user]);

  const fetchUnlockedCandidates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both candidates and user preferences from database
      const [fullCandidates, prefs] = await Promise.all([
        CandidateApiService.fetchCandidates(),
        CandidateApiService.fetchUserCandidatePreferences(user)
      ]);
      
      // Get unlocked candidate IDs from localStorage (backward compatibility)
      const localStorageUnlockedIds = getUnlockedCandidatesFromLocalStorage();
      
      // Get unlocked candidate IDs from database
      const databaseUnlockedIds = prefs.unlockedCandidates || [];
      
      // Merge both sources (remove duplicates using Set)
      const allUnlockedIds = new Set([
        ...localStorageUnlockedIds,
        ...databaseUnlockedIds
      ]);
      
      // Filter candidates that are in either localStorage OR database unlocked list
      const onlyUnlocked = fullCandidates.filter(c => {
        const candidateId = c.firebase_uid;
        return candidateId && allUnlockedIds.has(candidateId);
      });
      
      setUnlockedCandidates(onlyUnlocked);
      setFilteredCandidates(onlyUnlocked);
      setSavedCandidates(prefs.savedCandidates);
      setFavouriteCandidates(prefs.favouriteCandidates);
      
      // Fetch photos for unlocked candidates
      const photos = await CandidateApiService.fetchCandidatePhotos(onlyUnlocked);
      setCandidatePhotos(photos);
      
    } catch (error) {
      console.error('Error fetching unlocked candidates:', error);
      // On error, try to fallback to localStorage only
      try {
        const localStorageUnlockedIds = getUnlockedCandidatesFromLocalStorage();
        if (localStorageUnlockedIds.length > 0) {
          const fullCandidates = await CandidateApiService.fetchCandidates();
          const fallbackUnlocked = fullCandidates.filter(c => 
            localStorageUnlockedIds.includes(c.firebase_uid)
          );
          setUnlockedCandidates(fallbackUnlocked);
          setFilteredCandidates(fallbackUnlocked);
        } else {
          setUnlockedCandidates([]);
          setFilteredCandidates([]);
        }
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError);
        setUnlockedCandidates([]);
        setFilteredCandidates([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, getUnlockedCandidatesFromLocalStorage]);

  useEffect(() => {
    if (!user && !userLoading) {
      toast.error("Please log in to view candidates.");
      setLoading(false);
      return;
    }
    if (user) fetchUnlockedCandidates();
  }, [user, userLoading, fetchUnlockedCandidates]);

  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setIsSearching(false);
      setFilteredCandidates(unlockedCandidates);
      setCurrentPage(1);
      return;
    }
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(unlockedCandidates, searchTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [unlockedCandidates]);

  const handleSaveCandidate = async (candidate) => {
    if (!user) return toast.error("Please login to save candidates.");
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchUnlockedCandidates();
      toast[isSaved ? 'info' : 'success'](
        `${candidate.fullName || candidate.name || 'Candidate'} ${
          isSaved ? 'removed from saved list!' : 'has been saved successfully!'
        }`
      );
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate. Please try again.');
    }
  };

  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) return toast.error("Please login to manage favourites.");
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, isFavourite);
      await fetchUnlockedCandidates();
      toast[isFavourite ? 'success' : 'info'](
        `${candidate.fullName || candidate.name || 'Candidate'} ${
          isFavourite ? 'added to favourites!' : 'removed from favourites!'
        }`
      );
    } catch (error) {
      console.error('Error updating favourite:', error);
      toast.error('Failed to update favourite status. Please try again.');
    }
  };

  // Pagination calculations (needed before checkbox handlers)
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // Use the bulk candidate actions hook
  const {
    selectedCandidates,
    selectAll,
    bulkViewMode,
    checkedProfiles,
    isPreparingPrint,
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    handleViewCompleteProfiles,
    handleViewShortProfiles,
    handleViewPrevious,
    handleViewNext,
    handleBackFromView,
    handlePrintDownload,
    renderBulkView,
    renderActionButtons,
    renderPrintWrapper,
    renderProfileTypeModal
  } = useBulkCandidateActions({
    filteredCandidates,
    currentCandidates,
    getCandidateId: (candidate) => candidate.firebase_uid,
    documentTitlePrefix: 'Selected Unlocked Candidates'
  });

  const handleViewFull = (candidate) => {
    onViewCandidate && onViewCandidate(candidate, 'full');
  };

  const handleViewShort = (candidate) => {
    onViewCandidate && onViewCandidate(candidate, 'short');
  };

  const scrollToCandidate = (candidateId) => {
    if (!candidateId) return;
    setTimeout(() => {
      const el = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelectorAll('.highlighted-candidate').forEach(e => e.classList.remove('highlighted-candidate'));
        el.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  const handleBackFromCandidateView = useCallback((candidateId) => {
    if (candidateId) setTimeout(() => scrollToCandidate(candidateId), 300);
  }, []);

  useEffect(() => {
    if (onBackFromCandidateView) onBackFromCandidateView(handleBackFromCandidateView);
  }, [onBackFromCandidateView, handleBackFromCandidateView]);

  useEffect(() => setCurrentPage(1), [filteredCandidates]);

  // Auto-dismiss error message when user is not logged in
  // This hook must be called before any early returns to maintain hook order
  useEffect(() => {
    if (!user && !userLoading) {
      const timer = setTimeout(() => {
        if (onBackToList) {
          onBackToList();
        } else {
          navigate(-1);
        }
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [user, userLoading, onBackToList, navigate]);

  if (loading || userLoading) {
    return (
      <div className="py-12">
        <LoadingState
          title="Loading unlocked candidates…"
          subtitle="We’re pulling the candidate profiles you’ve unlocked so you can follow up."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800 text-center mb-2">
          Please log in to view candidates.
        </p>
        <p className="text-red-600 text-center text-sm">
          Redirecting you back in a few seconds...
        </p>
      </div>
    );
  }

  // If viewing selected profiles in sequence (bulk view mode)
  const bulkView = renderBulkView();
  if (bulkView) {
    return bulkView;
  }

  // If viewing a single candidate detail (from parent TabDisplay)
  if (viewMode === 'detail' && selectedCandidate) {
    if (viewType === 'full') {
      return <CandidateDetail candidate={selectedCandidate} onBack={onBackToList} />;
    } else if (viewType === 'short') {
      return <ViewShort candidate={selectedCandidate} onBack={onBackToList} />;
    }
  }


  return (
    <div className="widget-content">
      <div className="mb-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex-1 max-w-md">
            <SearchBar onSearch={handleSearch} placeholder="Search unlocked candidates..." />
          </div>
          <RecordsPerPageDropdown
            itemsPerPage={candidatesPerPage}
            onItemsPerPageChange={(v) => { setCandidatesPerPage(v); setCurrentPage(1); }}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-2 mb-2 sm:mb-0">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0 shrink-0">
            {isSearching
              ? `Found ${filteredCandidates.length} unlocked candidate${filteredCandidates.length !== 1 ? 's' : ''}`
              : `${unlockedCandidates.length} Unlocked Candidate${unlockedCandidates.length !== 1 ? 's' : ''}`
            }
          </h3>
          {renderActionButtons()}
        </div>
      </div>

      {currentCandidates.length > 0 ? (
        <div className="candidates-results">
          {/* Select All Checkbox */}
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="selectAllUnlockedCandidates"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              <label htmlFor="selectAllUnlockedCandidates" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                Select All Candidates on This Page
                {selectedCandidates.size > 0 && (
                  <span className="text-gray-500 ml-2">({selectedCandidates.size} total selected)</span>
                )}
              </label>
            </div>
          </div>

          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              const candidateId = candidate.firebase_uid;
              return (
                <CandidateCard
                  key={candidateId}
                  candidate={candidate}
                  isSaved={savedCandidates.includes(candidateId)}
                  isFavourite={favouriteCandidates.includes(candidateId)}
                  loading={loading}
                  onViewFull={handleViewFull}
                  onViewShort={handleViewShort}
                  onSave={handleSaveCandidate}
                  onToggleFavourite={handleToggleFavourite}
                  candidatePhoto={candidatePhotos[candidateId]}
                  showCheckbox={true}
                  isChecked={selectedCandidates.has(candidateId)}
                  onCheckboxChange={handleCheckboxChange}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <img 
              src={noCandidateIllustration} 
              alt="No unlocked candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
            />
            <p className="text-gray-600 text-lg font-medium">
              {isSearching 
                ? 'No unlocked candidates found matching your search.'
                : 'You haven\'t unlocked any candidate profiles yet. Unlock profiles to view full contact details.'
              }
            </p>
          </div>
              </div>
            )}

      {filteredCandidates.length > candidatesPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          totalItems={filteredCandidates.length}
          itemsPerPage={candidatesPerPage}
          currentPageStart={indexOfFirstCandidate + 1}
          currentPageEnd={Math.min(indexOfLastCandidate, filteredCandidates.length)}
        />
      )}

      {/* Hidden Print Wrapper - renders all selected profiles for printing */}
      {renderPrintWrapper()}

      {/* Profile Type Selection Modal for Print/Download */}
      {renderProfileTypeModal()}
    </div>
  );
};

export default UnlockedCandidates;
