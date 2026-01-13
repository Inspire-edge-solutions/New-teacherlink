import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext";
// CSS imports removed - all styles converted to Tailwind CSS
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { decodeCandidateData } from '../../../../utils/dataDecoder';
import LoadingState from '../../../common/LoadingState';

// Define a base64 encoded default avatar as a data URI
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='120' height='120'%3E%3Ccircle cx='12' cy='7' r='5' fill='%23ccc'/%3E%3Cpath d='M3 19c0-4.1 3.4-8 9-8s9 3.9 9 8H3z' fill='%23ccc'/%3E%3C/svg%3E";

const hasMeaningfulFields = (data, excludedKeys = []) => {
  if (!data) return false;

  if (Array.isArray(data)) {
    return data.some((item) => hasMeaningfulFields(item, excludedKeys));
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') return data.trim() !== '';
    return data !== undefined && data !== null;
  }

  return Object.keys(data).some((key) => {
    if (excludedKeys.includes(key)) return false;
    const value = data[key];

    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  });
};

const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

function EasyView({ onViewAttempt, onEditProfile }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: [], dynamoData: [] });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [dataCheckComplete, setDataCheckComplete] = useState(false);
  const noDataToastShownRef = useRef(false);
  
  // Add a useEffect for responsive handling
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch user's profile photo
  const fetchProfilePhoto = useCallback(async () => {
    try {
      if (!user?.uid) return;

      const params = { firebase_uid: user.uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });

      if (data?.url) {
        setPhotoUrl(data.url);
        setPhotoError(false);
      }
    } catch (error) {
      console.error("Error fetching profile photo:", error);
      setPhotoError(true);
      // Don't show toast for 404 errors (no photo uploaded yet)
      if (error.response?.status !== 404) {
        toast.error("Error loading profile photo");
      }
    }
  }, [user]);

  const fetchEducationData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await axios.get(EDUCATION_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const userEducation = response.data.filter(edu => edu.firebase_uid === user.uid);
        // Decode the education data (decrypt base64 encoded fields)
        const decodedEducation = userEducation.map(edu => decodeCandidateData(edu));
        setEducationData(decodedEducation);
      }
    } catch (err) {
      console.error('Education API Error:', err);
    }
  }, [user]);

  const fetchProfileData = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(FULL_API, {
        params: { firebase_uid: user.uid, t: Date.now() }
      });
      
      // Enhanced logging for debugging
      console.log('Full API Response:', response.data);
      console.log('Response type:', typeof response.data);
      console.log('Is Array:', Array.isArray(response.data));
      console.log('User UID:', user.uid);
      console.log('User Email:', user.email);
      
      let userRecord = null;
      
      if (response.status === 200) {
        // Handle different response formats
        if (Array.isArray(response.data)) {
          // Original expected format
          userRecord = response.data.find(r => 
            r.firebase_uid === user.uid || 
            (r.email && user.email && r.email.toLowerCase() === user.email.toLowerCase())
          );
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Single object response
          if (response.data.firebase_uid === user.uid || 
              (response.data.email && user.email && response.data.email.toLowerCase() === user.email.toLowerCase())) {
            userRecord = response.data;
          }
        }
        
        // If no record found in main API, try to construct basic profile from other data
        if (!userRecord) {
          console.log('No record found in main API, checking if user has any profile data...');
          
          // Check if user has any data in other tables by making individual API calls
          try {
            const [educationRes, experienceRes, jobPrefRes] = await Promise.all([
              axios.get(EDUCATION_API).catch(() => ({ data: [] })),
              axios.get(EXPERIENCE_API).catch(() => ({ data: { mysqlData: [], dynamoData: [] } })),
              axios.get(JOB_PREFERENCE_API).catch(() => ({ data: [] }))
            ]);
            
            const hasEducationData = Array.isArray(educationRes.data) && 
              educationRes.data.some(edu => edu.firebase_uid === user.uid);
            const hasExperienceData = experienceRes.data.mysqlData?.some(exp => exp.firebase_uid === user.uid) ||
              experienceRes.data.dynamoData?.some(exp => exp.firebase_uid === user.uid);
            const hasJobPrefData = Array.isArray(jobPrefRes.data) && 
              jobPrefRes.data.some(pref => pref.firebase_uid === user.uid);
            
            // If user has data in any table, create a basic profile object
            if (hasEducationData || hasExperienceData || hasJobPrefData) {
              userRecord = {
                firebase_uid: user.uid,
                email: user.email,
                name: user.displayName || user.email?.split('@')[0] || 'User',
                hasPartialData: true,
                hasEducation: hasEducationData,
                hasExperience: hasExperienceData,
                hasJobPreferences: hasJobPrefData
              };
              console.log('Created basic profile from partial data:', userRecord);
            }
          } catch (partialDataError) {
            console.error('Error checking partial data:', partialDataError);
          }
        }
      }
      
      console.log('Final userRecord:', userRecord);
      // Decode the profile data (decrypt base64 encoded fields)
      const decodedProfile = userRecord ? decodeCandidateData(userRecord) : null;
      console.log('Decoded profile:', decodedProfile);
      setProfileData(decodedProfile);
      
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message);
      
      // Don't show error toast for network issues, let the component handle it gracefully
      if (err.response?.status === 404) {
        console.log('Profile not found (404) - user may not have completed profile');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchExperienceData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await axios.get(EXPERIENCE_API);
      if (response.status === 200) {
        const { mysqlData, dynamoData } = response.data;
        const userMysqlData = mysqlData.find(exp => exp.firebase_uid === user.uid) || null;
        const userDynamoData = dynamoData.find(exp => exp.firebase_uid === user.uid) || null;
        // Decode the experience data (decrypt base64 encoded fields)
        const decodedMysqlData = userMysqlData ? decodeCandidateData(userMysqlData) : {};
        const decodedDynamoData = userDynamoData ? decodeCandidateData(userDynamoData) : {};
        setExperienceData({ 
          mysqlData: decodedMysqlData,
          dynamoData: decodedDynamoData
        });
      }
    } catch (err) {
      console.error('Experience API Error:', err);
    }
  }, [user]);

  const fetchJobPreferenceData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await axios.get(JOB_PREFERENCE_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const userPreference = response.data.find(pref => pref.firebase_uid === user.uid);
        // Decode the job preference data (decrypt base64 encoded fields)
        const decodedPreference = userPreference ? decodeCandidateData(userPreference) : null;
        setJobPreferenceData(decodedPreference);
      }
    } catch (err) {
      console.error('Job Preference API Error:', err);
    }
  }, [user]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        await Promise.all([
          fetchProfileData(),
          fetchEducationData(),
          fetchExperienceData(),
          fetchJobPreferenceData(),
          fetchProfilePhoto()
        ]);
        setDataCheckComplete(true);
      } catch (error) {
        console.error('Error loading data:', error);
        setDataCheckComplete(true);
      }
    };
    
    loadAllData();
  }, [fetchProfileData, fetchEducationData, fetchExperienceData, fetchJobPreferenceData, fetchProfilePhoto]);

  const shouldShowEmptyState = useMemo(() => {
    const profileHasData = hasMeaningfulFields(profileData, [
      'firebase_uid',
      'hasPartialData',
      'hasEducation',
      'hasExperience',
      'hasJobPreferences'
    ]);

    const educationExists = Array.isArray(educationData) && educationData.length > 0;
    const mysqlExperienceExists = hasMeaningfulFields(experienceData?.mysqlData || {});
    const dynamoExperienceExists = Array.isArray(experienceData?.dynamoData?.experienceEntries) &&
      experienceData.dynamoData.experienceEntries.length > 0;
    const jobPreferenceExists = hasMeaningfulFields(jobPreferenceData, ['firebase_uid']);

    const hasAnyAssociatedData = educationExists || mysqlExperienceExists || dynamoExperienceExists || jobPreferenceExists;

    return !profileData?.hasPartialData && !profileHasData && !hasAnyAssociatedData;
  }, [profileData, educationData, experienceData, jobPreferenceData]);

  useEffect(() => {
    if (!isLoading && dataCheckComplete && shouldShowEmptyState && !noDataToastShownRef.current) {
      toast.info('No profile data found. Please complete your profile information.');
      noDataToastShownRef.current = true;
    }

    if (!shouldShowEmptyState) {
      noDataToastShownRef.current = false;
    }
  }, [isLoading, dataCheckComplete, shouldShowEmptyState]);

  if (!user?.uid) {
    return (
      <div className="alert alert-warning text-center">
        Please log in to view your profile.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState
          title="Preparing your quick profile view…"
          subtitle="We’re gathering your saved information and formatting it for display."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Error loading profile: {error}
      </div>
    );
  }

  // If no profile data, don't render anything but stay on the page
  // If user has partial data, show a message encouraging completion
  if (profileData?.hasPartialData) {
    return (
      <div className="profile-container">
        <div className="alert alert-info text-center">
          <h5>Profile Partially Complete</h5>
          <p>You have some profile information saved. Please complete your profile to view the full details.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => onViewAttempt && onViewAttempt()}
          >
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && dataCheckComplete && shouldShowEmptyState) {
    return (
      <div className="profile-container flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="max-w-md w-full bg-[#F0D8D9] border border-dashed border-gray-300 rounded-xl p-8 shadow-sm">
          <h4 className="text-xl font-semibold text-gray-800 mb-3 leading-tight tracking-tight">No Profile Data Yet</h4>
          <p className="text-base text-gray-600 mb-6 leading-normal tracking-tight">
            We couldn&apos;t find any profile details to show. Please complete your profile to view it here.
          </p>
          <button
            type="button"
            onClick={() => onViewAttempt && onViewAttempt()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-brand hover:bg-gradient-brand-hover transition-all duration-200"
          >
            Back to Profile Selection
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        return null;
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // If birthday hasn't occurred this year yet, subtract 1
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return null;
    }
  };

  const getEducationTypeTitle = (type) => {
    const titles = {
      grade10: 'Grade 10',
      grade12: 'Grade 12',
      degree: 'Degree',
      masterDegree: 'Master\'s Degree',
      doctorate: 'Doctorate',
      nttMtt: 'NTT/MTT',
      dEd: 'D.Ed/D.EID',
      bEd: 'B.Ed',
      certificate: 'Certificate/Other Course'
    };
    return titles[type] || type;
  };

  const renderExperienceType = (type) => {
    const titles = {
      teaching: 'Education - Teaching',
      administration: 'Education - Administration',
      teachingAndAdministration: 'Education - Teaching + Administration',
      nonEducation: 'Non-Education (Any Role)'
    };
    return titles[type] || type;
  };

  const renderEducationBlocks = () => {
    if (!educationData || educationData.length === 0) {
      return <div>No education details available</div>;
    }

    return educationData.map((education, index) => (
      <div key={`${education.education_type}-${index}`} className="education-block mb-5 pb-[15px] border-b border-gray-300 last:border-b-0">
        <div className="education-title font-bold text-gray-800 mb-1">{getEducationTypeTitle(education.education_type)}</div>
        {education.yearOfPassing && (
          <div className="education-detail text-base mb-0.5 leading-normal tracking-tight">Year of Passing: {education.yearOfPassing}</div>
        )}
        {education.courseName && (
          <div className="education-detail text-base mb-0.5 leading-normal tracking-tight">Course Name: {education.courseName}</div>
        )}
      </div>
    ));
  };

  const getExperienceText = () => {
    if (!experienceData?.mysqlData) return null;
    
    const { teaching_experience_years, teaching_experience_months, total_experience_years, total_experience_months } = experienceData.mysqlData;
    
    if ((teaching_experience_years === undefined || teaching_experience_years === null) && 
        (total_experience_years === undefined || total_experience_years === null)) {
      return null;
    }
    
    return (
      <div className="experience-summary text-base mb-[15px] p-2.5 bg-gray-50 border-l-[3px] border-[#1967d2] text-gray-800 whitespace-pre-line leading-normal tracking-tight">
        {total_experience_years !== undefined && total_experience_years !== null && (
          <div>Total Experience: {total_experience_years} Years {total_experience_months || 0} Months</div>
        )}
        {teaching_experience_years !== undefined && teaching_experience_years !== null && (
          <div>Teaching Experience: {teaching_experience_years} Years {teaching_experience_months || 0} Months</div>
        )}
      </div>
    );
  };

  const renderExperienceBlocks = () => {
    if (!experienceData?.dynamoData?.experienceEntries || 
        experienceData.dynamoData.experienceEntries.length === 0) {
      return null;
    }
    
    return experienceData.dynamoData.experienceEntries.map((exp, index) => {
      if (!exp || !exp.organizationName) return null;
      
      const designation = exp.jobType === 'teaching' ? exp.teachingDesignation :
                         exp.jobType === 'administration' ? exp.adminDesignation :
                         exp.jobType === 'teachingAndAdministration' ? 
                           (exp.teachingAdminDesignations && exp.teachingAdminDesignations.length > 0 ? 
                             exp.teachingAdminDesignations.join(', ') : '') :
                         exp.designation || '';
      
      // Format the date range
      const startDate = exp.work_from_month && exp.work_from_year ? 
                      `${exp.work_from_month} / ${exp.work_from_year}` : '';
      const endDate = exp.currentlyWorking ? 
                    'till date' : 
                    (exp.work_till_month && exp.work_till_year ? 
                     `${exp.work_till_month} / ${exp.work_till_year}` : '');
      const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
      
      // Calculate experience duration if available
      let durationText = '';
      if (exp.experience_years || exp.experience_months) {
        durationText = ` (${exp.experience_years || 0} Years ${exp.experience_months || 0} Months)`;
      }
      
      // Format job type and nature
      let jobTypeText = [];
      if (exp.jobType === 'teaching') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Teaching)');
      } else if (exp.jobType === 'administration') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Non-Teaching)');
      } else if (exp.jobType === 'teachingAndAdministration') {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Teaching + Non-Teaching)');
      } else {
        jobTypeText.push(exp.jobCategory === 'fullTime' ? 'Full Time' : 'Part Time');
        jobTypeText.push('(Non-Teaching)');
      }
      
      if (exp.jobMode) {
        jobTypeText.push(`${exp.jobMode === 'offline' ? 'Regular (Offline)' : 'Regular (Online)'}`);
      }
      
      if (exp.salary) {
        jobTypeText.push(`${exp.salary} LPA`);
      }
      
      const location = [exp.city, exp.state, exp.country].filter(Boolean).join(', ');
      
      return (
        <div className="experience-block mb-[25px] text-base leading-normal tracking-tight" key={index}>
          {/* Organization and date row */}
          <div className="flex justify-between font-bold mb-1">
            <div className="text-base">{exp.organizationName}</div>
            <div>
              {dateRange}
              <span className="font-normal text-gray-600">{durationText}</span>
            </div>
          </div>
          
          {/* Location row */}
          <div className="mb-1.5 text-gray-600">{location}</div>
          
          {/* Job details row */}
          <div className="mb-1.5">
            {jobTypeText.join(' | ')}
          </div>
          
          {/* Two-column details grid */}
          <div className={`grid ${windowWidth <= 768 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-5 gap-y-1`}>
            <div>
              <strong>Designation:</strong> {designation}
            </div>
            
            {/* Teaching specific fields */}
            {exp.jobType === 'teaching' && exp.teachingGrades && (
              <div>
                <strong>Grades handled:</strong> {Array.isArray(exp.teachingGrades) ? 
                  exp.teachingGrades.join(', ') : exp.teachingGrades}
              </div>
            )}
            
            {exp.jobType === 'teaching' && exp.teachingSubjects && (
              <div>
                <strong>Subject handled:</strong> {Array.isArray(exp.teachingSubjects) ? 
                  exp.teachingSubjects.join(', ') : exp.teachingSubjects}
              </div>
            )}
            
            {exp.jobType === 'teaching' && exp.teachingCoreExpertise && (
              <div>
                <strong>Core Expertise:</strong> {Array.isArray(exp.teachingCoreExpertise) ? 
                  exp.teachingCoreExpertise.join(', ') : exp.teachingCoreExpertise}
              </div>
            )}
            
            {exp.jobType === 'teaching' && exp.teachingCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.teachingCurriculum}
              </div>
            )}
            
            {/* TeachingAndAdministration specific fields */}
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminGrades && (
              <div>
                <strong>Grades handled:</strong> {Array.isArray(exp.teachingAdminGrades) ? 
                  exp.teachingAdminGrades.join(', ') : exp.teachingAdminGrades}
              </div>
            )}
            
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminSubjects && (
              <div>
                <strong>Subject handled:</strong> {Array.isArray(exp.teachingAdminSubjects) ? 
                  exp.teachingAdminSubjects.join(', ') : exp.teachingAdminSubjects}
              </div>
            )}
            
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminCoreExpertise && (
              <div>
                <strong>Core Expertise:</strong> {Array.isArray(exp.teachingAdminCoreExpertise) ? 
                  exp.teachingAdminCoreExpertise.join(', ') : exp.teachingAdminCoreExpertise}
              </div>
            )}
            
            {exp.jobType === 'teachingAndAdministration' && exp.teachingAdminCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.teachingAdminCurriculum}
              </div>
            )}
            
            {/* Administration specific fields (if any additional fields needed) */}
            {exp.jobType === 'administration' && exp.adminCurriculum && (
              <div>
                <strong>Curriculum:</strong> {exp.adminCurriculum}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  return (
    <div className="cv-container max-w-[1000px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden font-sans text-gray-800 px-[5px] py-2.5 overflow-x-hidden">
      {/* Edit Profile Button - Top Level */}
      <div className="flex justify-end mb-[15px]">
        <button
          onClick={() => {
            if (onEditProfile) {
              onEditProfile();
            } else {
              window.location.href = "/seeker/my-profile";
            }
          }}
          className={`btn bg-gradient-brand hover:bg-gradient-brand-hover text-white ${isMobile ? 'btn-mobile' : ''} text-base px-4 py-2 sm:px-5 sm:py-2.5 rounded-md font-medium leading-normal tracking-tight`}
        >
          Edit Profile
        </button>
      </div>

      <div className={`cv-header ${isMobile ? 'flex-col items-center text-center p-2' : 'flex flex-row items-start p-6'} bg-white border-b border-gray-200 mb-2.5 overflow-x-hidden`}>
        {/* Left Side: Profile Picture + Basic Info */}
        <div className={`flex ${isMobile ? 'flex-col' : ''} gap-5 ${isMobile ? 'mb-2 items-center' : 'w-1/2 pr-4'} min-w-0`}>
          {/* Profile Picture */}
          <div className={`profile-photo ${isMobile ? 'w-[100px] h-[100px] mb-2.5' : 'w-[100px] h-[100px]'} rounded-full overflow-hidden border-[3px] border-gray-100 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${isMobile ? 'm-0' : 'mr-2.5'} shrink-0`}>
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={`${profileData.fullName || 'User'}'s profile photo`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  setPhotoError(true);
                  e.target.src = defaultAvatar;
                }}
              />
            ) : (
              <img src={defaultAvatar} alt={`${profileData.fullName || 'User'}'s default avatar`} className="w-full h-full object-cover" />
            )}
          </div>
          
          {/* Basic Information */}
          <div className="flex-1 min-w-0">
            <h1 className={`candidate-name mb-1 text-xl bg-gradient-brand bg-clip-text text-transparent break-words leading-tight tracking-tight`}>
              {profileData.fullName || 'Candidate Name'}
            </h1>
            
            {/* Personal Details */}
            <div className={`mb-0.5 text-base text-gray-600 break-words leading-normal tracking-tight`}>
              {profileData.gender && <span>{profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1).toLowerCase()}</span>}
              {profileData.dateOfBirth && (() => {
                const age = calculateAge(profileData.dateOfBirth);
                return age !== null ? <span> | Age: {age} Years</span> : null;
              })()}
              {experienceData?.mysqlData?.total_experience_years > 0 && (
                <span> | Experience: {experienceData.mysqlData.total_experience_years} Years {experienceData.mysqlData.total_experience_months || 0} Months</span>
              )}
            </div>
            
            {/* Email */}
            {profileData.email && (
              <div className={`flex items-center text-base min-w-0 leading-normal tracking-tight`}>
                <FaEnvelope className="mr-1.5 text-gray-400 shrink-0" />
                <a href={`mailto:${profileData.email}`} className="no-underline text-[#1967d2] break-words overflow-wrap-anywhere">
                  {profileData.email}
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Contact Information */}
        <div className={`font-sans text-base w-full sm:w-1/2 leading-normal tracking-tight ${isMobile ? 'mt-2' : 'pl-4'} min-w-0`}>
          {/* Address Information */}
          <div className={`flex ${isMobile ? 'flex-row' : 'flex-col'} ${isMobile ? 'gap-[15px]' : 'gap-1.5'} ${isMobile ? 'mb-1.5 flex-wrap' : 'mb-2'}`}>
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'} min-w-0`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Present:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'} min-w-0`}>
                {[
                  profileData.present_city_name,
                  profileData.present_state_name,
                  profileData.present_country_name
                ].filter(Boolean).join(', ') || 'Not provided'}
              </span>
            </div>
            
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'} min-w-0`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Permanent:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'} min-w-0`}>
                {[
                  profileData.permanent_city_name,
                  profileData.permanent_state_name,
                  profileData.permanent_country_name
                ].filter(Boolean).join(', ') || 'Not provided'}
              </span>
            </div>
          </div>
          
          {/* Phone Numbers - Same Line */}
          <div className={`flex ${isMobile ? 'flex-row' : 'flex-row'} ${isMobile ? 'gap-[15px]' : 'gap-4'} ${isMobile ? 'mb-1.5 flex-wrap' : 'mb-2'}`}>
            <div className="flex items-center min-w-0">
              <FaPhone className="mr-1.5 text-[#1a73e8] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Phone:</span>
              <span className="break-words">{profileData.callingNumber || 'Not provided'}</span>
            </div>
             
            <div className="flex items-center min-w-0">
              <FaWhatsapp className="mr-1.5 text-[#25D366] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">WhatsApp:</span>
              <span className="break-words">{profileData.whatsappNumber || 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="cv-body flex flex-col md:flex-row p-0 bg-white">
        <div className="cv-sidebar w-full md:w-[35%] bg-gray-100 p-2.5 md:p-5">
          <div className="cv-section education-section mt-0 mb-2.5">
            <h2 className="section-title text-center border-b border-black mb-[15px] pb-1 uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">
              EDUCATION
            </h2>
            {renderEducationBlocks()}
          </div>
        </div>

        <div className="cv-main w-full md:w-[65%] md:px-2">
          <div className="cv-section experience-section mt-0 mb-2.5">
            <h2 className="section-title text-center border-b border-black mb-[15px] pb-1 uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">
              WORK EXPERIENCE
            </h2>
            {getExperienceText()}
            {renderExperienceBlocks()}
          </div>
          
          {jobPreferenceData && (() => {
            // Check if job preferences have meaningful data
            const hasBasicData = ['Job_Type', 'expected_salary', 'notice_period', 'preferred_country', 'preferred_state', 'preferred_city'].some(field => 
              jobPreferenceData[field] && 
              jobPreferenceData[field] !== '' && 
              jobPreferenceData[field] !== null &&
              jobPreferenceData[field] !== undefined
            );
            
            const jobType = jobPreferenceData.Job_Type;
            let hasConditionalData = false;
            
            if (jobType === 'teaching') {
              const teachingFields = ['teaching_designations', 'teaching_curriculum', 'teaching_subjects', 'teaching_grades', 'teaching_coreExpertise'];
              hasConditionalData = teachingFields.some(field => {
                const value = jobPreferenceData[field];
                return value && value !== '' && value !== null && value !== undefined && 
                       (Array.isArray(value) ? value.length > 0 : true);
              });
            } else if (jobType === 'administration') {
              const adminFields = ['administrative_designations', 'administrative_curriculum'];
              hasConditionalData = adminFields.some(field => {
                const value = jobPreferenceData[field];
                return value && value !== '' && value !== null && value !== undefined && 
                       (Array.isArray(value) ? value.length > 0 : true);
              });
            } else if (jobType === 'teachingAndAdmin') {
              const teachingAdminFields = ['teaching_administrative_designations', 'teaching_administrative_curriculum', 'teaching_administrative_subjects', 'teaching_administrative_grades', 'teaching_administrative_coreExpertise'];
              hasConditionalData = teachingAdminFields.some(field => {
                const value = jobPreferenceData[field];
                return value && value !== '' && value !== null && value !== undefined && 
                       (Array.isArray(value) ? value.length > 0 : true);
              });
            }
            
            if (!hasBasicData && !hasConditionalData) return null;
            
            return (
              <div className="cv-section job-preferences mt-0 mb-2.5">
                <h2 className="section-title text-center border-b border-black mb-[15px] pb-1 uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">JOB PREFERENCES</h2>
                <div className="job-preferences-block bg-[#f5f7fc] p-5 rounded-lg mb-[25px] text-base leading-normal tracking-tight">
                  {/* Two-column details grid */}
                  <div className={`grid ${windowWidth <= 768 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-5 gap-y-1`}>
                    {/* Basic Job Information */}
                    {jobPreferenceData.Job_Type && (
                      <div>
                        <strong>Job Type:</strong> {
                          jobPreferenceData.Job_Type === 'teaching' ? 'Education - Teaching' :
                          jobPreferenceData.Job_Type === 'administration' ? 'Education - Administration' :
                          jobPreferenceData.Job_Type === 'teachingAndAdmin' ? 'Education - Teaching + Administration' :
                          jobPreferenceData.Job_Type
                        }
                      </div>
                    )}
                    
                    {jobPreferenceData.expected_salary && (
                      <div><strong>Expected Salary:</strong> {(() => {
                        // Format expected salary to LPA
                        const formatExpectedSalaryToLPA = (expectedSalary) => {
                          if (!expectedSalary) return 'Not specified';
                          
                          const normalized = String(expectedSalary).toLowerCase().trim();
                          
                          const rangeMappings = {
                            'less_than_40k': 'Less than 4.8 LPA',
                            '40k_60k': '4.8 LPA to 7.2 LPA',
                            '60k_80k': '7.2 LPA to 9.6 LPA',
                            '80k_100k': '9.6 LPA to 12 LPA',
                            '100k_120k': '12 LPA to 14.4 LPA',
                            '120k_140k': '14.4 LPA to 16.8 LPA',
                            '140k_160k': '16.8 LPA to 19.2 LPA',
                            '160k_180k': '19.2 LPA to 21.6 LPA',
                            '180k_200k': '21.6 LPA to 24 LPA',
                            'more_than_200k': 'More than 24 LPA'
                          };
                          
                          if (rangeMappings[normalized]) {
                            return rangeMappings[normalized];
                          }
                          
                          const numeric = parseFloat(expectedSalary);
                          if (!Number.isNaN(numeric) && numeric >= 1000) {
                            let valueStr = String(expectedSalary).trim();
                            const hasK = /k$/i.test(valueStr);
                            if (hasK) valueStr = valueStr.replace(/k$/i, '');
                            const numericValue = parseFloat(valueStr);
                            if (!Number.isNaN(numericValue)) {
                              const actualValue = hasK ? numericValue * 1000 : numericValue;
                              const annualSalary = actualValue < 100000 ? actualValue * 12 : actualValue;
                              const lpa = annualSalary / 100000;
                              const formattedLPA = parseFloat(lpa.toFixed(1));
                              return `₹${formattedLPA} LPA`;
                            }
                          }
                          
                          return expectedSalary;
                        };
                        return formatExpectedSalaryToLPA(jobPreferenceData.expected_salary);
                      })()}</div>
                    )}
                    
                    {jobPreferenceData.notice_period && (
                      <div><strong>Notice Period:</strong> {jobPreferenceData.notice_period}</div>
                    )}

                    {/* Conditional Data Based on Job Type */}
                    {jobPreferenceData.Job_Type === 'teaching' && (
                      <>
                        {jobPreferenceData.teaching_designations && Array.isArray(jobPreferenceData.teaching_designations) && jobPreferenceData.teaching_designations.length > 0 && (
                          <div>
                            <strong>Teaching Designations:</strong> {jobPreferenceData.teaching_designations.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_curriculum && Array.isArray(jobPreferenceData.teaching_curriculum) && jobPreferenceData.teaching_curriculum.length > 0 && (
                          <div>
                            <strong>Teaching Curriculum:</strong> {jobPreferenceData.teaching_curriculum.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_subjects && Array.isArray(jobPreferenceData.teaching_subjects) && jobPreferenceData.teaching_subjects.length > 0 && (
                          <div>
                            <strong>Teaching Subjects:</strong> {jobPreferenceData.teaching_subjects.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_grades && Array.isArray(jobPreferenceData.teaching_grades) && jobPreferenceData.teaching_grades.length > 0 && (
                          <div>
                            <strong>Teaching Grades:</strong> {jobPreferenceData.teaching_grades.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_coreExpertise && Array.isArray(jobPreferenceData.teaching_coreExpertise) && jobPreferenceData.teaching_coreExpertise.length > 0 && (
                          <div>
                            <strong>Core Expertise:</strong> {jobPreferenceData.teaching_coreExpertise.join(', ')}
                          </div>
                        )}
                      </>
                    )}

                    {jobPreferenceData.Job_Type === 'administration' && (
                      <>
                        {jobPreferenceData.administrative_designations && Array.isArray(jobPreferenceData.administrative_designations) && jobPreferenceData.administrative_designations.length > 0 && (
                          <div>
                            <strong>Administrative Designations:</strong> {jobPreferenceData.administrative_designations.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.administrative_curriculum && Array.isArray(jobPreferenceData.administrative_curriculum) && jobPreferenceData.administrative_curriculum.length > 0 && (
                          <div>
                            <strong>Administrative Curriculum:</strong> {jobPreferenceData.administrative_curriculum.join(', ')}
                          </div>
                        )}
                      </>
                    )}

                    {jobPreferenceData.Job_Type === 'teachingAndAdmin' && (
                      <>
                        {jobPreferenceData.teaching_administrative_designations && Array.isArray(jobPreferenceData.teaching_administrative_designations) && jobPreferenceData.teaching_administrative_designations.length > 0 && (
                          <div>
                            <strong>Teaching + Admin Designations:</strong> {jobPreferenceData.teaching_administrative_designations.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_administrative_curriculum && Array.isArray(jobPreferenceData.teaching_administrative_curriculum) && jobPreferenceData.teaching_administrative_curriculum.length > 0 && (
                          <div>
                            <strong>Teaching + Admin Curriculum:</strong> {jobPreferenceData.teaching_administrative_curriculum.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_administrative_subjects && Array.isArray(jobPreferenceData.teaching_administrative_subjects) && jobPreferenceData.teaching_administrative_subjects.length > 0 && (
                          <div>
                            <strong>Teaching + Admin Subjects:</strong> {jobPreferenceData.teaching_administrative_subjects.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_administrative_grades && Array.isArray(jobPreferenceData.teaching_administrative_grades) && jobPreferenceData.teaching_administrative_grades.length > 0 && (
                          <div>
                            <strong>Teaching + Admin Grades:</strong> {jobPreferenceData.teaching_administrative_grades.join(', ')}
                          </div>
                        )}
                        {jobPreferenceData.teaching_administrative_coreExpertise && Array.isArray(jobPreferenceData.teaching_administrative_coreExpertise) && jobPreferenceData.teaching_administrative_coreExpertise.length > 0 && (
                          <div>
                            <strong>Teaching + Admin Core Expertise:</strong> {jobPreferenceData.teaching_administrative_coreExpertise.join(', ')}
                          </div>
                        )}
                      </>
                    )}

                    {/* Location Preferences */}
                    {(jobPreferenceData.preferred_country || jobPreferenceData.preferred_state || jobPreferenceData.preferred_city) && (
                      <div>
                        <strong>Preferred Locations:</strong> {
                          [
                            jobPreferenceData.preferred_country && `Country: ${jobPreferenceData.preferred_country}`,
                            jobPreferenceData.preferred_state && `State: ${jobPreferenceData.preferred_state}`,
                            jobPreferenceData.preferred_city && `City: ${jobPreferenceData.preferred_city}`
                          ].filter(Boolean).join(' | ')
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default React.memo(EasyView);