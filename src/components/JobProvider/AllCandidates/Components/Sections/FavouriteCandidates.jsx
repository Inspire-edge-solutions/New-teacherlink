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
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';
import LoadingState from '../../../../common/LoadingState';
import { HiOutlineArrowRight } from 'react-icons/hi';
import CandidateActionConfirmationModal from '../shared/CandidateActionConfirmationModal';
import ModalPortal from '../../../../common/ModalPortal';

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
  
  // Bulk messaging state
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkChannel, setBulkChannel] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageChars, setBulkMessageChars] = useState(0);
  const [bulkError, setBulkError] = useState('');
  const [coinBalance, setCoinBalance] = useState(null);
  const [instituteInfo, setInstituteInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [showInsufficientCoinsModal, setShowInsufficientCoinsModal] = useState(false);
  const [requiredCoins, setRequiredCoins] = useState(0);
  const candidateLoginCacheRef = useRef({});

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

  const getCandidateLoginDetails = useCallback(async (candidateId) => {
    if (!candidateId) return null;
    if (candidateLoginCacheRef.current[candidateId]) {
      return candidateLoginCacheRef.current[candidateId];
    }
    const details = await CandidateApiService.fetchUserLoginDetails(candidateId);
    if (details) {
      candidateLoginCacheRef.current[candidateId] = details;
    }
    return details;
  }, []);

  const formatPhoneNumber = useCallback((rawPhone) => {
    if (!rawPhone) return null;
    let phone = String(rawPhone).trim();
    if (!phone) return null;
    phone = phone.replace(/\s+/g, '');
    if (phone.startsWith('+')) {
      return phone;
    }
    phone = phone.replace(/^0+/, '');
    if (phone.startsWith('91') && phone.length === 12) {
      return `+${phone}`;
    }
    if (phone.length === 10) {
      return `+91${phone}`;
    }
    return `+${phone}`;
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
    return favouriteCandidates.filter(candidate => selectedCandidates.has(candidate.firebase_uid));
  }, [favouriteCandidates, selectedCandidates]);

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
    // No coin balance check needed - submitting for admin approval, not sending directly
    
    // Debug: Log the structure to see what we have
    console.log('📋 Building summary for candidates:', selectedRecords.map(candidate => ({
      candidateId: candidate.id,
      candidateName: candidate.fullName || candidate.name,
      firebaseUid: candidate.firebase_uid,
      hasFirebaseUid: !!candidate.firebase_uid
    })));
    
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
      // Collect firebase_uid from all selected candidates
      const sendedTo = bulkSummary.candidates.map((candidate, index) => {
        // Try multiple ways to get firebase_uid
        let firebaseUid = null;
        
        // Try direct firebase_uid
        if (candidate.firebase_uid) {
          firebaseUid = candidate.firebase_uid;
        }
        // Try other possible fields
        else if (candidate.uid) {
          firebaseUid = candidate.uid;
        }
        else if (candidate.user_id) {
          firebaseUid = candidate.user_id;
        }
        else if (candidate.id && typeof candidate.id === 'string' && candidate.id.length > 20) {
          // Sometimes id might be the firebase_uid
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
      }).filter(uid => uid !== null && uid !== undefined); // Remove any null/undefined values

      console.log('📤 Collected firebase_uids for sendedTo (candidates):', sendedTo);
      console.log('📊 Total valid candidate uids:', sendedTo.length, 'out of', bulkSummary.candidates.length);

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

      // Get current user's firebase_uid
      const userFirebaseUid = user.firebase_uid || user.uid;
      if (!userFirebaseUid) {
        toast.error('User authentication required.');
        setIsSendingBulk(false);
        return;
      }

      // Validate sendedTo array before sending
      if (!Array.isArray(sendedTo) || sendedTo.length === 0) {
        console.error('❌ Invalid sendedTo array:', sendedTo);
        toast.error('No valid recipients found. Cannot submit message for approval.');
        setIsSendingBulk(false);
        return;
      }

      // Prepare payload for approval API
      // Note: Backend expects 'sendedeTo' (lowercase 'e'), not 'sendedTo'
      // Backend will JSON.stringify the array, so send as array (not string)
      const approvalPayload = {
        firebase_uid: userFirebaseUid,
        message: bulkSummary.message.trim(),
        sendedeTo: sendedTo, // Send as array - backend will JSON.stringify it
        channel: bulkSummary.channel || 'whatsapp', // Store selected channel (whatsapp or rcs)
        isApproved: false,
        isRejected: false,
        reason: ""
      };
      
      // Final validation - ensure sendedeTo is present and is an array
      if (!approvalPayload.sendedeTo || !Array.isArray(approvalPayload.sendedeTo) || approvalPayload.sendedeTo.length === 0) {
        console.error('❌ Validation failed - sendedeTo is invalid:', approvalPayload.sendedeTo);
        toast.error('Invalid recipient data. Please try again.');
        setIsSendingBulk(false);
        return;
      }
      
      console.log('📦 Final approval payload:', {
        firebase_uid: approvalPayload.firebase_uid,
        message: approvalPayload.message.substring(0, 50) + '...',
        sendedeTo: approvalPayload.sendedeTo,
        sendedeToLength: approvalPayload.sendedeTo.length,
        sendedeToType: Array.isArray(approvalPayload.sendedeTo) ? 'array' : typeof approvalPayload.sendedeTo,
        channel: approvalPayload.channel
      });
      
      // Log the actual JSON that will be sent
      console.log('📤 JSON payload to be sent:', JSON.stringify(approvalPayload));

      // Send to approval API
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

      await response.json(); // Response received, no need to use the result
      
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
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="selectAllFavouriteCandidates"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <label htmlFor="selectAllFavouriteCandidates" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                  Select All Candidates on This Page
                  {selectedCandidates.size > 0 && (
                    <span className="text-gray-500 ml-2">({selectedCandidates.size} total selected)</span>
                  )}
                </label>
              </div>
              {selectedCandidates.size > 0 && (
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-brand rounded-lg shadow-lg hover:bg-gradient-primary-hover duration-300 transition-colors"
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
              <h3 className="font-semibold text-[18px] mb-4 text-gray-800">
                Send Bulk Message
              </h3>
              <div className="text-gray-600 text-[15px] leading-relaxed space-y-1">
                <p>
                  <strong>20 coins</strong> per candidate via WhatsApp
                </p>
                <p>
                  <strong>10 coins</strong> per candidate via RCS
                </p>
                {coinBalance !== null && (
                  <p className="text-sm text-gray-500 mt-2">
                    Current balance: <strong>{coinBalance}</strong> coins
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Coins will be deducted after admin approval
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${bulkChannel === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-white text-[#25D366] border-[#25D366]'}`}
                onClick={() => handleChannelSelect('whatsapp')}
              >
                Through WhatsApp
              </button>
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${bulkChannel === 'rcs' ? 'bg-[#0a84ff] text-white border-[#0a84ff]' : 'bg-white text-[#0a84ff] border-[#0a84ff]'}`}
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
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gradient-brand resize-none"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected</span>
                  <span>{bulkMessageChars}/500</span>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="mt-3 text-sm text-red-500 text-left">
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
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3 className="font-semibold text-[18px] text-gray-800">
                Confirm &amp; Submit for Approval
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                You are about to submit a <strong>{bulkSummary.channel === 'whatsapp' ? 'WhatsApp' : 'RCS'}</strong> message request to <strong>{bulkSummary.candidates.length}</strong> candidate{bulkSummary.candidates.length !== 1 ? 's' : ''} for admin approval.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Your message will be reviewed by admin before being sent.
              </p>
            </div>

            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {bulkSummary.candidates.map(candidate => (
                <div key={candidate.firebase_uid} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="font-semibold text-sm text-gray-800">
                    {candidate.fullName || candidate.name || 'Candidate'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {candidate.present_city_name || candidate.city || candidate.permanent_city_name || 'City not available'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-left text-sm text-gray-700 whitespace-pre-line">
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
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3 className="font-semibold text-[18px] text-gray-800">
                Insufficient Coins
              </h3>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                You need <strong>{requiredCoins}</strong> coins to send this bulk message.
              </p>
              <p className="text-gray-600 text-[15px] leading-relaxed">
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


    </div>
  );
};

export default FavouriteCandidates;