import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import CandidateActionConfirmationModal from '../shared/CandidateActionConfirmationModal';

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

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);

  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);
  const [showFavouriteConfirmModal, setShowFavouriteConfirmModal] = useState(false);
  const [candidateToFavourite, setCandidateToFavourite] = useState(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [candidateToSave, setCandidateToSave] = useState(null);

  const [pendingUnlockCandidate, setPendingUnlockCandidate] = useState(null);
  const [pendingHighlight, setPendingHighlight] = useState(null);
  const [highlightedCandidateId, setHighlightedCandidateId] = useState(null);
  const [pendingScrollCandidate, setPendingScrollCandidate] = useState(null);
  const skipPageResetRef = useRef(false);

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

  const buildMessagingCandidate = useCallback((candidate) => {
    if (!candidate) return null;
    return {
      firebase_uid: candidate.firebase_uid,
      id: candidate.firebase_uid,
      fullName: candidate.fullName || candidate.name || 'Candidate',
      name: candidate.name || candidate.fullName || 'Candidate',
      state: candidate.present_state_name || candidate.state || candidate.permanent_state_name || null,
      city: candidate.present_city_name || candidate.city || candidate.permanent_city_name || null,
      email: candidate.email || null,
      phone: candidate.callingNumber || null,
      photoUrl: candidatePhotos[candidate.firebase_uid] || candidate.profile_picture || null
    };
  }, [candidatePhotos]);

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
    const normalizedTerm = (searchTerm ?? '').trim();
    if (!normalizedTerm) {
      setFilteredCandidates(unlockedCandidates);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(unlockedCandidates, normalizedTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [unlockedCandidates, isSearching]);

  const handleSaveCandidate = async (candidate) => {
    if (!user) return toast.error("Please login to save candidates.");
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    
    // If saving (not removing), show confirmation modal first
    if (!isSaved) {
      setCandidateToSave({ candidate, isSaved });
      setShowSaveConfirmModal(true);
      return;
    }
    
    // If removing from saved, proceed directly
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, false);
      await fetchUnlockedCandidates();
      toast.info(
        `${candidate.fullName || candidate.name || 'Candidate'} removed from saved list!`
      );
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate. Please try again.');
    }
  };

  // Handle confirm save after modal confirmation
  const handleConfirmSave = async () => {
    if (!candidateToSave || !user) {
      setShowSaveConfirmModal(false);
      setCandidateToSave(null);
      return;
    }
    
    const { candidate } = candidateToSave;
    
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, true);
      await fetchUnlockedCandidates();
      toast.success(
        `${candidate.fullName || candidate.name || 'Candidate'} has been saved successfully!`
      );
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate. Please try again.');
    } finally {
      setShowSaveConfirmModal(false);
      setCandidateToSave(null);
    }
  };

  // Handle cancel save confirmation
  const handleCancelSave = () => {
    setShowSaveConfirmModal(false);
    setCandidateToSave(null);
  };

  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) return toast.error("Please login to manage favourites.");
    
    // If adding to favourites, show confirmation modal first
    if (isFavourite) {
      setCandidateToFavourite({ candidateId, candidate, isFavourite });
      setShowFavouriteConfirmModal(true);
      return;
    }
    
    // If removing from favourites, proceed directly
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

  // Handle confirm favourite after modal confirmation
  const handleConfirmFavourite = async () => {
    if (!candidateToFavourite || !user) {
      setShowFavouriteConfirmModal(false);
      setCandidateToFavourite(null);
      return;
    }
    
    const { candidate, isFavourite } = candidateToFavourite;
    
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, true);
      await fetchUnlockedCandidates();
      toast.success(
        `${candidate.fullName || candidate.name || 'Candidate'} added to favourites!`
      );
    } catch (error) {
      console.error('Error updating favourite:', error);
      toast.error('Failed to update favourite status. Please try again.');
    } finally {
      setShowFavouriteConfirmModal(false);
      setCandidateToFavourite(null);
    }
  };

  // Handle cancel favourite confirmation
  const handleCancelFavourite = () => {
    setShowFavouriteConfirmModal(false);
    setCandidateToFavourite(null);
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
    handleCheckboxChange,
    handleSelectAll,
    renderBulkView,
    renderActionButtons,
    renderPrintWrapper,
    renderProfileTypeModal,
    renderMobilePrintLoader
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

  // Handle message candidate - show modal
  const handleMessage = (candidate) => {
    console.log('UnlockedCandidates: Messaging candidate:', candidate.firebase_uid);
    const messagingCandidate = buildMessagingCandidate(candidate);
    setCandidateToMessage({ original: candidate, messaging: messagingCandidate });
    setShowMessageModal(true);
  };

  // Handle "Ok" button - close modal, stay on page
  const handleMessageModalOk = () => {
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  // Handle "Continue Single" button - redirect to messages
  const handleMessageModalContinue = () => {
    if (candidateToMessage?.messaging) {
      navigate('/provider/messages', {
        state: {
          selectedCandidate: candidateToMessage.messaging,
          startConversation: true
        },
        replace: false
      });
    }
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  const getCandidatePage = useCallback(
    (candidateId) => {
      if (!candidateId) return null;

      const normalizedId = String(candidateId);
      const candidateIndex = filteredCandidates.findIndex(
        (candidate) => String(candidate.firebase_uid) === normalizedId
      );

      if (candidateIndex === -1) return null;

      return Math.floor(candidateIndex / candidatesPerPage) + 1;
    },
    [filteredCandidates, candidatesPerPage]
  );

  const scrollToCandidate = useCallback((candidateId) => {
    if (!candidateId) return;
    setTimeout(() => {
      const el = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.highlighted-candidate').forEach((e) =>
          e.classList.remove('highlighted-candidate')
        );
        el.classList.add('highlighted-candidate');
      }
    }, 100);
  }, []);

  const handleBackFromCandidateView = useCallback(
    (candidateId) => {
      if (!candidateId) return;

      const targetPage = getCandidatePage(candidateId);
      skipPageResetRef.current = true;
      if (targetPage) {
        if (currentPage !== targetPage) {
          setPendingScrollCandidate(String(candidateId));
          setCurrentPage(targetPage);
        } else {
          setPendingScrollCandidate(String(candidateId));
        }
      } else {
        setPendingScrollCandidate(String(candidateId));
      }
    },
    [getCandidatePage, currentPage]
  );

  useEffect(() => {
    if (onBackFromCandidateView) onBackFromCandidateView(handleBackFromCandidateView);
  }, [onBackFromCandidateView, handleBackFromCandidateView]);

  useEffect(() => {
    if (!pendingScrollCandidate) return;

    const timer = setTimeout(() => {
      scrollToCandidate(pendingScrollCandidate);
      setPendingScrollCandidate(null);
    }, 200);

    return () => clearTimeout(timer);
  }, [pendingScrollCandidate, scrollToCandidate, currentPage]);

  useEffect(() => {
    if (pendingScrollCandidate) return;
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [filteredCandidates, pendingScrollCandidate]);

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
          subtitle="We’re pulling up the profiles you’ve unlocked so you can follow up."
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
                  onMessage={handleMessage}
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

      {/* Print Loader Overlay */}
      {renderMobilePrintLoader()}

      {/* Message Modal */}
      {showMessageModal && (
        <div
          className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
          onClick={handleMessageModalOk}
        >
          <div
            className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleMessageModalOk}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5">
              <h3 className="font-semibold text-[18px] mb-4 text-center text-gray-800">
                Message Candidate
              </h3>
              <p className="text-gray-600 text-[15px] mb-6 text-center leading-relaxed">
                If you want to send bulk message, add candidate to favourite
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleMessageModalOk}
              >
                Ok
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl"
                onClick={handleMessageModalContinue}
              >
                Continue Single
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favourite Confirmation Modal */}
      <CandidateActionConfirmationModal
        isOpen={showFavouriteConfirmModal && !!candidateToFavourite}
        actionType="favorite"
        onConfirm={handleConfirmFavourite}
        onCancel={handleCancelFavourite}
      />

      {/* Save Confirmation Modal */}
      <CandidateActionConfirmationModal
        isOpen={showSaveConfirmModal && !!candidateToSave}
        actionType="save"
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />
    </div>
  );
};

export default UnlockedCandidates;