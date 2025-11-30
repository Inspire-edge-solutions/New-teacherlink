import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext";
import { useNavigate } from 'react-router-dom';
// CSS imports removed - all styles converted to Tailwind CSS
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { decodeCandidateData } from '../../../../utils/dataDecoder';
import LoadingState from '../../../common/LoadingState';

// Define a base64 encoded default avatar as a data URI
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='120' height='120'%3E%3Ccircle cx='12' cy='7' r='5' fill='%23ccc'/%3E%3Cpath d='M3 19c0-4.1 3.4-8 9-8s9 3.9 9 8H3z' fill='%23ccc'/%3E%3C/svg%3E";
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const ADDITIONAL_INFO_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1';
const SOCIAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile';

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

const Section = ({ title, children }) => (
  <div className="default-form">
    <div className="section-container">
      <h4 className="section-title">{title}</h4>
      <div className="row g-3">{children}</div>
    </div>
        </div>
      );

const Field = ({ label, value }) => {
  if (!value) return null;
  
  const displayValue = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value.split(',').join(', ') : value;

  return (
    <div className="form-group col-lg-4 col-md-12 mb-2">
      <div className="input-wrapper">
        <div className="form-control">
          {displayValue}
        </div>
        <span className="custom-tooltip">{label}</span>
      </div>
    </div>
  );
};

const isPositiveValue = (value) => {
  if (value === null || value === undefined) return false;
  
  // Handle number case
  if (typeof value === 'number') return value === 1;
  
  // Handle string case
  if (typeof value === 'string') {
    const lowercaseValue = value.toLowerCase().trim();
    return lowercaseValue === 'yes' || lowercaseValue === '1' || lowercaseValue === 'true';
  }
  
  // Handle object case (e.g., {value: 'yes'})
  if (typeof value === 'object' && value !== null) {
    if ('value' in value) {
      return isPositiveValue(value.value); // Recursively check the value property
    }
    return false;
  }
  
  return false;
};

const hasValidContent = (value1, value2) => {
  const checkArray = (arr) => {
    return Array.isArray(arr) && arr.length > 0 && arr.some(item => item && item.trim());
  };
  
  const checkString = (str) => {
    return str && typeof str === 'string' && str.trim() !== '';
  };

  return checkArray(value1) || checkArray(value2) || checkString(value1) || checkString(value2);
};

function Fullview({ onViewAttempt, onEditProfile, formData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: {}, dynamoData: [] });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState(null);
  const [socialLinks, setSocialLinks] = useState({ facebook: "", linkedin: "" });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const noDataToastShownRef = useRef(false);
  const errorToastShownRef = useRef(false);

  // Enhanced responsive handling with better breakpoints
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Enhanced helper functions for responsive design
  const getResponsiveColumnCount = (desktop, tablet, mobile) => {
    if (windowWidth <= 576) return mobile;
    if (windowWidth <= 768) return tablet;
    if (windowWidth <= 1024) return Math.max(tablet - 1, mobile);
    return desktop;
  };

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;
  const isSmallMobile = windowWidth <= 480;

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
      console.log('Full API Response (Fullview):', response.data);
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
          console.log('No record found in main API (Fullview), checking if user has any profile data...');
          
          // Check if user has any data in other tables by making individual API calls
          try {
            const [educationRes, experienceRes, jobPrefRes, additionalRes1, additionalRes2, socialRes] = await Promise.all([
              axios.get(EDUCATION_API).catch(() => ({ data: [] })),
              axios.get(EXPERIENCE_API).catch(() => ({ data: { mysqlData: [], dynamoData: [] } })),
              axios.get(JOB_PREFERENCE_API).catch(() => ({ data: [] })),
              axios.get(ADDITIONAL_INFO_API).catch(() => ({ data: [] })),
              axios.get('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info2').catch(() => ({ data: [] })),
              axios.get(SOCIAL_API).catch(() => ({ data: [] }))
            ]);
            
            const hasEducationData = Array.isArray(educationRes.data) && 
              educationRes.data.some(edu => edu.firebase_uid === user.uid);
            const hasExperienceData = experienceRes.data.mysqlData?.some(exp => exp.firebase_uid === user.uid) ||
              experienceRes.data.dynamoData?.some(exp => exp.firebase_uid === user.uid);
            const hasJobPrefData = Array.isArray(jobPrefRes.data) && 
              jobPrefRes.data.some(pref => pref.firebase_uid === user.uid);
            const hasAdditionalData1 = Array.isArray(additionalRes1.data) && 
              additionalRes1.data.some(info => info.firebase_uid === user.uid);
            const hasAdditionalData2 = Array.isArray(additionalRes2.data) && 
              additionalRes2.data.some(info => info.firebase_uid === user.uid);
            const hasSocialData = Array.isArray(socialRes.data) && 
              socialRes.data.some(social => social.firebase_uid === user.uid);
            
            // If user has data in any table, create a basic profile object
            if (hasEducationData || hasExperienceData || hasJobPrefData || hasAdditionalData1 || hasAdditionalData2 || hasSocialData) {
              userRecord = {
                firebase_uid: user.uid,
                email: user.email,
                name: user.displayName || user.email?.split('@')[0] || 'User',
                hasPartialData: true,
                hasEducation: hasEducationData,
                hasExperience: hasExperienceData,
                hasJobPreferences: hasJobPrefData,
                hasAdditionalInfo1: hasAdditionalData1,
                hasAdditionalInfo2: hasAdditionalData2,
                hasSocial: hasSocialData
              };
              console.log('Created basic profile from partial data (Fullview):', userRecord);
            }
          } catch (partialDataError) {
            console.error('Error checking partial data (Fullview):', partialDataError);
          }
        }
      }
      
      console.log('Final userRecord (Fullview):', userRecord);
      // Decode the profile data (decrypt base64 encoded fields)
      const decodedProfile = userRecord ? decodeCandidateData(userRecord) : null;
      console.log('Decoded profile (Fullview):', decodedProfile);
      setProfileData(decodedProfile);
      
    } catch (err) {
      console.error('API Error (Fullview):', err);
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
        // Find the user's MySQL data
        const userMysqlData = Array.isArray(mysqlData) ? 
          mysqlData.find(exp => exp.firebase_uid === user.uid) || {} : {};
        
        // Find the user's DynamoDB data
        const userDynamoData = Array.isArray(dynamoData) ?
          dynamoData.find(exp => exp.firebase_uid === user.uid) :
          (dynamoData?.firebase_uid === user.uid ? dynamoData : {});

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

  const fetchAdditionalInfo = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await axios.get(ADDITIONAL_INFO_API);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        const userInfo = response.data.find(info => info.firebase_uid === user.uid);
        // Decode the additional info data (decrypt base64 encoded fields)
        const decodedInfo = userInfo ? decodeCandidateData(userInfo) : null;
        setAdditionalInfo(decodedInfo);
        // Log the data for debugging
        console.log("Additional Info (decoded):", decodedInfo);
      }
    } catch (err) {
      console.error('Additional Info API Error:', err);
    }
  }, [user]);

  const fetchSocialLinks = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await axios.get(SOCIAL_API, {
        params: { firebase_uid: user.uid }
      });
      if (response.status === 200 && response.data.length > 0) {
        const record = response.data[0]; // assuming one record per user
        // Decode the social links data (decrypt base64 encoded fields)
        const decodedRecord = record ? decodeCandidateData(record) : null;
        setSocialLinks({
          facebook: decodedRecord?.facebook || "",
          linkedin: decodedRecord?.linkedin || ""
        });
      }
    } catch (err) {
      console.error('Social Links API Error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      setProfileData(formData);
      setIsLoading(false);
    } else {
      fetchProfileData();
      fetchEducationData();
      fetchExperienceData();
      fetchJobPreferenceData();
      fetchAdditionalInfo();
      fetchProfilePhoto();
      fetchSocialLinks();
    }
  }, [formData, fetchProfileData, fetchEducationData, fetchExperienceData, 
      fetchJobPreferenceData, fetchAdditionalInfo, fetchProfilePhoto, fetchSocialLinks]);

  const shouldShowEmptyState = useMemo(() => {
    const profileHasData = hasMeaningfulFields(profileData, [
      'firebase_uid',
      'hasPartialData',
      'hasEducation',
      'hasExperience',
      'hasJobPreferences',
      'hasAdditionalInfo1',
      'hasAdditionalInfo2',
      'hasSocial'
    ]);

    const educationExists = Array.isArray(educationData) && educationData.length > 0;
    const mysqlExperienceExists = hasMeaningfulFields(experienceData?.mysqlData || {});
    const dynamoExperienceExists = Array.isArray(experienceData?.dynamoData?.experienceEntries) &&
      experienceData.dynamoData.experienceEntries.length > 0;
    const jobPreferenceExists = hasMeaningfulFields(jobPreferenceData, ['firebase_uid']);
    const additionalInfoExists = hasMeaningfulFields(additionalInfo);
    const socialLinksExists = hasMeaningfulFields(socialLinks);

    const hasAnyAssociatedData = educationExists || mysqlExperienceExists || dynamoExperienceExists || jobPreferenceExists || additionalInfoExists || socialLinksExists;

    return !profileData?.hasPartialData && !profileHasData && !hasAnyAssociatedData;
  }, [profileData, educationData, experienceData, jobPreferenceData, additionalInfo, socialLinks]);

  useEffect(() => {
    if (!isLoading && !error && shouldShowEmptyState && !noDataToastShownRef.current) {
      toast.info("No profile data found. Please complete your profile information.");
      noDataToastShownRef.current = true;
    }

    if (!shouldShowEmptyState) {
      noDataToastShownRef.current = false;
    }
  }, [isLoading, error, shouldShowEmptyState]);

  useEffect(() => {
    if (!isLoading) {
      if (error) {
        if (!errorToastShownRef.current) {
          toast.error("Error loading profile data");
          errorToastShownRef.current = true;
        }
      } else if (profileData !== null) {
        // Check if profileData is empty or has no meaningful data
        const hasNoData = !profileData || 
                         Object.keys(profileData).length === 0 || 
                         (Object.keys(profileData).length === 1 && Object.prototype.hasOwnProperty.call(profileData, 'firebase_uid'));
        
        if (hasNoData && !profileData?.hasPartialData) {
          console.log('No profile data found (Fullview) - showing message');
          if (!noDataToastShownRef.current) {
            toast.info("No profile data found. Please complete your profile information.");
            noDataToastShownRef.current = true;
          }
        } else if (profileData?.hasPartialData) {
          console.log('Partial data found (Fullview) - not showing error message');
        } else {
          console.log('Full profile data found (Fullview) - not showing error message');
          noDataToastShownRef.current = false;
        }
      }
    }
  }, [isLoading, error, profileData]);

  if (!user) {
    return (
      <div className="alert alert-warning text-center">
        Please log in to view your profile.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-16">
        <LoadingState
          title="Assembling your full profile…"
          subtitle="We’re compiling every section of your profile and formatting it for the detailed view."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="max-w-md w-full bg-[#F0D8D9] border border-dashed border-gray-300 rounded-xl p-8 shadow-sm">
          <h4 className="text-xl font-semibold text-gray-800 mb-3 leading-tight tracking-tight">Unable to Load Profile</h4>
          <p className="text-lg sm:text-base text-gray-600 mb-4 leading-normal tracking-tight">{error}</p>
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

  if (!isLoading && shouldShowEmptyState) {
    return (
      <div className="profile-container flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="max-w-md w-full bg-[#F0D8D9] border border-dashed border-gray-300 rounded-xl p-8 shadow-sm">
          <h4 className="text-xl font-semibold text-gray-800 mb-3 leading-tight tracking-tight">No Profile Data Yet</h4>
          <p className="text-lg sm:text-base text-gray-600 mb-6 leading-normal tracking-tight">
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

  const parseLanguages = (languagesData) => {
    if (!languagesData) return [];
    try {
      if (Array.isArray(languagesData)) return languagesData;
      if (typeof languagesData === 'string') {
        const parsed = JSON.parse(languagesData);
        return Array.isArray(parsed) ? parsed : [];
      }
      if (typeof languagesData === 'object') {
        return Object.entries(languagesData).map(([language, details]) => ({
          language,
          ...details
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const languages = profileData?.languages ? parseLanguages(profileData.languages) : [];

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

  const getExperienceText = () => {
    if (!experienceData?.mysqlData) return '';
    
    const totalYears = experienceData.mysqlData.total_experience_years || 0;
    const totalMonths = experienceData.mysqlData.total_experience_months || 0;
    const teachingYears = experienceData.mysqlData.teaching_experience_years || 0;
    const teachingMonths = experienceData.mysqlData.teaching_experience_months || 0;
    
    return (
      <div className="mb-5 text-lg sm:text-base leading-normal tracking-tight">
        <div><strong>Total Teaching Experience</strong> : {teachingYears} Years & {teachingMonths} months</div>
        <div><strong>Total Experience (Teaching + Non-Teaching)</strong> : {totalYears} Years & {totalMonths} months</div>
      </div>
    );
  };

  const renderEducationBlocks = () => {
    if (!educationData || educationData.length === 0) return null;  
    
    return educationData.map((education, index) => {
      if (!education) return null;
      
      const educationType = getEducationTypeTitle(education.education_type);
      let details = [];
      
      if (education.schoolName) details.push(`${education.schoolName}`);
      if (education.collegeName) details.push(`${education.collegeName}`);
      if (education.universityName) details.push(`${education.universityName}`);
      if (education.instituteName) details.push(`${education.instituteName}`);
      
      let additionalInfo = [];
      if (education.yearOfPassing) additionalInfo.push(`${education.yearOfPassing}`);
      if (education.percentage) additionalInfo.push(`${education.percentage}%`);
      if (education.mode) additionalInfo.push(`${education.mode}`);
      if (education.syllabus) additionalInfo.push(`${education.syllabus}`);
      if (education.courseStatus) additionalInfo.push(`${education.courseStatus}`);
      if (education.courseName) additionalInfo.push(`${education.courseName}`);
      if (education.placeOfStudy) additionalInfo.push(`${education.placeOfStudy}`);
      if (education.affiliatedTo) additionalInfo.push(`Affiliated to: ${education.affiliatedTo}`);
      if (education.courseDuration) additionalInfo.push(`Duration: ${education.courseDuration}`);
      if (education.specialization) additionalInfo.push(`${education.specialization}`);
      
      return (
        <div className="education-block mb-5 pb-[15px] border-b border-gray-300 last:border-b-0" key={index}>
          <div className="education-title font-bold text-gray-800 mb-1">{educationType}</div>
          <div className="education-details">
            {details.map((detail, i) => (
              <div key={i} className="education-detail text-lg sm:text-base mb-0.5 leading-normal tracking-tight">{detail}</div>
            ))}
            <div className="education-meta text-lg sm:text-base text-gray-600 mt-1 italic leading-normal tracking-tight">
              {additionalInfo.join(' | ')}
            </div>
            {education.coreSubjects && (
              <div className="core-subjects text-lg sm:text-base mt-1 leading-normal tracking-tight">
                <strong>Core Subjects:</strong> {
                  Array.isArray(education.coreSubjects) 
                    ? education.coreSubjects.join(', ') 
                    : typeof education.coreSubjects === 'string'
                      ? JSON.parse(education.coreSubjects).join(', ')
                      : ''
                }
              </div>
            )}
          </div>
        </div>
      );
    });
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
        <div className="experience-block mb-[25px] text-lg sm:text-base leading-normal tracking-tight" key={index}>
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
          
          {/* Enhanced responsive details grid */}
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-y-2' : isTablet ? 'grid-cols-1 gap-y-1.5' : 'grid-cols-2 gap-x-5 gap-y-1.25'} mt-2`}>
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

  const renderWorkExposureMatrix = () => {
    if (!jobPreferenceData) return null;
    
    const workTypes = [
      { key: 'Ed_Tech_Company', label: 'Ed.Tech companies' },
      { key: 'on_line', label: 'Online tutoring' },
      { key: 'coaching_tuitions_center', label: 'Coaching / Tuition Centers' },
      { key: 'group_tuitions', label: 'Group tutoring' },
      { key: 'private_tuitions', label: 'Private tutoring' },
      { key: 'home_tuitions', label: 'Home Tuitions' }
    ];
    
    // Enhanced responsive grid
    const getGridColumns = () => {
      if (isSmallMobile) return 1;
      if (isMobile) return 2;
      if (isTablet) return 2;
      return 3;
    };
    
    // Helper function to check if work type is enabled
    const isWorkTypeEnabled = (key) => {
      if (!experienceData?.mysqlData) return false;
      
      // Check different possible data formats
      const value = experienceData.mysqlData[key];
      return value === 1 || value === '1' || value === true || value === 'true' || value === 'yes' || value === 'Yes';
    };
    
    const isTablet = windowWidth > 768 && windowWidth <= 1024;
    return (
      <div className={`work-exposure ${isMobile ? 'mb-4' : isTablet ? 'mb-5' : 'mb-6'}`}>
          <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>WORK EXPOSURE</h2>
          <div className="responsive-grid grid w-full" style={{ 
            gridTemplateColumns: `repeat(${getGridColumns()}, minmax(0, 1fr))`,
            gap: isMobile ? '8px' : isTablet ? '9px' : '10px'
          }}>
            {workTypes.map(type => (
              <div key={type.key} className={`bg-white rounded-lg ${isMobile ? 'p-2 px-2' : isTablet ? 'p-2.5' : 'p-3'} shadow-sm flex justify-between items-center ${isMobile ? 'min-h-[45px]' : 'min-h-[50px]'} border border-gray-200 min-w-0`}>
                <div className={`text-lg sm:text-base font-medium leading-normal tracking-tight flex-1 mr-2 min-w-0 break-words`}>
                  {type.label}
                </div>
                <div className={`${isMobile ? 'w-5 h-5 text-xs' : isTablet ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-sm'} rounded-full flex items-center justify-center font-bold shrink-0 ${isWorkTypeEnabled(type.key) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {isWorkTypeEnabled(type.key) ? '✓' : '×'}
                </div>
              </div>
            ))}
          </div>
        </div>
    );
  };

  const renderLanguageProficiency = () => {
    if (!languages || languages.length === 0) return null;
    
    // Group languages by proficiency
    const speakLanguages = languages.filter(lang => lang.speak).map(lang => lang.language);
    const readLanguages = languages.filter(lang => lang.read).map(lang => lang.language);
    const writeLanguages = languages.filter(lang => lang.write).map(lang => lang.language);
    
    // Helper function to display languages or message when empty
    const displayLanguages = (languageArray) => {
      return languageArray.length > 0 
        ? languageArray.join(', ') 
        : <span className="text-gray-500 italic">None</span>;
    };

    // Enhanced language item component with larger fonts
    const LanguageItem = ({ label, languages }) => (
      <div className={`language-item flex ${isMobile ? 'mb-2 py-1' : 'mb-1.5 py-1'} flex-row items-start flex-wrap`}>
        <span className={`font-semibold mr-2 text-gray-800 text-lg sm:text-base min-w-fit leading-normal tracking-tight`}>
          {label}:
        </span>
        <span className={`text-lg sm:text-base leading-normal tracking-tight flex-1 text-gray-700 font-medium`}>
          {languages.length > 0 ? languages.join(', ') : <span className="text-gray-500 italic font-normal">None</span>}
        </span>
      </div>
    );
    
    return (
      <div className="language-proficiency mb-4">
        <h2 className="section-title text-center border-b border-black mb-[15px] pb-1 uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight">LANGUAGE PROFICIENCY</h2>
        <div className={`${isMobile ? 'bg-white rounded-lg p-3 border border-gray-200' : 'bg-gray-50 rounded-lg p-3 border border-gray-200'}`}>
          <LanguageItem label="Speak" languages={speakLanguages} />
          <LanguageItem label="Read" languages={readLanguages} />
          <LanguageItem label="Write" languages={writeLanguages} />
        </div>
      </div>
    );
  };

  const renderAdditionalInfo = () => {
    if (!additionalInfo) return null;
    
    // Enhanced info item component with proper desktop and mobile support
    const InfoItem = ({ label, value }) => {
      if (!value) return null;
      
      return (
        <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
          <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-lg sm:text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
            {label}:
          </span>
          <span className={`text-lg sm:text-base leading-normal tracking-tight ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600`}>
            {value}
          </span>
        </div>
      );
    };
    
    // Format computer skills properly
    const formatComputerSkills = () => {
      let skills = additionalInfo?.computer_skills;
      if (!skills) return '';
      
      // Handle string that might be JSON
      if (typeof skills === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(skills);
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
          return skills;
        } catch (e) {
          // If not valid JSON, just use the string
          return skills;
        }
      }
      
      // Handle array
      if (Array.isArray(skills)) {
        return skills.join(', ');
      }
      
      return skills || '';
    };
    
    return (
      <div className={`additional-information mb-[30px] ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-[15px]'} bg-gray-50 rounded-lg border border-gray-200`}>
        <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>
          ADDITIONAL INFORMATION
        </h2>
        
        {/* Optimized grid layout for better space utilization */}
        <div className={`${isMobile ? 'block' : 'grid'} ${isMobile ? '' : isTablet ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${isMobile ? 'gap-0' : isTablet ? 'gap-x-3 gap-y-0' : 'gap-x-4 gap-y-0'}`}>
          {additionalInfo?.religion && (
            <InfoItem label="Religion" value={additionalInfo.religion} />
          )}
          {additionalInfo?.marital_status && (
            <InfoItem label="Marital Status" value={additionalInfo.marital_status} />
          )}
          {additionalInfo?.computer_skills && (
            <InfoItem label="Computer skills" value={formatComputerSkills()} />
          )}
          {additionalInfo?.accounting_knowledge !== undefined && (
            <InfoItem 
              label="Accounting Knowledge" 
              value={isPositiveValue(additionalInfo.accounting_knowledge) ? 'Yes' : 'No'} 
            />
          )}
          {additionalInfo?.citizenship && (
            <InfoItem label="Citizenship" value={additionalInfo.citizenship} />
          )}
          {additionalInfo?.differently_abled && (
            <InfoItem 
              label="Differently abled" 
              value={additionalInfo.differently_abled} 
            />
          )}
          {additionalInfo?.certifications && (
            <InfoItem label="Certifications" value={additionalInfo.certifications} />
          )}
          {additionalInfo?.accomplishments && (
            <InfoItem label="Accomplishments" value={additionalInfo.accomplishments} />
          )}
        </div>
        
        {/* Full width items for longer content */}
        <div className={`${isMobile ? 'mt-2' : 'mt-[5px]'} w-full`}>
          {additionalInfo?.projects && (
            <InfoItem label="Projects" value={additionalInfo.projects} />
          )}
          {additionalInfo?.research_publications && (
            <InfoItem label="Research publications" value={additionalInfo.research_publications} />
          )}
          {additionalInfo?.additional_info && (
            <InfoItem label="Anything more about yourself" value={additionalInfo.additional_info} />
          )}
        </div>
      </div>
    );
  };

  // Get the most recent designation from experience entries
  const getCurrentDesignation = () => {
    if (!experienceData?.dynamoData?.experienceEntries || 
        experienceData.dynamoData.experienceEntries.length === 0) {
      return null;
    }
    
    // Try to find an entry marked as currently working
    const currentJob = experienceData.dynamoData.experienceEntries.find(
      exp => exp.currentlyWorking === true
    );
    
    // Or get the most recent job (assuming entries are in chronological order)
    const mostRecentJob = currentJob || experienceData.dynamoData.experienceEntries[0];
    
    if (!mostRecentJob) return null;
    
    return mostRecentJob.jobType === 'teaching' ? mostRecentJob.teachingDesignation :
           mostRecentJob.jobType === 'administration' ? mostRecentJob.adminDesignation :
           mostRecentJob.designation;
  };

  // Get highest education qualification
  const getHighestEducation = () => {
    if (!educationData || educationData.length === 0) return null;
    
    // Define education hierarchy (higher index = higher qualification)
    const educationHierarchy = [
      'grade10', 'grade12', 'certificate', 'bEd', 'dEd', 'nttMtt', 'degree', 'masterDegree', 'doctorate'
    ];
    
    let highestEducation = educationData[0];
    
    educationData.forEach(education => {
      const currentRank = educationHierarchy.indexOf(education.education_type);
      const highestRank = educationHierarchy.indexOf(highestEducation.education_type);
      
      if (currentRank > highestRank) {
        highestEducation = education;
      }
    });
    
    // Format the display text
    let educationText = getEducationTypeTitle(highestEducation.education_type);
    
    // Add additional details if available
    if (highestEducation.courseName) {
      educationText += ` in ${highestEducation.courseName}`;
    } else if (highestEducation.specialization) {
      educationText += ` in ${highestEducation.specialization}`;
    }
    
    return educationText;
  };

  // Get current designation
  const currentDesignation = getCurrentDesignation();
  const highestEducation = getHighestEducation();

  return (
    <div className="cv-container max-w-[1000px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden font-sans text-gray-800 px-[5px] py-2.5 overflow-x-hidden w-full">
      {/* Edit Profile Button - Top Level */}
      <div className="flex justify-end mb-[15px]">
        <button
          onClick={() => {
            if (onEditProfile) {
              onEditProfile();
            } else {
              navigate("/seeker/my-profile?edit=true", { replace: false });
            }
          }}
          className={`btn bg-gradient-brand hover:bg-gradient-brand-hover text-white ${isMobile ? 'btn-mobile' : ''} text-base px-4 py-2 sm:px-5 sm:py-2.5 rounded-md font-medium leading-normal tracking-tight`}
        >
          Edit Profile
        </button>
      </div>

      <div className={`cv-header ${isMobile ? 'flex-col items-center text-center p-2' : 'flex flex-row items-start p-6'} bg-white border-b border-gray-200 mb-2.5 overflow-x-hidden`}>
        {/* Left Side: Profile Picture + Basic Info */}
        <div className={`flex ${isMobile ? 'flex-col' : ''} gap-5 ${isMobile ? 'mb-2 items-center' : 'w-1/2 pr-4'} ${isMobile ? '' : ''} min-w-0`}>
          {/* Profile Picture */}
          <div className={`profile-photo ${isMobile ? 'w-[100px] h-[100px] mb-2.5' : 'w-[120px] h-[120px]'} rounded-full overflow-hidden border-[3px] border-gray-100 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${isMobile ? 'm-0' : 'mr-2.5'} shrink-0`}>
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
            <h1 className={`candidate-name mb-1 text-2xl bg-gradient-brand bg-clip-text text-transparent break-words leading-tight tracking-tight`}>
              {profileData.fullName || 'Candidate Name'}
            </h1>
            
            {/* Personal Details */}
            <div className={`mb-0.5 text-lg sm:text-base text-gray-600 break-words leading-normal tracking-tight`}>
              {profileData.gender && <span>{profileData.gender}</span>}
              {profileData.dateOfBirth && (
                <span> | Age: {new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()} Years</span>
              )}
              {highestEducation && <span> | {highestEducation}</span>}
              </div>
              <div className={`mb-0.5 text-lg sm:text-base text-gray-600 break-words leading-normal tracking-tight`}>
              {experienceData?.mysqlData?.total_experience_years > 0 && (
                <span> | Experience: {experienceData.mysqlData.total_experience_years} Years {experienceData.mysqlData.total_experience_months || 0} Months</span>
              )}
              {currentDesignation && <span> | {currentDesignation}</span>}
            </div>
            
            {/* Professional Info */}
            <div className={`mb-0.5 text-lg sm:text-base text-gray-600 break-words leading-normal tracking-tight`}>
              {profileData.designation && <span>{profileData.designation}</span>}
              {(profileData.teachingSubjects?.length > 0 || profileData.teachingCoreExpertise?.length > 0) && (
                <span> | {profileData.teachingSubjects?.[0] || profileData.teachingCoreExpertise?.[0]} Faculty</span>
              )}
            </div>
            
            {/* Email */}
            {profileData.email && (
              <div className={`flex items-center text-lg sm:text-base min-w-0 leading-normal tracking-tight`}>
                <FaEnvelope className="mr-1.5 text-gray-400 shrink-0" />
                <a href={`mailto:${profileData.email}`} className="no-underline text-[#1967d2] break-words overflow-wrap-anywhere">
                  {profileData.email}
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Contact Information */}
        <div className={`font-sans text-lg sm:text-base w-full sm:w-1/2 leading-normal tracking-tight ${isMobile ? 'mt-2' : 'pl-4'} min-w-0`}>
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
                ].filter(Boolean).join(', ')}
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
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
          
          {/* Phone Numbers - Same Line */}
          <div className={`flex ${isMobile ? 'flex-row' : 'flex-row'} ${isMobile ? 'gap-[15px]' : 'gap-4'} ${isMobile ? 'mb-1.5 flex-wrap' : 'mb-2'}`}>
            <div className="flex items-center min-w-0">
              <FaPhone className="mr-1.5 text-[#1a73e8] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Phone:</span>
              <span className="break-words">{profileData.callingNumber}</span>
            </div>
             
            <div className="flex items-center min-w-0">
              <FaWhatsapp className="mr-1.5 text-[#25D366] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">WhatsApp:</span>
              <span className="break-words">{profileData.whatsappNumber}</span>
            </div>
          </div>
          
          {/* Social Links */}
          <div className={`flex ${isMobile ? 'flex-row gap-[15px]' : 'flex-col gap-1.5'} items-start flex-wrap`}>
            <div className="flex items-center min-w-0">
              <FaFacebook className="mr-1.5 text-[#385898] text-[13px] shrink-0" /> 
              <span className="font-semibold mr-1.5 shrink-0">Facebook:</span>
              {socialLinks.facebook ? (
                <a 
                  href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://${socialLinks.facebook}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`no-underline text-[#385898] ${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]' : 'break-words'} min-w-0`}
                >
                  {socialLinks.facebook}
                </a>
              ) : (
                <span className="text-gray-500 italic">Not provided</span>
              )}
            </div>
            
            <div className="flex items-center min-w-0">
              <FaLinkedin className="mr-1.5 text-[#0077b5] text-[13px] shrink-0" /> 
              <span className="font-semibold mr-1.5 shrink-0">LinkedIn:</span>
              {socialLinks.linkedin ? (
                <a 
                  href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://${socialLinks.linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`no-underline text-[#0077b5] ${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]' : 'break-words'} min-w-0`}
                >
                  {socialLinks.linkedin}
                </a>
              ) : (
                <span className="text-gray-500 italic">Not provided</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className={`cv-body flex flex-col ${isTablet ? 'md:flex-row' : 'md:flex-row'} p-0 bg-white`}>
        <div className={`cv-sidebar w-full ${isTablet ? 'md:w-[35%]' : 'md:w-[35%]'} bg-gray-100 ${isMobile ? 'p-2.5' : isTablet ? 'p-4' : 'md:p-5'}`}>
          <div className="cv-section education-section mt-0 mb-2.5">
            <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>
              EDUCATION
            </h2>
            {renderEducationBlocks()}
          </div>
        </div>

        <div className={`cv-main w-full ${isTablet ? 'md:w-[65%]' : 'md:w-[65%]'} ${isMobile ? 'md:px-2' : isTablet ? 'md:px-3' : 'md:px-2'}`}>
          <div className="cv-section experience-section mt-0 mb-2.5">
            <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>
              WORK EXPERIENCE
            </h2>
            {getExperienceText()}
            {renderExperienceBlocks()}
          </div>

          {renderWorkExposureMatrix()}

          {renderLanguageProficiency()}

          {renderAdditionalInfo()}
          
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
                <h2 className={`section-title text-center border-b border-black ${isMobile ? 'mb-3 pb-1' : 'mb-[15px] pb-1'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>JOB PREFERENCES</h2>
                <div className={`job-preferences-block bg-[#f5f7fc] ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-5'} rounded-lg mb-[25px] text-lg sm:text-base leading-normal tracking-tight`}>
                  {/* Two-column details grid */}
                  <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-x-0 gap-y-1' : isTablet ? 'gap-x-3 gap-y-1' : 'gap-x-5 gap-y-1'}`}>
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
                      <div><strong>Expected Salary:</strong> {jobPreferenceData.expected_salary}</div>
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

export default React.memo(Fullview);