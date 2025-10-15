import { React, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import PersonalDetails from "./personalDetails";
import Address from "./address";
import Languages from "./languages";
import Education from "./Education";
import Experience from "./experience";
import JobPreferences from "./jobPreferences";
import Social from "./social";
import AdditionalInfo from "./additionalInfo";
import Easyview from "./Easyview";
import Fullview from "./Fullview";
import "./formInfo.css";
import { toast } from "react-toastify";
import MediaUpload from "./MediaUpload";
import ProfileCompletionPopup from "../../Dashboard/Components/ProfileCompletionPopup";
import axios from "axios";


const FormInfoBox = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const stepRefs = useRef([]);
  const [validatedSteps, setValidatedSteps] = useState(new Set());
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isViewAttempted, setIsViewAttempted] = useState(false);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [savedSteps, setSavedSteps] = useState(new Set());
  const [stepFormData, setStepFormData] = useState({}); // Store data for each step
  const [educationData, setEducationData] = useState(null); // Dedicated education state
  const [isSaving, setIsSaving] = useState(false); // Loading state for save operations















  useEffect(() => {
    setFormData(prev => ({ ...prev, firebase_uid: user.uid }));
  }, [user.uid]);

  const updateFormData = useCallback((newData) => {
    setFormData(prev => {
      const updated = { ...prev };
      Object.keys(newData).forEach(key => {
        if (newData[key] !== undefined) {
          updated[key] = newData[key];
        }
      });
      return updated;
    });
    
    // Also store step-specific data
    setStepFormData(prev => ({
      ...prev,
      [currentStep]: {
        ...prev[currentStep],
        ...newData
      }
    }));
  }, [currentStep]);

  // Mark step as saved (for visual indicators)
  const markStepAsSaved = (stepNumber) => {
    setSavedSteps(prev => new Set([...prev, stepNumber]));
  };

  // Special update function for education data
  const updateEducationData = useCallback((newEducationData) => {
    setEducationData(newEducationData);
    // Also update the main formData
    setFormData(prev => ({
      ...prev,
      education: newEducationData
    }));
  }, []);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem('formData', JSON.stringify(formData));
      //console.log("💾 Saved to localStorage:", formData);
    }
  }, [formData]);

  useEffect(() => {
    const savedFormData = localStorage.getItem('formData');
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setFormData(parsed);
        //console.log("📂 Loaded from localStorage:", parsed);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, []);

    useEffect(() => {}, [viewMode]);

  // Auto-save function for current step
  const autoSaveCurrentStep = async () => {
    // Wait for refs to be properly set with retries
    let currentComponents = stepRefs.current;
    let retries = 0;
    const maxRetries = 10;
    
    while ((!currentComponents || currentComponents.length === 0) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 50));
      currentComponents = stepRefs.current;
      retries++;
    }

    if (!currentComponents || currentComponents.length === 0) {
      return;
    }

    const savePromises = [];

    for (let i = 0; i < currentComponents.length; i++) {
      const component = currentComponents[i];
      
      if (component?.saveData && typeof component.saveData === 'function') {
        savePromises.push(component.saveData());
      }
    }

    if (savePromises.length > 0) {
      try {
        await Promise.all(savePromises);
      } catch (error) {
        console.error("Error during auto-save:", error);
        throw error;
      }
    }
  };

  // Update step props to include current step data
  const getCurrentStepData = () => {
    const baseData = {
      ...formData,
      ...stepFormData[currentStep]
    };
    
    // For education step, use dedicated education state if available
    if (currentStep === 2 && educationData) {
      baseData.education = educationData;
    }
    
    return baseData;
  };

  // ===== MULTI-STEP FORM LOGIC (as is) =====
  const easyModeSteps = [
    {
      id: 1,
      components: [
        {
          component: PersonalDetails,
          props: {
            dateOfBirth: false,
            photo: false,
            className: "easy-view",
            hideLanguages: true,
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          },
        },
        {
          component: Address,
          props: {
            permanentCity: false,
            presentCity: false,
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          }
        },
      ],
      title: "Personal Details",
    },
    {
      id: 2,
      components: [
        {
          component: Education,
          props: {
            isEasyMode: true,
            className: "easy-view",
            grade12syllabus: false,
            grade12courseStatus: false,
            grade12school: false,
            grade12year: true,
            grade12coreSubjects: false,
            grade12percentage: false,
            grade12mode: false,
            degreeCourseStatus: false,
            degreeName: true,
            degreeCollege: false,
            degreeYear: true,
            degreePlace: false,
            degreeUniversity: false,
            degreeCoreSubjects: false,
            degreeOtherSubjects: false,
            degreePercentage: false,
            degreeMode: false,
            masterCourseStatus: false,
            masterName: true,
            masterCollege: false,
            masterYear: false,
            masterPlace: false,
            masterUniversity: false,
            masterPercentage: false,
            masterCoreSubjects: false,
            masterMode: false,
            doctorateCourseStatus: false,
            doctorateCollege: false,
            doctorateYear: false,
            doctorateUniversity: false,
            doctorateCoreSubjects: true,
            doctorateMode: false,
            bEdCourseStatus: false,
            bEdCollege: false,
            bEdYear: true,
            bEdPlace: false,
            bEdAffiliated: false,
            bEdCourseDuration: false,
            bEdPercentage: false,
            bEdCoreSubjects: false,
            bEdMode: false,
            certificateCourseStatus: false,
            certificateName: true,
            certificatePlace: false,
            certificateCourseDuration: false,
            certificateSpecialization: false,
            certificateMode: false,
            formData: getCurrentStepData(),
            updateFormData: updateFormData,
            updateEducationData: updateEducationData
          },
        },
      ],
      title: "Education",
    },
    {
      id: 3,
      components: [
        {
          component: Experience,
          props: {
            className: "easy-view",
            formData: getCurrentStepData(),
            updateFormData: updateFormData,
            excludeOtherTeaching: true
          },
        },
      ],
      title: "Experience",
    },
    {
      id: 4,
      components: [{
        component: JobPreferences,
        props: {
          className: "easy-view",
          formData: getCurrentStepData(),
          updateFormData: updateFormData
        }
      }],
      title: "Job Preferences",
    },
  ];

  const fullModeSteps = [
    {
      id: 1,
      components: [
        {
          component: PersonalDetails,
          props: {
            dateOfBirth: true,
            photo: true,
            hideLanguages: false,
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          }
        },
        {
          component: Address,
          props: {
            permanentCity: true,
            presentCity: true,
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          }
        },
        {
          component: Languages,
          props: {
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          }
        },
      ],
      title: "Personal Details",
    },
    {
      id: 2,
      components: [
        {
          component: Education,
          props: {
            isEasyMode: false,
            grade12syllabus: true,
            grade12school: true,
            grade12courseStatus: true,
            grade12year: true,
            grade12coreSubjects: true,
            grade12percentage: true,
            grade12mode: true,
            degreeCourseStatus: true,
            degreeName: true,
            degreeCollege: true,
            degreeYear: true,
            degreePlace: true,
            degreeUniversity: true,
            degreeCoreSubjects: true,
            degreeOtherSubjects: true,
            degreePercentage: true,
            degreeMode: true,
            masterCourseStatus: true,
            masterName: true,
            masterCollege: true,
            masterYear: true,
            masterPlace: true,
            masterUniversity: true,
            masterPercentage: true,
            masterCoreSubjects: true,
            masterMode: true,
            doctorateCourseStatus: true,
            doctorateCollege: true,
            doctorateYear: true,
            doctorateUniversity: true,
            doctorateCoreSubjects: true,
            doctorateMode: true,
            bEdCourseStatus: true,
            bEdCollege: true,
            bEdYear: true,
            bEdPlace: true,
            bEdAffiliated: true,
            bEdCourseDuration: true,
            bEdPercentage: true,
            bEdCoreSubjects: true,
            bEdMode: true,
            certificateCourseStatus: true,
            certificateName: true,
            certificatePlace: true,
            certificateCourseDuration: true,
            certificateSpecialization: true,
            certificateMode: true,
            formData: getCurrentStepData(),
            updateFormData: updateFormData,
            updateEducationData: updateEducationData
          },
        },
      ],
      title: "Education",
    },
    {
      id: 3,
      components: [
        {
          component: Experience,
          props: {
            excludeAdditionalDetails: true,
            excludeTeachingCurriculum: true,
            excludeAdminCurriculum: true,
            excludeTeachingAdminCurriculum: true,
            formData: getCurrentStepData(),
            updateFormData: updateFormData
          },
        },
      ],
      title: "Experience",
    },
    {
      id: 4,
      components: [{
        component: JobPreferences,
        props: {
          formData: getCurrentStepData(),
          updateFormData: updateFormData
        }
      }],
      title: "Job Preferences",
    },
    {
      id: 5,
      components: [{ component: Social, props: { isEasyMode: false } }],
      title: "Social Media",
    },
    {
      id: 6,
      components: [{
        component: AdditionalInfo,
        props: {
          formData: getCurrentStepData(),
          updateFormData: updateFormData
        }
      }],
      title: "Additional Information",
    },
  ];

  useEffect(() => {
    try {
      const maxSteps = viewMode === "easy" ? easyModeSteps.length : fullModeSteps.length;
      if (currentStep > maxSteps) {
        setCurrentStep(1);
      }
    } catch (err) {
      console.error("Error in useEffect:", err);
      toast.error("An error occurred while setting up the form");
    }
  }, [viewMode, currentStep]);

  const handleViewAttempt = () => {
    setIsViewAttempted(false);
    setViewMode(null);
  };

  // Inform users when they are in preview mode
  useEffect(() => {
    if (isPreviewMode) {
      toast.info(
        "Preview mode: This step is read-only. Complete previous steps in sequence to continue.",
        { position: "top-center", autoClose: 4000 }
      );
    }
  }, [isPreviewMode]);

  const handleViewChange = async (mode) => {
    setLoadingApproval(true);
    try {
      const res = await axios.get(
        `https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved?firebase_uid=${user.uid}`
      );

      let approved, responseMsg, rejected, recordFound = false;
      if (Array.isArray(res.data) && res.data.length > 0) {
        const userProfile = res.data.find(obj => obj.firebase_uid === user.uid);
        if (userProfile) {
          recordFound = true;
          approved = userProfile?.isApproved ?? userProfile?.isapproved;
          rejected = userProfile?.isRejected ?? userProfile?.isrejected;
          responseMsg = userProfile?.response;
        }
      } else if (typeof res.data === "object" && res.data !== null && Object.keys(res.data).length > 0) {
        recordFound = true;
        approved = res.data.isApproved ?? res.data.isapproved;
        rejected = res.data.isRejected ?? res.data.isrejected;
        responseMsg = res.data.response;
      }

      if (typeof approved === "string") approved = parseInt(approved);
      if (typeof rejected === "string") rejected = parseInt(rejected);

      // Only block if found and rejected/response
      if (recordFound) {
        if (rejected === 1) {
          toast.error("Your profile has been rejected by admin", {
            position: "top-center",
            autoClose: 5000
          });
          setLoadingApproval(false);
          return;
        } else if (approved === 0) {
          toast.warning("Your profile is currently under admin review", {
            position: "top-center",
            autoClose: 5000
          });
          setLoadingApproval(false);
          return;
        } else if (responseMsg && responseMsg.trim() !== "") {
          toast.info("📢 You have a new message from admin", {
            position: "top-center",
            autoClose: 5000,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
        }

        if (approved === 1) {
          setViewMode(mode);
          setIsViewAttempted(true);
          setCurrentStep(1);
          setFormData({});
          localStorage.removeItem('formData');
          setShowProfile(true);
        }
      } else {
        // No record found: proceed as "approved"
        setViewMode(mode);
        setIsViewAttempted(true);
        setCurrentStep(1);
        setFormData({});
        localStorage.removeItem('formData');
        setShowProfile(true);
      }
    } catch (error) {
      console.error("Approval API error:", error);
      toast.error("Error checking approval status. Try again later.");
    }
    setLoadingApproval(false);
  };

  const toggleProfileView = () => {
    setShowProfile(!showProfile);
  };

  const jumpToStep = (stepNumber) => {
    try {
      const maxSteps = viewMode === "easy" ? easyModeSteps.length : fullModeSteps.length;
      if (stepNumber >= 1 && stepNumber <= maxSteps) {
        // Toggle accordion: if clicking the same step, close it
        if (currentStep === stepNumber) {
          stepRefs.current = [];
          setCurrentStep(null);
          setIsPreviewMode(false);
          return;
        }
        
        const maxValidated = validatedSteps.size > 0 ? Math.max(...Array.from(validatedSteps)) : 0;
        const allowedStep = Math.min(maxSteps, (maxValidated || 0) + 1);
        const isJumpingAhead = stepNumber > allowedStep;
        setIsPreviewMode(isJumpingAhead);
        // Clear refs when changing steps
        stepRefs.current = [];
        setCurrentStep(stepNumber);
      }
    } catch (err) {
      console.error("Error in jumpToStep:", err);
      toast.error("An error occurred while jumping to step. Please try again.");
    }
  };

  // Navigate back to the next required fillable step
  const goToNextRequired = () => {
    try {
      const maxSteps = viewMode === "easy" ? easyModeSteps.length : fullModeSteps.length;
      const maxValidated = validatedSteps.size > 0 ? Math.max(...Array.from(validatedSteps)) : 0;
      const target = Math.min(maxSteps, (maxValidated || 0) + 1);
      stepRefs.current = [];
      setIsPreviewMode(false);
      setCurrentStep(target);
    } catch (err) {
      console.error("Error in goToNextRequired:", err);
    }
  };

  const nextStep = async () => {
    try {
      const currentComponents = stepRefs.current;
      let isStepValid = true;
      let allErrors = [];

      const maxSteps = viewMode === "easy" ? easyModeSteps.length : fullModeSteps.length;
      const isLastStep = currentStep === maxSteps;

      if (isPreviewMode && isLastStep) {
        toast.warn("Please complete all previous steps in sequence before submitting");
        return;
      }

      // Validate current step before proceeding
      const isAdditionalInfoStep = viewMode === "full" && currentStep === 6;
      const isSocialMediaStep = viewMode === "full" && currentStep === 5;
      
      if (!isAdditionalInfoStep && !isSocialMediaStep) {
        for (const component of currentComponents) {
          if (component?.validateFields) {
            const { isValid, errors } = component.validateFields();
            if (!isValid) {
              isStepValid = false;
              if (Array.isArray(errors)) {
                allErrors = [...allErrors, ...errors];
              } else if (typeof errors === 'object') {
                Object.values(errors).forEach(errorGroup => {
                  if (typeof errorGroup === 'object') {
                    allErrors = [...allErrors, ...Object.values(errorGroup)];
                  } else {
                    allErrors.push(errorGroup);
                  }
                });
              }
            }
          }
        }
      }

      if (!isStepValid) {
        allErrors.forEach(error => toast.error(error));
        return;
      }

      // Auto-save current step before proceeding
      try {
        setIsSaving(true); // Start loading state
        await autoSaveCurrentStep();
        markStepAsSaved(currentStep); // Mark step as saved for visual indicator
        
        // Only show success message if there were actually save methods to call
        const currentComponents = stepRefs.current;
        const hasSaveMethods = currentComponents.some(component => 
          component?.saveData && typeof component.saveData === 'function'
        );
        
        if (hasSaveMethods) {
          toast.success("Great! Your progress has been saved successfully");
        } else {
          toast.info("Step completed (no save methods implemented yet)");
        }
      } catch (saveError) {
        console.error("Auto-save failed:", saveError);
        // Show specific error message if available, otherwise generic message
        const errorMessage = saveError?.message || "Failed to save data. Please try again.";
        toast.error(errorMessage);
        return;
      } finally {
        setIsSaving(false); // End loading state
      }

      setValidatedSteps(prev => new Set([...prev, currentStep]));
      setIsPreviewMode(false);

      if (currentStep < maxSteps) {
        // Clear refs when moving to next step
        stepRefs.current = [];
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } catch (err) {
      console.error("Error in nextStep:", err);
      // Show specific error message if available, otherwise generic message
      const errorMessage = err?.message || "An error occurred. Please try again";
      toast.error(errorMessage);
    }
  };

  const prevStep = () => {
    try {
      if (currentStep > 1) {
        // Clear refs when moving to previous step
        stepRefs.current = [];
        setCurrentStep(currentStep - 1);
        setIsPreviewMode(false);
        const profileBox = document.querySelector(".profile-box");
        if (profileBox) {
          profileBox.scrollIntoView({ behavior: "smooth" });
        }
      }
    } catch (err) {
      console.error("Error in prevStep:", err);
      toast.error("An error occurred while navigating to the previous step. Please try again.");
    }
  };

  // --- handleSubmit: only show "no profile" error if record is found and is explicitly rejected/responded ---
  const handleSubmit = async () => {
    try {
      if (Object.keys(formData).length === 0) {
        toast.error("Please fill in required information before submitting");
        return;
      }

      const res = await axios.get(
        `https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved?firebase_uid=${user.uid}`
      );

      let approved, responseMsg, rejected, recordFound = false;
      if (Array.isArray(res.data) && res.data.length > 0) {
        const userProfile = res.data.find(obj => obj.firebase_uid === user.uid);
        if (userProfile) {
          recordFound = true;
          approved = userProfile?.isApproved ?? userProfile?.isapproved;
          rejected = userProfile?.isRejected ?? userProfile?.isrejected;
          responseMsg = userProfile?.response;
        }
      } else if (typeof res.data === "object" && res.data !== null && Object.keys(res.data).length > 0) {
        recordFound = true;
        approved = res.data.isApproved ?? res.data.isapproved;
        rejected = res.data.isRejected ?? res.data.isrejected;
        responseMsg = res.data.response;
      }

      if (typeof approved === "string") approved = parseInt(approved);
      if (typeof rejected === "string") rejected = parseInt(rejected);

      if (recordFound) {
        // Only block if found and rejected/response
        if (responseMsg && responseMsg.trim() !== "") {
          toast.info("Admin has sent you a message.");
          redirect("/candidates-dashboard/my-profile");
          return;
        } else if (rejected === 1) {
          toast.error("Your profile is rejected");
          redirect("/candidates-dashboard/my-profile");
          return;
        } else if (approved === 0) {
          toast.warning("Your profile is sent to admin for approval");
          redirect("/candidates-dashboard/my-profile");
          return;
        }
      }
      // If not found (no record), or found and approved, allow submission
      localStorage.setItem('formData', JSON.stringify(formData));
      toast.success("Profile updated successfully!");
      setViewMode(null);
      setShowProfile(false);
      redirect("/candidates-dashboard/my-profile");
    } catch (err) {
      toast.error("An error occurred while submitting");
      redirect("/candidates-dashboard/my-profile");
    }
  };

  // Track when steps are saved


  const steps = viewMode === "easy" ? easyModeSteps : fullModeSteps;
  const totalSteps = steps.length;

  let currentStepData = null;
  try {
    currentStepData = steps.find((step) => step.id === currentStep) || steps[0];
  } catch (err) {
    console.error("Error finding current step:", err);
    toast.error("An error occurred while finding the current step. Please refresh the page.");
  }

  if (!steps.length) {
    return <div className="profile-box">Loading profile form...</div>;
  }

  const renderCurrentStep = () => {
    try {
      if (!currentStepData || !currentStepData.components) {
        return <div>Error loading component. Please try again.</div>;
      }
      
      // Only clear refs if we don't have the right number of components
      if (stepRefs.current.length !== currentStepData.components.length) {
        stepRefs.current = new Array(currentStepData.components.length);
      }
      
      return (
        <div>
          {currentStepData.components.map(({ component: StepComponent, props }, idx) => (
            <StepComponent
              key={`step-${currentStep}-component-${idx}`}
              ref={(el) => {
                if (el) {
                  stepRefs.current[idx] = el;
                }
              }}
              {...props}
              isEasyMode={viewMode === "easy"}
              formData={formData}
              updateFormData={updateFormData}
            />
          ))}
        </div>
      );
    } catch (err) {
      console.error("Error rendering step component:", err);
      return <div>Error loading component. Please try again.</div>;
    }
  };



  // For redirect
  const redirect = (url) => {
    setTimeout(() => {
      window.location.href = url;
    }, 1500);
  };

  // If mode is not selected, show upload section and mode selection.
  if (!viewMode) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <MediaUpload />
        
        <div className=" rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">
            Select Mode
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Short Profile Card */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#C2185B] hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-center text-black-500 mb-3">
                Short Profile
              </h3>
              <p className="text-gray-600 mb-6">
                Quick and simple profile with essential information
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 shadow-lg"
                  onClick={() => setViewMode("easy")}
                >
                  Fill Details
                </button>
                <button
                    className="flex-1 px-4 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => handleViewChange("easy")}
                  disabled={loadingApproval}
                >
                  {loadingApproval ? "Checking..." : "View Details"}
                </button>
              </div>
            </div>

            {/* Complete Profile Card */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#C2185B] hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-center text-black-500 mb-3">
                Complete Profile
              </h3>
              <p className="text-gray-600 mb-6">
                Comprehensive profile with detailed information
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 shadow-lg"
                  onClick={() => setViewMode("full")}
                >
                  Fill Details
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:bg-gradient-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => handleViewChange("full")}
                  disabled={loadingApproval}
                >
                  {loadingApproval ? "Checking..." : "View Details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a mode is selected, show the multi-step form or final view.
  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Profile Completion Popup */}
      <ProfileCompletionPopup />
      
      {!showProfile ? (
        <div className=" rounded-lg shadow-sm">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-red-500 mb-2">
                  My Profile ({viewMode === "easy" ? "Short" : "Complete"})
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  <span className="text-red-500">★</span> Fields highlighted with{" "}
                  <span className="text-purple-600 font-semibold">PURPLE</span> are mandatory to fill
                </p>
              </div>
              <button
                onClick={() => {
                  setViewMode(null);
                  setCurrentStep(1);
                  setShowProfile(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-brand rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 shadow-lg whitespace-nowrap"
              >
                Change Mode
              </button>
            </div>
          </div>

          {/* Preview Banner */}
          {isPreviewMode && (
            <div className="mx-4 sm:mx-6 mt-4 sm:mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-yellow-800">
                <strong>Preview mode:</strong> You can view fields here but cannot edit until you complete previous steps in sequence.
              </div>
              <button 
                className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                onClick={goToNextRequired}
              >
                Go to next required step
              </button>
            </div>
          )}

          {/* Accordion Steps */}
          <div className="p-4 sm:p-6">
            <div className="relative">
              {/* Vertical Line - Hidden on mobile, positioned to align with center of badges */}
              <div className="hidden sm:block absolute left-[1.5rem] top-12 bottom-12 w-[2px]" style={{ backgroundColor: '#C2185B', zIndex: 0 }} />
              
              {steps.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = validatedSteps.has(step.id);
                const isSaved = savedSteps.has(step.id);
                
                return (
                  <div key={step.id} className="relative mb-6 sm:mb-7 pl-14 sm:pl-16">
                    {/* Step Number Badge - Positioned absolutely outside */}
                    <div
                      className="absolute left-0 top-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl"
                      style={{ 
                        backgroundColor: isActive ? '#F0D8D9' : '#ECECEC',
                        color: '#C2185B',
                        zIndex: 10 
                      }}
                    >
                      {step.id}
                    </div>
                    
                    {/* Accordion Header */}
                    <button
                      onClick={() => jumpToStep(step.id)}
                      className={`w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-4 sm:py-5 rounded-lg border transition-all ${
                        isActive
                          ? "border-transparent"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: isActive ? '#F0D8D9' : '#ECECEC' }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#F0D8D9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#ECECEC';
                        }
                      }}
                    >
                      {/* Step Title */}
                      <div className="flex-1 flex items-center">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold leading-none m-0 p-0" style={{ color: '#C2185B', lineHeight: '1' }}>
                            {step.title}
                          </h3>
                          {isSaved && (
                            <span className="text-xs text-green-600 font-medium leading-none m-0 p-0" style={{ lineHeight: '1' }}>
                              ✓ Saved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron Icon */}
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform flex-shrink-0 ${
                          isActive ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="#C2185B"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Accordion Content */}
                    {isActive && (
                      <div className="mt-3 sm:mt-4 p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <fieldset 
                          disabled={isPreviewMode} 
                          className={isPreviewMode ? "opacity-60 pointer-events-none" : ""}
                        >
                          {renderCurrentStep()}
                        </fieldset>

                        {/* Navigation Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between mt-6 pt-6 border-t border-gray-200">
                          <button
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-colors ${
                              currentStep === 1 || isSaving
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-gray-500 text-white hover:bg-gray-600"
                            }`}
                            onClick={prevStep}
                            disabled={currentStep === 1 || isSaving}
                          >
                            Previous
                          </button>
                          
                          <button
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                              isPreviewMode || isSaving
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-gradient-brand text-white hover:bg-gradient-primary-hover shadow-lg"
                            }`}
                            onClick={nextStep}
                            disabled={isPreviewMode || isSaving}
                            title={
                              isSaving 
                                ? "Saving data, please wait..." 
                                : isPreviewMode 
                                ? "Complete previous steps in sequence to proceed" 
                                : ""
                            }
                          >
                            {isSaving ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                              </span>
                            ) : (
                              currentStep === totalSteps ? "Finish" : "Next"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewMode === "easy" ? (
        <Easyview onViewAttempt={handleViewAttempt} formData={formData} />
      ) : (
        <Fullview onViewAttempt={handleViewAttempt} formData={formData} />
      )}
    </div>
  );
};

export default FormInfoBox;