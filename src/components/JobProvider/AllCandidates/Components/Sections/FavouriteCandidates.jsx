import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

// Profile Type Selection Modal for bulk operations
const ProfileTypeModal = ({ isOpen, onClose, onConfirm, selectedCount, isDownloading }) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { 
      window.removeEventListener('keydown', handler); 
      document.body.style.overflow = prev; 
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h5 className="text-lg font-medium m-0">Choose Profile Type</h5>
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="text-2xl leading-none border-none bg-transparent cursor-pointer hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <p className="mb-3 text-sm">
            Select which profile layout to use for {selectedCount} selected candidate(s).
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              disabled={isDownloading}
              className="px-4 py-2 bg-gradient-brand text-white rounded-md hover:opacity-90 disabled:opacity-50"
              onClick={() => onConfirm('short')}
            >
              Short Profile
            </button>
            <button
              disabled={isDownloading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onConfirm('full')}
            >
              Complete Profile
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FavouriteCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  // Candidates data state
  const [allCandidates, setAllCandidates] = useState([]);
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

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);
  
  // Bulk selection state
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [showProfileTypeModal, setShowProfileTypeModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
      
      setAllCandidates(fullCandidates);
      setFavouriteCandidates(onlyFavourites);
      setFilteredCandidates(onlyFavourites);
      setSavedCandidates(prefs.savedCandidates);
      setDownloadedCandidates(prefs.downloadedCandidates);
      
      // Fetch photos
      const photos = await CandidateApiService.fetchCandidatePhotos(onlyFavourites);
      setCandidatePhotos(photos);
    } catch (error) {
      console.error('Error fetching favourite candidates:', error);
      setFavouriteCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    if (!searchTerm) {
      setIsSearching(false);
      setFilteredCandidates(favouriteCandidates);
      setCurrentPage(1);
      return;
    }
    
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(favouriteCandidates, searchTerm);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [favouriteCandidates]);

  // Handle save candidate
  const handleSaveCandidate = async (candidate) => {
    if (!user) {
      toast.error("Please login to save candidates.");
      return;
    }

    const isSaved = savedCandidates.includes(candidate.firebase_uid);
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

  // Handle view short profile
  const handleViewShort = (candidate) => {
    console.log('FavouriteCandidates: Viewing short profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'short');
  };

  // Handle message candidate - show modal
  const handleMessage = (candidate) => {
    console.log('FavouriteCandidates: Messaging candidate:', candidate.firebase_uid);
    setCandidateToMessage(candidate);
    setShowMessageModal(true);
  };

  // Handle "Ok" button - close modal, stay on page
  const handleMessageModalOk = () => {
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  // Handle "Continue Single" button - redirect to messages
  const handleMessageModalContinue = () => {
    if (candidateToMessage) {
      navigate('/provider/messages', { 
        state: { 
          selectedCandidate: candidateToMessage,
          startConversation: true 
        } 
      });
    }
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  // Function to scroll to a specific candidate
  const scrollToCandidate = (candidateId) => {
    if (!candidateId) return;
    
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  // Handle back from candidate view
  const handleBackFromCandidateView = useCallback((candidateId) => {
    console.log('FavouriteCandidates handleBackFromCandidateView called, candidateId:', candidateId);
    if (candidateId) {
      setTimeout(() => {
        scrollToCandidate(candidateId);
      }, 300);
    }
  }, []);

  // Register back handler with parent
  useEffect(() => {
    if (onBackFromCandidateView) {
      console.log('FavouriteCandidates: Registering handleBackFromCandidateView with parent');
      onBackFromCandidateView(handleBackFromCandidateView);
    }
  }, [onBackFromCandidateView, handleBackFromCandidateView]);

  // Handle records per page change
  const handleRecordsPerPageChange = (newValue) => {
    setCandidatesPerPage(newValue);
    setCurrentPage(1);
  };

  // Pagination calculations
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filtered candidates change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCandidates]);

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
          subtitle="We’re gathering the candidates you’ve favourited so you can take action quicker."
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
          <div className="flex flex-col items-center justify-center">
            <img 
              src={noCandidateIllustration} 
              alt="No favourite candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
            />
            <p className="text-gray-600 text-lg font-medium">
              {isSearching 
                ? 'No favourite candidates found matching your search.'
                : 'You haven\'t marked any candidates as favourite yet.'
              }
            </p>
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

      {/* Profile Type Modal (for bulk operations - can be implemented later) */}
      <ProfileTypeModal
        isOpen={showProfileTypeModal}
        onClose={() => setShowProfileTypeModal(false)}
        onConfirm={(type) => {
          // Handle bulk download/print
          setShowProfileTypeModal(false);
        }}
        selectedCount={selectedCandidates.size}
        isDownloading={isDownloading}
      />

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
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-lg hover:opacity-90 hover:shadow-xl"
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

export default FavouriteCandidates;
