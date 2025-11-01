import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import axios from 'axios';
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

// Additional API endpoints for specific functionality
const JOB_PREFERENCES_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const REDEEM_API = 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const WHATSAPP_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp';
const RCS_API = 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage';


const SearchJobs = ({ onViewJob, onBackFromJobView }) => {
  const { user, loading: userLoading } = useAuth();
  // Initialize filters with saved values or defaults
  const defaultFilters = {
    core_subjects: [],
    optional_subject: [],
    country: null,
    state: null,
    city: null,
    job_category: null,
    designations: [],
    designated_grades: [],
    curriculum: [],
    subjects: [],
    core_expertise: [],
    job_shifts: null,
    job_process: null,
    job_sub_process: null,
    min_salary: '',
    max_salary: ''
  };

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('jobFilters');
      return saved ? JSON.parse(saved) : defaultFilters;
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return defaultFilters;
    }
  });

  // Jobs data state
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState(new Set());
  
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

  // API-loaded options state
  const [apiOptions, setApiOptions] = useState({
    subjects: [],
    designations: [],
    grades: [],
    curriculum: [],
    coreExpertise: []
  });

  // Loading states
  const [isLoading, setIsLoading] = useState({
    subjects: false,
    constants: false,
    preferences: false
  });

  // Function to fetch and map job preferences
  const fetchAndMapJobPreferences = async () => {
    try {
      if (!user?.uid) return;
      
      setIsLoading(prev => ({ ...prev, preferences: true }));
      const response = await fetch(JOB_PREFERENCES_API);
      const data = await response.json();
      
      // Find preferences for current user
      const userPreferences = data.find(pref => pref.firebase_uid === user.uid);
      if (!userPreferences) {
        setIsLoading(prev => ({ ...prev, preferences: false }));
        return;
      }

      // Map preferences to filter format
      const mappedFilters = {
        // Keep existing filters
        ...filters,
        
        // Map based on job type
        ...(userPreferences.Job_Type === 'teaching' ? {
          // Teaching specific mappings
          job_category: { value: 'fullTime', label: 'Full Time' },
          subjects: userPreferences.teaching_subjects?.map(subject => ({
            value: subject,
            label: subject
          })) || [],
          designations: userPreferences.teaching_designations?.map(designation => ({
            value: designation,
            label: designation
          })) || [],
          designated_grades: userPreferences.teaching_grades?.map(grade => ({
            value: grade,
            label: grade
          })) || [],
          curriculum: userPreferences.teaching_curriculum?.map(curr => ({
            value: curr,
            label: curr
          })) || [],
          core_subjects: userPreferences.teaching_subjects?.map(subject => ({
            value: subject,
            label: subject
          })) || [],
          core_expertise: userPreferences.teaching_coreExpertise?.map(expertise => ({
            value: expertise,
            label: expertise
          })) || []
        } : userPreferences.Job_Type === 'administration' ? {
          // Administration specific mappings
          job_category: { value: 'fullTime', label: 'Full Time' },
          designations: userPreferences.administrative_designations?.map(designation => ({
            value: designation,
            label: designation
          })) || [],
          curriculum: userPreferences.administrative_curriculum?.map(curr => ({
            value: curr,
            label: curr
          })) || []
        } : userPreferences.Job_Type === 'teaching_administrative' ? {
          // Teaching administrative specific mappings
          job_category: { value: 'fullTime', label: 'Full Time' },
          subjects: userPreferences.teaching_administrative_subjects?.map(subject => ({
            value: subject,
            label: subject
          })) || [],
          designations: userPreferences.teaching_administrative_designations?.map(designation => ({
            value: designation,
            label: designation
          })) || [],
          designated_grades: userPreferences.teaching_administrative_grades?.map(grade => ({
            value: grade,
            label: grade
          })) || [],
          curriculum: userPreferences.teaching_administrative_curriculum?.map(curr => ({
            value: curr,
            label: curr
          })) || [],
          core_expertise: userPreferences.teaching_administrative_coreExpertise?.map(expertise => ({
            value: expertise,
            label: expertise
          })) || []
        } : {}),

        // Map location
        country: userPreferences.preferred_country ? {
          value: userPreferences.preferred_country,
          label: userPreferences.preferred_country
        } : null,
        state: userPreferences.preferred_state ? {
          value: userPreferences.preferred_state,
          label: userPreferences.preferred_state
        } : null,
        city: userPreferences.preferred_city ? {
          value: userPreferences.preferred_city,
          label: userPreferences.preferred_city
        } : null,

        // Map job process based on preferences
        job_process: userPreferences.full_time_online && userPreferences.full_time_offline ? 
          { value: 'Hybrid', label: 'Hybrid' } :
          userPreferences.full_time_online ? 
          { value: 'Online', label: 'Online' } :
          { value: 'Regular', label: 'Regular (Offline)' },

        // Map job shifts based on preferences
        job_shifts: userPreferences.part_time_weekdays_offline || userPreferences.part_time_weekdays_online ?
          { value: 'Week days', label: 'Week days' } :
          userPreferences.part_time_weekends_offline || userPreferences.part_time_weekends_online ?
          { value: 'Week ends', label: 'Week ends' } :
          null
      };

      // Update filters
      setFilters(mappedFilters);
      
      // Save to localStorage
      localStorage.setItem('jobFilters', JSON.stringify(mappedFilters));
      
    } catch (error) {
      console.error("Error fetching job preferences:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, preferences: false }));
    }
  };

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
    if (user?.uid) {
      fetchAndMapJobPreferences();
    }
  }, [user]); // Only run when user changes

  // Fetch jobs data
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await JobApiService.fetchJobs();
      setJobs(data);
      setFilteredJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects from API
  const fetchSubjects = async () => {
    setIsLoading(prev => ({ ...prev, subjects: true }));
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
      const formattedSubjects = response.data.map(subject => ({
        value: subject.value || subject,
        label: subject.label || subject
      }));
      setApiOptions(prev => ({
        ...prev,
        subjects: formattedSubjects
      }));
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, subjects: false }));
    }
  };

  // Fetch other filter options from constants API
  const fetchConstants = async () => {
    setIsLoading(prev => ({ ...prev, constants: true }));
    try {
      const response = await fetch(import.meta.env.VITE_DEV1_API + "/constants");
      const data = await response.json();
      const transformedData = data.map(item => ({
        category: item.category,
        value: item.value,
        label: item.label
      }));

      setApiOptions(prev => ({
        ...prev,
        designations: transformedData.filter(item => item.category === "Teaching" || item.category === "Administration"),
        grades: transformedData.filter(item => item.category === "Grades"),
        curriculum: transformedData.filter(item => item.category === "Curriculum"),
        coreExpertise: transformedData.filter(item => item.category === "Core Expertise")
      }));
    } catch (error) {
      console.error("Error fetching constants:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, constants: false }));
    }
  };

  // Fetch applied jobs for current user
  const fetchAppliedJobs = async () => {
    try {
      const { appliedJobs } = await JobApiService.fetchUserJobPreferences(user);
      setAppliedJobs(new Set(appliedJobs));
    } catch (error) {
      console.error('Error fetching applied jobs:', error);
      setAppliedJobs(new Set());
    }
  };

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
    fetchSubjects();
    fetchConstants();
    fetchAppliedJobs();
  }, []);

  // Update states when country changes
  useEffect(() => {
    if (filters.country) {
      GetState(filters.country.value).then((stateData) => {
        const states = stateData.map(state => ({
          value: state.id,
          label: state.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          states
        }));

        // Reset state and city selections
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
    if (filters.country && filters.state) {
      GetCity(filters.country.value, filters.state.value).then((cityData) => {
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
  const generateJobId = (job, index) => {
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
    return index;
  };

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

  // Apply filters function
  const handleApplyFilters = () => {
    // Format filters
    const formattedFilters = {
      ...filters,
      country: filters.country?.label || filters.country?.value,
      state: filters.state?.label || filters.state?.value,
      city: filters.city?.label || filters.city?.value,
      job_category: filters.job_category?.value,
      job_shifts: filters.job_shifts?.value,
      job_process: filters.job_process?.value,
      job_sub_process: filters.job_sub_process?.value,

      subjects: filters.subjects?.map(s => s.value) || [],
      designations: filters.designations?.map(d => d.value) || [],
      designated_grades: filters.designated_grades?.map(g => g.value) || [],
      curriculum: filters.curriculum?.map(c => c.value) || [],
      core_subjects: filters.core_subjects?.map(s => s.value) || [],
      core_expertise: filters.core_expertise?.map(e => e.value) || []
    };

    // Check if any filters are actually applied
    const hasActiveFilters = Object.keys(formattedFilters).some(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value > 0;
      return value !== null && value !== undefined;
    });

    // If no filters are applied, show all jobs
    if (!hasActiveFilters) {
      setFilteredJobs(jobs);
      setCurrentPage(1);
      setActiveFilters(new Set());
      return;
    }

    // Apply filtering logic similar to AllCandidates but with a key difference:
    // Instead of filtering out jobs that don't match ALL criteria, we'll keep ALL jobs
    // and calculate a relevance score for each one, then sort by that score
    
    // Get active filter keys first
    const activeFilterKeys = Object.keys(formattedFilters).filter(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });

    // First, collect all jobs with their match data
    let jobsWithMatches = jobs.map(job => {
      // Check for empty job data - if key fields are missing, we might need to skip
      const hasJobData = job.job_title || job.designation || job.institute_name;
      if (!hasJobData) {
        return { job, matchedFilters: [], relevanceScore: 0, passes: false };
      }
      
      // Track which filters this job matches
      const matchedFilters = [];
      // Track if this job passes the minimum required filters (we can define which ones are required)
      let passes = true;
      
      // Location filters - use flexible matching with type safety
      if (formattedFilters.country) {
        const jobCountry = String(job.country || job.country_name || '').toLowerCase().trim();
        const filterValue = String(formattedFilters.country || '').toLowerCase().trim();
        
        // Special handling for India - many jobs might have this field empty but are implicitly in India
        if (filterValue === 'india' && (jobCountry === '' || jobCountry === 'india')) {
          console.log(`✅ Country filter passed: Empty country assumed to be India`);
          matchedFilters.push('country');
        }
        // Normal country matching
        else if (jobCountry !== filterValue && !jobCountry.includes(filterValue) && !filterValue.includes(jobCountry)) {
          console.log(`❌ Country filter failed: '${jobCountry}' vs '${filterValue}'`);
          // We don't return false anymore, just don't add to matchedFilters
        }
        else {
          console.log(`✅ Country filter passed: '${jobCountry}' vs '${filterValue}'`);
          matchedFilters.push('country');
        }
      }
      if (formattedFilters.state) {
        const jobState = String(job.state_ut || job.state || job.state_name || '').toLowerCase().trim();
        const filterValue = String(formattedFilters.state || '').toLowerCase().trim();
        
        // More flexible matching for states
        if (jobState === filterValue || 
            jobState.includes(filterValue) || 
            filterValue.includes(jobState)) {
          console.log(`✅ State filter passed: '${jobState}' vs '${filterValue}'`);
          matchedFilters.push('state');
        } else {
          console.log(`❌ State filter failed: '${jobState}' vs '${filterValue}'`);
          // Consider state a required filter - if it fails, mark the job as not passing
          passes = false;
        }
      }
      if (formattedFilters.city) {
        const jobCity = String(job.city || job.city_name || '').toLowerCase().trim();
        const filterValue = String(formattedFilters.city || '').toLowerCase().trim();
        if (jobCity === filterValue || jobCity.includes(filterValue) || filterValue.includes(jobCity)) {
          console.log(`✅ City filter passed: '${jobCity}' vs '${filterValue}'`);
          matchedFilters.push('city');
        } else {
          console.log(`❌ City filter failed: '${jobCity}' vs '${filterValue}'`);
          // Consider city a required filter - if it fails, mark the job as not passing
          passes = false;
        }
      }
      
      // Job category filter - very flexible matching with special cases
      if (formattedFilters.job_category) {
        const jobType = (job.job_type || job.Job_Type || '').toLowerCase().trim();
        const filterValue = formattedFilters.job_category.toLowerCase().trim();
        
        // Special mapping for common mismatches
        const jobTypeMapping = {
          'fullpart': ['full-time', 'fulltime', 'full-time-part-time'],
          'fulltime': ['full-time', 'fulltime', 'full-time-part-time'],
          'full-time': ['fulltime', 'fullpart', 'full-time-part-time'],
          'parttime': ['part-time', 'parttime'],
          'part-time': ['parttime', 'parttime']
        };
        
        // Check if there's a special mapping for this job type
        const mappedValues = jobTypeMapping[jobType] || [];
        const hasSpecialMatch = mappedValues.some(mappedValue => 
          mappedValue.toLowerCase() === filterValue
        );
        
        // Try multiple matching strategies
        const normalizedJobType = jobType.replace(/\s+/g, '').replace(/[/-]/g, '');
        const normalizedFilter = filterValue.replace(/\s+/g, '').replace(/[/-]/g, '');
        
        const isMatch = 
          jobType === filterValue ||                           // Exact match
          jobType.includes(filterValue) ||                     // Contains match
          filterValue.includes(jobType) ||                     // Reverse contains
          normalizedJobType === normalizedFilter ||            // Normalized exact
          normalizedJobType.includes(normalizedFilter) ||      // Normalized contains
          normalizedFilter.includes(normalizedJobType) ||      // Normalized reverse
          hasSpecialMatch;                                    // Special mapping match
        
        if (!isMatch) {
          console.log(`❌ Job category filter failed: '${jobType}' vs '${filterValue}' (normalized: '${normalizedJobType}' vs '${normalizedFilter}')`);
        } else {
          console.log(`✅ Job category filter passed: '${jobType}' matched '${filterValue}'`);
          matchedFilters.push('job_category');
        }
      }
      
      // Job shifts filter - handle arrays properly with case-insensitive matching
      if (formattedFilters.job_shifts) {
        // Handle case where job_shifts is null, undefined, or empty array
        if (!job.job_shifts || 
            (Array.isArray(job.job_shifts) && job.job_shifts.length === 0) ||
            (Array.isArray(job.job_shifts) && job.job_shifts.every(item => !item))) {
          
          // For "All days" filter, match everything including empty job_shifts
          if (String(formattedFilters.job_shifts).toLowerCase().includes('all day')) {
            console.log(`✅ Job shifts filter passed: 'All days' matches empty job_shifts`);
            matchedFilters.push('job_shifts');
          } else if (String(formattedFilters.job_shifts).toLowerCase().includes('week day')) {
            // For "Week days" filter, also match empty job_shifts as most jobs are weekday by default
            console.log(`✅ Job shifts filter passed: 'Week days' matches empty job_shifts (assumed default)`);
            matchedFilters.push('job_shifts');
          } else {
            console.log(`❌ Job shifts filter failed: Empty job_shifts`);
          }
        } else {
          const jobShifts = Array.isArray(job.job_shifts) ? job.job_shifts : [job.job_shifts];
          const filterValue = String(formattedFilters.job_shifts || '').toLowerCase().trim();
          
          // Special case for "All days" - it should match everything
          if (filterValue === 'all days' || filterValue.includes('all day')) {
            console.log(`✅ Job shifts filter passed: 'All days' matches everything`);
            matchedFilters.push('job_shifts');
          }
          
          // For normal shifts, check for matches
          else {
            const hasMatch = jobShifts.some(shift => {
              const shiftStr = String(shift || '').toLowerCase().trim();
              if (!shiftStr) return false;
              
              // Direct match
              if (shiftStr === filterValue) return true;
              
              // Contains match (either direction)
              if (shiftStr.includes(filterValue) || filterValue.includes(shiftStr)) return true;
              
              // Word-by-word match for multi-word values
              const shiftWords = shiftStr.split(/\s+/);
              const filterWords = filterValue.split(/\s+/);
              
              return filterWords.some(filterWord => 
                shiftWords.some(shiftWord => 
                  shiftWord === filterWord || shiftWord.includes(filterWord) || filterWord.includes(shiftWord)
                )
              );
            });
            
            if (hasMatch) {
              console.log(`✅ Job shifts filter passed: '${jobShifts}'`);
              matchedFilters.push('job_shifts');
            } else {
              console.log(`❌ Job shifts filter failed: '${jobShifts}' vs '${filterValue}'`);
            }
          }
        }
      }
      
      // Job process filter - handle arrays properly
      if (formattedFilters.job_process) {
        // Handle empty job_process similar to job_shifts
        if (!job.job_process || 
            (Array.isArray(job.job_process) && job.job_process.length === 0) ||
            (Array.isArray(job.job_process) && job.job_process.every(item => !item))) {
          
          // For "Regular" filter, match empty job_process as most jobs are regular by default
          if (String(formattedFilters.job_process).toLowerCase().includes('regular')) {
            console.log(`✅ Job process filter passed: 'Regular' matches empty job_process (assumed default)`);
            matchedFilters.push('job_process');
          } else {
            console.log(`❌ Job process filter failed: Empty job_process`);
          }
        } else {
          const jobProcesses = Array.isArray(job.job_process) ? job.job_process : [job.job_process];
          const filterValue = String(formattedFilters.job_process || '').toLowerCase().trim();
          
          // Process mapping for common terms
          const processMap = {
            'regular': ['offline', 'in-person', 'on-site', 'onsite'],
            'online': ['remote', 'virtual'],
            'hybrid': ['mixed', 'flexible']
          };
          
          // Check for direct match
          const hasDirectMatch = jobProcesses.some(process => {
            const processStr = String(process || '').toLowerCase().trim();
            return processStr === filterValue || processStr.includes(filterValue) || filterValue.includes(processStr);
          });
          
          // Check for mapped match
          const hasMappedMatch = jobProcesses.some(process => {
            const processStr = String(process || '').toLowerCase().trim();
            const mappedValues = processMap[filterValue] || [];
            return mappedValues.some(val => processStr.includes(val));
          });
          
          if (hasDirectMatch || hasMappedMatch) {
            console.log(`✅ Job process filter passed: '${jobProcesses}' vs '${filterValue}'`);
            matchedFilters.push('job_process');
          } else {
            console.log(`❌ Job process filter failed: '${jobProcesses}' vs '${filterValue}'`);
          }
        }
      }
      

      
      // Subjects filter - handle arrays properly
      if (formattedFilters.subjects.length > 0) {
        const jobCoreSubjects = Array.isArray(job.core_subjects) ? job.core_subjects : [job.core_subjects];
        const jobSubjects = Array.isArray(job.subjects) ? job.subjects : [job.subjects];
        const allJobSubjects = [...jobCoreSubjects, ...jobSubjects].filter(Boolean);
        
        const hasMatch = formattedFilters.subjects.some(filterSubject => 
          allJobSubjects.some(jobSubject => 
            String(jobSubject || '').toLowerCase().includes(String(filterSubject || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Subjects filter passed`);
          matchedFilters.push('subjects');
        } else {
          console.log(`❌ Subjects filter failed`);
        }
      }
      
      // Designations filter - handle arrays properly
      if (formattedFilters.designations.length > 0) {
        const jobDesignations = Array.isArray(job.designations) ? job.designations : [job.designations];
        const jobTitle = job.job_title || '';
        const allJobDesignations = [...jobDesignations, jobTitle].filter(Boolean);
        
        const hasMatch = formattedFilters.designations.some(filterDesignation => 
          allJobDesignations.some(jobDesignation => 
            String(jobDesignation || '').toLowerCase().includes(String(filterDesignation || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Designations filter passed`);
          matchedFilters.push('designations');
        } else {
          console.log(`❌ Designations filter failed`);
        }
      }
      
      // Grades filter - handle arrays properly
      if (formattedFilters.designated_grades.length > 0) {
        const jobGrades = Array.isArray(job.designated_grades) ? job.designated_grades : [job.designated_grades];
        const jobGradeRange = job.grade_range || '';
        const allJobGrades = [...jobGrades, jobGradeRange].filter(Boolean);
        
        const hasMatch = formattedFilters.designated_grades.some(filterGrade => 
          allJobGrades.some(jobGrade => 
            String(jobGrade || '').toLowerCase().includes(String(filterGrade || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Designated grades filter passed`);
          matchedFilters.push('designated_grades');
        } else {
          console.log(`❌ Designated grades filter failed`);
        }
      }
      
      // Curriculum filter - handle arrays properly
      if (formattedFilters.curriculum.length > 0) {
        const jobCurriculum = Array.isArray(job.curriculum) ? job.curriculum : [job.curriculum];
        const hasMatch = formattedFilters.curriculum.some(filterCurriculum => 
          jobCurriculum.some(jobCurr => 
            String(jobCurr || '').toLowerCase().includes(String(filterCurriculum || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Curriculum filter passed`);
          matchedFilters.push('curriculum');
        } else {
          console.log(`❌ Curriculum filter failed`);
        }
      }
      
      // Core subjects filter - handle arrays properly
      if (formattedFilters.core_subjects.length > 0) {
        const jobCoreSubjects = Array.isArray(job.core_subjects) ? job.core_subjects : [job.core_subjects];
        const hasMatch = formattedFilters.core_subjects.some(filterSubject => 
          jobCoreSubjects.some(jobSubject => 
            String(jobSubject || '').toLowerCase().includes(String(filterSubject || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Core subjects filter passed`);
          matchedFilters.push('core_subjects');
        } else {
          console.log(`❌ Core subjects filter failed`);
        }
      }
      
      // Core expertise filter - handle arrays properly
      if (formattedFilters.core_expertise.length > 0) {
        const jobExpertise = Array.isArray(job.core_expertise) ? job.core_expertise : [job.core_expertise];
        const hasMatch = formattedFilters.core_expertise.some(filterExpertise => 
          jobExpertise.some(jobExp => 
            String(jobExp || '').toLowerCase().includes(String(filterExpertise || '').toLowerCase())
          )
        );
        if (hasMatch) {
          console.log(`✅ Core expertise filter passed`);
          matchedFilters.push('core_expertise');
        } else {
          console.log(`❌ Core expertise filter failed`);
        }
      }
      
      // Salary range filter
      if (formattedFilters.min_salary || formattedFilters.max_salary) {
        const minSal = parseInt(formattedFilters.min_salary) || 0;
        const maxSal = parseInt(formattedFilters.max_salary) || Infinity;
        const jobMinSal = parseInt(job.min_salary) || 0;
        const jobMaxSal = parseInt(job.max_salary) || 0;
        
        let salaryMatches = false;
        if (jobMinSal > 0 && jobMaxSal > 0) {
          // If job has both min and max salary, check if ranges overlap
          if (!(jobMaxSal < minSal || jobMinSal > maxSal)) {
            salaryMatches = true;
          }
        } else if (jobMinSal > 0) {
          // If job has only min salary, check against our max
          if (!(jobMinSal > maxSal)) {
            salaryMatches = true;
          }
        } else if (jobMaxSal > 0) {
          // If job has only max salary, check against our min
          if (!(jobMaxSal < minSal)) {
            salaryMatches = true;
          }
        }
        
        if (salaryMatches) {
          console.log(`✅ Salary filter passed`);
          matchedFilters.push('salary');
        } else {
          console.log(`❌ Salary filter failed`);
        }
      }

      // Calculate relevance score (percentage of active filters matched)
      let relevanceScore = 100; // Default to 100% if no filters are active
      
      // Ensure all jobs have at least some minimal score when filters are active
      // This helps prevent 0% matches which looks bad in the UI
      if (activeFilterKeys.length > 0) {
        // Filter out location filters that don't apply to this job
        const validFilters = activeFilterKeys.filter(key => {
          if (key === 'country' && (!job.country && !job.country_name)) return false;
          if (key === 'state' && (!job.state_ut && !job.state && !job.state_name)) return false;
          if (key === 'city' && (!job.city && !job.city_name)) return false;
          return true;
        });
        
        // Filter matched filters to only include valid ones
        const validMatchedFilters = matchedFilters.filter(filter => {
          if (filter === 'country' && (!job.country && !job.country_name)) return false;
          if (filter === 'state' && (!job.state_ut && !job.state && !job.state_name)) return false;
          if (filter === 'city' && (!job.city && !job.city_name)) return false;
          return true;
        });
        
        // Add a base minimum score (40%) for all jobs that pass the filter criteria
        // This ensures that all jobs that pass the filters look like reasonable matches
        const baseScore = 40;
        
        // Calculate the remaining 60% based on matched filter proportion
        const matchScore = validFilters.length > 0 
          ? Math.round((validMatchedFilters.length / validFilters.length) * 60)
          : 60;
        
        // Combine scores and ensure it's a valid number
        relevanceScore = baseScore + matchScore;
        
        // Validate the score is a proper number
        if (isNaN(relevanceScore) || !isFinite(relevanceScore)) {
          relevanceScore = 40; // Default to base score if calculation fails
        }
      }
      
      // Return the job with its match data
      return {
        job,
        matchedFilters,
        relevanceScore,
        passes
      };
    });
    
    // Now filter to only include jobs that pass the required filters
    // and have at least one matching filter if filters are active
    let filtered = jobsWithMatches
      .filter(item => item.passes && (activeFilterKeys.length === 0 || item.matchedFilters.length > 0))
      .map(item => ({
        ...item.job,
        relevanceScore: item.relevanceScore,
        matchedFilters: item.matchedFilters
      }));

    // Filtering complete
    
    // Sort by relevance score (highest first)
    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Set results and active filters
    setFilteredJobs(filtered);
    setCurrentPage(1);
    setActiveFilters(new Set(activeFilterKeys));
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setFilteredJobs(jobs);
    setActiveFilters(new Set());
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

  // Smart pagination: show limited page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const delta = 2; // Pages to show around current page
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after 1 if needed
    if (startPage > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page (excluding 1 and last page)
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots before last page if needed
    if (endPage < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();
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

  // ===== RCS Sending Function =====
  const sendRcsApply = async ({ phone, userName, orgName }) => {
    try {
      const contactId = phone.startsWith("91") ? phone : `91${phone}`;
      await fetch(RCS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contactId,
          templateName: "job_applied",
          customParam: {
            NAME: userName,
            SCHOOL: orgName
          },
          sent_by: "suhas",
          sent_email: "suhas75@gmail.com"
        })
      });
    } catch (err) {}
  };

  // WhatsApp sending function after apply success, now triggers RCS also
  const sendWhatsAppApply = async (job) => {
    let phone = "";
    let userName = "";
    let orgName = "";
    let errors = [];

    try {
      const loginRes = await fetch(`${LOGIN_API}?firebase_uid=${user.firebase_uid || user.uid}`);
      if (!loginRes.ok) throw new Error("Could not fetch user details");
      const loginData = await loginRes.json();
      if (Array.isArray(loginData) && loginData.length > 0) {
        phone = loginData[0].phone_number || "";
        userName = loginData[0].name || "";
      }
      if (!phone) errors.push("Phone number not found for WhatsApp.");
      if (!userName) errors.push("Name not found for WhatsApp.");
    } catch (err) {
      errors.push("Failed to fetch user phone/name.");
    }

    try {
      if (job.firebase_uid) {
        const orgRes = await fetch(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
        if (!orgRes.ok) throw new Error("Could not fetch org");
        const orgData = await orgRes.json();
        if (Array.isArray(orgData) && orgData.length > 0) {
          orgName = orgData[0].name || "";
        }
      }
      if (!orgName) orgName = job.institute_name || "";
      if (!orgName) errors.push("Organisation name not found for WhatsApp.");
    } catch (err) {
      if (!orgName) errors.push("Failed to fetch organisation name.");
    }

    if (errors.length) {
      return;
    }

    try {
      await fetch(WHATSAPP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.startsWith("91") ? phone : `91${phone}`,
          templateName: "applied_job",
          language: "en",
          bodyParams: [
            { type: "text", text: userName },
            { type: "text", text: `*${orgName}*` }
          ],
          sent_by: "suhas",
          sent_email: "suhas75@gmail.com"
        })
      });
      await sendRcsApply({ phone, userName, orgName });
    } catch (err) {
      toast.error("Failed to send WhatsApp or RCS notification.");
    }
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
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Loading jobs...</p>
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
                  isLoading={isLoading.subjects}
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
                  isLoading={isLoading.constants}
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
                  isLoading={isLoading.constants}
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
                  isLoading={isLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Core Subjects */}
            <div className="form-group col-md-4">
              <InputWithTooltip label="Core Subjects">
                <Select
                  value={filters.core_subjects}
                  onChange={(value) => handleFilterChange('core_subjects', value)}
                  options={apiOptions.subjects}
                  placeholder="Core Subjects"
                  isMulti
                  isClearable
                  isLoading={isLoading.subjects}
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
                  isLoading={isLoading.constants}
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
                      {currentJobs.map((job, index) => {
                        // Calculate the real index in the full jobs array for consistent ID generation
                        const realIndex = indexOfFirstJob + index;
                        const jobId = generateJobId(job, realIndex);
                        const isSaved = savedJobs.has(jobId);
                        const isFavourite = favouriteJobs.has(jobId);
                
                return (
                  <JobCard
                    key={jobId}
                    job={job}
                    isSaved={isSaved}
                    isFavourite={isFavourite}
                    isApplied={appliedJobs.has(generateJobId(job))}
                    loading={loading}
                    onViewJob={handleViewJob}
                    onSaveJob={() => handleSaveJob(jobId)}
                    onFavouriteJob={() => handleFavouriteJob(jobId)}
                    onApplyClick={handleApplyClick}
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
    </div>
  );
};

export default SearchJobs;