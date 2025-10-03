import React, { useState, useEffect } from 'react';
import { useAuth } from "../../../../Context/AuthContext";
import { IoChevronDownOutline } from 'react-icons/io5';

const JobSearch = () => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobSearchStatus, setJobSearchStatus] = useState({
    full_time_2_offline: "notLooking",
    part_time_weekdays_2_offline: "notLooking",
    part_time_weekends_2_offline: "notLooking",
    part_time_vacations_2_offline: "notLooking",
    tuitions_2_offline: "notLooking"
  });

  const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';

  useEffect(() => {
    if (user?.firebase_uid) {
      fetchJobPreferences();
    }
  }, [user]);

  const fetchJobPreferences = async () => {
    try {
      const response = await fetch(`${JOB_PREFERENCE_API}?firebase_uid=${user.firebase_uid}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const preferences = data[0];
        setJobSearchStatus({
          full_time_2_offline: preferences.full_time_2_offline || "notLooking",
          part_time_weekdays_2_offline: preferences.part_time_weekdays_2_offline || "notLooking",
          part_time_weekends_2_offline: preferences.part_time_weekends_2_offline || "notLooking",
          part_time_vacations_2_offline: preferences.part_time_vacations_2_offline || "notLooking",
          tuitions_2_offline: preferences.tuitions_2_offline || "notLooking"
        });
      }
    } catch (error) {
      console.error("Error fetching job preferences:", error);
    }
  };

  const handleJobSearchStatusChange = async (type, value) => {
    try {
      const newStatus = {
        ...jobSearchStatus,
        [type]: value
      };
      setJobSearchStatus(newStatus);

      // Auto-save to API
      const response = await fetch(JOB_PREFERENCE_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.firebase_uid,
          [type]: value
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update job preferences');
      }
    } catch (error) {
      console.error("Error updating job search status:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'activelySearching': return { bg: '#e8f5e9', text: '#2e7d32', border: '#81c784' };
      case 'casuallyExploring': return { bg: '#fff3e0', text: '#f57c00', border: '#ffb74d' };
      case 'notLooking': return { bg: '#f5f5f5', text: '#757575', border: '#bdbdbd' };
      default: return { bg: '#f5f5f5', text: '#757575', border: '#bdbdbd' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'activelySearching': return 'Actively Searching';
      case 'casuallyExploring': return 'Casually Exploring';
      case 'notLooking': return 'Not Looking';
      default: return 'Not Specified';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'full_time_2_offline': return 'Full Time';
      case 'part_time_weekdays_2_offline': return 'Part Time (Weekdays)';
      case 'part_time_weekends_2_offline': return 'Part Time (Weekends)';
      case 'part_time_vacations_2_offline': return 'Part Time (Vacations)';
      case 'tuitions_2_offline': return 'Tuitions';
      default: return type;
    }
  };

  const getOverallStatus = () => {
    const statusPriority = {
      'activelySearching': 2,
      'casuallyExploring': 1,
      'notLooking': 0
    };

    const statuses = Object.values(jobSearchStatus);
    return statuses.sort((a, b) => statusPriority[b] - statusPriority[a])[0] || 'notLooking';
  };

  return (
    <div className="rounded-[20px] p-6 shadow-md" style={{ backgroundColor: '#FFDEE0' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left cursor-pointer transition-all duration-300 ease-in-out flex justify-between items-center"
      >
        <div className="flex-1 flex items-center gap-3">
          <h4 className="m-0 text-gray-800 text-base font-semibold">Job Search Status</h4>
          <span 
            className="py-1 px-2.5 rounded-[15px] text-[13px] font-medium"
            style={{
              backgroundColor: getStatusColor(getOverallStatus()).bg,
              color: getStatusColor(getOverallStatus()).text,
              border: `1px solid ${getStatusColor(getOverallStatus()).border}`
            }}
          >
            {getStatusText(getOverallStatus())}
          </span>
        </div>
        
        <IoChevronDownOutline className={`text-lg text-gray-700 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pt-4 mt-4 border-t border-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-[15px]">
            {Object.entries(jobSearchStatus).map(([type, value]) => (
              <div key={type} className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-medium text-gray-800">
                  {getTypeLabel(type)}
                </label>
                <select
                  className="w-full py-1.5 px-2.5 rounded-md font-medium text-[13px] cursor-pointer transition-all duration-200 ease-in-out form-select"
                  value={value}
                  onChange={(e) => handleJobSearchStatusChange(type, e.target.value)}
                  style={{
                    border: `1px solid ${getStatusColor(value).border}`,
                    backgroundColor: getStatusColor(value).bg,
                    color: getStatusColor(value).text
                  }}
                >
                  <option value="activelySearching">Actively Searching Jobs</option>
                  <option value="casuallyExploring">Casually Exploring Jobs</option>
                  <option value="notLooking">Not looking for Jobs</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobSearch;