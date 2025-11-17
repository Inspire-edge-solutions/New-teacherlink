import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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

const normalizeString = (value) =>
  (value ?? '').toString().toLowerCase().trim();

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
      
      // Fetch photos for visible candidates
      const photos = await CandidateApiService.fetchCandidatePhotos(approvedCandidates);
      setCandidatePhotos(photos);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      toast.error('Failed to load candidates. Please try again later.');
      setCandidates([]);
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
    applyFiltersToCandidates(results, activeFilters);
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

    // Experience filters
    if (filters.minExperience) {
      const min = Number(filters.minExperience);
      filtered = filtered.filter(candidate => {
        const exp = candidate.total_experience_years || 0;
        return exp >= min;
      });
    }
    if (filters.maxExperience) {
      const max = Number(filters.maxExperience);
      filtered = filtered.filter(candidate => {
        const exp = candidate.total_experience_years || 0;
        return exp <= max;
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

    // Count active filters (handle arrays properly)
    const count = Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    setActiveFiltersCount(count);
    setFilteredCandidates(filtered);
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
    title: "Available Teacher Candidates | Browse Qualified Educators | TeacherLink",
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
            <h1 className="text-3xl font-bold mb-2">Available Teacher Candidates</h1>
            <p className="text-lg opacity-90">
              Discover qualified teaching professionals. Register or login to unlock full profiles and contact candidates.
            </p>
            <button
              onClick={() => navigate('/register?requiredUserType=Employer')}
              className="mt-4 px-6 py-2 bg-white text-pink-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Register Now to Unlock Details
            </button>
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent">
              {filteredCandidates.length} {filteredCandidates.length === 1 ? 'Candidate' : 'Candidates'} Available
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
                <p className="text-gray-600 text-lg font-medium">
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

