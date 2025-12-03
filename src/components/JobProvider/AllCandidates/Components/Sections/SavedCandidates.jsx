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
const COIN_HISTORY_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';

const SavedCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList,
  onNavigateTab,
  activeTab
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  const [savedCandidates, setSavedCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  const [downloadedCandidates, setDownloadedCandidates] = useState([]);

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
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [showFavouriteConfirmModal, setShowFavouriteConfirmModal] = useState(false);
  const [candidateToFavourite, setCandidateToFavourite] = useState(null);
  
  // Bulk messaging state
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkChannel, setBulkChannel] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageChars, setBulkMessageChars] = useState(0);
  const [bulkError, setBulkError] = useState('');
  const [coinBalance, setCoinBalance] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [instituteInfo, setInstituteInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [showInsufficientCoinsModal, setShowInsufficientCoinsModal] = useState(false);
  const [requiredCoins, setRequiredCoins] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const candidateLoginCacheRef = useRef({});
  const prevActiveTabRef = useRef(null);


  const fetchSavedCandidates = useCallback(async () => {
    if (!user) return;
    
    console.log('🔄 SavedCandidates: Starting fetch...');
    try {
      setLoading(true);
      const [fullCandidates, prefs] = await Promise.all([
        CandidateApiService.fetchCandidates(),
        CandidateApiService.fetchUserCandidatePreferences(user)
      ]);
      
      console.log('📊 SavedCandidates: Full candidates count:', fullCandidates.length);
      console.log('📊 SavedCandidates: Saved IDs from prefs:', prefs.savedCandidates);
      
      // Filter only saved candidates (normalize IDs to strings for comparison)
      const onlySaved = fullCandidates.filter(c => 
        prefs.savedCandidates.includes(String(c.firebase_uid || ''))
      );
      
      console.log('✅ SavedCandidates: Filtered saved count:', onlySaved.length);
      
      setSavedCandidates(onlySaved);
      setFilteredCandidates(onlySaved);
      setFavouriteCandidates(prefs.favouriteCandidates);
      setDownloadedCandidates(prefs.downloadedCandidates);
      // Get unlocked candidate IDs from backend database only (no localStorage)
      setUnlockedCandidateIds((prefs.unlockedCandidates || []).map(String));
      
      const photos = await CandidateApiService.fetchCandidatePhotos(onlySaved);
      setCandidatePhotos(photos);
    } catch (error) {
      console.error('❌ Error fetching saved candidates:', error);
      setSavedCandidates([]);
      setFilteredCandidates([]);
      setUnlockedCandidateIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user && !userLoading) {
      toast.error("Please log in to view candidates.");
      setLoading(false);
      return;
    }
    if (user) fetchSavedCandidates();
  }, [user, userLoading, fetchSavedCandidates]);

  // Refresh when tab becomes active (only when switching TO this tab)
  useEffect(() => {
    const prevTab = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;
    
    // Only fetch if:
    // 1. Tab just became 'saved' (wasn't before)
    // 2. User is logged in
    // 3. Not already loading
    if (activeTab === 'saved' && prevTab !== 'saved' && user && !userLoading && !loading) {
      console.log('🔄 SavedCandidates: Tab became active, refreshing data...');
      fetchSavedCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, userLoading, loading]); // fetchSavedCandidates is stable via useCallback

  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();

    if (!normalizedTerm) {
      setFilteredCandidates(savedCandidates);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(savedCandidates, normalizedTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [savedCandidates, isSearching]);

  const handleSaveCandidate = async (candidate) => {
    if (!user) return toast.error("Please login to save candidates.");
    const isSaved = true; // All in this list are saved
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchSavedCandidates();
      toast.info(`${candidate.fullName || candidate.name || 'Candidate'} removed from saved list!`);
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to update saved status. Please try again.');
    }
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
      await fetchSavedCandidates();
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
    
    const { candidate } = candidateToFavourite;
    
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, true);
      await fetchSavedCandidates();
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
    // Check if unlocked from backend database only (no localStorage)
    const isUnlocked = candidateId && unlockedCandidateIds.includes(candidateId);

    if (!isUnlocked) {
      console.log('SavedCandidates: Candidate not unlocked, prompting unlock:', candidateId);
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      setUnlockError('');
      return;
    }

    console.log('SavedCandidates: Messaging candidate:', candidateId);
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

      // Record coin history for messaging unlock
      try {
        // Get organization ID for the current user (institution)
        let orgId = null;
        try {
          const orgResponse = await axios.get(`${ORGANISATION_API}?firebase_uid=${encodeURIComponent(userId)}`);
          if (orgResponse.status === 200 && Array.isArray(orgResponse.data) && orgResponse.data.length > 0) {
            orgId = orgResponse.data[0].id;
          }
        } catch (orgError) {
          console.error("Error fetching organization data for coin history:", orgError);
        }

        // Get candidate's personal ID and name for coin history
        let unblocked_candidate_id = null;
        let unblocked_candidate_name = null;
        try {
          const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: candidateId } });
          if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
            unblocked_candidate_id = personalRes.data[0].id;
            unblocked_candidate_name = personalRes.data[0].fullName;
          }
        } catch (personalError) {
          console.warn('Could not fetch personal details for coin history:', personalError);
        }

        // Record coin history
        const coinHistoryPayload = {
          firebase_uid: userId,
          candidate_id: orgId,
          job_id: null,
          coin_value: coins - UNLOCK_COST,
          reduction: UNLOCK_COST,
          reason: "Unlocked candidate for messaging",
          unblocked_candidate_id,
          unblocked_candidate_name
        };

        await axios.post(COIN_HISTORY_API, coinHistoryPayload);
        console.log('Coin history recorded successfully for messaging unlock');
      } catch (historyError) {
        console.error('Error recording coin history for messaging unlock:', historyError);
        // Don't fail the unlock if history recording fails
      }

      // Update local state
      const candidateIdStr = String(candidateId);
      setUnlockedCandidateIds(prev => [...prev, candidateIdStr]);
      
      // Note: Unlock status is stored in backend database only (no localStorage)

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

  // Bulk messaging handlers
  const handleCheckboxChange = useCallback((candidateId) => {
    setSelectedCandidates((prevSelected) => {
      const next = new Set(prevSelected);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectAll((prev) => {
      const nextSelectAll = !prev;
      setSelectedCandidates((prevSelected) => {
        const next = new Set(prevSelected);
        if (nextSelectAll) {
          currentCandidates.forEach((candidate) => {
            next.add(candidate.firebase_uid);
          });
        } else {
          currentCandidates.forEach((candidate) => {
            next.delete(candidate.firebase_uid);
          });
        }
        return next;
      });
      return nextSelectAll;
    });
  }, [currentCandidates]);

  useEffect(() => {
    setSelectedCandidates(new Set());
    setSelectAll(false);
  }, [filteredCandidates]);

  useEffect(() => {
    const pageIds = new Set(currentCandidates.map(candidate => candidate.firebase_uid));
    const selectedFromPage = Array.from(selectedCandidates).filter(id => pageIds.has(id));
    setSelectAll(pageIds.size > 0 && selectedFromPage.length === pageIds.size);
  }, [currentCandidates, selectedCandidates]);

  const resetBulkMessageForm = useCallback(() => {
    setBulkChannel(null);
    setBulkMessage('');
    setBulkMessageChars(0);
    setBulkError('');
    setBulkSummary(null);
    setIsSendingBulk(false);
  }, []);

  const handleOpenBulkMessageModal = useCallback(() => {
    if (selectedCandidates.size === 0) {
      toast.info('Select at least one candidate to send a message.');
      return;
    }
    resetBulkMessageForm();
    setShowBulkMessageModal(true);
  }, [selectedCandidates.size, resetBulkMessageForm]);

  const handleCloseBulkMessageModal = useCallback(() => {
    setShowBulkMessageModal(false);
    resetBulkMessageForm();
  }, [resetBulkMessageForm]);

  const handleChannelSelect = useCallback((channel) => {
    setBulkChannel(channel);
    setBulkError('');
  }, []);

  const handleBulkMessageChange = useCallback((event) => {
    const value = event.target.value || '';
    if (value.length <= 500) {
      setBulkMessage(value);
      setBulkMessageChars(value.length);
    } else {
      const trimmed = value.slice(0, 500);
      setBulkMessage(trimmed);
      setBulkMessageChars(500);
    }
  }, []);

  useEffect(() => {
    if (!showBulkMessageModal) return;
    (async () => {
      try {
        const coins = await CandidateApiService.getUserCoins(user);
        setCoinBalance(coins);
        const userId = user?.firebase_uid || user?.uid || user?.id;
        if (userId) {
          const instituteDetails = await CandidateApiService.fetchUserLoginDetails(userId);
          setInstituteInfo(instituteDetails);
        }
      } catch (error) {
        console.error('Error preparing bulk messaging modal:', error);
      }
    })();
  }, [showBulkMessageModal, user]);

  const getSelectedCandidateRecords = useCallback(() => {
    if (selectedCandidates.size === 0) return [];
    return savedCandidates.filter(candidate => selectedCandidates.has(candidate.firebase_uid));
  }, [savedCandidates, selectedCandidates]);

  const handlePrepareBulkSend = useCallback(() => {
    if (!bulkChannel) {
      setBulkError('Choose a channel to continue.');
      return;
    }
    const trimmedMessage = bulkMessage.trim();
    if (!trimmedMessage) {
      setBulkError('Enter a message to send.');
      return;
    }
    const selectedRecords = getSelectedCandidateRecords();
    if (selectedRecords.length === 0) {
      setBulkError('Could not find the selected candidates.');
      return;
    }
    
    setBulkSummary({
      channel: bulkChannel,
      message: trimmedMessage,
      candidates: selectedRecords
    });
    setShowConfirmModal(true);
    setShowBulkMessageModal(false);
  }, [bulkChannel, bulkMessage, getSelectedCandidateRecords]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmModal(false);
    if (bulkSummary) {
      setBulkChannel(bulkSummary.channel);
      setBulkMessage(bulkSummary.message);
      setBulkMessageChars(bulkSummary.message.length);
      setBulkSummary(null);
      setBulkError('');
      setShowBulkMessageModal(true);
    } else {
      resetBulkMessageForm();
    }
  }, [bulkSummary, resetBulkMessageForm]);

  const handleCloseInsufficientCoinsModal = useCallback(() => {
    setShowInsufficientCoinsModal(false);
    setRequiredCoins(0);
  }, []);

  const handleRechargeNavigate = useCallback(() => {
    setShowInsufficientCoinsModal(false);
    navigate('/provider/my-account');
  }, [navigate]);

  const handleConfirmSend = useCallback(async () => {
    if (!bulkSummary || !user) return;
    setIsSendingBulk(true);
    try {
      const sendedTo = bulkSummary.candidates.map((candidate, index) => {
        let firebaseUid = null;
        
        if (candidate.firebase_uid) {
          firebaseUid = candidate.firebase_uid;
        } else if (candidate.uid) {
          firebaseUid = candidate.uid;
        } else if (candidate.user_id) {
          firebaseUid = candidate.user_id;
        } else if (candidate.id && typeof candidate.id === 'string' && candidate.id.length > 20) {
          firebaseUid = candidate.id;
        }
        
        if (!firebaseUid) {
          console.warn(`⚠️ No firebase_uid found for candidate at index ${index}:`, {
            candidateId: candidate.id,
            candidateName: candidate.fullName || candidate.name,
            hasFirebaseUid: !!candidate.firebase_uid,
            candidateKeys: candidate ? Object.keys(candidate) : []
          });
        }
        
        return firebaseUid;
      }).filter(uid => uid !== null && uid !== undefined);

      if (sendedTo.length === 0) {
        toast.error('No valid candidates found in selected list. Please ensure candidates have valid firebase_uid.');
        setIsSendingBulk(false);
        return;
      }
      
      if (sendedTo.length < bulkSummary.candidates.length) {
        const missingCount = bulkSummary.candidates.length - sendedTo.length;
        console.warn(`⚠️ ${missingCount} candidate(s) missing firebase_uid and will be skipped`);
        toast.warning(`${missingCount} candidate(s) missing firebase_uid and will be skipped.`);
      }

      const userFirebaseUid = user.firebase_uid || user.uid;
      if (!userFirebaseUid) {
        toast.error('User authentication required.');
        setIsSendingBulk(false);
        return;
      }

      if (!Array.isArray(sendedTo) || sendedTo.length === 0) {
        console.error('❌ Invalid sendedTo array:', sendedTo);
        toast.error('No valid recipients found. Cannot submit message for approval.');
        setIsSendingBulk(false);
        return;
      }

      const approvalPayload = {
        firebase_uid: userFirebaseUid,
        message: bulkSummary.message.trim(),
        sendedeTo: sendedTo,
        channel: bulkSummary.channel || 'whatsapp',
        isApproved: false,
        isRejected: false,
        reason: ""
      };
      
      if (!approvalPayload.sendedeTo || !Array.isArray(approvalPayload.sendedeTo) || approvalPayload.sendedeTo.length === 0) {
        console.error('❌ Validation failed - sendedeTo is invalid:', approvalPayload.sendedeTo);
        toast.error('Invalid recipient data. Please try again.');
        setIsSendingBulk(false);
        return;
      }

      const response = await fetch(
        'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/approveMessage',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approvalPayload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      await response.json();
      
      toast.success(`Bulk message request submitted successfully! Your message is pending admin approval.`);
      
    } catch (error) {
      console.error('Error submitting bulk message for approval:', error);
      toast.error('Failed to submit message request. Please try again.');
    } finally {
      setIsSendingBulk(false);
      setShowConfirmModal(false);
      setBulkSummary(null);
      resetBulkMessageForm();
      setSelectedCandidates(new Set());
      setSelectAll(false);
    }
  }, [bulkSummary, resetBulkMessageForm, user]);

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
          title="Bringing in your saved candidates…"
          subtitle="We’re retrieving the profiles you’ve bookmarked so you can review them."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800 text-center mb-2 text-lg sm:text-base leading-normal tracking-tight">
          Please log in to view candidates.
        </p>
        <p className="text-red-600 text-center text-lg sm:text-base leading-normal tracking-tight">
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
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 sm:max-w-md">
            <SearchBar onSearch={handleSearch} placeholder="Search saved candidates..." />
          </div>
          <div className="w-full sm:w-auto flex-shrink-0">
            <RecordsPerPageDropdown
              itemsPerPage={candidatesPerPage}
              onItemsPerPageChange={(v) => { setCandidatesPerPage(v); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0 leading-tight tracking-tight">
          {isSearching
            ? `Found ${filteredCandidates.length} saved candidate${filteredCandidates.length !== 1 ? 's' : ''}`
            : `${savedCandidates.length} Saved Candidate${savedCandidates.length !== 1 ? 's' : ''}`
          }
        </h3>
          </div>

      {currentCandidates.length > 0 ? (
        <div className="candidates-results">
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="selectAllSavedCandidates"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <label htmlFor="selectAllSavedCandidates" className="ml-2 text-lg sm:text-base font-medium text-gray-700 cursor-pointer leading-normal tracking-tight">
                  Select All Candidates on This Page
                  {selectedCandidates.size > 0 && (
                    <span className="text-gray-500 ml-2">({selectedCandidates.size} total selected)</span>
                  )}
                </label>
              </div>
              {selectedCandidates.size > 0 && (
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-base font-semibold text-white bg-gradient-brand rounded-lg shadow-lg hover:bg-gradient-primary-hover duration-300 transition-colors leading-normal tracking-tight"
                  onClick={handleOpenBulkMessageModal}
                >
                  <span role="img" aria-label="message">💬</span>
                  Send Message
                </button>
              )}
            </div>
          </div>
          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              const candidateId = candidate.firebase_uid;
              return (
                <CandidateCard
                  key={candidateId}
                  candidate={candidate}
                  isSaved={true}
                  isFavourite={favouriteCandidates.includes(candidateId)}
                  isDownloaded={downloadedCandidates.includes(candidateId)}
                  loading={loading}
                  onViewFull={handleViewFull}
                  onViewShort={handleViewShort}
                  onSave={handleSaveCandidate}
                  onToggleFavourite={handleToggleFavourite}
                  onMessage={handleMessage}
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
          <div className="flex flex-col items-center justify-center gap-4">
            <img 
              src={noCandidateIllustration} 
              alt="No saved candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-2 mx-auto"
            />
            <p className="text-gray-600 text-lg sm:text-base font-medium leading-normal tracking-tight">
              {isSearching 
                ? 'No saved candidates found matching your search.'
                : 'You haven\'t saved any candidates yet.'
              }
            </p>
            {!isSearching && (
              <button
                className="px-4 py-2 bg-gradient-brand text-white rounded-lg text-base font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 leading-normal tracking-tight"
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab('all');
                    return;
                  }
                  const allTab = document.querySelector('[data-tab="all"]');
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
              <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                Unlock Candidate
              </h3>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight mb-4">
                To message {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}, please unlock their contact details first.
              </p>
              
              {/* Coin Breakdown */}
              <div className="bg-white/80 rounded-lg p-4 mb-4">
                <p className="text-gray-700 text-lg sm:text-base font-medium mb-2 leading-snug tracking-tight">Coin Deduction:</p>
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
                    <span>Profile Unlock:</span>
                    <span className="font-semibold">50 coins</span>
                  </div>
                  <div className="flex justify-between text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
                    <span>Messaging:</span>
                    <span className="font-semibold">10 coins</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between text-lg sm:text-base font-semibold text-gray-800 leading-snug tracking-tight">
                    <span>Total:</span>
                    <span>60 coins</span>
                  </div>
                </div>
              </div>

              {unlockError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-lg sm:text-base leading-normal tracking-tight">{unlockError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
                onClick={handleUnlockPromptClose}
                disabled={unlockLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
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
              <h3 className="font-semibold text-xl mb-4 text-center text-gray-800 leading-tight tracking-tight">
                Message Candidate
              </h3>
              <p className="text-gray-600 text-lg sm:text-base mb-6 text-center leading-normal tracking-tight">
                To send a bulk message, select multiple candidates using the checkboxes and click <strong>Send Message</strong>. Choose <strong>Continue Single</strong> below to message just this candidate.
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

      {/* Bulk Message Modal */}
      {showBulkMessageModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleCloseBulkMessageModal}
          >
            <div
              className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCloseBulkMessageModal}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center">
              <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                Send Bulk Message
              </h3>
              <div className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight space-y-1">
                <p>
                  <strong>20 coins</strong> per candidate via WhatsApp
                </p>
                <p>
                  <strong>10 coins</strong> per candidate via RCS
                </p>
                {coinBalance !== null && (
                  <p className="text-lg sm:text-base text-gray-500 mt-2 leading-normal tracking-tight">
                    Current balance: <strong>{coinBalance}</strong> coins
                  </p>
                )}
                <p className="text-lg sm:text-base text-gray-400 mt-2 leading-normal tracking-tight">
                  Coins will be deducted after admin approval
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-lg sm:text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight ${bulkChannel === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-white text-[#25D366] border-[#25D366]'}`}
                onClick={() => handleChannelSelect('whatsapp')}
              >
                Through WhatsApp
              </button>
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-lg sm:text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight ${bulkChannel === 'rcs' ? 'bg-[#0a84ff] text-white border-[#0a84ff]' : 'bg-white text-[#0a84ff] border-[#0a84ff]'}`}
                onClick={() => handleChannelSelect('rcs')}
              >
                Through RCS
              </button>
            </div>

            {bulkChannel && (
              <div className="space-y-3">
                <textarea
                  value={bulkMessage}
                  onChange={handleBulkMessageChange}
                  maxLength={500}
                  rows={5}
                  placeholder="Enter your message here..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-lg sm:text-base focus:outline-none focus:ring-2 focus:ring-gradient-brand resize-none leading-normal tracking-tight"
                />
                <div className="flex items-center justify-between text-lg sm:text-base text-gray-500 leading-normal tracking-tight">
                  <span>{selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected</span>
                  <span>{bulkMessageChars}/500</span>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="mt-3 text-lg sm:text-base text-red-500 text-left leading-normal tracking-tight">
                {bulkError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCloseBulkMessageModal}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
                onClick={handlePrepareBulkSend}
                disabled={!bulkChannel || bulkMessageChars === 0}
              >
                Review & Send
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Bulk Message Confirmation Modal */}
      {showConfirmModal && bulkSummary && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleCancelConfirmation}
          >
            <div
              className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-lg relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCancelConfirmation}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center space-y-2">
              <h3 className="font-semibold text-xl text-gray-800 leading-tight tracking-tight">
                Confirm &amp; Submit for Approval
              </h3>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">
                You are about to submit a <strong>{bulkSummary.channel === 'whatsapp' ? 'WhatsApp' : 'RCS'}</strong> message request to <strong>{bulkSummary.candidates.length}</strong> candidate{bulkSummary.candidates.length !== 1 ? 's' : ''} for admin approval.
              </p>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">
                Your message will be reviewed by admin before being sent.
              </p>
            </div>

            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {bulkSummary.candidates.map(candidate => (
                <div key={candidate.firebase_uid} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="font-semibold text-lg sm:text-base text-gray-800 leading-snug tracking-tight">
                    {candidate.fullName || candidate.name || 'Candidate'}
                  </div>
                  <div className="text-lg sm:text-base text-gray-500 leading-normal tracking-tight">
                    {candidate.present_city_name || candidate.city || candidate.permanent_city_name || 'City not available'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-left text-lg sm:text-base text-gray-700 whitespace-pre-line leading-normal tracking-tight">
              {bulkSummary.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCancelConfirmation}
                disabled={isSendingBulk}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
                onClick={handleConfirmSend}
                disabled={isSendingBulk}
              >
                {isSendingBulk ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Insufficient Coins Modal */}
      {showInsufficientCoinsModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleCloseInsufficientCoinsModal}
          >
          <div
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={handleCloseInsufficientCoinsModal}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center space-y-3">
              <h3 className="font-semibold text-xl text-gray-800 leading-tight tracking-tight">
                Insufficient Coins
              </h3>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">
                You need <strong>{requiredCoins}</strong> coins to send this bulk message.
              </p>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">
                Current balance: <strong>{coinBalance ?? 0}</strong> coins. You are short by <strong>{Math.max(requiredCoins - (coinBalance ?? 0), 0)}</strong> coins.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={handleCloseInsufficientCoinsModal}
              >
                Close
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl"
                onClick={handleRechargeNavigate}
              >
                Recharge Now
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Favourite Confirmation Modal */}
      <CandidateActionConfirmationModal
        isOpen={showFavouriteConfirmModal && !!candidateToFavourite}
        actionType="favorite"
        onConfirm={handleConfirmFavourite}
        onCancel={handleCancelFavourite}
      />
    </div>
  );
};

export default SavedCandidates;