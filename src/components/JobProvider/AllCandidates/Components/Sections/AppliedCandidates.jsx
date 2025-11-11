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

const AppliedCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  const [appliedCandidates, setAppliedCandidates] = useState([]);
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
  const [unlockedCandidateIds, setUnlockedCandidateIds] = useState([]);
  const [pendingScrollCandidate, setPendingScrollCandidate] = useState(null);
  const skipPageResetRef = useRef(false);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);

  const getUnlockedCandidatesFromLocalStorage = useCallback(() => {
    if (!user) return [];
    const userId = user.firebase_uid || user.uid;
    if (!userId) return [];

    const unlockedIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`unlocked_${userId}_`)) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          const parsed = JSON.parse(stored);
          if (parsed?.unlocked && parsed?.timestamp) {
            const unlockTime = new Date(parsed.timestamp);
            const now = new Date();
            const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 30) {
              const candidateId = key.replace(`unlocked_${userId}_`, '');
              if (candidateId) {
                unlockedIds.push(candidateId);
              }
            }
          }
        } catch (error) {
          console.error('AppliedCandidates: Error parsing localStorage entry', key, error);
        }
      }
    }
    return unlockedIds;
  }, [user]);

  const fetchAppliedCandidates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch applied candidates and user preferences in parallel
      const [appliedData, prefs] = await Promise.all([
        CandidateApiService.fetchAppliedCandidates(user),
        CandidateApiService.fetchUserCandidatePreferences(user)
      ]);
      
      setAppliedCandidates(appliedData);
      setFilteredCandidates(appliedData);
      setSavedCandidates(prefs.savedCandidates);
      setFavouriteCandidates(prefs.favouriteCandidates);
      const combinedUnlocked = new Set([
        ...getUnlockedCandidatesFromLocalStorage().map(String),
        ...(prefs.unlockedCandidates || []).map(String)
      ]);
      setUnlockedCandidateIds(Array.from(combinedUnlocked));
      
      // Fetch photos for applied candidates using user_id (the candidate who applied)
      if (appliedData.length > 0) {
        const photoPromises = appliedData.map(async (candidate) => {
          // Use the candidate's user_id (from appliedCandidate.user_id) for photo fetching
          const candidateUserId = candidate.firebase_uid; // This is set to appliedCandidate.user_id in the API service
          if (!candidateUserId) return null;
          
          try {
            const photoUrl = await CandidateApiService.fetchCandidatePhoto(candidateUserId);
            return photoUrl ? { id: candidateUserId, url: photoUrl } : null;
          } catch (error) {
            console.error(`Error fetching photo for candidate ${candidateUserId}:`, error);
            return null;
          }
        });
        
        const photoResults = await Promise.allSettled(photoPromises);
        const photoMap = {};
        photoResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            photoMap[result.value.id] = result.value.url;
          }
        });
        setCandidatePhotos(photoMap);
      }
    } catch (error) {
      console.error('Error fetching applied candidates:', error);
      setAppliedCandidates([]);
      setFilteredCandidates([]);
      setUnlockedCandidateIds(getUnlockedCandidatesFromLocalStorage().map(String));
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
    if (user) fetchAppliedCandidates();
  }, [user, userLoading, fetchAppliedCandidates]);

  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();
    if (!normalizedTerm) {
      setFilteredCandidates(appliedCandidates);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(appliedCandidates, normalizedTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [appliedCandidates, isSearching]);

  const handleSaveCandidate = async (candidate) => {
    if (!user) return toast.error("Please login to save candidates.");
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchAppliedCandidates();
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
      await fetchAppliedCandidates();
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

  const handleViewFull = (candidate) => {
    onViewCandidate && onViewCandidate(candidate, 'full');
  };

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

  const handleViewShort = (candidate) => {
    onViewCandidate && onViewCandidate(candidate, 'short');
  };

  // Handle message candidate - show modal
  const handleMessage = (candidate) => {
    if (!candidate) return;
    const candidateId = String(candidate.firebase_uid || '');
    const isUnlocked = candidateId && unlockedCandidateIds.includes(candidateId);

    if (!isUnlocked) {
      console.log('AppliedCandidates: Candidate not unlocked, prompting unlock:', candidateId);
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      return;
    }

    console.log('AppliedCandidates: Messaging candidate:', candidateId);
    const messagingCandidate = buildMessagingCandidate(candidate);
    setCandidateToMessage({ original: candidate, messaging: messagingCandidate });
    setShowMessageModal(true);
  };

  const handleUnlockPromptClose = () => {
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
  };

  const handleUnlockPromptViewProfile = () => {
    if (candidateToUnlock) {
      handleViewFull(candidateToUnlock);
    }
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
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

  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // Use the bulk candidate actions hook
  // For applied candidates, use applicationId (job_id + user_id) as unique identifier
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
    getCandidateId: (candidate) => {
      // Use applicationId if available, otherwise fallback to firebase_uid
      return candidate.applicationId || candidate.firebase_uid;
    },
    documentTitlePrefix: 'Selected Applied Candidates'
  });

  useEffect(() => {
    if (pendingScrollCandidate) return;
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [filteredCandidates, pendingScrollCandidate]);

  // Auto-dismiss error message when user is not logged in
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
          title="Loading applied candidates…"
          subtitle="We’re collecting the applications you’ve received so you can review them here."
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

  // If viewing a candidate detail, show the detail view
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
            <SearchBar onSearch={handleSearch} placeholder="Search applied candidates..." />
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
              ? `Found ${filteredCandidates.length} applied candidate${filteredCandidates.length !== 1 ? 's' : ''}`
              : `${appliedCandidates.length} Candidate${appliedCandidates.length !== 1 ? 's' : ''} Applied`
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
                id="selectAllAppliedCandidates"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              <label htmlFor="selectAllAppliedCandidates" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                Select All Candidates on This Page
                {selectedCandidates.size > 0 && (
                  <span className="text-gray-500 ml-2">({selectedCandidates.size} total selected)</span>
                )}
              </label>
            </div>
          </div>

          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              // Use applicationId for unique key (job_id + user_id) to handle same candidate applying to multiple jobs
              const candidateId = candidate.firebase_uid;
              const uniqueKey = candidate.applicationId || `${candidate.job_id}_${candidateId}`;
              const candidateSelectionId = candidate.applicationId || candidate.firebase_uid;
              return (
                <CandidateCard
                  key={uniqueKey}
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
                  isChecked={selectedCandidates.has(candidateSelectionId)}
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
              alt="No applied candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
            />
            <p className="text-gray-600 text-lg font-medium">
              No candidates have applied to your jobs yet.
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

      {/* Unlock Prompt Modal */}
      {showUnlockPrompt && candidateToUnlock && (
        <div
          className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
          onClick={handleUnlockPromptClose}
        >
          <div
            className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleUnlockPromptClose}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center">
              <h3 className="font-semibold text-[18px] mb-4 text-gray-800">
                Unlock Candidate
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                To message {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}, please unlock their contact details first. View the profile to unlock and access messaging.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleUnlockPromptClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl"
                onClick={handleUnlockPromptViewProfile}
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default AppliedCandidates; 