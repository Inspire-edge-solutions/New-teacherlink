import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { getCompletionStatus, getNextSteps } from '../../../../utils/profileCompletion';
import { Link } from 'react-router-dom';
import { FaTimes, FaExclamationTriangle, FaCheckCircle, FaArrowRight, FaUserEdit } from 'react-icons/fa';
import axios from 'axios';
import './profileCompletionPopup.css';

const ProfileCompletionPopup = () => {
  console.log('ProfileCompletionPopup component rendered');
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    console.log('ProfileCompletionPopup useEffect triggered, user:', user?.uid);
    if (user?.uid) {
      console.log('User UID found, calling checkProfileCompletion');
      checkProfileCompletion();
    } else {
      console.log('No user UID available');
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    console.log('checkProfileCompletion called with user UID:', user?.uid);
    if (!user?.uid) {
      console.log('No user UID, returning early');
      return;
    }

    console.log('Starting profile completion check...');
    setLoading(true);
    try {
      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      };

      // Fetch all profile data using the same endpoints as dashboard ProfileCompletion
      const [
        personalRes,
        presentAddressRes,
        permanentAddressRes,
        educationRes,
        experienceRes,
        jobPrefRes,
        socialRes,
        additionalRes1,
        additionalRes2,
        languagesRes
             ] = await Promise.all([
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/permanentAddress`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails`, { params: { firebase_uid: user.uid } }).catch(() => ({ data: [] })),
         axios.get(`https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience`, { params: { firebase_uid: user.uid } }).catch(() => ({ data: [] })),
         axios.get(`https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference`, { params: { firebase_uid: user.uid } }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info2`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] })),
         axios.get(`https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/languages`, { params: { firebase_uid: user.uid }, ...authHeaders }).catch(() => ({ data: [] }))
       ]);

       

      // Use the same completion calculation logic as dashboard ProfileCompletion
      const addressData = [...(presentAddressRes.data || []), ...(permanentAddressRes.data || [])];

      let easyModeCompleted = 0;
      let fullModeCompleted = 0;
      const missingSections = [];
      const completedSections = [];

      // Easy Mode: 4 sections (matching FormInfoBox structure)
      // Personal Details + Address (combined like in FormInfoBox)
      const personalComplete = personalRes.data.length > 0 && 
        personalRes.data[0].fullName && personalRes.data[0].email && personalRes.data[0].callingNumber;
      
      let addressComplete = false;
      if (addressData.length > 0) {
        const address = addressData.find(addr => addr.presentAddress || addr.country_name) || addressData[0];
        const hasAddress = address.presentAddress || address.address || address.city_name;
        const hasState = address.presentState || address.state_name;
        const hasCountry = address.presentCountry || address.country_name;
        addressComplete = hasAddress && hasState && hasCountry;
      }
      
      if (personalComplete && addressComplete) {
        easyModeCompleted++;
        fullModeCompleted++;
        completedSections.push({ name: 'Personal Details', percentage: 100 });
      } else {
        missingSections.push({ name: 'Personal Details', missingFields: [] });
      }

      // Education
      if (educationRes.data.length > 0) {
        const education = educationRes.data.find(edu => edu.firebase_uid === user.uid) || educationRes.data[0];
        const hasBasicEducation = education.degreeName || education.grade12Year || 
                            education.education_type || education.syllabus || 
                            education.schoolName || education.courseName;
        
        if (hasBasicEducation) {
          easyModeCompleted++;
          completedSections.push({ name: 'Education', percentage: 100 });
        } else {
          missingSections.push({ name: 'Education', missingFields: [] });
        }

        const hasDetailedEducation = education.degreeYear || education.degreeCollege || education.grade12School || 
                                    education.grade12Percentage || education.instituteName || education.yearOfCompletion;
        
        if (hasBasicEducation && (hasDetailedEducation || education.education_type)) {
          fullModeCompleted++;
        }
      } else {
        missingSections.push({ name: 'Education', missingFields: [] });
      }

      // Experience
      if (experienceRes.data) {
        const hasMysqlData = experienceRes.data.mysqlData && Object.keys(experienceRes.data.mysqlData).length > 0;
        const hasDynamoData = experienceRes.data.dynamoData && Object.keys(experienceRes.data.dynamoData).length > 0;
        const hasArrayData = Array.isArray(experienceRes.data) && experienceRes.data.length > 0;
        
        // Easy Mode Experience Check
        let hasBasicExperience = false;
        if (hasMysqlData) {
          const mysql = experienceRes.data.mysqlData;
          hasBasicExperience = mysql.teaching_experience_years || mysql.teaching_experience_months ||
                             mysql.non_teaching_experience_years || mysql.non_teaching_experience_months ||
                             mysql.total_experience_years || mysql.total_experience_months;
        }
        
        if (hasBasicExperience || hasDynamoData || hasArrayData) {
          easyModeCompleted++;
          completedSections.push({ name: 'Experience', percentage: 100 });
        } else {
          missingSections.push({ name: 'Experience', missingFields: [] });
        }

        // Full Mode Experience Check
        let hasComprehensiveExperience = false;
        if (hasMysqlData) {
          const mysql = experienceRes.data.mysqlData;
          const hasNumericExperience = mysql.teaching_experience_years || mysql.teaching_experience_months ||
                                      mysql.non_teaching_experience_years || mysql.non_teaching_experience_months ||
                                      mysql.total_experience_years || mysql.total_experience_months;
          
          const hasOtherTeachingExperience = mysql.other_teaching_experience || mysql.otherTeachingExperience ||
                                           mysql.teaching_experience_radio || mysql.experience_radio ||
                                           mysql.has_other_teaching_experience || mysql.other_experience;
          
          hasComprehensiveExperience = hasNumericExperience || hasOtherTeachingExperience;
        }
        
        if (hasComprehensiveExperience || hasMysqlData || hasDynamoData || hasArrayData) {
          fullModeCompleted++;
        }
      } else {
        missingSections.push({ name: 'Experience', missingFields: [] });
      }

      // Job Preferences
      if (jobPrefRes.data.length > 0) {
        const jobPref = jobPrefRes.data.find(pref => pref.firebase_uid === user.uid) || jobPrefRes.data[0];
        if (jobPref.Job_Type || jobPref.expected_salary) {
          easyModeCompleted++;
          completedSections.push({ name: 'Job Preferences', percentage: 100 });
        } else {
          missingSections.push({ name: 'Job Preferences', missingFields: [] });
        }
        if (jobPref.Job_Type && jobPref.expected_salary) {
          fullModeCompleted++;
        }
      } else {
        missingSections.push({ name: 'Job Preferences', missingFields: [] });
      }

      // Full Mode Only Sections
      // Social Media
      if (socialRes.data.length > 0) {
        const social = socialRes.data.find(s => s.firebase_uid === user.uid) || socialRes.data[0];
        if (social.linkedin || social.facebook || social.twitter || social.instagram) {
          fullModeCompleted++;
          completedSections.push({ name: 'Social Media', percentage: 100 });
        } else {
          missingSections.push({ name: 'Social Media', missingFields: [] });
        }
      } else {
        missingSections.push({ name: 'Social Media', missingFields: [] });
      }

      // Additional Information
      const additional1 = additionalRes1.data.length > 0 ? 
        (additionalRes1.data.find(add => add.firebase_uid === user.uid) || additionalRes1.data[0]) : null;
      const additional2 = additionalRes2.data.length > 0 ? 
        (additionalRes2.data.find(add => add.firebase_uid === user.uid) || additionalRes2.data[0]) : null;
      
      if (additional1 || additional2) {
        let hasComputerSkills = false;
        try {
          hasComputerSkills = additional1?.computer_skills && 
            JSON.parse(additional1.computer_skills || '[]').length > 0;
        } catch (e) {
          hasComputerSkills = false;
        }
        const filledFieldsCount = [
          hasComputerSkills,
          additional1?.projects?.trim(),
          additional1?.accomplishments?.trim(),
          additional1?.certifications?.trim(),
          additional1?.research_publications?.trim(),
          additional1?.patents?.trim(),
          additional2?.religion?.trim(),
          additional2?.citizenship?.trim(),
          additional2?.additional_info?.trim()
        ].filter(Boolean).length;
        
        if (filledFieldsCount >= 3) {
          fullModeCompleted++;
          completedSections.push({ name: 'Additional Information', percentage: 100 });
        } else {
          missingSections.push({ name: 'Additional Information', missingFields: [] });
        }
      } else {
        missingSections.push({ name: 'Additional Information', missingFields: [] });
      }

      // Calculate percentages using the same logic as dashboard
      const easyModePercentage = Math.round((easyModeCompleted / 4) * 100);
      const fullModePercentage = Math.round((fullModeCompleted / 6) * 100);

             // Show popup if either profile type is incomplete
       const selectedMode = easyModePercentage >= fullModePercentage ? 'easy' : 'full';
       const percentage = Math.max(easyModePercentage, fullModePercentage);

      const completionDataToSet = {
        percentage,
        completedSections,
        missingSections,
        selectedMode,
        easyMode: { percentage: easyModePercentage, completedSections: easyModeCompleted, totalSections: 4 },
        fullMode: { percentage: fullModePercentage, completedSections: fullModeCompleted, totalSections: 6 }
      };
      
             setCompletionData(completionDataToSet);
      
                    console.log('Profile completion calculated:', { percentage, easyModePercentage, fullModePercentage });
       
       // Show popup if either profile type is incomplete
       if (easyModePercentage < 100 || fullModePercentage < 100) {
         // Check if user has dismissed this popup recently
         const lastDismissed = localStorage.getItem(`profilePopupDismissed_${user.uid}`);
         const shouldShow = !lastDismissed || (Date.now() - parseInt(lastDismissed)) > (24 * 60 * 60 * 1000); // 24 hours
         
         console.log('Popup visibility check:', { 
           lastDismissed, 
           shouldShow, 
           easyModePercentage, 
           fullModePercentage,
           easyIncomplete: easyModePercentage < 100,
           fullIncomplete: fullModePercentage < 100
         });
         
         if (shouldShow) {
           console.log('Setting popup to show - one or both profiles incomplete');
           setShowPopup(true);
         } else {
           console.log('Popup dismissed recently, not showing');
         }
       } else {
         console.log('Both profiles are 100% complete, not showing popup');
       }

     } catch (error) {
       console.error('Error checking profile completion:', error);
     } finally {
       setLoading(false);
     }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    setDismissed(true);
    // Store dismissal timestamp
    localStorage.setItem(`profilePopupDismissed_${user.uid}`, Date.now().toString());
  };

  const handleCompleteProfile = () => {
    setShowPopup(false);
    // Navigate to profile page
    window.location.href = '/candidates-dashboard/my-profile';
  };

  const handleRefresh = () => {
    setLoading(true);
    setShowPopup(false);
    setDismissed(false);
    // Clear dismissal timestamp to force re-check
    localStorage.removeItem(`profilePopupDismissed_${user.uid}`);
    checkProfileCompletion();
  };

     console.log('Render condition check:', { loading, hasCompletionData: !!completionData, showPopup, dismissed });
   
   if (loading || !completionData || !showPopup || dismissed) {
     console.log('Returning null, not rendering popup');
     return null;
   }

  const status = getCompletionStatus(completionData.percentage);
  const nextSteps = getNextSteps(completionData.missingSections, completionData.selectedMode);

  return (
    <div className="profile-completion-popup-overlay">
      <div className="profile-completion-popup">
        <div className="popup-header">
          <div className="popup-title">
            <FaUserEdit className="title-icon" />
            <h3>Complete Your Profile</h3>
          </div>
          <button className="close-button" onClick={handleDismiss}>
            <FaTimes />
          </button>
        </div>

                 <div className="popup-content">
           <div className="completion-summary">
             <div className="progress-section">
               <div className="both-progress-circles">
                 <div className="progress-circle short-profile">
                   <div className="progress-percentage">{completionData.easyMode.percentage}%</div>
                   <div className="progress-label">Short Profile</div>
                   <div className="progress-sections">{completionData.easyMode.completedSections} of {completionData.easyMode.totalSections} sections</div>
                 </div>
                 <div className="progress-circle complete-profile">
                   <div className="progress-percentage">{completionData.fullMode.percentage}%</div>
                   <div className="progress-label">Complete Profile</div>
                   <div className="progress-sections">{completionData.fullMode.completedSections} of {completionData.fullMode.totalSections} sections</div>
                 </div>
               </div>
                               <div className="progress-status">
                  <div className="status-badges">
                    <div className={`status-badge ${getCompletionStatus(completionData.easyMode.percentage).text.toLowerCase().replace(' ', '-')}`}>
                      Short Profile - {getCompletionStatus(completionData.easyMode.percentage).text}
                    </div>
                    <div className={`status-badge ${getCompletionStatus(completionData.fullMode.percentage).text.toLowerCase().replace(' ', '-')}`}>
                      Complete Profile - {getCompletionStatus(completionData.fullMode.percentage).text}
                    </div>
                  </div>
                  <p className="status-description">
                    {completionData.percentage === 0 
                      ? "Let's get started with your profile! Choose between Short Profile (4 sections) or Complete Profile (6 sections)." 
                      : completionData.percentage < 50 
                      ? "You're making good progress! Keep going to complete your profile." 
                      : completionData.percentage < 100 
                      ? "Almost there! Just a few more details needed to complete your profile." 
                      : "Your profile is complete!"}
                  </p>
                </div>
             </div>
           </div>

          <div className="completion-details">
            {completionData.missingSections.length > 0 ? (
              <div className="missing-sections">
                <h4>Missing Information:</h4>
                <div className="sections-list">
                  {completionData.missingSections.map((section, index) => (
                    <div key={index} className="missing-section">
                      <FaExclamationTriangle className="warning-icon" />
                      <span>{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="completed-sections">
                <h4>Great job! All sections are complete:</h4>
                <div className="sections-list">
                  {completionData.completedSections.map((section, index) => (
                    <div key={index} className="completed-section">
                      <FaCheckCircle className="success-icon" />
                      <span>{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextSteps.length > 0 && (
              <div className="next-steps">
                <h4>Next Steps:</h4>
                <ul className="steps-list">
                  {nextSteps.map((step, index) => (
                    <li key={index} className="step-item">
                      <FaArrowRight className="step-icon" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="popup-actions">
          <button className="btn-secondary" onClick={handleDismiss}>
            Remind me later
          </button>
          <button className="btn-primary" onClick={handleCompleteProfile}>
            Complete Profile Now
          </button>
        </div>
        
        {/* Add a small refresh button for testing */}
        <div className="popup-footer">
          <button className="refresh-button" onClick={handleRefresh} title="Refresh completion status">
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionPopup;
