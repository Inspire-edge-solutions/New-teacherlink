import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../Context/AuthContext';
import { toast } from 'react-toastify';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import Select from 'react-select';
import { FaChevronDown } from 'react-icons/fa';
import InputWithTooltip from '../../../../services/InputWithTooltip';
import ModalPortal from '../../../common/ModalPortal';

const API_BASE = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev";
const EDUCATION_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails";
const EXPERIENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience";

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#FDA4AF' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 2px #FED7E2' : 'none',
    '&:hover': { borderColor: '#FDA4AF' },
    borderRadius: '0.5rem',
    padding: '0.125rem',
    minHeight: '38px',
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

const MandatoryProfileModal = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const hasCheckedRef = useRef(false); // Track if we've already checked for this user
  const lastCheckedUidRef = useRef(null); // Track which user we checked

  // Form data
  const [formData, setFormData] = useState({
    permanentCountry: null,
    permanentState: null,
    permanentCity: null,
    presentCountry: null,
    presentState: null,
    presentCity: null,
    grade10Year: '',
    totalWorkExpYears: '0',
    totalWorkExpMonths: '0',
    totalTeachingExpYears: '0',
    totalTeachingExpMonths: '0',
    currentSalary: '',
    jobType: '',
    subjectsHandled: []
  });

  // Location data
  const [countries, setCountries] = useState([]);
  const [indiaOption, setIndiaOption] = useState(null);
  const [permanentStates, setPermanentStates] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);
  const [presentStates, setPresentStates] = useState([]);
  const [presentCities, setPresentCities] = useState([]);
  
  // Subjects data
  const [subjectsOptions, setSubjectsOptions] = useState([]);

  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  // Load countries and find India
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await GetCountries();
        const formattedCountries = countriesData.map(country => ({
          value: country.id,
          label: country.name,
        }));
        setCountries(formattedCountries);
        const india = formattedCountries.find(c => c.label === "India");
        setIndiaOption(india);
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };
    loadCountries();
  }, []);

  // Set India as default country and load states
  useEffect(() => {
    if (indiaOption) {
      setFormData(prev => ({
        ...prev,
        permanentCountry: indiaOption,
        presentCountry: indiaOption
      }));
    }
  }, [indiaOption]);

  // Load states for permanent address
  useEffect(() => {
    const loadStates = async () => {
      if (indiaOption?.value) {
        try {
          const statesData = await GetState(indiaOption.value);
          const formattedStates = statesData.map(state => ({
            value: state.id,
            label: state.name,
          }));
          setPermanentStates(formattedStates);
          setPresentStates(formattedStates);
        } catch (error) {
          console.error("Error loading states:", error);
        }
      }
    };
    loadStates();
  }, [indiaOption]);

  // Load cities for permanent address
  useEffect(() => {
    const loadCities = async () => {
      if (formData.permanentState?.value && indiaOption?.value) {
        try {
          const citiesData = await GetCity(indiaOption.value, formData.permanentState.value);
          const formattedCities = citiesData.map(city => ({
            value: city.name,
            label: city.name,
          }));
          setPermanentCities(formattedCities);
        } catch (error) {
          console.error("Error loading cities:", error);
        }
      } else {
        setPermanentCities([]);
      }
    };
    loadCities();
  }, [formData.permanentState, indiaOption]);

  // Load cities for present address
  useEffect(() => {
    const loadCities = async () => {
      if (formData.presentState?.value && indiaOption?.value) {
        try {
          const citiesData = await GetCity(indiaOption.value, formData.presentState.value);
          const formattedCities = citiesData.map(city => ({
            value: city.name,
            label: city.name,
          }));
          setPresentCities(formattedCities);
        } catch (error) {
          console.error("Error loading cities:", error);
        }
      } else {
        setPresentCities([]);
      }
    };
    loadCities();
  }, [formData.presentState, indiaOption]);

  // Load subjects options
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
        const formattedSubjects = response.data.map((subject) => ({
          value: subject.value,
          label: subject.label
        }));
        setSubjectsOptions(formattedSubjects);
      } catch (error) {
        console.error("Error loading subjects:", error);
      }
    };
    loadSubjects();
  }, []);

  // Check if mandatory fields are already filled
  useEffect(() => {
    const checkMandatoryFields = async () => {
      if (!user?.uid) {
        setIsChecking(false);
        hasCheckedRef.current = false;
        lastCheckedUidRef.current = null;
        return;
      }

      // Prevent duplicate API calls - if we've already checked for this user, skip
      if (hasCheckedRef.current && lastCheckedUidRef.current === user.uid) {
        return;
      }

      // Mark that we're checking for this user
      hasCheckedRef.current = true;
      lastCheckedUidRef.current = user.uid;
      setIsChecking(true);

      try {
        const [
          personalRes,
          permanentAddressRes,
          presentAddressRes,
          educationRes,
          experienceRes
        ] = await Promise.all([
          axios.get(`${API_BASE}/personal`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/permanentAddress`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/presentAddress`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
          axios.get(EDUCATION_API, { params: { firebase_uid: user.uid } }).catch(() => ({ data: [] })),
          axios.get(EXPERIENCE_API, { params: { firebase_uid: user.uid } }).catch(() => ({ data: {} }))
        ]);

        // Check if all mandatory fields are filled
        // Note: Personal data might be collected elsewhere, so we check but don't require it for this modal
        const hasPersonal = personalRes.data.length > 0 && 
          personalRes.data[0].fullName && 
          personalRes.data[0].email && 
          personalRes.data[0].callingNumber;

        // Convert to proper booleans
        const hasPermanentAddress = !!(permanentAddressRes.data.length > 0 && 
          permanentAddressRes.data[0].state_name && 
          permanentAddressRes.data[0].city_name);

        const hasPresentAddress = !!(presentAddressRes.data.length > 0 && 
          presentAddressRes.data[0].state_name && 
          presentAddressRes.data[0].city_name);

        const hasGrade10 = educationRes.data.length > 0 && 
          educationRes.data.some(edu => edu.education_type === 'grade10' && edu.yearOfPassing);

        // Check experience - handle different response structures
        let hasExperience = false;
        const experienceData = experienceRes.data;
        
        if (experienceData?.mysqlData) {
          // mysqlData can be an array or single object
          let experienceRecord = null;
          
          if (Array.isArray(experienceData.mysqlData) && experienceData.mysqlData.length > 0) {
            // Find user's record in array, or use first item
            experienceRecord = experienceData.mysqlData.find(exp => exp.firebase_uid === user.uid) || 
                              experienceData.mysqlData[0];
          } else if (typeof experienceData.mysqlData === 'object' && experienceData.mysqlData !== null) {
            // Single object (check if it matches user or use it directly if it's the only record)
            if (experienceData.mysqlData.firebase_uid === user.uid || !experienceData.mysqlData.firebase_uid) {
              experienceRecord = experienceData.mysqlData;
            }
          }
          
          // Check if both fields exist (accept 0 as valid, only undefined/null means not filled)
          if (experienceRecord && 
              (experienceRecord.total_experience_years !== undefined && experienceRecord.total_experience_years !== null) &&
              (experienceRecord.teaching_experience_years !== undefined && experienceRecord.teaching_experience_years !== null)) {
            hasExperience = true;
          }
        }

        // Check only the fields that THIS modal collects (not personal data)
        // Personal data is collected separately and shouldn't block this modal
        if (hasPermanentAddress && hasPresentAddress && hasGrade10 && hasExperience) {
          setShowModal(false);
        } else {
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error checking mandatory fields:", error);
        // On error, show modal to be safe
        setShowModal(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkMandatoryFields();
  }, [user]);

  // Generate year options for Grade 10
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 1960;
    const years = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(<option key={year} value={year}>{year}</option>);
    }
    return years;
  };

  // Generate year/month options for experience
  const yearOptions = Array.from({ length: 31 }, (_, i) => (
    <option key={i} value={i}>{i} Years</option>
  ));

  const monthOptions = Array.from({ length: 12 }, (_, i) => (
    <option key={i} value={i}>{i} Months</option>
  ));

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.permanentState) {
      errors.permanentState = "Permanent state is required";
    }

    if (!formData.permanentCity) {
      errors.permanentCity = "Permanent city is required";
    }

    if (!formData.presentState) {
      errors.presentState = "Present state is required";
    }

    if (!formData.presentCity) {
      errors.presentCity = "Present city is required";
    }

    if (!formData.grade10Year) {
      errors.grade10Year = "Grade 10 passing year is required";
    }

    // Allow 0 years and 0 months for freshers - no validation needed for minimum experience
    // Validate that teaching experience doesn't exceed total experience
    const totalMonths = (parseInt(formData.totalWorkExpYears) || 0) * 12 + (parseInt(formData.totalWorkExpMonths) || 0);
    const teachingMonths = (parseInt(formData.totalTeachingExpYears) || 0) * 12 + (parseInt(formData.totalTeachingExpMonths) || 0);
    
    if (teachingMonths > totalMonths) {
      errors.totalTeachingExp = "Teaching experience cannot exceed total work experience";
    }

    // Allow 0 salary for freshers - only check if field is empty or invalid
    if (formData.currentSalary === '' || formData.currentSalary === null || formData.currentSalary === undefined) {
      errors.currentSalary = "Current salary is required";
    } else if (isNaN(parseFloat(formData.currentSalary)) || parseFloat(formData.currentSalary) < 0) {
      errors.currentSalary = "Please enter a valid salary (0 is acceptable for freshers)";
    }

    if (!formData.jobType) {
      errors.jobType = "Job type is required";
    }

    if (!formData.subjectsHandled || formData.subjectsHandled.length === 0) {
      errors.subjectsHandled = "At least one subject is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Save addresses
      const permanentAddressPayload = {
        firebase_uid: user.uid,
        country_name: "India",
        state_name: formData.permanentState.label,
        city_name: formData.permanentCity.label
      };

      const presentAddressPayload = {
        firebase_uid: user.uid,
        country_name: "India",
        state_name: formData.presentState.label,
        city_name: formData.presentCity.label
      };

      await Promise.all([
        axios.post(`${API_BASE}/permanentAddress`, permanentAddressPayload, authHeaders),
        axios.post(`${API_BASE}/presentAddress`, presentAddressPayload, authHeaders)
      ]);

      // 3. Save Grade 10 education
      const educationPayload = {
        firebase_uid: user.uid,
        grade10: {
          yearOfPassing: formData.grade10Year,
          syllabus: "",
          schoolName: "",
          percentage: "",
          mode: ""
        },
        additionalEducation: []
      };

      await axios.post(EDUCATION_API, educationPayload, {
        headers: { "Content-Type": "application/json" }
      });

      // 4. Save experience data
      const experiencePayload = {
        firebase_uid: user.uid,
        mysqlDB: {
          firebase_uid: user.uid,
          total_experience_years: formData.totalWorkExpYears,
          total_experience_months: formData.totalWorkExpMonths,
          teaching_experience_years: formData.totalTeachingExpYears,
          teaching_experience_months: formData.totalTeachingExpMonths,
          teaching_exp_fulltime_years: "0",
          teaching_exp_fulltime_months: "0",
          teaching_exp_partime_years: "0",
          teaching_exp_partime_months: "0",
          administration_fulltime_years: "0",
          administration_fulltime_months: "0",
          administration_partime_years: "0",
          administration_parttime_months: "0",
          anyrole_fulltime_years: "0",
          anyrole_fulltime_months: "0",
          anyrole_partime_years: "0",
          anyrole_parttime_months: "0",
          Ed_Tech_Company: 0,
          on_line: 0,
          coaching_tuitions_center: 0,
          group_tuitions: 0,
          private_tuitions: 0,
          home_tuitions: 0
        },
        dynamoDB: [{
          firebase_uid: user.uid,
          organizationName: "Current Organization",
          jobCategory: "fullTime",
          jobType: formData.jobType,
          currentlyWorking: true,
          work_from_month: new Date().getMonth() + 1,
          work_from_year: new Date().getFullYear(),
          salary: formData.currentSalary,
          country: "India",
          state: formData.presentState.label,
          city: formData.presentCity.label,
          jobProcess: "regular",
          teachingDesignation: "",
          teachingSubjects: formData.subjectsHandled,
          teachingGrades: [],
          teachingCoreExpertise: [],
          teachingCurriculum: "",
          adminDesignation: "",
          teachingAdminDesignations: [],
          teachingAdminSubjects: [],
          teachingAdminGrades: [],
          teachingAdminCoreExpertise: [],
          teachingAdminCurriculum: ""
        }]
      };

      await axios.post(EXPERIENCE_API, experiencePayload, {
        headers: { "Content-Type": "application/json" }
      });

      toast.success("Profile details saved successfully!");
      setShowModal(false);
    } catch (error) {
      console.error("Error saving mandatory profile:", error);
      toast.error(error.response?.data?.message || "Failed to save profile details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isChecking) {
    return null; // Don't show anything while checking
  }

  if (!showModal) {
    return null; // Don't show modal if all fields are filled
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{ pointerEvents: 'auto' }}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-2" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-brand text-white p-3 rounded-t-lg">
          <p className="text-sm mt-0.5 text-center">Please fill in the following mandatory details to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Grade 10 - Passing Year */}
            <div>
              <InputWithTooltip label="Grade 10 - Passing Year" required>
                <div className="relative">
                  <select
                    value={formData.grade10Year}
                    onChange={(e) => handleInputChange('grade10Year', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${validationErrors.grade10Year ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                    required
                  >
                    <option value=""disabled>Grade 10 - Passing Year</option>
                    {generateYearOptions()}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </div>
              </InputWithTooltip>
              {validationErrors.grade10Year && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.grade10Year}</span>
              )}
            </div>

            {/* Current Salary */}
            <div>
              <InputWithTooltip label="Current Salary (in LPA)" required>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 font-semibold">Rs.</span>
                  <input
                    type="number"
                    value={formData.currentSalary}
                    onChange={(e) => handleInputChange('currentSalary', e.target.value)}
                    placeholder="Current Salary (in LPA)"
                    step="0.1"
                    min="0"
                    className={`flex-1 px-3 py-2 rounded-lg border ${validationErrors.currentSalary ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300`}
                    required
                  />
                  <span className="text-gray-700 font-semibold">LPA</span>
                </div>
              </InputWithTooltip>
              {validationErrors.currentSalary && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.currentSalary}</span>
              )}
            </div>

            {/* Job Type */}
            <div>
              <InputWithTooltip label="Job Type" required>
                <div className="relative">
                  <select
                    value={formData.jobType}
                    onChange={(e) => handleInputChange('jobType', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${validationErrors.jobType ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                    required
                  >
                    <option value="" disabled>Job Type</option>
                    <option value="teaching">Education - Teaching</option>
                    <option value="administration">Non - Teaching</option>
                    <option value="teachingAndAdministration">Education - Teaching + Non - Teaching</option>
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </div>
              </InputWithTooltip>
              {validationErrors.jobType && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.jobType}</span>
              )}
            </div>

            {/* Subjects Handled */}
            <div>
              <InputWithTooltip label="Subjects" required>
                <Select
                  isMulti
                  options={subjectsOptions}
                  value={subjectsOptions.filter((opt) =>
                    formData.subjectsHandled.includes(opt.value)
                  )}
                  onChange={(selected) => {
                    handleInputChange('subjectsHandled', selected ? selected.map((item) => item.value) : []);
                  }}
                  placeholder="Subjects"
                  isClearable
                  styles={reactSelectStyles}
                  menuPortalTarget={document.body}
                  menuPlacement="auto"
                  maxMenuHeight={250}
                />
              </InputWithTooltip>
              {validationErrors.subjectsHandled && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.subjectsHandled}</span>
              )}
            </div>

            {/* Total and Teaching Experience */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-3">
                {/* Total Work Experience */}
                <div className="flex-1 min-w-[280px]">
                  <h4 className="text-black mb-2 text-sm">Total Experience (Full Time + Part Time)</h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[120px]">
                      <InputWithTooltip label="Years" required>
                        <div className="relative">
                          <select
                            value={formData.totalWorkExpYears}
                            onChange={(e) => handleInputChange('totalWorkExpYears', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${validationErrors.totalWorkExp ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                            required
                          >
                            <option value="" disabled>Years</option>
                            {yearOptions}
                          </select>
                          <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                      </InputWithTooltip>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <InputWithTooltip label="Months" required>
                        <div className="relative">
                          <select
                            value={formData.totalWorkExpMonths}
                            onChange={(e) => handleInputChange('totalWorkExpMonths', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${validationErrors.totalWorkExp ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                            required
                          >
                            <option value="" disabled>Months</option>
                            {monthOptions}
                          </select>
                          <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                      </InputWithTooltip>
                    </div>
                  </div>
                  {validationErrors.totalWorkExp && (
                    <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.totalWorkExp}</span>
                  )}
                </div>

                {/* Total Teaching Experience */}
                <div className="flex-1 min-w-[280px]">
                  <h4 className="text-black mb-2 text-sm">Total Teaching Exp (Full Time + Part Time)</h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[120px]">
                      <InputWithTooltip label="Years" required>
                        <div className="relative">
                          <select
                            value={formData.totalTeachingExpYears}
                            onChange={(e) => handleInputChange('totalTeachingExpYears', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${validationErrors.totalTeachingExp ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                            required
                          >
                            <option value="" disabled>Years</option>
                            {yearOptions}
                          </select>
                          <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                      </InputWithTooltip>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <InputWithTooltip label="Months" required>
                        <div className="relative">
                          <select
                            value={formData.totalTeachingExpMonths}
                            onChange={(e) => handleInputChange('totalTeachingExpMonths', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border ${validationErrors.totalTeachingExp ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10`}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                            required
                          >
                            <option value="" disabled>Months</option>
                            {monthOptions}
                          </select>
                          <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                        </div>
                      </InputWithTooltip>
                    </div>
                  </div>
                  {validationErrors.totalTeachingExp && (
                    <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.totalTeachingExp}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Permanent Address - State */}
            <div>
              <InputWithTooltip label="Permanent Address - State" required>
                <Select
                  options={permanentStates}
                  value={formData.permanentState}
                  onChange={(selected) => {
                    handleInputChange('permanentState', selected);
                    handleInputChange('permanentCity', null);
                  }}
                  placeholder="Permanent Address - State"
                  styles={reactSelectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
              {validationErrors.permanentState && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.permanentState}</span>
              )}
            </div>

            {/* Permanent Address - City */}
            <div>
              <InputWithTooltip label="Permanent Address - City" required>
                <Select
                  options={permanentCities}
                  value={formData.permanentCity}
                  onChange={(selected) => handleInputChange('permanentCity', selected)}
                  placeholder="Permanent Address - City"
                  isDisabled={!formData.permanentState}
                  styles={reactSelectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
              {validationErrors.permanentCity && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.permanentCity}</span>
              )}
            </div>

            {/* Present Address - State */}
            <div>
              <InputWithTooltip label="Present Address - State" required>
                <Select
                  options={presentStates}
                  value={formData.presentState}
                  onChange={(selected) => {
                    handleInputChange('presentState', selected);
                    handleInputChange('presentCity', null);
                  }}
                  placeholder="Present Address - State"
                  styles={reactSelectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
              {validationErrors.presentState && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.presentState}</span>
              )}
            </div>

            {/* Present Address - City */}
            <div>
              <InputWithTooltip label="Present Address - City" required>
                <Select
                  options={presentCities}
                  value={formData.presentCity}
                  onChange={(selected) => handleInputChange('presentCity', selected)}
                  placeholder="Present Address - City"
                  isDisabled={!formData.presentState}
                  styles={reactSelectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
              {validationErrors.presentCity && (
                <span className="text-red-500 text-xs mt-0.5 block">{validationErrors.presentCity}</span>
              )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex justify-center">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default MandatoryProfileModal;

