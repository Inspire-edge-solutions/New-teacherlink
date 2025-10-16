import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import Select from 'react-select';
import csc from 'countries-states-cities';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const JobPreference = forwardRef(({ formData, updateFormData }, ref) => {
  const { user } = useAuth();
  const isMounted = useRef(false);
  const dataFetched = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // For country/state/city
  const countries = csc.getAllCountries().map((country) => ({
    value: country.id,
    label: country.name,
  }));
  
  // Find India in the countries list
  const indiaOption = countries.find(country => country.label === "India") || null;

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

  // Set India as the default country if preferred_country is not set
  useEffect(() => {
    if (!jobDetails.preferred_country && indiaOption) {
      setJobDetails(prev => ({
        ...prev,
        preferred_country: indiaOption
      }));
    }
  }, []);

  // Update state when formData changes
  useEffect(() => {
    if (formData) {
      setPreferences(formData.preferences || initialStateRef.current.preferences);
      setJobSearchStatus(formData.jobSearchStatus || initialStateRef.current.jobSearchStatus);
      setJobDetails(formData.jobDetails || initialStateRef.current.jobDetails);
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

  const states = jobDetails.preferred_country
    ? csc.getStatesOfCountry(jobDetails.preferred_country.value).map((state) => ({
        value: state.id,
        label: state.name,
      }))
    : [];
  const cities = jobDetails.preferred_state
    ? csc.getCitiesOfState(jobDetails.preferred_state.value).map((city) => ({
        value: city.id,
        label: city.name,
      }))
    : [];

  // Add validation function
  const validateJobPreferences = () => {
    // Helper function to check if a value exists
    const hasValue = (val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') {
        if (val.value !== undefined) return true; // Consider both "yes" and "no" as valid values
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
    const areJobShiftsValid = Object.values(preferences.jobShift).every(
      (shift) => shift && shift.value
    );

    // 2. Validate organization types
    const areOrgTypesValid = Object.values(preferences.organizationType).every(
      (org) => org && org.value
    );

    // 3. Validate parent/guardian preferences
    const areParentPrefsValid = Object.values(preferences.parentGuardian).every(
      (pref) => pref && pref.value
    );

    // 4. Validate teaching mode - Fixed to handle both string and object formats
    const onlineValue = getTeachingModeValue(preferences.teachingMode.online);
    const offlineValue = getTeachingModeValue(preferences.teachingMode.offline);
    const isTeachingModeValid = 
      (onlineValue === "yes" || onlineValue === "no") && 
      (offlineValue === "yes" || offlineValue === "no");

    // 5. Validate basic job details
    const areBasicDetailsValid =
      hasValue(jobDetails.Job_Type) &&
      hasValue(jobDetails.expected_salary) &&
      hasValue(jobDetails.notice_period);

    // 6. Validate location preferences (if any are filled, all must be filled)
    const hasAnyLocation =
      jobDetails.preferred_country ||
      jobDetails.preferred_state ||
      jobDetails.preferred_city;

    const areLocationsValid =
      !hasAnyLocation ||
      (hasValue(jobDetails.preferred_country) && hasValue(jobDetails.preferred_state));

    // 7. Validate job type specific fields - Removed curriculum requirement as it's not in the form
    let areJobTypeFieldsValid = true;
    if (jobDetails.Job_Type === 'teaching') {
      areJobTypeFieldsValid =
        hasValue(jobDetails.teachingDesignation) &&
        hasValue(jobDetails.teachingSubjects) &&
        hasValue(jobDetails.teachingGrades) &&
        hasValue(jobDetails.teachingCoreExpertise);
    } else if (jobDetails.Job_Type === 'administration') {
      areJobTypeFieldsValid = hasValue(jobDetails.adminDesignations);
    } else if (jobDetails.Job_Type === 'teachingAndAdmin') {
      areJobTypeFieldsValid =
        hasValue(jobDetails.teachingAdminDesignations) &&
        hasValue(jobDetails.teachingAdminSubjects) &&
        hasValue(jobDetails.teachingAdminGrades) &&
        hasValue(jobDetails.teachingAdminCoreExpertise);
    }

    // 8. Validate job search status
    const isJobSearchValid = Object.values(jobSearchStatus).every(
      (status) => hasValue(status.value)
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
      }
    });

    return (
      areJobShiftsValid &&
      areOrgTypesValid &&
      areParentPrefsValid &&
      isTeachingModeValid &&
      areBasicDetailsValid &&
      areLocationsValid &&
      areJobTypeFieldsValid &&
      isJobSearchValid
    );
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

  // Effect to handle parent form updates
  useEffect(() => {
    if (!isMounted.current) return;

    const timeoutId = setTimeout(() => {
      const isValid = validateJobPreferences();
      updateFormData(
        {
          preferences,
          jobDetails,
          jobSearchStatus,
        },
        isValid
      );
    }, 100); // Small delay to batch updates

    return () => clearTimeout(timeoutId);
  }, [preferences, jobDetails, jobSearchStatus]);

  // Effect to handle initial mount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch existing job preferences (if any)
  useEffect(() => {
    if (!user?.uid || dataFetched.current) return;
    
    const fetchJobPreference = async () => {
      try {
        const response = await axios.get(
          "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference",
          { params: { firebase_uid: user.uid } }
        );

        if (response.status === 200 && response.data && response.data.length > 0) {
          const record = response.data[0];

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
              value: record.full_time_2_offline || "",
            },
            part_time_weekdays: {
              value: record.part_time_weekdays_2_offline || "",
            },
            part_time_weekends: {
              value: record.part_time_weekends_2_offline || "",
            },
            part_time_vacations: {
              value: record.part_time_vacations_2_offline || "",
            },
            tuitions: {
              value: record.tuitions_2_offline || "",
            },
          };

          const details = {
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
            preferred_country: record.preferred_country
              ? { label: record.preferred_country, value: record.preferred_country }
              : "",
            preferred_state: record.preferred_state
              ? { label: record.preferred_state, value: record.preferred_state }
              : "",
            preferred_city: record.preferred_city
              ? { label: record.preferred_city, value: record.preferred_city }
              : "",
            notice_period: record.notice_period || "",
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
    setJobSearchStatus((prev) => {
      const newStatus = {
        ...prev,
        [type]: {
          ...prev[type],
          [mode]: value,
        },
      };

      const isValid = validateJobPreferences();
      updateFormData(
        {
          preferences,
          jobDetails,
          jobSearchStatus: newStatus,
        },
        isValid
      );

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
        full_time_offline: convertToInt(preferences.jobShift.Full_time.value),
        full_time_online: convertToInt(preferences.jobShift.Full_time.value),
        part_time_weekdays_offline: convertToInt(preferences.jobShift.part_time_weekdays.value),
        part_time_weekdays_online: convertToInt(preferences.jobShift.part_time_weekdays.value),
        part_time_weekends_offline: convertToInt(preferences.jobShift.part_time_weekends.value),
        part_time_weekends_online: convertToInt(preferences.jobShift.part_time_weekends.value),
        part_time_vacations_offline: convertToInt(preferences.jobShift.part_time_vacations.value),
        part_time_vacations_online: convertToInt(preferences.jobShift.part_time_vacations.value),

        school_college_university_offline: convertToInt(preferences.organizationType.school_college_university.value),
        school_college_university_online: convertToInt(preferences.organizationType.school_college_university.value),
        coaching_institute_offline: convertToInt(preferences.organizationType.coaching_institute.value),
        coaching_institute_online: convertToInt(preferences.organizationType.coaching_institute.value),
        Ed_TechCompanies_offline: convertToInt(preferences.organizationType.Ed_TechCompanies.value),
        Ed_TechCompanies_online: convertToInt(preferences.organizationType.Ed_TechCompanies.value),

        // Parent/Guardian
        Home_Tutor_offline: convertToInt(preferences.parentGuardian.Home_Tutor.value),
        Home_Tutor_online: convertToInt(preferences.parentGuardian.Home_Tutor.value),
        Private_Tutor_offline: convertToInt(preferences.parentGuardian.Private_Tutor.value),
        Private_Tutor_online: convertToInt(preferences.parentGuardian.Private_Tutor.value),
        Group_Tutor_offline: convertToInt(preferences.parentGuardian.Group_Tutor.value),
        Group_Tutor_online: convertToInt(preferences.parentGuardian.Group_Tutor.value),
        Private_Tutions_online_online: convertToInt(preferences.parentGuardian.Private_Tutions.value),
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

        // Job search status
        full_time_2_offline: jobSearchStatus.Full_time.value,
        full_time_2_online: jobSearchStatus.Full_time.value,
        part_time_weekdays_2_offline: jobSearchStatus.part_time_weekdays.value,
        part_time_weekdays_2_online: jobSearchStatus.part_time_weekdays.value,
        part_time_weekends_2_offline: jobSearchStatus.part_time_weekends.value,
        part_time_weekends_2_online: jobSearchStatus.part_time_weekends.value,
        part_time_vacations_2_offline: jobSearchStatus.part_time_vacations.value,
        part_time_vacations_2_online: jobSearchStatus.part_time_vacations.value,
        tuitions_2_offline: jobSearchStatus.tuitions.value,
        tuitions_2_online: jobSearchStatus.tuitions.value,
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
      <h3 className="text-gray-700 font-medium mb-3" style={{color:"brown"}}>Expected Job Preferences</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Job Type */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
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
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Expected Salary */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Expected salary(INR)</label>
          <Select
            required
            placeholder="Expected salary(INR)"
            value={salaryRanges.find(option => option.value === jobDetails.expected_salary)}
            onChange={(selectedOption) =>
              setJobDetails((prev) => ({
                ...prev,
                expected_salary: selectedOption.value,
              }))
            }
            options={salaryRanges}
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Notice Period */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period</label>
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
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Preferred Country */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Country</label>
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
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Preferred State */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred State/UT</label>
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
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Preferred City */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred City</label>
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
            className="custom-select required"
            styles={{
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
              })
            }}
          />
        </div>

        {/* Teaching + Admin */}
        {jobDetails.Job_Type && (
          <>
            {jobDetails.Job_Type === 'teachingAndAdmin' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teaching & Administrative Designation(s)</label>
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
                    className="custom-select required"
                    styles={{
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
                      })
                    }}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum/Board/University</label>
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
                    styles={{
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
                      })
                    }}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
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
                    className="custom-select required"
                    styles={{
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
                      })
                    }}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grades</label>
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
                    className="custom-select required"
                    styles={{
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
                      })
                    }}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Core Expertise</label>
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
                    className="custom-select required"
                    styles={{
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
                      })
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Teaching only */}
        {jobDetails.Job_Type === 'teaching' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Teaching Designation(s)</label>
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
                className="custom-select required"
                styles={{
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
                  })
                }}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum/Board/University</label>
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
                styles={{
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
                  })
                }}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
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
                className="custom-select required"
                styles={{
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
                  })
                }}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Grades</label>
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
                className="custom-select required"
                styles={{
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
                  })
                }}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Core Expertise</label>
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
                className="custom-select required"
                styles={{
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
                  })
                }}
              />
            </div>
          </div>
        )}

        {/* Administration only */}
        {jobDetails.Job_Type === 'administration' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Administrative Designation(s)</label>
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
                className="custom-select required"
                styles={{
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
                  })
                }}
              />
            </div>
          </div>
        )}
      </div>
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
        full_time_offline: convertToInt(preferences.jobShift.Full_time.value),
        full_time_online: convertToInt(preferences.jobShift.Full_time.value),
        part_time_weekdays_offline: convertToInt(preferences.jobShift.part_time_weekdays.value),
        part_time_weekdays_online: convertToInt(preferences.jobShift.part_time_weekdays.value),
        part_time_weekends_offline: convertToInt(preferences.jobShift.part_time_weekends.value),
        part_time_weekends_online: convertToInt(preferences.jobShift.part_time_weekends.value),
        part_time_vacations_offline: convertToInt(preferences.jobShift.part_time_vacations.value),
        part_time_vacations_online: convertToInt(preferences.jobShift.part_time_vacations.value),

        school_college_university_offline: convertToInt(preferences.organizationType.school_college_university.value),
        school_college_university_online: convertToInt(preferences.organizationType.school_college_university.value),
        coaching_institute_offline: convertToInt(preferences.organizationType.coaching_institute.value),
        coaching_institute_online: convertToInt(preferences.organizationType.coaching_institute.value),
        Ed_TechCompanies_offline: convertToInt(preferences.organizationType.Ed_TechCompanies.value),
        Ed_TechCompanies_online: convertToInt(preferences.organizationType.Ed_TechCompanies.value),

        // Parent/Guardian
        Home_Tutor_offline: convertToInt(preferences.parentGuardian.Home_Tutor.value),
        Home_Tutor_online: convertToInt(preferences.parentGuardian.Home_Tutor.value),
        Private_Tutor_offline: convertToInt(preferences.parentGuardian.Private_Tutor.value),
        Private_Tutor_online: convertToInt(preferences.parentGuardian.Private_Tutor.value),
        Group_Tutor_offline: convertToInt(preferences.parentGuardian.Group_Tutor.value),
        Group_Tutor_online: convertToInt(preferences.parentGuardian.Group_Tutor.value),
        Private_Tutions_online_online: convertToInt(preferences.parentGuardian.Private_Tutions.value),

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

        // Job search status
        full_time_2_offline: jobSearchStatus.Full_time.value,
        full_time_2_online: jobSearchStatus.Full_time.value,
        part_time_weekdays_2_offline: jobSearchStatus.part_time_weekdays.value,
        part_time_weekdays_2_online: jobSearchStatus.part_time_weekdays.value,
        part_time_weekends_2_offline: jobSearchStatus.part_time_weekends.value,
        part_time_weekends_2_online: jobSearchStatus.part_time_weekends.value,
        part_time_vacations_2_offline: jobSearchStatus.part_time_vacations.value,
        part_time_vacations_2_online: jobSearchStatus.part_time_vacations.value,
        tuitions_2_offline: jobSearchStatus.tuitions.value,
        tuitions_2_online: jobSearchStatus.tuitions.value,
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
      className="rounded-lg p-6" 
      style={{backgroundColor: '#F0D8D9'}} 
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e);
      }}
    >
      <div className="w-full space-y-6">
        {/* Job Shift & Job Category Section */}
        <div>
          <h3 className='text-gray-700 font-medium mb-3' style={{color:"brown"}}>Select your preferred teaching mode :</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='w-full'>
              <label htmlFor="teachingMode_online" className="block text-sm font-medium text-gray-700 mb-2">Online</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={preferences.teachingMode.online?.value || preferences.teachingMode.online}
                onChange={(e) => {
                  handlePreferenceChange('teachingMode', 'online', null, e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className='w-full'>
              <label htmlFor="teachingMode_offline" className="block text-sm font-medium text-gray-700 mb-2">Offline</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={preferences.teachingMode.offline?.value || preferences.teachingMode.offline}
                onChange={(e) => {
                  handlePreferenceChange('teachingMode', 'offline', null, e.target.value);
                }}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-gray-700 font-medium mb-3" style={{color:"brown"}}>Job Shift Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Full_time" className="block text-sm font-medium text-gray-700 mb-2">Full Time</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Part_time_weekdays" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Weekdays)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Part_time_weekends" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Weekends)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Part_time_vacations" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Vacations)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
          <h3 className="text-gray-700 font-medium mb-3" style={{color:"brown"}}>Organization Type Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="school_college_university" className="block text-sm font-medium text-gray-700 mb-2">School / College / University</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="coaching_institute" className="block text-sm font-medium text-gray-700 mb-2">Coaching Centers / Institutes</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Ed_TechCompanies" className="block text-sm font-medium text-gray-700 mb-2">EdTech Companies</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
          <h3 className="text-gray-700 font-medium mb-3" style={{color:"brown"}}>Tuition Preferences :</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Home_Tutor" className="block text-sm font-medium text-gray-700 mb-2">Home Tutor (One-to-One at Students Home)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Private_Tutor" className="block text-sm font-medium text-gray-700 mb-2">Private Tutor (One-to-One at Tutors Place)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Group_Tutor_offline" className="block text-sm font-medium text-gray-700 mb-2">Group Tuitions (at teachers home)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Private_Tutions_online" className="block text-sm font-medium text-gray-700 mb-2">Private Tuitions (One-One)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
              <label htmlFor="Group_Tutor_online" className="block text-sm font-medium text-gray-700 mb-2">Group Tuitions (from teacher as tutor)</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
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
          <h3 className="text-gray-700 font-medium mb-3" style={{color:"brown"}}>Job Search Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="Full_time_status" className="block text-sm font-medium text-gray-700 mb-2">Full Time</label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={jobSearchStatus.Full_time.value}
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
              <label htmlFor="part_time_weekdays_status" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Weekdays)</label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={jobSearchStatus.part_time_weekdays.value}
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
              <label htmlFor="part_time_weekends_status" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Weekends)</label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={jobSearchStatus.part_time_weekends.value}
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
              <label htmlFor="part_time_vacations_status" className="block text-sm font-medium text-gray-700 mb-2">Part Time (Vacations)</label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={jobSearchStatus.part_time_vacations.value}
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
              <label htmlFor="tuitions_status" className="block text-sm font-medium text-gray-700 mb-2">Tuitions</label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                value={jobSearchStatus.tuitions.value}
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
