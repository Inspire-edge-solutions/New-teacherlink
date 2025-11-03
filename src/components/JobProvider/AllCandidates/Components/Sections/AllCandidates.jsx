import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import CandidateCard from '../shared/CandidateCard';
import CandidateDetail from '../shared/ViewFull';
import ViewShort from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import CandidateFilterPanel from '../shared/CandidateFilterPanel';
import CandidateApiService from '../shared/CandidateApiService';
import { parseLanguages, parseEducation } from '../../utils/candidateUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';

const AllCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList
}) => {
  const { user, loading: userLoading } = useAuth();

  // Candidates data state
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User preferences state
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  const [downloadedCandidates, setDownloadedCandidates] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(() => {
    const saved = localStorage.getItem('candidatesPerPage');
    return saved ? parseInt(saved) : 10;
  });
  
  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [filteredCandidatesByFilters, setFilteredCandidatesByFilters] = useState([]);

  // Candidate photos
  const [candidatePhotos, setCandidatePhotos] = useState({});

  // Filter options state
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    languages: [],
    education: [],
    coreSubjects: [],
    jobTypes: [
      { value: 'administration', label: 'Administration' },
      { value: 'teaching', label: 'Teaching' },
      { value: 'teachingAndAdmin', label: 'Teaching & Administration' }
    ],
    grades: [],
    curriculum: [],
    designations: [],
    expRange: [0, 30],
    salRange: [0, 200000]
  });

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const [allCandidates, approvedUids] = await Promise.all([
        CandidateApiService.fetchCandidates(),
        CandidateApiService.fetchApprovedCandidates()
      ]);
      
      // Filter only approved candidates
      const approvedCandidates = CandidateApiService.filterApprovedCandidates(
        allCandidates,
        approvedUids
      );
      
      setCandidates(approvedCandidates);
      setFilteredCandidates(approvedCandidates);
      
      // Extract filter options from candidates
      extractFilterOptions(approvedCandidates);
      
      // Fetch photos for visible candidates
      const photos = await CandidateApiService.fetchCandidatePhotos(approvedCandidates);
      setCandidatePhotos(photos);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      toast.error('Failed to load candidates. Please try again later.');
      setCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract Filter Options from Data
  const extractFilterOptions = (data) => {
    const newOptions = {
      countries: new Set(),
      states: new Set(),
      cities: new Set(),
      languages: new Set(),
      education: new Set(),
      coreSubjects: new Set(),
      grades: new Set(),
      curriculum: new Set(),
      designations: new Set(),
      expRange: [0, 30],
      salRange: [0, 200000]
    };

    data.forEach(candidate => {
      // Location data
      if (candidate.permanent_country_name) {
        newOptions.countries.add(candidate.permanent_country_name.trim());
      }
      if (candidate.permanent_state_name) {
        newOptions.states.add(candidate.permanent_state_name.trim());
      }
      if (candidate.permanent_city_name) {
        newOptions.cities.add(candidate.permanent_city_name.trim());
      }
      
      // Languages
      try {
        if (candidate.languages) {
          const languageList = parseLanguages(candidate.languages);
          languageList.forEach(lang => {
            if (lang) newOptions.languages.add(lang);
          });
        }
      } catch (error) {
        console.error('Error parsing languages for filter options:', error);
        // Silent error - don't disrupt user experience for filter option parsing
      }
      
      // Education and subjects
      if (candidate.education_details_json) {
        try {
          const { types, subjects } = parseEducation(candidate.education_details_json);
          types.forEach(type => {
            if (type) newOptions.education.add(type);
          });
          subjects.forEach(subject => {
            if (subject) newOptions.coreSubjects.add(subject);
          });
      } catch (error) {
          console.error('Error parsing education for filter options:', error);
          // Silent error - don't disrupt user experience for filter option parsing
        }
      }
      
      // Other fields
      if (candidate.grades_taught?.trim()) {
        newOptions.grades.add(candidate.grades_taught.trim());
      }
      if (candidate.curriculum_taught?.trim()) {
        newOptions.curriculum.add(candidate.curriculum_taught.trim());
      }
      if (candidate.designation?.trim()) {
        newOptions.designations.add(candidate.designation.trim());
      }
    });
    
    const formatOptions = (set) => Array.from(set).filter(Boolean).map(value => ({ value, label: value }));
    setFilterOptions(prev => ({
      ...prev,
      countries: formatOptions(newOptions.countries),
      states: formatOptions(newOptions.states),
      cities: formatOptions(newOptions.cities),
      languages: formatOptions(newOptions.languages),
      education: formatOptions(newOptions.education),
      coreSubjects: formatOptions(newOptions.coreSubjects),
      grades: formatOptions(newOptions.grades),
      curriculum: formatOptions(newOptions.curriculum),
      designations: formatOptions(newOptions.designations),
      expRange: newOptions.expRange,
      salRange: newOptions.salRange
    }));
  };

  // Fetch user preferences
  const fetchUserPreferences = useCallback(async () => {
    try {
      const prefs = await CandidateApiService.fetchUserCandidatePreferences(user);
      setSavedCandidates(prefs.savedCandidates);
      setFavouriteCandidates(prefs.favouriteCandidates);
      setDownloadedCandidates(prefs.downloadedCandidates);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast.warning('Could not load your saved preferences. You can still browse candidates.');
      setSavedCandidates([]);
      setFavouriteCandidates([]);
      setDownloadedCandidates([]);
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
    fetchCandidates();
      fetchUserPreferences();
    }
  }, [user, userLoading, fetchCandidates, fetchUserPreferences]);

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      setFilteredCandidates(candidates);
      setCurrentPage(1);
      return;
    }
    
    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(candidates, searchTerm);
    setSearchResults(results);
    setFilteredCandidates(results);
    setCurrentPage(1);
  }, [candidates]);

  // FILTER functionality
  const handleApplyFilters = useCallback((filters) => {
    // Format filters - use LABELS for location (not IDs)
    const formattedFilters = {
      ...filters,
      country: filters.country?.label,  // Use label (name) instead of value (ID)
      state: filters.state?.label,      // Use label (name) instead of value (ID)
      city: filters.city?.label || filters.city?.value,  // City uses name as value
      languages: filters.languages?.map(l => l.value) || [],
      education: filters.education?.map(e => e.value) || [],
      coreSubjects: filters.coreSubjects?.map(s => s.value) || [],
      jobTypes: filters.jobTypes?.map(j => j.value) || [],
      grades: filters.grades?.map(g => g.value) || [],
      curriculum: filters.curriculum?.map(c => c.value) || [],
      designations: filters.designations?.map(d => d.value) || [],
      gender: filters.gender?.map(g => g.value) || [],
      noticePeriod: filters.noticePeriod?.map(n => n.value) || [],
      jobSearchStatus: filters.jobSearchStatus?.map(j => j.value) || [],
      jobShiftPreferences: filters.jobShiftPreferences?.map(j => j.value) || [],
      tutionPreferences: filters.tutionPreferences?.map(t => t.value) || [],
      otherTeachingExperience: filters.otherTeachingExperience?.map(t => t.value) || [],
      online: filters.online?.value,
      offline: filters.offline?.value
    };

    // Check if any filters are actually applied
    const hasActiveFilters = Object.keys(formattedFilters).some(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });

    if (!hasActiveFilters) {
      setFilteredCandidatesByFilters([]);
      setActiveFilters(new Set());
      setCurrentPage(1);
      return;
    }
    
    let filtered = candidates.filter(candidate => {
      // Location filters - use PRESENT location fields (present_country_name, present_state_name, present_city_name)
      if (formattedFilters.country) {
        const candidateCountry = String(candidate.present_country_name || candidate.permanent_country_name || '').toLowerCase().trim();
        const filterCountry = String(formattedFilters.country).toLowerCase().trim();
        
        // If candidate has no country data, exclude them
        if (!candidateCountry) return false;
        // Must match exactly
        if (candidateCountry !== filterCountry) return false;
      }
      
      if (formattedFilters.state) {
        const candidateState = String(candidate.present_state_name || candidate.permanent_state_name || '').toLowerCase().trim();
        const filterState = String(formattedFilters.state).toLowerCase().trim();
        
        // If candidate has no state data, exclude them
        if (!candidateState) return false;
        // Must match exactly
        if (candidateState !== filterState) return false;
      }
      
      if (formattedFilters.city) {
        const candidateCity = String(candidate.present_city_name || candidate.permanent_city_name || '').toLowerCase().trim();
        const filterCity = String(formattedFilters.city).toLowerCase().trim();
        // If candidate has no city data, exclude them
        if (!candidateCity) return false;
        // Must match exactly
        if (candidateCity !== filterCity) return false;
      }

      // Language filter
      if (formattedFilters.languages.length > 0) {
        const candidateLanguages = parseLanguages(candidate.languages);
        const hasMatch = formattedFilters.languages.some(filterLang => {
          const filterLangLower = filterLang.toLowerCase();
          return candidateLanguages.some(candLang => {
            const candLangLower = candLang.toLowerCase();
            return candLangLower === filterLangLower || 
                   candLangLower.includes(filterLangLower) || 
                   filterLangLower.includes(candLangLower);
          });
        });
        if (!hasMatch) return false;
      }

      // Education filter
      if (formattedFilters.education.length > 0) {
        const { types } = parseEducation(candidate.education_details_json);
        const hasMatch = formattedFilters.education.some(filterEdu => {
          const filterEduLower = filterEdu.toLowerCase();
          return types.some(candEdu => {
            const candEduLower = candEdu.toLowerCase();
            return candEduLower === filterEduLower || 
                   candEduLower.includes(filterEduLower) || 
                   filterEduLower.includes(candEduLower);
          });
        });
        if (!hasMatch) return false;
      }

      // Job Type filter
      if (formattedFilters.jobTypes.length > 0) {
        const candidateJobType = candidate.Job_Type?.trim() || '';
        const hasMatch = formattedFilters.jobTypes.some(filterJobType => {
          const normalizedFilter = filterJobType.toLowerCase().trim();
          const normalizedCandidate = candidateJobType.toLowerCase();
          return normalizedCandidate === normalizedFilter ||
                 normalizedCandidate.includes(normalizedFilter) ||
                 normalizedFilter.includes(normalizedCandidate);
        });
        if (!hasMatch) return false;
      }

      // Add more filters as needed...
      return true;
    });

    setFilteredCandidatesByFilters(filtered);
    
    const activeFilterKeys = Object.keys(formattedFilters).filter(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });
    
    setActiveFilters(new Set(activeFilterKeys));
    setCurrentPage(1);
  }, [candidates]);

  const handleResetFilters = useCallback(() => {
    setFilteredCandidatesByFilters([]);
    setActiveFilters(new Set());
    setCurrentPage(1);
  }, []);

  // Combine search and filter results (like AllJobs)
  const getCombinedResults = useCallback(() => {
    let baseCandidates = candidates;
    
    // Apply filters first if any are active
    if (activeFilters.size > 0) {
      baseCandidates = filteredCandidatesByFilters;
    }
    
    // Then apply search if searching
    if (isSearching) {
      // If both search and filters are active, return intersection
      if (activeFilters.size > 0) {
        return searchResults.filter(candidate => 
          filteredCandidatesByFilters.some(filteredCandidate => 
            filteredCandidate.firebase_uid === candidate.firebase_uid
          )
        );
      }
      // If only search is active, return search results
      return searchResults;
    }
    
    return baseCandidates;
  }, [candidates, activeFilters, filteredCandidatesByFilters, isSearching, searchResults]);

  const finalFilteredCandidates = getCombinedResults();

  // Handle save candidate
  const handleSaveCandidate = async (candidate) => {
    if (!user) {
      toast.error("Please login to save candidates.");
      return;
    }
    
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchUserPreferences();
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

  // Handle toggle favourite
  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) {
      toast.error("Please login to favourite candidates.");
      return;
    }
    
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, isFavourite);
      await fetchUserPreferences();
      toast[isFavourite ? 'success' : 'info'](
        `${candidate.fullName || candidate.name || 'Candidate'} ${
          isFavourite ? 'added to favourites!' : 'removed from favourites!'
        }`
      );
    } catch (error) {
      console.error('Error favouriting candidate:', error);
      toast.error('Failed to update favourite status. Please try again.');
    }
  };

  // Handle view full profile
  const handleViewFull = (candidate) => {
    console.log('AllCandidates: Viewing full profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'full');
  };

  // Handle view short profile
  const handleViewShort = (candidate) => {
    console.log('AllCandidates: Viewing short profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'short');
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
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        // Add highlight effect
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  // Handle back from candidate view
  const handleBackFromCandidateView = useCallback((candidateId) => {
    console.log('AllCandidates handleBackFromCandidateView called, candidateId:', candidateId);
    if (candidateId) {
      setTimeout(() => {
        scrollToCandidate(candidateId);
      }, 300);
    }
  }, []);

  // Register back handler with parent
  useEffect(() => {
    if (onBackFromCandidateView) {
      console.log('AllCandidates: Registering handleBackFromCandidateView with parent');
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
  const currentCandidates = finalFilteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(finalFilteredCandidates.length / candidatesPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filtered candidates change
  useEffect(() => {
    setCurrentPage(1);
  }, [finalFilteredCandidates]);

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800 text-center">
        Please log in to view candidates.
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
      {/* Header with Search, Filter Button, and Records per Page */}
      <div className="widget-title mb-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center w-full gap-3 sm:gap-4">
          <div className="flex-1 w-full sm:max-w-[50%]">
            <SearchBar 
              onSearch={handleSearch} 
              placeholder="Search candidates..." 
            />
          </div>
          <div className="flex-shrink-0">
            <button 
              onClick={() => setShowFilters(true)}
              className={`w-full sm:w-auto px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeFilters.size > 0
                  ? 'bg-gradient-brand text-white shadow-sm'
                  : 'bg-gradient-brand text-white hover:opacity-90'
              }`}
            >
              Apply Filters {activeFilters.size > 0 && `(${activeFilters.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Candidates Count and Records per Page */}
      <div className="candidate-listing">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3">
          <h3 className="text-xl sm:text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0">
            {isSearching || activeFilters.size > 0
              ? `Found ${finalFilteredCandidates.length} candidate${finalFilteredCandidates.length !== 1 ? 's' : ''}`
              : `${candidates.length} Candidates Available`
            }
          </h3>
          <RecordsPerPageDropdown
            itemsPerPage={candidatesPerPage}
            onItemsPerPageChange={handleRecordsPerPageChange}
          />
        </div>
      </div>

      {/* Candidates List */}
      {currentCandidates.length > 0 ? (
        <div className="candidates-results">
          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              const candidateId = candidate.firebase_uid;
              const isSaved = savedCandidates.includes(candidateId);
              const isFavourite = favouriteCandidates.includes(candidateId);
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
              alt="No candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
            />
            <p className="text-gray-600 text-lg font-medium">
              {isSearching 
                ? 'No candidates found matching your search.'
                : 'No candidates available at the moment.'
              }
            </p>
          </div>
              </div>
            )}

      {/* Pagination */}
      {finalFilteredCandidates.length > candidatesPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={finalFilteredCandidates.length}
          itemsPerPage={candidatesPerPage}
          currentPageStart={indexOfFirstCandidate + 1}
          currentPageEnd={Math.min(indexOfLastCandidate, finalFilteredCandidates.length)}
        />
      )}

      {/* Filter Panel Modal */}
      <CandidateFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        activeFiltersCount={activeFilters.size}
        initialOptions={filterOptions}
      />
    </div>
  );
};

export default AllCandidates;