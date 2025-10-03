import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useAuth } from "../../../../Context/AuthContext";
import axios from 'axios';

const ProfileCompletion = () => {
  const { user } = useAuth();
  const [completionData, setCompletionData] = useState({
    easy: { percentage: 0, completedSections: 0, totalSections: 4 },
    full: { percentage: 0, completedSections: 0, totalSections: 6 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState('full');

  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchProfileCompletion();
    }
  }, [user, selectedMode]);

  const fetchProfileCompletion = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // Fetch all required data using correct endpoints
      const [personalRes, presentAddressRes, permanentAddressRes, educationRes, experienceRes, jobPrefRes, socialRes, additionalRes1, additionalRes2, languagesRes] = await Promise.all([
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

      // Combine address data
      const addressData = [...(presentAddressRes.data || []), ...(permanentAddressRes.data || [])];

      let easyModeCompleted = 0;
      let fullModeCompleted = 0;

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
      }

      // Education
      if (educationRes.data.length > 0) {
        const education = educationRes.data.find(edu => edu.firebase_uid === user.uid) || educationRes.data[0];
        const hasBasicEducation = education.degreeName || education.grade12Year || 
                            education.education_type || education.syllabus || 
                            education.schoolName || education.courseName;
        
        if (hasBasicEducation) {
          easyModeCompleted++;
        }

        const hasDetailedEducation = education.degreeYear || education.degreeCollege || education.grade12School || 
                                    education.grade12Percentage || education.instituteName || education.yearOfCompletion;
        
        if (hasBasicEducation && (hasDetailedEducation || education.education_type)) {
          fullModeCompleted++;
        }
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
      }

      // Job Preferences
      if (jobPrefRes.data.length > 0) {
        const jobPref = jobPrefRes.data.find(pref => pref.firebase_uid === user.uid) || jobPrefRes.data[0];
        if (jobPref.Job_Type || jobPref.expected_salary) {
          easyModeCompleted++;
        }
        if (jobPref.Job_Type && jobPref.expected_salary) {
          fullModeCompleted++;
        }
      }

      // Full Mode Only Sections
      // Social Media
      if (socialRes.data.length > 0) {
        const social = socialRes.data.find(s => s.firebase_uid === user.uid) || socialRes.data[0];
        if (social.linkedin || social.facebook || social.twitter || social.instagram) {
          fullModeCompleted++;
        }
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
        }
      }

      setCompletionData({
        easy: {
          percentage: Math.round((easyModeCompleted / 4) * 100),
          completedSections: easyModeCompleted,
          totalSections: 4
        },
        full: {
          percentage: Math.round((fullModeCompleted / 6) * 100),
          completedSections: fullModeCompleted,
          totalSections: 6
        }
      });

    } catch (error) {
      console.error('Error fetching profile completion:', error);
      setCompletionData({
        easy: { percentage: 0, completedSections: 0, totalSections: 4 },
        full: { percentage: 0, completedSections: 0, totalSections: 6 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage === 0) return '#dc3545';
    if (percentage < 50) return '#ffc107';
    if (percentage < 100) return '#0d6efd';
    return '#198754';
  };

  const getStatusText = (percentage) => {
    if (percentage === 0) return 'Not Started';
    if (percentage < 50) return 'In Progress';
    if (percentage < 100) return 'Almost Done';
    return 'Complete';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(completionData.full.percentage);
  const statusText = getStatusText(completionData.full.percentage);

  const renderEasyModeContent = () => (
    <div className="flex flex-col items-center">
      {/* Circular Progress with Gradient */}
      <div className="flex items-center justify-center mb-4">
        <Link to="/seeker/my-profile">
          <div className="w-[100px] h-[100px] relative">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="progressGradientEasy" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="12.99%" stopColor="#F95257" />
                  <stop offset="86.5%" stopColor="#A2035D" />
                </linearGradient>
              </defs>
            </svg>
            <CircularProgressbar
              value={completionData.easy.percentage}
              text={`${completionData.easy.percentage}%`}
              strokeWidth={18}
              styles={buildStyles({
                textSize: '20px',
                pathColor: 'url(#progressGradientEasy)',
                textColor: '#333333',
                trailColor: '#f0f0f0',
                pathTransitionDuration: 0.5,
                strokeLinecap: 'round',
              })}
            />
          </div>
        </Link>
      </div>
      
      {/* Arrow Link */}
      <Link 
        to="/seeker/my-profile" 
        className="text-red-500 hover:text-red-600 transition-all"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.5 7l5 5-5 5V7zm7 0l5 5-5 5V7z"/>
        </svg>
      </Link>
    </div>
  );

  const renderFullModeContent = () => (
    <div className="flex flex-col items-center">
      {/* Circular Progress with Gradient */}
      <div className="flex items-center justify-center mb-4">
        <Link to="/seeker/my-profile">
          <div className="w-[100px] h-[100px] relative">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <linearGradient id="progressGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="12.99%" stopColor="#F95257" />
                  <stop offset="86.5%" stopColor="#A2035D" />
                </linearGradient>
              </defs>
            </svg>
            <CircularProgressbar
              value={completionData.full.percentage}
              text={`${completionData.full.percentage}%`}
              strokeWidth={18}
              styles={buildStyles({
                textSize: '20px',
                pathColor: 'url(#progressGradientFull)',
                textColor: '#333333',
                trailColor: '#f0f0f0',
                pathTransitionDuration: 0.5,
                strokeLinecap: 'round',
              })}
            />
          </div>
        </Link>
      </div>
      
      {/* Arrow Link */}
      <Link 
        to="/seeker/my-profile" 
        className="text-red-500 hover:text-red-600 transition-all"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.5 7l5 5-5 5V7zm7 0l5 5-5 5V7z"/>
        </svg>
      </Link>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative h-full">
      {/* Title at top */}
      <div className="text-center mb-4">
        <h5 className="text-lg font-bold text-gray-800">Profile Completion</h5>
      </div>

      {/* Two Column Grid for Short and Complete Profile */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <h6 className="text-center text-base font-semibold mb-3 text-gray-700">Short Profile</h6>
          {renderEasyModeContent()}
        </div>
        <div className="flex flex-col">
          <h6 className="text-center text-base font-semibold mb-3 text-gray-700">Complete Profile</h6>
          {renderFullModeContent()}
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion; 