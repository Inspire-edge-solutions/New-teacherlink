import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from "../../../../Context/AuthContext";
import './profile-styles.css';
import './view.css';
import './cv-style.css';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { decodeCandidateData } from '../../../../utils/dataDecoder';

// Define a base64 encoded default avatar as a data URI
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='120' height='120'%3E%3Ccircle cx='12' cy='7' r='5' fill='%23ccc'/%3E%3Cpath d='M3 19c0-4.1 3.4-8 9-8s9 3.9 9 8H3z' fill='%23ccc'/%3E%3C/svg%3E";

const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

function EasyView({ onViewAttempt }) {
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

  useEffect(() => {
    // Only check after loading is complete AND data check is complete AND we have a definitive answer about profile data
    if (!isLoading && dataCheckComplete && profileData !== null) {
      // Check if profileData is empty or has no meaningful data
      const hasNoData = !profileData || 
                       Object.keys(profileData).length === 0 || 
                       (Object.keys(profileData).length === 1 && Object.prototype.hasOwnProperty.call(profileData, 'firebase_uid'));
      
      // Also check if user has any data in other tables
      const hasAnyData = educationData.length > 0 || 
                        (experienceData.mysqlData && Object.keys(experienceData.mysqlData).length > 0) ||
                        (experienceData.dynamoData && experienceData.dynamoData.length > 0) ||
                        jobPreferenceData;
      
      if (hasNoData && !profileData?.hasPartialData && !hasAnyData) {
        console.log('No profile data found - showing message');
        toast.info('No profile data found. Please complete your profile information.');
        if (onViewAttempt) onViewAttempt(); // Notify parent component
      } else if (profileData?.hasPartialData || hasAnyData) {
        console.log('Data found (partial or other tables) - not showing error message');
      } else {
        console.log('Full profile data found - not showing error message');
      }
    }
  }, [isLoading, dataCheckComplete, profileData, educationData, experienceData, jobPreferenceData, onViewAttempt]);

  if (!user?.uid) {
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

  if (error) {
    return (
      <div className="alert alert-danger">
        Error loading profile: {error}
      </div>
    );
  }

  // If no profile data, don't render anything but stay on the page
  if (!profileData || Object.keys(profileData).length === 0) {
    return <div></div>;  // Return empty div to stay on page
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
      <div key={`${education.education_type}-${index}`} className="education-block">
        <div className="education-title">{getEducationTypeTitle(education.education_type)}</div>
        {education.yearOfPassing && (
          <div className="education-detail">Year of Passing: {education.yearOfPassing}</div>
        )}
        {education.courseName && (
          <div className="education-detail">Course Name: {education.courseName}</div>
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
      <div className="experience-summary">
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
          
          {/* Two-column details grid */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: windowWidth <= 768 ? '1fr' : '1fr 1fr',
            columnGap: '20px',
            rowGap: '5px'
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

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;

  return (
    <div className="cv-container" style={{ 
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

      <div className="cv-header" style={{ marginBottom: '10px' }}>
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
            <h1 className="candidate-name" style={{ 
              marginBottom: '4px', 
              fontSize: isMobile ? '20px' : '24px' 
            }}>
              {profileData.fullName || 'Candidate Name'}
            </h1>
            
            {/* Personal Details */}
            <div style={{ 
              marginBottom: '4px', 
              fontSize: isMobile ? '14px' : '15px',
              color: '#555'
            }}>
              {profileData.gender && <span>{profileData.gender}</span>}
              {profileData.dateOfBirth && (
                <span> | {new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()} Years</span>
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
                ].filter(Boolean).join(', ') || 'Not provided'}
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
                ].filter(Boolean).join(', ') || 'Not provided'}
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
              <span>{profileData.callingNumber || 'Not provided'}</span>
            </div>
             
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaWhatsapp style={{ 
                marginRight: '6px', 
                color: '#25D366',
                fontSize: '13px'
              }} />
              <span style={{ fontWeight: '600', marginRight: '6px' }}>WhatsApp:</span>
              <span>{profileData.whatsappNumber || 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="cv-body">
        <div className="cv-sidebar">
          <div className="cv-section education-section">
            <h2 className="section-title" style={{ 
              fontSize: '18px',
              borderBottom: '2px solid #1967d2',
              paddingBottom: '8px',
              marginBottom: '15px',
              fontWeight: '700',
              color: '#1967d2',
              textTransform: 'uppercase',
              textAlign: 'left'
            }}>EDUCATION</h2>
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
              fontWeight: 'bold',
              fontSize: '18px',
              color: '#1967d2'
            }}>
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

export default React.memo(EasyView);
