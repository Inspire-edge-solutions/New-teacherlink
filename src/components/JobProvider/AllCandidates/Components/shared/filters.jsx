import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import axios from 'axios';
import '../styles/filters.css';


// Define constant job types
const JOB_TYPE_OPTIONS = [
  { value: 'administration', label: 'Administration' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'teachingAndAdmin', label: 'Teaching & Administration' }
];

// Gender Options
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'transgender', label: 'Transgender' }
];

// Notice Period Options
const NOTICE_PERIOD_OPTIONS = [
  { value: 'immediateJoiner', label: 'Immediate Joiner' },
  { value: 'lessThan7', label: '< 7 days' },
  { value: 'lessThan15', label: '< 15 days' },
  { value: 'lessThan1Month', label: '< 1 month' },
  { value: 'moreThan1Month', label: '> 1 Month' }
];

// Job Search Status Options
const JOB_SEARCH_STATUS_OPTIONS = [
  { value: 'activelySearching', label: 'Actively Searching Jobs' },
  { value: 'casuallyExploring', label: 'Casually Exploring Jobs' },
  { value: 'notLooking', label: 'Not looking for Jobs' }
];

// Job Shift Preferences Options
const JOB_SHIFT_OPTIONS = [
  { value: 'Full_time', label: 'Full Time' },
  { value: 'part_time_weekdays', label: 'Part Time (Weekdays)' },
  { value: 'part_time_weekends', label: 'Part Time (Weekends)' },
  { value: 'part_time_vacations', label: 'Part Time (Vacations)' }
];

// Tuition Preferences Options
const TUITION_PREFERENCES_OPTIONS = [
  { value: 'Home_Tutor', label: 'Home Tutor (One-to-One at Students Home)' },
  { value: 'Private_Tutor', label: 'Private Tutor (One-to-One at Tutors Place)' },
  { value: 'Group_Tutor', label: 'Group Tuitions (at teachers home)' },
  { value: 'Private_Tutions', label: 'Private Tuitions (One-One)' },
  { value: 'Group_Tuitions', label: 'Group Tuitions (from teacher as tutor)' }
];

// Yes/No options for online/offline
const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

// Other Teaching Experience Options
const OTHER_TEACHING_EXPERIENCE_OPTIONS = [
  { value: 'edTechCompany', label: 'Worked in Edu tech.companies' },
  { value: 'online', label: 'Experience of content preparation' },
  { value: 'coachingTuition', label: 'Expertise of handling online classes' },
  { value: 'groupTuitions', label: 'Experience of working in Coaching / Tuition Centers' },
  { value: 'privateTuitions', label: 'Experience of handling Personal / Home tuitions' }
];

// Helper function to format option values
const formatOptionValues = (values, optionsArray) => {
  if (!values) return [];
  if (!Array.isArray(values)) values = [values];
  
  return values.map(value => {
    if (!value) return null;
    // If it's already a valid option object
    if (value.value && value.label) return value;
    // If it's just a value or a partial object
    const val = typeof value === 'object' ? value.value : value;
    const option = optionsArray.find(opt => opt.value === val);
    return option || { value: val, label: val };
  }).filter(Boolean);
};

// Helper function to format single option
const formatSingleOption = (value, optionsArray) => {
  if (!value) return null;
  // If it's already a valid option object
  if (value.value && value.label) return value;
  // If it's just a value or a partial object
  const val = typeof value === 'object' ? value.value : value;
  const option = optionsArray.find(opt => opt.value === val);
  return option || { value: val, label: val };
};

const Filters = ({ initialOptions, initialFilters, onClose, onApply, candidates = [], showNoResults = false }) => {
  const defaultFilters = {
    query: '',
    country: null,
    state: null,
    city: null,
    languages: [],
    education: [],
    coreSubjects: [],
    jobTypes: [],
    grades: [],
    curriculum: [],
    designations: [],
    minExperience: 0,
    minSalary: 0,
    gender: [],
    teachingExperience: 0,
    otherTeachingExperience: [],
    noticePeriod: [],
    jobSearchStatus: [],
    jobShiftPreferences: [],
    online: null,
    offline: null,
    tutionPreferences: []
  };

  // Initialize filters with saved values or defaults
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('candidateFilters');
      const savedFilters = saved ? JSON.parse(saved) : {};
      
      // Merge with initial filters and format properly
      return {
        ...defaultFilters,
        ...savedFilters,
        ...initialFilters,
        // Format fixed options
        gender: formatOptionValues(savedFilters.gender || initialFilters.gender, GENDER_OPTIONS),
        jobTypes: formatOptionValues(savedFilters.jobTypes || initialFilters.jobTypes, JOB_TYPE_OPTIONS),
        noticePeriod: formatOptionValues(savedFilters.noticePeriod || initialFilters.noticePeriod, NOTICE_PERIOD_OPTIONS),
        jobSearchStatus: formatOptionValues(savedFilters.jobSearchStatus || initialFilters.jobSearchStatus, JOB_SEARCH_STATUS_OPTIONS),
        jobShiftPreferences: formatOptionValues(savedFilters.jobShiftPreferences || initialFilters.jobShiftPreferences, JOB_SHIFT_OPTIONS),
        tutionPreferences: formatOptionValues(savedFilters.tutionPreferences || initialFilters.tutionPreferences, TUITION_PREFERENCES_OPTIONS),
        otherTeachingExperience: formatOptionValues(savedFilters.otherTeachingExperience || initialFilters.otherTeachingExperience, OTHER_TEACHING_EXPERIENCE_OPTIONS),
        online: formatSingleOption(savedFilters.online || initialFilters.online, YES_NO_OPTIONS),
        offline: formatSingleOption(savedFilters.offline || initialFilters.offline, YES_NO_OPTIONS),
      };
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return { ...defaultFilters, ...initialFilters };
    }
  });

  // State for showing no results message
  const [showNoResultsMessage, setShowNoResultsMessage] = useState(showNoResults);
  
  // Track active filter count
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // State for available options
  const [options, setOptions] = useState({
    ...initialOptions || {
    languages: [],
    education: [],
    coreSubjects: [],
    grades: [],
    curriculum: [],
      designations: [],
      gender: GENDER_OPTIONS,
      noticePeriod: NOTICE_PERIOD_OPTIONS,
      jobSearchStatus: JOB_SEARCH_STATUS_OPTIONS,
      jobShiftPreferences: JOB_SHIFT_OPTIONS,
      tutionPreferences: TUITION_PREFERENCES_OPTIONS,
      online: YES_NO_OPTIONS,
      offline: YES_NO_OPTIONS,
      otherTeachingExperience: OTHER_TEACHING_EXPERIENCE_OPTIONS,
    },
    jobTypes: JOB_TYPE_OPTIONS // Always use the constant job types
  });

  // State for location options
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Loading states
  const [isEducationLoading, setIsEducationLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [coreSubjectsRetryCount, setCoreSubjectsRetryCount] = useState(0);

  // Load country data and fetch external data on component mount
  useEffect(() => {
    // Get all countries
    GetCountries().then((countryData) => {
      const countries = countryData.map(country => ({
        value: country.name,
        label: country.name,
        id: country.id
      }));

      setLocationOptions(prev => ({
        ...prev,
        countries
      }));
    });

    // Execute the fetch functions
    console.log("Component mounted, fetching data...");
    fetchLanguages();
    fetchEducationData();
    fetchEducationData2();
  }, []);

  // Calculate active filter count
  useEffect(() => {
    let count = 0;
    
    // Count all active filters
    if (filters.country) count++;
    if (filters.state) count++;
    if (filters.city) count++;
    if (filters.languages.length > 0) count++;
    if (filters.education.length > 0) count++;
    if (filters.coreSubjects.length > 0) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.grades.length > 0) count++;
    if (filters.curriculum.length > 0) count++;
    if (filters.designations.length > 0) count++;
    if (filters.gender.length > 0) count++;
    if (filters.noticePeriod.length > 0) count++;
    if (filters.jobSearchStatus.length > 0) count++;
    if (filters.jobShiftPreferences.length > 0) count++;
    if (filters.otherTeachingExperience.length > 0) count++;
    if (filters.tutionPreferences.length > 0) count++;
    if (filters.online) count++;
    if (filters.offline) count++;
    if (filters.minExperience > 0) count++;
    if (filters.minSalary > 0) count++;
    if (filters.teachingExperience > 0) count++;
    
    setActiveFilterCount(count);
  }, [filters]);

  // Update states when country changes
  useEffect(() => {
    if (filters.country) {
      // Find the country ID from the name
      GetCountries().then((countries) => {
        const country = countries.find(c => c.name === filters.country.value);
        
        if (country) {
          GetState(country.id).then((stateData) => {
            const states = stateData.map(state => ({
              value: state.name,
              label: state.name,
              id: state.id
            }));

            setLocationOptions(prev => ({
              ...prev,
              states
            }));

            // Reset state and city selections when country changes
            setFilters(prev => ({
              ...prev,
              state: null,
              city: null
            }));
          });
        }
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
      GetCountries().then((countries) => {
        const country = countries.find(c => c.name === filters.country.value);
        
        if (country) {
          GetState(country.id).then((states) => {
            const state = states.find(s => s.name === filters.state.value);
            
            if (state) {
              GetCity(country.id, state.id).then((cityData) => {
                const cities = cityData.map(city => ({
                  value: city.name,
                  label: city.name
                }));

                setLocationOptions(prev => ({
                  ...prev,
                  cities
                }));

                // Reset city selection when state changes
                setFilters(prev => ({
                  ...prev,
                  city: null
                }));
              });
            }
          });
        }
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        cities: []
      }));
    }
  }, [filters.country, filters.state]);

  // Helper functions for data extraction
  const parseEducation = (raw) => {
    if (!raw) return [];
    return (raw.match(/\{[^}]*\}/g) || [])
      .map(s => { try { return JSON.parse(s); } catch { return null; } })
      .filter(o => o && o.education_type)
      .map(o => o.education_type.trim());
  };

  const parseSpecialization = (raw) => {
    if (!raw) return [];
    const matches = raw.match(/\{[^}]*\}/g) || [];
    return matches.flatMap(s => {
      try {
        const o = JSON.parse(s);
        return o.specialization ? (Array.isArray(o.specialization) ? o.specialization : [o.specialization]) : [];
      } catch {
        return [];
      }
    }).map(s => s.trim()).filter(Boolean);
  };

  const parseCoreSubjects = (raw) => {
    if (!raw) return [];
    const matches = raw.match(/\{[^}]*\}/g) || [];
    return matches.flatMap(s => {
      try {
        const o = JSON.parse(s);
        return o.coreSubjects ? (Array.isArray(o.coreSubjects) ? o.coreSubjects : [o.coreSubjects]) : [];
      } catch {
        return [];
      }
    }).map(s => s.trim()).filter(Boolean);
  };

  const parseLanguages = (langs) => {
    if (Array.isArray(langs)) {
      return langs.map(x => typeof x === 'object' ? x.language?.trim() : String(x).trim()).filter(Boolean);
    }
    if (typeof langs === 'string') {
      return langs.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Extract filter options from candidates data (non-language related)
  useEffect(() => {
    if (!candidates?.length) return;

    try {
      const educationSet = new Set();
      const specializationSet = new Set();
      const coreSubjectsSet = new Set();
      let minExp = 30;
      let minSal = Infinity;

      candidates.forEach(candidate => {
        try {
          // Education
          parseEducation(candidate.education_details_json).forEach(edu => educationSet.add(edu));

          // Specialization
          parseSpecialization(candidate.education_details_json).forEach(spec => specializationSet.add(spec));

          // Core Subjects
          parseCoreSubjects(candidate.education_details_json).forEach(sub => coreSubjectsSet.add(sub));

          // Experience & Salary
          const exp = Number(candidate.full_time_offline);
          if (!isNaN(exp) && exp < minExp) minExp = exp;

          const salary = Number(candidate.expected_salary);
          if (!isNaN(salary) && salary < minSal) minSal = salary;
        } catch (error) {
          console.error("Error processing candidate:", error);
        }
      });

      // Convert sets to option arrays
      const createOptions = (set) => Array.from(set)
        .filter(Boolean)
        .sort()
        .map(value => ({ value, label: value }));

      // Update options
      setOptions(prev => ({
          ...prev,
          education: createOptions(educationSet),
          coreSubjects: createOptions(coreSubjectsSet),
        jobTypes: JOB_TYPE_OPTIONS // Always preserve the constant job types
      }));

      // Set initial values for range sliders
      setFilters(prev => ({
        ...prev,
        minExperience: minExp === 30 ? 0 : minExp,
        minSalary: minSal === Infinity ? 0 : minSal
      }));
    } catch (error) {
      console.error("Error processing candidates data:", error);
    }
  }, [candidates]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('candidateFilters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
    
    setFilters(newFilters);
  };

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle range slider changes
  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  // Apply filters
  const applyFilters = () => {
    // Save filters to localStorage
    localStorage.setItem('candidateFilters', JSON.stringify(filters));
    
    onApply(filters);
    if (onClose) onClose();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters);
    localStorage.removeItem('candidateFilters');
    onApply(defaultFilters);
  };

  // Fetch education data using the same approach as the reference implementation
  const fetchEducationData = async () => {
    setIsEducationLoading(true);
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/constants");
      const data = response.data;
      
      // Transform exactly like the reference code
      const transformedData = data.map((item) => ({
        category: item.category,
        value: item.value,
        label: item.label
      }));
      
      // Extract degrees and master degrees using the same filter logic
      const degrees = transformedData.filter((item) => item.category === "Degrees") || [];
      const masterDegrees = transformedData.filter((item) => item.category === "MasterDegree") || [];
      
      // Extract grades from constants API
      const grades = transformedData.filter((item) => item.category === "Grades") || [];
      
      // Extract curriculum from constants API
      const curriculum = transformedData.filter((item) => item.category === "Curriculum") || [];
      
      // Extract teaching and administration designations
      const designations = transformedData.filter(
        (item) => item.category === "Teaching" || item.category === "Administration"
      ) || [];
      
      // Extract others category
      const others = transformedData.filter((item) => item.category === "others") || [];
      
      // Log for debugging
      //console.log(`Found ${degrees.length} degrees and ${masterDegrees.length} master degrees`);
      //console.log(`Found ${grades.length} grades, ${curriculum.length} curriculum, ${designations.length} designations`);
      
      // Combine degrees for education dropdown
      const allEducationOptions = [...degrees, ...masterDegrees, ...others];
      
      // Update all options
      setOptions(prev => ({
        ...prev,
        education: allEducationOptions,
        grades: [...grades, ...others],
        curriculum: [...curriculum, ...others],
        designations: [...designations, ...others]
      }));
    } catch (error) {
      console.error("Error fetching constants data:", error);
      
      // Set empty arrays for new options
      setOptions(prev => ({
        ...prev,
        education: [],
        grades: [],
        curriculum: [],
        designations: []
      }));
    } finally {
      setIsEducationLoading(false);
    }
  };

  // Fetch education data (including subjects) from API
  const fetchEducationData2 = async (retryCount = 0) => {
    try {
      console.log(`Fetching education data from: ${import.meta.env.VITE_DEV1_API}/education-data (attempt ${retryCount + 1})`);
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
      
      console.log("Education data response:", response.data);
      console.log("Response status:", response.status);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Use the same approach as the working Education component
        const formattedSubjects = response.data.map((subject) => ({
          value: subject.value || subject.name || subject.id,
          label: subject.label || subject.name || subject.value
        }));
        
        console.log("Formatted subjects:", formattedSubjects);
        
        // Update options state with subjects
        setOptions(prev => ({
          ...prev,
          coreSubjects: formattedSubjects
        }));
        
        // Reset retry count on success
        setCoreSubjectsRetryCount(0);
      } else {
        console.warn("No education data received or empty array");
        setOptions(prev => ({
          ...prev,
          coreSubjects: []
        }));
        
        // Retry if we haven't exceeded max retries
        if (retryCount < 2) {
          console.log(`Retrying fetchEducationData2 in 2 seconds... (attempt ${retryCount + 1})`);
          setTimeout(() => fetchEducationData2(retryCount + 1), 2000);
          setCoreSubjectsRetryCount(retryCount + 1);
        }
      }
    } catch (error) {
      console.error("Error fetching education data:", error);
      console.log("Error response:", error.response?.data);
      console.log("Error status:", error.response?.status);
      
      // Set empty array on error to prevent undefined issues
      setOptions(prev => ({
        ...prev,
        coreSubjects: []
      }));
      
      // Retry if we haven't exceeded max retries
      if (retryCount < 2) {
        console.log(`Retrying fetchEducationData2 in 2 seconds due to error... (attempt ${retryCount + 1})`);
        setTimeout(() => fetchEducationData2(retryCount + 1), 2000);
        setCoreSubjectsRetryCount(retryCount + 1);
      }
    }
  };

  // Fetch languages from API - filter for "languages in India" only (matching reference implementation)
  const fetchLanguages = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/languages");
      
      // Filter for languages in India - using exact same approach as the reference
      const filtered = response.data.filter(
        (lang) => lang.category === "languages in India"
      );
      
      // Check if we found any Indian languages
      if (filtered && filtered.length > 0) {
        //console.log("Found languages in India:", filtered);
        
        // Extract the language list
        let languageOptions = [];
        
        // Handle different potential data structures
        if (filtered[0].languages && Array.isArray(filtered[0].languages)) {
          // If the filtered result has a languages array property
          languageOptions = filtered[0].languages.map(language => {
            if (typeof language === 'string') {
              return { value: language, label: language };
            } else if (language && typeof language === 'object') {
              return { 
                value: language.value || language.name || language, 
                label: language.label || language.name || language 
              };
            } else {
              return { value: String(language), label: String(language) };
            }
          });
        } else if (Array.isArray(filtered)) {
          // If the filtered result is the array of languages itself
          languageOptions = filtered.map(language => {
            if (typeof language === 'string') {
              return { value: language, label: language };
            } else if (language && typeof language === 'object') {
              return { 
                value: language.value || language.name || language.id || JSON.stringify(language), 
                label: language.label || language.name || language.value || JSON.stringify(language) 
              };
            } else {
              return { value: String(language), label: String(language) };
            }
          });
        }
        
        // Update options state with the Indian languages
        setOptions(prev => ({
          ...prev,
          languages: languageOptions
        }));
      } else {
        console.warn("No languages in India found in API response");
        setOptions(prev => ({
          ...prev,
          languages: []
        }));
      }
    } catch (error) {
      console.error("Error fetching languages:", error);
      //console.log("Response data:", error.response?.data);
    }

  };

  // Helper function to parse array-like fields
  const parseArray = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) {
      return field.map(item => typeof item === 'object' ? (item.value || item.name || item) : item);
    }
    if (typeof field === 'string') {
      return field.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };
 

  return (
    <div className="filter-drawer">
      <div className="filter-header">
        <div className="d-flex justify-content-between align-items-center w-100">
          <h3 className="mb-0">Filter Candidates</h3>
          <div className="d-flex align-items-center gap-2">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="btn btn-sm btn-outline-secondary">
                <i className="fas fa-times me-1"></i>Clear All
              </button>
            )}
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
            >
              <i className="fas fa-times me-1"></i>Hide Filters
            </button>
          </div>
        </div>
      </div>
      <div className="filter-content">
        <div className="row no-gutters mb-4">
          {/* Location Filters Section */}

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                options={locationOptions.countries}
                value={filters.country}
                onChange={(value) => handleFilterChange('country', value)}
                placeholder="Country"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Country</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                options={locationOptions.states}
                value={filters.state}
                onChange={(value) => handleFilterChange('state', value)}
                placeholder="State/UT"
                className="mb-3"
                classNamePrefix="select"
                isDisabled={!filters.country}
              />
              <span className="custom-tooltip">State/UT</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                options={locationOptions.cities}
                value={filters.city}
                onChange={(value) => handleFilterChange('city', value)}
                placeholder="City"
                className="mb-3"
                classNamePrefix="select"
                isDisabled={!filters.state}
              />
              <span className="custom-tooltip">City</span>
            </div>
          </div>

          {/* Job Profile Section */}
          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={JOB_TYPE_OPTIONS}
                value={filters.jobTypes}
                onChange={(value) => handleFilterChange('jobTypes', value || [])}
                placeholder="Job Type"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Job Type</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={options.designations}
                value={filters.designations}
                onChange={(value) => handleFilterChange('designations', value || [])}
                placeholder="Designations"
                className="mb-3"
                classNamePrefix="select"
                isClearable
                isLoading={isEducationLoading}
              />
              <span className="custom-tooltip">Designations</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={JOB_SHIFT_OPTIONS}
                value={filters.jobShiftPreferences}
                onChange={(value) => handleFilterChange('jobShiftPreferences', value || [])}
                placeholder="Job Shifts"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Job Shifts</span>
            </div>
          </div>

          {/* Educational Background Section */}
          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={options.education}
                value={filters.education}
                onChange={(value) => handleFilterChange('education', value || [])}
                placeholder="Education"
                className="mb-3"
                classNamePrefix="select"
                isClearable
                isLoading={isEducationLoading}
              />
              <span className="custom-tooltip">Education</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <div className="d-flex align-items-center gap-2">
                <Select
                  isMulti
                  options={options.coreSubjects || []}
                  value={filters.coreSubjects}
                  onChange={(value) => handleFilterChange('coreSubjects', value || [])}
                  placeholder={isEducationLoading ? "Loading subjects..." : "Core Subjects"}
                  className="mb-3 flex-grow-1"
                  classNamePrefix="select"
                  isClearable
                  isLoading={isEducationLoading}
                  noOptionsMessage={() => "No subjects available"}
                />
                {(options.coreSubjects?.length === 0 || coreSubjectsRetryCount > 0) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => fetchEducationData2(0)}
                    title="Retry loading subjects"
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
                )}
              </div>
              <span className="custom-tooltip">Core Subjects</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={options.curriculum}
                value={filters.curriculum}
                onChange={(value) => handleFilterChange('curriculum', value || [])}
                placeholder="Curriculum"
                className="mb-3"
                classNamePrefix="select"
                isClearable
                isLoading={isEducationLoading}
              />
              <span className="custom-tooltip">Curriculum</span>
            </div>
          </div>

          {/* Personal Preferences Section */}

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={GENDER_OPTIONS}
                value={filters.gender}
                onChange={(value) => handleFilterChange('gender', value || [])}
                placeholder="Gender"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Gender</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={options.languages}
                value={filters.languages}
                onChange={(value) => handleFilterChange('languages', value || [])}
                placeholder="Languages"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Languages</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <Select
                isMulti
                options={NOTICE_PERIOD_OPTIONS}
                value={filters.noticePeriod}
                onChange={(value) => handleFilterChange('noticePeriod', value || [])}
                placeholder="Notice Period"
                className="mb-3"
                classNamePrefix="select"
                isClearable
              />
              <span className="custom-tooltip">Notice Period</span>
            </div>
          </div>

          {/* Experience & Salary Filters */}

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <input
                type="number"
                className="form-control"
                name="minExperience"
                value={filters.minExperience}
                onChange={handleInputChange}
                placeholder="Minimum Experience"
                min="0"
                max="30"
              />
              <span className="custom-tooltip">Min. Experience (Years)</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <input
                type="number"
                className="form-control"
                name="teachingExperience"
                value={filters.teachingExperience}
                onChange={handleInputChange}
                placeholder="Min Teaching Experience"
                min="0"
                max="30"
              />
              <span className="custom-tooltip">Min. Teaching Experience (Years)</span>
            </div>
          </div>

          <div className="form-group col-lg-4 col-md-6 col-sm-12 mb-3">
            <div className="input-wrapper">
              <input
                type="number"
                className="form-control"
                name="minSalary"
                value={filters.minSalary}
                onChange={handleInputChange}
                placeholder="Minimum Salary"
                min="0"
              />
              <span className="custom-tooltip">Min. Expected Salary (₹)</span>
            </div>
          </div>
        </div>
        
        {/* Filter Action Buttons */}
        <div className="filter-actions mt-4">
          <div className="d-flex gap-2 justify-content-end">
            <button onClick={clearFilters} className="btn btn-outline-secondary">Cancel</button>
            <button onClick={applyFilters} className="btn btn-primary">Apply Filters</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
