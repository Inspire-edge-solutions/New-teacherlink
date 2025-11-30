import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import CandidateCard from '../../AllCandidates/Components/shared/CandidateCard';
import CandidateDetail from '../../AllCandidates/Components/shared/ViewFull';
import ViewShort from '../../AllCandidates/Components/shared/ViewShort';
import CandidateApiService from '../../AllCandidates/Components/shared/CandidateApiService';
import { useAuth } from '../../../../Context/AuthContext';
import LoadingState from '../../../common/LoadingState';
import Pagination from '../../AllCandidates/Components/shared/Pagination';

const RecommendedCandidatesModal = ({ 
  isOpen, 
  onClose, 
  jobId, 
  jobTitle, 
  matchCount 
}) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewType, setViewType] = useState(null); // 'full' or 'short'
  const [candidatePhotos, setCandidatePhotos] = useState({});
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  const [unlockedCandidateIds, setUnlockedCandidateIds] = useState([]);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage] = useState(10);

  // Get unlocked candidates from localStorage
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
          console.error('RecommendedCandidatesModal: Error parsing localStorage entry', key, error);
        }
      }
    }
    return unlockedIds;
  }, [user]);

  // Check if candidate matches job (same logic as notifications)
  const checkCandidateJobMatch = useCallback((candidate, job, preferences, presentAddress) => {
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
  }, []);

  // Fetch recommended candidates for the job
  const fetchRecommendedCandidates = useCallback(async () => {
    if (!isOpen || !jobId || !user) return;
    
    try {
      setLoading(true);
      const userId = user.firebase_uid || user.uid;
      
      // Fetch the job details
      const jobsRes = await axios.get(`https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes?firebase_uid=${userId}`);
      const allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      const job = allJobs.find(j => Number(j.id) === Number(jobId));
      
      if (!job) {
        setCandidates([]);
        setFilteredCandidates([]);
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
      
      // Get applied candidate IDs to exclude them
      const applyRes = await axios.get('https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate');
      const allApplications = Array.isArray(applyRes.data) ? applyRes.data : [];
      const appliedCandidateIds = new Set(
        allApplications
          .filter(app => Number(app.job_id) === Number(jobId))
          .map(app => app.user_id || app.firebase_uid)
          .filter(Boolean)
      );
      
      // Fetch job preferences and present addresses
      const [jobPreferencesRes, presentAddressRes] = await Promise.all([
        axios.get('https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference'),
        axios.get('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress')
      ]);
      
      const allPreferences = Array.isArray(jobPreferencesRes.data) ? jobPreferencesRes.data : [];
      const allAddresses = Array.isArray(presentAddressRes.data) ? presentAddressRes.data : [];
      
      // Match candidates to job
      const matchingCandidates = [];
      
      for (const candidate of approvedCandidates) {
        const candidateId = candidate.firebase_uid;
        
        // Skip if already applied
        if (appliedCandidateIds.has(candidateId)) continue;
        
        // Get candidate preferences and address
        const preferences = allPreferences.find(p => p.firebase_uid === candidateId);
        const presentAddress = allAddresses.find(a => a.firebase_uid === candidateId);
        
        // Check if candidate matches job
        if (checkCandidateJobMatch(candidate, job, preferences, presentAddress)) {
          matchingCandidates.push(candidate);
        }
      }
      
      setCandidates(matchingCandidates);
      setFilteredCandidates(matchingCandidates);
      
      // Fetch user preferences
      const prefs = await CandidateApiService.fetchUserCandidatePreferences(user);
      setSavedCandidates(prefs.savedCandidates);
      setFavouriteCandidates(prefs.favouriteCandidates);
      
      // Get unlocked candidates
      const combinedUnlocked = new Set([
        ...getUnlockedCandidatesFromLocalStorage().map(String),
        ...(prefs.unlockedCandidates || []).map(String)
      ]);
      setUnlockedCandidateIds(Array.from(combinedUnlocked));
      
      // Fetch photos for candidates
      if (matchingCandidates.length > 0) {
        const photoPromises = matchingCandidates.map(async (candidate) => {
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
        setCandidatePhotos(photoMap);
      }
    } catch (error) {
      console.error('Error fetching recommended candidates:', error);
      setCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, jobId, user, checkCandidateJobMatch]);

  useEffect(() => {
    if (isOpen) {
      fetchRecommendedCandidates();
      setViewMode('list');
      setSelectedCandidate(null);
      setViewType(null);
      setCurrentPage(1);
      setShowUnlockPrompt(false);
      setCandidateToUnlock(null);
    }
  }, [isOpen, fetchRecommendedCandidates, getUnlockedCandidatesFromLocalStorage]);

  const handleViewFull = (candidate) => {
    const candidateId = candidate.firebase_uid;
    const isUnlocked = candidateId && unlockedCandidateIds.includes(String(candidateId));

    if (!isUnlocked) {
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      return;
    }

    setSelectedCandidate(candidate);
    setViewType('full');
    setViewMode('detail');
  };

  const handleViewShort = (candidate) => {
    const candidateId = candidate.firebase_uid;
    const isUnlocked = candidateId && unlockedCandidateIds.includes(String(candidateId));

    if (!isUnlocked) {
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      return;
    }

    setSelectedCandidate(candidate);
    setViewType('short');
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCandidate(null);
    setViewType(null);
  };

  const handleSaveCandidate = async (candidate) => {
    if (!user) {
      toast.error("Please login to save candidates.");
      return;
    }
    const candidateId = candidate.firebase_uid;
    const isSaved = savedCandidates.includes(candidateId);
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      
      // Update local state immediately
      if (isSaved) {
        setSavedCandidates(prev => prev.filter(id => id !== candidateId));
        toast.info(`${candidate.fullName || candidate.name || 'Candidate'} removed from saved list!`);
      } else {
        setSavedCandidates(prev => [...prev, candidateId]);
        toast.success(`${candidate.fullName || candidate.name || 'Candidate'} has been saved successfully!`);
      }
      
      // Refresh user preferences to sync with backend
      try {
        const prefs = await CandidateApiService.fetchUserCandidatePreferences(user);
        setSavedCandidates(prefs.savedCandidates);
        setFavouriteCandidates(prefs.favouriteCandidates);
      } catch (prefError) {
        console.error('Error refreshing preferences:', prefError);
        // Don't show error - state already updated
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate. Please try again.');
    }
  };

  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) {
      toast.error("Please login to manage favourites.");
      return;
    }
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, isFavourite);
      
      // Update local state immediately
      if (isFavourite) {
        setFavouriteCandidates(prev => [...prev, candidateId]);
        toast.success(`${candidate.fullName || candidate.name || 'Candidate'} added to favourites!`);
      } else {
        setFavouriteCandidates(prev => prev.filter(id => id !== candidateId));
        toast.info(`${candidate.fullName || candidate.name || 'Candidate'} removed from favourites!`);
      }
      
      // Refresh user preferences to sync with backend
      try {
        const prefs = await CandidateApiService.fetchUserCandidatePreferences(user);
        setSavedCandidates(prefs.savedCandidates);
        setFavouriteCandidates(prefs.favouriteCandidates);
      } catch (prefError) {
        console.error('Error refreshing preferences:', prefError);
        // Don't show error - state already updated
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
      toast.error('Failed to update favourite status. Please try again.');
    }
  };

  const handleUnlockPromptClose = () => {
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
  };

  const handleUnlockPromptViewProfile = () => {
    if (candidateToUnlock) {
      // Bypass unlock check - viewing will unlock the candidate
      setSelectedCandidate(candidateToUnlock);
      setViewType('full');
      setViewMode('detail');
    }
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
  };

  if (!isOpen) return null;

  // Pagination
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // If viewing candidate detail
  if (viewMode === 'detail' && selectedCandidate) {
    if (viewType === 'full') {
      return createPortal(
        <div className="fixed inset-0 w-screen h-screen bg-white z-[9999] overflow-auto">
          <div className="max-w-7xl mx-auto p-4">
            <button
              onClick={handleBackToList}
              className="mb-4 px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors"
            >
              ← Back to Candidates
            </button>
            <CandidateDetail candidate={selectedCandidate} onBack={handleBackToList} />
          </div>
        </div>,
        document.body
      );
    } else if (viewType === 'short') {
      return createPortal(
        <div className="fixed inset-0 w-screen h-screen bg-white z-[9999] overflow-auto">
          <div className="max-w-7xl mx-auto p-4">
            <button
              onClick={handleBackToList}
              className="mb-4 px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors"
            >
              ← Back to Candidates
            </button>
            <ViewShort candidate={selectedCandidate} onBack={handleBackToList} />
          </div>
        </div>,
        document.body
      );
    }
  }

  // Unlock Prompt Modal
  if (showUnlockPrompt && candidateToUnlock) {
    return createPortal(
      <div
        className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[10000] animate-fadeIn overflow-y-auto p-5"
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
            <h3 className="text-xl font-semibold mb-4 text-gray-800 leading-tight tracking-tight">
              Unlock Candidate
            </h3>
            <p className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
              To view {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}'s profile, please unlock their contact details first. View the profile to unlock and access full information.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-lg sm:text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
              onClick={handleUnlockPromptClose}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-lg sm:text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
              onClick={handleUnlockPromptViewProfile}
            >
              View Profile
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Modal content
  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-1 leading-tight tracking-tight">
                Recommended Candidates for "{jobTitle}"
              </h2>
              <p className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
                {matchCount} candidate{matchCount !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <LoadingState
              title="Loading recommended candidates…"
              subtitle="We're finding candidates that match your job requirements."
            />
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight">No matching candidates found.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {currentCandidates.map((candidate) => {
                  const candidateId = candidate.firebase_uid;
                  return (
                    <CandidateCard
                      key={candidateId}
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
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RecommendedCandidatesModal;
