import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import Select from "react-select";
import csc from "countries-states-cities";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Experience = forwardRef(({
  excludeAdditionalDetails,
  excludeTeachingCurriculum,
  excludeAdminCurriculum,
  excludeTeachingAdminCurriculum,
  excludeOtherTeaching,
  formData,
  updateFormData
}, ref) => {
  const { user } = useAuth();

  // Helper: Convert numeric or null => boolean
  const convertYesNo = (val) => Number(val) === 1;

  // ---------------------------
  // Base experience template
  // ---------------------------
  const baseExperience = {
    firebase_uid: user?.uid || "",
    adminCurriculum: "",
    jobCategory: "",
    jobProcess: "",
    jobType: "",
    otherAdminDesignation: "",
    otherTeachingAdminCoreExpertise: "",
    // paySlip removed
    teachingAdminSubjects: [],
    teachingDesignation: "",
    teachingSubjects: [],
    workProfile: "",
    adminDesignation: "",
    industryType: "",
    organizationName: "",
    otherAdminCurriculum: "",
    otherTeachingAdminCurriculum: "",
    otherTeachingAdminDesignation: "",
    otherTeachingAdminSubjects: "",
    otherTeachingCoreExpertise: "",
    otherTeachingCurriculum: "",
    otherTeachingDesignation: "",
    otherTeachingSubjects: "",
    salary: "",
    state: null,
    country: null,
    city: null,
    currentlyWorking: null,
    teachingAdminCoreExpertise: [],
    teachingAdminDesignations: [],
    teachingAdminGrades: [],
    teachingCoreExpertise: [],
    teachingCurriculum: "",
    teachingGrades: [],
    work_from_month: "",
    work_from_year: "",
    work_till_month: "",
    work_till_year: ""
  };

  // ---------------------------
  // Aggregated experience (MySQL-like)
  // ---------------------------
  const [workExperience, setWorkExperience] = useState({
    total: { years: "0", months: "0" },
    teaching: { years: "0", months: "0" },
    details: {
      teaching: {
        fullTime: { years: "0", months: "0" },
        partTime: { years: "0", months: "0" }
      },
      administration: {
        fullTime: { years: "0", months: "0" },
        partTime: { years: "0", months: "0" }
      },
      nonEducation: {
        fullTime: { years: "0", months: "0" },
        partTime: { years: "0", months: "0" }
      }
    }
  });

  // ---------------------------
  // Individual experience entries (DynamoDB)
  // ---------------------------
  const [experienceEntries, setExperienceEntries] = useState([]);

  // Date validation errors for each experience entry
  const [dateValidationErrors, setDateValidationErrors] = useState([]);
  
  // Track last shown toast errors to prevent spam
  const [lastToastErrors, setLastToastErrors] = useState([]);

  // Additional toggles for other teaching experiences
  const [otherTeachingExp, setOtherTeachingExp] = useState({
    edTechCompany: null,
    online: null,
    coachingTuition: null,
    groupTuitions: null,
    privateTuitions: null,
    homeTuitions: null
  });

  // Countries for location
  const allCountries = csc.getAllCountries().map((c) => ({
    value: c.id,
    label: c.name
  }));

  // Find India in the countries list
  const indiaOption = allCountries.find(country => country.label === "India") || null;

  // Subject/designation/grades/coreExpertise/curriculum
  const [subjectsOptions, setSubjectsOptions] = useState([]);
  const [teachingDesignations, setTeachingDesignations] = useState([]);
  const [adminDesignations, setAdminDesignations] = useState([]);
  const [teachingAdminDesignations, setTeachingAdminDesignations] = useState([]);
  const [coreExpertise, setCoreExpertise] = useState([]);
  const [grades, setGrades] = useState([]);
  const [curriculum, setCurriculum] = useState([]);

  // Year options
  const yearOptions = Array.from({ length: 31 }, (_, i) => (
    <option key={i} value={i}>
      {i} Years
    </option>
  ));

  // ---------------------------
  // Fetching data for subjects, designations, etc.
  // ---------------------------
  const subjectList = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_DEV1_API + "/education-data");
      const formattedSubjects = response.data.map((subject) => ({
        value: subject.value,
        label: subject.label
      }));
      setSubjectsOptions(formattedSubjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_DEV1_API + "/constants");
      const data = await response.json();
      const transformedData = data.map((item) => ({
        category: item.category,
        value: item.value,
        label: item.label
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
      console.error("Error fetching drop down data list:", error);
    }
  };

  useEffect(() => {
    subjectList();
    fetchDesignations();
  }, []);

  // ---------------------------
  // Revert location strings to {value, label} objects for react-select
  // ---------------------------
  const revertLocation = (entry) => {
    if (!entry.country && !entry.state && !entry.city) {
      return entry; // no location stored, return as is
    }

    // 1) Find matching country object by label
    const countryObj = allCountries.find((c) => c.label === entry.country) || null;

    let stateObj = null;
    let cityObj = null;

    if (countryObj) {
      const possibleStates = csc.getStatesOfCountry(countryObj.value).map((st) => ({
        value: st.id,
        label: st.name
      }));
      // 2) Find matching state object by label
      stateObj = possibleStates.find((s) => s.label === entry.state) || null;

      if (stateObj) {
        const possibleCities = csc.getCitiesOfState(stateObj.value).map((ct) => ({
          value: ct.id,
          label: ct.name
        }));
        // 3) Find matching city object by label
        cityObj = possibleCities.find((c) => c.label === entry.city) || null;
      }
    }

    return {
      ...entry,
      country: countryObj,
      state: stateObj,
      city: cityObj
    };
  };

  // ---------------------------
  // Helper function to convert years and months to total months
  // ---------------------------
  const convertToTotalMonths = (years, months) => {
    const y = parseInt(years) || 0;
    const m = parseInt(months) || 0;
    return (y * 12) + m;
  };

  // ---------------------------
  // Experience validation function
  // ---------------------------
  const validateExperienceValues = (totalExp, teachingExp) => {
    const totalMonths = convertToTotalMonths(totalExp.years, totalExp.months);
    const teachingMonths = convertToTotalMonths(teachingExp.years, teachingExp.months);
    
    if (teachingMonths > totalMonths) {
      toast.error("Teaching experience cannot be more than total experience");
      return false;
    }
    
    // Additional reasonable limits validation
    if (totalMonths > 50 * 12) { // More than 50 years
      toast.error("Total experience seems unusually high. Please verify.");
      return false;
    }
    
    return true;
  };

  // ---------------------------
  // Fetch existing experience data (MySQL + DynamoDB)
  // ---------------------------
  useEffect(() => {
    if (!user?.uid) return;

    const fetchExperienceData = async () => {
      try {
        const response = await axios.get(
          "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience",
          { params: { firebase_uid: user.uid } }
        );
        if (response.status === 200 && response.data) {
          const { mysqlData, dynamoData } = response.data;

          // ------------------ MySQL data ------------------
          if (Array.isArray(mysqlData) && mysqlData.length > 0) {
            const record = mysqlData[0];

            // Convert 1/0 => boolean for additional toggles
            setOtherTeachingExp({
              edTechCompany: convertYesNo(record.Ed_Tech_Company),
              online: convertYesNo(record.on_line),
              coachingTuition: convertYesNo(record.coaching_tuitions_center),
              groupTuitions: convertYesNo(record.group_tuitions),
              privateTuitions: convertYesNo(record.private_tuitions),
              homeTuitions: convertYesNo(record.home_tuitions)
            });

            // Set aggregated experience
            setWorkExperience((prev) => ({
              ...prev,
              total: {
                years: record.total_experience_years?.toString() || "0",
                months: record.total_experience_months?.toString() || "0"
              },
              teaching: {
                years: record.teaching_experience_years?.toString() || "0",
                months: record.teaching_experience_months?.toString() || "0"
              },
              details: {
                teaching: {
                  fullTime: {
                    years: record.teaching_exp_fulltime_years?.toString() || "0",
                    months: record.teaching_exp_fulltime_months?.toString() || "0"
                  },
                  partTime: {
                    years: record.teaching_exp_partime_years?.toString() || "0",
                    months: record.teaching_exp_partime_months?.toString() || "0"
                  }
                },
                administration: {
                  fullTime: {
                    years: record.administration_fulltime_years?.toString() || "0",
                    months: record.administration_fulltime_months?.toString() || "0"
                  },
                  partTime: {
                    years: record.administration_partime_years?.toString() || "0",
                    months: record.administration_parttime_months?.toString() || "0"
                  }
                },
                nonEducation: {
                  fullTime: {
                    years: record.anyrole_fulltime_years?.toString() || "0",
                    months: record.anyrole_fulltime_months?.toString() || "0"
                  },
                  partTime: {
                    years: record.anyrole_partime_years?.toString() || "0",
                    months: record.anyrole_parttime_months?.toString() || "0"
                  }
                }
              }
            }));
          }

          // ------------------ DynamoDB data ------------------
          // Ensure we actually have experienceEntries
          if (dynamoData && Array.isArray(dynamoData.experienceEntries)) {
            // Convert stored string-locations back to {value, label} objects
            const reverted = dynamoData.experienceEntries.map((exp) => revertLocation(exp));
            setExperienceEntries(reverted);
            // Initialize date validation errors array
            setDateValidationErrors(new Array(reverted.length).fill(false));
            setLastToastErrors(new Array(reverted.length).fill(null));
          }

          // After setting all states, validate and update parent
          // Pre-filled data is considered valid
          updateFormData({ 
            workExperience, 
            experienceEntries, 
            otherTeachingExp 
          }, true);
        }
      } catch (error) {
        console.error("Error fetching existing work experience:", error);
      }
    };

    fetchExperienceData();
  }, [user?.uid]);

  // ---------------------------
  // Date validation function
  // ---------------------------
  const validateDatesForEntry = (entry, index) => {
    if (!entry.currentlyWorking && entry.work_from_month && entry.work_from_year && entry.work_till_month && entry.work_till_year) {
      const fromYear = parseInt(entry.work_from_year, 10);
      const fromMonth = parseInt(entry.work_from_month, 10);
      const toYear = parseInt(entry.work_till_year, 10);
      const toMonth = parseInt(entry.work_till_month, 10);

      const fromDate = new Date(fromYear, fromMonth - 1);
      const toDate = new Date(toYear, toMonth - 1);

      if (fromDate >= toDate) {
        const errorMessage = `Experience ${index + 1}: 'Worked from' date must be earlier than 'Worked till' date.`;
        
        // Check if we haven't shown this exact error recently to prevent spam
        const errorKey = `${index}-date-error`;
        if (lastToastErrors[index] !== errorKey) {
          toast.error(errorMessage);
          setLastToastErrors(prev => {
            const newErrors = [...prev];
            newErrors[index] = errorKey;
            return newErrors;
          });
        }
        
        setDateValidationErrors(prev => {
          const newErrors = [...prev];
          newErrors[index] = true; // Just mark as having error
          return newErrors;
        });
        return false;
      } else {
        setDateValidationErrors(prev => {
          const newErrors = [...prev];
          newErrors[index] = false;
          return newErrors;
        });
        setLastToastErrors(prev => {
          const newErrors = [...prev];
          newErrors[index] = null;
          return newErrors;
        });
        return true;
      }
    } else {
      // Clear any existing error for this entry
      setDateValidationErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = false;
        return newErrors;
      });
      setLastToastErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = null;
        return newErrors;
      });
      return true;
    }
  };

  // ---------------------------
  // Add / Remove experience entries
  // ---------------------------
  const addNewExperience = () => {
    setExperienceEntries((prev) => [...prev, { 
      ...baseExperience,
      country: indiaOption  // Set India as default country
    }]);
    setDateValidationErrors(prev => [...prev, false]);
    setLastToastErrors(prev => [...prev, null]);
  };

  const removeExperience = (indexToRemove) => {
    setExperienceEntries((prev) => prev.filter((_, index) => index !== indexToRemove));
    setDateValidationErrors((prev) => prev.filter((_, index) => index !== indexToRemove));
    setLastToastErrors((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // ---------------------------
  // Transform data before POST
  // ---------------------------
  const transformExperienceEntries = (entries) => {
    return entries.map((entry) => ({
      ...entry,
      // Flatten the country/state/city to strings for storage
      country: entry.country ? entry.country.label : "",
      state: entry.state ? entry.state.label : "",
      city: entry.city ? entry.city.label : ""
    }));
  };

  // ---------------------------
  // Submit final data to API
  // ---------------------------
  const [isSaving, setIsSaving] = useState(false);

  const submitExperienceData = async () => {
    setIsSaving(true);
    try {
      // if (experienceEntries.length === 0) {
      //   toast.error("Please add at least one work experience.");
      //   return;
      // }

      // 1) Check if there are any date validation errors
      const hasDateErrors = dateValidationErrors.some(error => error === true);
      if (hasDateErrors) {
        toast.error("Please fix the date validation errors before saving.");
        setIsSaving(false);
        return;
      }

      // 2) Validate "Worked from" < "Worked till" for each entry (backup validation)
      for (let i = 0; i < experienceEntries.length; i++) {
        const exp = experienceEntries[i];
        // If user is not currently working, we check from < till
        if (!exp.currentlyWorking) {
          const fromYear = parseInt(exp.work_from_year, 10);
          const fromMonth = parseInt(exp.work_from_month, 10);
          const toYear = parseInt(exp.work_till_year, 10);
          const toMonth = parseInt(exp.work_till_month, 10);

          // Build date objects
          const fromDate = new Date(fromYear, fromMonth - 1);
          const toDate = new Date(toYear, toMonth - 1);

          if (fromDate >= toDate) {
            toast.error(
              `Entry #${i + 1}: 'Worked from' date must be earlier than 'Worked till' date.`
            );
            setIsSaving(false);
            return; // Stop submission
          }
        }
      }

      // Build final payload
      const experienceData = {
        firebase_uid: user.uid,
        mysqlDB: {
          firebase_uid: user.uid,
          total_experience_years: workExperience.total.years,
          total_experience_months: workExperience.total.months,
          teaching_experience_years: workExperience.teaching.years,
          teaching_experience_months: workExperience.teaching.months,
          teaching_exp_fulltime_years: workExperience.details.teaching.fullTime.years,
          teaching_exp_fulltime_months: workExperience.details.teaching.fullTime.months,
          teaching_exp_partime_years: workExperience.details.teaching.partTime.years,
          teaching_exp_partime_months: workExperience.details.teaching.partTime.months,
          administration_fulltime_years:
            workExperience.details.administration.fullTime.years,
          administration_fulltime_months:
            workExperience.details.administration.fullTime.months,
          administration_partime_years:
            workExperience.details.administration.partTime.years,
          administration_parttime_months:
            workExperience.details.administration.partTime.months,
          anyrole_fulltime_years: workExperience.details.nonEducation.fullTime.years,
          anyrole_fulltime_months: workExperience.details.nonEducation.fullTime.months,
          anyrole_partime_years: workExperience.details.nonEducation.partTime.years,
          anyrole_parttime_months: workExperience.details.nonEducation.partTime.months,
          // Convert boolean => 1 or 0
          Ed_Tech_Company: otherTeachingExp.edTechCompany ? 1 : 0,
          on_line: otherTeachingExp.online ? 1 : 0,
          coaching_tuitions_center: otherTeachingExp.coachingTuition ? 1 : 0,
          group_tuitions: otherTeachingExp.groupTuitions ? 1 : 0,
          private_tuitions: otherTeachingExp.privateTuitions ? 1 : 0,
          home_tuitions: otherTeachingExp.homeTuitions ? 1 : 0
        },
        dynamoDB: transformExperienceEntries(experienceEntries)
      };

      const response = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience",
        experienceData,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Data submitted successfully:", response.data);
      toast.success("Experience data submitted successfully");
    } catch (error) {
      console.error("Error saving experience details:", error);
      toast.error("Failed to save experience details");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add validation function
  const validateExperience = () => {
    // 1. Validate total and teaching experience
    const isTotalExperienceValid = workExperience.total.years !== "" && 
                                 workExperience.total.months !== "";
    const isTeachingExperienceValid = workExperience.teaching.years !== "" && 
                                    workExperience.teaching.months !== "";
    
    // 2. Validate teaching experience doesn't exceed total experience
    const isExperienceLogicallyValid = validateExperienceValues(workExperience.total, workExperience.teaching);

    // 2. Validate experience entries if they exist
    const areEntriesValid = experienceEntries.every(exp => {
      const baseFieldsValid = exp.organizationName && 
                            exp.jobCategory && 
                            exp.jobType && 
                            exp.currentlyWorking !== null && 
                            exp.work_from_month && 
                            exp.work_from_year && 
                            exp.salary && 
                            exp.country && 
                            exp.state && 
                            exp.jobProcess;

      // If not currently working, check work_till dates
      if (exp.currentlyWorking === false) {
        if (!exp.work_till_month || !exp.work_till_year) return false;
      }

      // Additional validation based on job type
      switch (exp.jobType) {
        case 'teaching':
          return baseFieldsValid && exp.teachingDesignation && 
                 exp.teachingSubjects.length > 0 && 
                 exp.teachingGrades.length > 0;
        case 'administration':
          return baseFieldsValid && exp.adminDesignation;
        case 'teachingAndAdministration':
          return baseFieldsValid && 
                 exp.teachingAdminDesignations.length > 0 && 
                 exp.teachingAdminSubjects.length > 0 && 
                 exp.teachingAdminGrades.length > 0;
        case 'nonEducation':
          return baseFieldsValid && exp.designation && 
                 exp.industryType && exp.workProfile;
        default:
          return baseFieldsValid;
      }
    });

    // 3. Validate other teaching experiences (all radio buttons should be selected)
    const isOtherTeachingExpValid = Object.values(otherTeachingExp)
      .every(value => value !== null);

    return isTotalExperienceValid && 
           isTeachingExperienceValid && 
           isExperienceLogicallyValid &&
           (experienceEntries.length === 0 || areEntriesValid) && 
           isOtherTeachingExpValid;
  };

  // Modify state update handlers to include validation
  const handleExperienceChange = (newExperienceEntries) => {
    setExperienceEntries(newExperienceEntries);
    const isValid = validateExperience();
    updateFormData({
      workExperience,
      experienceEntries: newExperienceEntries,
      otherTeachingExp
    }, isValid);
  };

  const handleWorkExperienceChange = (newWorkExperience) => {
    setWorkExperience(newWorkExperience);
    const isValid = validateExperience();
    updateFormData({
      workExperience: newWorkExperience,
      experienceEntries,
      otherTeachingExp
    }, isValid);
  };

  const handleOtherTeachingExpChange = (newOtherTeachingExp) => {
    setOtherTeachingExp(newOtherTeachingExp);
    const isValid = validateExperience();
    updateFormData({
      workExperience,
      experienceEntries,
      otherTeachingExp: newOtherTeachingExp
    }, isValid);
  };

  // Add useImperativeHandle before the return statement
  useImperativeHandle(ref, () => ({
    validateFields: () => {
      const errors = [];
      
      // Validate total experience
      if (!workExperience.total.years || !workExperience.total.months) {
        errors.push("Total experience (years and months) is required");
      }

      // Validate teaching experience
      if (!workExperience.teaching.years || !workExperience.teaching.months) {
        errors.push("Teaching experience (years and months) is required");
      }

      // Validate teaching experience doesn't exceed total experience
      if (workExperience.total.years && workExperience.total.months && 
          workExperience.teaching.years && workExperience.teaching.months) {
        const totalMonths = convertToTotalMonths(workExperience.total.years, workExperience.total.months);
        const teachingMonths = convertToTotalMonths(workExperience.teaching.years, workExperience.teaching.months);
        
        if (teachingMonths > totalMonths) {
          errors.push("Teaching experience cannot be more than total experience");
        }
        
        if (totalMonths > 50 * 12) {
          errors.push("Total experience seems unusually high. Please verify.");
        }
      }

      // Validate experience entries if they exist
      if (experienceEntries.length > 0) {
        experienceEntries.forEach((entry, index) => {
          // Basic required fields for all job types
          if (!entry.organizationName?.trim()) {
            errors.push(`Experience ${index + 1}: Organization name is required`);
          }
          if (!entry.jobCategory) {
            errors.push(`Experience ${index + 1}: Job category is required`);
          }
          if (!entry.jobType) {
            errors.push(`Experience ${index + 1}: Job type is required`);
          }
          if (!entry.currentlyWorking && entry.currentlyWorking !== false) {
            errors.push(`Experience ${index + 1}: Please specify if you are currently working here`);
          }
          if (!entry.work_from_month || !entry.work_from_year) {
            errors.push(`Experience ${index + 1}: Work from date is required`);
          }
          if (!entry.currentlyWorking && (!entry.work_till_month || !entry.work_till_year)) {
            errors.push(`Experience ${index + 1}: Work till date is required`);
          }
          if (!entry.salary) {
            errors.push(`Experience ${index + 1}: Salary is required`);
          }
          if (!entry.country) {
            errors.push(`Experience ${index + 1}: Country is required`);
          }
          if (!entry.state) {
            errors.push(`Experience ${index + 1}: State is required`);
          }
          if (!entry.city) {
            errors.push(`Experience ${index + 1}: City is required`);
          }
          if (!entry.jobProcess) {
            errors.push(`Experience ${index + 1}: Job process is required`);
          }

          // Job type specific validations
          switch (entry.jobType) {
            case 'teaching':
              if (!entry.teachingDesignation) {
                errors.push(`Experience ${index + 1}: Teaching designation is required`);
              }
              if (!entry.teachingSubjects || entry.teachingSubjects.length === 0) {
                errors.push(`Experience ${index + 1}: At least one teaching subject is required`);
              }
              if (!entry.teachingGrades || entry.teachingGrades.length === 0) {
                errors.push(`Experience ${index + 1}: At least one teaching grade is required`);
              }
              if (!entry.teachingCoreExpertise || entry.teachingCoreExpertise.length === 0) {
                errors.push(`Experience ${index + 1}: At least one core expertise is required`);
              }
              break;

            case 'administration':
              if (!entry.adminDesignation) {
                errors.push(`Experience ${index + 1}: Administrative designation is required`);
              }
              break;

            case 'teachingAndAdministration':
              if (!entry.teachingAdminDesignations || entry.teachingAdminDesignations.length === 0) {
                errors.push(`Experience ${index + 1}: At least one teaching/admin designation is required`);
              }
              if (!entry.teachingAdminSubjects || entry.teachingAdminSubjects.length === 0) {
                errors.push(`Experience ${index + 1}: At least one subject is required`);
              }
              if (!entry.teachingAdminGrades || entry.teachingAdminGrades.length === 0) {
                errors.push(`Experience ${index + 1}: At least one grade is required`);
              }
              if (!entry.teachingAdminCoreExpertise || entry.teachingAdminCoreExpertise.length === 0) {
                errors.push(`Experience ${index + 1}: At least one core expertise is required`);
              }
              break;

          }
        });
      }

      // Validate other teaching experiences
      // if (!excludeOtherTeaching) {
      //   Object.entries(otherTeachingExp).forEach(([key, value]) => {
      //     if (value === null) {
           
      //       errors.push("please complete the other teaching experience section");
      //     }
      //   });
      // }

      return {
        isValid: errors.length === 0,
        errors
      };
    },
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your experience details.");
      }

      // Check if there are any date validation errors
      const hasDateErrors = dateValidationErrors.some(error => error === true);
      if (hasDateErrors) {
        throw new Error("Please fix the date validation errors before saving.");
      }

      // Validate "Worked from" < "Worked till" for each entry
      for (let i = 0; i < experienceEntries.length; i++) {
        const exp = experienceEntries[i];
        if (!exp.currentlyWorking) {
          const fromYear = parseInt(exp.work_from_year, 10);
          const fromMonth = parseInt(exp.work_from_month, 10);
          const toYear = parseInt(exp.work_till_year, 10);
          const toMonth = parseInt(exp.work_till_month, 10);

          const fromDate = new Date(fromYear, fromMonth - 1);
          const toDate = new Date(toYear, toMonth - 1);

          if (fromDate >= toDate) {
            throw new Error(`Entry #${i + 1}: 'Worked from' date must be earlier than 'Worked till' date.`);
          }
        }
      }

      // Build final payload
      const experienceData = {
        firebase_uid: user.uid,
        mysqlDB: {
          firebase_uid: user.uid,
          total_experience_years: workExperience.total.years,
          total_experience_months: workExperience.total.months,
          teaching_experience_years: workExperience.teaching.years,
          teaching_experience_months: workExperience.teaching.months,
          teaching_exp_fulltime_years: workExperience.details.teaching.fullTime.years,
          teaching_exp_fulltime_months: workExperience.details.teaching.fullTime.months,
          teaching_exp_partime_years: workExperience.details.teaching.partTime.years,
          teaching_exp_partime_months: workExperience.details.teaching.partTime.months,
          administration_fulltime_years: workExperience.details.administration.fullTime.years,
          administration_fulltime_months: workExperience.details.administration.fullTime.months,
          administration_partime_years: workExperience.details.administration.partTime.years,
          administration_parttime_months: workExperience.details.administration.partTime.months,
          anyrole_fulltime_years: workExperience.details.nonEducation.fullTime.years,
          anyrole_fulltime_months: workExperience.details.nonEducation.fullTime.months,
          anyrole_partime_years: workExperience.details.nonEducation.partTime.years,
          anyrole_parttime_months: workExperience.details.nonEducation.partTime.months,
          Ed_Tech_Company: otherTeachingExp.edTechCompany ? 1 : 0,
          on_line: otherTeachingExp.online ? 1 : 0,
          coaching_tuitions_center: otherTeachingExp.coachingTuition ? 1 : 0,
          group_tuitions: otherTeachingExp.groupTuitions ? 1 : 0,
          private_tuitions: otherTeachingExp.privateTuitions ? 1 : 0,
          home_tuitions: otherTeachingExp.homeTuitions ? 1 : 0
        },
        dynamoDB: transformExperienceEntries(experienceEntries)
      };

      const response = await axios.post(
        "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience",
        experienceData,
        { headers: { "Content-Type": "application/json" } }
      );
      
      console.log("Experience data saved successfully");
      return { success: true, data: response.data };
    }
  }));

  return (
    <div className="work-experience-section">
      {/* Total and Teaching Experience */}
      <div className="experience-row">
        <div className="experience-col">
          <h4 style={{color:"brown"}}>Total Experience (Full Time + Part Time)</h4>
          <div className="duration-selector">
            <select
              value={workExperience.total.years}
              onChange={(e) => {
                const newWorkExperience = {
                  ...workExperience,
                  total: { ...workExperience.total, years: e.target.value }
                };
                setWorkExperience(newWorkExperience);
                // Validate after state update
                setTimeout(() => {
                  validateExperienceValues(newWorkExperience.total, newWorkExperience.teaching);
                }, 0);
              }}
              required
            >
              <option value="">Years</option>
              {yearOptions}
            </select>
            <select
              value={workExperience.total.months}
              onChange={(e) => {
                const newWorkExperience = {
                  ...workExperience,
                  total: { ...workExperience.total, months: e.target.value }
                };
                setWorkExperience(newWorkExperience);
                // Validate after state update
                setTimeout(() => {
                  validateExperienceValues(newWorkExperience.total, newWorkExperience.teaching);
                }, 0);
              }}
              
            >
              <option value="">Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {i} Months
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="experience-col">
          <h4 style={{color:"brown"}}>Total Teaching Exp (Full Time + Part Time)</h4>
          <div className="duration-selector">
            <select
              value={workExperience.teaching.years}
              onChange={(e) => {
                const newWorkExperience = {
                  ...workExperience,
                  teaching: { ...workExperience.teaching, years: e.target.value }
                };
                setWorkExperience(newWorkExperience);
                // Validate after state update
                setTimeout(() => {
                  validateExperienceValues(newWorkExperience.total, newWorkExperience.teaching);
                }, 0);
              }}
              required
            >
              <option value="">Years</option>
              {yearOptions}
            </select>
            <select
              value={workExperience.teaching.months}
              onChange={(e) => {
                const newWorkExperience = {
                  ...workExperience,
                  teaching: { ...workExperience.teaching, months: e.target.value }
                };
                setWorkExperience(newWorkExperience);
                // Validate after state update
                setTimeout(() => {
                  validateExperienceValues(newWorkExperience.total, newWorkExperience.teaching);
                }, 0);
              }}
              
            >
              <option value="">Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {i} Months
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Additional Details
      {excludeAdditionalDetails && (
        <div className="experience-details form-group col-md-12 col-lg-12">
          <h4 style={{color:"brown"}}>Additional Details</h4>
          <table className="experience-table">
            <thead>
              <tr>
                <th>Job Category</th>
                <th>Full Time</th>
                <th>Part Time</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries({
                teaching: "Education - Teaching",
                administration: "Education - Administration",
                nonEducation: "Non-Education (Any Role)"
              }).map(([key, label]) => (
                <tr key={key}>
                  <td data-label="Job Category">{label}</td>
                  <td data-label="Full Time">
                    <div className="duration-selector">
                      <select
                        value={workExperience.details[key].fullTime.years}
                        onChange={(e) =>
                          setWorkExperience((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              [key]: {
                                ...prev.details[key],
                                fullTime: {
                                  ...prev.details[key].fullTime,
                                  years: e.target.value
                                }
                              }
                            }
                          }))
                        }
                      >
                        {yearOptions}
                      </select>
                      <select
                        value={workExperience.details[key].fullTime.months}
                        onChange={(e) =>
                          setWorkExperience((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              [key]: {
                                ...prev.details[key],
                                fullTime: {
                                  ...prev.details[key].fullTime,
                                  months: e.target.value
                                }
                              }
                            }
                          }))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {i} Months
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td data-label="Part Time">
                    <div className="duration-selector">
                      <select
                        value={workExperience.details[key].partTime.years}
                        onChange={(e) =>
                          setWorkExperience((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              [key]: {
                                ...prev.details[key],
                                partTime: {
                                  ...prev.details[key].partTime,
                                  years: e.target.value
                                }
                              }
                            }
                          }))
                        }
                      >
                        {yearOptions}
                      </select>
                      <select
                        value={workExperience.details[key].partTime.months}
                        onChange={(e) =>
                          setWorkExperience((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              [key]: {
                                ...prev.details[key],
                                partTime: {
                                  ...prev.details[key].partTime,
                                  months: e.target.value
                                }
                              }
                            }
                          }))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {i} Months
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )} */}

      {/* Experience entries */}
      {experienceEntries.map((experience, index) => {
        const statesInCountry = experience.country
          ? csc.getStatesOfCountry(experience.country.value).map((st) => ({
              value: st.id,
              label: st.name
            }))
          : [];
        const citiesInState = experience.state
          ? csc.getCitiesOfState(experience.state.value).map((ct) => ({
              value: ct.id,
              label: ct.name
            }))
          : [];

        return (
          <div key={index} className="experience-entry">
            <div className="d-flex justify-content-between align-items-center">
              <h5 style={{color:"brown"}}>Experience Details {index + 1}</h5>
              {experienceEntries.length > 1 && (
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeExperience(index)}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="row">
              {/* Organization Name */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <input
                  type="text"
                  className="form-control"
                  maxLength="20"
                  value={experience.organizationName}
                  onChange={(e) => {
                    const newArr = [...experienceEntries];
                    newArr[index].organizationName = e.target.value;
                    setExperienceEntries(newArr);
                  }}
                  placeholder="Name of the organization"
                  required
                />
                <span className="custom-tooltip">Name of the organization</span>
                </div>
              </div>

              {/* Job Category */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <select
                  className="custom-select"
                  value={experience.jobCategory || ""}
                  onChange={(e) => {
                    const newArr = [...experienceEntries];
                    newArr[index].jobCategory = e.target.value;
                    setExperienceEntries(newArr);
                  }}
                  required
                >
                  <option value="" disabled>Job Category</option>
                  <option value="fullTime">Full Time</option>
                  <option value="partTime">Part Time</option>
                </select>
                <span className="custom-tooltip">Job Category</span>
                </div>
              </div>

              {/* Job Type */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <select
                  className="form-select"
                  value={experience.jobType}
                  onChange={(e) => {
                    const newArr = [...experienceEntries];
                    newArr[index].jobType = e.target.value;
                    setExperienceEntries(newArr);
                  }}
                  required
                >
                  <option value="" disabled>Job Type</option>
                  <option value="teaching">Education - Teaching</option>
                  <option value="administration">Non - Teaching</option>
                  <option value="teachingAndAdministration">
                    Education - Teaching + Non - Teaching
                  </option>
                </select>
                <span className="custom-tooltip">Job Type</span>
                </div>
              </div>

              {/* Currently Working */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <select
                  className="custom-select"
                  value={
                    experience.currentlyWorking === null
                      ? ""
                      : experience.currentlyWorking
                      ? "yes"
                      : "no"
                  }
                  onChange={(e) => {
                    const newArr = [...experienceEntries];
                    newArr[index].currentlyWorking = e.target.value === "yes";
                    setExperienceEntries(newArr);
                    // Validate dates after updating
                    setTimeout(() => validateDatesForEntry(newArr[index], index), 0);
                  }}
                  required
                >
                  <option value="" disabled>Are you currently working here?</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <span className="custom-tooltip">Are you currently working here?</span>
                </div>
              </div>

              {/* Work Period: From */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <label>Worked from</label>
                <div className="date-selector" style={{ display: "flex", gap: 5 }}>
                  <select
                    value={experience.work_from_month}
                    onChange={(e) => {
                      const newArr = [...experienceEntries];
                      newArr[index].work_from_month = e.target.value;
                      setExperienceEntries(newArr);
                      // Validate dates after updating
                      setTimeout(() => validateDatesForEntry(newArr[index], index), 0);
                    }}
                    required
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleString("default", {
                          month: "long"
                        })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={experience.work_from_year}
                    onChange={(e) => {
                      const newArr = [...experienceEntries];
                      newArr[index].work_from_year = e.target.value;
                      setExperienceEntries(newArr);
                      // Validate dates after updating
                      setTimeout(() => validateDatesForEntry(newArr[index], index), 0);
                    }}
                    required
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 50 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <span className="custom-tooltip">Worked from</span>
                </div>
              </div>

              {/* Work Period: Till */}
              {!experience.currentlyWorking && (
                <div className="form-group col-lg-6 col-md-12">
                  <div className="input-wrapper">
                  <label>Worked till</label>
                  <div className="date-selector" style={{ display: "flex", gap: 5 }}>
                    <select
                      value={experience.work_till_month}
                      onChange={(e) => {
                        const newArr = [...experienceEntries];
                        newArr[index].work_till_month = e.target.value;
                        setExperienceEntries(newArr);
                        // Validate dates after updating
                        setTimeout(() => validateDatesForEntry(newArr[index], index), 0);
                      }}
                      required
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {new Date(2000, i, 1).toLocaleString("default", {
                            month: "long"
                          })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={experience.work_till_year}
                      onChange={(e) => {
                        const newArr = [...experienceEntries];
                        newArr[index].work_till_year = e.target.value;
                        setExperienceEntries(newArr);
                        // Validate dates after updating
                        setTimeout(() => validateDatesForEntry(newArr[index], index), 0);
                      }}
                      required
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 50 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <span className="custom-tooltip">Worked till</span>
                  </div>
                </div>
              )}

              {/* Salary */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <label>Salary</label>
                <div className="salary-input d-flex align-items-center">
                  <span>Rs.</span>
                  <input
                    required
                    type="number"
                    className="form-control"
                    step="0.1"
                    min="0"
                    value={experience.salary}
                    onChange={(e) => {
                      const newArr = [...experienceEntries];
                      newArr[index].salary = e.target.value;
                      setExperienceEntries(newArr);
                    }}
                    placeholder="Salary"
                    style={{ maxWidth: "200px", marginLeft: 8, marginRight: 8 }}
                  />
                  {experience.jobCategory === "fullTime" ? "in LPA" : "per hour"}
                </div>
                <span className="custom-tooltip">Salary</span>
                </div>
              </div>

              {/* TEACHING FIELDS */}
              {experience.jobType === "teaching" && (
                <div className="row">
                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      options={teachingDesignations}
                      value={teachingDesignations.find(
                        (opt) => opt.value === experience.teachingDesignation
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingDesignation = selected?.value || "";
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Teaching designation"
                      isClearable
                      className={`custom-select ${
                        !experience.teachingDesignation ? "required" : ""
                      }`}
                    />
                    <span className="custom-tooltip">Teaching designation</span>
                    </div>
                  </div>
                  {experience.teachingDesignation === "Others" && (
                    <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingDesignation}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingDesignation = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other designation"
                        required
                      />
                      <span className="custom-tooltip">Specify other designation</span>
                    </div>
                    </div>
                  )}

                  {excludeTeachingCurriculum && (
                    <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                      <Select
                        options={curriculum}
                        value={curriculum.find(
                          (opt) => opt.value === experience.teachingCurriculum
                        )}
                        onChange={(selected) => {
                          const newArr = [...experienceEntries];
                          newArr[index].teachingCurriculum = selected?.value || "";
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Curriculum"
                        isClearable
                      />
                      <span className="custom-tooltip">Curriculum</span>
                      </div>
                    </div>
                  )}
                  {experience.teachingCurriculum === "Others" && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingCurriculum}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingCurriculum = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other curriculum"
                      />
                      <span className="custom-tooltip">Specify other curriculum</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={subjectsOptions}
                      value={subjectsOptions.filter((opt) =>
                        experience.teachingSubjects.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingSubjects = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Subjects you handled"
                      isClearable
                      className={`custom-select ${
                        experience.teachingSubjects && experience.teachingSubjects.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Subjects you handled</span>
                    </div>
                  </div>
                  {experience.teachingSubjects.includes("Others") && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingSubjects}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingSubjects = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other subjects"
                        required
                      />
                      <span className="custom-tooltip">Specify other subjects</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={grades}
                      value={grades.filter((opt) =>
                        experience.teachingGrades.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingGrades = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Grades you handled"
                      isClearable
                      className={`custom-select ${
                        experience.teachingGrades && experience.teachingGrades.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Grades you handled</span>
                    </div>
                  </div>

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={coreExpertise}
                      value={coreExpertise.filter((opt) =>
                        experience.teachingCoreExpertise.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingCoreExpertise = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Core Expertise"
                      isClearable
                      className={`custom-select ${
                        experience.teachingCoreExpertise &&
                        experience.teachingCoreExpertise.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Core Expertise</span>
                    </div>
                  </div>
                  {experience.teachingCoreExpertise.includes("Others") && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingCoreExpertise}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingCoreExpertise =
                            e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other core expertise"
                        required
                      />
                      <span className="custom-tooltip">Specify other core expertise</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN FIELDS */}
              {experience.jobType === "administration" && (
                <div className="row">
                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      options={adminDesignations}
                      value={adminDesignations.find(
                        (opt) => opt.value === experience.adminDesignation
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].adminDesignation = selected?.value || "";
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Designation"
                      isClearable
                      className={`custom-select ${
                        !experience.adminDesignation ? "required" : ""
                      }`}
                    />
                    <span className="custom-tooltip">Designation</span>
                    </div>
                  </div>
                  {experience.adminDesignation === "Others" && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherAdminDesignation}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherAdminDesignation = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other designation"
                        required
                      />
                      <span className="custom-tooltip">Specify other designation</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEACHING + ADMIN FIELDS */}
              {experience.jobType === "teachingAndAdministration" && (
                <div className="row">
                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={teachingAdminDesignations}
                      value={teachingAdminDesignations.filter((opt) =>
                        experience.teachingAdminDesignations.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingAdminDesignations = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Designation"
                      isClearable
                      className={`custom-select ${
                        experience.teachingAdminDesignations &&
                        experience.teachingAdminDesignations.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Designation</span>
                    </div>
                  </div>
                  {experience.teachingAdminDesignations.includes("Others") && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingAdminDesignation}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingAdminDesignation = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other designation"
                        required
                      />
                      <span className="custom-tooltip">Specify other designation</span>
                      </div>
                    </div>
                  )}

                  {excludeTeachingAdminCurriculum && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <Select
                        options={curriculum}
                        value={curriculum.find(
                          (opt) => opt.value === experience.teachingAdminCurriculum
                        )}
                        onChange={(selected) => {
                          const newArr = [...experienceEntries];
                          newArr[index].teachingAdminCurriculum =
                            selected?.value || "";
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Curriculum"
                        isClearable
                      />
                      <span className="custom-tooltip">Curriculum</span>
                      </div>
                    </div>
                  )}
                  {experience.teachingAdminCurriculum === "Others" && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingAdminCurriculum}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingAdminCurriculum = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other curriculum"
                      />
                      <span className="custom-tooltip">Specify other curriculum</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={subjectsOptions}
                      value={subjectsOptions.filter((opt) =>
                        experience.teachingAdminSubjects.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingAdminSubjects = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Subjects you handled"
                      isClearable
                      className={`custom-select ${
                        experience.teachingAdminSubjects &&
                        experience.teachingAdminSubjects.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Subjects you handled</span>
                    </div>
                  </div>
                  {experience.teachingAdminSubjects.includes("Others") && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingAdminSubjects}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingAdminSubjects = e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other subjects"
                      />
                      <span className="custom-tooltip">Specify other subjects</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={grades}
                      value={grades.filter((opt) =>
                        experience.teachingAdminGrades.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingAdminGrades = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Grades you handled"
                      isClearable
                      className={`custom-select ${
                        experience.teachingAdminGrades &&
                        experience.teachingAdminGrades.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Grades you handled</span>
                    </div>
                  </div>

                  <div className="form-group col-lg-6 col-md-12">
                    <div className="input-wrapper">
                    <Select
                      isMulti
                      options={coreExpertise}
                      value={coreExpertise.filter((opt) =>
                        experience.teachingAdminCoreExpertise.includes(opt.value)
                      )}
                      onChange={(selected) => {
                        const newArr = [...experienceEntries];
                        newArr[index].teachingAdminCoreExpertise = selected
                          ? selected.map((item) => item.value)
                          : [];
                        setExperienceEntries(newArr);
                      }}
                      placeholder="Core Expertise"
                      isClearable
                      className={`custom-select ${
                        experience.teachingAdminCoreExpertise &&
                        experience.teachingAdminCoreExpertise.length
                          ? ""
                          : "required"
                      }`}
                    />
                    <span className="custom-tooltip">Core Expertise</span>
                    </div>
                  </div>

                  {experience.teachingAdminCoreExpertise.includes("Others") && (
                    <div className="form-group col-lg-6 col-md-12">
                      <div className="input-wrapper">
                      <input
                        type="text"
                        value={experience.otherTeachingAdminCoreExpertise}
                        onChange={(e) => {
                          const newArr = [...experienceEntries];
                          newArr[index].otherTeachingAdminCoreExpertise =
                            e.target.value;
                          setExperienceEntries(newArr);
                        }}
                        placeholder="Specify other core expertise"
                        required
                      />
                      <span className="custom-tooltip">Specify other core expertise</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Country */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <Select
                  placeholder="Country"
                  options={allCountries}
                  value={experience.country}
                  onChange={(option) => {
                    const newArr = [...experienceEntries];
                    newArr[index].country = option;
                    newArr[index].state = null;
                    newArr[index].city = null;
                    setExperienceEntries(newArr);
                  }}
                  className={`custom-select ${!experience.country ? "required" : ""}`}
                />
                <span className="custom-tooltip">Country</span>
                </div>
              </div>

              {/* State */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <Select
                  placeholder="State / UT"
                  options={statesInCountry}
                  value={experience.state}
                  onChange={(option) => {
                    const newArr = [...experienceEntries];
                    newArr[index].state = option;
                    newArr[index].city = null;
                    setExperienceEntries(newArr);
                  }}
                  className={`custom-select ${!experience.state ? "required" : ""}`}
                />
                <span className="custom-tooltip">State / UT</span>
                </div>
              </div>

              {/* City */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <Select
                  placeholder="City"
                  options={citiesInState}
                  value={experience.city}
                  onChange={(option) => {
                    const newArr = [...experienceEntries];
                    newArr[index].city = option;
                    setExperienceEntries(newArr);
                  }}
                  className={`custom-select ${!experience.city ? "required" : ""}`}
                />
                <span className="custom-tooltip">City</span>
                </div>
              </div>

              {/* Job Process */}
              <div className="form-group col-lg-6 col-md-12">
                <div className="input-wrapper">
                <select
                  className="form-select"
                  value={experience.jobProcess}
                  onChange={(e) => {
                    const newArr = [...experienceEntries];
                    newArr[index].jobProcess = e.target.value;
                    setExperienceEntries(newArr);
                  }}
                  required
                >
                  <option value="" disabled>Job Process</option>
                  <option value="regular">Regular (Offline)</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <span className="custom-tooltip">Job Process</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="add-experience-btn-wrapper col-lg-12 col-md-12 text-center">
        <button
          type="button"
          className="theme-btn btn-style-three"
          onClick={addNewExperience}
        >
          Add Experience Details +
        </button>
      </div>

      {/* Other Teaching Experiences */}
      {(!excludeOtherTeaching && 
      <div className="other-teaching-experience mt-4">
        <h5 style={{color:"brown",paddingLeft:"10px"}}>Other Teaching Experiences</h5>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Experience</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "edTechCompany", label: "Worked in Edu tech.companies ?" },
                { key: "online", label: "Experience of content preparation ?" },
                { key: "coachingTuition", label: "Expertise of handling online classes ?" },
                { key: "groupTuitions", label: "Experience of working in Coaching / Tuition Centers ?" },
                { key: "privateTuitions", label: "Experience of handling Personal / Home tuitions ? " },
              ].map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    <div className="radio-group" style={{ display: "flex", gap: 10 }}>
                      <div>
                        <input
                          type="radio"
                          name={key}
                          value="yes"
                          checked={otherTeachingExp[key] === true}
                          onChange={() =>
                            {
                              const newExp = { ...otherTeachingExp, [key]: true };
                              setOtherTeachingExp(newExp);
                              handleOtherTeachingExpChange(newExp);
                            }
                          }
                        />
                        <span style={{ marginLeft: 5 }}>Yes</span>
                      </div>
                      <div>
                        <input
                          type="radio"
                          name={key}
                          value="no"
                          checked={otherTeachingExp[key] === false}
                          onChange={() =>
                            {
                              const newExp = { ...otherTeachingExp, [key]: false };
                              setOtherTeachingExp(newExp);
                              handleOtherTeachingExpChange(newExp);
                            }
                          }
                        />
                        <span style={{ marginLeft: 5 }}>No</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Save button hidden - auto-save handles saving when clicking Next */}
  </div>
  );
});

Experience.displayName = 'Experience';

export default Experience;