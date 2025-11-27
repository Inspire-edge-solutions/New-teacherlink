import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CandidateCard from '../shared/CandidateCard';
import CandidateDetail from '../shared/ViewFull';
import ViewShort from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import CandidateApiService from '../shared/CandidateApiService';
import { useAuth } from "../../../../../Context/AuthContext";
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';
import LoadingState from '../../../../common/LoadingState';
import { HiOutlineArrowRight } from 'react-icons/hi';
import CandidateActionConfirmationModal from '../shared/CandidateActionConfirmationModal';
import ModalPortal from '../../../../common/ModalPortal';

const REDEEM_API = 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem';
const WHATSAPP_API_URL = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API_URL = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';
const WHATSAPP_TEMPLATE_NAME = 'insti_blukingg';
const RCS_TEMPLATE_NAME = 'bluk_institute';

const FavouriteCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList,
  onNavigateTab
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  // Candidates data state
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User preferences state
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [downloadedCandidates, setDownloadedCandidates] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(() => {
    const saved = localStorage.getItem('candidatesPerPage');
    return saved ? parseInt(saved) : 10;
  });
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);

  // Candidate photos
  const [candidatePhotos, setCandidatePhotos] = useState({});
  const [unlockedCandidateIds, setUnlockedCandidateIds] = useState([]);
  const [pendingScrollCandidate, setPendingScrollCandidate] = useState(null);
  const skipPageResetRef = useRef(false);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

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
          console.error('FavouriteCandidates: Error parsing localStorage entry', key, error);
        }
      }
    }
    return unlockedIds;
  }, [user]);

  // Pagination calculations
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);

  // Fetch favourite candidates
  const fetchFavouriteCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const [fullCandidates, prefs] = await Promise.all([
        CandidateApiService.fetchCandidates(),
        CandidateApiService.fetchUserCandidatePreferences(user)
      ]);
      
      // Filter only favourite candidates
      const onlyFavourites = fullCandidates.filter(c => 
        prefs.favouriteCandidates.includes(c.firebase_uid)
      );
      
      setFavouriteCandidates(onlyFavourites);
      setFilteredCandidates(onlyFavourites);
      setSavedCandidates(prefs.savedCandidates);
      setDownloadedCandidates(prefs.downloadedCandidates);
      const combinedUnlocked = new Set([
        ...getUnlockedCandidatesFromLocalStorage().map(String),
        ...(prefs.unlockedCandidates || []).map(String)
      ]);
      setUnlockedCandidateIds(Array.from(combinedUnlocked));
      
      // Fetch photos
      const photos = await CandidateApiService.fetchCandidatePhotos(onlyFavourites);
      setCandidatePhotos(photos);
    } catch (error) {
      console.error('Error fetching favourite candidates:', error);
      setFavouriteCandidates([]);
      setFilteredCandidates([]);
      setUnlockedCandidateIds(getUnlockedCandidatesFromLocalStorage().map(String));
    } finally {
      setLoading(false);
    }
  }, [user, getUnlockedCandidatesFromLocalStorage]);

  // Initial data fetch
  useEffect(() => {
    if (!user && !userLoading) {
      toast.error("Please log in to view candidates.");
      setLoading(false);
      return;
    }
    
    if (user) {
      fetchFavouriteCandidates();
    }
  }, [user, userLoading, fetchFavouriteCandidates]);

  // Handle search
  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();

    if (!normalizedTerm) {
      setFilteredCandidates(favouriteCandidates);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(favouriteCandidates, normalizedTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [favouriteCandidates, isSearching]);

  // Handle save candidate - saves directly without coin deduction modal
  const handleSaveCandidate = async (candidate) => {
    if (!user) {
      toast.error("Please login to save candidates.");
      return;
    }

    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    
    // Save directly without showing any confirmation modal
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchFavouriteCandidates();
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

  // Handle toggle favourite (removes from this list)
  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) {
      toast.error("Please login to manage favourites.");
      return;
    }
    
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, isFavourite);
      await fetchFavouriteCandidates();
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

  // Handle view full profile
  const handleViewFull = (candidate) => {
    console.log('FavouriteCandidates: Viewing full profile:', candidate.firebase_uid);
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

  // Handle view short profile
  const handleViewShort = (candidate) => {
    console.log('FavouriteCandidates: Viewing short profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'short');
  };

  // Handle message candidate - show modal
  const handleMessage = (candidate) => {
    if (!candidate) return;
    const candidateId = String(candidate.firebase_uid || '');
    const isUnlocked = candidateId && unlockedCandidateIds.includes(candidateId);

    if (!isUnlocked) {
      console.log('FavouriteCandidates: Candidate not unlocked, prompting unlock:', candidateId);
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      setUnlockError('');
      return;
    }

    console.log('FavouriteCandidates: Messaging candidate:', candidateId);
    const messagingCandidate = buildMessagingCandidate(candidate);
    setCandidateToMessage({ original: candidate, messaging: messagingCandidate });
    setShowMessageModal(true);
  };

  const handleUnlockPromptClose = () => {
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
    setUnlockError('');
    setUnlockLoading(false);
  };

  const handleUnlockForMessaging = async () => {
    if (!candidateToUnlock || !user) return;

    setUnlockLoading(true);
    setUnlockError('');

    try {
      const userId = user.firebase_uid || user.uid;
      if (!userId) {
        throw new Error('User not found');
      }

      const candidateId = String(candidateToUnlock.firebase_uid || '');
      if (!candidateId) {
        throw new Error('Candidate not found');
      }

      // Check if already unlocked
      if (unlockedCandidateIds.includes(candidateId)) {
        // Already unlocked, redirect to messages
        const messagingCandidate = buildMessagingCandidate(candidateToUnlock);
        setShowUnlockPrompt(false);
        setCandidateToUnlock(null);
        navigate('/provider/messages', {
          state: {
            selectedCandidate: messagingCandidate,
            startConversation: true
          },
          replace: false
        });
        setUnlockLoading(false);
        return;
      }

      // Get current coins
      const { data: redeemData } = await axios.get(`${REDEEM_API}?firebase_uid=${userId}`);
      const userCoinRecord = Array.isArray(redeemData) && redeemData.length > 0
        ? redeemData[0]
        : redeemData;
      
      if (!userCoinRecord) {
        throw new Error("Don't have enough coins in your account");
      }

      const coins = userCoinRecord.coin_value || 0;
      const UNLOCK_COST = 60; // 50 for profile + 10 for messaging

      if (coins < UNLOCK_COST) {
        throw new Error(`You do not have enough coins. Required: ${UNLOCK_COST}, Available: ${coins}`);
      }

      // Deduct 60 coins
      await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - UNLOCK_COST
      });

      // Mark candidate as unlocked
      await CandidateApiService.upsertCandidateAction(candidateToUnlock, user, {
        unlocked_candidate: 1,
        unblocked_candidate: 1
      });

      // Update local state
      const candidateIdStr = String(candidateId);
      setUnlockedCandidateIds(prev => [...prev, candidateIdStr]);
      
      // Store in localStorage
      const userIdStr = String(userId);
      const unlockKey = `unlocked_${userIdStr}_${candidateIdStr}`;
      localStorage.setItem(unlockKey, JSON.stringify({
        unlocked: true,
        timestamp: new Date().toISOString()
      }));

      // Show success message
      toast.success('Candidate unlocked successfully!');

      // Redirect to messages section
      const messagingCandidate = buildMessagingCandidate(candidateToUnlock);
      setShowUnlockPrompt(false);
      setCandidateToUnlock(null);
      setUnlockLoading(false);
      
      navigate('/provider/messages', {
        state: {
          selectedCandidate: messagingCandidate,
          startConversation: true
        },
        replace: false
      });
    } catch (error) {
      console.error('Error unlocking candidate:', error);
      setUnlockError(error.message || 'Failed to unlock candidate. Please try again.');
      setUnlockLoading(false);
    }
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

  const getCandidatePage = useCallback((candidateId) => {
    if (!candidateId) return null;

    const normalizedId = String(candidateId);
    const candidateIndex = filteredCandidates.findIndex(
      (candidate) => String(candidate.firebase_uid) === normalizedId
    );

    if (candidateIndex === -1) return null;

    return Math.floor(candidateIndex / candidatesPerPage) + 1;
  }, [filteredCandidates, candidatesPerPage]);

  const scrollToCandidate = useCallback((candidateId) => {
    if (!candidateId) return;
    
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  }, []);

  const handleBackFromCandidateView = useCallback((candidateId) => {
    console.log('FavouriteCandidates handleBackFromCandidateView called, candidateId:', candidateId);
    if (!candidateId) return;

    const targetPage = getCandidatePage(candidateId);
    if (targetPage) {
      skipPageResetRef.current = true;
      if (currentPage !== targetPage) {
        setPendingScrollCandidate(String(candidateId));
        setCurrentPage(targetPage);
      } else {
        setPendingScrollCandidate(String(candidateId));
      }
    } else {
      skipPageResetRef.current = true;
      setPendingScrollCandidate(String(candidateId));
    }
  }, [getCandidatePage, currentPage]);

  // Register back handler with parent
  useEffect(() => {
    if (onBackFromCandidateView) {
      console.log('FavouriteCandidates: Registering handleBackFromCandidateView with parent');
      onBackFromCandidateView(handleBackFromCandidateView);
    }
  }, [onBackFromCandidateView, handleBackFromCandidateView]);

  useEffect(() => {
    if (!pendingScrollCandidate) return;

    const timer = setTimeout(() => {
      scrollToCandidate(pendingScrollCandidate);
      setPendingScrollCandidate(null);
    }, 200);

    return () => clearTimeout(timer);
  }, [pendingScrollCandidate, scrollToCandidate, currentPage]);

  // Handle records per page change
  const handleRecordsPerPageChange = (newValue) => {
    setCandidatesPerPage(newValue);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filtered candidates change
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

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="py-12">
        <LoadingState
          title="Loading favourite candidates…"
          subtitle="We’re gathering the profiles you’ve marked as favourite so you can take action quickly."
        />
      </div>
    );
  }

  // Not logged in state
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
      {/* Header with Search and Records per Page */}
      <div className="mb-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex-1 max-w-md">
            <SearchBar 
              onSearch={handleSearch} 
              placeholder="Search favourite candidates..." 
            />
          </div>
          <RecordsPerPageDropdown
            itemsPerPage={candidatesPerPage}
            onItemsPerPageChange={handleRecordsPerPageChange}
          />
        </div>
      </div>

      {/* Candidates Count */}
      <div className="mb-3">
        <h3 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
          {isSearching
            ? `Found ${filteredCandidates.length} favourite candidate${filteredCandidates.length !== 1 ? 's' : ''}`
            : `${favouriteCandidates.length} Favourite Candidate${favouriteCandidates.length !== 1 ? 's' : ''}`
          }
        </h3>
          </div>

      {/* Candidates List */}
      {currentCandidates.length > 0 ? (
        <div className="candidates-results">
          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              const candidateId = candidate.firebase_uid;
              const isSaved = savedCandidates.includes(candidateId);
              const isFavourite = true; // All in this list are favourites
              const isDownloaded = downloadedCandidates.includes(candidateId);
              
              return (
                <CandidateCard
                  key={candidateId}
                  candidate={candidate}
                  isSaved={isSaved}
                  isFavourite={isFavourite}
                  isDownloaded={isDownloaded}
                  loading={loading}
                  onViewFull={handleViewFull}
                  onViewShort={handleViewShort}
                  onSave={handleSaveCandidate}
                  onToggleFavourite={handleToggleFavourite}
                  onMessage={handleMessage}
                  candidatePhoto={candidatePhotos[candidateId]}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <img 
              src={noCandidateIllustration} 
              alt="No favourite candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-2 mx-auto"
            />
            <p className="text-gray-600 text-lg font-medium">
              {isSearching 
                ? 'No favourite candidates found matching your search.'
                : 'You haven\'t marked any candidates as favourite yet.'
              }
            </p>
            {!isSearching && (
              <button
                className="px-4 py-2 bg-gradient-brand text-white rounded-lg text-sm font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab('all');
                    return;
                  }
                  const allTab = document.querySelector('[data-tab=\"all\"]');
                  if (allTab) allTab.click();
                }}
              >
                <span>Browse All Candidates</span>
                <HiOutlineArrowRight className="text-lg" />
              </button>
            )}
          </div>
        </div>
            )}

      {/* Pagination */}
      {filteredCandidates.length > candidatesPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredCandidates.length}
          itemsPerPage={candidatesPerPage}
          currentPageStart={indexOfFirstCandidate + 1}
          currentPageEnd={Math.min(indexOfLastCandidate, filteredCandidates.length)}
        />
      )}

      {/* Unlock Prompt Modal */}
      {showUnlockPrompt && candidateToUnlock && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleUnlockPromptClose}
          >
          <div
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleUnlockPromptClose}
              disabled={unlockLoading}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center">
              <h3 className="font-semibold text-[18px] mb-4 text-gray-800">
                Unlock Candidate
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                To message {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}, please unlock their contact details first.
              </p>
              
              {/* Coin Breakdown */}
              <div className="bg-white/80 rounded-lg p-4 mb-4">
                <p className="text-gray-700 text-[14px] font-medium mb-2">Coin Deduction:</p>
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[13px] text-gray-600">
                    <span>Profile Unlock:</span>
                    <span className="font-semibold">50 coins</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-gray-600">
                    <span>Messaging:</span>
                    <span className="font-semibold">10 coins</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between text-[14px] font-semibold text-gray-800">
                    <span>Total:</span>
                    <span>60 coins</span>
                  </div>
                </div>
              </div>

              {unlockError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-[13px]">{unlockError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUnlockPromptClose}
                disabled={unlockLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUnlockForMessaging}
                disabled={unlockLoading}
              >
                {unlockLoading ? 'Unlocking...' : 'Unlock Details'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleMessageModalOk}
          >
          <div 
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
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
                If you want to send bulk message, save the candidate.
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
        </ModalPortal>
      )}

    </div>
  );
};

export default FavouriteCandidates;