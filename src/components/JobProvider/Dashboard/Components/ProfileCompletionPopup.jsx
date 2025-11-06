import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
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
    if (!user?.uid) return;

    setLoading(true);
    try {
      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      };

      // Fetch organization data and profile image
      const [orgRes, imageRes] = await Promise.all([
        axios.get(`https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation`, { 
          params: { firebase_uid: user.uid }, 
          ...authHeaders 
        }).catch(() => ({ data: null })),
        axios.get(`https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image`, { 
          params: { firebase_uid: user.uid, action: "view" } 
        }).catch(() => ({ data: null }))
      ]);

      const orgData = Array.isArray(orgRes.data) ? orgRes.data[0] : orgRes.data;
      
      if (!orgData) {
        setCompletionData({ 
          percentage: 0, 
          status: 'Not Started',
          missingSections: ['Organization Information', 'Contact Details', 'Address', 'Social Media'],
          completedSections: []
        });
        setLoading(false);
        return;
      }

      const PARENT_TYPE = "Parent/ Guardian looking for Tuitions";
      const isParent = orgData.type === PARENT_TYPE;

      // Helper function to check if field has value
      const hasValue = (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'boolean') return true;
        return true;
      };

      const missingSections = [];
      const completedSections = [];

      // Check common sections
      const commonFields = {
        'Organization Type': orgData.type,
        'Contact Person Name': orgData.contact_person_name,
        'Contact Person Gender': orgData.contact_person_gender,
        'Contact Person Email': orgData.contact_person_email,
        'Contact Person Phone': orgData.contact_person_phone1 || orgData.contact_person_phone2,
        'Contact Person Designation': orgData.contact_person_designation,
        'Profile Image': imageRes.data?.url
      };

      const socialFields = {
        'Facebook': orgData.facebook,
        'Twitter': orgData.twitter,
        'LinkedIn': orgData.linkedin,
        'Instagram': orgData.instagram
      };

      // Check basic information
      const hasBasicInfo = hasValue(orgData.type) && 
                          hasValue(orgData.contact_person_name) && 
                          hasValue(orgData.contact_person_email) && 
                          hasValue(orgData.contact_person_phone1 || orgData.contact_person_phone2);
      
      if (hasBasicInfo) {
        completedSections.push({ name: 'Basic Information', percentage: 100 });
      } else {
        missingSections.push({ name: 'Basic Information', missingFields: [] });
      }

      // Check address
      let hasAddress = false;
      if (isParent) {
        hasAddress = hasValue(orgData.parent_address) && 
                    hasValue(orgData.parent_city) && 
                    hasValue(orgData.parent_state) && 
                    hasValue(orgData.parent_country);
      } else {
        hasAddress = hasValue(orgData.address) && 
                    hasValue(orgData.city) && 
                    hasValue(orgData.state) && 
                    hasValue(orgData.country);
      }

      if (hasAddress) {
        completedSections.push({ name: 'Address', percentage: 100 });
      } else {
        missingSections.push({ name: 'Address', missingFields: [] });
      }

      // Check organization details (only for non-parents)
      if (!isParent) {
        const hasOrgDetails = hasValue(orgData.name) && 
                             hasValue(orgData.website_url || orgData.video_url);
        
        if (hasOrgDetails) {
          completedSections.push({ name: 'Organization Details', percentage: 100 });
        } else {
          missingSections.push({ name: 'Organization Details', missingFields: [] });
        }

        // Check legal information
        const hasLegalInfo = hasValue(orgData.pan_number) || hasValue(orgData.gstin);
        
        if (hasLegalInfo) {
          completedSections.push({ name: 'Legal Information', percentage: 100 });
        } else {
          missingSections.push({ name: 'Legal Information', missingFields: [] });
        }
      }

      // Check social media
      const hasSocialMedia = hasValue(orgData.facebook) || 
                            hasValue(orgData.twitter) || 
                            hasValue(orgData.linkedin) || 
                            hasValue(orgData.instagram);
      
      if (hasSocialMedia) {
        completedSections.push({ name: 'Social Media', percentage: 100 });
      } else {
        missingSections.push({ name: 'Social Media', missingFields: [] });
      }

      // Calculate percentage using the same logic as ProfileCompletion component
      let completedFields = 0;
      let totalFields = 0;

      // Common fields
      const commonFieldsList = [
        orgData.type,
        orgData.contact_person_name,
        orgData.contact_person_gender,
        orgData.contact_person_email,
        orgData.contact_person_phone1,
        orgData.contact_person_phone2,
        orgData.contact_person_designation,
        orgData.facebook,
        orgData.twitter,
        orgData.linkedin,
        orgData.instagram,
        imageRes.data?.url
      ];

      totalFields += commonFieldsList.length;
      completedFields += commonFieldsList.filter(hasValue).length;

      if (isParent) {
        const parentFields = [
          orgData.parent_address,
          orgData.parent_country,
          orgData.parent_state,
          orgData.parent_city,
          orgData.parent_pincode
        ];
        
        totalFields += parentFields.length;
        completedFields += parentFields.filter(hasValue).length;
      } else {
        const orgFields = [
          orgData.name,
          orgData.website_url,
          orgData.video_url,
          orgData.pan_number,
          orgData.pan_name,
          orgData.gstin,
          orgData.address,
          orgData.country,
          orgData.state,
          orgData.city,
          orgData.pincode,
          orgData.institution_photos,
          orgData.is_owner
        ];

        totalFields += orgFields.length;
        completedFields += orgFields.filter(hasValue).length;

        if (orgData.is_owner === false || orgData.is_owner === 0) {
          const reportingFields = [
            orgData.reporting_authority_name,
            orgData.reporting_authority_gender,
            orgData.reporting_authority_designation,
            orgData.phone1,
            orgData.phone2,
            orgData.email
          ];

          totalFields += reportingFields.length;
          completedFields += reportingFields.filter(hasValue).length;
        }
      }

      const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

      // Determine status
      let status = 'Not Started';
      if (percentage === 0) {
        status = 'Not Started';
      } else if (percentage <= 25) {
        status = 'Getting Started';
      } else if (percentage <= 50) {
        status = 'In Progress';
      } else if (percentage <= 75) {
        status = 'Good Progress';
      } else if (percentage < 100) {
        status = 'Almost Done';
      } else {
        status = 'Complete';
      }

      const completionDataToSet = {
        percentage,
        status,
        missingSections,
        completedSections,
        isParent
      };

      setCompletionData(completionDataToSet);

      // Show popup if profile is incomplete
      if (percentage < 100) {
        const lastDismissed = localStorage.getItem(`profilePopupDismissed_${user.uid}`);
        const shouldShow = !lastDismissed || (Date.now() - parseInt(lastDismissed)) > (24 * 60 * 60 * 1000); // 24 hours
        
        if (shouldShow) {
          setShowPopup(true);
        }
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
    localStorage.setItem(`profilePopupDismissed_${user.uid}`, Date.now().toString());
  };

  const handleCompleteProfile = () => {
    setShowPopup(false);
    window.location.href = '/provider/my-profile';
  };

  const handleRefresh = () => {
    setLoading(true);
    setShowPopup(false);
    setDismissed(false);
    localStorage.removeItem(`profilePopupDismissed_${user.uid}`);
    checkProfileCompletion();
  };

  if (loading || !completionData || !showPopup || dismissed) {
    return null;
  }

  // Helper function to get status badge classes
  const getStatusBadgeClasses = (statusText) => {
    const statusLower = statusText.toLowerCase().replace(/\s+/g, '-');
    const statusClasses = {
      'not-started': 'bg-red-50 text-red-600 border-red-200',
      'getting-started': 'bg-orange-50 text-orange-600 border-orange-200',
      'in-progress': 'bg-yellow-50 text-yellow-600 border-yellow-200',
      'good-progress': 'bg-blue-50 text-blue-600 border-blue-200',
      'almost-done': 'bg-green-50 text-green-600 border-green-200',
      'complete': 'bg-green-50 text-green-600 border-green-200',
    };
    return statusClasses[statusLower] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  // Get next steps
  const getNextSteps = (missingSections) => {
    if (missingSections.length === 0) {
      return ['Your profile is complete! 🎉'];
    }
    const prioritySections = ['Basic Information', 'Address', 'Organization Details'];
    const steps = [];
    
    prioritySections.forEach(priority => {
      const section = missingSections.find(s => s.name === priority);
      if (section) {
        steps.push(`Complete ${section.name}`);
      }
    });

    missingSections.forEach(section => {
      if (!prioritySections.includes(section.name)) {
        steps.push(`Complete ${section.name}`);
      }
    });

    return steps.slice(0, 3);
  };

  const nextSteps = getNextSteps(completionData.missingSections);

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
                <div className="flex justify-center">
                  <Link 
                    to="/provider/my-profile" 
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-r from-[#F34B58] to-[#A1025D] flex flex-col items-center justify-center text-white font-bold shadow-lg transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-xl active:scale-105 no-underline"
                    onClick={handleDismiss}
                  >
                    <div className="text-3xl sm:text-4xl font-bold leading-none">{completionData.percentage}%</div>
                    <div className="text-sm sm:text-base font-semibold mt-2 opacity-90">Profile Completion</div>
                    <div className="text-xs sm:text-sm opacity-80 mt-1 text-center px-2">
                      {completionData.completedSections.length} of {completionData.completedSections.length + completionData.missingSections.length} sections
                    </div>
                  </Link>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap justify-center gap-2 mb-2">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border uppercase tracking-wide whitespace-nowrap ${getStatusBadgeClasses(completionData.status)}`}>
                      {completionData.status}
                    </span>
                  </div>
                  <p className="m-0 text-gray-500 text-sm sm:text-base leading-relaxed text-center">
                    {completionData.percentage === 0 
                      ? "Let's get started with your organization profile! Fill in the required information to complete your profile." 
                      : completionData.percentage < 50 
                      ? "You're making good progress! Keep going to complete your organization profile." 
                      : completionData.percentage < 100 
                      ? "Almost there! Just a few more details needed to complete your profile." 
                      : "Your profile is complete!"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              {completionData.missingSections.length > 0 ? (
                <div>
                  <h4 className="m-0 mb-4 text-base sm:text-lg font-semibold text-gray-800">Missing Information:</h4>
                  <div className="flex flex-col gap-2">
                    {completionData.missingSections.map((section, index) => (
                      <div key={index} className="flex items-center gap-2.5 p-3 bg-orange-50 text-orange-800 border-l-4 border-orange-400 rounded-lg">
                        <FaExclamationTriangle className="text-orange-500 text-sm flex-shrink-0" />
                        <span className="text-sm sm:text-base">{section.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : completionData.completedSections.length > 0 ? (
                <div>
                  <h4 className="m-0 mb-4 text-base sm:text-lg font-semibold text-gray-800">Great job! All sections are complete:</h4>
                  <div className="flex flex-col gap-2">
                    {completionData.completedSections.map((section, index) => (
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
              className="flex-1 px-5 py-3 bg-gradient-brand text-white rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-all duration-200 shadow-lg text-center hover:bg-gradient-primary-hover hover:shadow-xl hover:-translate-y-0.5"
              onClick={handleCompleteProfile}
            >
              Complete Profile Now
            </button>
          </div>
          
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

