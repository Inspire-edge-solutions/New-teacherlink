import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import Select from "react-select";
import { TextField, MenuItem } from "@mui/material";
import "./profile-styles.css";
import axios from "axios";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PropTypes from "prop-types";

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
  // MUI TextField styles (for all text inputs and selects)
  const muiTextFieldStyles = {
    backgroundColor: 'white',
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      '& fieldset': {
        borderColor: '#D1D5DB',
      },
      '&:hover fieldset': {
        borderColor: '#FDA4AF',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#FDA4AF',
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#6B7280',
      '&.Mui-focused': {
        color: '#F43F5E',
      },
    },
    '& .MuiInputLabel-asterisk': {
      color: '#EF4444', // Red asterisk for required fields
    },
    '& .MuiOutlinedInput-input': {
      padding: '14px',
    },
    '& .MuiSelect-icon': {
      color: '#EF4444',
    },
  };

  // MUI Select MenuProps (for z-index)
  const muiSelectProps = {
    MenuProps: {
      sx: {
        zIndex: 1400,
      }
    }
  };

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
      const formattedSubjects = response.data.map((subject) => ({
        value: subject.value,
        label: subject.label
      }));
      setCoreSubjectsOptions(formattedSubjects);
    } catch (error) {
      console.error("Error fetching education subjects:", error);
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
        const data = await response.json();
        const transformedData = data.map((item) => ({
          category: item.category,
          value: item.value,
          label: item.label
        }));
        setDegrees(transformedData.filter((item) => item.category === "Degrees") || []);
        setMasterDegrees(
          transformedData.filter((item) => item.category === "MasterDegree") || []
        );
        setSyllabusOptions(
          transformedData.filter((item) => item.category === "Curriculum") || []
        );
      } catch (error) {
        console.error("Error fetching degree constants:", error);
      }
    };
    fetchDegrees();
  }, []);

  // For Grade 10, Degree, Master's, etc. where you need year selection
  const generateYearOptions = (startYear = 1960, endYear = new Date().getFullYear()) => {
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
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            )}
            {grade12syllabus && (
              <div className="w-full">
                <Select
                  value={syllabusOptions.find(option => option.value === data.syllabus) || null}
                  onChange={(selectedOption) => handleEducationDataChange(index, "syllabus", selectedOption ? selectedOption.value : "")}
                  options={syllabusOptions}
                  placeholder="Syllabus"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isClearable={false}
                  menuPortalTarget={document.body}
                  styles={reactSelectStyles}
                />
              </div>
            )}
            {grade12school && (
              <div className="w-full">
                <input
                  type="text"
                  value={data.schoolName}
                  onChange={(e) => handleEducationDataChange(index, "schoolName", e.target.value)}
                  placeholder="School Name"
                  pattern="[a-zA-Z0-9 ]*"
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            )}
            {grade12year && (
            <div className="w-full relative">
              <select
                value={data.yearOfPassing}
                onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                required={data.courseStatus !== "Pursuing"}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
              >
                <option value="" disabled>
                  {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                </option>
                {generateYearOptions()}
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            )}
            {grade12coreSubjects && (
            <div className="w-full">
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
            )}
            {data.coreSubjects.includes("Others") && (
              <div className="w-full">
                <input
                  type="text"
                  value={data.otherSubjects}
                  onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                  placeholder="Specify other subjects"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            )}
            {grade12percentage && (
              <div className="w-full">
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
              </div>
            )}
            {grade12mode && (
              <div className="w-full relative">
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        );
      case "degree":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {degreeCourseStatus && (
              <div className="w-full relative">
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {degreeName && (
              <div className="w-full">
                <Select
                  value={degrees.find(d => d.value === data.courseName) || null}
                  onChange={(selectedOption) => handleEducationDataChange(index, "courseName", selectedOption ? selectedOption.value : "")}
                  options={degrees}
                  placeholder="Degree Name"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                  isClearable={false}
                  menuPortalTarget={document.body}
                  styles={reactSelectStyles}
                />
              </div>
              )}
              {degreeCollege && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.collegeName}
                    onChange={(e) => handleEducationDataChange(index, "collegeName", e.target.value)}
                    placeholder="College Name"
                    pattern="[a-zA-Z0-9 ]*"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {degreePlace && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.placeOfStudy}
                    onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                    placeholder="Place of Study"
                    maxLength={30}
                    pattern="[a-zA-Z0-9 ]*"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {degreeUniversity && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.universityName}
                    onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                    placeholder="University Name"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {degreeYear && (
              <div className="w-full relative">
                <select
                  value={data.yearOfPassing}
                  onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                  required={data.courseStatus !== "Pursuing"}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>
                    {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                  </option>
                  {generateYearOptions()}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {degreeCoreSubjects && (
              <div className="w-full">
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
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.otherSubjects}
                    onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                    placeholder="Specify other subjects"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {degreePercentage && (
                <div className="w-full">
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
                </div>
              )}
              {degreeMode && (
                <div className="w-full relative">
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
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
          </div>
        );
      case "masterDegree":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {masterCourseStatus && (
              <div className="w-full relative">
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {masterName && (
              <div className="w-full">
                <Select
                  value={masterDegrees.find(d => d.value === data.courseName) || null}
                  onChange={(selectedOption) => handleEducationDataChange(index, "courseName", selectedOption ? selectedOption.value : "")}
                  options={masterDegrees}
                  placeholder="Master Degree Name"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  required
                  isClearable={false}
                  menuPortalTarget={document.body}
                  styles={reactSelectStyles}
                />
              </div>
              )}
              {masterCollege && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.collegeName}
                    onChange={(e) => handleEducationDataChange(index, "collegeName", e.target.value)}
                    placeholder="College Name"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {masterPlace && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.placeOfStudy}
                    onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                    placeholder="Place of Study"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {masterUniversity && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.universityName}
                    onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                    placeholder="University Name"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {masterYear && (
              <div className="w-full relative">
                <select
                  value={data.yearOfPassing}
                  onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                  required={data.courseStatus !== "Pursuing"}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>
                    {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                  </option>
                  {generateYearOptions()}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {masterCoreSubjects && (
              <div className="w-full">
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
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.otherSubjects}
                    onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                    placeholder="Specify other subjects"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {masterPercentage && (
                <div className="w-full">
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
                </div>
              )}
              {masterMode && (
                <div className="w-full relative">
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
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
          </div>
        );
      case "doctorate":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorateCourseStatus && (
              <div className="w-full relative">
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {doctorateCollege && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.placeOfStudy}
                    onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                    placeholder="Place of Study"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {doctorateUniversity && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.universityName}
                    onChange={(e) => handleEducationDataChange(index, "universityName", e.target.value)}
                    placeholder="University Name"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {doctorateYear && (
              <div className="w-full relative">
                <select
                  value={data.yearOfCompletion}
                  onChange={(e) => handleEducationDataChange(index, "yearOfCompletion", e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>Year of Completion</option>
                  {generateYearOptions()}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {doctorateCoreSubjects && (
              <div className="w-full">
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
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.otherSubjects}
                    onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                    placeholder="Specify other subjects"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {doctorateMode && (
                <div className="w-full relative">
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
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
          </div>
        );
      case "nttMtt":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEasyMode ? (
                <div className="w-full md:w-1/2 relative">
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="" disabled>Year of Passing</option>
                    {generateYearOptions()}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              ) : (
                <>
                  <div className="w-full relative">
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
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.instituteName}
                      onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                      placeholder="Institute Name"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.affiliatedTo}
                      onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                      placeholder="Affiliated to / recognized by"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <Select
                      value={courseDurationOptions.find(option => option.value === data.courseDuration)}
                      onChange={(selected) => handleEducationDataChange(index, "courseDuration", selected ? selected.value : "")}
                      options={courseDurationOptions}
                      placeholder="Course Duration"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isClearable={false}
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
                  <div className="w-full relative">
                    <select
                      value={data.yearOfPassing}
                      onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Year of Passing</option>
                      {generateYearOptions()}
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="w-full">
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
                  </div>
                  <div className="w-full relative">
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
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {bEdCollege && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.instituteName}
                    onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                    placeholder="Institute / College name"
                    maxLength={30}
                    pattern="[a-zA-Z0-9 ]*"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                )}
              {bEdPlace && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.placeOfStudy}
                    onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                    placeholder="Place of Study"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {bEdAffiliated && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.affiliatedTo}
                    onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                    placeholder="Affiliated to / recognized by"
                    maxLength={30}
                    pattern="[a-zA-Z0-9 ]*"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {bEdCourseDuration && (
                <div className="w-full">
                  <Select
                    value={bEdCourseDurationOptions.find(option => option.value === data.courseDuration)}
                    onChange={(selected) => handleEducationDataChange(index, "courseDuration", selected ? selected.value : "")}
                    options={bEdCourseDurationOptions}
                    placeholder="Course Duration"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isClearable={false}
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
              )}
              {bEdYear && (
              <div className="w-full relative">
                <select
                  value={data.yearOfPassing}
                  onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                  required={data.courseStatus !== "Pursuing"}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>
                    {data.courseStatus === "Pursuing" ? "Expected Year of Completion (Optional)" : "Year of Passing"}
                  </option>
                  {generateYearOptions()}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {bEdCoreSubjects && (
              <div className="w-full">
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
              </div>
              )}
              {data.coreSubjects.includes("Others") && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.otherSubjects}
                    onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                    placeholder="Specify other subjects"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {bEdPercentage && (
                <div className="w-full">
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
                </div>
              )}
              {bEdMode && (
                <div className="w-full relative">
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
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
          </div>
        );
      case "certificate":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificateCourseStatus && (
              <div className="w-full relative">
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
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              )}
              {certificateName && (
              <div className="w-full">
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
              </div>
              )}
              {certificatePlace && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.placeOfStudy}
                    onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                    placeholder="Place of Study"
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {certificateCourseDuration && (
                <div className="w-full">
                  <Select
                    value={certificateCourseDurationOptions.find(option => option.value === data.courseDuration)}
                    onChange={(selected) => handleEducationDataChange(index, "courseDuration", selected ? selected.value : "")}
                    options={certificateCourseDurationOptions}
                    placeholder="Course Duration"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isClearable={false}
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
              )}
              <div className="w-full relative">
                <select
                  value={data.yearOfPassing}
                  onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="" disabled>Year of Passing</option>
                  {generateYearOptions()}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {certificateSpecialization && (
                <div className="w-full">
                  <input
                    type="text"
                    value={data.specialization}
                    onChange={(e) => handleEducationDataChange(index, "specialization", e.target.value)}
                    placeholder="Specialization"
                    maxLength={30}
                    pattern="[a-zA-Z0-9 ]*"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              )}
              {certificateMode && (
                <div className="w-full relative">
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
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
          </div>
        );
      case "dEd":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEasyMode ? (
                <div className="w-full md:w-1/2 relative">
                  <select
                    value={data.yearOfPassing}
                    onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    <option value="">Year of Passing</option>
                    {generateYearOptions()}
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              ) : (
                <>
                  <div className="w-full relative">
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
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.instituteName}
                      onChange={(e) => handleEducationDataChange(index, "instituteName", e.target.value)}
                      placeholder="Institute / College name"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.placeOfStudy}
                      onChange={(e) => handleEducationDataChange(index, "placeOfStudy", e.target.value)}
                      placeholder="Place of Study"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.affiliatedTo}
                      onChange={(e) => handleEducationDataChange(index, "affiliatedTo", e.target.value)}
                      placeholder="Affiliated to / recognized by"
                      maxLength={30}
                      pattern="[a-zA-Z0-9 ]*"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full">
                    <Select
                      value={dEdCourseDurationOptions.find(option => option.value === data.courseDuration)}
                      onChange={(selected) => handleEducationDataChange(index, "courseDuration", selected ? selected.value : "")}
                      options={dEdCourseDurationOptions}
                      placeholder="Course Duration"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isClearable={false}
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
                  <div className="w-full relative">
                    <select
                      value={data.yearOfPassing}
                      onChange={(e) => handleEducationDataChange(index, "yearOfPassing", e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Year of Passing</option>
                      {generateYearOptions()}
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="w-full">
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
                  {data.coreSubjects.includes("Others") && (
                    <div className="w-full">
                      <input
                        type="text"
                        value={data.otherSubjects}
                        onChange={(e) => handleEducationDataChange(index, "otherSubjects", e.target.value)}
                        placeholder="Specify other subjects"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                  )}
                  <div className="w-full">
                    <input
                      type="text"
                      value={data.percentage}
                      onChange={(e) => handleEducationDataChange(index, "percentage", e.target.value)}
                      placeholder="Percentage"
                      maxLength={5}
                      minLength={2}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                  <div className="w-full relative">
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
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
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
        if (!grade10Data.percentage || grade10Data.percentage.trim() === "") {
          errors.push("Please enter Grade 10 grade/percentage");
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
    <form onSubmit={handleSubmit} className="rounded-lg p-6" style={{backgroundColor: '#F0D8D9'}}>
      <div className="w-full space-y-6">
        {/* Grade 10 Section (Mandatory) */}
        <div>
          <h6 className="text-red-500 font-semibold mb-4">Grade 10</h6>
          {isEasyMode ? (
            <div className="w-full md:w-1/2">
              <TextField
                select
                label="Year of Passing"
                value={grade10Data.yearOfPassing}
                onChange={(e) => handleGrade10Change("yearOfPassing", e.target.value)}
                required
                fullWidth
                SelectProps={muiSelectProps}
                sx={muiTextFieldStyles}
              >
                {generateYearOptions().map((option) => (
                  <MenuItem key={option.props.value} value={option.props.value}>
                    {option.props.children}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <TextField
                  select
                  label="Syllabus"
                  value={grade10Data.syllabus || ""}
                  onChange={(e) => handleGrade10Change("syllabus", e.target.value)}
                  fullWidth
                  SelectProps={muiSelectProps}
                  sx={muiTextFieldStyles}
                >
                  <MenuItem value="" disabled>
                    Syllabus
                  </MenuItem>
                  {syllabusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="w-full">
                <TextField
                  label="School Name"
                  value={grade10Data.schoolName}
                  onChange={(e) => handleGrade10Change("schoolName", e.target.value)}
                  inputProps={{
                    pattern: "[a-zA-Z0-9 ]*",
                    maxLength: 30
                  }}
                  fullWidth
                  sx={muiTextFieldStyles}
                />
              </div>
              <div className="w-full">
                <TextField
                  select
                  label="Year of Passing"
                  value={grade10Data.yearOfPassing}
                  onChange={(e) => handleGrade10Change("yearOfPassing", e.target.value)}
                  required
                  fullWidth
                  SelectProps={muiSelectProps}
                  sx={muiTextFieldStyles}
                >
                  <MenuItem value="" disabled>
                    Year of Passing
                  </MenuItem>
                  {generateYearOptions().map((option) => (
                    <MenuItem key={option.props.value} value={option.props.value}>
                      {option.props.children}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="w-full">
                <TextField
                  label="Grade / Percentage"
                  value={grade10Data.percentage}
                  onChange={(e) => handleGrade10Change("percentage", e.target.value)}
                  inputProps={{
                    pattern: "[a-zA-Z0-9+%]*",
                    maxLength: 5,
                    minLength: 2
                  }}
                  fullWidth
                  sx={muiTextFieldStyles}
                />
              </div>
              <div className="w-full">
                <TextField
                  select
                  label="Mode of Study"
                  value={grade10Data.mode || ""}
                  onChange={(e) => handleGrade10Change("mode", e.target.value)}
                  fullWidth
                  SelectProps={muiSelectProps}
                  sx={muiTextFieldStyles}
                >
                  <MenuItem value="" disabled>
                    Mode of Study
                  </MenuItem>
                  {educationModeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </div>
          )}
        </div>
        {/* Additional Education Sections */}
        {additionalEducation.map((education, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-4">
              <h6 className="text-red-500 font-semibold">{educationTypes.find((type) => type.value === education.type)?.label}</h6>
              <button 
                type="button" 
                onClick={() => handleRemoveEducation(index)} 
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
              >
                Remove
              </button>
            </div>
            {renderEducationFields(education.type, education.data, index)}
          </div>
        ))}
        {/* Add More Education Section */}
        <div>
          <h6 className="text-red-500 font-semibold mb-4">Add More Education</h6>
          <div className="w-full md:w-1/2 relative">
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
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
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