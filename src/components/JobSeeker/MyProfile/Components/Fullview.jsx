import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext";
import './profile-styles.css';
import './view.css';
import './cv-style.css';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { decodeCandidateData } from '../../../../utils/dataDecoder';

// Define a base64 encoded default avatar as a data URI
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='120' height='120'%3E%3Ccircle cx='12' cy='7' r='5' fill='%23ccc'/%3E%3Cpath d='M3 19c0-4.1 3.4-8 9-8s9 3.9 9 8H3z' fill='%23ccc'/%3E%3C/svg%3E";
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const ADDITIONAL_INFO_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1';
const SOCIAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile';

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
  
  const displayValue = Array.isArray(value) ? value.join(', ') : 
                      typeof value === 'string' ? value.split(',').join(', ') : 
                      value;

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

function Fullview({ onViewAttempt, formData }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: {}, dynamoData: [] });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState(null);
  const [socialLinks, setSocialLinks] = useState({ facebook: "", linkedin: "" });
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState(false);

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

  useEffect(() => {
    if (!isLoading) {
      if (error) {
        toast.error("Error loading profile data");
        setShouldRedirect(true);
      } else if (profileData !== null) {
        // Check if profileData is empty or has no meaningful data
        const hasNoData = !profileData || 
                         Object.keys(profileData).length === 0 || 
                         (Object.keys(profileData).length === 1 && Object.prototype.hasOwnProperty.call(profileData, 'firebase_uid'));
        
        if (hasNoData && !profileData?.hasPartialData) {
          console.log('No profile data found (Fullview) - showing message');
          toast.info("No profile data found. Please complete your profile information.");
          setShouldRedirect(true);
        } else if (profileData?.hasPartialData) {
          console.log('Partial data found (Fullview) - not showing error message');
        } else {
          console.log('Full profile data found (Fullview) - not showing error message');
        }
      }
    }
  }, [isLoading, error, profileData]);

  useEffect(() => {
    if (shouldRedirect) {
      onViewAttempt();
    }
  }, [shouldRedirect, onViewAttempt]);

  if (!user) {
    return (
      <div className="alert alert-warning text-center">
        Please log in to view your profile.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !profileData || Object.keys(profileData).length === 0) {
    return null;
  }
  
  // If user has partial data, show a message encouraging completion
  if (profileData.hasPartialData) {
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
      <div style={{ marginBottom: '20px', fontSize: '15px' }}>
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
        <div className="education-block" key={index}>
          <div className="education-title">{educationType}</div>
          <div className="education-details">
            {details.map((detail, i) => (
              <div key={i} className="education-detail">{detail}</div>
            ))}
            <div className="education-meta">
              {additionalInfo.join(' | ')}
            </div>
            {education.coreSubjects && (
              <div className="core-subjects">
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
        <div className="experience-block" key={index} style={{ 
          marginBottom: '25px',
          fontSize: '15px',
          lineHeight: '1.5'
        }}>
          {/* Organization and date row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            <div style={{ fontSize: '16px' }}>{exp.organizationName}</div>
            <div>
              {dateRange}
              <span style={{ fontWeight: 'normal', color: '#555' }}>{durationText}</span>
            </div>
          </div>
          
          {/* Location row */}
          <div style={{ marginBottom: '6px', color: '#555' }}>{location}</div>
          
          {/* Job details row */}
          <div style={{ marginBottom: '6px' }}>
            {jobTypeText.join(' | ')}
          </div>
          
          {/* Enhanced responsive details grid */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr 1fr' : '1fr 1fr'),
            columnGap: isMobile ? '0' : '20px',
            rowGap: isMobile ? '8px' : '5px',
            marginTop: '8px'
          }}>
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
    
    return (
      <div className="work-exposure">
        <h6 className="work-exposure-title">Work Exposure</h6>
        <div className="responsive-grid" style={{ 
          gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
          gap: isMobile ? '8px' : '10px'
        }}>
          {workTypes.map(type => (
            <div key={type.key} style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px',
              padding: isMobile ? '12px 8px' : '12px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '50px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ 
                fontSize: isMobile ? '13px' : '14px', 
                fontWeight: '500',
                lineHeight: '1.3',
                flex: 1,
                marginRight: '8px'
              }}>
                {type.label}
              </div>
              <div style={{ 
                width: isMobile ? '20px' : '24px', 
                height: isMobile ? '20px' : '24px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isWorkTypeEnabled(type.key) ? '#e6f7ed' : '#fdf1f0',
                color: isWorkTypeEnabled(type.key) ? '#34a853' : '#ea4335',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
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
        : <span style={{ color: '#777', fontStyle: 'italic' }}>None</span>;
    };

    // Simple language item component with inline display
    const LanguageItem = ({ label, languages }) => (
      <div className="language-item" style={{ 
        display: 'flex', 
        marginBottom: isMobile ? '4px' : '5px',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: isMobile ? '2px 0' : '3px 0',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          fontWeight: '600',
          marginRight: '6px',
          color: '#333',
          fontSize: isMobile ? '13px' : '14px',
          minWidth: 'fit-content'
        }}>
          {label}:
        </span>
        <span style={{
          fontSize: isMobile ? '13px' : '14px',
          lineHeight: '1.4',
          flex: 1,
          color: '#555'
        }}>
          {languages.length > 0 ? languages.join(', ') : 'None'}
        </span>
      </div>
    );
    
    return (
      <div className="language-proficiency">
        <h6 className="language-title">Language Proficiency</h6>
        <div style={{ 
          paddingLeft: '0',
          backgroundColor: isMobile ? '#fff' : 'transparent',
          borderRadius: isMobile ? '4px' : '0',
          padding: isMobile ? '6px' : '4px'
        }}>
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
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          marginBottom: isMobile ? '12px' : '8px',
          padding: isMobile ? '10px' : '6px 0',
          backgroundColor: isMobile ? '#fff' : 'transparent',
          borderRadius: isMobile ? '6px' : '0',
          border: isMobile ? '1px solid #eee' : 'none',
          alignItems: isMobile ? 'flex-start' : 'flex-start'
        }}>
          <span style={{ 
            width: isMobile ? '100%' : '160px', 
            fontWeight: '600',
            marginBottom: isMobile ? '4px' : '0',
            color: '#333',
            fontSize: isMobile ? '13px' : '14px',
            flexShrink: 0
          }}>
            {label}:
          </span>
          <span style={{ 
            fontSize: isMobile ? '13px' : '14px',
            lineHeight: '1.4',
            marginLeft: isMobile ? '0' : '10px',
            flex: 1,
            wordBreak: 'break-word',
            color: '#555'
          }}>
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
      <div className="additional-information" style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        backgroundColor: '#f9f9f9', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h6 className="info-title" style={{ 
          marginBottom: '15px', 
          color: '#1967d2', 
          borderBottom: '1px solid #ddd', 
          paddingBottom: '8px',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Additional Information
        </h6>
        
        {/* Enhanced layout that works with existing CSS */}
        <div style={{ 
          display: isMobile ? 'block' : 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '0' : '20px'
        }}>
          {/* Left column */}
          <div style={{ 
            flex: isMobile ? 'none' : '1 1 300px',
            minWidth: isMobile ? '100%' : '0'
          }}>
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
          </div>
          
          {/* Right column */}
          <div style={{ 
            flex: isMobile ? 'none' : '1 1 300px',
            minWidth: isMobile ? '100%' : '0'
          }}>
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
        </div>
        
        {/* Full width items for longer content */}
        <div style={{ 
          marginTop: isMobile ? '8px' : '15px',
          width: '100%'
        }}>
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
    <div className={`cv-container ${isMobile ? 'mobile-layout' : ''} ${isTablet ? 'tablet-layout' : ''}`} style={{ 
      margin: '0', 
      padding: '10px 5px',
      maxWidth: '100%'
    }}>
      {/* Edit Profile Button - Top Level */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '15px'
      }}>
        <button
          onClick={() => window.location.href = "/candidates-dashboard/my-profile"}
          className={`btn btn-warning ${isMobile ? 'btn-mobile' : ''}`}
          style={{
            fontSize: isMobile ? '14px' : '16px',
            padding: isMobile ? '8px 16px' : '10px 20px',
            borderRadius: '6px',
            fontWeight: '500'
          }}
        >
          Edit Profile
        </button>
      </div>

      <div className="cv-header" style={{ 
        marginBottom: '10px'
      }}>
        {/* First Row: Profile Picture + Basic Info */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '8px',
          alignItems: 'center'
        }}>
          {/* Profile Picture */}
          <div className="profile-photo" style={{ flexShrink: 0 }}>
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={`${profileData.fullName || 'User'}'s profile photo`}
                onError={(e) => {
                  setPhotoError(true);
                  e.target.src = defaultAvatar;
                }}
              />
            ) : (
              <img src={defaultAvatar} alt={`${profileData.fullName || 'User'}'s default avatar`} />
            )}
          </div>
          
          {/* Basic Information */}
          <div style={{ flex: 1 }}>
                         <h1 className="candidate-name" style={{ marginBottom: '4px', fontSize: isMobile ? '20px' : '24px' }}>
               {profileData.fullName || 'Candidate Name'}
             </h1>
            
                         {/* Personal Details */}
             <div style={{ 
               marginBottom: '2px', 
               fontSize: isMobile ? '14px' : '15px',
               color: '#555'
             }}>
              {profileData.gender && <span>{profileData.gender}</span>}
              {profileData.dateOfBirth && (
                <span> | {new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()} Years</span>
              )}
              {highestEducation && <span> | {highestEducation}</span>}
              {experienceData?.mysqlData?.total_experience_years > 0 && (
                <span> | {experienceData.mysqlData.total_experience_years} Years {experienceData.mysqlData.total_experience_months || 0} Months</span>
              )}
              {currentDesignation && <span> | {currentDesignation}</span>}
            </div>
            
                         {/* Professional Info */}
             <div style={{ 
               marginBottom: '2px', 
               fontSize: isMobile ? '14px' : '15px',
               color: '#555'
             }}>
              {profileData.designation && <span>{profileData.designation}</span>}
              {(profileData.teachingSubjects?.length > 0 || profileData.teachingCoreExpertise?.length > 0) && (
                <span> | {profileData.teachingSubjects?.[0] || profileData.teachingCoreExpertise?.[0]} Faculty</span>
              )}
            </div>
            
            {/* Email */}
            {profileData.email && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                fontSize: isMobile ? '14px' : '15px'
              }}>
                <FaEnvelope style={{ marginRight: '6px', color: '#A9A9A9' }} />
                <a href={`mailto:${profileData.email}`} style={{ textDecoration: 'none', color: '#1967d2' }}>
                  {profileData.email}
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Contact Information Rows - Starting from left edge */}
        <div style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: isMobile ? '13px' : '14px',
          lineHeight: '1.4'
        }}>
          {/* Row 2: Address Information */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            gap: isMobile ? '15px' : '20px',
            marginBottom: '6px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaMapMarkerAlt style={{ 
                marginRight: '6px', 
                color: '#e74c3c',
                fontSize: '13px'
              }} />
              <span style={{ fontWeight: '600', marginRight: '6px' }}>Present:</span>
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: isMobile ? '280px' : '350px'
              }}>
                {[
                  profileData.present_city_name,
                  profileData.present_state_name,
                  profileData.present_country_name
                ].filter(Boolean).join(', ')}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaMapMarkerAlt style={{ 
                marginRight: '6px', 
                color: '#e74c3c',
                fontSize: '13px'
              }} />
              <span style={{ fontWeight: '600', marginRight: '6px' }}>Permanent:</span>
              <span style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: isMobile ? '280px' : '350px'
              }}>
                {[
                  profileData.permanent_city_name,
                  profileData.permanent_state_name,
                  profileData.permanent_country_name
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
          
          {/* Row 3: Phone Numbers */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            gap: isMobile ? '15px' : '20px',
            marginBottom: '6px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaPhone style={{ 
                marginRight: '6px', 
                color: '#1a73e8',
                fontSize: '13px'
              }} />
              <span style={{ fontWeight: '600', marginRight: '6px' }}>Phone:</span>
              <span>{profileData.callingNumber}</span>
            </div>
             
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaWhatsapp style={{ 
                marginRight: '6px', 
                color: '#25D366',
                fontSize: '13px'
              }} />
              <span style={{ fontWeight: '600', marginRight: '6px' }}>WhatsApp:</span>
              <span>{profileData.whatsappNumber}</span>
            </div>
          </div>
          
          {/* Row 4: Social Links */}
          <div style={{ 
            display: 'flex',
            gap: isMobile ? '15px' : '20px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaFacebook style={{ 
                marginRight: '6px', 
                color: '#385898',
                fontSize: '13px'
              }} /> 
              <span style={{ fontWeight: '600', marginRight: '6px' }}>Facebook:</span>
              {socialLinks.facebook ? (
                <a 
                  href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://${socialLinks.facebook}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    textDecoration: 'none', 
                    color: '#385898',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px'
                  }}
                >
                  {socialLinks.facebook}
                </a>
              ) : (
                <span style={{ color: '#999', fontStyle: 'italic' }}>Not provided</span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaLinkedin style={{ 
                marginRight: '6px', 
                color: '#0077b5',
                fontSize: '13px'
              }} /> 
              <span style={{ fontWeight: '600', marginRight: '6px' }}>LinkedIn:</span>
              {socialLinks.linkedin ? (
                <a 
                  href={socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://${socialLinks.linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    textDecoration: 'none', 
                    color: '#0077b5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px'
                  }}
                >
                  {socialLinks.linkedin}
                </a>
              ) : (
                <span style={{ color: '#999', fontStyle: 'italic' }}>Not provided</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="cv-body">
        <div className="cv-sidebar">
          <div className="cv-section education-section">
            <h2 className="section-title">EDUCATION</h2>
            {renderEducationBlocks()}
          </div>
        </div>

        <div className="cv-main">
          <div className="cv-section experience-section">
            <h2 className="section-title" style={{ 
              textAlign: 'center',
              borderBottom: '1px solid #000',
              marginBottom: '15px',
              paddingBottom: '5px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
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
              <div className="cv-section job-preferences">
                <h2 className="section-title">Job Preferences</h2>
                <div className="job-preferences-block" style={{ 
                  marginBottom: '25px',
                  padding: '20px',
                  background: '#f5f7fc',
                  borderRadius: '8px',
                  fontSize: '15px',
                  lineHeight: '1.5'
                }}>
                  {/* Two-column details grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
                    columnGap: '20px',
                    rowGap: '5px'
                  }}>
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
