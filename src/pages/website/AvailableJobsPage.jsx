import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PublicJobCard from '../../components/JobSeeker/AllJobs/Components/shared/PublicJobCard';
import SearchBar from '../../components/JobSeeker/AllJobs/Components/shared/SearchBar';
import PublicJobFilterPanel from '../../components/JobSeeker/AllJobs/Components/shared/PublicJobFilterPanel';
import Pagination from '../../components/JobSeeker/AllJobs/Components/shared/Pagination';
import RecordsPerPageDropdown from '../../components/JobSeeker/AllJobs/Components/shared/RecordsPerPageDropdown';
import JobApiService from '../../components/JobSeeker/AllJobs/Components/shared/JobApiService';
import { searchJobs } from '../../components/JobSeeker/AllJobs/utils/searchUtils';
import { applyJobFilters } from '../../components/JobSeeker/AllJobs/Components/Sections/searchJobFilters';
import MetaComponent from '../../components/common/MetaComponent';
import LoadingState from '../../components/common/LoadingState';
import { useAuth } from '../../Context/AuthContext';
import { FaFilter, FaSearch } from 'react-icons/fa';
import noJobsIllustration from '../../assets/Illustrations/No jobs.png';

const AvailableJobsPage = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Sort jobs by recency
  const sortJobsByRecency = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    const parseTime = (v) => {
      try { return v ? new Date(v).getTime() : 0; } catch { return 0; }
    };
    const getTs = (job) => {
      const ts = parseTime(job.posted_at || job.created_at || job.updated_at || job.published_at || job.timestamp || job.createdAt || job.updatedAt);
      if (ts) return ts;
      const idNum = Number(job.id || job.job_id);
      return isNaN(idNum) ? 0 : idNum;
    };
    return [...list].sort((a, b) => getTs(b) - getTs(a));
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      const approvedJobs = Array.isArray(data) 
        ? data.filter(job => job.isApproved === 1)
        : [];
      const sorted = sortJobsByRecency(approvedJobs);
      setJobs(sorted);
      setFilteredJobs(sorted);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  }, [sortJobsByRecency]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Search functionality
  const handleSearch = useCallback((term) => {
    const normalizedTerm = (term ?? '').trim();
    if (!normalizedTerm) {
      setSearchTerm('');
      setIsSearching(false);
      applyFiltersToJobs(jobs, activeFilters);
      return;
    }
    setSearchTerm(normalizedTerm);
    setIsSearching(true);
    const results = searchJobs(jobs, normalizedTerm);
    const sorted = sortJobsByRecency(results);
    applyFiltersToJobs(sorted, activeFilters);
  }, [jobs, activeFilters, sortJobsByRecency]);

  // Apply filters using the same logic as authenticated pages
  const applyFiltersToJobs = useCallback((jobsToFilter, filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      setFilteredJobs(jobsToFilter);
      setActiveFiltersCount(0);
      return;
    }

    // Convert filters to the format expected by applyJobFilters
    const formattedFilters = {
      country: filters.country,
      state: filters.state,
      city: filters.city,
      education: filters.education || [],
      subjects: filters.subjects || [],
      min_salary: filters.minSalary || '',
      max_salary: filters.maxSalary || ''
    };

    // Use the same filter logic as authenticated pages
    let { filteredJobs, activeFilters, hasActiveFilters } = applyJobFilters(jobsToFilter, formattedFilters);
    
    // Apply experience filters separately (not handled by applyJobFilters)
    const minExpYears = filters.minExperienceYears?.value ?? 0;
    const maxExpYears = filters.maxExperienceYears?.value ?? Infinity;

    if (minExpYears > 0 || maxExpYears < Infinity) {
      filteredJobs = filteredJobs.filter(job => {
        // Parse job experience fields (handle years)
        const parseExperienceValue = (value) => {
          if (!value) return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const match = value.match(/^(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }
          return 0;
        };

        const totalExpMinYears = parseExperienceValue(job.total_experience_min_years) || 0;
        const totalExpMaxYears = parseExperienceValue(job.total_experience_max_years) || 0;
        const teachingExpMinYears = parseExperienceValue(job.teaching_experience_min_years) || 0;
        const teachingExpMaxYears = parseExperienceValue(job.teaching_experience_max_years) || 0;
        
        // Job matches if any of its experience ranges overlap with the filter range
        const jobMinExp = Math.min(totalExpMinYears, teachingExpMinYears);
        const jobMaxExp = Math.max(totalExpMaxYears, teachingExpMaxYears);
        
        // If job has no experience specified, include it (don't filter out)
        if (jobMinExp === 0 && jobMaxExp === 0) {
          return true;
        }
        
        // Check if ranges overlap
        return jobMaxExp >= minExpYears && jobMinExp <= maxExpYears;
      });
      
      if (hasActiveFilters) {
        activeFilters.push('experience');
      } else {
        activeFilters = ['experience'];
        hasActiveFilters = true;
      }
    }
    
    if (hasActiveFilters) {
      setFilteredJobs(filteredJobs);
      setActiveFiltersCount(activeFilters.length);
    } else {
      setFilteredJobs(jobsToFilter);
      setActiveFiltersCount(0);
    }
  }, []);

  const handleApplyFilters = useCallback((filters) => {
    setActiveFilters(filters);
    applyFiltersToJobs(isSearching ? filteredJobs : jobs, filters);
    setShowFilters(false);
  }, [isSearching, filteredJobs, jobs, applyFiltersToJobs]);

  const handleResetFilters = useCallback(() => {
    setActiveFilters({});
    setActiveFiltersCount(0);
    if (isSearching) {
      setFilteredJobs(filteredJobs);
    } else {
      setFilteredJobs(jobs);
    }
  }, [isSearching, filteredJobs, jobs]);

  // Pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update page when filteredJobs change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredJobs, currentPage, totalPages]);

  const metadata = {
    title: "Find your dream job | Browse Opportunities | TeacherLink",
    description: "Explore available teaching opportunities. Register to apply and unlock full job details.",
  };

  // Show loading while checking auth
  if (userLoading) {
    return <LoadingState />;
  }

  // Redirect logged-in candidates to authenticated jobs page
  if (user && (user.user_type === 'Candidate' || user.user_type === 'Teacher')) {
    return <Navigate to="/seeker/all-jobs" replace />;
  }

  return (
    <div>
      <MetaComponent meta={metadata} />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="bg-gradient-brand text-white text-center rounded-lg p-6 mb-6 shadow-lg">
            <h1 className="text-3xl font-bold mb-2 leading-tight tracking-tight">Find Your Dream Job</h1>
            <p className="text-lg sm:text-base opacity-90 leading-normal tracking-tight">
            Your dream career starts here. Explore opportunities and apply smarter. Register or login to apply and unlock full details.
            </p>
            <button
              onClick={() => navigate('/register?requiredUserType=Candidate')}
              className="mt-4 px-6 py-2 bg-white text-pink-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-base leading-normal tracking-tight"
            >
              Register Now to Apply
            </button>
            <p className="text-sm p-4 sm:text-base text-white-600 leading-normal tracking-tight">
              Use coupon code <span className="font-bold text-xl">'TEACH25'</span> to get full access at no cost.
              </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar 
                  onSearch={handleSearch} 
                  placeholder="Search jobs by title, institute, location..." 
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

          {/* Jobs Count and Records Per Page */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'} Active
            </h2>
            <RecordsPerPageDropdown 
              itemsPerPage={jobsPerPage}
              onItemsPerPageChange={(value) => {
                setJobsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Jobs List */}
          {loading ? (
            <LoadingState />
          ) : currentJobs.length > 0 ? (
            <>
              <div className="job-results">
                <div className="job-list">
                  {currentJobs.map((job) => (
                    <PublicJobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                  totalItems={filteredJobs.length}
                  itemsPerPage={jobsPerPage}
                  currentPageStart={indexOfFirstJob + 1}
                  currentPageEnd={Math.min(indexOfLastJob, filteredJobs.length)}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">
                <img 
                  src={noJobsIllustration} 
                  alt="No jobs" 
                  className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
                />
                <p className="text-gray-600 text-lg sm:text-base font-medium leading-normal tracking-tight">
                  {isSearching || activeFiltersCount > 0
                    ? 'No jobs found matching your search or filters.'
                    : 'No jobs available at the moment.'}
                </p>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          <PublicJobFilterPanel
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

export default AvailableJobsPage;