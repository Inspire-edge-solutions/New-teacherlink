import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import LoginConsentModal from '../components/common/LoginConsentModal';
import '../components/JobProvider/AllCandidates/Components/styles/cv-style.css';
import '../components/JobProvider/AllCandidates/Components/styles/cv-pdf-print.css';
import '../components/JobProvider/AllCandidates/Components/styles/view.css';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { AvatarImage } from '../components/JobProvider/AllCandidates/Components/utils/avatarUtils.jsx';
import { decodeCandidateData } from '../utils/dataDecoder';

const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const ADDITIONAL_INFO1_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1';
const SOCIAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile';

// Helper component for displaying info items
const InfoItem = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="mb-2">
      <span className="font-bold text-[#202124]">{label}:</span>
      <span className="ml-2 text-gray-700">{value}</span>
    </div>
  );
};

const CandidateProfilePage = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const firebase_uid = uid;
  const { user, loading: authLoading } = useAuth();
  
  // Debug logging
  console.log('🔍 CandidateProfilePage rendered');
  console.log('🔍 Route params:', { uid });
  console.log('🔍 firebase_uid:', firebase_uid);
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Auth state:', { user: !!user, authLoading });
  console.log('🔍 Component mounting successfully');
  
  // Add a simple test to see if the component renders
  useEffect(() => {
    console.log('🔍 Component mounted with UID:', uid);
    console.log('🔍 Firebase UID:', firebase_uid);
    console.log('🔍 Auth loading:', authLoading);
    console.log('🔍 User:', user);
  }, [uid, firebase_uid, authLoading, user]);
  
  // State variables matching ViewFull structure
  const [profileData, setProfileData] = useState(null);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState({ mysqlData: null, dynamoData: { experienceEntries: [] } });
  const [jobPreferenceData, setJobPreferenceData] = useState(null);
  const [additionalInfo1, setAdditionalInfo1] = useState(null);
  const [socialLinks, setSocialLinks] = useState({});
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation function to go back to Job Seeker's All Jobs page
  const handleBackToList = () => {
    navigate('/seeker/all-jobs');
  };

  // Handle login confirmation - redirect to login with return path
  const handleConfirmLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}&action=view-full&id=${firebase_uid}&requiredUserType=Employer`);
  };

  // Fetch profile data using the same approach as ViewFull
  const fetchProfileData = useCallback(async () => {
    if (!firebase_uid) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching profile data for UID:', firebase_uid);
      const response = await axios.get(FULL_API, {
        params: { firebase_uid: firebase_uid, t: Date.now() }
      });
      console.log('FULL_API Response:', response.data);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateRecord = response.data.find(r => 
          r.firebase_uid === firebase_uid || 
          (r.email && r.email.toLowerCase() === firebase_uid?.toLowerCase())
        );
        console.log('Found candidate record:', candidateRecord);
        // Decode the profile data (decrypt base64 encoded fields)
        const decodedProfile = candidateRecord ? decodeCandidateData(candidateRecord) : null;
        console.log('Decoded profile data:', decodedProfile);
        setProfileData(decodedProfile);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [firebase_uid]);

  // Fetch experience data
  const fetchExperienceData = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const response = await axios.get(EXPERIENCE_API);
      if (response.status === 200) {
        const { mysqlData, dynamoData } = response.data;
        const candidateMysqlData = Array.isArray(mysqlData) 
          ? mysqlData.find(exp => exp.firebase_uid === firebase_uid) 
          : null;
        let candidateDynamoData = null;
        if (Array.isArray(dynamoData)) {
          candidateDynamoData = dynamoData.find(exp => exp.firebase_uid === firebase_uid);
        } else if (dynamoData && typeof dynamoData === 'object') {
          if (dynamoData.firebase_uid === firebase_uid) {
            candidateDynamoData = dynamoData;
          }
        }
        // Decode the experience data (decrypt base64 encoded fields)
        const decodedMysqlData = candidateMysqlData ? decodeCandidateData(candidateMysqlData) : null;
        const decodedDynamoData = candidateDynamoData ? decodeCandidateData(candidateDynamoData) : null;
        
        setExperienceData({
          mysqlData: decodedMysqlData || {
            teaching_experience_years: 0,
            teaching_experience_months: 0,
            non_teaching_experience_years: 0,
            non_teaching_experience_months: 0,
            total_experience_years: 0,
            total_experience_months: 0
          },
          dynamoData: decodedDynamoData || { experienceEntries: [] }
        });
      }
    } catch (err) {
      setExperienceData({ 
        mysqlData: {
          teaching_experience_years: 0,
          teaching_experience_months: 0,
          non_teaching_experience_years: 0,
          non_teaching_experience_months: 0,
          total_experience_years: 0,
          total_experience_months: 0
        }, 
        dynamoData: { experienceEntries: [] } 
      });
    }
  }, [firebase_uid]);

  // Fetch job preference data
  const fetchJobPreferenceData = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const response = await axios.get(JOB_PREFERENCE_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidatePreference = response.data.find(pref => pref.firebase_uid === firebase_uid);
        // Decode the job preference data (decrypt base64 encoded fields)
        const decodedPreference = candidatePreference ? decodeCandidateData(candidatePreference) : null;
        setJobPreferenceData(decodedPreference);
      }
    } catch (err) {
      // Handle error silently
    }
  }, [firebase_uid]);

  // Fetch additional info
  const fetchAdditionalInfo = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const [response1] = await Promise.all([
        axios.get(ADDITIONAL_INFO1_API)
      ]);
      if (response1.status === 200 && Array.isArray(response1.data)) {
        const candidateInfo1 = response1.data.find(info => info.firebase_uid === firebase_uid);
        // Decode the additional info data (decrypt base64 encoded fields)
        const decodedInfo1 = candidateInfo1 ? decodeCandidateData(candidateInfo1) : null;
        setAdditionalInfo1(decodedInfo1);
      }
    } catch (err) {
      // Handle error silently
    }
  }, [firebase_uid]);

  // Fetch education data
  const fetchEducationData = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const response = await axios.get(EDUCATION_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateEducation = response.data.filter(edu => edu.firebase_uid === firebase_uid);
        // Decode the education data (decrypt base64 encoded fields)
        const decodedEducation = candidateEducation.map(edu => decodeCandidateData(edu));
        setEducationData(decodedEducation);
      }
    } catch (err) {
      // Handle error silently
    }
  }, [firebase_uid]);

  // Fetch social links
  const fetchSocialLinks = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const response = await axios.get(SOCIAL_API);
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateSocial = response.data.find(social => social.firebase_uid === firebase_uid);
        // Decode the social links data (decrypt base64 encoded fields)
        const decodedSocial = candidateSocial ? decodeCandidateData(candidateSocial) : null;
        setSocialLinks({
          facebook: decodedSocial?.facebook || null,
          linkedin: decodedSocial?.linkedin || null
        });
      }
    } catch (err) {
      // Handle error silently
    }
  }, [firebase_uid]);

  // Fetch profile photo
  const fetchProfilePhoto = useCallback(async () => {
    if (!firebase_uid) return;
    try {
      const response = await axios.get(IMAGE_API_URL);
      if (response.status === 200 && Array.isArray(response.data)) {
        const profileImage = response.data.find(img => 
          img.firebase_uid === firebase_uid && img.image_type === 'profile_picture'
        );
        setPhotoUrl(profileImage?.image_url || null);
      }
    } catch (err) {
      // Handle error silently
    }
  }, [firebase_uid]);

  // Load all data on component mount
  useEffect(() => {
    if (firebase_uid) {
      Promise.all([
        fetchProfileData(),
        fetchEducationData(),
        fetchExperienceData(),
        fetchJobPreferenceData(),
        fetchAdditionalInfo(),
        fetchSocialLinks(),
        fetchProfilePhoto()
      ]);
    }
  }, [firebase_uid, fetchProfileData, fetchEducationData, fetchExperienceData, fetchJobPreferenceData, fetchAdditionalInfo, fetchSocialLinks, fetchProfilePhoto]);

  // Helper functions
  const getCurrentDesignation = () => {
    if (!experienceData?.dynamoData?.experienceEntries || 
        experienceData.dynamoData.experienceEntries.length === 0) {
      return null;
    }
    const currentJob = experienceData.dynamoData.experienceEntries.find(
      exp => exp.currentlyWorking === true
    );
    const mostRecentJob = currentJob || experienceData.dynamoData.experienceEntries[0];
    if (!mostRecentJob) return null;
    return mostRecentJob.jobType === 'teaching' ? mostRecentJob.teachingDesignation :
           mostRecentJob.jobType === 'administration' ? mostRecentJob.adminDesignation :
           mostRecentJob.designation;
  };

  const getHighestEducation = () => {
    if (!educationData || educationData.length === 0) return null;
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
    return highestEducation.education_type;
  };

  const hasJobPreferencesData = () => {
    if (!jobPreferenceData) return false;
    const meaningfulFields = [
      'Job_Type', 'expected_salary', 'notice_period', 'jobCategory', 'jobType', 
      'jobMode', 'minSalaryExpectation', 'maxSalaryExpectation', 'resumeHeadline', 
      'profileSummary', 'keySkills', 'teachingGrades', 'teachingSubjects', 
      'teachingCurriculum', 'preferredStates', 'preferredCities'
    ];
    return meaningfulFields.some(field => 
      jobPreferenceData[field] && 
      jobPreferenceData[field] !== '' && 
      jobPreferenceData[field] !== null &&
      jobPreferenceData[field] !== undefined
    );
  };

  // Authentication check
  if (authLoading) {
    return (
      <div className="page-wrapper">
        <div className="preloader"></div>
        <div className="main-content">
          <div className="container">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-3">Verifying authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!user && !authLoading) {
    return (
      <div className="page-wrapper">
        <div className="main-content">
          <div className="container">
            <div className="text-center py-5">
              <div className="alert alert-info max-w-[560px] mx-auto">
                <h4>Login Required</h4>
                <p>Please login to view candidate profiles.</p>
              </div>
            </div>
          </div>
        </div>
        <LoginConsentModal
          isOpen={true}
          onClose={() => navigate('/')}
          onConfirm={handleConfirmLogin}
          action="view-full"
          userType="Employer"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="preloader"></div>
        <div className="main-content">
          <div className="container">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-3">Loading candidate profile...</p>
              <p className="text-muted">UID: {firebase_uid}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="main-content">
          <div className="container">
            <div className="text-center py-5">
              <div className="alert alert-danger">
                <h4>Error</h4>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={handleBackToList}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="page-wrapper">
        <div className="main-content">
          <div className="container">
            <div className="text-center py-5">
              <div className="alert alert-warning">
                <h4>Candidate Not Found</h4>
                <p>The candidate profile you&apos;re looking for doesn&apos;t exist.</p>
                <button className="btn btn-primary" onClick={handleBackToList}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-container">
      {/* Navigation */}
      <div className="profile-actions">
        <div className="back-button">
          <button onClick={handleBackToList} className="btn btn-warning">
            Back to List
          </button>
        </div>
      </div>

      {/* Header Section with Photo and Basic Info */}
      <div className="cv-header">
        <div className="cv-profile-photo">
          <AvatarImage
            src={photoUrl}
            alt={`${profileData?.fullName || 'User'}'s profile photo`}
            name={profileData?.fullName}
            gender={profileData?.gender}
          />
        </div>
        {/* Header Content */}
        <div className="header-content flex-1 pl-5">
          <h1 className="candidate-name">{profileData?.fullName || 'Candidate Name'}</h1>
          <div className="personal-meta mb-2">
            {profileData?.gender && <span>{profileData.gender}</span>}
            {profileData?.dateOfBirth && (
              <span className="ml-[15px]">
                DOB: {new Date(profileData.dateOfBirth).toLocaleDateString('en-US', { 
                  day: '2-digit', month: '2-digit', year: 'numeric' 
                })}
              </span>
            )}
            {profileData?.email && (
              <div className="email-link flex items-center mt-1">
                <FaEnvelope className="mr-1.5 text-gray-400" />
                <a href={`mailto:${profileData.email}`} className="text-[#1766af]">
                  {profileData.email}
                </a>
              </div>
            )}
          </div>
          {/* Contact Information - Optimized Layout */}
          <div className="contact-grid grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-sm">
            {/* Left Column - Addresses */}
            <div className="address-column">
              <div className="flex items-center mb-2">
                <FaMapMarkerAlt className="mr-2 text-[#e74c3c] text-base" /> 
                <span><strong>Present:</strong> {profileData.present_state_name || 'N/A'}</span>
              </div>
              {profileData.permanent_state_name && (
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-[#95a5a6] text-base" />
                  <span><strong>Permanent:</strong> {profileData.permanent_state_name}</span>
                </div>
              )}
            </div>
            {/* Right Column - Phone Numbers */}
            <div className="phone-column">
              <div className="flex items-center mb-2">
                <FaPhone className="mr-2 text-[#1a73e8] text-base" />
                <span><strong>Phone:</strong> {profileData?.callingNumber || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <FaWhatsapp className="mr-2 text-[#25D366] text-base" />
                <span><strong>WhatsApp:</strong> {profileData?.whatsappNumber || "N/A"}</span>
              </div>
            </div>
          </div>
          {/* Social Links Row */}
          {(socialLinks.facebook || socialLinks.linkedin) && (
            <div className="social-links mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-gray-600 mr-1">Social Links:</span>
              <div className="flex gap-4 flex-wrap flex-1">
                {socialLinks.linkedin && (
                  <div className="flex items-center">
                    <FaLinkedin className="mr-1.5 text-[#0077b5] text-base" />
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#0077b5]">
                      {socialLinks.linkedin}
                    </a>
                  </div>
                )}
                {socialLinks.facebook && (
                  <div className="flex items-center">
                    <FaFacebook className="mr-1.5 text-[#1877f2] text-base" />
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-[#1877f2]">
                      {socialLinks.facebook}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body Section - Two column layout */}
      <div className="cv-body mt-0">
        {/* Left Sidebar */}
        <div className="cv-sidebar">
          {/* Education Section */}
          {educationData && educationData.length > 0 && (
            <div className="cv-section education-section">
              <h2 className="section-title">Education</h2>
              <div className="education-content">
                {educationData.map((edu, index) => (
                  <div key={index} className="education-block">
                    <h3>{edu.education_type}</h3>
                    {edu.institution && <p><strong>Institution:</strong> {edu.institution}</p>}
                    {edu.year_of_completion && <p><strong>Year:</strong> {edu.year_of_completion}</p>}
                    {edu.percentage && <p><strong>Percentage:</strong> {edu.percentage}%</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className="cv-main">
          {/* Experience Section */}
          <div className="cv-section experience-section">
            <h2 className="section-title">Work Experience</h2>
            <div className="experience-content">
              {experienceData?.dynamoData?.experienceEntries?.map((exp, index) => (
                <div key={index} className="experience-block">
                  <h3>{exp.designation || exp.teachingDesignation || exp.adminDesignation}</h3>
                  {exp.organisation && <p><strong>Organization:</strong> {exp.organisation}</p>}
                  {exp.from_date && exp.to_date && (
                    <p><strong>Duration:</strong> {exp.from_date} - {exp.to_date}</p>
                  )}
                  {exp.description && <p>{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Job Preferences Section */}
          {hasJobPreferencesData() && (
            <div className="cv-section job-preferences">
              <h2 className="section-title">Job Preferences</h2>
              <div className="job-preferences-block mb-6 p-5 bg-[#f5f7fc] rounded-lg text-[15px] leading-relaxed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1.5">
                  {(jobPreferenceData.Job_Type || jobPreferenceData.jobType) && (
                    <div>
                      <strong>Job Type:</strong> {
                        (jobPreferenceData.Job_Type === 'teaching' || jobPreferenceData.jobType === 'teaching') ? 'Education - Teaching' :
                        (jobPreferenceData.Job_Type === 'administration' || jobPreferenceData.jobType === 'administration') ? 'Education - Administration' :
                        (jobPreferenceData.Job_Type === 'teachingAndAdmin' || jobPreferenceData.jobType === 'teachingAndAdmin') ? 'Education - Teaching + Administration' :
                        jobPreferenceData.Job_Type || jobPreferenceData.jobType
                      }
                    </div>
                  )}
                  {jobPreferenceData.jobCategory && (
                    <div><strong>Job Category:</strong> {jobPreferenceData.jobCategory}</div>
                  )}
                  {jobPreferenceData.jobMode && (
                    <div><strong>Job Mode:</strong> {jobPreferenceData.jobMode}</div>
                  )}
                  {(jobPreferenceData.expected_salary || jobPreferenceData.minSalaryExpectation || jobPreferenceData.maxSalaryExpectation) && (
                    <div>
                      <strong>Expected Salary:</strong> {
                        jobPreferenceData.expected_salary ||
                        (jobPreferenceData.minSalaryExpectation && jobPreferenceData.maxSalaryExpectation 
                          ? `${jobPreferenceData.minSalaryExpectation} - ${jobPreferenceData.maxSalaryExpectation}` 
                          : jobPreferenceData.minSalaryExpectation || jobPreferenceData.maxSalaryExpectation)
                      }
                    </div>
                  )}
                  {(jobPreferenceData.notice_period || jobPreferenceData.noticePeriod) && (
                    <div><strong>Notice Period:</strong> {jobPreferenceData.notice_period || jobPreferenceData.noticePeriod}</div>
                  )}
                  {jobPreferenceData.resumeHeadline && (
                    <div><strong>Resume Headline:</strong> {jobPreferenceData.resumeHeadline}</div>
                  )}
                  {jobPreferenceData.profileSummary && (
                    <div><strong>Profile Summary:</strong> {jobPreferenceData.profileSummary}</div>
                  )}
                  {jobPreferenceData.keySkills && (
                    <div><strong>Key Skills:</strong> {jobPreferenceData.keySkills}</div>
                  )}
                  {jobPreferenceData.teachingGrades && (
                    <div>
                      <strong>Preferred Grades:</strong> {Array.isArray(jobPreferenceData.teachingGrades) ? jobPreferenceData.teachingGrades.join(', ') : jobPreferenceData.teachingGrades}
                    </div>
                  )}
                  {jobPreferenceData.teachingSubjects && (
                    <div>
                      <strong>Preferred Subjects:</strong> {Array.isArray(jobPreferenceData.teachingSubjects) ? jobPreferenceData.teachingSubjects.join(', ') : jobPreferenceData.teachingSubjects}
                    </div>
                  )}
                  {jobPreferenceData.teachingCurriculum && (
                    <div><strong>Preferred Curriculum:</strong> {jobPreferenceData.teachingCurriculum}</div>
                  )}
                  {(jobPreferenceData.preferredStates || jobPreferenceData.preferredCities) && (
                    <div>
                      <strong>Preferred Locations:</strong> {
                        [
                          jobPreferenceData.preferredStates && `States: ${Array.isArray(jobPreferenceData.preferredStates) ? jobPreferenceData.preferredStates.join(', ') : jobPreferenceData.preferredStates}`,
                          jobPreferenceData.preferredCities && `Cities: ${Array.isArray(jobPreferenceData.preferredCities) ? jobPreferenceData.preferredCities.join(', ') : jobPreferenceData.preferredCities}`
                        ].filter(Boolean).join(' | ')
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {additionalInfo1 && (
            <div className="cv-section">
              <h2 className="section-title">Additional Information</h2>
              <div className="p-4">
                <div className="flex flex-wrap gap-5">
                  <div className="flex-1 min-w-full md:min-w-[300px]">
                    {additionalInfo1?.religion && (
                      <InfoItem label="Religion" value={additionalInfo1.religion} />
                    )}
                    {additionalInfo1?.marital_status && (
                      <InfoItem label="Marital Status" value={additionalInfo1.marital_status} />
                    )}
                    {additionalInfo1?.computer_skills && (
                      <InfoItem label="Computer skills" value={additionalInfo1.computer_skills} />
                    )}
                    {additionalInfo1?.accounting_knowledge !== undefined && (
                      <InfoItem 
                        label="Accounting Knowledge" 
                        value={additionalInfo1.accounting_knowledge ? 'Yes' : 'No'} 
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-full md:min-w-[300px]">
                    {additionalInfo1?.citizenship && (
                      <InfoItem label="Citizenship" value={additionalInfo1.citizenship} />
                    )}
                    {additionalInfo1?.differently_abled && (
                      <InfoItem label="Differently abled" value={additionalInfo1.differently_abled} />
                    )}
                    {additionalInfo1?.certifications && (
                      <InfoItem label="Certifications" value={additionalInfo1.certifications} />
                    )}
                    {additionalInfo1?.accomplishments && (
                      <InfoItem label="Accomplishments" value={additionalInfo1.accomplishments} />
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  {additionalInfo1?.projects && (
                    <InfoItem label="Projects" value={additionalInfo1.projects} />
                  )}
                  {additionalInfo1?.research_publications && (
                    <InfoItem label="Research publications" value={additionalInfo1.research_publications} />
                  )}
                  {additionalInfo1?.additional_info && (
                    <InfoItem label="Anything more about yourself" value={additionalInfo1.additional_info} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfilePage;