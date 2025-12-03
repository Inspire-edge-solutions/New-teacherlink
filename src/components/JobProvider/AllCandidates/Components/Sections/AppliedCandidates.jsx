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
import useBulkCandidateActions from '../hooks/useBulkCandidateActions';
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';
import LoadingState from '../../../../common/LoadingState';
import CandidateActionConfirmationModal from '../shared/CandidateActionConfirmationModal';
import ModalPortal from '../../../../common/ModalPortal';

const REDEEM_API = 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem';
const COIN_HISTORY_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';

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
  const [recommendedCandidates, setRecommendedCandidates] = useState([]);
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

  const STATUS_OPTIONS = [
    'Not Selected',
    'Selected',
    'Interview Scheduled',
    'Profile in Review'
  ];

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [showFavouriteConfirmModal, setShowFavouriteConfirmModal] = useState(false);
  const [candidateToFavourite, setCandidateToFavourite] = useState(null);


  // Fetch recommended candidates based on posted jobs
  const fetchRecommendedCandidates = useCallback(async () => {
    if (!user) return;
    
    try {
      const userId = user.firebase_uid || user.uid;
      
      // Fetch provider's posted jobs
      const jobsResponse = await axios.get(
        `https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobPosting?firebase_uid=${userId}`
      );
      
      const allJobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : [];
      const userJobs = allJobs.filter(job => 
        (job.firebase_uid === userId || job.user_id === userId || job.posted_by === userId) &&
        job.isApproved === 1 &&
        job.is_closed !== 1
      );
      
      if (userJobs.length === 0) {
        setRecommendedCandidates([]);
        return;
      }
      
      // Fetch all approved candidates
      const [allCandidates, approvedUids] = await Promise.all([
        CandidateApiService.fetchCandidates(),
        CandidateApiService.fetchApprovedCandidates()
      ]);
      
      const approvedCandidates = CandidateApiService.filterApprovedCandidates(
        allCandidates,
        approvedUids
      );
      
      // Get applied candidate IDs to exclude them (use current state)
      const appliedCandidateIds = new Set(
        appliedCandidates.map(c => c.firebase_uid).filter(Boolean)
      );
      
      // Fetch job preferences and present addresses for all candidates
      const [jobPreferencesRes, presentAddressRes] = await Promise.all([
        axios.get('https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference'),
        axios.get('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress')
      ]);
      
      const allPreferences = Array.isArray(jobPreferencesRes.data) ? jobPreferencesRes.data : [];
      const allAddresses = Array.isArray(presentAddressRes.data) ? presentAddressRes.data : [];
      
      // Match candidates to jobs
      const recommended = [];
      const recommendedIds = new Set();
      
      for (const job of userJobs) {
        for (const candidate of approvedCandidates) {
          const candidateId = candidate.firebase_uid;
          
          // Skip if already applied or already in recommended list
          if (appliedCandidateIds.has(candidateId) || recommendedIds.has(candidateId)) {
            continue;
          }
          
          // Get candidate preferences and address
          const preferences = allPreferences.find(p => p.firebase_uid === candidateId);
          const presentAddress = allAddresses.find(a => a.firebase_uid === candidateId);
          
          // Check if candidate matches job (same logic as RecommendedJobs but reversed)
          if (checkCandidateJobMatch(candidate, job, preferences, presentAddress)) {
            recommended.push({
              ...candidate,
              matchedJobId: job.id,
              matchedJobTitle: job.job_title,
              isRecommended: true
            });
            recommendedIds.add(candidateId);
          }
        }
      }
      
      setRecommendedCandidates(recommended);
      
      // Fetch photos for recommended candidates
      if (recommended.length > 0) {
        const photoPromises = recommended.map(async (candidate) => {
          const candidateUserId = candidate.firebase_uid;
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
        // Merge with existing photos
        setCandidatePhotos(prev => ({ ...prev, ...photoMap }));
      }
    } catch (error) {
      console.error('Error fetching recommended candidates:', error);
      setRecommendedCandidates([]);
    }
  }, [user, appliedCandidates]);

  // Check if candidate matches job (reverse of RecommendedJobs logic)
  const checkCandidateJobMatch = (candidate, job, preferences, presentAddress) => {
    if (!preferences && !presentAddress) return false;
    
    let matchCount = 0;
    
    // 1. Job type match
    if (preferences) {
      const jobType = job.job_type ? job.job_type.toLowerCase() : '';
      if (preferences.full_time_online === "1" && (
        jobType === "online" || jobType === "remote" || jobType === "workfromhome" ||
        jobType === "wfh" || jobType.includes("online")
      )) {
        matchCount++;
      } else if (preferences.full_time_offline === "1" && (
        jobType === "offline" || jobType === "fulltime" || jobType === "parttime" ||
        jobType === "fullpart" || jobType === "full_time" || jobType === "part_time" ||
        jobType.includes("time") || jobType === ""
      )) {
        matchCount++;
      }
    }
    
    // 2. Salary range match
    if (preferences && preferences.expected_salary && job.min_salary && job.max_salary) {
      const prefSalary = preferences.expected_salary;
      const jobMinSalary = parseInt(job.min_salary);
      const jobMaxSalary = parseInt(job.max_salary);
      
      if (prefSalary === "20k_40k" && jobMinSalary >= 20000 && jobMaxSalary <= 40000) {
        matchCount++;
      } else if (prefSalary === "40k_60k" && jobMinSalary >= 40000 && jobMaxSalary <= 60000) {
        matchCount++;
      } else if (prefSalary === "60k_80k" && jobMinSalary >= 60000 && jobMaxSalary <= 80000) {
        matchCount++;
      } else if (prefSalary === "80k_above" && jobMinSalary >= 80000) {
        matchCount++;
      }
    }
    
    // 3. Teaching subjects match
    if (preferences && preferences.teaching_subjects && job.core_subjects) {
      const userSubjects = Array.isArray(preferences.teaching_subjects) 
        ? preferences.teaching_subjects 
        : [preferences.teaching_subjects];
      const jobSubjects = Array.isArray(job.core_subjects) 
        ? job.core_subjects 
        : [job.core_subjects];
      
      const hasSubjectMatch = userSubjects.some(userSubject => 
        jobSubjects.some(jobSubject => 
          jobSubject.toLowerCase().includes(userSubject.toLowerCase()) ||
          userSubject.toLowerCase().includes(jobSubject.toLowerCase())
        )
      );
      
      if (hasSubjectMatch || (job.job_title && userSubjects.some(us => 
        job.job_title.toLowerCase().includes(us.toLowerCase()) ||
        us.toLowerCase().includes(job.job_title.toLowerCase())
      ))) {
        matchCount++;
      }
    }
    
    // 4. Preferred country match
    if (preferences && preferences.preferred_country && job.country) {
      if (preferences.preferred_country.toLowerCase() === job.country.toLowerCase()) {
        matchCount++;
      }
    }
    
    // 5. Preferred state match
    if (preferences && preferences.preferred_state && job.state_ut) {
      if (preferences.preferred_state.toLowerCase() === job.state_ut.toLowerCase()) {
        matchCount++;
      }
    }
    
    // 6. Preferred city match
    if (preferences && preferences.preferred_city && job.city) {
      if (preferences.preferred_city.toLowerCase() === job.city.toLowerCase()) {
        matchCount++;
      }
    }
    
    // 7. Teaching grades match
    if (preferences && preferences.teaching_grades) {
      const userGrades = Array.isArray(preferences.teaching_grades) 
        ? preferences.teaching_grades 
        : [preferences.teaching_grades];
      
      if (job.job_title && userGrades.some(ug => 
        job.job_title.toLowerCase().includes(ug.toLowerCase()) ||
        ug.toLowerCase().includes(job.job_title.toLowerCase())
      )) {
        matchCount++;
      } else if (job.core_subjects) {
        const jobSubjects = Array.isArray(job.core_subjects) 
          ? job.core_subjects 
          : [job.core_subjects];
        if (userGrades.some(ug => 
          jobSubjects.some(js => 
            js.toLowerCase().includes(ug.toLowerCase()) ||
            ug.toLowerCase().includes(js.toLowerCase())
          )
        )) {
          matchCount++;
        }
      }
    }
    
    // 8. Present address state match
    if (presentAddress && presentAddress.state_name && job.state_ut) {
      if (presentAddress.state_name.toLowerCase() === job.state_ut.toLowerCase()) {
        matchCount++;
      }
    }
    
    // 9. Present address city match
    if (presentAddress && presentAddress.city_name && job.city) {
      if (presentAddress.city_name.toLowerCase() === job.city.toLowerCase()) {
        matchCount++;
      }
    }
    
    // Require at least 2 matches
    return matchCount >= 2;
  };

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
      // Get unlocked candidates from backend database only (no localStorage)
      const backendUnlocked = (prefs.unlockedCandidates || []).map(String);
      setUnlockedCandidateIds(backendUnlocked);
      
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
      setUnlockedCandidateIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch recommended candidates after applied candidates are loaded
  useEffect(() => {
    if (appliedCandidates.length >= 0 && user) {
      fetchRecommendedCandidates();
    }
  }, [appliedCandidates, user, fetchRecommendedCandidates]);

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

  // Handle save candidate - saves directly without coin deduction modal
  const handleSaveCandidate = async (candidate) => {
    if (!user) return toast.error("Please login to save candidates.");
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    
    // Save directly without showing any confirmation modal
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
    
    // If adding to favourites, show confirmation modal first
    if (isFavourite) {
      setCandidateToFavourite({ candidateId, candidate, isFavourite });
      setShowFavouriteConfirmModal(true);
      return;
    }
    
    // If removing from favourites, proceed directly
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
      await fetchAppliedCandidates();
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
    const userId = user?.firebase_uid || user?.uid;
    // Check if unlocked and not expired (30 days)
    // Check if unlocked from backend database only (no localStorage)
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
    setUnlockError('');
    setUnlockLoading(false);
  };

  const handleUnlockPromptViewProfile = () => {
    if (candidateToUnlock) {
      handleViewFull(candidateToUnlock);
    }
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
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
    renderProfileTypeModal,
    renderMobilePrintLoader
  } = useBulkCandidateActions({
    filteredCandidates,
    currentCandidates,
    getCandidateId: (candidate) => {
      // Use applicationId if available, otherwise fallback to firebase_uid
      return candidate.applicationId || candidate.firebase_uid;
    },
    documentTitlePrefix: 'Selected Applied Candidates'
  });

  const getCandidateKey = useCallback((candidate) => {
    if (!candidate) return null;
    return candidate.applicationId || `${candidate.job_id}_${candidate.firebase_uid || candidate.user_id}`;
  }, []);

  const getCandidateStatus = useCallback((candidate) => {
    if (!candidate) return 'Profile in Review';
    const statuses = [
      candidate.status,
      candidate.application_status,
      candidate.stage,
      candidate.status_text,
      candidate.current_status
    ].filter(Boolean);

    const normalized = String(statuses[0] || '').trim();
    if (!normalized) return 'Profile in Review';
    if (/not\s*selected/i.test(normalized)) return 'Not Selected';
    if (/selected/i.test(normalized)) return 'Selected';
    if (/interview/i.test(normalized)) return 'Interview Scheduled';
    if (/review|screen/i.test(normalized)) return 'Profile in Review';
    return normalized;
  }, []);

  const updateCandidateCollections = useCallback((candidateKey, updater) => {
    if (!candidateKey || typeof updater !== 'function') return;

    const applyUpdate = (list) =>
      Array.isArray(list)
        ? list.map((candidate) =>
            getCandidateKey(candidate) === candidateKey ? updater(candidate) : candidate
          )
        : list;

    setAppliedCandidates((prev) => applyUpdate(prev));
    setFilteredCandidates((prev) => applyUpdate(prev));
  }, [getCandidateKey]);

  const handleStatusChange = useCallback(
    async (candidate, newStatus) => {
      if (!candidate) return;

      const candidateKey = getCandidateKey(candidate);
      const previousStatus = getCandidateStatus(candidate);

      // Optimistically update UI
      updateCandidateCollections(candidateKey, (existing) => ({
        ...existing,
        status: newStatus,
        application_status: newStatus
      }));

      try {
        await CandidateApiService.updateAppliedCandidateStatus(candidate, newStatus);
        // Refresh data from backend to ensure persistence
        await fetchAppliedCandidates();
        toast.success("Status updated successfully");
      } catch (error) {
        toast.error(error.message || 'Failed to update status. Please try again.');
        // Revert optimistic update on error
        updateCandidateCollections(candidateKey, (existing) => ({
          ...existing,
          status: previousStatus,
          application_status: previousStatus
        }));
      }
    },
    [getCandidateKey, getCandidateStatus, updateCandidateCollections, fetchAppliedCandidates]
  );

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
        <p className="text-red-800 text-center mb-2 text-lg sm:text-base leading-normal tracking-tight">
          Please log in to view candidates.
        </p>
        <p className="text-red-600 text-center text-lg sm:text-base leading-normal tracking-tight">
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 sm:max-w-md">
            <SearchBar onSearch={handleSearch} placeholder="Search applied candidates..." />
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-2 mb-2 sm:mb-0">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0 shrink-0 leading-tight tracking-tight">
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
              <label htmlFor="selectAllAppliedCandidates" className="ml-2 text-lg sm:text-base font-medium text-gray-700 cursor-pointer leading-normal tracking-tight">
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
                candidateSelectionId={candidateSelectionId}
                onMessage={handleMessage}
                showStatusControl
                statusValue={getCandidateStatus(candidate)}
                statusOptions={STATUS_OPTIONS}
                onStatusChange={(newStatus) => handleStatusChange(candidate, newStatus)}
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
            <p className="text-gray-600 text-lg sm:text-base font-medium leading-normal tracking-tight">
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

      {/* Recommended Candidates Section */}
      {recommendedCandidates.length > 0 && (
        <div className="mb-6 mt-6 p-4 bg-[#F0D8D9] rounded-lg">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 leading-tight tracking-tight">
            💡 Recommended Candidates ({recommendedCandidates.length})
          </h3>
          <p className="text-lg sm:text-base text-gray-700 mb-4 leading-normal tracking-tight">
            These candidates match your posted jobs but haven't applied yet. Consider reaching out to them!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedCandidates.slice(0, 6).map((candidate) => {
              const candidateId = candidate.firebase_uid;
              return (
                <div key={`recommended-${candidateId}`} className="[&>div]:mb-0">
                  <CandidateCard
                    candidate={candidate}
                    isSaved={savedCandidates.includes(candidateId)}
                    isFavourite={favouriteCandidates.includes(candidateId)}
                    loading={false}
                    onViewFull={handleViewFull}
                    onViewShort={handleViewShort}
                    onSave={handleSaveCandidate}
                    onToggleFavourite={handleToggleFavourite}
                    candidatePhoto={candidatePhotos[candidateId]}
                    showCheckbox={false}
                    onMessage={handleMessage}
                    forceMobileLayout={true}
                  />
                </div>
              );
            })}
          </div>
          {recommendedCandidates.length > 6 && (
            <p className="text-lg sm:text-base text-gray-600 mt-3 text-center leading-normal tracking-tight">
              Showing 6 of {recommendedCandidates.length} recommended candidates
            </p>
          )}
        </div>
      )}

      {/* Hidden Print Wrapper - renders all selected profiles for printing */}
      {renderPrintWrapper()}

      {/* Profile Type Selection Modal for Print/Download */}
      {renderProfileTypeModal()}

      {/* Print Loader Overlay */}
      {renderMobilePrintLoader()}

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
              <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                Unlock Candidate Contact Details
              </h3>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight mb-4">
                To start messaging {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}, you'll need to unlock their contact information first. <span className="font-semibold">Unlocking costs 60 coins</span> (one-time payment) and gives you full access to their profile. After unlocking, <span className="font-semibold">each message you sent costs 10 coins</span>.
              </p>

              {unlockError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-left">
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
                {unlockLoading ? 'Unlocking...' : 'Confirm'}
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
                If you want to send bulk message, add candidate to favourite
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
                onClick={handleMessageModalOk}
              >
                Ok
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
                onClick={handleMessageModalContinue}
              >
                Continue Single
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

export default AppliedCandidates;