import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../Context/AuthContext';
import LoginConsentModal from '../components/common/LoginConsentModal';
import '../components/JobProvider/AllCandidates/Components/styles/cv-style.css';
import '../components/JobProvider/AllCandidates/Components/styles/cv-pdf-print.css';
import { FaMapMarkerAlt, FaPhone, FaWhatsapp, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { AvatarImage } from '../components/JobProvider/AllCandidates/Components/utils/avatarUtils.jsx';
import { decodeCandidateData } from '../utils/dataDecoder';
import LoadingState from '../components/common/LoadingState';
import { 
  formatNoticePeriod, 
  capitalizeWords, 
  capitalizeFirst, 
  formatCurriculum, 
  formatGrade 
} from '../components/JobProvider/AllCandidates/Components/utils/candidateUtils';

const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const EDUCATION_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails';
const EXPERIENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/workExperience';
const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
const ADDITIONAL_INFO1_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1';
const SOCIAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile';


const CandidateProfilePage = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const firebase_uid = uid;
  const { user, loading: authLoading } = useAuth();
  
  // Responsive design state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;
  
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
      const response = await axios.get(FULL_API, {
        params: { firebase_uid: firebase_uid, t: Date.now() }
      });
      if (response.status === 200 && Array.isArray(response.data)) {
        const candidateRecord = response.data.find(r => 
          r.firebase_uid === firebase_uid || 
          (r.email && r.email.toLowerCase() === firebase_uid?.toLowerCase())
        );
        // Decode the profile data (decrypt base64 encoded fields)
        const decodedProfile = candidateRecord ? decodeCandidateData(candidateRecord) : null;
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
      ]).catch(err => {
        console.error('Error loading candidate data:', err);
        setError('Failed to load candidate profile data');
      });
    }
  }, [firebase_uid, fetchProfileData, fetchEducationData, fetchExperienceData, fetchJobPreferenceData, fetchAdditionalInfo, fetchSocialLinks, fetchProfilePhoto]);

  // Helper functions
  const getEducationTypeTitle = (type) => {
    const titles = {
      grade10: 'Grade 10',
      grade12: 'Grade 12',
      degree: 'Degree',
      masterDegree: "Master's Degree",
      doctorate: 'Doctorate',
      nttMtt: 'NTT/MTT',
      dEd: 'D.Ed/D.EID',
      bEd: 'B.Ed',
      certificate: 'Certificate/Other Course'
    };
    return titles[type] || type;
  };

  const getExperienceText = () => {
    if (!experienceData?.mysqlData) {
      return (
        <div className="mb-4 p-2.5 border-b border-gray-200">
          <div><strong>Total Teaching Experience</strong>: Not specified</div>
          <div><strong>Total Experience (Teaching + Non-Teaching)</strong>: Not specified</div>
        </div>
      );
    }
    const teachingYears = experienceData.mysqlData.teaching_experience_years || 0;
    const teachingMonths = experienceData.mysqlData.teaching_experience_months || 0;
    const nonTeachingYears = experienceData.mysqlData.non_teaching_experience_years || 0;
    const nonTeachingMonths = experienceData.mysqlData.non_teaching_experience_months || 0;
    let totalYears = experienceData.mysqlData.total_experience_years;
    let totalMonths = experienceData.mysqlData.total_experience_months;
    if (totalYears === undefined || totalMonths === undefined) {
      const rawTotalMonths = (teachingMonths + nonTeachingMonths);
      totalMonths = rawTotalMonths % 12;
      const extraYears = Math.floor(rawTotalMonths / 12);
      totalYears = teachingYears + nonTeachingYears + extraYears;
    }
    return (
      <div className="mb-2 p-2.5 border-b border-gray-200">
        <div className="mb-2 text-base leading-normal tracking-tight"><strong>Total Teaching Experience</strong>: {teachingYears} Years & {teachingMonths} months</div>
        <div className="text-base leading-normal tracking-tight"><strong>Total Experience (Teaching + Non-Teaching)</strong>: {totalYears} Years & {totalMonths} months</div>
      </div>
    );
  };

  const renderEducationBlocks = () => {
    if (!educationData || educationData.length === 0) return null;  
    return educationData.map((education, index) => {
      if (!education) return null;
      const educationType = getEducationTypeTitle(education.education_type);
      let details = [];
      if (education.schoolName) details.push(capitalizeWords(education.schoolName));
      if (education.collegeName) details.push(capitalizeWords(education.collegeName));
      if (education.universityName) details.push(capitalizeWords(education.universityName));
      if (education.instituteName) details.push(capitalizeWords(education.instituteName));
      let additionalInfo = [];
      if (education.yearOfPassing) additionalInfo.push(`${education.yearOfPassing}`);
      if (education.percentage) additionalInfo.push(`${education.percentage}%`);
      if (education.mode) additionalInfo.push(capitalizeWords(education.mode));
      if (education.syllabus) additionalInfo.push(capitalizeWords(education.syllabus));
      if (education.courseStatus) additionalInfo.push(capitalizeWords(education.courseStatus));
      if (education.courseName) additionalInfo.push(capitalizeWords(education.courseName));
      if (education.placeOfStudy) additionalInfo.push(capitalizeWords(education.placeOfStudy));
      if (education.affiliatedTo) additionalInfo.push(`Affiliated to: ${capitalizeWords(education.affiliatedTo)}`);
      if (education.courseDuration) additionalInfo.push(`Duration: ${education.courseDuration}`);
      if (education.specialization) additionalInfo.push(capitalizeWords(education.specialization));
      return (
        <div className={`${isMobile ? 'mb-3' : 'mb-5'} p-4 bg-[#f5f7fc] rounded-lg`} key={index}>
          <div className="text-xl text-[#202124] mb-2.5 font-semibold leading-tight tracking-tight">{educationType}</div>
          <div>
            {details.map((detail, i) => (
              <div key={i} className="my-1.5 text-gray-600 text-base leading-normal tracking-tight">{detail}</div>
            ))}
            <div className="text-base text-gray-500 mt-1 leading-normal tracking-tight">
              {additionalInfo.join(' | ')}
            </div>
            {education.coreSubjects && (
              <div className="mt-2 text-base leading-normal tracking-tight">
                <strong>Core Subjects:</strong> {
                  Array.isArray(education.coreSubjects) 
                    ? education.coreSubjects.map(sub => capitalizeWords(sub)).join(', ')
                    : typeof education.coreSubjects === 'string'
                      ? JSON.parse(education.coreSubjects).map(sub => capitalizeWords(sub)).join(', ')
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
    if (!experienceData?.dynamoData?.experienceEntries || !Array.isArray(experienceData.dynamoData.experienceEntries)) {
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
      const startDate = exp.work_from_month && exp.work_from_year ? 
                      `${exp.work_from_month} / ${exp.work_from_year}` : '';
      const endDate = exp.currentlyWorking ? 
                    'till date' : 
                    (exp.work_till_month && exp.work_till_year ? 
                     `${exp.work_till_month} / ${exp.work_till_year}` : '');
      const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : '';
      let durationText = '';
      if (exp.experience_years || exp.experience_months) {
        durationText = ` (${exp.experience_years || 0} Years ${exp.experience_months || 0} Months)`;
      }
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
        <div key={index} className="mb-6 text-base leading-normal tracking-tight">
          <div className="flex justify-between font-bold mb-1">
            <div className="text-base">{exp.organizationName}</div>
            <div>
              {dateRange}
              <span className="font-normal text-gray-600">{durationText}</span>
            </div>
          </div>
          <div className="mb-1.5 text-gray-600">{location}</div>
          <div className="mb-1.5">
            {jobTypeText.join(' | ')}
          </div>
          <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-x-0 gap-y-1' : isTablet ? 'gap-x-3 gap-y-1.5' : 'gap-x-5 gap-y-1.5'}`}>
            <div>
              <strong>Designation:</strong> {designation}
            </div>
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
          </div>
        </div>
      );
    });
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
      <div className="py-12">
        <LoadingState
          title="Preparing full candidate profile…"
          subtitle="We're stitching together every section so you can review the complete profile."
        />
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
    <div className={`cv-container ${isMobile ? 'max-w-full' : isTablet ? 'max-w-[1000px]' : 'max-w-[1200px]'} mx-auto ${isMobile ? 'px-2 py-3' : isTablet ? 'p-5' : 'p-6 md:p-8'} bg-white shadow-md rounded-lg overflow-hidden font-sans text-gray-800 relative`}>
      {/* Navigation */}
      <div className={`flex flex-col sm:flex-row justify-between items-stretch sm:items-center ${isMobile ? 'mb-4' : 'mb-6'} w-full ${isMobile ? 'gap-2' : 'gap-4'} ${isMobile ? 'px-1' : 'px-2'}`}>
        <div className={`${isMobile ? 'w-full sm:w-auto sm:ml-auto' : 'ml-auto'} flex gap-2.5 items-center`}>
          <button onClick={handleBackToList} className={`w-full sm:w-auto px-4 py-2.5 text-base bg-gradient-brand hover:bg-gradient-primary-hover text-white rounded-lg transition-colors whitespace-nowrap font-medium leading-normal tracking-tight`}>
            Back to List
          </button>
        </div>
      </div>

      {/* Header Section with Photo and Basic Info */}
      <div className={`${isMobile ? 'flex-col items-center text-center px-2 py-2' : isTablet ? 'flex flex-row items-start p-4' : 'flex flex-row items-start p-6'} bg-white border-b border-gray-200 mb-2.5`}>
        {/* Left Side: Profile Picture + Basic Info */}
        <div className={`flex ${isMobile ? 'flex-col' : ''} ${isMobile ? 'gap-3' : 'gap-5'} ${isMobile ? 'mb-2 items-center' : isTablet ? 'w-1/2 pr-4 min-w-0' : 'w-1/2 pr-6 min-w-0'}`}>
          {/* Profile Picture */}
          <div className={`profile-photo ${isMobile ? 'w-[100px] h-[100px] mb-2.5' : isTablet ? 'w-[110px] h-[110px]' : 'w-[120px] h-[120px]'} rounded-full overflow-hidden border-[3px] border-gray-100 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${isMobile ? 'm-0' : 'mr-2.5'} shrink-0`}>
            <AvatarImage
              src={photoUrl}
              alt={`${profileData?.fullName || 'User'}'s profile photo`}
              name={profileData?.fullName}
              gender={profileData?.gender}
              className="w-full h-full object-cover"
              style={{ 
                border: 'none',
                transform: 'scale(1.4) translateY(7%)',
                transformOrigin: 'center'
              }}
            />
          </div>
          
          {/* Basic Information */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className={`candidate-name text-xl font-semibold mb-2 bg-gradient-brand bg-clip-text text-transparent break-words leading-tight tracking-tight`}>
              {profileData?.fullName || 'Candidate Name'}
            </h1>
            
            {/* Personal Details */}
            <div className={`text-base mb-3 text-gray-600 break-words leading-normal tracking-tight`}>
              {profileData?.gender && <span>{capitalizeFirst(profileData.gender)}</span>}
              {profileData?.dateOfBirth && (
                <span> | Age: {new Date().getFullYear() - new Date(profileData.dateOfBirth).getFullYear()} Years</span>
              )}
              {(() => {
                if (!experienceData?.mysqlData) return null;
                const teachingYears = experienceData.mysqlData.teaching_experience_years || 0;
                const teachingMonths = experienceData.mysqlData.teaching_experience_months || 0;
                const nonTeachingYears = experienceData.mysqlData.non_teaching_experience_years || 0;
                const nonTeachingMonths = experienceData.mysqlData.non_teaching_experience_months || 0;
                let totalYears = experienceData.mysqlData.total_experience_years;
                let totalMonths = experienceData.mysqlData.total_experience_months;
                
                if (totalYears === undefined || totalMonths === undefined) {
                  const rawTotalMonths = (teachingMonths + nonTeachingMonths);
                  totalMonths = rawTotalMonths % 12;
                  const extraYears = Math.floor(rawTotalMonths / 12);
                  totalYears = teachingYears + nonTeachingYears + extraYears;
                }
                
                if (totalYears > 0 || totalMonths > 0) {
                  return (
                    <span> | Experience: {totalYears} Years {totalMonths || 0} Months</span>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Email */}
            {profileData?.email && (
              <div className={`flex items-start gap-1.5 text-base min-w-0 leading-normal tracking-tight`}>
                <FaEnvelope className="text-gray-400 shrink-0 mt-0.5" />
                <a href={`mailto:${profileData.email}`} className={`no-underline text-[#1967d2] break-all break-words flex-1 min-w-0`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {profileData.email}
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Contact Information */}
        <div className={`font-sans text-base w-full sm:w-1/2 leading-normal tracking-tight ${isMobile ? 'mt-2' : isTablet ? 'pl-4' : 'pl-6'} min-w-0 overflow-hidden`}>
          {/* Address Information */}
          <div className={`flex ${isMobile ? 'flex-row' : 'flex-col'} ${isMobile ? 'gap-[15px]' : 'gap-2'} ${isMobile ? 'mb-2 flex-wrap' : 'mb-2.5'}`}>
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'} mb-1 min-w-0`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Present:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'} flex-1 min-w-0`}>
                {[
                  profileData?.present_city_name,
                  profileData?.present_state_name,
                  profileData?.present_country_name
                ].filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
            
            <div className={`flex items-center ${isMobile ? '' : 'flex-wrap'} mb-1 min-w-0`}>
              <FaMapMarkerAlt className="mr-1.5 text-[#e74c3c] text-[13px] shrink-0" />
              <span className="font-semibold mr-1.5 shrink-0">Permanent:</span>
              <span className={`${isMobile ? 'overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px]' : 'break-words'} flex-1 min-w-0`}>
                {[
                  profileData?.permanent_city_name,
                  profileData?.permanent_state_name,
                  profileData?.permanent_country_name
                ].filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Phone Numbers - Responsive layout */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} ${isMobile ? 'gap-2.5' : isTablet ? 'gap-4' : 'gap-5'} ${isMobile ? 'mb-2.5' : 'mb-3'}`}>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <FaPhone className="text-[#1a73e8] text-[13px] shrink-0" />
              <span className="font-semibold shrink-0 whitespace-nowrap">Phone:</span>
              <span className="tracking-wide break-all min-w-0">
                {profileData?.callingNumber || profileData?.phone_number || "N/A"}
              </span>
            </div>
             
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <FaWhatsapp className="text-[#25D366] text-[13px] shrink-0" />
              <span className="font-semibold shrink-0 whitespace-nowrap">WhatsApp:</span>
              <span className="tracking-wide break-all min-w-0">
                {profileData?.whatsappNumber || profileData?.whatsup_number || profileData?.whatsapp_number || "N/A"}
              </span>
            </div>
          </div>
          
          {/* Social Links */}
          {(socialLinks.facebook || socialLinks.linkedin) && (
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-col gap-1.5'} items-start`}>
              {socialLinks?.facebook && (
                <div className="flex items-start flex-wrap gap-1.5 min-w-0">
                  <FaFacebook className="text-[#385898] text-[13px] shrink-0 mt-0.5" /> 
                  <span className="font-semibold shrink-0">Facebook:</span>
                  <a href={socialLinks.facebook} className={`no-underline text-[#385898] break-all break-words flex-1 min-w-0`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {socialLinks.facebook}
                  </a>
                </div>
              )}
              
              {socialLinks?.linkedin && (
                <div className="flex items-start flex-wrap gap-1.5 min-w-0">
                  <FaLinkedin className="text-[#0077b5] text-[13px] shrink-0 mt-0.5" /> 
                  <span className="font-semibold shrink-0">LinkedIn:</span>
                  <a href={socialLinks.linkedin} className={`no-underline text-[#0077b5] break-all break-words flex-1 min-w-0`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {socialLinks.linkedin}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body Section - Two column layout */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[300px,1fr]'} ${isMobile ? 'gap-4' : isTablet ? 'gap-6' : 'gap-8'} mt-0`}>
        {/* Left Sidebar - Education */}
        <div className={`bg-gray-100 ${isMobile ? 'px-2 py-3' : isTablet ? 'p-4' : 'p-5'} lg:w-auto lg:order-none`}>
          {/* Education Section */}
          {educationData && educationData.length > 0 && (
            <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
              <h2 className={`section-title text-center ${isMobile ? 'mb-3' : 'mb-4'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>EDUCATION</h2>
              <div>
                {renderEducationBlocks()}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className={`${isMobile ? 'px-2 py-3' : isTablet ? 'p-4' : 'p-5'} lg:order-none`}>
          {/* Experience Section */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'} mt-0 pt-0`}>
            <h2 className={`section-title text-center ${isMobile ? 'mb-3' : 'mb-4'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>WORK EXPERIENCE</h2>
            <div>
              {getExperienceText()}
              {renderExperienceBlocks()}
            </div>
          </div>

          {/* Job Preferences Section */}
          {hasJobPreferencesData() && (
            <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
              <h2 className={`section-title text-center ${isMobile ? 'mb-3' : 'mb-4'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>JOB PREFERENCES</h2>
              <div className={`mb-6 ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-5'} bg-[#f5f7fc] rounded-lg text-base leading-normal tracking-tight`}>
                {/* Two-column details grid */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-2'} ${isMobile ? 'gap-x-0 gap-y-1' : isTablet ? 'gap-x-3 gap-y-1.5' : 'gap-x-5 gap-y-1.5'}`}>
                  {/* Basic Job Information */}
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
                  
                  {jobPreferenceData.expected_salary && (
                    <div><strong>Expected Salary:</strong> {(() => {
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
                        if (rangeMappings[normalized]) return rangeMappings[normalized];
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
                  
                  {(jobPreferenceData.notice_period || jobPreferenceData.noticePeriod) && (
                    <div><strong>Notice Period:</strong> {formatNoticePeriod(jobPreferenceData.notice_period || jobPreferenceData.noticePeriod)}</div>
                  )}

                  {/* Conditional Data Based on Job Type */}
                  {(jobPreferenceData.Job_Type === 'teaching' || jobPreferenceData.jobType === 'teaching') && (
                    <>
                      {jobPreferenceData.teaching_designations && Array.isArray(jobPreferenceData.teaching_designations) && jobPreferenceData.teaching_designations.length > 0 && (
                        <div>
                          <strong>Teaching Designations:</strong> {jobPreferenceData.teaching_designations.map(d => capitalizeWords(d)).join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_curriculum && Array.isArray(jobPreferenceData.teaching_curriculum) && jobPreferenceData.teaching_curriculum.length > 0 && (
                        <div>
                          <strong>Teaching Curriculum:</strong> {jobPreferenceData.teaching_curriculum.map(c => formatCurriculum(c)).join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_subjects && Array.isArray(jobPreferenceData.teaching_subjects) && jobPreferenceData.teaching_subjects.length > 0 && (
                        <div>
                          <strong>Teaching Subjects:</strong> {jobPreferenceData.teaching_subjects.map(s => capitalizeWords(s)).join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_grades && Array.isArray(jobPreferenceData.teaching_grades) && jobPreferenceData.teaching_grades.length > 0 && (
                        <div>
                          <strong>Teaching Grades:</strong> {jobPreferenceData.teaching_grades.map(g => formatGrade(g)).join(', ')}
                        </div>
                      )}
                      {jobPreferenceData.teaching_coreExpertise && Array.isArray(jobPreferenceData.teaching_coreExpertise) && jobPreferenceData.teaching_coreExpertise.length > 0 && (
                        <div>
                          <strong>Core Expertise:</strong> {jobPreferenceData.teaching_coreExpertise.map(e => capitalizeWords(e)).join(', ')}
                        </div>
                      )}
                    </>
                  )}

                  {/* Location Preferences */}
                  {(jobPreferenceData.preferred_country || jobPreferenceData.preferred_state || jobPreferenceData.preferred_city || jobPreferenceData.preferredStates || jobPreferenceData.preferredCities) && (
                    <div>
                      <strong>Preferred Locations:</strong> {
                        [
                          jobPreferenceData.preferred_country && `Country: ${jobPreferenceData.preferred_country}`,
                          jobPreferenceData.preferred_state && `State: ${jobPreferenceData.preferred_state}`,
                          jobPreferenceData.preferred_city && `City: ${jobPreferenceData.preferred_city}`,
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
            <div className={`mb-[30px] ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-[15px]'} bg-gray-50 rounded-lg border border-gray-200`}>
              <h2 className={`section-title text-center ${isMobile ? 'mb-3' : 'mb-4'} uppercase font-bold text-xl bg-gradient-brand bg-clip-text text-transparent leading-tight tracking-tight`}>
                ADDITIONAL INFORMATION
              </h2>
              <div className={`${isMobile ? 'block' : 'grid'} ${isMobile ? '' : isTablet ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${isMobile ? 'gap-0' : isTablet ? 'gap-x-3 gap-y-0' : 'gap-x-4 gap-y-0'}`}>
                {additionalInfo1?.religion && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Religion:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {capitalizeWords(additionalInfo1.religion)}
                    </span>
                  </div>
                )}
                {additionalInfo1?.marital_status && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Marital Status:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {capitalizeWords(additionalInfo1.marital_status)}
                    </span>
                  </div>
                )}
                {additionalInfo1?.accounting_knowledge !== undefined && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Accounting Knowledge:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.accounting_knowledge ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {additionalInfo1?.citizenship && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Citizenship:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {capitalizeWords(additionalInfo1.citizenship)}
                    </span>
                  </div>
                )}
                {additionalInfo1?.differently_abled && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Differently abled:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {capitalizeWords(additionalInfo1.differently_abled)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Full width items for longer content */}
              <div className={`${isMobile ? 'mt-2' : 'mt-[5px]'} w-full`}>
                {additionalInfo1?.computer_skills && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Computer skills:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {typeof additionalInfo1.computer_skills === 'string' ? (() => {
                        try {
                          const parsed = JSON.parse(additionalInfo1.computer_skills);
                          return Array.isArray(parsed) ? parsed.join(', ') : additionalInfo1.computer_skills;
                        } catch {
                          return additionalInfo1.computer_skills;
                        }
                      })() : Array.isArray(additionalInfo1.computer_skills) ? additionalInfo1.computer_skills.join(', ') : additionalInfo1.computer_skills}
                    </span>
                  </div>
                )}
                {additionalInfo1?.certifications && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Certifications:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.certifications}
                    </span>
                  </div>
                )}
                {additionalInfo1?.accomplishments && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Accomplishments:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.accomplishments}
                    </span>
                  </div>
                )}
                {additionalInfo1?.projects && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Projects:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.projects}
                    </span>
                  </div>
                )}
                {additionalInfo1?.research_publications && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Research publications:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.research_publications}
                    </span>
                  </div>
                )}
                {additionalInfo1?.additional_info && (
                  <div className={`flex ${isMobile ? 'flex-col mb-3 p-2.5 bg-white rounded-md border border-gray-200 items-start' : 'flex-row mb-0.5 py-0.5 bg-transparent items-start'}`}>
                    <span className={`${isMobile ? 'w-full mb-1' : isTablet ? 'min-w-fit max-w-[120px]' : 'min-w-fit max-w-[140px]'} font-semibold text-base text-gray-800 shrink-0 leading-normal tracking-tight`}>
                      Anything more about yourself:
                    </span>
                    <span className={`text-base ${isMobile ? 'ml-0' : isTablet ? 'ml-2' : 'ml-1.5'} flex-1 break-words text-gray-600 leading-normal tracking-tight`}>
                      {additionalInfo1.additional_info}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfilePage;