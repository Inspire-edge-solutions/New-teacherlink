import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useAuth } from '../../../../Context/AuthContext';
import axios from 'axios';

const EmployerProfileCompletion = () => {
  const { user } = useAuth();
  const [completionData, setCompletionData] = useState({ percentage: 0, status: 'Not Started' });
  const [isLoading, setIsLoading] = useState(true);

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
  }, [user]);

  const fetchProfileCompletion = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
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
      
      let completedFields = 0;
      let totalFields = 0;

      if (!orgData) {
        // No profile data at all
        setCompletionData({ percentage: 0, status: 'Not Started' });
        return;
      }

      const PARENT_TYPE = "Parent/ Guardian looking for Tuitions";
      const isParent = orgData.type === PARENT_TYPE;

      // Helper function to check if field has value
      const hasValue = (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'boolean') return true; // Boolean fields count if set
        return true;
      };

      // Common fields for all types
      const commonFields = [
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
        imageRes.data?.url // Profile image
      ];

      totalFields += commonFields.length;
      completedFields += commonFields.filter(hasValue).length;

      if (isParent) {
        // Parent-specific fields
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
        // Organization-specific fields
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

        // Reporting authority fields (only if not owner)
        if (orgData.is_owner === false || orgData.is_owner === 0) {
          const reportingFields = [
            orgData.reporting_authority_name,
            orgData.reporting_authority_gender,
            orgData.reporting_authority_designation,
            orgData.phone1, // Reporting authority phone1
            orgData.phone2, // Reporting authority phone2
            orgData.email   // Reporting authority email
          ];

          totalFields += reportingFields.length;
          completedFields += reportingFields.filter(hasValue).length;
        }
      }

      // Calculate percentage
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

      setCompletionData({ percentage, status });

    } catch (error) {
      console.error('Error fetching employer profile completion:', error);
      setCompletionData({ percentage: 0, status: 'Error loading profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage === 0) return '#dc3545';
    if (percentage <= 25) return '#fd7e14';
    if (percentage <= 50) return '#ffc107';
    if (percentage <= 75) return '#0d6efd';
    return '#198754';
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

  const statusColor = getStatusColor(completionData.percentage);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative h-full">
      {/* Title at top */}
      <div className="text-center mb-4">
        <h5 className="text-lg font-bold text-gray-800">Profile Completion</h5>
      </div>

      {/* Circular Progress - Centered */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-[100px] h-[100px] relative">
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="12.99%" stopColor="#F95257" />
                <stop offset="86.5%" stopColor="#A2035D" />
              </linearGradient>
            </defs>
          </svg>
          <CircularProgressbar
            value={completionData.percentage}
            text={`${completionData.percentage}%`}
            strokeWidth={18}
            styles={buildStyles({
              textSize: '20px',
              pathColor: 'url(#progressGradient)',
              textColor: '#333333',
              trailColor: '#f0f0f0',
              pathTransitionDuration: 0.5,
              strokeLinecap: 'round',
            })}
          />
        </div>
      </div>
      
      {/* Double Chevron Arrow - Bottom Right */}
      <Link 
        to="/provider/my-profile" 
        className="absolute bottom-6 right-6 text-red-500 hover:text-red-600 transition-all"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.5 7l5 5-5 5V7zm7 0l5 5-5 5V7z"/>
        </svg>
      </Link>
    </div>
  );
};

export default EmployerProfileCompletion; 