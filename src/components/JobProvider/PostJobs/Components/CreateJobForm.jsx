import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../../../Context/AuthContext";
import Select from "react-select";
import InputWithTooltip from "../../../../services/InputWithTooltip";
import JobDetailsView from "../Shared/JobDetailsView";
import {
  findIndiaOption,
  mapAllCountries,
  mapStatesOfCountry,
  mapCitiesOfState,
  multiSelectOptions,
  selectMenuPortalStyles,
  yearOptions,
  monthOptions,
  jobCategoryOptions
} from "../Shared/utils";

const ProfileRequiredModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  // Create modal content
  const modalContent = (
    <div 
      className="fixed inset-0 w-screen h-screen bg-black bg-opacity-20 z-[22222] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden relative flex flex-col animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                👤
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 m-0">
                Profile Required
              </h3>
            </div>
            <button 
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xl"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F0D8D9]">
          <div className="text-center">
            <div className="text-6xl mb-6">👤</div>
            <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Create Your Profile First
              </h4>
              <p className="text-gray-700 text-base leading-relaxed m-0">
                Please complete your organization profile to start posting jobs. Your profile information helps job seekers learn more about your organization.
              </p>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg text-left">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-xl">ℹ️</span>
                <p className="text-sm text-blue-800 m-0 leading-relaxed">
                  You can access your profile from the "My Profile" section in the navigation menu.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white flex justify-center">
          <button
            onClick={onClose}
            className="bg-gradient-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-gradient-primary-hover transition-colors min-w-[120px] shadow-md"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render modal using Portal to avoid positioning issues
  return ReactDOM.createPortal(modalContent, document.body);
};

const JobReviewModal = ({ isOpen, onClose, onConfirm, previewData, isPosting }) => {
  if (!isOpen || !previewData) return null;

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-20 z-[22222] flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-modalSlideIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
              📋
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 m-0">
              Job Post Review
            </h3>
          </div>
          <button 
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 bg-[#F0D8D9]">
          <JobDetailsView jobData={previewData} variant="modal" />
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-white flex justify-between items-center gap-4 flex-wrap">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors min-w-[120px] flex-1 max-w-[200px] shadow-md"
          >
            ✏️ Edit Job
          </button>
          <button
            onClick={onConfirm}
            className="bg-gradient-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-gradient-primary-hover transition-colors disabled:opacity-50 min-w-[150px] flex-1 max-w-[250px] shadow-md"
            disabled={isPosting}
          >
            {isPosting ? "⏳ Posting..." : "✅ Confirm & Post Job"}
          </button>
        </div>
      </div>
      
    </div>
  );
  
  return ReactDOM.createPortal(modalContent, document.body);
};

const CreateJobForm = ({ editJobData, onClearEditData, onEditSuccess }) => {
  const { user } = useAuth();

  const [languagesSpeak, setLanguagesSpeak] = useState([]);
  const [languagesRead, setLanguagesRead] = useState([]);
  const [languagesWrite, setLanguagesWrite] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [designatedGrades, setDesignatedGrades] = useState([]);
  const [coreExpertise, setCoreExpertise] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [others, setOthers] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [allStates, setAllStates] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [sentWhatsappForJob, setSentWhatsappForJob] = useState([]);
  //const [wfoVerification, setWfoVerification] = useState(false);

  const languageList = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/languages");
      const transformedData = response.data.filter((item) => item.category === "languages in India") || [];
      setLanguagesSpeak(transformedData);
      setLanguagesRead(transformedData);
      setLanguagesWrite(transformedData);
    } catch (error) {}
  };

  const subjectList = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
      setSubjectsList(response.data);
    } catch (error) {}
  };

  const fetchDesignations = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/constants");
      const transformedData = response.data.map((item) => ({
        category: item.category,
        value: item.value,
        label: item.label,
      }));
      setDesignations(transformedData.filter((item) => item.category === "Administration") || []);
      setCoreExpertise(transformedData.filter((item) => item.category === "Core Expertise") || []);
      setDesignatedGrades(transformedData.filter((item) => item.category === "Grades") || []);
      setCurriculum(transformedData.filter((item) => item.category === "Curriculum") || []);
      setQualifications(
        transformedData.filter((item) => item.category === "Diploma" ||item.category === "Degrees" || item.category === "MasterDegree"|| item.category === "Doctorate") || []
      );
    } catch (error) {}
  };

  useEffect(() => {
    fetchDesignations();
    languageList();
    subjectList();
  }, []);

  const findOptionsByValues = (options, values) => {
    if (!Array.isArray(values) || !Array.isArray(options)) return [];
    return options.filter((option) => values.includes(option.value));
  };

  const findOptionByValue = (options, value) => {
    if (!Array.isArray(options) || !value) return null;
    return options.find((option) => option.value === value || option.label === value) || null;
  };

  // Helper function to parse experience values (handles "3 years", "1 year", or numeric values)
  const parseExperienceValue = (value) => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Extract number from strings like "3 years", "1 year", "3"
      const match = value.match(/^(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  };

  const createYearMonthOptions = () => {
    const years = [];
    const months = [];
    for (let i = 0; i <= 50; i++) {
      years.push({ value: i, label: i.toString() });
    }
    for (let i = 0; i <= 11; i++) {
      months.push({ value: i, label: i.toString() });
    }
    return { years, months };
  };

  // Populate basic fields immediately when editJobData exists
  useEffect(() => {
    if (editJobData) {
      console.log("Loading edit job data:", editJobData);
      setJobTitle(editJobData.job_title || "");
      // Normalize job_type: convert "fullTime" to "full_time", etc.
      const normalizedJobType = editJobData.job_type ? editJobData.job_type.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() : "full_time";
      setJobCategory(normalizedJobType);
      setSelectedJobCategory(normalizedJobType);
      setNoOfOpening(String(editJobData.no_of_opening || ""));
      setJobDescription(editJobData.job_description || "");
      setJoiningDate(editJobData.joining_date || "");
      setMinSalary(String(editJobData.min_salary || ""));
      setMaxSalary(String(editJobData.max_salary || ""));
      setKnowledgeOfAccProcess(editJobData.knowledge_of_acc_process || "No");
      setNoticePeriod(editJobData.notice_period || "");
      setJobSearchStatus(editJobData.job_search_status || "");
      setGender(editJobData.gender || "");
      setMinimumAge(String(editJobData.minimum_age || ""));
      setMaximumAge(String(editJobData.maximum_age || ""));
      setAddress(editJobData.address || "");
      setLatitude(editJobData.latitude || "");
      setLongitude(editJobData.longitude || "");

      // Load country/state/city data
      if (editJobData.country) {
        const loadCountryData = async () => {
          try {
            const countries = await mapAllCountries();
            const countryOption = countries.find((c) => c.label === editJobData.country);
            if (countryOption) {
              setMainCountry(countryOption);
              if (editJobData.state_ut) {
                const states = await mapStatesOfCountry(countryOption.value);
                const stateOption = states.find((s) => s.label === editJobData.state_ut);
                if (stateOption) {
                  setMainState(stateOption);
                  if (editJobData.city) {
                    const cities = await mapCitiesOfState(countryOption.value, stateOption.value);
                    const cityOption = cities.find((c) => c.label === editJobData.city);
                    if (cityOption) {
                      setMainCity(cityOption);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error loading country data:', error);
          }
        };
        loadCountryData();
      }

      // Load experience fields (these don't depend on external arrays)
      const { years, months } = createYearMonthOptions();
      const totalExpMinYearsValue = parseExperienceValue(editJobData.total_experience_min_years);
      const totalExpMinMonthsValue = parseExperienceValue(editJobData.total_experience_min_months);
      const totalExpMaxYearsValue = parseExperienceValue(editJobData.total_experience_max_years);
      const totalExpMaxMonthsValue = parseExperienceValue(editJobData.total_experience_max_months);
      const teachingExpMinYearsValue = parseExperienceValue(editJobData.teaching_experience_min_years);
      const teachingExpMinMonthsValue = parseExperienceValue(editJobData.teaching_experience_min_months);
      const teachingExpMaxYearsValue = parseExperienceValue(editJobData.teaching_experience_max_years);
      const teachingExpMaxMonthsValue = parseExperienceValue(editJobData.teaching_experience_max_months);
      const nonTeachingExpMinYearsValue = parseExperienceValue(editJobData.non_teaching_experience_min_years);
      const nonTeachingExpMinMonthsValue = parseExperienceValue(editJobData.non_teaching_experience_min_months);
      const nonTeachingExpMaxYearsValue = parseExperienceValue(editJobData.non_teaching_experience_max_years);
      const nonTeachingExpMaxMonthsValue = parseExperienceValue(editJobData.non_teaching_experience_max_months);
      
      if (totalExpMinYearsValue !== null) setTotalExpMinYears(findOptionByValue(years, totalExpMinYearsValue));
      if (totalExpMinMonthsValue !== null) setTotalExpMinMonths(findOptionByValue(months, totalExpMinMonthsValue));
      if (totalExpMaxYearsValue !== null) setTotalExpMaxYears(findOptionByValue(years, totalExpMaxYearsValue));
      if (totalExpMaxMonthsValue !== null) setTotalExpMaxMonths(findOptionByValue(months, totalExpMaxMonthsValue));
      if (teachingExpMinYearsValue !== null) setTeachingExpMinYears(findOptionByValue(years, teachingExpMinYearsValue));
      if (teachingExpMinMonthsValue !== null) setTeachingExpMinMonths(findOptionByValue(months, teachingExpMinMonthsValue));
      if (teachingExpMaxYearsValue !== null) setTeachingExpMaxYears(findOptionByValue(years, teachingExpMaxYearsValue));
      if (teachingExpMaxMonthsValue !== null) setTeachingExpMaxMonths(findOptionByValue(months, teachingExpMaxMonthsValue));
      if (nonTeachingExpMinYearsValue !== null) setNonTeachingExpMinYears(findOptionByValue(years, nonTeachingExpMinYearsValue));
      if (nonTeachingExpMinMonthsValue !== null) setNonTeachingExpMinMonths(findOptionByValue(months, nonTeachingExpMinMonthsValue));
      if (nonTeachingExpMaxYearsValue !== null) setNonTeachingExpMaxYears(findOptionByValue(years, nonTeachingExpMaxYearsValue));
      if (nonTeachingExpMaxMonthsValue !== null) setNonTeachingExpMaxMonths(findOptionByValue(months, nonTeachingExpMaxMonthsValue));
      
      toast.info("Job data loaded for editing. Make your changes and submit.");
    }
  }, [editJobData]);

  // Populate array-dependent fields once arrays are loaded
  useEffect(() => {
    if (!editJobData) return;

    // Handle qualifications
    if (editJobData.qualification && qualifications.length > 0) {
      const qualificationValues = Array.isArray(editJobData.qualification) ? editJobData.qualification : [editJobData.qualification];
      setSelectedQualifications(findOptionsByValues(qualifications, qualificationValues));
    }

    // Handle core subjects
    if (editJobData.core_subjects && subjectsList.length > 0) {
      const coreSubjectValues = Array.isArray(editJobData.core_subjects) ? editJobData.core_subjects : [editJobData.core_subjects];
      setSelectedCoreSubjects(findOptionsByValues(subjectsList, coreSubjectValues));
    }

    // Handle optional subjects
    if (editJobData.optional_subject && subjectsList.length > 0) {
      const optionalSubjectValues = Array.isArray(editJobData.optional_subject) ? editJobData.optional_subject : [editJobData.optional_subject];
      setSelectedOptionalSubject(findOptionsByValues(subjectsList, optionalSubjectValues));
    }

    // Handle designations
    if (editJobData.designations && designations.length > 0) {
      const designationValues = Array.isArray(editJobData.designations) ? editJobData.designations : [editJobData.designations];
      setSelectedDesignations(findOptionsByValues(designations, designationValues));
    }

    // Handle subjects
    if (editJobData.subjects && subjectsList.length > 0) {
      const subjectValues = Array.isArray(editJobData.subjects) ? editJobData.subjects : [editJobData.subjects];
      setSelectedSubjects(findOptionsByValues(subjectsList, subjectValues));
    }

    // Handle languages
    if (editJobData.language_speak && languagesSpeak.length > 0) {
      const speakValues = Array.isArray(editJobData.language_speak) ? editJobData.language_speak : [editJobData.language_speak];
      setSelectedLanguageSpeak(findOptionsByValues(languagesSpeak, speakValues));
    }
    if (editJobData.language_read && languagesRead.length > 0) {
      const readValues = Array.isArray(editJobData.language_read) ? editJobData.language_read : [editJobData.language_read];
      setSelectedLanguageRead(findOptionsByValues(languagesRead, readValues));
    }
    if (editJobData.language_write && languagesWrite.length > 0) {
      const writeValues = Array.isArray(editJobData.language_write) ? editJobData.language_write : [editJobData.language_write];
      setSelectedLanguageWrite(findOptionsByValues(languagesWrite, writeValues));
    }

    // Handle computer skills
    if (editJobData.computer_skills) {
      const computerSkillsValues = Array.isArray(editJobData.computer_skills) ? editJobData.computer_skills : [editJobData.computer_skills];
      setSelectedComputerSkills(findOptionsByValues(multiSelectOptions.computer_skills, computerSkillsValues));
    }

    // Handle designated grades
    if (editJobData.designated_grades && designatedGrades.length > 0) {
      const gradeValues = Array.isArray(editJobData.designated_grades) ? editJobData.designated_grades : [editJobData.designated_grades];
      setSelectedDesignatedGrades(findOptionsByValues(designatedGrades, gradeValues));
    }

    // Handle curriculum
    if (editJobData.curriculum && curriculum.length > 0) {
      const curriculumValues = Array.isArray(editJobData.curriculum) ? editJobData.curriculum : [editJobData.curriculum];
      setSelectedCurriculum(findOptionsByValues(curriculum, curriculumValues));
    }

    // Handle core expertise
    if (editJobData.core_expertise && coreExpertise.length > 0) {
      const coreExpertiseValues = Array.isArray(editJobData.core_expertise) ? editJobData.core_expertise : [editJobData.core_expertise];
      setSelectedCoreExpertise(findOptionsByValues(coreExpertise, coreExpertiseValues));
    }

    // Handle selection process
    if (editJobData.selection_process) {
      const selectionProcessValues = Array.isArray(editJobData.selection_process) ? editJobData.selection_process : [editJobData.selection_process];
      setSelectedSelectionProcess(findOptionsByValues(multiSelectOptions.selection_process, selectionProcessValues));
    }

    // Handle job shifts
    if (editJobData.job_shifts) {
      const jobShiftValues = Array.isArray(editJobData.job_shifts) ? editJobData.job_shifts : [editJobData.job_shifts];
      setSelectedJobShifts(findOptionsByValues(multiSelectOptions.job_shifts, jobShiftValues));
    }

    // Handle job process
    if (editJobData.job_process) {
      const jobProcessValues = Array.isArray(editJobData.job_process) ? editJobData.job_process : [editJobData.job_process];
      setSelectedJobProcess(findOptionsByValues(multiSelectOptions.job_process, jobProcessValues));
    }

    // Handle job sub process
    if (editJobData.job_sub_process) {
      const jobSubCategoryValues = Array.isArray(editJobData.job_sub_process) ? editJobData.job_sub_process : [editJobData.job_sub_process];
      setSelectedJobSubCategory(findOptionsByValues(multiSelectOptions.job_sub_category, jobSubCategoryValues));
    }

    // Handle tution types
    if (editJobData.tution_types && editJobData.job_type === "tuitions") {
      const tutionTypeValues = Array.isArray(editJobData.tution_types) ? editJobData.tution_types : [editJobData.tution_types];
      setSelectedTutionTypes(findOptionsByValues(multiSelectOptions.tution_types, tutionTypeValues));
    }
  }, [editJobData, qualifications, coreExpertise, subjectsList, designations, designatedGrades, curriculum, languagesSpeak, languagesRead, languagesWrite]);

  const [jobCategory, setJobCategory] = useState("full_time");
  const [selectedJobCategory, setSelectedJobCategory] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [noOfOpening, setNoOfOpening] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [selectedCoreSubjects, setSelectedCoreSubjects] = useState([]);
  const [selectedOptionalSubject, setSelectedOptionalSubject] = useState([]);
  const [optionalSubject, setOptionalSubject] = useState("");
  const [knowledgeOfAccProcess, setKnowledgeOfAccProcess] = useState("No");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [jobSearchStatus, setJobSearchStatus] = useState("");
  const [gender, setGender] = useState("");
  const [minimumAge, setMinimumAge] = useState("");
  const [maximumAge, setMaximumAge] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mainCountry, setMainCountry] = useState(null);
  const [mainState, setMainState] = useState(null);
  const [mainCity, setMainCity] = useState(null);
  const [totalExpMinYears, setTotalExpMinYears] = useState(null);
  const [totalExpMinMonths, setTotalExpMinMonths] = useState(null);
  const [totalExpMaxYears, setTotalExpMaxYears] = useState(null);
  const [totalExpMaxMonths, setTotalExpMaxMonths] = useState(null);
  const [teachingExpMinYears, setTeachingExpMinYears] = useState(null);
  const [teachingExpMinMonths, setTeachingExpMinMonths] = useState(null);
  const [teachingExpMaxYears, setTeachingExpMaxYears] = useState(null);
  const [teachingExpMaxMonths, setTeachingExpMaxMonths] = useState(null);
  const [nonTeachingExpMinYears, setNonTeachingExpMinYears] = useState(null);
  const [nonTeachingExpMinMonths, setNonTeachingExpMinMonths] = useState(null);
  const [nonTeachingExpMaxYears, setNonTeachingExpMaxYears] = useState(null);
  const [nonTeachingExpMaxMonths, setNonTeachingExpMaxMonths] = useState(null);
  const [selectedDesignations, setSelectedDesignations] = useState([]);
  const [selectedDesignatedGrades, setSelectedDesignatedGrades] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedCoreExpertise, setSelectedCoreExpertise] = useState([]);
  const [selectedJobShifts, setSelectedJobShifts] = useState([]);
  const [selectedJobProcess, setSelectedJobProcess] = useState([]);
  const [selectedJobSubCategory, setSelectedJobSubCategory] = useState([]);
  const [selectedSelectionProcess, setSelectedSelectionProcess] = useState([]);
  const [selectedTutionTypes, setSelectedTutionTypes] = useState([]);
  const [selectedLanguageSpeak, setSelectedLanguageSpeak] = useState([]);
  const [selectedLanguageRead, setSelectedLanguageRead] = useState([]);
  const [selectedLanguageWrite, setSelectedLanguageWrite] = useState([]);
  const [selectedComputerSkills, setSelectedComputerSkills] = useState([]);

  // Validation error states for experience fields
  const [totalExpError, setTotalExpError] = useState("");
  const [teachingExpError, setTeachingExpError] = useState("");
  const [nonTeachingExpError, setNonTeachingExpError] = useState("");

  // Helper function to get error styles for Select components
  const getSelectErrorStyles = (hasError) => {
    if (!hasError) return selectMenuPortalStyles;
    return {
      ...selectMenuPortalStyles,
      control: (base, state) => ({
        ...base,
        borderColor: '#EF4444',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : '0 0 0 1px #EF4444',
        '&:hover': { borderColor: '#EF4444' }
      })
    };
  };

  // Helper function to compare experience values (years and months)
  const compareExperience = (minYears, minMonths, maxYears, maxMonths) => {
    // Extract numeric values from react-select objects
    // Values are stored as strings like "3 years" or "1 year"
    // Use parseExperienceValue which handles string extraction
    const minYearsVal = parseExperienceValue(minYears?.value) ?? 0;
    const minMonthsVal = parseExperienceValue(minMonths?.value) ?? 0;
    const maxYearsVal = parseExperienceValue(maxYears?.value) ?? 0;
    const maxMonthsVal = parseExperienceValue(maxMonths?.value) ?? 0;
    
    // Calculate total months for comparison
    const minTotal = minYearsVal * 12 + minMonthsVal;
    const maxTotal = maxYearsVal * 12 + maxMonthsVal;
    
    // Return true if max >= min (greater than or equal to)
    // Allow equal values (e.g., 3 years = 3 years is valid)
    return maxTotal >= minTotal;
  };

  // Real-time validation for Total Experience
  useEffect(() => {
    // Only validate if maximum is provided
    if (totalExpMaxYears || totalExpMaxMonths) {
      const isValid = compareExperience(totalExpMinYears, totalExpMinMonths, totalExpMaxYears, totalExpMaxMonths);
      // Force update error state - clear if valid, show if invalid
      if (isValid) {
        setTotalExpError("");
      } else {
        setTotalExpError("Maximum must be greater than or equal to Minimum");
      }
    } else {
      // Clear error if maximum is cleared
      setTotalExpError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalExpMinYears, totalExpMinMonths, totalExpMaxYears, totalExpMaxMonths]);

  // Real-time validation for Teaching Experience
  useEffect(() => {
    // Only validate if maximum is provided
    if (teachingExpMaxYears || teachingExpMaxMonths) {
      const isValid = compareExperience(teachingExpMinYears, teachingExpMinMonths, teachingExpMaxYears, teachingExpMaxMonths);
      // Force update error state - clear if valid, show if invalid
      if (isValid) {
        setTeachingExpError("");
      } else {
        setTeachingExpError("Maximum must be greater than or equal to Minimum");
      }
    } else {
      // Clear error if maximum is cleared
      setTeachingExpError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachingExpMinYears, teachingExpMinMonths, teachingExpMaxYears, teachingExpMaxMonths]);

  // Real-time validation for Non-Teaching Experience
  useEffect(() => {
    // Only validate if maximum is provided
    if (nonTeachingExpMaxYears || nonTeachingExpMaxMonths) {
      const isValid = compareExperience(nonTeachingExpMinYears, nonTeachingExpMinMonths, nonTeachingExpMaxYears, nonTeachingExpMaxMonths);
      // Force update error state - clear if valid, show if invalid
      if (isValid) {
        setNonTeachingExpError("");
      } else {
        setNonTeachingExpError("Maximum must be greater than or equal to Minimum");
      }
    } else {
      // Clear error if maximum is cleared
      setNonTeachingExpError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonTeachingExpMinYears, nonTeachingExpMinMonths, nonTeachingExpMaxYears, nonTeachingExpMaxMonths]);

  useEffect(() => {
    if (!editJobData) {
      const loadIndiaOption = async () => {
        try {
          const india = await findIndiaOption();
          if (india && !mainCountry) {
            setMainCountry(india);
          }
        } catch (error) {
          console.error('Error loading India option:', error);
        }
      };
      loadIndiaOption();
    }
  }, [editJobData, mainCountry]);

  // Load countries on mount
  useEffect(() => {
    mapAllCountries().then((countries) => {
      setAllCountries(countries);
    });
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (mainCountry?.value) {
      mapStatesOfCountry(mainCountry.value).then((states) => {
        setAllStates(states);
      });
    } else {
      setAllStates([]);
    }
  }, [mainCountry]);

  // Load cities when state changes
  useEffect(() => {
    if (mainCountry?.value && mainState?.value) {
      mapCitiesOfState(mainCountry.value, mainState.value).then((cities) => {
        setAllCities(cities);
      });
    } else {
      setAllCities([]);
    }
  }, [mainCountry, mainState]);

  const handleMainCountryChange = (option) => {
    setMainCountry(option);
    setMainState(null);
    setMainCity(null);
  };

  const handleMainStateChange = (option) => {
    setMainState(option);
    setMainCity(null);
  };

  const handleJobCategoryChange = (value) => {
    setSelectedJobCategory(value);
    setJobCategory(value);
  };

  const sendWhatsAppVerification = async (formData) => {
    try {
      // Get user phone number from login API
      let userPhone = "";
      let userName = "";
      try {
        const loginRes = await axios.get("https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login");
        if (Array.isArray(loginRes.data)) {
          const foundUser = loginRes.data.find((u) => u.firebase_uid === formData.firebase_uid);
          if (foundUser) {
            userName = foundUser.name || "User";
            if (foundUser.phone_number) {
              userPhone = foundUser.phone_number.toString();
              if (!userPhone.startsWith("+91")) {
                userPhone = "+91" + userPhone.replace(/^(\+)?91?/, "").replace(/\D/g, "");
              }
            }
          }
        }
      } catch (e) {
        console.error("Error fetching user data:", e);
      }

      if (!userPhone) {
        console.log("No phone number found for user");
        return;
      }

      // Prepare job verification data
      const qualificationText = formData.qualification && formData.qualification.length > 0 
        ? formData.qualification.join(", ") 
        : "Not specified";
      
      const salaryText = formData.min_salary ? `₹${formData.min_salary}` : "Not specified";
      
      const experienceText = formData.total_experience_min_years 
        ? `${formData.total_experience_min_years} years` 
        : "Not specified";

      const verificationPayload = {
        phone: userPhone,
        templateName: "job_verification",
        language: "en",
        bodyParams: [
          { type: "text", text: userName },
          { type: "text", text: formData.city || "Not specified" },
          { type: "text", text: formData.state_ut || "Not specified" },
          { type: "text", text: userPhone },
          { type: "text", text: formData.job_type?.replace('_', ' ') || "Not specified" },
          { type: "text", text: formData.job_title || "Not specified" },
          { type: "text", text: qualificationText },
          { type: "text", text: salaryText },
          { type: "text", text: experienceText }
        ],
        sent_by: userName,
        sent_email: user?.email || "noreply@teacherlink.in"
      };

      await axios.post(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp",
        verificationPayload,
        { headers: { "Content-Type": "application/json" } }
      );

      toast.success("WhatsApp verification message sent successfully!");
    } catch (error) {
      console.error("Error sending WhatsApp verification:", error);
      toast.error("Failed to send WhatsApp verification message.");
    }
  };

  const sendWhatsAppRecommendation = async (formData, jobId = null) => {
    try {
      const memoryKey = JSON.stringify({
        job_title: formData.job_title,
        created: jobId ? jobId : new Date().getTime(),
      });
      if (sentWhatsappForJob[memoryKey]) return;

      const fullApiRes = await axios.get(
        "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi"
      );
      const candidates = Array.isArray(fullApiRes.data) ? fullApiRes.data : [];
      const jobInput = {
        present_state_name: formData.state_ut?.toLowerCase() || "",
        present_city_name: formData.city?.toLowerCase() || "",
        total_experience_min_years: (formData.total_experience_min_years || "").toString(),
        qualification: (formData.qualification || []).map(
          (s) => s.toLowerCase && s.toLowerCase()
        ).filter(Boolean),
        core_subjects: (formData.core_subjects || []).map(
          (s) => s.toLowerCase && s.toLowerCase()
        ).filter(Boolean),
        notice_period: (formData.notice_period || "").toLowerCase(),
        expected_salary: (formData.min_salary || "").toString(),
        computer_skills: (formData.computer_skills || []).map(
          (s) => s.toLowerCase && s.toLowerCase()
        ).filter(Boolean),
      };
      let matchedCandidates = [];
      for (const candidate of candidates) {
        let priorityMatches = 0;
        let educationTypes = [];
        if (candidate.education_details_json) {
          try {
            const parsed =
              typeof candidate.education_details_json === "string"
                ? JSON.parse(candidate.education_details_json)
                : candidate.education_details_json;
            if (Array.isArray(parsed)) {
              parsed.forEach((e) => {
                if (e.education_type) educationTypes.push(e.education_type.toLowerCase());
              });
            }
          } catch (e) {}
        }
        let candidateCoreExpertise = [];
        if (candidate.teaching_coreExpertise) {
          if (Array.isArray(candidate.teaching_coreExpertise)) {
            candidateCoreExpertise = candidateCoreExpertise.concat(
              candidate.teaching_coreExpertise.map((s) => s.toLowerCase())
            );
          } else if (typeof candidate.teaching_coreExpertise === "string") {
            candidateCoreExpertise.push(candidate.teaching_coreExpertise.toLowerCase());
          }
        }
        if (candidate.teaching_administrative_coreExpertise) {
          if (Array.isArray(candidate.teaching_administrative_coreExpertise)) {
            candidateCoreExpertise = candidateCoreExpertise.concat(
              candidate.teaching_administrative_coreExpertise.map((s) => s.toLowerCase())
            );
          } else if (typeof candidate.teaching_administrative_coreExpertise === "string") {
            candidateCoreExpertise.push(candidate.teaching_administrative_coreExpertise.toLowerCase());
          }
        }
        if (candidate.present_state_name && jobInput.present_state_name &&
          candidate.present_state_name.toLowerCase() === jobInput.present_state_name) priorityMatches++;
        if (candidate.present_city_name && jobInput.present_city_name &&
          candidate.present_city_name.toLowerCase() === jobInput.present_city_name) priorityMatches++;
        if (
          (candidate.full_time_offline && candidate.full_time_offline.toString() === jobInput.total_experience_min_years) ||
          (candidate.teaching_experinence_years && candidate.teaching_experinence_years.toString() === jobInput.total_experience_min_years) ||
          (candidate.teaching_administrative_designation && candidate.teaching_administrative_designation.toString() === jobInput.total_experience_min_years)
        ) priorityMatches++;
        if (educationTypes.some(q => jobInput.qualification.includes(q))) priorityMatches++;
        if (candidateCoreExpertise.some(core => jobInput.core_subjects.includes(core))) priorityMatches++;
        if (candidate.expected_salary && jobInput.expected_salary &&
          candidate.expected_salary.toString() === jobInput.expected_salary) priorityMatches++;
        if (priorityMatches >= 3) {
          matchedCandidates.push(candidate);
        }
      }
      if (matchedCandidates.length === 0) return;
      let name1 = "User";
      try {
        const loginRes = await axios.get(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login"
        );
        if (Array.isArray(loginRes.data)) {
          const found = loginRes.data.find((u) => u.firebase_uid === formData.firebase_uid);
          if (found && found.name) name1 = found.name;
        }
      } catch (e) {}
      let name3 = "Organisation";
      try {
        const orgRes = await axios.get(
          "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation"
        );
        if (Array.isArray(orgRes.data)) {
          const found = orgRes.data.find((u) => u.firebase_uid === formData.firebase_uid);
          if (found && found.name) name3 = found.name;
        }
      } catch (e) {}
      let name2 = formData.job_title || "Job Title";
      let sentAny = false;
      for (const candidate of matchedCandidates) {
        let phone = "";
        if (candidate.whatsappNumber && candidate.whatsappNumber.toString().length >= 10) {
          phone = candidate.whatsappNumber.toString();
        } else if (candidate.callingNumber && candidate.callingNumber.toString().length >= 10) {
          phone = candidate.callingNumber.toString();
        }
        if (phone && !phone.startsWith("+91")) {
          phone = "+91" + phone.replace(/^(\+)?91?/, "").replace(/\D/g, "");
        }
        if (!phone.startsWith("+91")) continue;
        const whatsJson = {
          phone: phone,
          templateName: "job_recomand",
          language: "en",
          bodyParams: [
            { type: "text", text: name1 },
            { type: "text", text: name2 },
            { type: "text", text: name3 },
          ],
          sent_by: name1,
          sent_email: user?.email || "noreply@teacherlink.in",
        };
        try {
          await axios.post(
            "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp",
            whatsJson,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          sentAny = true;
        } catch (e) {
          toast.error("Failed to send WhatsApp recommendation.");
        }
      }
      if (sentAny) {
        toast.success("WhatsApp job recommendations sent to matching candidates.");
        setSentWhatsappForJob((prev) => ({ ...prev, [memoryKey]: true }));
      }
    } catch (err) {
      toast.error("Something went wrong in job recommendation.");
    }
  };

  const getFormData = () => {
    return {
      job_type: jobCategory,
      job_title: jobTitle,
      no_of_opening: noOfOpening,
      job_description: jobDescription,
      joining_date: joiningDate,
      min_salary: minSalary,
      max_salary: maxSalary,
      qualification: selectedQualifications.map((opt) => opt.value),
      core_subjects: selectedCoreSubjects.map((opt) => opt.value),
      optional_subject: selectedOptionalSubject.map((opt) => opt.value),
      knowledge_of_acc_process: knowledgeOfAccProcess,
      notice_period: noticePeriod,
      job_search_status: jobSearchStatus,
      gender,
      minimum_age: minimumAge,
      maximum_age: maximumAge,
      wfo_verification: false,
      verification_sent: 0,
      location: `${mainCountry?.label || ""}, ${mainState?.label || ""}, ${mainCity?.label || ""}`.replace(/^, |, $/g, ""),
      address,
      latitude,
      longitude,
      total_experience_min_years: totalExpMinYears?.value || "",
      total_experience_min_months: totalExpMinMonths?.value || "",
      total_experience_max_years: totalExpMaxYears?.value || "",
      total_experience_max_months: totalExpMaxMonths?.value || "",
      teaching_experience_min_years: teachingExpMinYears?.value || "",
      teaching_experience_min_months: teachingExpMinMonths?.value || "",
      teaching_experience_max_years: teachingExpMaxYears?.value || "",
      teaching_experience_max_months: teachingExpMaxMonths?.value || "",
      non_teaching_experience_min_years: nonTeachingExpMinYears?.value || "",
      non_teaching_experience_min_months: nonTeachingExpMinMonths?.value || "",
      non_teaching_experience_max_years: nonTeachingExpMaxYears?.value || "",
      non_teaching_experience_max_months: nonTeachingExpMaxMonths?.value || "",
      designations: selectedDesignations.map((opt) => opt.value),
      designated_grades: selectedDesignatedGrades.map((opt) => opt.value),
      curriculum: selectedCurriculum.map((opt) => opt.value),
      subjects: selectedSubjects.map((opt) => opt.value),
      core_expertise: selectedCoreExpertise.map((opt) => opt.value),
      job_shifts: selectedJobShifts.map((opt) => opt.value),
      job_process: selectedJobProcess.map((opt) => opt.value),
      job_sub_process: selectedJobSubCategory.map((opt) => opt.value),
      selection_process: selectedSelectionProcess.map((opt) => opt.value),
      tution_types: jobCategory === "tuitions" ? selectedTutionTypes.map((opt) => opt.value) : [],
      language_speak: selectedLanguageSpeak.map((opt) => opt.value),
      language_read: selectedLanguageRead.map((opt) => opt.value),
      language_write: selectedLanguageWrite.map((opt) => opt.value),
      computer_skills: selectedComputerSkills.map((opt) => opt.value),
      country: mainCountry?.label || "",
      state_ut: mainState?.label || "",
      city: mainCity?.label || "",
      firebase_uid: user.uid,
    };
  };

  // Check if user exists in organization API
  const checkUserProfile = async () => {
    try {
      const response = await axios.get("https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation");
      const organisations = Array.isArray(response.data) ? response.data : [];
      const userExists = organisations.some(org => org.firebase_uid === user.uid);
      return userExists;
    } catch (error) {
      console.error("Error checking user profile:", error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Please log in to save a job.");
      return;
    }
    setIsSaving(true);

    try {
      const formData = getFormData();
      // Add status field to indicate this is a saved job
      formData.status = 'saved';
      formData.saved_date = new Date().toISOString();
      const payload = [formData];
      
      console.log("=== SAVE JOB DEBUG ===");
      console.log("User UID:", user.uid);
      console.log("Form Data being saved:", formData);
      console.log("Payload being sent:", payload);
      console.log("=== END SAVE DEBUG ===");
      
      await axios.post(
        "https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobClose",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      toast.success("Job saved successfully!");
      setIsSaving(false);
      if (editJobData && onClearEditData) onClearEditData();
      if (editJobData && onEditSuccess) setTimeout(onEditSuccess, 800);
    } catch (error) {
      console.error("Save job error:", error);
      setIsSaving(false);
      toast.error("Failed to save the job. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    if (!e.target.checkValidity()) return;
    e.preventDefault();
    if (!user?.uid) {
      toast.error("Please log in to post a job.");
      return;
    }

    // Validate experience ranges
    let validationError = null;
    
    // Check Total Experience
    if (totalExpMaxYears || totalExpMaxMonths) {
      if (!compareExperience(totalExpMinYears, totalExpMinMonths, totalExpMaxYears, totalExpMaxMonths)) {
        validationError = "Maximum Total Experience must be greater than or equal to Minimum Total Experience.";
      }
    }
    
    // Check Teaching Experience
    if (teachingExpMaxYears || teachingExpMaxMonths) {
      if (!compareExperience(teachingExpMinYears, teachingExpMinMonths, teachingExpMaxYears, teachingExpMaxMonths)) {
        validationError = validationError || "Maximum Teaching Experience must be greater than or equal to Minimum Teaching Experience.";
      }
    }
    
    // Check Non-Teaching Experience
    if (nonTeachingExpMaxYears || nonTeachingExpMaxMonths) {
      if (!compareExperience(nonTeachingExpMinYears, nonTeachingExpMinMonths, nonTeachingExpMaxYears, nonTeachingExpMaxMonths)) {
        validationError = validationError || "Maximum Non-Teaching Experience must be greater than or equal to Minimum Non-Teaching Experience.";
      }
    }
    
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check if user profile exists in organisation API
    const profileExists = await checkUserProfile();
    if (!profileExists) {
      setShowProfileModal(true);
      return;
    }

    // Show preview modal instead of directly posting
    const formData = getFormData();
    setPreviewData(formData);
    setShowReviewModal(true);
  };

  const handleConfirmPost = async () => {
    if (!previewData) return;

    setIsPosting(true);

    try {
      // Add admin approval fields to the job data
      // Explicitly remove any existing isRejected from previewData to ensure clean state
      const { isRejected: _, isApproved: __, ...cleanPreviewData } = previewData;
      
      const jobDataWithApproval = {
        ...cleanPreviewData,
        // Admin approval fields - set to 0 for pending approval
        isApproved: 0,
        isRejected: 0,  // Explicitly set to 0 - should be pending, not rejected
        response: 0,
        approved_by: "",
        approved_email: "",
        job_updated: 0,
        isBlocked: 0
      };
      
      const payload = [jobDataWithApproval];
      
      // Debug: Log what we're sending to verify isRejected is 0
      console.log("=== JOB POST DEBUG ===");
      console.log("isRejected value being sent:", jobDataWithApproval.isRejected);
      console.log("Full payload:", JSON.stringify(payload, null, 2));
      console.log("=== END DEBUG ===");
      
      const postJobRes = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      
      // Debug: Check what was returned from the API
      console.log("=== API RESPONSE DEBUG ===");
      console.log("API Response:", postJobRes.data);
      console.log("=== END RESPONSE DEBUG ===");
      
      let recentJobId = null;
      try {
        const jobsRes = await axios.get(
          `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes?firebase_uid=${user.uid}`
        );
        const jobList = Array.isArray(jobsRes.data) ? jobsRes.data : [];
        jobList.sort((a, b) => Number(b.id) - Number(a.id));
        recentJobId = jobList[0]?.id || null;
      } catch (e) {}

      // const mapPayload = {
      //   firebase_uid: user.uid,
      //   location: address,
      //   latitude: parseFloat(latitude),
      //   langitude: parseFloat(longitude),
      // };
      // await axios.post(
      //   "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/postmap",
      //   mapPayload,
      //   { headers: { "Content-Type": "application/json" } }
      // );

      // PROFILE_APPROVED logic for job posting
      let exists = false;
      let existingRow = null;
      try {
        const checkRes = await axios.get(`https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved?firebase_uid=${user.uid}`);
        if (Array.isArray(checkRes.data) && checkRes.data.length > 0) {
          existingRow = checkRes.data.find(obj => obj.firebase_uid === user.uid);
        } else if (typeof checkRes.data === "object" && checkRes.data !== null && checkRes.data.firebase_uid === user.uid) {
          existingRow = checkRes.data;
        }
        if (existingRow) exists = true;
      } catch (err) {}

      if (exists) {
        await axios.put("https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved", {
          firebase_uid: user.uid,
          isApproved: 0,
          isRejected: 0,
          response: 0,
          profile_updated: 1,
          approved_by: "",
          approved_email: "",
          education_updated: "",
          additionalDetails_updated: "",
          profile_image_updated: "",
          job_updated: 1  // Mark that job was updated
        });
      } else {
        await axios.post("https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved", {
          firebase_uid: user.uid,
          isApproved: 0,
          isRejected: 0,
          response: 0,
          profile_updated: 0,
          approved_by: "",
          approved_email: "",
          education_updated: "",
          additionalDetails_updated: "",
          profile_image_updated: "",
          job_updated: 1  // Mark that job was created
        });
      }

      const successMessage = editJobData
        ? "Job updated and posted successfully!"
        : "Job posted successfully!";
      toast.info("Thank you for posting the job. Your job is now under review by Admin! You will be notified soon");
      
      // Send WhatsApp verification if checkbox was checked
      if (jobDataWithApproval.verification_sent === 1) {
        await sendWhatsAppVerification(jobDataWithApproval);
      }
      
      await sendWhatsAppRecommendation(jobDataWithApproval, recentJobId);
      toast.success(successMessage);

      setIsPosting(false);
      setShowReviewModal(false);
      setPreviewData(null);
      if (editJobData && onClearEditData) onClearEditData();
      if (editJobData && onEditSuccess) setTimeout(onEditSuccess, 800);
    } catch (error) {
      setIsPosting(false);
      toast.error("Failed to post the job. Please try again.");
    }
  };

  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: '#F0D8D9' }}>
      <ProfileRequiredModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <JobReviewModal 
        isOpen={showReviewModal} 
        onClose={() => setShowReviewModal(false)} 
        onConfirm={handleConfirmPost}
        previewData={previewData}
        isPosting={isPosting}
      />
      
      {/* Single large card with all fields */}
      <div className="rounded-lg shadow-lg p-8 max-w-7xl mx-auto my-8">
        <form onSubmit={handleSubmit}>
          {/* Job Details Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent mb-6">Job Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Category */}
              <InputWithTooltip label="Job Category" required>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={selectedJobCategory}
                  onChange={(e) => handleJobCategoryChange(e.target.value)}
                  required
                >
                  <option value="" disabled>Job Category</option>
                  {jobCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </InputWithTooltip>

              {/* Job Title */}
              <InputWithTooltip label="Job Title" required>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Enter Job title"
                  required
                />
              </InputWithTooltip>

              {/* Tuition Types (only for tuitions category) */}
              {jobCategory === "tuitions" && (
                <InputWithTooltip label="Tution Types" required>
                  <Select
                    isMulti
                    options={multiSelectOptions.tution_types}
                    value={selectedTutionTypes}
                    onChange={setSelectedTutionTypes}
                    menuPortalTarget={document.body}
                    styles={selectMenuPortalStyles}
                    placeholder="Tution Types"
                    required
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </InputWithTooltip>
              )}

              {/* Qualification Multi-Select */}
              <InputWithTooltip label="Qualification(s)" required>
                <Select
                  isMulti
                  options={[...qualifications, ...others]}
                  value={selectedQualifications}
                  onChange={setSelectedQualifications}
                  placeholder="Qualification(s)"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                />
              </InputWithTooltip>

              {/* Core Subjects Multi-Select */}
              <InputWithTooltip label="Core Subject(s)" required>
                <Select
                  isMulti
                  options={subjectsList}
                  value={selectedCoreSubjects}
                  onChange={setSelectedCoreSubjects}
                  placeholder="Core Subject(s)"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                />
              </InputWithTooltip>

              {/* Optional Subject Multi-Select */}
              <InputWithTooltip label="Optional Subject(s)">
                <Select
                  isMulti
                  options={subjectsList}
                  value={selectedOptionalSubject}
                  onChange={setSelectedOptionalSubject}
                  placeholder="Optional Subject(s)"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Number of Openings */}
              <InputWithTooltip label="Number of Openings">
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={noOfOpening}
                  onChange={(e) => setNoOfOpening(e.target.value)}
                  placeholder="Enter number of openings"
                />
              </InputWithTooltip>

              {/* Job Description */}
              <div className="md:col-span-2">
                <InputWithTooltip label="Job Description">
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Enter job description"
                  />
                </InputWithTooltip>
              </div>

              {/* Joining Date */}
              <InputWithTooltip label="Joining Date">
                <div>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={joiningDate}
                    placeholder="Joining Date"
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.type = "text";
                      }
                    }}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500">Today to 6 months from now</p>
                </div>
              </InputWithTooltip>

              {/* Selection Process */}
              <InputWithTooltip label="Selection Process">
                <Select
                  isMulti
                  options={multiSelectOptions.selection_process}
                  value={selectedSelectionProcess}
                  onChange={setSelectedSelectionProcess}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Selection Process"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Minimum Salary */}
              <InputWithTooltip label="Minimum Salary (₹)" required>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="Minimum Salary (₹)"
                  min="1"
                  step="1"
                  required
                />
              </InputWithTooltip>

              {/* Maximum Salary */}
              <InputWithTooltip label="Maximum Salary (₹)">
                <div>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={maxSalary}
                    onChange={(e) => setMaxSalary(e.target.value)}
                    placeholder="Maximum Salary (₹)"
                    min={minSalary || "1"}
                    step="1"
                  />
                  <p className="text-xs text-gray-500">Should be ≥ Minimum Salary</p>
                </div>
              </InputWithTooltip>
            </div>
          </div>

          {/* Total Experience Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Total Experience</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Minimum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={totalExpMinYears}
                          onChange={setTotalExpMinYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                          required
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={totalExpMinMonths}
                          onChange={setTotalExpMinMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Maximum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={totalExpMaxYears}
                          onChange={setTotalExpMaxYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!totalExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={totalExpMaxMonths}
                          onChange={setTotalExpMaxMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!totalExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                    {totalExpError && (
                      <p className="text-red-500 text-sm mt-2">{totalExpError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Teaching Experience */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Teaching Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Minimum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={teachingExpMinYears}
                          onChange={setTeachingExpMinYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={teachingExpMinMonths}
                          onChange={setTeachingExpMinMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Maximum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={teachingExpMaxYears}
                          onChange={setTeachingExpMaxYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!teachingExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={teachingExpMaxMonths}
                          onChange={setTeachingExpMaxMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!teachingExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                    {teachingExpError && (
                      <p className="text-red-500 text-sm mt-2">{teachingExpError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Non-Teaching Experience */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Non-Teaching Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Minimum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={nonTeachingExpMinYears}
                          onChange={setNonTeachingExpMinYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={nonTeachingExpMinMonths}
                          onChange={setNonTeachingExpMinMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={selectMenuPortalStyles}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Maximum</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Select
                          options={yearOptions}
                          value={nonTeachingExpMaxYears}
                          onChange={setNonTeachingExpMaxYears}
                          placeholder="Years"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!nonTeachingExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                      <div>
                        <Select
                          options={monthOptions}
                          value={nonTeachingExpMaxMonths}
                          onChange={setNonTeachingExpMaxMonths}
                          placeholder="Months"
                          menuPortalTarget={document.body}
                          styles={getSelectErrorStyles(!!nonTeachingExpError)}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    </div>
                    {nonTeachingExpError && (
                      <p className="text-red-500 text-sm mt-2">{nonTeachingExpError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* Location Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Country */}
              <InputWithTooltip label="Country" required>
                <Select
                  options={allCountries}
                  value={mainCountry}
                  onChange={handleMainCountryChange}
                  placeholder="Country"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                />
              </InputWithTooltip>

              {/* State */}
              <InputWithTooltip label="State / UT" required>
                <Select
                  options={allStates}
                  value={mainState}
                  onChange={handleMainStateChange}
                  placeholder="State / UT"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                />
              </InputWithTooltip>

              {/* City */}
              <InputWithTooltip label="City">
                <Select
                  options={allCities}
                  value={mainCity}
                  onChange={(option) => setMainCity(option)}
                  placeholder="City"
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>
            </div>
          </div>
          {/* Qualifications & Skills Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Qualifications & Skills</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Designations */}
              <InputWithTooltip label="Designations">
                <Select
                  isMulti
                  options={[...designations, ...others]}
                  value={selectedDesignations}
                  onChange={setSelectedDesignations}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Designations"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Designated Grades */}
              <InputWithTooltip label="Designated Grades" required>
                <Select
                  isMulti
                  options={[...designatedGrades, ...others]}
                  value={selectedDesignatedGrades}
                  onChange={setSelectedDesignatedGrades}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Designated Grades"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                />
              </InputWithTooltip>

              {/* Curriculum */}
              <InputWithTooltip label="Curriculum">
                <Select
                  isMulti
                  options={[...curriculum, ...others]}
                  value={selectedCurriculum}
                  onChange={setSelectedCurriculum}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Curriculum"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Core Expertise */}
              <InputWithTooltip label="Core Expertise">
                <Select
                  isMulti
                  options={coreExpertise}
                  value={selectedCoreExpertise}
                  onChange={setSelectedCoreExpertise}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Core Expertise"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Job Shifts */}
              <InputWithTooltip label="Job Shifts">
                <Select
                  isMulti
                  options={multiSelectOptions.job_shifts}
                  value={selectedJobShifts}
                  onChange={setSelectedJobShifts}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Job Shifts"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Job Process */}
              <InputWithTooltip label="Job Process">
                <Select
                  isMulti
                  options={multiSelectOptions.job_process}
                  value={selectedJobProcess}
                  onChange={setSelectedJobProcess}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Job Process"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Job Sub Category (only for tuitions) */}
              {jobCategory === "tuitions" && (
                <InputWithTooltip label="Job Sub Category" required>
                  <Select
                    isMulti
                    options={multiSelectOptions.job_sub_category}
                    value={selectedJobSubCategory}
                    onChange={setSelectedJobSubCategory}
                    menuPortalTarget={document.body}
                    styles={selectMenuPortalStyles}
                    placeholder="Job Sub Category"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    required
                  />
                </InputWithTooltip>
              )}
            </div>
          </div>
          {/* Additional Preferences Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Additional Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender */}
              <InputWithTooltip label="Gender">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="" disabled>Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </InputWithTooltip>

              {/* Minimum Age */}
              <InputWithTooltip label="Minimum Age">
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={minimumAge}
                  onChange={(e) => setMinimumAge(e.target.value)}
                  placeholder="Enter minimum age"
                />
              </InputWithTooltip>

              {/* Maximum Age */}
              <InputWithTooltip label="Maximum Age">
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={maximumAge}
                  onChange={(e) => setMaximumAge(e.target.value)}
                  placeholder="Enter maximum age"
                />
              </InputWithTooltip>

              {/* Languages - Speak */}
              <InputWithTooltip label="Languages - Speak">
                <Select
                  isMulti
                  options={languagesSpeak}
                  value={selectedLanguageSpeak}
                  onChange={setSelectedLanguageSpeak}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Languages (Speak)"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Languages - Read */}
              <InputWithTooltip label="Languages - Read">
                <Select
                  isMulti
                  options={languagesRead}
                  value={selectedLanguageRead}
                  onChange={setSelectedLanguageRead}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Languages (Read)"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Languages - Write */}
              <InputWithTooltip label="Languages - Write">
                <Select
                  isMulti
                  options={languagesWrite}
                  value={selectedLanguageWrite}
                  onChange={setSelectedLanguageWrite}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Languages (Write)"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Computer Skills */}
              <InputWithTooltip label="Computer Skills">
                <Select
                  isMulti
                  options={multiSelectOptions.computer_skills}
                  value={selectedComputerSkills}
                  onChange={setSelectedComputerSkills}
                  menuPortalTarget={document.body}
                  styles={selectMenuPortalStyles}
                  placeholder="Computer Skills"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </InputWithTooltip>

              {/* Knowledge of Accounting Process */}
              <InputWithTooltip label="Knowledge of Accounting Process">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={knowledgeOfAccProcess}
                  onChange={(e) => setKnowledgeOfAccProcess(e.target.value)}
                >
                  <option value="" disabled>Knowledge of Accounting Process</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </InputWithTooltip>

              {/* Notice Period */}
              <InputWithTooltip label="Notice Period">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                >
                  <option value="" disabled>Notice Period</option>
                  <option value="<7">{'<'} 7 days</option>
                  <option value="<15">{'<'} 15 days</option>
                  <option value="<30">{'<'} 1 month</option>
                  <option value=">30">{'>'} 1 Month</option>
                </select>
              </InputWithTooltip>

              {/* Job Search Status */}
              <InputWithTooltip label="Job Search Status">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={jobSearchStatus}
                  onChange={(e) => setJobSearchStatus(e.target.value)}
                >
                  <option value="" disabled>Job Search Status</option>
                  <option value="active">Actively Searching Jobs</option>
                  <option value="casual">Casually Exploring Jobs</option>
                  <option value="not_looking">Not looking for Jobs</option>
                </select>
              </InputWithTooltip>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center flex-wrap gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              className="bg-gradient-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-gradient-primary-hover transition-colors disabled:opacity-50 shadow-md"
              onClick={handleSave}
              disabled={isSaving || isPosting}
            >
              {isSaving ? "💾 Saving..." : "💾 Save Job"}
            </button>
            <button
              type="submit"
              className="bg-gradient-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-gradient-primary-hover transition-colors disabled:opacity-50 shadow-md"
              disabled={isSaving || isPosting}
            >
              {isPosting ? "⏳ Posting..." : editJobData ? "✏️ Review & Update Job" : "📋 Review & Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobForm;