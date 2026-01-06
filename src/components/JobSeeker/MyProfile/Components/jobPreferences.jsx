import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext.jsx";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InputWithTooltip from '../../../../services/InputWithTooltip.jsx';
import { FaChevronDown } from 'react-icons/fa';

// ========== REUSABLE STYLES ==========
// react-select styles
const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#FDA4AF' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 2px #FED7E2' : 'none',
    '&:hover': { borderColor: '#FDA4AF' },
    borderRadius: '0.5rem',
    padding: '0.25rem',
    backgroundColor: 'white'
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#EF4444'
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  })
};

//------------------------------------------------
// Helper functions: map countries/states/cities by ID
//------------------------------------------------
const mapAllCountries = async () => {
  const countries = await GetCountries();
  return countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
};

// Find India in the countries list
const findIndiaOption = async () => {
  const countries = await GetCountries();
  const countriesOptions = countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
  const india = countriesOptions.find(country => country.label === "India");
  return india || null;
};

const mapStatesOfCountry = async (countryId) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return states.map((state) => ({
    value: state.id,
    label: state.name
  }));
};

const mapCitiesOfState = async (countryId, stateId) => {
  if (!countryId || !stateId) return [];
  const cities = await GetCity(countryId, stateId);
  return cities.map((city) => ({
    value: city.name,
    label: city.name
  }));
};

const JobPreference = forwardRef(({ formData, updateFormData }, ref) => {
  const { user } = useAuth();
  const isMounted = useRef(false);
  const dataFetched = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // For country/state/city
  const [countries, setCountries] = useState([]);
  const [indiaOption, setIndiaOption] = useState(null);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  // Store saved location values from API to restore later
  const savedLocationRef = useRef({
    country: null,
    state: null,
    city: null
  });
  
  // Flag to track if location restoration has been completed
  const locationRestoredRef = useRef(false);

  const getInitialState = () => {
    const defaultPreferences = {
      jobShift: {
        Full_time: { value: "yes" },
        part_time_weekdays: { value: "yes" },
        part_time_weekends: { value: "yes" },
        part_time_vacations: { value: "yes" }
      },
      organizationType: {
        school_college_university: { value: "yes" },
        coaching_institute: { value: "yes" },
        Ed_TechCompanies: { value: "yes" }
      },
      parentGuardian: {
        Home_Tutor: { value: "yes" },
        Private_Tutor: { value: "yes" },
        Group_Tutor: { value: "yes" },
        Private_Tutions: { value: "yes" },
        Group_Tuitions: { value: "yes" }
      },
      teachingMode: {
        online: { value: "yes" },
        offline: { value: "yes" }
      }
    };

    const defaultJobSearchStatus = {
      Full_time: { value: "activelySearching" },
      part_time_weekdays: { value: "activelySearching" },
      part_time_weekends: { value: "activelySearching" },
      part_time_vacations: { value: "activelySearching" },
      tuitions: { value: "activelySearching" }
    };

    const defaultJobDetails = {
      firebase_uid: user?.uid || '',
      Job_Type: '',
      expected_salary: '',
      teachingDesignation: [],
      teachingCurriculum: [],
      teachingSubjects: [],
      teachingGrades: [],
      teachingCoreExpertise: [],
      adminDesignations: [],
      adminCurriculum: [],
      teachingAdminDesignations: [],
      teachingAdminCurriculum: [],
      teachingAdminSubjects: [],
      teachingAdminGrades: [],
      teachingAdminCoreExpertise: [],
      preferred_country: indiaOption,
      preferred_state: '',
      preferred_city: '',
      notice_period: null
    };

    return {
      preferences: formData?.preferences || defaultPreferences,
      jobSearchStatus: formData?.jobSearchStatus || defaultJobSearchStatus,
      jobDetails: formData?.jobDetails || defaultJobDetails
    };
  };

  // Initialize state with useRef to avoid re-renders
  const initialStateRef = useRef(getInitialState());
  const [preferences, setPreferences] = useState(initialStateRef.current.preferences);
  const [jobSearchStatus, setJobSearchStatus] = useState(initialStateRef.current.jobSearchStatus);
  const [jobDetails, setJobDetails] = useState(initialStateRef.current.jobDetails);

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const [countriesData, indiaData] = await Promise.all([
          mapAllCountries(),
          findIndiaOption()
        ]);
        setCountries(countriesData);
        setIndiaOption(indiaData);
        
        // Set India as the default country if preferred_country is not set
        if (indiaData && !jobDetails.preferred_country) {
          setJobDetails(prev => ({
            ...prev,
            preferred_country: indiaData
          }));
        }
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };
    
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    const loadStates = async () => {
      if (jobDetails.preferred_country?.value) {
        try {
          const statesData = await mapStatesOfCountry(jobDetails.preferred_country.value);
          setStates(statesData);
        } catch (error) {
          console.error("Error loading states:", error);
          setStates([]);
        }
      } else {
        setStates([]);
      }
    };
    
    loadStates();
  }, [jobDetails.preferred_country]);

  // Load cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (jobDetails.preferred_country?.value && jobDetails.preferred_state?.value) {
        try {
          const citiesData = await mapCitiesOfState(jobDetails.preferred_country.value, jobDetails.preferred_state.value);
          setCities(citiesData);
        } catch (error) {
          console.error("Error loading cities:", error);
          setCities([]);
        }
      } else {
        setCities([]);
      }
    };
    
    loadCities();
  }, [jobDetails.preferred_country, jobDetails.preferred_state]);

  // Restore country after countries are loaded (only once)
  useEffect(() => {
    if (countries.length > 0 && savedLocationRef.current.country && dataFetched.current && !locationRestoredRef.current) {
      const currentCountryLabel = jobDetails.preferred_country?.label;
      const savedCountryLabel = savedLocationRef.current.country;
      
      // Restore if we have a saved value and it doesn't match the current value
      if (currentCountryLabel !== savedCountryLabel) {
        const matchedCountry = countries.find(c => c.label === savedCountryLabel);
        if (matchedCountry) {
          setJobDetails(prev => ({
            ...prev,
            preferred_country: matchedCountry,
            preferred_state: null, // Reset state when country changes
            preferred_city: null // Reset city when country changes
          }));
          // If there's no saved state, mark restoration as complete after country is restored
          if (!savedLocationRef.current.state) {
            locationRestoredRef.current = true;
          }
        }
      }
    }
  }, [countries]);

  // Restore state after states are loaded and country is set (only once)
  useEffect(() => {
    if (states.length > 0 && savedLocationRef.current.state && dataFetched.current && jobDetails.preferred_country && !locationRestoredRef.current) {
      const currentStateLabel = jobDetails.preferred_state?.label;
      const savedStateLabel = savedLocationRef.current.state;
      
      // Restore if we have a saved value and it doesn't match the current value
      if (currentStateLabel !== savedStateLabel) {
        const matchedState = states.find(s => s.label === savedStateLabel);
        if (matchedState) {
          setJobDetails(prev => ({
            ...prev,
            preferred_state: matchedState,
            preferred_city: null // Reset city when state changes
          }));
          // If there's no saved city, mark restoration as complete after state is restored
          if (!savedLocationRef.current.city) {
            locationRestoredRef.current = true;
          }
        }
      }
    }
  }, [states, jobDetails.preferred_country]);

  // Restore city after cities are loaded and state is set (only once)
  useEffect(() => {
    if (cities.length > 0 && savedLocationRef.current.city && dataFetched.current && jobDetails.preferred_state && !locationRestoredRef.current) {
      const currentCityLabel = jobDetails.preferred_city?.label;
      const savedCityLabel = savedLocationRef.current.city;
      
      // Restore if we have a saved value and it doesn't match the current value
      if (currentCityLabel !== savedCityLabel) {
        const matchedCity = cities.find(c => c.label === savedCityLabel);
        if (matchedCity) {
          setJobDetails(prev => ({
            ...prev,
            preferred_city: matchedCity
          }));
          // Mark location restoration as complete after city is restored
          locationRestoredRef.current = true;
        }
      }
    }
  }, [cities, jobDetails.preferred_state]);

  // Update state when formData changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      // Only update if formData has the specific keys
      if (formData.preferences) {
        setPreferences(formData.preferences);
      }
      if (formData.jobSearchStatus) {
        setJobSearchStatus(formData.jobSearchStatus);
      }
      if (formData.jobDetails) {
        setJobDetails(formData.jobDetails);
      }
    }
  }, [formData]);

  // Helper: Convert numeric from DB => "yes" or "no"
  const convertYesNo = (value) => (Number(value) === 1 ? "yes" : "no");

  // Helper: Convert "yes"/"no" => 1 or 0 (or null if empty)
  const convertToInt = (value) => {
    if (value === "yes") return 1;
    if (value === "no") return 0;
    return null; // for the empty "Select" case
  };

  const Job_TypeOptions = [
    { value: 'teaching', label: 'Education - Teaching' },
    { value: 'administration', label: 'Non-Teaching' },
    { value: 'teachingAndAdmin', label: 'Education - Teaching + Non-Teaching' }
  ];

  const salaryRanges = [
    { value: "less_than_40k", label: "Less than 40k" },
    { value: "40k_60k", label: "40k-60k" },
    { value: "60k_80k", label: "60k-80k" },
    { value: "80k_100k", label: "80k-1 lakh" },
    { value: "100k_120k", label: "1 lakh-1.2 lakh" },
    { value: "120k_140k", label: "1.2 lakh-1.4 lakh" },
    { value: "140k_160k", label: "1.4 lakh-1.6 lakh" },
    { value: "160k_180k", label: "1.6 lakh-1.8 lakh" },
    { value: "180k_200k", label: "1.8 lakh-2 lakh" },
    { value: "more_than_200k", label: "More than 2 lakh" }
  ];


  // Add validation function
  const validateJobPreferences = () => {
    // Helper function to check if a value exists
    const hasValue = (val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') {
        // Handle react-select objects (have value and label properties)
        if (val.value !== undefined) {
          // For react-select, check if value is not empty
          if (typeof val.value === 'string') return val.value.trim() !== '';
          if (Array.isArray(val.value)) return val.value.length > 0;
          return val.value !== null && val.value !== undefined;
        }
        // Handle other objects
        return Object.keys(val).length > 0;
      }
      return true;
    };

    // Helper function to get teaching mode value (handles both string and object formats)
    const getTeachingModeValue = (mode) => {
      if (typeof mode === 'string') return mode;
      if (typeof mode === 'object' && mode.value !== undefined) return mode.value;
      return null;
    };

    // Debug logs
    console.log('Preferences State:', preferences);

    // 1. Validate job shifts
    const areJobShiftsValid = Object.entries(preferences.jobShift).every(
      ([key, shift]) => {
        const shiftValue = shift?.value;
        const isValid = shiftValue === "yes" || shiftValue === "no";
        if (!isValid) {
          console.log(`Job shift validation failed for ${key}:`, shift);
        }
        return isValid;
      }
    );

    // 2. Validate organization types
    const areOrgTypesValid = Object.entries(preferences.organizationType).every(
      ([key, org]) => {
        const orgValue = org?.value;
        const isValid = orgValue === "yes" || orgValue === "no";
        if (!isValid) {
          console.log(`Organization type validation failed for ${key}:`, org);
        }
        return isValid;
      }
    );

    // 3. Validate parent/guardian preferences
    const areParentPrefsValid = Object.entries(preferences.parentGuardian).every(
      ([key, pref]) => {
        const prefValue = pref?.value;
        const isValid = prefValue === "yes" || prefValue === "no";
        if (!isValid) {
          console.log(`Parent/guardian validation failed for ${key}:`, pref);
        }
        return isValid;
      }
    );

    // 4. Validate teaching mode
    const onlineValue = getTeachingModeValue(preferences.teachingMode.online);
    const offlineValue = getTeachingModeValue(preferences.teachingMode.offline);
    const isTeachingModeValid = 
      (onlineValue === "yes" || onlineValue === "no") && 
      (offlineValue === "yes" || offlineValue === "no");

    // 5. Validate basic job details
    const noticePeriodValue = jobDetails.notice_period?.value || jobDetails.notice_period;
    const areBasicDetailsValid =
      hasValue(jobDetails.Job_Type) &&
      hasValue(jobDetails.expected_salary) &&
      hasValue(noticePeriodValue);
    
    if (!areBasicDetailsValid) {
      console.log('Basic details validation failed:', {
        Job_Type: jobDetails.Job_Type,
        expected_salary: jobDetails.expected_salary,
        notice_period: jobDetails.notice_period,
        noticePeriodValue: noticePeriodValue,
        Job_TypeValid: hasValue(jobDetails.Job_Type),
        expected_salaryValid: hasValue(jobDetails.expected_salary),
        noticePeriodValid: hasValue(noticePeriodValue)
      });
    }

    // 6. Validate location preferences (if any are filled, all must be filled)
    const hasAnyLocation =
      jobDetails.preferred_country ||
      jobDetails.preferred_state ||
      jobDetails.preferred_city;

    // Check if country and state have values (could be react-select objects)
    const countryValue = jobDetails.preferred_country?.value || jobDetails.preferred_country;
    const stateValue = jobDetails.preferred_state?.value || jobDetails.preferred_state;
    
    const areLocationsValid =
      !hasAnyLocation ||
      (hasValue(countryValue) && hasValue(stateValue));

    // 7. Validate job type specific fields - Removed curriculum requirement as it's not in the form
    let areJobTypeFieldsValid = true;
    if (jobDetails.Job_Type === 'teaching') {
      areJobTypeFieldsValid =
        hasValue(jobDetails.teachingDesignation) &&
        hasValue(jobDetails.teachingSubjects) &&
        hasValue(jobDetails.teachingGrades) &&
        hasValue(jobDetails.teachingCoreExpertise);
      if (!areJobTypeFieldsValid) {
        console.log('Teaching job type fields validation failed:', {
          teachingDesignation: jobDetails.teachingDesignation,
          teachingSubjects: jobDetails.teachingSubjects,
          teachingGrades: jobDetails.teachingGrades,
          teachingCoreExpertise: jobDetails.teachingCoreExpertise
        });
      }
    } else if (jobDetails.Job_Type === 'administration') {
      areJobTypeFieldsValid = hasValue(jobDetails.adminDesignations);
      if (!areJobTypeFieldsValid) {
        console.log('Administration job type fields validation failed:', {
          adminDesignations: jobDetails.adminDesignations
        });
      }
    } else if (jobDetails.Job_Type === 'teachingAndAdmin') {
      areJobTypeFieldsValid =
        hasValue(jobDetails.teachingAdminDesignations) &&
        hasValue(jobDetails.teachingAdminSubjects) &&
        hasValue(jobDetails.teachingAdminGrades) &&
        hasValue(jobDetails.teachingAdminCoreExpertise);
      if (!areJobTypeFieldsValid) {
        console.log('Teaching+Admin job type fields validation failed:', {
          teachingAdminDesignations: jobDetails.teachingAdminDesignations,
          teachingAdminSubjects: jobDetails.teachingAdminSubjects,
          teachingAdminGrades: jobDetails.teachingAdminGrades,
          teachingAdminCoreExpertise: jobDetails.teachingAdminCoreExpertise
        });
      }
    }

    // 8. Validate job search status
    const isJobSearchValid = Object.entries(jobSearchStatus).every(
      ([key, status]) => {
        const statusValue = status?.value;
        const isValid = statusValue && statusValue.trim() !== "";
        if (!isValid) {
          console.error(`❌ Job search status validation FAILED for "${key}":`, status);
        }
        return isValid;
      }
    );

    // Debug logs
    console.log('Detailed Validation Results:', {
      areJobShiftsValid,
      areOrgTypesValid,
      areParentPrefsValid,
      isTeachingModeValid,
      areBasicDetailsValid,
      areLocationsValid,
      areJobTypeFieldsValid,
      isJobSearchValid,
      teachingModeValues: {
        online: onlineValue,
        offline: offlineValue
      },
      jobDetails: {
        Job_Type: jobDetails.Job_Type,
        expected_salary: jobDetails.expected_salary,
        notice_period: jobDetails.notice_period,
        noticePeriodValue: noticePeriodValue,
        preferred_country: jobDetails.preferred_country,
        preferred_state: jobDetails.preferred_state,
        countryValue: countryValue,
        stateValue: stateValue
      }
    });

    const validationResult = 
      areJobShiftsValid &&
      areOrgTypesValid &&
      areParentPrefsValid &&
      isTeachingModeValid &&
      areBasicDetailsValid &&
      areLocationsValid &&
      areJobTypeFieldsValid &&
      isJobSearchValid;

    if (!validationResult) {
      console.error('Validation failed. Details:', {
        areJobShiftsValid,
        areOrgTypesValid,
        areParentPrefsValid,
        isTeachingModeValid,
        areBasicDetailsValid,
        areLocationsValid,
        areJobTypeFieldsValid,
        isJobSearchValid
      });
    }

    return validationResult;
  };

  // Subject/designation data
  const [subjectsOptions, setSubjectsOptions] = useState([]);
  const [teachingDesignations, setTeachingDesignations] = useState([]);
  const [adminDesignations, setAdminDesignations] = useState([]);
  const [teachingAdminDesignations, setTeachingAdminDesignations] = useState([]);
  const [coreExpertise, setCoreExpertise] = useState([]);
  const [grades, setGrades] = useState([]);
  const [curriculum, setCurriculum] = useState([]);

  // Fetch subjects
  const subjectList = async () => {
    try {
      const response = await axios.get(
        import.meta.env.VITE_DEV1_API + '/education-data'
      );
      const formattedSubjects = response.data.map((subject) => ({
        value: subject.value,
        label: subject.label,
      }));
      setSubjectsOptions(formattedSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };
  useEffect(() => {
    subjectList();
  }, []);

  // Fetch designations
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_DEV1_API + '/constants');
        const data = await response.json();
        const transformedData = data.map((item) => ({
          category: item.category,
          value: item.value,
          label: item.label,
        }));
        setTeachingDesignations(
          transformedData.filter((item) => item.category === "Teaching") || []
        );
        setAdminDesignations(
          transformedData.filter((item) => item.category === "Administration") || []
        );
        setTeachingAdminDesignations(
          transformedData.filter(
            (item) => item.category === "Teaching" || item.category === "Administration"
          ) || []
        );
        setCoreExpertise(
          transformedData.filter((item) => item.category === "Core Expertise") || []
        );
        setGrades(
          transformedData.filter((item) => item.category === "Grades") || []
        );
        setCurriculum(
          transformedData.filter((item) => item.category === "Curriculum") || []
        );
      } catch (error) {
        console.error('Error fetching designations:', error);
      }
    };
    fetchDesignations();
  }, []);

  // Update preference change handler
  const handlePreferenceChange = (category, field, mode, value) => {
    setPreferences((prev) => {
      let newPreferences;
      
      // Special handling for teaching mode
      if (category === 'teachingMode') {
        newPreferences = {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: { value: value }
          }
        };
      } else {
        // For all other preferences
        newPreferences = {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: {
              value: value
            }
          }
        };
      }
      
      return newPreferences;
    });
  };

  // Memoize the validation and update logic
  const handleFormUpdate = useCallback(() => {
    if (!isMounted.current) return;
    
    const isValid = validateJobPreferences();
    if (updateFormData) {
      updateFormData(
        {
          preferences,
          jobDetails,
          jobSearchStatus,
        },
        isValid
      );
    }
  }, [preferences, jobDetails, jobSearchStatus, updateFormData]);

  // Effect to handle parent form updates with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFormUpdate();
    }, 100); // Small delay to batch updates

    return () => clearTimeout(timeoutId);
  }, [handleFormUpdate]);

  // Effect to handle initial mount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch existing job preferences (if any)
  useEffect(() => {
    if (!user?.uid) return;
    
    // Reset dataFetched flag when user changes
    if (dataFetched.current && jobDetails.firebase_uid && jobDetails.firebase_uid !== user.uid) {
      console.log("⚠️ User changed in jobPreferences! Clearing old data. Old UID:", jobDetails.firebase_uid, "New UID:", user.uid);
      dataFetched.current = false;
      locationRestoredRef.current = false;
      savedLocationRef.current = {
        country: null,
        state: null,
        city: null
      };
      // Reset to initial state
      const defaultPreferences = {
        jobShift: {
          Full_time: { value: "yes" },
          part_time_weekdays: { value: "yes" },
          part_time_weekends: { value: "yes" },
          part_time_vacations: { value: "yes" }
        },
        organizationType: {
          school_college_university: { value: "yes" },
          coaching_institute: { value: "yes" },
          Ed_TechCompanies: { value: "yes" }
        },
        parentGuardian: {
          Home_Tutor: { value: "yes" },
          Private_Tutor: { value: "yes" },
          Group_Tutor: { value: "yes" },
          Private_Tutions: { value: "yes" },
          Group_Tuitions: { value: "yes" }
        },
        teachingMode: {
          online: { value: "yes" },
          offline: { value: "yes" }
        }
      };
      const defaultJobSearchStatus = {
        Full_time: { value: "activelySearching" },
        part_time_weekdays: { value: "activelySearching" },
        part_time_weekends: { value: "activelySearching" },
        part_time_vacations: { value: "activelySearching" },
        tuitions: { value: "activelySearching" }
      };
      const defaultJobDetails = {
        firebase_uid: user.uid,
        Job_Type: '',
        expected_salary: '',
        teachingDesignation: [],
        teachingCurriculum: [],
        teachingSubjects: [],
        teachingGrades: [],
        teachingCoreExpertise: [],
        adminDesignations: [],
        adminCurriculum: [],
        teachingAdminDesignations: [],
        teachingAdminCurriculum: [],
        teachingAdminSubjects: [],
        teachingAdminGrades: [],
        teachingAdminCoreExpertise: [],
        preferred_country: indiaOption,
        preferred_state: '',
        preferred_city: '',
        notice_period: null
      };
      setPreferences(defaultPreferences);
      setJobSearchStatus(defaultJobSearchStatus);
      setJobDetails(defaultJobDetails);
    }
    
    if (dataFetched.current) return;
    
    const fetchJobPreference = async () => {
      try {
        console.log("🔍 fetchJobPreference called for UID:", user.uid);
        const response = await axios.get(
          "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference",
          { params: { firebase_uid: user.uid } }
        );
        
        console.log("🔍 JobPreference API Response:", response.data);

        if (response.status === 200 && response.data) {
          // Backend now returns single object or null
          const record = response.data;
          
          // If no record found or doesn't match current user, don't load data
          if (!record || record.firebase_uid !== user.uid) {
            console.log('No job preference data found for current user');
            dataFetched.current = true; // Mark as fetched even if no data
            return;
          }
          
          // If no saved location exists, mark restoration as complete immediately
          if (!record.preferred_country && !record.preferred_state && !record.preferred_city) {
            locationRestoredRef.current = true;
          }

          const pref = {
            jobShift: {
              Full_time: {
                value: convertYesNo(record.full_time_offline),
              },
              part_time_weekdays: {
                value: convertYesNo(record.part_time_weekdays_offline),
              },
              part_time_weekends: {
                value: convertYesNo(record.part_time_weekends_offline),
              },
              part_time_vacations: {
                value: convertYesNo(record.part_time_vacations_offline),
              },
            },
            organizationType: {
              school_college_university: {
                value: convertYesNo(record.school_college_university_offline),
              },
              coaching_institute: {
                value: convertYesNo(record.coaching_institute_offline),
              },
              Ed_TechCompanies: {
                value: convertYesNo(record.Ed_TechCompanies_offline),
              },
            },
            parentGuardian: {
              Home_Tutor: {
                value: convertYesNo(record.Home_Tutor_offline),
              },
              Private_Tutor: {
                value: convertYesNo(record.Private_Tutor_offline),
              },
              Group_Tutor: {
                value: convertYesNo(record.Group_Tutor_offline),
              },
              Private_Tutions: {
                value: convertYesNo(record.Private_Tutions_online_online),
              },
              Group_Tuitions: {
                value: convertYesNo(record.Group_Tutor_online),
              },
            },
      teachingMode: {
        online: { value: convertYesNo(record.teachingMode_online) },
        offline: { value: convertYesNo(record.teachingMode_offline) },
      },
          };

          const jobSearch = {
            Full_time: {
              value: (record.full_time_2_offline && record.full_time_2_offline.trim() !== "") ? record.full_time_2_offline : "activelySearching",
            },
            part_time_weekdays: {
              value: (record.part_time_weekdays_2_offline && record.part_time_weekdays_2_offline.trim() !== "") ? record.part_time_weekdays_2_offline : "activelySearching",
            },
            part_time_weekends: {
              value: (record.part_time_weekends_2_offline && record.part_time_weekends_2_offline.trim() !== "") ? record.part_time_weekends_2_offline : "activelySearching",
            },
            part_time_vacations: {
              value: (record.part_time_vacations_2_offline && record.part_time_vacations_2_offline.trim() !== "") ? record.part_time_vacations_2_offline : "activelySearching",
            },
            tuitions: {
              value: (record.tuitions_2_offline && record.tuitions_2_offline.trim() !== "") ? record.tuitions_2_offline : "activelySearching",
            },
          };

          const details = {
            firebase_uid: user.uid, // Track which user this data belongs to
            Job_Type: record.Job_Type || "",
            expected_salary: record.expected_salary || "",
            teachingDesignation:
              record.Job_Type === 'teaching'
                ? record.teaching_designations || []
                : record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_designations || []
                : [],
            teachingCurriculum: record.teaching_curriculum || [],
            teachingSubjects: record.teaching_subjects || [],
            teachingGrades: record.teaching_grades || [],
            teachingCoreExpertise: record.teaching_coreExpertise || [],
            adminDesignations:
              record.Job_Type === 'administration'
                ? record.administrative_designations || []
                : [],
            adminCurriculum:
              record.Job_Type === 'administration'
                ? record.administrative_curriculum || []
                : [],
            teachingAdminDesignations:
              record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_designations || []
                : [],
            teachingAdminCurriculum:
              record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_curriculum || []
                : [],
            teachingAdminSubjects:
              record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_subjects || []
                : [],
            teachingAdminGrades:
              record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_grades || []
                : [],
            teachingAdminCoreExpertise:
              record.Job_Type === 'teachingAndAdmin'
                ? record.teaching_administrative_coreExpertise || []
                : [],
            preferred_country: null, // Will be set after countries load
            preferred_state: null, // Will be set after states load
            preferred_city: null, // Will be set after cities load
            notice_period: record.notice_period || "",
          };

          // Store saved location labels to restore later
          savedLocationRef.current = {
            country: record.preferred_country || null,
            state: record.preferred_state || null,
            city: record.preferred_city || null
          };

          setPreferences(pref);
          setJobSearchStatus(jobSearch);
          setJobDetails(details);
          dataFetched.current = true;
        }
      } catch (error) {
        console.error("Error fetching job preference:", error);
      }
    };

    fetchJobPreference();
  }, [user?.uid]);

  // Update job details change handler
  const handleJobDetailsChange = (field, value) => {
    setJobDetails((prev) => {
      const newJobDetails = {
        ...prev,
        [field]: value,
      };

      const isValid = validateJobPreferences();
      updateFormData(
        {
          preferences,
          jobDetails: newJobDetails,
          jobSearchStatus,
        },
        isValid
      );

      return newJobDetails;
    });
  };

  // Update job search status change handler
  const handleJobSearchStatusChange = (type, mode, value) => {
    // Ensure value is not empty - default to "activelySearching" if empty
    // Convert to string first to handle any type
    const stringValue = value !== null && value !== undefined ? String(value) : "";
    const validValue = stringValue.trim() !== "" ? stringValue : "activelySearching";
    
    setJobSearchStatus((prev) => {
      const newStatus = {
        ...prev,
        [type]: {
          ...(prev[type] || {}),
          [mode]: validValue,
        },
      };

      // Update parent form data with latest state
      setTimeout(() => {
        const isValid = validateJobPreferences();
        updateFormData(
          {
            preferences,
            jobDetails,
            jobSearchStatus: newStatus,
          },
          isValid
        );
      }, 0);

      return newStatus;
    });
  };

  // Submit
  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setIsSaving(true);
    try {
      const isValid = validateJobPreferences();
      console.log('Form validation result:', isValid);
      
      if (!isValid) {
        toast.error("Please fill all required fields");
        return;
      }

      const payload = {
        firebase_uid: user.uid,
        // Convert "yes"/"no" => 1/0
        full_time_offline: convertToInt(preferences.jobShift.Full_time?.value),
        full_time_online: convertToInt(preferences.jobShift.Full_time?.value),
        part_time_weekdays_offline: convertToInt(preferences.jobShift.part_time_weekdays?.value),
        part_time_weekdays_online: convertToInt(preferences.jobShift.part_time_weekdays?.value),
        part_time_weekends_offline: convertToInt(preferences.jobShift.part_time_weekends?.value),
        part_time_weekends_online: convertToInt(preferences.jobShift.part_time_weekends?.value),
        part_time_vacations_offline: convertToInt(preferences.jobShift.part_time_vacations?.value),
        part_time_vacations_online: convertToInt(preferences.jobShift.part_time_vacations?.value),

        school_college_university_offline: convertToInt(preferences.organizationType.school_college_university?.value),
        school_college_university_online: convertToInt(preferences.organizationType.school_college_university?.value),
        coaching_institute_offline: convertToInt(preferences.organizationType.coaching_institute?.value),
        coaching_institute_online: convertToInt(preferences.organizationType.coaching_institute?.value),
        Ed_TechCompanies_offline: convertToInt(preferences.organizationType.Ed_TechCompanies?.value),
        Ed_TechCompanies_online: convertToInt(preferences.organizationType.Ed_TechCompanies?.value),

        // Parent/Guardian
        Home_Tutor_offline: convertToInt(preferences.parentGuardian.Home_Tutor?.value),
        Home_Tutor_online: convertToInt(preferences.parentGuardian.Home_Tutor?.value),
        Private_Tutor_offline: convertToInt(preferences.parentGuardian.Private_Tutor?.value),
        Private_Tutor_online: convertToInt(preferences.parentGuardian.Private_Tutor?.value),
        Group_Tutor_offline: convertToInt(preferences.parentGuardian.Group_Tutor?.value),
        Group_Tutor_online: convertToInt(preferences.parentGuardian.Group_Tutor?.value),
        Private_Tutions_online_online: convertToInt(preferences.parentGuardian.Private_Tutions?.value),
        // Removed parent_coaching_institute_offline / parent_coaching_institute_online

        // Job details
        Job_Type: jobDetails.Job_Type,
        expected_salary: jobDetails.expected_salary,
        notice_period: jobDetails.notice_period?.value || jobDetails.notice_period,
        preferred_country: jobDetails.preferred_country
          ? jobDetails.preferred_country.label
          : "",
        preferred_state: jobDetails.preferred_state
          ? jobDetails.preferred_state.label
          : "",
        preferred_city: jobDetails.preferred_city
          ? jobDetails.preferred_city.label
          : "",

        // Teaching mode
        teachingMode_online: convertToInt(preferences.teachingMode.online?.value || preferences.teachingMode.online),
        teachingMode_offline: convertToInt(preferences.teachingMode.offline?.value || preferences.teachingMode.offline),

        // Teaching/Administration arrays
        teaching_designations:
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingDesignation
            : [],
        teaching_curriculum: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingCurriculum
            : [],
        teaching_subjects: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingSubjects
            : [],
        teaching_grades: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingGrades
            : [],
        teaching_coreExpertise: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingCoreExpertise
            : [],
        administrative_designations:
          jobDetails.Job_Type === 'administration'
            ? jobDetails.adminDesignations
            : [],
        administrative_curriculum:
          jobDetails.Job_Type === 'administration'
            ? jobDetails.adminCurriculum
            : [],
        teaching_administrative_designations:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminDesignations
            : [],
        teaching_administrative_curriculum:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminCurriculum
            : [],
        teaching_administrative_subjects:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminSubjects
            : [],
        teaching_administrative_grades:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminGrades
            : [],
        teaching_administrative_coreExpertise:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminCoreExpertise
            : [],

        // Job search status - use optional chaining and fallback to default
        full_time_2_offline: jobSearchStatus.Full_time?.value || "activelySearching",
        full_time_2_online: jobSearchStatus.Full_time?.value || "activelySearching",
        part_time_weekdays_2_offline: jobSearchStatus.part_time_weekdays?.value || "activelySearching",
        part_time_weekdays_2_online: jobSearchStatus.part_time_weekdays?.value || "activelySearching",
        part_time_weekends_2_offline: jobSearchStatus.part_time_weekends?.value || "activelySearching",
        part_time_weekends_2_online: jobSearchStatus.part_time_weekends?.value || "activelySearching",
        part_time_vacations_2_offline: jobSearchStatus.part_time_vacations?.value || "activelySearching",
        part_time_vacations_2_online: jobSearchStatus.part_time_vacations?.value || "activelySearching",
        tuitions_2_offline: jobSearchStatus.tuitions?.value || "activelySearching",
        tuitions_2_online: jobSearchStatus.tuitions?.value || "activelySearching",
      };

      const { data } = await axios.post(
        'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      toast.success("Job preferences saved successfully");
      console.log('Success:', data);
    } catch (error) {
      console.error('Error saving job preferences:', error);
      toast.error("Failed to save job preferences");
    } finally {
      setIsSaving(false);
    }
  };

  // Renders the lower half of the form (Job details, designations, etc.)
  const renderJobDetailsSection = () => (
    <div>
      <h3 className="text-black font-semibold mb-3">Expected Job Preferences</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Job Type */}
        <div className="w-full">
          <InputWithTooltip label="Job Type" required>
            <Select
              placeholder="Job Type"
              options={Job_TypeOptions}
              value={Job_TypeOptions.find((option) => option.value === jobDetails.Job_Type)}
              onChange={(selected) => {
                setJobDetails((prev) => ({
                  ...prev,
                  Job_Type: selected?.value || '',
                }));
              }}
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        {/* Expected Salary */}
        <div className="w-full">
          <InputWithTooltip label="Expected salary(INR)" required>
            <Select
              placeholder="Expected salary(INR)"
              value={salaryRanges.find(option => option.value === jobDetails.expected_salary)}
              onChange={(selectedOption) =>
                setJobDetails((prev) => ({
                  ...prev,
                  expected_salary: selectedOption.value,
                }))
              }
              options={salaryRanges}
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        {/* Notice Period */}
        <div className="w-full">
          <InputWithTooltip label="Notice Period" required>
            <Select
              placeholder="Notice Period"
              options={[
                { value: 'immediateJoiner', label: 'Immediate Joiner' },
                { value: 'lessThan7', label: '< 7 days' },
                { value: 'lessThan15', label: '< 15 days' },
                { value: 'lessThan1Month', label: '< 1 month' },
                { value: 'moreThan1Month', label: '> 1 Month' },
              ]}
              value={
                jobDetails.notice_period
                  ? { 
                      value: jobDetails.notice_period.value || jobDetails.notice_period, 
                      label: jobDetails.notice_period.label || jobDetails.notice_period
                    }
                  : null
              }
              onChange={(selected) =>
                setJobDetails((prev) => ({
                  ...prev,
                  notice_period: selected
                }))
              }
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        {/* Preferred Country */}
        <div className="w-full">
          <InputWithTooltip label="Preferred Country" required>
            <Select
              placeholder="Preferred Country"
              options={countries}
              value={jobDetails.preferred_country}
              onChange={(option) => {
                setJobDetails((prev) => ({
                  ...prev,
                  preferred_country: option,
                  preferred_state: null,
                  preferred_city: null,
                }));
              }}
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        {/* Preferred State */}
        <div className="w-full">
          <InputWithTooltip label="Preferred State/UT" required>
            <Select
              placeholder="Preferred State/UT"
              options={states}
              value={jobDetails.preferred_state}
              onChange={(option) => {
                setJobDetails((prev) => ({
                  ...prev,
                  preferred_state: option,
                  preferred_city: null,
                }));
              }}
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        {/* Preferred City */}
        <div className="w-full">
          <InputWithTooltip label="Preferred City">
            <Select
              placeholder="Preferred City"
              options={cities}
              value={jobDetails.preferred_city}
              onChange={(option) =>
                setJobDetails((prev) => ({
                  ...prev,
                  preferred_city: option,
                }))
              }
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>
      </div>

      {/* Teaching + Admin */}
      {jobDetails.Job_Type && (
        <>
          {jobDetails.Job_Type === 'teachingAndAdmin' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <InputWithTooltip label="Teaching & Administrative Designation(s)" required>
                    <Select
                    isMulti
                    placeholder="Teaching & Administrative Designation(s)"
                    options={teachingAdminDesignations}
                    value={jobDetails.teachingAdminDesignations.map((val) => {
                      const option = teachingAdminDesignations.find((opt) => opt.value === val);
                      return option ? { value: option.value, label: option.label } : null;
                    }).filter(Boolean)}
                    onChange={(selected) =>
                      setJobDetails((prev) => ({
                        ...prev,
                        teachingAdminDesignations: selected ? selected.map((item) => item.value) : [],
                      }))
                    }
                    styles={reactSelectStyles}
                    />
                  </InputWithTooltip>
                </div>
                <div className="w-full">
                  <InputWithTooltip label="Curriculum/Board/University">
                    <Select
                    isMulti
                    placeholder="Curriculum/Board/University"
                    options={curriculum}
                    value={jobDetails.teachingAdminCurriculum.map((val) => {
                      const opt = curriculum.find((c) => c.value === val);
                      return opt ? { value: opt.value, label: opt.label } : null;
                    }).filter(Boolean)}
                    onChange={(selected) =>
                      setJobDetails((prev) => ({
                        ...prev,
                        teachingAdminCurriculum: selected ? selected.map((item) => item.value) : [],
                      }))
                    }
                    styles={reactSelectStyles}
                    />
                  </InputWithTooltip>
                </div>
                <div className="w-full">
                  <InputWithTooltip label="Subjects" required>
                    <Select
                    isMulti
                    placeholder="Subjects"
                    options={subjectsOptions}
                    value={jobDetails.teachingAdminSubjects.map((val) => {
                      const opt = subjectsOptions.find((s) => s.value === val);
                      return opt ? { value: opt.value, label: opt.label } : null;
                    }).filter(Boolean)}
                    onChange={(selected) =>
                      setJobDetails((prev) => ({
                        ...prev,
                        teachingAdminSubjects: selected ? selected.map((item) => item.value) : [],
                      }))
                    }
                    styles={reactSelectStyles}
                    />
                  </InputWithTooltip>
                </div>
                <div className="w-full">
                  <InputWithTooltip label="Grades" required>
                    <Select
                    isMulti
                    placeholder="Grades"
                    options={grades}
                    value={jobDetails.teachingAdminGrades.map((val) => {
                      const opt = grades.find((g) => g.value === val);
                      return opt ? { value: opt.value, label: opt.label } : null;
                    }).filter(Boolean)}
                    onChange={(selected) =>
                      setJobDetails((prev) => ({
                        ...prev,
                        teachingAdminGrades: selected ? selected.map((item) => item.value) : [],
                      }))
                    }
                    styles={reactSelectStyles}
                    />
                  </InputWithTooltip>
                </div>
                <div className="w-full">
                  <InputWithTooltip label="Core Expertise" required>
                    <Select
                    isMulti
                    placeholder="Core Expertise"
                    options={coreExpertise}
                    value={jobDetails.teachingAdminCoreExpertise.map((val) => {
                      const opt = coreExpertise.find((c) => c.value === val);
                      return opt ? { value: opt.value, label: opt.label } : null;
                    }).filter(Boolean)}
                    onChange={(selected) =>
                      setJobDetails((prev) => ({
                        ...prev,
                        teachingAdminCoreExpertise: selected ? selected.map((item) => item.value) : [],
                      }))
                    }
                    styles={reactSelectStyles}
                    />
                  </InputWithTooltip>
                </div>
            </div>
          )}
        </>
      )}

      {/* Teaching only */}
      {jobDetails.Job_Type === 'teaching' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <InputWithTooltip label="Teaching Designation(s)" required>
                <Select
                isMulti
                placeholder="Teaching Designation(s)"
                options={teachingDesignations}
                value={teachingDesignations.filter((opt) =>
                  jobDetails.teachingDesignation.includes(opt.value)
                )}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    teachingDesignation: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
            <div className="w-full">
              <InputWithTooltip label="Curriculum/Board/University">
                <Select
                  isMulti
                placeholder="Curriculum/Board/University"
                options={curriculum}
                value={jobDetails.teachingCurriculum.map((val) => {
                  const opt = curriculum.find((c) => c.value === val);
                  return opt ? { value: opt.value, label: opt.label } : null;
                }).filter(Boolean)}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    teachingCurriculum: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
            <div className="w-full">
              <InputWithTooltip label="Subjects" required>
                <Select
                isMulti
                placeholder="Subjects"
                options={subjectsOptions}
                value={jobDetails.teachingSubjects.map((val) => {
                  const opt = subjectsOptions.find((s) => s.value === val);
                  return opt ? { value: opt.value, label: opt.label } : null;
                }).filter(Boolean)}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    teachingSubjects: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
            <div className="w-full">
              <InputWithTooltip label="Grades" required>
                <Select
                isMulti
                placeholder="Grades"
                options={grades}
                value={jobDetails.teachingGrades.map((val) => {
                  const opt = grades.find((g) => g.value === val);
                  return opt ? { value: opt.value, label: opt.label } : null;
                }).filter(Boolean)}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    teachingGrades: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
            <div className="w-full">
              <InputWithTooltip label="Core Expertise" required>
                <Select
                isMulti
                placeholder="Core Expertise"
                options={coreExpertise}
                value={jobDetails.teachingCoreExpertise.map((val) => {
                  const opt = coreExpertise.find((c) => c.value === val);
                  return opt ? { value: opt.value, label: opt.label } : null;
                }).filter(Boolean)}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    teachingCoreExpertise: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
          </div>
        )}

      {/* Administration only */}
      {jobDetails.Job_Type === 'administration' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <InputWithTooltip label="Administrative Designation(s)" required>
                <Select
                isMulti
                placeholder="Administrative Designation(s)"
                options={adminDesignations}
                value={jobDetails.adminDesignations.map((val) => {
                  const opt = adminDesignations.find((a) => a.value === val);
                  return opt ? { value: opt.value, label: opt.label } : null;
                }).filter(Boolean)}
                onChange={(selected) =>
                  setJobDetails((prev) => ({
                    ...prev,
                    adminDesignations: selected ? selected.map((item) => item.value) : [],
                  }))
                }
                styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
          </div>
        )}
    </div>
  );

  // Add useImperativeHandle for validation
  useImperativeHandle(ref, () => ({
    validateFields: () => {
      const errors = [];

      // Validate basic required fields
      if (!jobDetails.Job_Type) {
        errors.push("Job Type is required");
      }
      if (!jobDetails.expected_salary) {
        errors.push("Expected salary is required");
      }
      if (!jobDetails.notice_period) {
        errors.push("Notice Period is required");
      }
      if (!jobDetails.preferred_country) {
        errors.push("Preferred Country is required");
      }
      if (!jobDetails.preferred_state) {
        errors.push("Preferred State is required");
      }

      // Job Type specific validations
      if (jobDetails.Job_Type === 'teaching') {
        if (!jobDetails.teachingDesignation?.length) {
          errors.push("Teaching Designation(s) is required");
        }
        if (!jobDetails.teachingSubjects?.length) {
          errors.push("Teaching Subjects are required");
        }
        if (!jobDetails.teachingGrades?.length) {
          errors.push("Teaching Grades are required");
        }
        if(!jobDetails.teachingCoreExpertise?.length) {
          errors.push("Teaching Core Expertise is required");
        }
      }
      else if (jobDetails.Job_Type === 'administration') {
        if (!jobDetails.adminDesignations?.length) {
          errors.push("Administrative Designation(s) is required");
        }
      }
      else if (jobDetails.Job_Type === 'teachingAndAdmin') {
        if (!jobDetails.teachingAdminDesignations?.length) {
          errors.push("Teaching & Administrative Designation(s) is required");
        }
        if (!jobDetails.teachingAdminSubjects?.length) {
          errors.push("Teaching & Administrative Subjects are required");
        }
        if (!jobDetails.teachingAdminGrades?.length) {
          errors.push("Teaching & Administrative Grades are required");
        }
        if(!jobDetails.teachingAdminCoreExpertise?.length) {
          errors.push("Teaching & Administrative Core Expertise is required");
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    },
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your job preferences.");
      }

      const isValid = validateJobPreferences();
      console.log('Form validation result:', isValid);
      
      if (!isValid) {
        throw new Error("Please fill all required fields");
      }

      const payload = {
        firebase_uid: user.uid,
        // Convert "yes"/"no" => 1/0
        full_time_offline: convertToInt(preferences.jobShift.Full_time?.value),
        full_time_online: convertToInt(preferences.jobShift.Full_time?.value),
        part_time_weekdays_offline: convertToInt(preferences.jobShift.part_time_weekdays?.value),
        part_time_weekdays_online: convertToInt(preferences.jobShift.part_time_weekdays?.value),
        part_time_weekends_offline: convertToInt(preferences.jobShift.part_time_weekends?.value),
        part_time_weekends_online: convertToInt(preferences.jobShift.part_time_weekends?.value),
        part_time_vacations_offline: convertToInt(preferences.jobShift.part_time_vacations?.value),
        part_time_vacations_online: convertToInt(preferences.jobShift.part_time_vacations?.value),

        school_college_university_offline: convertToInt(preferences.organizationType.school_college_university?.value),
        school_college_university_online: convertToInt(preferences.organizationType.school_college_university?.value),
        coaching_institute_offline: convertToInt(preferences.organizationType.coaching_institute?.value),
        coaching_institute_online: convertToInt(preferences.organizationType.coaching_institute?.value),
        Ed_TechCompanies_offline: convertToInt(preferences.organizationType.Ed_TechCompanies?.value),
        Ed_TechCompanies_online: convertToInt(preferences.organizationType.Ed_TechCompanies?.value),

        // Parent/Guardian
        Home_Tutor_offline: convertToInt(preferences.parentGuardian.Home_Tutor?.value),
        Home_Tutor_online: convertToInt(preferences.parentGuardian.Home_Tutor?.value),
        Private_Tutor_offline: convertToInt(preferences.parentGuardian.Private_Tutor?.value),
        Private_Tutor_online: convertToInt(preferences.parentGuardian.Private_Tutor?.value),
        Group_Tutor_offline: convertToInt(preferences.parentGuardian.Group_Tutor?.value),
        Group_Tutor_online: convertToInt(preferences.parentGuardian.Group_Tutor?.value),
        Private_Tutions_online_online: convertToInt(preferences.parentGuardian.Private_Tutions?.value),

        // Job details
        Job_Type: jobDetails.Job_Type,
        expected_salary: jobDetails.expected_salary,
        notice_period: jobDetails.notice_period?.value || jobDetails.notice_period,
        preferred_country: jobDetails.preferred_country
          ? jobDetails.preferred_country.label
          : "",
        preferred_state: jobDetails.preferred_state
          ? jobDetails.preferred_state.label
          : "",
        preferred_city: jobDetails.preferred_city
          ? jobDetails.preferred_city.label
          : "",

        // Teaching mode
        teachingMode_online: convertToInt(preferences.teachingMode.online?.value || preferences.teachingMode.online),
        teachingMode_offline: convertToInt(preferences.teachingMode.offline?.value || preferences.teachingMode.offline),

        // Teaching/Administration arrays
        teaching_designations:
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingDesignation
            : [],
        teaching_curriculum: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingCurriculum
            : [],
        teaching_subjects: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingSubjects
            : [],
        teaching_grades: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingGrades
            : [],
        teaching_coreExpertise: 
          jobDetails.Job_Type === 'teaching'
            ? jobDetails.teachingCoreExpertise
            : [],
        administrative_designations:
          jobDetails.Job_Type === 'administration'
            ? jobDetails.adminDesignations
            : [],
        administrative_curriculum:
          jobDetails.Job_Type === 'administration'
            ? jobDetails.adminCurriculum
            : [],
        teaching_administrative_designations:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminDesignations
            : [],
        teaching_administrative_curriculum:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminCurriculum
            : [],
        teaching_administrative_subjects:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminSubjects
            : [],
        teaching_administrative_grades:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminGrades
            : [],
        teaching_administrative_coreExpertise:
          jobDetails.Job_Type === 'teachingAndAdmin'
            ? jobDetails.teachingAdminCoreExpertise
            : [],

        // Job search status - use optional chaining and fallback to default
        full_time_2_offline: jobSearchStatus.Full_time?.value || "activelySearching",
        full_time_2_online: jobSearchStatus.Full_time?.value || "activelySearching",
        part_time_weekdays_2_offline: jobSearchStatus.part_time_weekdays?.value || "activelySearching",
        part_time_weekdays_2_online: jobSearchStatus.part_time_weekdays?.value || "activelySearching",
        part_time_weekends_2_offline: jobSearchStatus.part_time_weekends?.value || "activelySearching",
        part_time_weekends_2_online: jobSearchStatus.part_time_weekends?.value || "activelySearching",
        part_time_vacations_2_offline: jobSearchStatus.part_time_vacations?.value || "activelySearching",
        part_time_vacations_2_online: jobSearchStatus.part_time_vacations?.value || "activelySearching",
        tuitions_2_offline: jobSearchStatus.tuitions?.value || "activelySearching",
        tuitions_2_online: jobSearchStatus.tuitions?.value || "activelySearching",
      };

      const { data } = await axios.post(
        'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log("Job preferences saved successfully");
      return { success: true, data };
    }
  }));

  return (
    <form 
      className="rounded-lg pt-4 px-4 pb-4 md:pt-6 md:px-6 md:pb-6 bg-rose-100 overflow-x-hidden" 
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e);
      }}
    >
      <div className="w-full space-y-6">
        {/* Job Shift & Job Category Section */}
        <div>
          <h3 className='text-black font-semibold mb-3 text-xl leading-tight tracking-tight'>Select your preferred teaching mode :</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='w-full'>
              <label htmlFor="teachingMode_online" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Online</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  value={preferences.teachingMode.online?.value || preferences.teachingMode.online}
                  onChange={(e) => {
                    handlePreferenceChange('teachingMode', 'online', null, e.target.value);
                  }}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>
            <div className='w-full'>
              <label htmlFor="teachingMode_offline" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Offline</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  value={preferences.teachingMode.offline?.value || preferences.teachingMode.offline}
                  onChange={(e) => {
                    handlePreferenceChange('teachingMode', 'offline', null, e.target.value);
                  }}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-black font-semibold mb-3 text-xl leading-tight tracking-tight">Job Shift Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Full_time" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Full Time <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.jobShift.Full_time.value}
                onChange={(e) => {
                  handlePreferenceChange('jobShift', 'Full_time', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Part_time_weekdays" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Weekdays)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.jobShift.part_time_weekdays.value}
                onChange={(e) => {
                  handlePreferenceChange('jobShift', 'part_time_weekdays', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Part_time_weekends" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Weekends)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.jobShift.part_time_weekends.value}
                onChange={(e) => {
                  handlePreferenceChange('jobShift', 'part_time_weekends', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Part_time_vacations" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Vacations)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.jobShift.part_time_vacations.value}
                onChange={(e) => {
                  handlePreferenceChange('jobShift', 'part_time_vacations', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organization Type Section */}
        <div>
          <h3 className="text-black font-semibold mb-3 text-xl leading-tight tracking-tight">Organization Type Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="school_college_university" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">School / College / University</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.organizationType.school_college_university.value}
                onChange={(e) => {
                  handlePreferenceChange('organizationType', 'school_college_university', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="coaching_institute" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Coaching Centers / Institutes</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.organizationType.coaching_institute.value}
                onChange={(e) => {
                  handlePreferenceChange('organizationType', 'coaching_institute', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Ed_TechCompanies" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">EdTech Companies</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.organizationType.Ed_TechCompanies.value}
                onChange={(e) => {
                  handlePreferenceChange('organizationType', 'Ed_TechCompanies', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>
      </div>

        {/* Parent / Guardian Section */}
        <div>
          <h3 className="text-black font-semibold mb-3 text-xl leading-tight tracking-tight">Tuition Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Home_Tutor" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Home Tutor (One-to-One at Students Home) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.parentGuardian.Home_Tutor.value}
                onChange={(e) => {
                  handlePreferenceChange('parentGuardian', 'Home_Tutor', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Private_Tutor" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Private Tutor (One-to-One at Tutors Place) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.parentGuardian.Private_Tutor.value}
                onChange={(e) => {
                  handlePreferenceChange('parentGuardian', 'Private_Tutor', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Group_Tutor_offline" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Group Tuitions (at teachers home) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.parentGuardian.Group_Tutor.value}
                onChange={(e) => {
                  handlePreferenceChange('parentGuardian', 'Group_Tutor', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Private_Tutions_online" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Private Tuitions (One-One) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.parentGuardian.Private_Tutions.value}
                onChange={(e) => {
                  handlePreferenceChange('parentGuardian', 'Private_Tutions', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="Group_Tutor_online" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Group Tuitions (from teacher as tutor) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={preferences.parentGuardian.Group_Tuitions.value}
                onChange={(e) => {
                  handlePreferenceChange('parentGuardian', 'Group_Tuitions', 'value', e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

      {/* Lower half (job details, designations, etc.) */}
      {renderJobDetailsSection()}

        {/* Job Search Status Section */}
        <div>
          <h3 className="text-black font-semibold mb-3 text-xl leading-tight tracking-tight">Job Search Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Full_time_status" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Full Time <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={jobSearchStatus.Full_time?.value || "activelySearching"}
                onChange={(e) => {
                  handleJobSearchStatusChange('Full_time', 'value', e.target.value);
                }}
              >
                <option value="activelySearching">Actively Searching Jobs</option>
                <option value="casuallyExploring">Casually Exploring Jobs</option>
                <option value="notLooking">Not looking for Jobs</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="part_time_weekdays_status" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Weekdays) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={jobSearchStatus.part_time_weekdays?.value || "activelySearching"}
                onChange={(e) => {
                handleJobSearchStatusChange('part_time_weekdays', 'value', e.target.value);
              }}
            >
              <option value="activelySearching">Actively Searching Jobs</option>
              <option value="casuallyExploring">Casually Exploring Jobs</option>
              <option value="notLooking">Not looking for Jobs</option>
            </select>
          </div>

            <div className="w-full">
              <label htmlFor="part_time_weekends_status" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Weekends) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={jobSearchStatus.part_time_weekends?.value || "activelySearching"}
                onChange={(e) => {
                  handleJobSearchStatusChange('part_time_weekends', 'value', e.target.value);
                }}
              >
                <option value="activelySearching">Actively Searching Jobs</option>
                <option value="casuallyExploring">Casually Exploring Jobs</option>
                <option value="notLooking">Not looking for Jobs</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="part_time_vacations_status" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Part Time (Vacations) <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={jobSearchStatus.part_time_vacations?.value || "activelySearching"}
                onChange={(e) => {
                  handleJobSearchStatusChange('part_time_vacations', 'value', e.target.value);
                }}
              >
                <option value="activelySearching">Actively Searching Jobs</option>
                <option value="casuallyExploring">Casually Exploring Jobs</option>
                <option value="notLooking">Not looking for Jobs</option>
              </select>
            </div>

            <div className="w-full">
              <label htmlFor="tuitions_status" className="block text-base font-medium text-gray-700 mb-2 leading-normal tracking-tight">Tuitions <span className="text-purple-500">*</span></label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                value={jobSearchStatus.tuitions?.value || "activelySearching"}
                onChange={(e) => {
                  handleJobSearchStatusChange('tuitions', 'value', e.target.value);
                }}
              >
                <option value="activelySearching">Actively Searching Jobs</option>
                <option value="casuallyExploring">Casually Exploring Jobs</option>
                <option value="notLooking">Not looking for Jobs</option>
              </select>
            </div>
          </div>
        </div>

      {/* Save button hidden - auto-save handles saving when clicking Next */}
    </form>
  );
});

JobPreference.displayName = 'JobPreference';

export default JobPreference;