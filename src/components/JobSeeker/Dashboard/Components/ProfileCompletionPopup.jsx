import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { getCompletionStatus, getNextSteps } from '../../../../utils/profileCompletion';
import { Link } from 'react-router-dom';
import { FaTimes, FaExclamationTriangle, FaCheckCircle, FaArrowRight, FaUserEdit } from 'react-icons/fa';
import axios from 'axios';
import ModalPortal from '../../../common/ModalPortal';

const ProfileCompletionPopup = () => {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      checkProfileCompletion();
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    if (!user?.uid) {
      return;
    }

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
       
       // Show popup if either profile type is incomplete
       if (easyModePercentage < 100 || fullModePercentage < 100) {
         // Check if user has dismissed this popup recently
         const lastDismissed = localStorage.getItem(`profilePopupDismissed_${user.uid}`);
         const shouldShow = !lastDismissed || (Date.now() - parseInt(lastDismissed)) > (24 * 60 * 60 * 1000); // 24 hours

         if (shouldShow) {
           setShowPopup(true);
         }
       } else {
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
    window.location.href = '/seeker/my-profile';
  };

  const handleRefresh = () => {
    setLoading(true);
    setShowPopup(false);
    setDismissed(false);
    // Clear dismissal timestamp to force re-check
    localStorage.removeItem(`profilePopupDismissed_${user.uid}`);
    checkProfileCompletion();
  };

   if (loading || !completionData || !showPopup || dismissed) {
     return null;
   }

  const status = getCompletionStatus(completionData.percentage);
  
  // Filter out Social Media and Additional Information from display (but they're still counted in percentage)
  const sectionsToHide = ['Social Media', 'Additional Information'];
  const displayMissingSections = completionData.missingSections.filter(
    section => !sectionsToHide.includes(section.name)
  );
  const displayCompletedSections = completionData.completedSections.filter(
    section => !sectionsToHide.includes(section.name)
  );
  
  const nextSteps = getNextSteps(displayMissingSections, completionData.selectedMode);

  // Helper function to get status badge classes
  const getStatusBadgeClasses = (statusText) => {
    const statusLower = statusText.toLowerCase().replace(/\s+/g, '-');
    const statusClasses = {
      'not-started': 'bg-red-50 text-red-600 border-red-200',
      'just-started': 'bg-orange-50 text-orange-600 border-orange-200',
      'in-progress': 'bg-yellow-50 text-yellow-600 border-yellow-200',
      'almost-there': 'bg-green-50 text-green-600 border-green-200',
      'nearly-complete': 'bg-blue-50 text-blue-600 border-blue-200',
      'complete': 'bg-green-50 text-green-600 border-green-200',
    };
    return statusClasses[statusLower] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <ModalPortal>
      <style>{`
        .profile-popup-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .profile-popup-scrollbar::-webkit-scrollbar-track {
          background: #F0D8D9;
          border-radius: 10px;
          margin: 8px 0;
        }
        .profile-popup-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #F34B58 0%, #A1025D 100%);
          border-radius: 10px;
          border: 2px solid #F0D8D9;
        }
        .profile-popup-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #db2777 0%, #dc2626 100%);
          border: 2px solid #F0D8D9;
        }
        .profile-popup-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #A1025D 0%, #F34B58 100%);
        }
        /* Firefox scrollbar */
        .profile-popup-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #F34B58 #F0D8D9;
        }
      `}</style>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn" onClick={handleDismiss}>
        <div 
          className="bg-[#F0D8D9] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-slideUp profile-popup-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white mx-4 mt-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-brand rounded-lg">
              <FaUserEdit className="text-white text-lg" />
            </div>
            <h3 className="m-0 text-xl font-semibold text-gray-800">Complete Your Profile</h3>
          </div>
          <button 
            className="bg-transparent border-none text-gray-400 text-lg cursor-pointer p-2 rounded-full transition-all duration-200 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 bg-white mx-4 mb-4 rounded-xl">
          <div className="mb-6">
            <div className="flex flex-col items-center gap-5">
              <div className="flex gap-6 sm:gap-8 justify-center flex-wrap">
                <Link 
                  to="/seeker/my-profile" 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-r from-[#F34B58] to-[#A1025D] flex flex-col items-center justify-center text-white font-bold shadow-lg transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-xl active:scale-105 no-underline"
                  onClick={handleDismiss}
                >
                  <div className="text-xl sm:text-2xl font-bold leading-none">{completionData.easyMode.percentage}%</div>
                  <div className="text-[10px] sm:text-xs font-semibold mt-1 opacity-90">Short Profile</div>
                  <div className="text-[8px] sm:text-[10px] opacity-80 mt-0.5 text-center px-1">
                    {completionData.easyMode.completedSections} of {completionData.easyMode.totalSections} sections
                  </div>
                </Link>
                <Link 
                  to="/seeker/my-profile" 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-r from-[#A1025D] to-[#F34B58] flex flex-col items-center justify-center text-white font-bold shadow-lg transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-xl active:scale-105 no-underline"
                  onClick={handleDismiss}
                >
                  <div className="text-xl sm:text-2xl font-bold leading-none">{completionData.fullMode.percentage}%</div>
                  <div className="text-[10px] sm:text-xs font-semibold mt-1 opacity-90">Complete Profile</div>
                  <div className="text-[8px] sm:text-[10px] opacity-80 mt-0.5 text-center px-1">
                    {completionData.fullMode.completedSections} of {completionData.fullMode.totalSections} sections
                  </div>
                </Link>
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border uppercase tracking-wide whitespace-nowrap ${getStatusBadgeClasses(getCompletionStatus(completionData.easyMode.percentage).text)}`}>
                    Short Profile - {getCompletionStatus(completionData.easyMode.percentage).text}
                  </span>
                  <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border uppercase tracking-wide whitespace-nowrap ${getStatusBadgeClasses(getCompletionStatus(completionData.fullMode.percentage).text)}`}>
                    Complete Profile - {getCompletionStatus(completionData.fullMode.percentage).text}
                  </span>
                </div>
                <p className="m-0 text-gray-500 text-sm sm:text-base leading-relaxed text-center">
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

          <div className="mb-6">
            {displayMissingSections.length > 0 ? (
              <div>
                <h4 className="m-0 mb-4 text-base sm:text-lg font-semibold text-gray-800">Missing Information:</h4>
                <div className="flex flex-col gap-2">
                  {displayMissingSections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-3 bg-orange-50 text-orange-800 border-l-4 border-orange-400 rounded-lg">
                      <FaExclamationTriangle className="text-orange-500 text-sm flex-shrink-0" />
                      <span className="text-sm sm:text-base">{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : displayCompletedSections.length > 0 ? (
              <div>
                <h4 className="m-0 mb-4 text-base sm:text-lg font-semibold text-gray-800">Great job! All sections are complete:</h4>
                <div className="flex flex-col gap-2">
                  {displayCompletedSections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2.5 p-3 bg-green-50 text-green-800 border-l-4 border-green-500 rounded-lg">
                      <FaCheckCircle className="text-green-500 text-sm flex-shrink-0" />
                      <span className="text-sm sm:text-base">{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {nextSteps.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <h4 className="m-0 mb-3 text-base sm:text-lg font-semibold text-gray-800">Next Steps:</h4>
                <ul className="list-none p-0 m-0">
                  {nextSteps.map((step, index) => (
                    <li key={index} className="flex items-center gap-2.5 py-2 text-sm sm:text-base text-gray-700">
                      <FaArrowRight className="text-[#F34B58] text-xs mt-0.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-4 sm:p-6 border-t border-gray-200 bg-white mx-4 mb-4 rounded-b-xl">
          <button 
            className="flex-1 px-5 py-3 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all duration-200 text-center hover:bg-gray-200 hover:text-gray-700"
            onClick={handleDismiss}
          >
            Remind me later
          </button>
          <button 
            className="flex-1 px-5 py-3 bg-gradient-brand text-white rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors duration-200 shadow-lg text-center hover:bg-gradient-primary-hover hover:shadow-xl hover:-translate-y-0.5"
            onClick={handleCompleteProfile}
          >
            Complete Profile Now
          </button>
        </div>
        
        {/* Add a small refresh button for testing */}
        <div className="p-2 sm:p-4 text-center border-t border-gray-200 bg-white mx-4 mb-4 rounded-b-xl">
          <button 
            className="bg-transparent border-none text-gray-400 text-xs sm:text-sm cursor-pointer px-3 py-1.5 rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-gray-600"
            onClick={handleRefresh} 
            title="Refresh completion status"
          >
            ↻ Refresh
          </button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ProfileCompletionPopup;
