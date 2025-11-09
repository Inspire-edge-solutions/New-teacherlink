import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import { IoLocationOutline } from "react-icons/io5";
import { BsBriefcase, BsCash, BsMortarboard, BsClock } from "react-icons/bs";
import { AiOutlineEye, AiOutlineSave, AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import ApplyModal from '../shared/ApplyModal';
import JobCard from '../shared/JobCard';
import JobApiService from '../shared/JobApiService';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import { toast } from "react-toastify";
import { useAuth } from "../../../../../Context/AuthContext";
import InputWithTooltip from "../../../../services/InputWithTooltip";
import LoadingState from '../../../../common/LoadingState';
import { defaultJobFilters, applyJobFilters } from './searchJobFilters';
import useJobFilterOptions from '../shared/useJobFilterOptions';
import useJobMessaging from '../hooks/useJobMessaging';
import JobMessagingModals from '../shared/JobMessagingModals';

// Additional API endpoints for specific functionality
const JOB_PREFERENCES_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';


const SearchJobs = ({ onViewJob, onBackFromJobView }) => {
  const { user } = useAuth();
  // Initialize filters with saved values or defaults
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('jobFilters');
      return saved ? { ...defaultJobFilters, ...JSON.parse(saved) } : defaultJobFilters;
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return defaultJobFilters;
    }
  });

  // Jobs data state
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Saved and favorite jobs state
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [favouriteJobs, setFavouriteJobs] = useState(new Set());
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  
  // Apply job state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coinValue, setCoinValue] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(10);

  const { options: apiOptions, loading: optionLoading } = useJobFilterOptions();

  // Function to fetch and map job preferences
  const fetchAndMapJobPreferences = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(JOB_PREFERENCES_API);
      const data = await response.json();
      const userPreferences = Array.isArray(data)
        ? data.find((pref) => pref.firebase_uid === user.uid)
        : null;

      if (!userPreferences) {
        return;
      }

      const toOptionList = (items) =>
        Array.isArray(items)
          ? items.map((value) => ({ value, label: value }))
          : [];

      const jobTypeMappings = (() => {
        switch (userPreferences.Job_Type) {
          case 'teaching':
            return {
              job_category: { value: 'fullTime', label: 'Full Time' },
              subjects: toOptionList(userPreferences.teaching_subjects),
              designations: toOptionList(userPreferences.teaching_designations),
              designated_grades: toOptionList(userPreferences.teaching_grades),
              curriculum: toOptionList(userPreferences.teaching_curriculum),
              core_expertise: toOptionList(userPreferences.teaching_coreExpertise)
            };
          case 'administration':
            return {
              job_category: { value: 'fullTime', label: 'Full Time' },
              designations: toOptionList(userPreferences.administrative_designations),
              curriculum: toOptionList(userPreferences.administrative_curriculum)
            };
          case 'teaching_administrative':
            return {
              job_category: { value: 'fullTime', label: 'Full Time' },
              subjects: toOptionList(userPreferences.teaching_administrative_subjects),
              designations: toOptionList(userPreferences.teaching_administrative_designations),
              designated_grades: toOptionList(userPreferences.teaching_administrative_grades),
              curriculum: toOptionList(userPreferences.teaching_administrative_curriculum),
              core_expertise: toOptionList(userPreferences.teaching_administrative_coreExpertise)
            };
          default:
            return {};
        }
      })();

      const jobProcess = userPreferences.full_time_online && userPreferences.full_time_offline
        ? { value: 'Hybrid', label: 'Hybrid' }
        : userPreferences.full_time_online
        ? { value: 'Online', label: 'Online' }
        : { value: 'Regular', label: 'Regular (Offline)' };

      const jobShifts = userPreferences.part_time_weekdays_offline || userPreferences.part_time_weekdays_online
        ? { value: 'Week days', label: 'Week days' }
        : userPreferences.part_time_weekends_offline || userPreferences.part_time_weekends_online
        ? { value: 'Week ends', label: 'Week ends' }
        : null;

      setFilters((prev) => {
        const locationUpdates = {
          country: userPreferences.preferred_country
            ? {
                value: userPreferences.preferred_country,
                label: userPreferences.preferred_country
              }
            : null,
          state: userPreferences.preferred_state
            ? {
                value: userPreferences.preferred_state,
                label: userPreferences.preferred_state
              }
            : null,
          city: userPreferences.preferred_city
            ? {
                value: userPreferences.preferred_city,
                label: userPreferences.preferred_city
              }
            : null
        };

        const newFilters = {
          ...prev,
          ...jobTypeMappings,
          ...locationUpdates,
          job_process: jobProcess,
          job_shifts: jobShifts
        };

        try {
          localStorage.setItem('jobFilters', JSON.stringify(newFilters));
        } catch (storageError) {
          console.error('Error saving filters:', storageError);
        }

        return newFilters;
      });
    } catch (error) {
      console.error('Error fetching job preferences:', error);
    }
  }, [user]);

  // Static filter options - Updated to match actual API data format
  const filterOptions = {
    jobCategories: [
      { value: 'fullTime', label: 'Full Time' },
      { value: 'Full-time', label: 'Full Time' },
      { value: 'fullPart', label: 'Full Time / Part Time' },
      { value: 'partTime', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'freelance', label: 'Freelance' }
    ],
    jobShifts: [
      { value: 'Week days', label: 'Week days' },
      { value: 'All days', label: 'All days' },
      { value: 'Week ends', label: 'Week ends' },
      { value: 'Vacations', label: 'Vacations' },
      { value: 'week days', label: 'Week days' },
      { value: 'all days', label: 'All days' },
      { value: 'week ends', label: 'Week ends' },
      { value: 'vacations', label: 'Vacations' }
    ],
    jobProcesses: [
      { value: 'Regular', label: 'Regular (Offline)' },
      { value: 'Online', label: 'Online' },
      { value: 'Hybrid', label: 'Hybrid' }
    ],
    jobSubProcesses: [
      { value: 'Online', label: 'Online' },
      { value: 'Tuition Center', label: 'Tuition Center' },
      { value: 'Group tuition', label: 'Group tuition' },
      { value: 'Private tuitions', label: 'Private tuitions' },
      { value: 'Home Tuitions', label: 'Home Tuitions' }
    ]
  };

  // Location options state
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Fetch job preferences when component mounts and user is available
  useEffect(() => {
    fetchAndMapJobPreferences();
  }, [fetchAndMapJobPreferences]);

  // Fetch applied jobs for current user
  const fetchAppliedJobs = useCallback(async () => {
    if (!user) {
      setAppliedJobs(new Set());
      return;
    }

    try {
      const { appliedJobs: applied } = await JobApiService.fetchUserJobPreferences(user);
      setAppliedJobs(new Set(applied));
    } catch (error) {
      console.error('Error fetching applied jobs:', error);
      setAppliedJobs(new Set());
    }
  }, [user]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      setJobs(data);
      setFilteredJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    GetCountries().then((countryData) => {
      const countries = countryData.map(country => ({
        value: country.id,
        label: country.name
      }));

      setLocationOptions(prev => ({
        ...prev,
        countries
      }));

      const indiaOption = countries.find(country => country.label && country.label.toLowerCase() === 'india');
      if (indiaOption) {
        setFilters(prev => {
          const currentLabel = String(prev.country?.label || prev.country?.value || '').toLowerCase();
          if (!prev.country || currentLabel === '' || currentLabel === 'india') {
            return { ...prev, country: indiaOption };
          }
          return prev;
        });
      }
    });

    // Load saved and favourite jobs from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      const favourite = JSON.parse(localStorage.getItem('favouriteJobs') || '[]');
      setSavedJobs(new Set(saved));
      setFavouriteJobs(new Set(favourite));
    } catch (error) {
      console.error('Error loading saved/favourite jobs:', error);
    }

    fetchJobs();
    fetchAppliedJobs();
  }, [fetchJobs, fetchAppliedJobs]);

  // Update states when country changes
  useEffect(() => {
    const countryValue = filters.country?.value;
    if (typeof countryValue === 'number') {
      GetState(countryValue).then((stateData) => {
        const states = stateData.map(state => ({
          value: state.id,
          label: state.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          states
        }));

        setFilters(prev => ({
          ...prev,
          state: null,
          city: null
        }));
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        states: [],
        cities: []
      }));
    }
  }, [filters.country]);

  // Update cities when state changes
  useEffect(() => {
    const countryValue = filters.country?.value;
    const stateValue = filters.state?.value;
    if (typeof countryValue === 'number' && typeof stateValue === 'number') {
      GetCity(countryValue, stateValue).then((cityData) => {
        const cities = cityData.map(city => ({
          value: city.name,
          label: city.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          cities
        }));

        // Reset city selection
        setFilters(prev => ({
          ...prev,
          city: null
        }));
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        cities: []
      }));
    }
  }, [filters.country, filters.state]);


  // Generate consistent job ID based on job content (not array position)
  const generateJobId = (job, index = 0) => {
    // First try the actual ID fields
    if (job.id) return job.id;
    if (job.job_id) return job.job_id;
    
    // If no ID fields, create a hash-like ID from job content
    const uniqueString = `${job.job_title || ''}-${job.institute_name || ''}-${job.city || ''}-${job.state_ut || ''}`.toLowerCase().replace(/\s+/g, '');
    
    // If we can create a meaningful ID from content, use it, otherwise fall back to index
    if (uniqueString.length > 3) {
      // Simple hash function to convert string to number
      let hash = 0;
      for (let i = 0; i < uniqueString.length; i++) {
        const char = uniqueString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    }
    
    // Last resort: use index
    return index ?? 0;
  };

  const getJobId = useCallback((job) => generateJobId(job), []);

  // Select styles for consistent Bootstrap look
  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '45px',
      borderRadius: '8px',
      borderColor: '#e6e6e6',
      '&:hover': {
        borderColor: '#e6e6e6'
      }
    }),
    placeholder: (base) => ({
      ...base,
      color: '#888888'
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('jobFilters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
    
    setFilters(newFilters);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    handleFilterChange(name, value);
  };

  const handleApplyFilters = () => {
    const { filteredJobs: results } = applyJobFilters(jobs, filters);
    setFilteredJobs(results);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ ...defaultJobFilters });
    setFilteredJobs(jobs);
    setCurrentPage(1);
    
    try {
      localStorage.removeItem('jobFilters');
    } catch (error) {
      console.error('Error clearing saved filters:', error);
    }
  };

  // Pagination
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const isJobApplied = useCallback(
    (job) => appliedJobs.has(getJobId(job)),
    [appliedJobs, getJobId]
  );

  const {
    selectedJobs,
    showMessageModal,
    jobToMessage,
    handleMessage,
    handleMessageModalOk,
    handleMessageModalContinue,
    showApplyPrompt,
    jobToApplyPrompt,
    handleApplyPromptClose,
    handleApplyPromptApply,
    showBulkMessageModal,
    handleCloseBulkMessageModal,
    bulkChannel,
    bulkMessage,
    bulkMessageChars,
    bulkError,
    coinBalance,
    handleChannelSelect,
    handleBulkMessageChange,
    handlePrepareBulkSend,
    showConfirmModal,
    bulkSummary,
    handleCancelConfirmation,
    handleConfirmSend,
    isSendingBulk,
    showInsufficientCoinsModal,
    requiredCoins,
    handleCloseInsufficientCoinsModal,
    handleRechargeNavigate
  } = useJobMessaging({
    user,
    filteredJobs,
    currentJobs,
    getJobId,
    isJobApplied,
    onViewJob: handleViewJob,
    onApplyJob: handleApplyClick
  });

  const paginate = (pageNumber) => setCurrentPage(pageNumber);


  // Handle save/unsave job
  const handleSaveJob = (jobId) => {
    try {
      const newSavedJobs = new Set(savedJobs);
      if (newSavedJobs.has(jobId)) {
        newSavedJobs.delete(jobId);
      } else {
        newSavedJobs.add(jobId);
      }
      setSavedJobs(newSavedJobs);
      const savedArray = Array.from(newSavedJobs);
      localStorage.setItem('savedJobs', JSON.stringify(savedArray));
    } catch (error) {
      console.error('Error handling save job:', error);
    }
  };

  // Handle favourite/unfavourite job
  const handleFavouriteJob = (jobId) => {
    try {
      const newFavouriteJobs = new Set(favouriteJobs);
      if (newFavouriteJobs.has(jobId)) {
        newFavouriteJobs.delete(jobId);
      } else {
        newFavouriteJobs.add(jobId);
      }
      setFavouriteJobs(newFavouriteJobs);
      localStorage.setItem('favouriteJobs', JSON.stringify(Array.from(newFavouriteJobs)));
    } catch (error) {
      console.error('Error handling favourite job:', error);
    }
  };

  // === APPLY JOB ===
  const handleApplyClick = async (job) => {
    if (!user) {
      toast.error("Please login to apply for jobs.");
      return;
    }
    setSelectedJob(job);
    setShowApplyModal(true);
    setApplyStatus("");
    setApplyError("");
    setApplyLoading(false);
    setCoinValue(null);

    try {
      const coinRes = await fetch(REDEEM_API);
      const coinData = await coinRes.json();
      const found = Array.isArray(coinData)
        ? coinData.find(d => d.firebase_uid === (user.firebase_uid || user.uid))
        : null;
      setCoinValue(found?.coin_value ?? 0);
    } catch {
      setCoinValue(0);
    }
  };

  // Function to scroll to a specific job
  const scrollToJob = (jobId) => {
    if (!jobId) {
      console.log('SearchJobs scrollToJob: No jobId provided');
      return;
    }
    
    console.log('SearchJobs scrollToJob: Looking for job with ID:', jobId);
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
      console.log('SearchJobs scrollToJob: Found job element:', !!jobElement);
      
      if (jobElement) {
        console.log('SearchJobs scrollToJob: Scrolling to job element');
        jobElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-job').forEach(el => {
          el.classList.remove('highlighted-job');
        });
        
        // Add highlight effect - this will persist until new selection
        jobElement.classList.add('highlighted-job');
        console.log('SearchJobs scrollToJob: Added highlight class');
      } else {
        console.log('SearchJobs scrollToJob: Job element not found in DOM');
      }
    }, 100);
  };

  // Function to handle back from job view
  const handleBackFromJobView = React.useCallback((jobId) => {
    console.log('SearchJobs handleBackFromJobView called, jobId:', jobId);
    // Scroll to the previously selected job
    if (jobId) {
      // Add a longer delay to ensure the list has fully rendered
      setTimeout(() => {
        scrollToJob(jobId);
      }, 300);
    }
  }, []);

  // Handle back from job view - expose the handler to parent
  React.useEffect(() => {
    if (onBackFromJobView) {
      console.log('SearchJobs: Registering handleBackFromJobView with parent');
      onBackFromJobView(handleBackFromJobView);
    }
  }, [onBackFromJobView, handleBackFromJobView]);

  // === VIEW JOB ===
  const handleViewJob = (job) => {
    if (job.is_closed === 1) {
      toast.error("This job is closed and cannot be viewed");
      return;
    }
    console.log('SearchJobs: Viewing job:', job.id);
    onViewJob && onViewJob(job);
  };

  const handleApplyJob = async () => {
    setApplyLoading(true);
    setApplyError("");
    setApplyStatus("");
    
    try {
      const result = await JobApiService.applyForJob(selectedJob, user, 100);
      
      if (result.status === "success") {
        setApplyStatus("success");
        setCoinValue(await JobApiService.getUserCoins(user));
        
        // Send WhatsApp notification
        await JobApiService.sendWhatsAppToInstitution(selectedJob, user);
        
        // Record coin history
        const personalDetails = await JobApiService.getUserPersonalDetails(user);
        if (personalDetails?.id) {
          await JobApiService.recordCoinHistory(selectedJob, user, 100, personalDetails.id);
        }
      } else if (result.status === "already") {
        setApplyStatus("already");
      } else {
      setApplyStatus("error");
        setApplyError(result.message);
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      setApplyStatus("error");
      setApplyError("Failed to apply for this job.");
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="widget-content">
        <div className="py-10">
          <LoadingState
            title="Searching for jobs…"
            subtitle="We’re applying your filters to find roles that match your criteria."
            layout="card"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="widget-content">
      {/* Filter Section */}
      <div className="filter-section mb-4">
        <div className="row">
          <div className="col-12">
            <h4 className="mb-3">Search & Filter Jobs</h4>
          </div>
        </div>

        {/* Filter Form */}
        <div className="filter-form">
          <div className="row g-3">
            {/* Location Filters */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Country">
                <Select
                  value={filters.country}
                  onChange={(value) => handleFilterChange('country', value)}
                  options={locationOptions.countries}
                  placeholder="Country"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>
            
            <div className="form-group col-md-4">
              <InputWithTooltip label="State">
                <Select
                  value={filters.state}
                  onChange={(value) => handleFilterChange('state', value)}
                  options={locationOptions.states}
                  placeholder="State"
                  isClearable
                  isDisabled={!filters.country}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>
            
            <div className="form-group col-md-4">
              <InputWithTooltip label="City">
                <Select
                  value={filters.city}
                  onChange={(value) => handleFilterChange('city', value)}
                  options={locationOptions.cities}
                  placeholder="City"
                  isClearable
                  isDisabled={!filters.state}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Category */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Job Category">
                <Select
                  value={filters.job_category}
                  onChange={(value) => handleFilterChange('job_category', value)}
                  options={filterOptions.jobCategories}
                  placeholder="Job Category"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Salary Range */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Min Salary">
                <input
                  type="number"
                  className="form-control"
                  name="min_salary"
                  value={filters.min_salary}
                  onChange={handleInputChange}
                  placeholder="Minimum Salary"
                />
              </InputWithTooltip>
            </div>
            
            <div className="form-group col-md-4">
              <InputWithTooltip label="Max Salary">
                <input
                  type="number"
                  className="form-control"
                  name="max_salary"
                  value={filters.max_salary}
                  onChange={handleInputChange}
                  placeholder="Maximum Salary"
                />
              </InputWithTooltip>
            </div>

            {/* Job Shifts */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Job Shifts">
                <Select
                  value={filters.job_shifts}
                  onChange={(value) => handleFilterChange('job_shifts', value)}
                  options={filterOptions.jobShifts}
                  placeholder="Job Shifts"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Process */}
              <div className="form-group col-md-4">
              <InputWithTooltip label="Job Process">
                <Select
                  value={filters.job_process}
                  onChange={(value) => handleFilterChange('job_process', value)}
                  options={filterOptions.jobProcesses}
                  placeholder="Job Process"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Subjects */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Subjects">
                <Select
                  value={filters.subjects}
                  onChange={(value) => handleFilterChange('subjects', value)}
                  options={apiOptions.subjects}
                  placeholder="Subjects"
                  isMulti
                  isClearable
                  isLoading={optionLoading.subjects}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Education */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Education">
                <Select
                  value={filters.education}
                  onChange={(value) => handleFilterChange('education', value)}
                  options={apiOptions.education}
                  placeholder="Education"
                  isMulti
                  isClearable
                  isLoading={optionLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>



            {/* Designations */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Designations">
                <Select
                  value={filters.designations}
                  onChange={(value) => handleFilterChange('designations', value)}
                  options={apiOptions.designations}
                  placeholder="Designations"
                  isMulti
                  isClearable
                  isLoading={optionLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Designated Grades */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Grades">
                <Select
                  value={filters.designated_grades}
                  onChange={(value) => handleFilterChange('designated_grades', value)}
                  options={apiOptions.grades}
                  placeholder="Grades"
                  isMulti
                  isClearable
                  isLoading={optionLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Curriculum */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Curriculum">
                <Select
                  value={filters.curriculum}
                  onChange={(value) => handleFilterChange('curriculum', value)}
                  options={apiOptions.curriculum}
                  placeholder="Curriculum"
                  isMulti
                  isClearable
                  isLoading={optionLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Core Expertise */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Core Expertise">
                <Select
                  value={filters.core_expertise}
                  onChange={(value) => handleFilterChange('core_expertise', value)}
                  options={apiOptions.coreExpertise}
                  placeholder="Core Expertise"
                  isMulti
                  isClearable
                  isLoading={optionLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Sub Process */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Job Sub Process">
                <Select
                  value={filters.job_sub_process}
                  onChange={(value) => handleFilterChange('job_sub_process', value)}
                  options={filterOptions.jobSubProcesses}
                  placeholder="Job Sub Process"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="filter-actions">
                <button 
                  className="btn btn-primary me-2" 
                  onClick={handleApplyFilters}
                  disabled={loading}
                >
                  Apply Filters
                </button>
                <button 
                  className="btn btn-outline-secondary me-2" 
                  onClick={handleReset}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="results-section">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-2xl font-semibold text-gray-800 m-0">Search Results ({filteredJobs.length} jobs found)</h5>
          <RecordsPerPageDropdown 
            itemsPerPage={jobsPerPage}
            onItemsPerPageChange={setJobsPerPage}
          />
        </div>

                        {/* Job Results */}
                {filteredJobs.length === 0 ? (
                  <div className="no-results text-center py-5">
                    <p>No jobs found matching your criteria.</p>
                    <button className="btn btn-outline-primary" onClick={handleReset}>
                      Reset Filters
                    </button>
                  </div>
                ) : currentJobs.length > 0 ? (
                  <div className="job-results">
                    <div className="job-list">
                      {currentJobs.map((job) => {
                        const jobId = getJobId(job);
                        const isSaved = savedJobs.has(jobId);
                        const isFavourite = favouriteJobs.has(jobId);
                        const isApplied = appliedJobs.has(jobId);

                return (
                  <JobCard
                    key={jobId}
                    job={job}
                    isSaved={isSaved}
                    isFavourite={isFavourite}
                    isApplied={isApplied}
                    loading={loading}
                    onViewJob={handleViewJob}
                    onSaveJob={() => handleSaveJob(jobId)}
                    onFavouriteJob={() => handleFavouriteJob(jobId)}
                    onApplyClick={handleApplyClick}
                    onMessage={handleMessage}
                    messageDisabled={!isApplied}
                    messageTooltip={!isApplied ? 'Apply to message this institute' : ''}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <p>No jobs found in current page. Try navigating to another page or adjusting the records per page setting.</p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={paginate}
          totalItems={filteredJobs.length}
          itemsPerPage={jobsPerPage}
          currentPageStart={indexOfFirstJob + 1}
          currentPageEnd={Math.min(indexOfLastJob, filteredJobs.length)}
        />

        {/* Apply Job Modal */}
        <ApplyModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onApply={handleApplyJob}
          coinValue={coinValue}
          loading={applyLoading}
          applyStatus={applyStatus}
          error={applyError}
        />
      </div>

      <JobMessagingModals
        showApplyPrompt={showApplyPrompt}
        jobToApplyPrompt={jobToApplyPrompt}
        onApplyPromptClose={handleApplyPromptClose}
        onApplyPromptApply={handleApplyPromptApply}
        showMessageModal={showMessageModal}
        jobToMessage={jobToMessage}
        onMessageModalOk={handleMessageModalOk}
        onMessageModalContinue={handleMessageModalContinue}
        showBulkMessageModal={showBulkMessageModal}
        bulkChannel={bulkChannel}
        bulkMessage={bulkMessage}
        bulkMessageChars={bulkMessageChars}
        coinBalance={coinBalance}
        selectedCount={selectedJobs.size}
        bulkError={bulkError}
        onChannelSelect={handleChannelSelect}
        onBulkMessageChange={handleBulkMessageChange}
        onCloseBulkMessageModal={handleCloseBulkMessageModal}
        onPrepareBulkSend={handlePrepareBulkSend}
        showConfirmModal={showConfirmModal}
        bulkSummary={bulkSummary}
        isSendingBulk={isSendingBulk}
        onCancelConfirmation={handleCancelConfirmation}
        onConfirmSend={handleConfirmSend}
        showInsufficientCoinsModal={showInsufficientCoinsModal}
        requiredCoins={requiredCoins}
        onCloseInsufficientCoinsModal={handleCloseInsufficientCoinsModal}
        onRechargeNavigate={handleRechargeNavigate}
      />
    </div>
  );
};

export default SearchJobs;