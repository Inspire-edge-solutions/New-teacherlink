import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
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


const SearchJobs = ({ onViewJob, onBackFromJobView, highlightJobId }) => {
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
  const [pendingScrollJob, setPendingScrollJob] = useState(null);
  const skipPageResetRef = useRef(false);
  const [highlightedJobId, setHighlightedJobId] = useState(null);
  const hasAppliedPreferencesRef = useRef(false);
  const [userPreferencesData, setUserPreferencesData] = useState(null);
  const [pendingLocationPref, setPendingLocationPref] = useState({
    country: null,
    state: null,
    city: null
  });

  const saveFiltersToStorage = useCallback((filtersToSave) => {
    try {
      localStorage.setItem('jobFilters', JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, []);

  const { options: apiOptions, loading: optionLoading } = useJobFilterOptions();

  useEffect(() => {
    hasAppliedPreferencesRef.current = false;
  }, [user?.uid]);

  // Function to fetch and map job preferences
  const fetchAndMapJobPreferences = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(JOB_PREFERENCES_API);
      const data = await response.json();

      const resolvePreferences = (payload) => {
        if (Array.isArray(payload)) {
          return payload;
        }

        if (payload && Array.isArray(payload.value)) {
          return payload.value;
        }

        if (payload && typeof payload.body === 'string') {
          try {
            const parsedBody = JSON.parse(payload.body);
            return resolvePreferences(parsedBody);
          } catch (error) {
            console.error('Error parsing job preference body:', error);
          }
        }

        if (payload && payload.body && Array.isArray(payload.body.value)) {
          return payload.body.value;
        }

        return [];
      };

      const preferencesArray = resolvePreferences(data);
      const userPreferences = preferencesArray.find((pref) => pref.firebase_uid === user.uid) || null;

      if (!userPreferences) {
        return;
      }

      setUserPreferencesData(userPreferences);
      hasAppliedPreferencesRef.current = false;
      setPendingLocationPref({
        country: userPreferences.preferred_country || null,
        state: userPreferences.preferred_state || null,
        city: userPreferences.preferred_city || null
      });
    } catch (error) {
      console.error('Error fetching job preferences:', error);
    }
  }, [user, saveFiltersToStorage]);

  // Static filter options - Updated to match actual API data format
  const filterOptions = useMemo(() => ({
    jobCategories: [
      { value: 'fullTime', label: 'Full Time' },
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
  }), []);

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

  useEffect(() => {
    if (!userPreferencesData || hasAppliedPreferencesRef.current) {
      return;
    }

    const normalize = (value) =>
      String(value ?? '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim();

    const matchOrCreateOption = (rawValue, optionList = []) => {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
      }

      const rawLabel =
        typeof rawValue === 'object' && rawValue !== null
          ? rawValue.label ?? rawValue.value
          : rawValue;
      const rawStoredValue =
        typeof rawValue === 'object' && rawValue !== null
          ? rawValue.value ?? rawValue.label
          : rawValue;

      const normalizedLabel = normalize(rawLabel);
      const normalizedValue = normalize(rawStoredValue);

      const matchedOption = optionList.find((option) => {
        const optionLabel = normalize(option.label);
        const optionValue = normalize(option.value);
        return (
          (optionLabel && optionLabel === normalizedLabel) ||
          (optionValue && optionValue === normalizedValue)
        );
      });

      if (matchedOption) {
        return matchedOption;
      }

      const label =
        typeof rawLabel === 'string' && rawLabel.trim().length > 0
          ? rawLabel
          : String(rawStoredValue ?? '').trim();

      const value =
        typeof rawStoredValue === 'string' && rawStoredValue.trim().length > 0
          ? rawStoredValue
          : label;

      if (!label) {
        return null;
      }

      return { value, label };
    };

    const mapListToOptions = (values, optionList = []) => {
      if (!Array.isArray(values) || values.length === 0) {
        return [];
      }

      const unique = new Map();

      values.forEach((item) => {
        const option = matchOrCreateOption(item, optionList);
        if (!option) {
          return;
        }

        const key = normalize(option.value) || normalize(option.label);
        if (key && !unique.has(key)) {
          unique.set(key, option);
        }
      });

      return Array.from(unique.values());
    };

    const isTruthy = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      const normalized = String(value).toLowerCase();
      return ['1', 'true', 'yes', 'activelysearching', 'available', 'looking'].includes(
        normalized.replace(/\s+/g, '')
      );
    };

    const hasFullTimeOnline = isTruthy(userPreferencesData.full_time_online);
    const hasFullTimeOffline = isTruthy(userPreferencesData.full_time_offline);
    const hasPartTimeWeekdays =
      isTruthy(userPreferencesData.part_time_weekdays_offline) ||
      isTruthy(userPreferencesData.part_time_weekdays_online);
    const hasPartTimeWeekends =
      isTruthy(userPreferencesData.part_time_weekends_offline) ||
      isTruthy(userPreferencesData.part_time_weekends_online);
    const hasPartTimeVacations =
      isTruthy(userPreferencesData.part_time_vacations_offline) ||
      isTruthy(userPreferencesData.part_time_vacations_online);

    const hasPartTime =
      hasPartTimeWeekdays || hasPartTimeWeekends || hasPartTimeVacations;
    const hasFullTime = hasFullTimeOnline || hasFullTimeOffline;

    let jobCategoryLabel = null;
    if (hasFullTime && hasPartTime) {
      jobCategoryLabel = 'Full Time / Part Time';
    } else if (hasFullTime) {
      jobCategoryLabel = 'Full Time';
    } else if (hasPartTime) {
      jobCategoryLabel = 'Part Time';
    }

    const jobCategoryOption = matchOrCreateOption(
      jobCategoryLabel,
      filterOptions.jobCategories
    );

    const jobProcessOption = (() => {
      if (hasFullTimeOnline && hasFullTimeOffline) {
        return matchOrCreateOption('Hybrid', filterOptions.jobProcesses);
      }
      if (hasFullTimeOnline) {
        return matchOrCreateOption('Online', filterOptions.jobProcesses);
      }
      if (hasFullTimeOffline) {
        return matchOrCreateOption('Regular', filterOptions.jobProcesses);
      }
      return null;
    })();

    const jobShiftsOption = (() => {
      if (hasPartTimeWeekdays && hasPartTimeWeekends) {
        return matchOrCreateOption('All days', filterOptions.jobShifts);
      }
      if (hasPartTimeWeekdays) {
        return matchOrCreateOption('Week days', filterOptions.jobShifts);
      }
      if (hasPartTimeWeekends) {
        return matchOrCreateOption('Week ends', filterOptions.jobShifts);
      }
      if (hasPartTimeVacations) {
        return matchOrCreateOption('Vacations', filterOptions.jobShifts);
      }
      return null;
    })();

    const jobSubProcessOption = (() => {
      const mapping = [
        {
          condition:
            isTruthy(userPreferencesData.Home_Tutor_offline) ||
            isTruthy(userPreferencesData.Home_Tutor_online),
          label: 'Home Tuitions'
        },
        {
          condition:
            isTruthy(userPreferencesData.Private_Tutor_offline) ||
            isTruthy(userPreferencesData.Private_Tutor_online) ||
            isTruthy(userPreferencesData.Private_Tutions_online_online),
          label: 'Private tuitions'
        },
        {
          condition:
            isTruthy(userPreferencesData.Group_Tutor_offline) ||
            isTruthy(userPreferencesData.Group_Tutor_online),
          label: 'Group tuition'
        },
        {
          condition:
            isTruthy(userPreferencesData.coaching_institute_offline) ||
            isTruthy(userPreferencesData.coaching_institute_online),
          label: 'Tuition Center'
        },
        {
          condition:
            isTruthy(userPreferencesData.school_college_university_online) ||
            isTruthy(userPreferencesData.Ed_TechCompanies_online),
          label: 'Online'
        }
      ];

      const entry = mapping.find((item) => item.condition);
      return entry ? matchOrCreateOption(entry.label, filterOptions.jobSubProcesses) : null;
    })();

    const subjects = mapListToOptions(
      [
        ...(userPreferencesData.teaching_subjects || []),
        ...(userPreferencesData.teaching_administrative_subjects || [])
      ],
      apiOptions.subjects
    );

    const designations = mapListToOptions(
      [
        ...(userPreferencesData.teaching_designations || []),
        ...(userPreferencesData.administrative_designations || []),
        ...(userPreferencesData.teaching_administrative_designations || [])
      ],
      apiOptions.designations
    );

    const grades = mapListToOptions(
      [
        ...(userPreferencesData.teaching_grades || []),
        ...(userPreferencesData.teaching_administrative_grades || [])
      ],
      apiOptions.grades
    );

    const curriculum = mapListToOptions(
      [
        ...(userPreferencesData.teaching_curriculum || []),
        ...(userPreferencesData.administrative_curriculum || []),
        ...(userPreferencesData.teaching_administrative_curriculum || [])
      ],
      apiOptions.curriculum
    );

    const coreExpertise = mapListToOptions(
      [
        ...(userPreferencesData.teaching_coreExpertise || []),
        ...(userPreferencesData.teaching_administrative_coreExpertise || [])
      ],
      apiOptions.coreExpertise
    );

    const preferenceFilters = {};

    if (jobCategoryOption) preferenceFilters.job_category = jobCategoryOption;
    if (subjects.length > 0) preferenceFilters.subjects = subjects;
    if (designations.length > 0) preferenceFilters.designations = designations;
    if (grades.length > 0) preferenceFilters.designated_grades = grades;
    if (curriculum.length > 0) preferenceFilters.curriculum = curriculum;
    if (coreExpertise.length > 0) preferenceFilters.core_expertise = coreExpertise;
    if (jobProcessOption) preferenceFilters.job_process = jobProcessOption;
    if (jobShiftsOption) preferenceFilters.job_shifts = jobShiftsOption;
    if (jobSubProcessOption) preferenceFilters.job_sub_process = jobSubProcessOption;

    if (Object.keys(preferenceFilters).length === 0) {
      hasAppliedPreferencesRef.current = true;
      return;
    }

    setFilters((prev) => {
      const mergedFilters = {
        ...prev,
        ...preferenceFilters
      };

      saveFiltersToStorage(mergedFilters);
      return mergedFilters;
    });

    hasAppliedPreferencesRef.current = true;
  }, [apiOptions, filterOptions, saveFiltersToStorage, userPreferencesData]);

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

        setFilters(prev => {
          const currentState = prev.state;
          const currentStateLabel = String(currentState?.label || currentState?.value || '').toLowerCase();
          const hasMatchingState = states.some((stateOption) => {
            const optionLabel = String(stateOption.label || '').toLowerCase();
            if (currentState?.value !== undefined && currentState?.value !== null && stateOption.value === currentState.value) {
              return true;
            }
            return optionLabel === currentStateLabel && currentStateLabel !== '';
          });

          if (hasMatchingState) {
            return prev;
          }

          if (prev.state === null && prev.city === null) {
            return prev;
          }

          const updatedFilters = {
            ...prev,
            state: null,
            city: null
          };

          saveFiltersToStorage(updatedFilters);
          return updatedFilters;
        });
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        states: [],
        cities: []
      }));
    }
  }, [filters.country, saveFiltersToStorage]);

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

        setFilters(prev => {
          const currentCity = prev.city;
          const currentCityLabel = String(currentCity?.label || currentCity?.value || '').toLowerCase();
          const hasMatchingCity = cities.some((cityOption) => {
            const optionLabel = String(cityOption.label || '').toLowerCase();
            if (currentCity?.value !== undefined && currentCity?.value !== null && cityOption.value === currentCity.value) {
              return true;
            }
            return optionLabel === currentCityLabel && currentCityLabel !== '';
          });

          if (hasMatchingCity) {
            return prev;
          }

          if (prev.city === null) {
            return prev;
          }

          const updatedFilters = {
            ...prev,
            city: null
          };

          saveFiltersToStorage(updatedFilters);
          return updatedFilters;
        });
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        cities: []
      }));
    }
  }, [filters.country, filters.state, saveFiltersToStorage]);

  useEffect(() => {
    if (!pendingLocationPref.country || locationOptions.countries.length === 0) {
      return;
    }

    const preferredCountry = String(pendingLocationPref.country || '').toLowerCase();

    if (!preferredCountry) {
      setPendingLocationPref(prev => ({ ...prev, country: null }));
      return;
    }

    const countryOption = locationOptions.countries.find(
      (option) => option.label?.toLowerCase() === preferredCountry
    );

    setPendingLocationPref(prev => ({ ...prev, country: null }));

    if (!countryOption) {
      return;
    }

    setFilters(prev => {
      if (prev.country?.value === countryOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        country: countryOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [pendingLocationPref.country, locationOptions.countries, saveFiltersToStorage]);

  useEffect(() => {
    if (!pendingLocationPref.state || locationOptions.states.length === 0) {
      return;
    }

    const preferredState = String(pendingLocationPref.state || '').toLowerCase();
    if (!preferredState) {
      setPendingLocationPref(prev => ({ ...prev, state: null }));
      return;
    }

    const preferredCountryLabel = String(userPreferencesData?.preferred_country || '').toLowerCase();
    const selectedCountryLabel = String(
      filters.country?.label || filters.country?.value || ''
    ).toLowerCase();

    if (preferredCountryLabel && selectedCountryLabel !== preferredCountryLabel) {
      return;
    }

    const stateOption = locationOptions.states.find(
      (option) => option.label?.toLowerCase() === preferredState
    );

    setPendingLocationPref(prev => ({ ...prev, state: null }));

    if (!stateOption) {
      return;
    }

    setFilters(prev => {
      if (prev.state?.value === stateOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        state: stateOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [
    pendingLocationPref.state,
    locationOptions.states,
    filters.country,
    userPreferencesData,
    saveFiltersToStorage
  ]);

  useEffect(() => {
    if (!pendingLocationPref.city || locationOptions.cities.length === 0) {
      return;
    }

    const preferredCity = String(pendingLocationPref.city || '').toLowerCase();
    if (!preferredCity) {
      setPendingLocationPref(prev => ({ ...prev, city: null }));
      return;
    }

    const preferredStateLabel = String(userPreferencesData?.preferred_state || '').toLowerCase();
    const selectedStateLabel = String(
      filters.state?.label || filters.state?.value || ''
    ).toLowerCase();

    if (preferredStateLabel && selectedStateLabel !== preferredStateLabel) {
      return;
    }

    const cityOption = locationOptions.cities.find(
      (option) => option.label?.toLowerCase() === preferredCity
    );

    setPendingLocationPref(prev => ({ ...prev, city: null }));

    if (!cityOption) {
      return;
    }

    setFilters(prev => {
      if (prev.city?.value === cityOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        city: cityOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [
    pendingLocationPref.city,
    locationOptions.cities,
    filters.state,
    userPreferencesData,
    saveFiltersToStorage
  ]);


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
    
    saveFiltersToStorage(newFilters);
    
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
    const resetFilters = { ...defaultJobFilters };
    setFilters(resetFilters);
    setFilteredJobs(jobs);
    setCurrentPage(1);
    setHighlightedJobId(null); // Reset highlight on search reset
    
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

  const getJobPage = useCallback(
    (jobId) => {
      if (jobId === undefined || jobId === null) return null;

      const numericJobId = Number(jobId);
      const jobIndex = filteredJobs.findIndex(job => Number(job.id) === numericJobId);

      if (jobIndex === -1) return null;

      return Math.floor(jobIndex / jobsPerPage) + 1;
    },
    [filteredJobs, jobsPerPage]
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

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


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

  const scrollToJob = useCallback((jobId) => {
    if (!jobId) {
      console.warn('SearchJobs scrollToJob: No jobId provided');
      return 'done';
    }

    const numericJobId = Number(jobId);
    if (!Number.isFinite(numericJobId)) {
      console.warn('SearchJobs scrollToJob: Invalid job ID', jobId);
      return 'done';
    }

    const jobIndex = filteredJobs.findIndex(job => Number(job.id) === numericJobId);

    if (jobIndex !== -1) {
      const targetPage = Math.floor(jobIndex / jobsPerPage) + 1;
      const indexOfLastJob = currentPage * jobsPerPage;
      const indexOfFirstJob = indexOfLastJob - jobsPerPage;
      const isOnCurrentPage = jobIndex >= indexOfFirstJob && jobIndex < indexOfLastJob;

      if (!isOnCurrentPage) {
        skipPageResetRef.current = true;
        if (currentPage !== targetPage) {
          setCurrentPage(targetPage);
        }
        return 'pending';
      }
    }

    const tryFindAndScroll = (attempt = 0) => {
      const maxAttempts = 10;
      const delay = 100 + attempt * 50;

      setTimeout(() => {
        let jobElement = document.querySelector(`[data-job-id="${numericJobId}"]`);
        if (!jobElement) {
          jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
        }

        if (jobElement) {
          jobElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          setHighlightedJobId(numericJobId);
        } else if (attempt < maxAttempts) {
          tryFindAndScroll(attempt + 1);
        } else {
          console.warn('SearchJobs scrollToJob: Job element not found in DOM');
        }
      }, delay);
    };

    tryFindAndScroll();
    return 'done';
  }, [filteredJobs, jobsPerPage, currentPage]);

  const handleBackFromJobView = useCallback((jobId) => {
    console.log('SearchJobs handleBackFromJobView called, jobId:', jobId);
    if (!jobId) return;

    skipPageResetRef.current = true;
    setHighlightedJobId(null);
    setPendingScrollJob(String(jobId));

    const targetPage = getJobPage(jobId);
    if (targetPage && currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }
  }, [getJobPage, currentPage]);

  useEffect(() => {
    if (onBackFromJobView) {
      console.log('SearchJobs: Registering handleBackFromJobView with parent');
      onBackFromJobView(handleBackFromJobView);
    }
  }, [onBackFromJobView, handleBackFromJobView]);

  useEffect(() => {
    if (!pendingScrollJob) return;

    const timer = setTimeout(() => {
      const result = scrollToJob(pendingScrollJob);
      if (result !== 'pending') {
        setPendingScrollJob(null);
        skipPageResetRef.current = false;
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pendingScrollJob, scrollToJob, currentPage]);

  useEffect(() => {
    if (!highlightJobId) return;
    if (highlightedJobId === Number(highlightJobId)) return;
    skipPageResetRef.current = true;
    const result = scrollToJob(highlightJobId);
    if (result === 'pending') {
      setPendingScrollJob(String(highlightJobId));
    } else {
      setPendingScrollJob(null);
      skipPageResetRef.current = false;
    }
  }, [highlightJobId, scrollToJob, highlightedJobId]);

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
        
        // Record coin history (always record, even if candidateId is missing)
        try {
          const personalDetails = await JobApiService.getUserPersonalDetails(user);
          await JobApiService.recordCoinHistory(selectedJob, user, 100, personalDetails?.id || null);
        } catch (historyError) {
          console.error('Failed to record coin history:', historyError);
          // Don't fail the application if history recording fails
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
                    isHighlighted={highlightedJobId === jobId}
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