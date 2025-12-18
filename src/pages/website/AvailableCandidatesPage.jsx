import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import PublicCandidateCard from '../../components/JobProvider/AllCandidates/Components/shared/PublicCandidateCard';
import SearchBar from '../../components/JobProvider/AllCandidates/Components/shared/SearchBar';
import PublicCandidateFilterPanel from '../../components/JobProvider/AllCandidates/Components/shared/PublicCandidateFilterPanel';
import Pagination from '../../components/JobProvider/AllCandidates/Components/shared/Pagination';
import RecordsPerPageDropdown from '../../components/JobProvider/AllCandidates/Components/shared/RecordsPerPageDropdown';
import CandidateApiService from '../../components/JobProvider/AllCandidates/Components/shared/CandidateApiService';
import { parseEducation, buildCandidateSubjects } from '../../components/JobProvider/AllCandidates/Components/utils/candidateUtils';
import MetaComponent from '../../components/common/MetaComponent';
import LoadingState from '../../components/common/LoadingState';
import { useAuth } from '../../Context/AuthContext';
import { FaFilter } from 'react-icons/fa';
import noCandidateIllustration from '../../assets/Illustrations/No candidate.png';

// API Endpoints - matching AllCandidates.jsx
const CANDIDATES_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change';
const APPROVED_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved';

const normalizeString = (value) =>
  (value ?? '').toString().toLowerCase().trim();

// Sort candidates by date/ID (newest first)
// API returns newest last, so we reverse the array to show newest first
const sortCandidatesByDate = (candidates) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return candidates;
  }

  // Reverse array so newest candidates (from API) appear first
  return [...candidates].reverse();
};

const searchCandidates = (candidates, searchTerm) => {
  if (!searchTerm) return candidates;
  const term = normalizeString(searchTerm);
  return candidates.filter((candidate) => {
    const name = normalizeString(candidate.fullName || candidate.name);
    const designation = normalizeString(candidate.designation);
    const location = normalizeString(
      `${candidate.present_city_name || ''} ${candidate.present_state_name || ''} ${candidate.present_country_name || ''}`
    );
    return (
      name.includes(term) ||
      designation.includes(term) ||
      location.includes(term)
    );
  });
};

const AvailableCandidatesPage = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [candidatePhotos, setCandidatePhotos] = useState({});

  // Fetch candidates - using direct API calls (matching AllCandidates.jsx)
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      
      // DIRECT API CALL - matching AllCandidates.jsx approach
      const [candidatesRes, approvedRes] = await Promise.all([
        axios.get(CANDIDATES_API),
        axios.get(APPROVED_API)
      ]);
      
      // Handle API Gateway response format
      let candidatesData = candidatesRes.data;
      if (candidatesData && typeof candidatesData === 'object' && 'body' in candidatesData) {
        try {
          candidatesData = JSON.parse(candidatesData.body);
        } catch (e) {
          console.error('Error parsing candidates body:', e);
        }
      }
      
      const allCandidates = Array.isArray(candidatesData) ? candidatesData : [];
      
      // Handle API Gateway response format
      let approvedData = approvedRes.data;
      if (approvedData && typeof approvedData === 'object' && 'body' in approvedData) {
        try {
          approvedData = JSON.parse(approvedData.body);
        } catch (e) {
          console.error('Error parsing approved body:', e);
        }
      }
      
      let approvedUids = Array.isArray(approvedData) ? approvedData : [];
      
      // Check if allCandidates is empty
      if (!allCandidates || allCandidates.length === 0) {
        console.error('❌ AvailableCandidatesPage: No candidates fetched from API');
        setCandidates([]);
        setCandidatePhotos({});
        return;
      }
      
      // Normalize approvedUids to array of strings (matching AllCandidates.jsx logic)
      let normalizedApprovedUids = [];
      if (Array.isArray(approvedUids)) {
        if (approvedUids.length > 0) {
          // Check if it's array of objects or array of strings
          if (typeof approvedUids[0] === 'object' && approvedUids[0] !== null) {
            // Array of objects: extract firebase_uid
            normalizedApprovedUids = approvedUids
              .map(uid => String(uid?.firebase_uid || uid))
              .filter(Boolean);
          } else {
            // Array of strings/numbers: convert to strings
            normalizedApprovedUids = approvedUids.map(uid => String(uid)).filter(Boolean);
          }
        }
      } else if (approvedUids) {
        // Single value, convert to array
        normalizedApprovedUids = [String(approvedUids)].filter(Boolean);
      }
      
      // Filter only approved candidates (matching AllCandidates.jsx logic)
      let approvedCandidates;
      if (normalizedApprovedUids.length > 0) {
        approvedCandidates = CandidateApiService.filterApprovedCandidates(
          allCandidates,
          normalizedApprovedUids
        );
      } else {
        // No approved UIDs found - fallback to showing all candidates (matching AllCandidates.jsx)
        approvedCandidates = allCandidates;
      }
      
      // Safety check: if filtering resulted in 0 but we have candidates, show all as fallback (matching AllCandidates.jsx)
      if (approvedCandidates.length === 0 && allCandidates.length > 0 && normalizedApprovedUids.length > 0) {
        console.error('Filtering resulted in 0 candidates but we have', allCandidates.length, 'total candidates. Showing all as fallback.');
        approvedCandidates = allCandidates;
      }
      
      // Sort candidates by date (newest first) - matching AllCandidates.jsx
      approvedCandidates = sortCandidatesByDate(approvedCandidates);
      
      setCandidates(approvedCandidates);
      
      // Fetch photos for visible candidates
      const finalCandidates = approvedCandidates.length > 0 ? approvedCandidates : allCandidates;
      const photos = await CandidateApiService.fetchCandidatePhotos(finalCandidates);
      setCandidatePhotos(photos);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      toast.error('Failed to load candidates. Please try again later.');
      setCandidates([]);
      setCandidatePhotos({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Search functionality
  const handleSearch = useCallback((term) => {
    const normalizedTerm = (term ?? '').trim();
    if (!normalizedTerm) {
      setSearchTerm('');
      setIsSearching(false);
      applyFiltersToCandidates(candidates, activeFilters);
      return;
    }
    setSearchTerm(normalizedTerm);
    setIsSearching(true);
    const results = searchCandidates(candidates, normalizedTerm);
    // Sort search results (newest first)
    const sortedResults = sortCandidatesByDate(results);
    applyFiltersToCandidates(sortedResults, activeFilters);
  }, [candidates, activeFilters]);

  // Apply filters
  const applyFiltersToCandidates = useCallback((candidatesToFilter, filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      setFilteredCandidates(candidatesToFilter);
      setActiveFiltersCount(0);
      return;
    }

    let filtered = [...candidatesToFilter];

    // Location filters
    if (filters.country) {
      filtered = filtered.filter(candidate => {
        const presentCountry = normalizeString(candidate.present_country_name);
        const permanentCountry = normalizeString(candidate.permanent_country_name);
        const filterCountry = normalizeString(filters.country.label);
        return presentCountry.includes(filterCountry) || permanentCountry.includes(filterCountry);
      });
    }
    if (filters.state) {
      filtered = filtered.filter(candidate => {
        const presentState = normalizeString(candidate.present_state_name);
        const permanentState = normalizeString(candidate.permanent_state_name);
        const filterState = normalizeString(filters.state.label);
        return presentState.includes(filterState) || permanentState.includes(filterState);
      });
    }
    if (filters.city) {
      filtered = filtered.filter(candidate => {
        const presentCity = normalizeString(candidate.present_city_name);
        const permanentCity = normalizeString(candidate.permanent_city_name);
        const filterCity = normalizeString(filters.city.label);
        return presentCity.includes(filterCity) || permanentCity.includes(filterCity);
      });
    }

    // Education filter
    if (filters.education && filters.education.length > 0) {
      const educationValues = filters.education.map(e => e.value || e);
      filtered = filtered.filter(candidate => {
        const { types } = parseEducation(candidate.education_details_json);
        const candidateTypes = types.map(t => normalizeString(t));
        
        return educationValues.some(filterEdu => {
          const filterValue = normalizeString(filterEdu);
          return candidateTypes.some(candidateType =>
            candidateType === filterValue ||
            candidateType.includes(filterValue) ||
            filterValue.includes(candidateType)
          );
        });
      });
    }

    // Subjects filter (coreSubjects)
    if (filters.coreSubjects && filters.coreSubjects.length > 0) {
      const subjectValues = filters.coreSubjects.map(s => s.value || s);
      filtered = filtered.filter(candidate => {
        const candidateSubjects = buildCandidateSubjects(candidate).map(normalizeString);
        if (candidateSubjects.length === 0) return false;
        
        return subjectValues.some(filterSubject => {
          const filterValue = normalizeString(filterSubject);
          return candidateSubjects.some(candidateSubject =>
            candidateSubject === filterValue ||
            candidateSubject.includes(filterValue) ||
            filterValue.includes(candidateSubject)
          );
        });
      });
    }

    // Experience filters - using years only
    const minExpYears = filters.minExperienceYears?.value ?? 0;
    const maxExpYears = filters.maxExperienceYears?.value ?? Infinity;

    if (minExpYears > 0 || maxExpYears < Infinity) {
      filtered = filtered.filter(candidate => {
        // Parse candidate experience (handle years)
        const parseExperienceValue = (value) => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const match = value.match(/^(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }
          return 0;
        };

        // Get total experience in years
        const expYears = parseExperienceValue(candidate.total_experience_years) || 0;
        
        // If no experience specified, include candidate (don't filter out)
        if (expYears === 0) {
          return true;
        }
        
        // Check if candidate experience falls within filter range
        return expYears >= minExpYears && expYears <= maxExpYears;
      });
    }

    // Salary filters
    if (filters.minSalary || filters.maxSalary) {
      const minSalary = filters.minSalary ? Number(filters.minSalary) : 0;
      const maxSalary = filters.maxSalary ? Number(filters.maxSalary) : Infinity;
      
      filtered = filtered.filter(candidate => {
        const salaryStr = candidate.expected_salary;
        if (!salaryStr) return true; // Include candidates without salary info
        
        // Parse salary range from string (e.g., "5-10 LPA", "50000-100000")
        const parseSalary = (str) => {
          if (!str) return null;
          const lower = normalizeString(str);
          const numbers = lower.match(/(\d+(\.\d+)?)/g)?.map(n => parseFloat(n)) || [];
          const hasLakh = lower.includes('lac') || lower.includes('lakh') || lower.includes('l');
          const hasK = lower.includes('k');
          
          if (numbers.length >= 2) {
            const [first, second] = numbers;
            const min = hasLakh ? first * 100000 : (hasK ? first * 1000 : first);
            const max = hasLakh ? second * 100000 : (hasK ? second * 1000 : second);
            return { min: Math.min(min, max), max: Math.max(min, max) };
          } else if (numbers.length === 1) {
            const val = hasLakh ? numbers[0] * 100000 : (hasK ? numbers[0] * 1000 : numbers[0]);
            return { min: val, max: val };
          }
          return null;
        };
        
        const salaryRange = parseSalary(salaryStr);
        if (!salaryRange) return true; // Include if can't parse
        
        return salaryRange.max >= minSalary && salaryRange.min <= maxSalary;
      });
    }

    // Count active filters (handle arrays properly, count experience as single filter)
    const count = Object.entries(filters).filter(([key, value]) => {
      // Count experience fields as a single filter
      if (key === 'minExperienceYears' || key === 'maxExperienceYears') {
        // Only count if at least one experience field is set (checked separately)
        return false;
      }
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    // Add 1 if any experience filter is set
    const hasExperienceFilter = filters.minExperienceYears || filters.maxExperienceYears;
    const finalCount = hasExperienceFilter ? count + 1 : count;
    
    // Sort filtered results (newest first) to maintain consistent ordering
    const sortedFiltered = sortCandidatesByDate(filtered);
    
    setActiveFiltersCount(finalCount);
    setFilteredCandidates(sortedFiltered);
  }, []);

  const handleApplyFilters = useCallback((filters) => {
    setActiveFilters(filters);
    applyFiltersToCandidates(isSearching ? filteredCandidates : candidates, filters);
    setShowFilters(false);
  }, [isSearching, filteredCandidates, candidates, applyFiltersToCandidates]);

  const handleResetFilters = useCallback(() => {
    setActiveFilters({});
    setActiveFiltersCount(0);
    if (isSearching) {
      setFilteredCandidates(filteredCandidates);
    } else {
      setFilteredCandidates(candidates);
    }
  }, [isSearching, filteredCandidates, candidates]);

  // Initialize filtered candidates
  useEffect(() => {
    if (!isSearching && activeFiltersCount === 0) {
      setFilteredCandidates(candidates);
    }
  }, [candidates, isSearching, activeFiltersCount]);

  // Pagination
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update page when filteredCandidates change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredCandidates, currentPage, totalPages]);

  const metadata = {
    title: "Find your best teacher | Browse Qualified Educators | TeacherLink",
    description: "Explore available teaching professionals. Register to unlock full candidate details and contact information.",
  };

  // Show loading while checking auth
  if (userLoading) {
    return <LoadingState />;
  }

  // Redirect logged-in employers to authenticated candidates page
  if (user && user.user_type === 'Employer') {
    return <Navigate to="/provider/all-candidates" replace />;
  }

  return (
    <div>
      <MetaComponent meta={metadata} />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="bg-gradient-brand text-white text-center rounded-lg p-6 mb-6 shadow-lg">
            <h1 className="text-xl font-semibold mb-2 leading-tight tracking-tight">Find Your Best Teacher</h1>
            <p className="text-base opacity-90 leading-normal tracking-tight">
            Connect with expert teachers who match your goals, learn smarter and grow faster.  
            Register or login to unlock full profiles and contact teachers.
            </p>
            <button
              onClick={() => navigate('/register?requiredUserType=Employer')}
              className="mt-4 px-6 py-2 bg-white text-pink-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-base leading-normal tracking-tight"
            >
              Register Now to Unlock Details
            </button>
            <p className="text-base p-4 text-white-600 leading-normal tracking-tight">
              Use coupon code <span className="font-bold text-xl">'HIRE25'</span> to get full access at no cost.
              </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar 
                  onSearch={handleSearch} 
                  placeholder="Search candidates by name, designation, location..." 
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className={`px-4 py-2 rounded-lg font-medium text-base transition-colors flex items-center gap-2 leading-normal tracking-tight ${
                  activeFiltersCount > 0
                    ? 'bg-gradient-brand text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaFilter className="w-4 h-4" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>
          </div>

          {/* Candidates Count and Records Per Page */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">
              {isSearching || activeFiltersCount > 0
                ? `Found ${filteredCandidates.length.toLocaleString()} ${filteredCandidates.length === 1 ? 'profile' : 'profiles'}`
                : 'Available Candidates'}
            </h2>
            <RecordsPerPageDropdown 
              itemsPerPage={candidatesPerPage}
              onItemsPerPageChange={(value) => {
                setCandidatesPerPage(value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Candidates List */}
          {loading ? (
            <LoadingState />
          ) : currentCandidates.length > 0 ? (
            <>
              <div className="candidates-results">
                <div className="candidates-list">
                  {currentCandidates.map((candidate) => (
                    <PublicCandidateCard 
                      key={candidate.firebase_uid} 
                      candidate={candidate}
                      candidatePhoto={candidatePhotos[candidate.firebase_uid]}
                    />
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                  totalItems={filteredCandidates.length}
                  itemsPerPage={candidatesPerPage}
                  currentPageStart={indexOfFirstCandidate + 1}
                  currentPageEnd={Math.min(indexOfLastCandidate, filteredCandidates.length)}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">
                <img 
                  src={noCandidateIllustration} 
                  alt="No candidates" 
                  className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
                />
                <p className="text-gray-600 text-base font-medium leading-normal tracking-tight">
                  {isSearching || activeFiltersCount > 0
                    ? 'No candidates found matching your search or filters.'
                    : 'No candidates available at the moment.'}
                </p>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          <PublicCandidateFilterPanel
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </div>
    </div>
  );
};

export default AvailableCandidatesPage;

