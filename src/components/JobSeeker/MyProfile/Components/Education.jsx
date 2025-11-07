import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import Select from "react-select";
// Tailwind migration: removed profile-styles.css import and MUI TextField
import axios from "axios";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PropTypes from "prop-types";
import { FaChevronDown } from "react-icons/fa";
import InputWithTooltip from "../../../../services/InputWithTooltip";

// Helper: Convert a value to an array if needed.
const parseArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim() !== "") return val.split(",").map(s => s.trim());
  return [];
};

const Education = forwardRef(({
  // Booleans to control which fields render in each section
  isEasyMode,
  grade12syllabus,
  grade12courseStatus,
  grade12school,
  grade12year,
  grade12coreSubjects,
  grade12percentage,
  grade12mode,
  degreeCourseStatus,
  degreeName,
  degreeCollege,
  degreeYear,
  degreePlace,
  degreeUniversity,
  degreeCoreSubjects,
  degreePercentage,
  degreeMode,
  masterCourseStatus,
  masterName,
  masterCollege,
  masterYear,
  masterPlace,
  masterUniversity,
  masterPercentage,
  masterCoreSubjects,
  masterMode,
  doctorateCourseStatus,
  doctorateCollege,
  doctorateYear,
  doctorateUniversity,
  doctorateCoreSubjects,
  doctorateMode,
  bEdCourseStatus,
  bEdCollege,
  bEdYear,
  bEdPlace,
  bEdAffiliated,
  bEdCourseDuration,
  bEdPercentage,
  bEdCoreSubjects,
  bEdMode,
  certificateCourseStatus,
  certificateName,
  certificatePlace,
  certificateCourseDuration,
  certificateSpecialization,
  certificateMode,
  formData,
  setFormData,
  updateEducationData
}, ref) => {
  // Add a ref to track if the update is from parent or local
  const isLocalUpdate = useRef(false);
  
  // ---------- Grade 10 (Mandatory) ----------
  const [grade10Data, setGrade10Data] = useState({
    syllabus: "",
    schoolName: "",
    yearOfPassing: "",
    percentage: "",
    mode: ""
  });

  // For all other education entries (grade12, degree, etc.)
  const [additionalEducation, setAdditionalEducation] = useState([]);

  // State for dropdown options for core subjects
  const [coreSubjectsOptions, setCoreSubjectsOptions] = useState([]);

  // States for degree constants
  const [degrees, setDegrees] = useState([]);
  const [masterDegrees, setMasterDegrees] = useState([]);

  // Add state for syllabus options
  const [syllabusOptions, setSyllabusOptions] = useState([]);

  const { user } = useAuth();

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

  // Dropdown options
  const educationModeOptions = [
    { value: "regular", label: "Regular" },
    { value: "correspondence", label: "Correspondence" },
    { value: "evening", label: "Evening" }
  ];

  const courseStatusOptions = [
    { value: "Pursuing", label: "Pursuing" },
    { value: "Completed", label: "Completed" }
  ];

  const courseDurationOptions = [
    { value: "1", label: "1 month" },
    { value: "2", label: "2 months" },
    { value: "3", label: "3 months" },
    { value: "4", label: "4 months" },
    { value: "5", label: "5 months" },
    { value: "6", label: "6 months" },
    { value: "7", label: "7 months" },
    { value: "8", label: "8 months" },
    { value: "9", label: "9 months" },
    { value: "10", label: "10 months" }
  ];

  const bEdCourseDurationOptions = [
    { value: "1", label: "1 year" },
    { value: "2", label: "2 years" },
    { value: "3", label: "3 years" },
    { value: "4", label: "4 years" }
  ];

  const dEdCourseDurationOptions = [
    { value: "1", label: "1 year" },
    { value: "2", label: "2 years" }
  ];

  const certificateCourseDurationOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1} months`
  }));

  // Education types for "Add More Education"
  const educationTypes = [
    { value: "grade12", label: "Grade 12", allowMultiple: false },
    { value: "degree", label: "Degree", allowMultiple: true },
    { value: "masterDegree", label: "Master Degree", allowMultiple: true },
    { value: "doctorate", label: "Doctorate", allowMultiple: false },
    { value: "nttMtt", label: "NTT/MTT", allowMultiple: false },
    { value: "dEd", label: "D.Ed/D.EID", allowMultiple: false },
    { value: "bEd", label: "B.Ed", allowMultiple: false },
    { value: "certificate", label: "Certificate/Other Course", allowMultiple: true }
  ];

  const [isSaving, setIsSaving] = useState(false);

  // ------------------- GET: Fetch education details -------------------
  useEffect(() => {
    if (!user?.uid) return;
    
    // Only prevent API fetch if we have fresh parent data (indicating user made changes)
    if (formData?.education && (formData.education.grade10 || formData.education.additional)) return;
    
    const fetchEducationDetails = async () => {
      try {
        console.log("Fetching education data with UID:", user.uid);
        const response = await axios.get(
          "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails",
          { params: { firebase_uid: user.uid } }
        );
        console.log("Raw GET response:", response.data);
        if (response.status === 200 && Array.isArray(response.data)) {
          const items = response.data;
          const newAdditionalEducation = [];
          items.forEach((item) => {
            const eduType = (item.education_type || "").trim();
            const coreSubjects = parseArray(item.coreSubjects);
            switch (eduType) {
              case "grade10":
                setGrade10Data({
                  syllabus: item.syllabus || "",
                  schoolName: item.schoolName || "",
                  yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                  percentage: item.percentage || "",
                  mode: item.mode || ""
                });
                break;
              case "grade12":
                newAdditionalEducation.push({
                  type: "grade12",
                  data: {
                    syllabus: item.syllabus || "",
                    schoolName: item.schoolName || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "degree":
                newAdditionalEducation.push({
                  type: "degree",
                  data: {
                    courseName: item.courseName || "",
                    collegeName: item.collegeName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    universityName: item.universityName || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "masterDegree":
                newAdditionalEducation.push({
                  type: "masterDegree",
                  data: {
                    courseName: item.courseName || "",
                    collegeName: item.collegeName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    universityName: item.universityName || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "doctorate":
                newAdditionalEducation.push({
                  type: "doctorate",
                  data: {
                    placeOfStudy: item.placeOfStudy || "",
                    universityName: item.universityName || "",
                    yearOfCompletion: item.yearOfCompletion ? item.yearOfCompletion.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "bEd":
                newAdditionalEducation.push({
                  type: "bEd",
                  data: {
                    instituteName: item.instituteName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    affiliatedTo: item.affiliatedTo || "",
                    courseDuration: item.courseDuration || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "dEd":
                newAdditionalEducation.push({
                  type: "dEd",
                  data: {
                    instituteName: item.instituteName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    affiliatedTo: item.affiliatedTo || "",
                    courseDuration: item.courseDuration || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    coreSubjects: coreSubjects,
                    otherSubjects: item.otherSubjects || "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "nttMtt":
                newAdditionalEducation.push({
                  type: "nttMtt",
                  data: {
                    instituteName: item.instituteName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    affiliatedTo: item.affiliatedTo || "",
                    courseDuration: item.courseDuration || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    percentage: item.percentage || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              case "certificate":
                newAdditionalEducation.push({
                  type: "certificate",
                  data: {
                    courseName: item.courseName || "",
                    placeOfStudy: item.placeOfStudy || "",
                    courseDuration: item.courseDuration || "",
                    yearOfPassing: item.yearOfPassing ? item.yearOfPassing.toString() : "",
                    specialization: item.specialization || "",
                    mode: item.mode || "",
                    courseStatus: item.courseStatus || ""
                  }
                });
                break;
              default:
                break;
            }
          });
          setAdditionalEducation(newAdditionalEducation);
          console.log("Final additionalEducation:", newAdditionalEducation);
        }
      } catch (error) {
        console.error("Error fetching education details:", error);
      }
    };
    fetchEducationDetails();
  }, [user?.uid, formData?.education]);

  // ------------------- Handler for Grade 10 changes -------------------
  const handleGrade10Change = (field, value) => {
    let validatedValue = value;
    if (field === "schoolName") {
      validatedValue = value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 20);
    } else if (field === "percentage") {
      validatedValue = value.replace(/[^a-zA-Z0-9+%]/g, "").slice(0, 5);
    } else if (field === "yearOfPassing") {
      const maxYear = new Date().getFullYear();
      if (Number(value) > maxYear) return;
    }
    setGrade10Data((prev) => ({ ...prev, [field]: validatedValue }));
  };

  // ------------------- Default data for each education type -------------------
  const getInitialDataForType = (type) => {
    switch (type) {
      case "grade12":
        return {
          syllabus: "",
          schoolName: "",
          yearOfPassing: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "degree":
        return {
          courseName: "",
          collegeName: "",
          placeOfStudy: "",
          universityName: "",
          yearOfPassing: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "masterDegree":
        return {
          courseName: "",
          collegeName: "",
          placeOfStudy: "",
          universityName: "",
          yearOfPassing: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "doctorate":
        return {
          placeOfStudy: "",
          universityName: "",
          yearOfCompletion: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "nttMtt":
        return {
          instituteName: "",
          placeOfStudy: "",
          affiliatedTo: "",
          courseDuration: "",
          yearOfPassing: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "dEd":
        return {
          instituteName: "",
          placeOfStudy: "",
          affiliatedTo: "",
          courseDuration: "",
          yearOfPassing: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "bEd":
        return {
          instituteName: "",
          placeOfStudy: "",
          affiliatedTo: "",
          courseDuration: "",
          yearOfPassing: "",
          coreSubjects: [],
          otherSubjects: "",
          percentage: "",
          mode: "",
          courseStatus: ""
        };
      case "certificate":
        return {
          courseName: "",
          placeOfStudy: "",
          courseDuration: "",
          yearOfPassing: "",
          specialization: "",
          mode: "",
          courseStatus: ""
        };
      default:
        return {};
    }
  };

  // ------------------- Handler to update data for a specific education section -------------------
  const handleEducationDataChange = (index, field, value) => {
    setAdditionalEducation((prev) => {
      const updated = [...prev];
      if (!updated[index].data) {
        updated[index].data = {};
      }
      updated[index].data[field] = value;
      return updated;
    });
  };

  // ------------------- Handler to remove an education section -------------------
  const handleRemoveEducation = (index) => {
    const updatedAdditionalEducation = additionalEducation.filter((_, i) => i !== index);
    setAdditionalEducation(updatedAdditionalEducation);
    
    // Use dedicated education update function if available, otherwise fallback to setFormData
    const newEducationData = {
      grade10: grade10Data,
      additional: updatedAdditionalEducation
    };
    
    if (updateEducationData) {
      updateEducationData(newEducationData);
    } else if (setFormData) {
      setFormData(prev => ({
        ...prev,
        education: newEducationData
      }));
    }
  };

  // ------------------- Fetch subjects (for core subjects) -------------------
  const fetchSubjects = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
      console.log("Education subjects API response:", response.data);
      
      // Handle different response formats
      let dataArray = [];
      if (Array.isArray(response.data)) {
        dataArray = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else if (response.data?.subjects && Array.isArray(response.data.subjects)) {
        dataArray = response.data.subjects;
      }
      
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        console.warn("No education subjects data found in response:", response.data);
        return;
      }
      
      const formattedSubjects = dataArray.map((subject) => ({
        value: subject.value || subject.subject,
        label: subject.label || subject.name || subject.subject
      }));
      setCoreSubjectsOptions(formattedSubjects);
      console.log("Formatted subjects:", formattedSubjects);
    } catch (error) {
      console.error("Error fetching education subjects:", error);
      toast.error("Failed to load education subjects. Please refresh the page.");
    }
  };
  useEffect(() => {
    fetchSubjects();
  }, []);

  // ------------------- Fetch degree constants for degree and masterDegree sections -------------------
  useEffect(() => {
    const fetchDegrees = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_DEV1_API + "/constants");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Constants API response:", data);
        
        // Handle different response formats
        let dataArray = [];
        if (Array.isArray(data)) {
          dataArray = data;
        } else if (data?.data && Array.isArray(data.data)) {
          dataArray = data.data;
        } else if (data?.constants && Array.isArray(data.constants)) {
          dataArray = data.constants;
        }
        
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
          console.warn("No constants data found in response:", data);
          toast.warn("No dropdown options available. Please check if the API is working.");
          return;
        }
        
        const transformedData = dataArray.map((item) => ({
          category: item.category || item.type,
          value: item.value || item.id,
          label: item.label || item.name || item.value
        }));
        
        const degreesList = transformedData.filter((item) => 
          item.category === "Degrees" || item.category === "Degree"
        ) || [];
        const masterDegreesList = transformedData.filter((item) => 
          item.category === "MasterDegree" || item.category === "Master Degree"
        ) || [];
        const syllabusList = transformedData.filter((item) => 
          item.category === "Curriculum" || item.category === "Syllabus"
        ) || [];
        
        setDegrees(degreesList);
        setMasterDegrees(masterDegreesList);
        setSyllabusOptions(syllabusList);
        
        //console.log("Degrees:", degreesList);
        //console.log("Master Degrees:", masterDegreesList);
        //console.log("Syllabus Options:", syllabusList);
        
        if (degreesList.length === 0 && masterDegreesList.length === 0 && syllabusList.length === 0) {
          console.warn("No matching categories found. Available categories:", 
            [...new Set(transformedData.map(item => item.category))]
          );
        }
      } catch (error) {
        console.error("Error fetching degree constants:", error);
        toast.error("Failed to load dropdown options. Please refresh the page.");
      }
    };
    fetchDegrees();
  }, []);

  // Helper function to get minimum year based on previous education level
  const getMinimumYearForLevel = (educationType, currentIndex = null) => {
    const baseYear = 1960;

    // Grade 10 has no minimum (base level)
    if (educationType === "grade10") {
      return baseYear;
    }

    // Grade 12 minimum = (Grade 10 year + 2) if Grade 10 exists
    if (educationType === "grade12") {
      const grade10Year = parseInt(grade10Data.yearOfPassing, 10);
      if (!Number.isNaN(grade10Year)) {
        return grade10Year + 2;
      }
      return baseYear;
    }

    // For other levels, find the maximum year from all previous levels
    let maxPreviousYear = null;

    const updateMaxYear = (rawYear) => {
      const parsedYear = parseInt(rawYear, 10);
      if (!Number.isNaN(parsedYear)) {
        maxPreviousYear = maxPreviousYear === null ? parsedYear : Math.max(maxPreviousYear, parsedYear);
      }
    };

    // Always check Grade 10 first
    updateMaxYear(grade10Data.yearOfPassing);

    // Check all additional education entries (including Grade 12)
    additionalEducation.forEach((entry, idx) => {
      // Skip current entry if checking for same type
      if (currentIndex !== null && idx >= currentIndex) return;

      // Skip if entry type doesn't exist or data doesn't exist
      if (!entry.type || !entry.data) return;

      // Get year from either yearOfPassing or yearOfCompletion (doctorate uses yearOfCompletion)
      const entryYearStr = entry.data.yearOfPassing || entry.data.yearOfCompletion || "";
      const entryYear = parseInt(entryYearStr, 10);

      if (entryYearStr && !Number.isNaN(entryYear)) {
        // Determine hierarchy: grade12 < degree < masterDegree < doctorate
        const currentLevel = getEducationLevelOrder(educationType);
        const entryLevel = getEducationLevelOrder(entry.type);

        // Only consider entries that come BEFORE this level in hierarchy
        // Use <= for same-level entries that come before in the array (e.g., multiple grade12 entries)
        if (entryLevel < currentLevel || (entryLevel === currentLevel && idx < currentIndex)) {
          updateMaxYear(entryYear);
        }
      }
    });

    if (maxPreviousYear !== null) {
      return maxPreviousYear + 1;
    }

    return baseYear;
  };

  // Helper to get numeric order for education levels (lower = earlier in sequence)
  const getEducationLevelOrder = (type) => {
    const order = {
      "grade10": 1,
      "grade12": 2,
      "degree": 3,
      "bEd": 4,
      "masterDegree": 5,
      "doctorate": 6,
      "certificate": 3, // Certificates typically come after Grade 12, so treat as degree level
      "dEd": 2, // D.Ed comes after Grade 10/12
      "nttMtt": 2 // NTT/MTT comes after Grade 10/12
    };
    return order[type] || 99;
  };

  // For Grade 10, Degree, Master's, etc. where you need year selection
  const generateYearOptions = (minYear = null, educationType = null, currentIndex = null) => {
    const calculatedMinYear = educationType ? getMinimumYearForLevel(educationType, currentIndex) : 1960;
    const startYear = minYear !== null ? minYear : calculatedMinYear;
    const endYear = new Date().getFullYear() + 1; // Allow future years for "Pursuing" status
    
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(<option key={year} value={year}>{year}</option>);
    }
    return years;
  };

  // ------------------- Render education fields based on type -------------------
  const renderEducationFields = (type, data, index) => {
    switch (type) {
      case "grade12":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grade12courseStatus && (
            <div className="w-full relative">
              <InputWithTooltip label="Course Status" required>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  value={data.courseStatus || ""}
                  onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                  required
                >
                  <option value="" disabled>Course Status</option>
                  {courseStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </InputWithTooltip>
            </div>
            )}
            {grade12syllabus && (
              <div className="w-full relative">
                <InputWithTooltip label="Syllabus">
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.syllabus || ""}
                    onChange={(e) => handleEducationDataChange(index, "syllabus", e.target.value)}
                  >
                    <option value="" disabled>Syllabus</option>
                    {syllabusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
            )}
            {grade12school && (
              <div className="w-full">
                <InputWithTooltip label="School Name">
                  <input
                    type="text"
                    value={data.schoolName}
                    onChange={(e) => handleEducationDataChange(index, "schoolName", e.target.value)}
                    placeholder="School Name"
                    pattern="[a-zA-Z0-9 ]*"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
            )}
            {grade12year && (
            <div className="w-full relative">
              <InputWithTooltip label="Year of Passing" required={data.courseStatus !== "Pursuing"}>
                <select
                  value={data.yearOfPassing}
                  onChange={(e) => {
                    const selectedYear = parseInt(e.target.value);
                    const minYear = getMinimumYearForLevel("grade12", index);
                    if (selectedYear && selectedYear < minYear) {
                      toast.error(`Grade 12 passing year must be ${minYear} or later (after Grade 10)`);
                      return;
                    }
                    handleEducationDataChange(index, "yearOfPassing", e.target.value);
                  }}
                  required={data.courseStatus !== "Pursuing"}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>
                    {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                  </option>
                  {generateYearOptions(null, "grade12", index)}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </InputWithTooltip>
            </div>
            )}
            {grade12coreSubjects && (
            <div className="w-full">
              <InputWithTooltip label="Core Subjects" required>
                <Select
                  isMulti
                  value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                  onChange={(selected) => {
                    const selectedValues = selected ? selected.map(option => option.value) : [];
                    handleEducationDataChange(index, "coreSubjects", selectedValues);
                  }}
                  options={coreSubjectsOptions}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Core Subjects"
                  required
                  isClearable={false}
                  styles={reactSelectStyles}
                />
              </InputWithTooltip>
            </div>
            )}
            {data.coreSubjects.includes("Others") && (
              <div className="w-full">
                <InputWithTooltip label="Other Subjects" required>
                  <input
                    type="text"
                    value={data.otherSubjects}
                    onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                    placeholder="Specify other subjects"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
            )}
            {grade12percentage && (
              <div className="w-full">
                <InputWithTooltip label="Grade / Percentage" required={data.courseStatus !== "Pursuing"}>
                  <input
                    type="text"
                    value={data.percentage}
                    onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                    placeholder={data.courseStatus === "Pursuing" ? "Current Grade / CGPA (Optional)" : "Grade / Percentage"}
                    pattern="[a-zA-Z0-9+%]*"
                    maxLength={5}
                    minLength={data.courseStatus === "Pursuing" ? 0 : 2}
                    required={data.courseStatus !== "Pursuing"}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
            )}
            {grade12mode && (
              <div className="w-full relative">
                <InputWithTooltip label="Mode of Study" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.mode || ""}
                    onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                    required
                  >
                    <option value="" disabled>Mode of Study</option>
                    {educationModeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
            )}
          </div>
        );
      case "degree":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {degreeCourseStatus && (
              <div className="w-full relative">
                <InputWithTooltip label="Course Status" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseStatus || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                    required
                  >
                    <option value="" disabled>Course Status</option>
                    {courseStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {degreeName && (
              <div className="w-full relative">
                <InputWithTooltip label="Degree Name" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseName || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseName", e.target.value)}
                    required
                  >
                    <option value="" disabled>Degree Name</option>
                    {degrees.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {degreeCollege && (
                <div className="w-full">
                  <InputWithTooltip label="College Name">
                    <input
                      type="text"
                      value={data.collegeName}
                      onChange={(e) => handleEducationDataChange(index, "collegeName", e.target.value)}
                      placeholder="College Name"
                      pattern="[a-zA-Z0-9 ]*"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {degreePlace && (
                <div className="w-full">
                  <InputWithTooltip label="Place of Study">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {degreeUniversity && (
                <div className="w-full">
                  <InputWithTooltip label="University Name">
                    <input
                      type="text"
                      value={data.universityName}
                      onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                      placeholder="University Name"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {degreeYear && (
              <div className="w-full relative">
                <InputWithTooltip label="Year of Passing" required={data.courseStatus !== "Pursuing"}>
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => {
                      const selectedYear = parseInt(e.target.value);
                      const minYear = getMinimumYearForLevel("degree", index);
                      if (selectedYear && selectedYear < minYear) {
                        toast.error(`Degree passing year must be ${minYear} or later`);
                        return;
                      }
                      handleEducationDataChange(index, "yearOfPassing", e.target.value);
                    }}
                    required={data.courseStatus !== "Pursuing"}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>
                      {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                    </option>
                    {generateYearOptions(null, "degree", index)}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {degreeCoreSubjects && (
              <div className="w-full">
                <InputWithTooltip label="Core Subjects" required>
                  <Select
                    isMulti
                    value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                    onChange={(selected) => {
                      const selectedValues = selected ? selected.map(option => option.value) : [];
                      handleEducationDataChange(index, "coreSubjects", selectedValues);
                    }}
                    options={coreSubjectsOptions}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Core Subjects"
                    required
                    isClearable={false}
                    menuPortalTarget={document.body}
                    styles={reactSelectStyles}
                  />
                </InputWithTooltip>
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <InputWithTooltip label="Other Subjects" required>
                    <input
                      type="text"
                      value={data.otherSubjects}
                      onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                      placeholder="Specify other subjects"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {degreePercentage && (
                <div className="w-full">
                  <InputWithTooltip label="Grade / Percentage" required={data.courseStatus !== "Pursuing"}>
                    <input
                      type="text"
                      value={data.percentage}
                      onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                      placeholder={data.courseStatus === "Pursuing" ? "Current CGPA / Grade (Optional)" : "Grade / Percentage"}
                      pattern="[a-zA-Z0-9+%]*"
                      maxLength={5}
                      minLength={data.courseStatus === "Pursuing" ? 0 : 2}
                      required={data.courseStatus !== "Pursuing"}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
            {degreeMode && (
                <div className="w-full relative">
                  <InputWithTooltip label="Mode of Study" required>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.mode || ""}
                      onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                      required
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
          </div>
        );
      case "masterDegree":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {masterCourseStatus && (
              <div className="w-full relative">
                <InputWithTooltip label="Course Status" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseStatus || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                    required
                  >
                    <option value="" disabled>Course Status</option>
                    {courseStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {masterName && (
              <div className="w-full relative">
                <InputWithTooltip label="Master Degree Name" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseName || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseName", e.target.value)}
                    required
                  >
                    <option value="" disabled>Master Degree Name</option>
                    {masterDegrees.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {masterCollege && (
                <div className="w-full">
                  <InputWithTooltip label="College Name">
                    <input
                      type="text"
                      value={data.collegeName}
                      onChange={(e) => handleEducationDataChange(index, "collegeName", e.target.value)}
                      placeholder="College Name"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {masterPlace && (
                <div className="w-full">
                  <InputWithTooltip label="Place of Study">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {masterUniversity && (
                <div className="w-full">
                  <InputWithTooltip label="University Name">
                    <input
                      type="text"
                      value={data.universityName}
                      onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                      placeholder="University Name"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {masterYear && (
              <div className="w-full relative">
                <InputWithTooltip label="Year of Passing" required={data.courseStatus !== "Pursuing"}>
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => {
                      const selectedYear = parseInt(e.target.value);
                      const minYear = getMinimumYearForLevel("masterDegree", index);
                      if (selectedYear && selectedYear < minYear) {
                        toast.error(`Master's passing year must be ${minYear} or later`);
                        return;
                      }
                      handleEducationDataChange(index, "yearOfPassing", e.target.value);
                    }}
                    required={data.courseStatus !== "Pursuing"}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>
                      {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                    </option>
                    {generateYearOptions(null, "masterDegree", index)}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {masterCoreSubjects && (
              <div className="w-full">
                <InputWithTooltip label="Core Subjects" required>
                  <Select
                    isMulti
                    value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                    onChange={(selected) => {
                      const selectedValues = selected ? selected.map(option => option.value) : [];
                      handleEducationDataChange(index, "coreSubjects", selectedValues);
                    }}
                    options={coreSubjectsOptions}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Core Subjects"
                    required
                    isClearable={false}
                    menuPortalTarget={document.body}
                    styles={reactSelectStyles}
                  />
                </InputWithTooltip>
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <InputWithTooltip label="Other Subjects" required>
                    <input
                      type="text"
                      value={data.otherSubjects}
                      onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                      placeholder="Specify other subjects"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {masterPercentage && (
                <div className="w-full">
                  <InputWithTooltip label="Grade / Percentage" required={data.courseStatus !== "Pursuing"}>
                    <input
                      type="text"
                      value={data.percentage}
                      onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                      placeholder={data.courseStatus === "Pursuing" ? "Current CGPA / Grade (Optional)" : "Grade / Percentage"}
                      pattern="[a-zA-Z0-9+%]*"
                      maxLength={5}
                      minLength={data.courseStatus === "Pursuing" ? 0 : 2}
                      required={data.courseStatus !== "Pursuing"}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {masterMode && (
                <div className="w-full relative">
                  <InputWithTooltip label="Mode of Study" required>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.mode || ""}
                      onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                      required
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
          </div>
        );
      case "doctorate":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorateCourseStatus && (
              <div className="w-full relative">
                <InputWithTooltip label="Course Status" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseStatus || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                    required
                  >
                    <option value="" disabled>Course Status</option>
                    {courseStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {doctorateCollege && (
                <div className="w-full">
                  <InputWithTooltip label="Place of Study">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {doctorateUniversity && (
                <div className="w-full">
                  <InputWithTooltip label="University Name">
                    <input
                      type="text"
                      value={data.universityName}
                      onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                      placeholder="University Name"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {doctorateYear && (
              <div className="w-full relative">
                <InputWithTooltip label="Year of Completion" required>
                  <select
                    value={data.yearOfCompletion}
                    onChange={(e) => {
                      const selectedYear = parseInt(e.target.value);
                      const minYear = getMinimumYearForLevel("doctorate", index);
                      if (selectedYear && selectedYear < minYear) {
                        toast.error(`Doctorate completion year must be ${minYear} or later`);
                        return;
                      }
                      handleEducationDataChange(index, "yearOfCompletion", e.target.value);
                    }}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>Year of Completion</option>
                    {generateYearOptions(null, "doctorate", index)}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {doctorateCoreSubjects && (
              <div className="w-full">
                <InputWithTooltip label="Core Subjects" required>
                  <Select
                    isMulti
                    value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                    onChange={(selected) => {
                      const selectedValues = selected ? selected.map(option => option.value) : [];
                      handleEducationDataChange(index, "coreSubjects", selectedValues);
                    }}
                    options={coreSubjectsOptions}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Core Subjects"
                    required
                    isClearable={false}
                    menuPortalTarget={document.body}
                    styles={reactSelectStyles}
                  />
                </InputWithTooltip>
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <InputWithTooltip label="Other Subjects" required>
                    <input
                      type="text"
                      value={data.otherSubjects}
                      onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                      placeholder="Specify other subjects"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {doctorateMode && (
                <div className="w-full relative">
                  <InputWithTooltip label="Mode of Study" required>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.mode || ""}
                      onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                      required
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
          </div>
        );
      case "nttMtt":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEasyMode ? (
                <div className="w-full md:w-1/2 relative">
                  <InputWithTooltip label="Year of Passing" required>
                    <select
                      value={data.yearOfPassing}
                      onChange={(e) => {
                        const selectedYear = parseInt(e.target.value);
                        const minYear = getMinimumYearForLevel("nttMtt", index);
                        if (selectedYear && selectedYear < minYear) {
                          toast.error(`NTT/MTT passing year must be ${minYear} or later`);
                          return;
                        }
                        handleEducationDataChange(index, "yearOfPassing", e.target.value);
                      }}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Year of Passing</option>
                      {generateYearOptions(null, "nttMtt", index)}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              ) : (
                <>
                  <div className="w-full relative">
                    <InputWithTooltip label="Course Status" required>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.courseStatus || ""}
                        onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                        required
                      >
                        <option value="" disabled>Course Status</option>
                        {courseStatusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Institute Name">
                      <input
                        type="text"
                        value={data.instituteName}
                        onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                        placeholder="Institute Name"
                        maxLength={30}
                        pattern="[a-zA-Z0-9 ]*"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Place of Study">
                      <input
                        type="text"
                        value={data.placeOfStudy}
                        onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                        placeholder="Place of Study"
                        maxLength={30}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Affiliated To">
                      <input
                        type="text"
                        value={data.affiliatedTo}
                        onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                        placeholder="Affiliated to / recognized by"
                        maxLength={30}
                        pattern="[a-zA-Z0-9 ]*"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Course Duration">
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.courseDuration || ""}
                        onChange={(e) => handleEducationDataChange(index, "courseDuration", e.target.value)}
                      >
                        <option value="" disabled>Course Duration</option>
                        {courseDurationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Year of Passing" required>
                      <select
                        value={data.yearOfPassing}
                        onChange={(e) => {
                          const selectedYear = parseInt(e.target.value);
                          const minYear = getMinimumYearForLevel("nttMtt", index);
                          if (selectedYear && selectedYear < minYear) {
                            toast.error(`NTT/MTT passing year must be ${minYear} or later`);
                            return;
                          }
                          handleEducationDataChange(index, "yearOfPassing", e.target.value);
                        }}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      >
                        <option value="" disabled>Year of Passing</option>
                        {generateYearOptions(null, "nttMtt", index)}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Grade / Percentage">
                      <input
                        type="text"
                        value={data.percentage}
                        onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                        placeholder="Grade / Percentage"
                        pattern="[a-zA-Z0-9+%]*"
                        maxLength={5}
                        minLength={2}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Mode of Study" required>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.mode || ""}
                        onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                        required
                      >
                        <option value="" disabled>Mode of Study</option>
                        {educationModeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                </>
              )}
          </div>
        );
      case "bEd":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bEdCourseStatus && (
              <div className="w-full relative">
                <InputWithTooltip label="Course Status" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseStatus || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                    required
                  >
                    <option value="" disabled>Course Status</option>
                    {courseStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {bEdCollege && (
                <div className="w-full">
                  <InputWithTooltip label="Institute / College Name">
                    <input
                      type="text"
                      value={data.instituteName}
                      onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                      placeholder="Institute / College name"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
                )}
              {bEdPlace && (
                <div className="w-full">
                  <InputWithTooltip label="Place of Study">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {bEdAffiliated && (
                <div className="w-full">
                  <InputWithTooltip label="Affiliated To">
                    <input
                      type="text"
                      value={data.affiliatedTo}
                      onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                      placeholder="Affiliated to / recognized by"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {bEdCourseDuration && (
                <div className="w-full relative">
                  <InputWithTooltip label="Course Duration">
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.courseDuration || ""}
                      onChange={(e) => handleEducationDataChange(index, "courseDuration", e.target.value)}
                    >
                      <option value="" disabled>Course Duration</option>
                      {bEdCourseDurationOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
              {bEdYear && (
              <div className="w-full relative">
                <InputWithTooltip label="Year of Passing" required={data.courseStatus !== "Pursuing"}>
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => {
                      const selectedYear = parseInt(e.target.value);
                      const minYear = getMinimumYearForLevel("bEd", index);
                      if (selectedYear && selectedYear < minYear) {
                        toast.error(`B.Ed passing year must be ${minYear} or later`);
                        return;
                      }
                      handleEducationDataChange(index, "yearOfPassing", e.target.value);
                    }}
                    required={data.courseStatus !== "Pursuing"}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>
                      {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                    </option>
                    {generateYearOptions(null, "bEd", index)}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {bEdCoreSubjects && (
              <div className="w-full">
                <InputWithTooltip label="Core Subjects" required>
                  <Select
                    isMulti
                    value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                    onChange={(selected) => {
                      const selectedValues = selected ? selected.map(option => option.value) : [];
                      handleEducationDataChange(index, "coreSubjects", selectedValues);
                    }}
                    options={coreSubjectsOptions}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    placeholder="Core Subjects"
                    required
                    isClearable={false}
                    menuPortalTarget={document.body}
                    styles={reactSelectStyles}
                  />
                </InputWithTooltip>
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <InputWithTooltip label="Other Subjects" required>
                    <input
                      type="text"
                      value={data.otherSubjects}
                      onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                      placeholder="Specify other subjects"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {bEdPercentage && (
                <div className="w-full">
                  <InputWithTooltip label="Grade / Percentage" required={data.courseStatus !== "Pursuing"}>
                    <input
                      type="text"
                      value={data.percentage}
                      onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                      placeholder={data.courseStatus === "Pursuing" ? "Current CGPA / Grade (Optional)" : "Grade / Percentage"}
                      pattern="[a-zA-Z0-9+%]*"
                      maxLength={5}
                      minLength={data.courseStatus === "Pursuing" ? 0 : 2}
                      required={data.courseStatus !== "Pursuing"}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {bEdMode && (
                <div className="w-full relative">
                  <InputWithTooltip label="Mode of Study" required>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.mode || ""}
                      onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                      required
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
          </div>
        );
      case "certificate":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificateCourseStatus && (
              <div className="w-full relative">
                <InputWithTooltip label="Course Status" required>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    value={data.courseStatus || ""}
                    onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                    required
                  >
                    <option value="" disabled>Course Status</option>
                    {courseStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              )}
              {certificateName && (
              <div className="w-full">
                <InputWithTooltip label="Course Name" required>
                  <input
                    type="text"
                    value={data.courseName}
                    onChange={(e) => handleEducationDataChange(index, "courseName", e.target.value)}
                    placeholder="Course Name"
                    maxLength={30}
                    pattern="[a-zA-Z0-9 ]*"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
              )}
              {certificatePlace && (
                <div className="w-full">
                  <InputWithTooltip label="Place of Study">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {certificateCourseDuration && (
                <div className="w-full relative">
                  <InputWithTooltip label="Course Duration">
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.courseDuration || ""}
                      onChange={(e) => handleEducationDataChange(index, "courseDuration", e.target.value)}
                    >
                      <option value="" disabled>Course Duration</option>
                      {certificateCourseDurationOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
              <div className="w-full relative">
                <InputWithTooltip label="Year of Passing" required>
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => {
                      const selectedYear = parseInt(e.target.value);
                      const minYear = getMinimumYearForLevel("certificate", index);
                      if (selectedYear && selectedYear < minYear) {
                        toast.error(`Certificate passing year must be ${minYear} or later`);
                        return;
                      }
                      handleEducationDataChange(index, "yearOfPassing", e.target.value);
                    }}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>Year of Passing</option>
                    {generateYearOptions(null, "certificate", index)}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </InputWithTooltip>
              </div>
              {certificateSpecialization && (
                <div className="w-full">
                  <InputWithTooltip label="Specialization">
                    <input
                      type="text"
                      value={data.specialization}
                      onChange={(e) => handleEducationDataChange(index, "specialization", e.target.value)}
                      placeholder="Specialization"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </InputWithTooltip>
                </div>
              )}
              {certificateMode && (
                <div className="w-full relative">
                  <InputWithTooltip label="Mode of Study" required>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      value={data.mode || ""}
                      onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                      required
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              )}
          </div>
        );
      case "dEd":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEasyMode ? (
                <div className="w-full md:w-1/2 relative">
                  <InputWithTooltip label="Year of Passing" required>
                    <select
                      value={data.yearOfPassing}
                      onChange={(e) => {
                        const selectedYear = parseInt(e.target.value);
                        const minYear = getMinimumYearForLevel("dEd", index);
                        if (selectedYear && selectedYear < minYear) {
                          toast.error(`D.Ed passing year must be ${minYear} or later`);
                          return;
                        }
                        handleEducationDataChange(index, "yearOfPassing", e.target.value);
                      }}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="">Year of Passing</option>
                      {generateYearOptions(null, "dEd", index)}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </InputWithTooltip>
                </div>
              ) : (
                <>
                  <div className="w-full relative">
                    <InputWithTooltip label="Course Status" required>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.courseStatus || ""}
                        onChange={(e) => handleEducationDataChange(index, "courseStatus", e.target.value)}
                        required
                      >
                        <option value="" disabled>Course Status</option>
                        {courseStatusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Institute / College Name" required>
                      <input
                        type="text"
                        value={data.instituteName}
                        onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                        placeholder="Institute / College name"
                        maxLength={30}
                        pattern="[a-zA-Z0-9 ]*"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Place of Study" required>
                      <input
                        type="text"
                        value={data.placeOfStudy}
                        onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                        placeholder="Place of Study"
                        maxLength={30}
                        pattern="[a-zA-Z0-9 ]*"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Affiliated To" required>
                      <input
                        type="text"
                        value={data.affiliatedTo}
                        onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                        placeholder="Affiliated to / recognized by"
                        maxLength={30}
                        pattern="[a-zA-Z0-9 ]*"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Course Duration">
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.courseDuration || ""}
                        onChange={(e) => handleEducationDataChange(index, "courseDuration", e.target.value)}
                      >
                        <option value="" disabled>Course Duration</option>
                        {dEdCourseDurationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Year of Passing" required>
                      <select
                        value={data.yearOfPassing}
                        onChange={(e) => {
                          const selectedYear = parseInt(e.target.value);
                          const minYear = getMinimumYearForLevel("nttMtt", index);
                          if (selectedYear && selectedYear < minYear) {
                            toast.error(`NTT/MTT passing year must be ${minYear} or later`);
                            return;
                          }
                          handleEducationDataChange(index, "yearOfPassing", e.target.value);
                        }}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                      >
                        <option value="" disabled>Year of Passing</option>
                        {generateYearOptions(null, "nttMtt", index)}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full">
                    <InputWithTooltip label="Core Subjects" required>
                      <Select
                        isMulti
                        value={data.coreSubjects.map(subject => ({ value: subject, label: subject }))}
                        onChange={(selected) => {
                          const selectedValues = selected ? selected.map(option => option.value) : [];
                          handleEducationDataChange(index, "coreSubjects", selectedValues);
                        }}
                        options={coreSubjectsOptions}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder="Core Subjects"
                        required
                        isClearable={false}
                        styles={reactSelectStyles}
                      />
                    </InputWithTooltip>
                  </div>
                  {data.coreSubjects.includes("Others") && (
                    <div className="w-full">
                      <InputWithTooltip label="Other Subjects" required>
                        <input
                          type="text"
                          value={data.otherSubjects}
                          onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                          placeholder="Specify other subjects"
                          required
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                        />
                      </InputWithTooltip>
                    </div>
                  )}
                  <div className="w-full">
                    <InputWithTooltip label="Percentage">
                      <input
                        type="text"
                        value={data.percentage}
                        onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                        placeholder="Percentage"
                        maxLength={5}
                        minLength={2}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </InputWithTooltip>
                  </div>
                  <div className="w-full relative">
                    <InputWithTooltip label="Mode of Study" required>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                        value={data.mode || ""}
                        onChange={(e) => handleEducationDataChange(index, "mode", e.target.value)}
                        required
                      >
                        <option value="" disabled>Mode of Study</option>
                        {educationModeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                    </InputWithTooltip>
                  </div>
                </>
              )}
          </div>
        );
      default:
        return null;
    }
  };

  // Expose validation method to parent
  useImperativeHandle(ref, () => ({
    validateFields: () => {
      const errors = [];

      // Validate Grade 10 (Mandatory) - Always required
      if (!grade10Data.yearOfPassing) {
        errors.push("Please select Grade 10 year of passing");
      }

      // In Full Mode, validate additional Grade 10 mandatory fields (those with purple highlighting)
      if (!isEasyMode) {
      if (!grade10Data.mode || grade10Data.mode.trim() === "") {
        errors.push("Please select Grade 10 mode of study");
      }
      }

      // Validate additional education entries - check mandatory fields based on visibility props
      additionalEducation.forEach((edu, index) => {
        const type = edu.type;
        const data = edu.data;

        switch (type) {
            case "grade12":
            // Only validate fields that are actually visible
            if (grade12courseStatus && !data.courseStatus) {
              errors.push("Please select Grade 12 course status");
            }
            if (grade12year && !data.yearOfPassing && data.courseStatus !== "Pursuing") {
              errors.push("Please select Grade 12 year of passing");
            }
            if (grade12percentage && !data.percentage && data.courseStatus !== "Pursuing") {
              errors.push("Please enter Grade 12 grade/percentage");
            }
            if (grade12coreSubjects && (!data.coreSubjects || data.coreSubjects.length === 0)) {
              errors.push("Please select Grade 12 core subjects");
            }
            if (grade12mode && !data.mode) {
              errors.push("Please select Grade 12 mode of study");
            }
            break;

            case "degree":
            // Only validate fields that are actually visible
            if (degreeCourseStatus && !data.courseStatus) {
              errors.push("Please select degree course status");
            }
            if (degreeName && !data.courseName) {
              errors.push("Please select degree name");
            }
            if (degreeYear && !data.yearOfPassing && data.courseStatus !== "Pursuing") {
              errors.push("Please select degree year of passing");
            }
            if (degreePercentage && !data.percentage && data.courseStatus !== "Pursuing") {
              errors.push("Please enter degree grade/percentage");
            }
            if (degreeCoreSubjects && (!data.coreSubjects || data.coreSubjects.length === 0)) {
              errors.push("Please select degree core subjects");
            }
            if (degreeMode && !data.mode) {
              errors.push("Please select degree mode of study");
            }
            break;

            case "masterDegree":
            // Only validate fields that are actually visible
            if (masterCourseStatus && !data.courseStatus) {
              errors.push("Please select master's degree course status");
            }
            if (masterName && !data.courseName) {
              errors.push("Please select master's degree name");
            }
            if (masterYear && !data.yearOfPassing && data.courseStatus !== "Pursuing") {
              errors.push("Please select master's degree year of passing");
            }
            if (masterPercentage && !data.percentage && data.courseStatus !== "Pursuing") {
              errors.push("Please enter master's degree grade/percentage");
            }
            if (masterCoreSubjects && (!data.coreSubjects || data.coreSubjects.length === 0)) {
              errors.push("Please select master's degree core subjects");
            }
            if (masterMode && !data.mode) {
              errors.push("Please select master's degree mode of study");
            }
            break;

          case "doctorate":
            // Only validate fields that are actually visible
            if (doctorateCourseStatus && !data.courseStatus) {
              errors.push("Please select doctorate course status");
            }
            if (doctorateYear && !data.yearOfCompletion) {
              errors.push("Please select doctorate year of completion");
            }
            if (doctorateCoreSubjects && (!data.coreSubjects || data.coreSubjects.length === 0)) {
              errors.push("Please select doctorate core subjects");
            }
            if (doctorateMode && !data.mode) {
              errors.push("Please select doctorate mode of study");
            }
            break;

                      case "dEd":
            // In easy mode, only validate year of passing
            if (isEasyMode) {
              if (!data.yearOfPassing) {
                errors.push("Please select D.Ed year of passing");
              }
            } else {
              // In full mode, validate all visible fields
              if (!data.courseStatus) {
                errors.push("Please select D.Ed course status");
              }
              // Year of passing is always required unless course status is "Pursuing"
              if (!data.yearOfPassing && data.courseStatus !== "Pursuing") {
                errors.push("Please select D.Ed year of passing");
              }
              // Percentage is required unless course status is "Pursuing"
              if (!data.percentage && data.courseStatus !== "Pursuing") {
                errors.push("Please enter D.Ed grade/percentage");
              }
              if (!data.coreSubjects || data.coreSubjects.length === 0) {
                errors.push("Please select D.Ed core subjects");
              }
              if (!data.mode) {
                errors.push("Please select D.Ed mode of study");
              }
            }
            break;

            case "bEd":
            // Only validate fields that are actually visible
            if (bEdCourseStatus && !data.courseStatus) {
              errors.push("Please select B.Ed course status");
            }
            if (bEdYear && !data.yearOfPassing && data.courseStatus !== "Pursuing") {
              errors.push("Please select B.Ed year of passing");
            }
            if (bEdPercentage && !data.percentage && data.courseStatus !== "Pursuing") {
              errors.push("Please enter B.Ed grade/percentage");
            }
            if (bEdCoreSubjects && (!data.coreSubjects || data.coreSubjects.length === 0)) {
              errors.push("Please select B.Ed core subjects");
            }
            if (bEdMode && !data.mode) {
              errors.push("Please select B.Ed mode of study");
            }
            break;

            case "nttMtt":
            // In easy mode, only validate year of passing
            if (isEasyMode) {
              if (!data.yearOfPassing) {
                errors.push("Please select NTT/MTT year of passing");
              }
            } else {
              // In full mode, validate all visible fields
              if (!data.courseStatus) {
                errors.push("Please select NTT/MTT course status");
              }
              // Year of passing is always required unless course status is "Pursuing"
              if (!data.yearOfPassing && data.courseStatus !== "Pursuing") {
                errors.push("Please select NTT/MTT year of passing");
              }
              if (!data.mode) {
                errors.push("Please select NTT/MTT mode of study");
              }
            }
            break;

          case "certificate":
            // Only validate fields that are actually visible
            if (certificateCourseStatus && !data.courseStatus) {
              errors.push("Please select certificate course status");
            }
            if (certificateName && !data.courseName) {
              errors.push("Please enter certificate name");
            }
            // Year of passing is always required unless course status is "Pursuing"
            if (!data.yearOfPassing && data.courseStatus !== "Pursuing") {
              errors.push("Please select certificate year of passing");
            }
            if (certificateMode && !data.mode) {
              errors.push("Please select certificate mode of study");
            }
            break;
        }
      });

      return {
        isValid: errors.length === 0,
        errors
      };
    },
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your education details.");
      }

      const payload = {
        firebase_uid: user.uid,
        grade10: {
          syllabus: grade10Data.syllabus,
          schoolName: grade10Data.schoolName,
          yearOfPassing: grade10Data.yearOfPassing,
          percentage: grade10Data.percentage,
          mode: grade10Data.mode
        },
        additionalEducation: additionalEducation.map((edu) => ({
          education_type: edu.type,
          syllabus: edu.data.syllabus || null,
          schoolName: edu.data.schoolName || null,
          yearOfPassing: edu.data.yearOfPassing || null,
          percentage: edu.data.percentage || null,
          mode: edu.data.mode || null,
          courseStatus: edu.data.courseStatus || null,
          courseName: edu.data.courseName || null,
          collegeName: edu.data.collegeName || null,
          placeOfStudy: edu.data.placeOfStudy || null,
          universityName: edu.data.universityName || null,
          yearOfCompletion: edu.data.yearOfCompletion || null,
          instituteName: edu.data.instituteName || null,
          affiliatedTo: edu.data.affiliatedTo || null,
          courseDuration: edu.data.courseDuration || null,
          specialization: edu.data.specialization || null,
          coreSubjects:
            edu.data.coreSubjects && edu.data.coreSubjects.length
              ? JSON.stringify(edu.data.coreSubjects)
              : null,
          otherSubjects: edu.data.otherSubjects || null
        }))
      };
      
      const { data } = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      
      console.log("Education details saved successfully");
      return { success: true, data };
    }
  }));

  // Update parent form data when education data changes
  useEffect(() => {
    if (!setFormData || isLocalUpdate.current) return;
    
    const newEducationData = {
      grade10: grade10Data,
      additional: additionalEducation
    };
    
    // Only update if data has actually changed
    if (JSON.stringify(formData?.education) !== JSON.stringify(newEducationData)) {
      isLocalUpdate.current = true;
      setFormData(prev => ({
        ...prev,
        education: newEducationData
      }));
      // Reset the flag after the update
      setTimeout(() => {
        isLocalUpdate.current = false;
      }, 0);
    }
  }, [grade10Data, additionalEducation]);

  // Initialize with parent form data when available
  useEffect(() => {
    if (!formData?.education || isLocalUpdate.current) return;
    
    const newGrade10Data = formData.education.grade10;
    const newAdditionalEducation = formData.education.additional;
    
    if (newGrade10Data) {
      setGrade10Data(newGrade10Data);
    }
    if (newAdditionalEducation) {
      setAdditionalEducation(newAdditionalEducation);
    }
  }, [formData?.education]);

  // ------------------- Submit handler -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        firebase_uid: user.uid,
        grade10: {
          syllabus: grade10Data.syllabus,
          schoolName: grade10Data.schoolName,
          yearOfPassing: grade10Data.yearOfPassing,
          percentage: grade10Data.percentage,
          mode: grade10Data.mode
        },
        additionalEducation: additionalEducation.map((edu) => ({
          education_type: edu.type,
          syllabus: edu.data.syllabus || null,
          schoolName: edu.data.schoolName || null,
          yearOfPassing: edu.data.yearOfPassing || null,
          percentage: edu.data.percentage || null,
          mode: edu.data.mode || null,
          courseStatus: edu.data.courseStatus || null,
          courseName: edu.data.courseName || null,
          collegeName: edu.data.collegeName || null,
          placeOfStudy: edu.data.placeOfStudy || null,
          universityName: edu.data.universityName || null,
          yearOfCompletion: edu.data.yearOfCompletion || null,
          instituteName: edu.data.instituteName || null,
          affiliatedTo: edu.data.affiliatedTo || null,
          courseDuration: edu.data.courseDuration || null,
          specialization: edu.data.specialization || null,
          coreSubjects:
            edu.data.coreSubjects && edu.data.coreSubjects.length
              ? JSON.stringify(edu.data.coreSubjects)
              : null,
          otherSubjects: edu.data.otherSubjects || null
        }))
      };
      const { data } = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("Education details saved successfully");
      console.log("Success:", data);
    } catch (error) {
      console.error("Error saving education details:", error);
      toast.error("Failed to save education details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg pt-0 px-4 pb-4 md:pt-0 md:px-6 md:pb-6 bg-rose-100 overflow-x-hidden">
      <div className="w-full space-y-6">
        {/* Grade 10 Section (Mandatory) */}
        <div>
          <h6 className="text-black font-semibold mb-4">Grade 10</h6>
          {isEasyMode ? (
            <div className="w-full md:w-1/2">
              <InputWithTooltip label="Year of Passing" required>
                <div className="relative">
                  <select
                    value={grade10Data.yearOfPassing}
                    onChange={(e) => handleGrade10Change("yearOfPassing", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>Year of Passing</option>
                    {generateYearOptions(null, "grade10", null).map((option) => (
                      <option key={option.props.value} value={option.props.value}>
                        {option.props.children}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                </div>
              </InputWithTooltip>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <InputWithTooltip label="Syllabus">
                  <div className="relative">
                    <select
                      value={grade10Data.syllabus || ""}
                      onChange={(e) => handleGrade10Change("syllabus", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Syllabus</option>
                      {syllabusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </div>
                </InputWithTooltip>
              </div>
              <div className="w-full">
                <InputWithTooltip label="School Name">
                  <input
                    type="text"
                    value={grade10Data.schoolName}
                    onChange={(e) => handleGrade10Change("schoolName", e.target.value)}
                    placeholder="School Name"
                    pattern="[a-zA-Z0-9 ]*"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
              <div className="w-full">
                <InputWithTooltip label="Year of Passing" required>
                  <div className="relative">
                    <select
                      value={grade10Data.yearOfPassing}
                      onChange={(e) => handleGrade10Change("yearOfPassing", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Year of Passing</option>
                      {generateYearOptions(null, "grade10", null).map((option) => (
                        <option key={option.props.value} value={option.props.value}>
                          {option.props.children}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </div>
                </InputWithTooltip>
              </div>
              <div className="w-full">
                <InputWithTooltip label="Grade / Percentage">
                  <input
                    type="text"
                    value={grade10Data.percentage}
                    onChange={(e) => handleGrade10Change("percentage", e.target.value)}
                    placeholder="Grade / Percentage"
                    pattern="[a-zA-Z0-9+%]*"
                    maxLength={5}
                    minLength={2}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </InputWithTooltip>
              </div>
              <div className="w-full">
                <InputWithTooltip label="Mode of Study" required>
                  <div className="relative">
                    <select
                      value={grade10Data.mode || ""}
                      onChange={(e) => handleGrade10Change("mode", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Mode of Study</option>
                      {educationModeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </div>
                </InputWithTooltip>
              </div>
            </div>
          )}
        </div>
        {/* Additional Education Sections */}
        {additionalEducation.map((education, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-4">
              <h6 className="text-black font-semibold">{educationTypes.find((type) => type.value === education.type)?.label}</h6>
              <button 
                type="button" 
                onClick={() => handleRemoveEducation(index)} 
                className="px-4 py-2 bg-gradient-brand text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm transition-opacity"
              >
                Remove
              </button>
            </div>
            {renderEducationFields(education.type, education.data, index)}
          </div>
        ))}
        {/* Add More Education Section */}
        <div>
          <h6 className="text-black font-semibold mb-4">Add More Education</h6>
          <div className="w-full md:w-1/2 relative">
            <InputWithTooltip label="Select Course">
              <select
                value=""
                onChange={(e) => {
                  const selected = educationTypes.find((type) => type.value === e.target.value);
                  if (selected) {
                    const newEducation = {
                      type: selected.value,
                      data: getInitialDataForType(selected.value)
                    };
                    const updatedAdditionalEducation = [...additionalEducation, newEducation];
                    setAdditionalEducation(updatedAdditionalEducation);
                    
                    // Immediately update parent FormInfoBox to preserve the addition
                    const newEducationData = {
                      grade10: grade10Data,
                      additional: updatedAdditionalEducation
                    };
                    
                    if (updateEducationData) {
                      updateEducationData(newEducationData);
                    } else if (setFormData) {
                      setFormData(prev => ({
                        ...prev,
                        education: newEducationData
                      }));
                    }
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
              >
                <option value="" disabled>Select Course</option>
                {educationTypes.map((type) => {
                  const alreadySelected = additionalEducation.some((edu) => edu.type === type.value);
                  if (type.allowMultiple || !alreadySelected) {
                    return (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    );
                  }
                  return null;
                })}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </InputWithTooltip>
          </div>
        </div>
        {/* Save button hidden - auto-save handles saving when clicking Next */}
      </div>
    </form>
  );
});

Education.propTypes = {
  isEasyMode: PropTypes.bool,
  grade12syllabus: PropTypes.bool,
  // ... rest of your prop types ...
  formData: PropTypes.object,
  setFormData: PropTypes.func
};

Education.displayName = 'Education';

export default Education;