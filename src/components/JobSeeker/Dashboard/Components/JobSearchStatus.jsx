import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../../../Context/AuthContext";
import { IoChevronDownOutline } from 'react-icons/io5';
import axios from 'axios';

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
  
  // Track previous values to detect changes
  const previousStatusRef = useRef({
    full_time_2_offline: null,
    full_time_2_online: null
  });

  const JOB_PREFERENCE_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference';
  const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
  const PROFILE_APPROVED_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved';
  const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';

  useEffect(() => {
    if (user?.firebase_uid) {
      fetchJobPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchJobPreferences = async () => {
    try {
      const response = await fetch(`${JOB_PREFERENCE_API}?firebase_uid=${user.firebase_uid}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const preferences = data[0];
        const newStatus = {
          full_time_2_offline: preferences.full_time_2_offline || "notLooking",
          part_time_weekdays_2_offline: preferences.part_time_weekdays_2_offline || "notLooking",
          part_time_weekends_2_offline: preferences.part_time_weekends_2_offline || "notLooking",
          part_time_vacations_2_offline: preferences.part_time_vacations_2_offline || "notLooking",
          tuitions_2_offline: preferences.tuitions_2_offline || "notLooking"
        };
        
        // Store initial values in ref (track both offline and online)
        previousStatusRef.current = {
          full_time_2_offline: newStatus.full_time_2_offline,
          full_time_2_online: preferences.full_time_2_online || preferences.full_time_2_offline || "notLooking"
        };
        
        setJobSearchStatus(newStatus);
      }
    } catch (error) {
      console.error("Error fetching job preferences:", error);
    }
  };
  
  // Check for changes in full_time_2_offline and full_time_2_online periodically
  useEffect(() => {
    if (!user?.firebase_uid) return;
    
    const checkForChanges = async () => {
      try {
        const response = await fetch(`${JOB_PREFERENCE_API}?firebase_uid=${user.firebase_uid}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const preferences = data[0];
          const currentOffline = preferences.full_time_2_offline || "notLooking";
          const currentOnline = preferences.full_time_2_online || preferences.full_time_2_offline || "notLooking";
          
          // Check if offline status changed
          if (previousStatusRef.current.full_time_2_offline !== null && 
              previousStatusRef.current.full_time_2_offline !== currentOffline) {
            // Status changed - notify providers
            let candidateName = 'A candidate';
            try {
              const loginRes = await axios.get(`${LOGIN_API}?firebase_uid=${user.firebase_uid}`);
              const loginData = Array.isArray(loginRes.data) ? loginRes.data : [];
              const candidate = loginData.find(u => u.firebase_uid === user.firebase_uid);
              candidateName = candidate?.name || 'A candidate';
            } catch (e) {
              console.error('Error fetching candidate name:', e);
            }
            await notifyFavoritedProviders(candidateName, currentOffline, 'full_time_2_offline');
            previousStatusRef.current.full_time_2_offline = currentOffline;
          }
          
          // Check if online status changed
          if (previousStatusRef.current.full_time_2_online !== null && 
              previousStatusRef.current.full_time_2_online !== currentOnline) {
            // Status changed - notify providers
            let candidateName = 'A candidate';
            try {
              const loginRes = await axios.get(`${LOGIN_API}?firebase_uid=${user.firebase_uid}`);
              const loginData = Array.isArray(loginRes.data) ? loginRes.data : [];
              const candidate = loginData.find(u => u.firebase_uid === user.firebase_uid);
              candidateName = candidate?.name || 'A candidate';
            } catch (e) {
              console.error('Error fetching candidate name:', e);
            }
            await notifyFavoritedProviders(candidateName, currentOnline, 'full_time_2_online');
            previousStatusRef.current.full_time_2_online = currentOnline;
          }
        }
      } catch (error) {
        console.error('Error checking for status changes:', error);
      }
    };
    
    // Check every 30 seconds for changes (in case updated from profile page)
    const interval = setInterval(checkForChanges, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.firebase_uid]);
  
  // Notify job providers who favorited this candidate
  const notifyFavoritedProviders = async (candidateName, newStatus, fieldName) => {
    try {
      // Fetch all job providers who favorited this candidate
      const favResponse = await axios.get(FAV_API);
      const favList = Array.isArray(favResponse.data) ? favResponse.data : [];
      
      // Filter: find providers who favorited this job seeker
      const favoritedProviders = favList.filter(item => 
        String(item.firebase_uid) === String(user.firebase_uid) && 
        (item.favroute_candidate === 1 || item.favroute_candidate === true)
      );
      
      if (favoritedProviders.length === 0) {
        return; // No providers favorited this candidate
      }
      
      // Get status text
      const getStatusText = (status) => {
        switch (status) {
          case 'activelySearching': return 'Actively Searching';
          case 'casuallyExploring': return 'Casually Exploring';
          case 'notLooking': return 'Not Looking';
          default: return 'Not Specified';
        }
      };
      
      const statusText = getStatusText(newStatus);
      
      // Fetch login data to get candidate name if not provided
      let candidateDisplayName = candidateName;
      if (!candidateDisplayName) {
        try {
          const loginRes = await axios.get(`${LOGIN_API}?firebase_uid=${user.firebase_uid}`);
          const loginData = Array.isArray(loginRes.data) ? loginRes.data : [];
          const candidate = loginData.find(u => u.firebase_uid === user.firebase_uid);
          candidateDisplayName = candidate?.name || 'A candidate';
        } catch {
          candidateDisplayName = 'A candidate';
        }
      }
      
      const finalMessage = `${candidateDisplayName} changed their job search status to '${statusText}'`;
      
      // Create notification for each provider who favorited this candidate
      for (const favItem of favoritedProviders) {
        const providerUid = favItem.added_by;
        if (!providerUid) continue;
        
        try {
          // Check if notification already exists for this provider
          const existingRes = await axios.get(`${PROFILE_APPROVED_API}?firebase_uid=${providerUid}`);
          const existingData = Array.isArray(existingRes.data) ? existingRes.data : [];
          const existingRecord = existingData.find(r => r.firebase_uid === providerUid);
          
          // Create or update notification in profile_approved API
          // Use response field to store candidate status change notification
          // Format: JSON string with type, candidate_uid, message, timestamp
          const notificationData = {
            type: 'candidate_status',
            candidate_uid: user.firebase_uid,
            candidate_name: candidateDisplayName,
            message: finalMessage,
            field_changed: fieldName,
            new_status: newStatus,
            timestamp: new Date().toISOString()
          };
          
          // Store in response field as JSON string
          const notificationJson = JSON.stringify(notificationData);
          
          if (existingRecord) {
            // Check if existing response is an admin message (not JSON or different type)
            let shouldUpdateResponse = true;
            if (existingRecord.response) {
              try {
                const existingResponse = JSON.parse(existingRecord.response);
                // If it's already a candidate_status notification for the same candidate and field, check timestamp
                if (existingResponse.type === 'candidate_status' && 
                    existingResponse.candidate_uid === user.firebase_uid &&
                    existingResponse.field_changed === fieldName) {
                  // Same candidate, same field - check if this is a new change (different status)
                  if (existingResponse.new_status === newStatus) {
                    // Same status, don't create duplicate
                    shouldUpdateResponse = false;
                  } else {
                    // Different status, update notification
                    shouldUpdateResponse = true;
                  }
                } else if (existingResponse.type && existingResponse.type !== 'candidate_status') {
                  // Different notification type (admin message), don't overwrite
                  shouldUpdateResponse = false;
                }
              } catch {
                // Existing response is not JSON (likely admin message), don't overwrite
                shouldUpdateResponse = false;
              }
            }
            
            if (shouldUpdateResponse) {
              // Update record
              await axios.put(PROFILE_APPROVED_API, {
                firebase_uid: providerUid,
                response: notificationJson,
                updated_at: new Date().toISOString()
              });
              console.log(`✅ Created candidate status notification for provider ${providerUid}`);
            }
          } else {
            // Create new record
            await axios.post(PROFILE_APPROVED_API, {
              firebase_uid: providerUid,
              isApproved: 0,
              isRejected: 0,
              response: notificationJson,
              updated_at: new Date().toISOString()
            });
            console.log(`✅ Created candidate status notification for provider ${providerUid}`);
          }
        } catch (error) {
          console.error(`Error creating notification for provider ${providerUid}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying favorited providers:', error);
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
      
      // Check if full_time_2_offline or full_time_2_online changed
      if (type === 'full_time_2_offline' || type === 'full_time_2_online') {
        const previousValue = previousStatusRef.current[type];
        
        // Only notify if value actually changed
        if (previousValue !== value && previousValue !== null) {
          // Get candidate name
          let candidateName = 'A candidate';
          try {
            const loginRes = await axios.get(`${LOGIN_API}?firebase_uid=${user.firebase_uid}`);
            const loginData = Array.isArray(loginRes.data) ? loginRes.data : [];
            const candidate = loginData.find(u => u.firebase_uid === user.firebase_uid);
            candidateName = candidate?.name || 'A candidate';
          } catch (e) {
            console.error('Error fetching candidate name:', e);
          }
          
          // Notify favorited providers
          await notifyFavoritedProviders(candidateName, value, type);
        }
        
        // Update previous value
        previousStatusRef.current[type] = value;
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
    <div className="p-4 sm:p-6 shadow-md" style={{ backgroundColor: '#FFDEE0' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left cursor-pointer transition-all duration-300 ease-in-out flex justify-between items-center"
      >
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h4 className="m-0 text-gray-800 text-sm sm:text-base font-semibold">Job Search Status</h4>
          <span 
            className="py-1 px-2 sm:px-2.5 rounded-[15px] text-xs sm:text-[13px] font-medium w-fit"
            style={{
              backgroundColor: getStatusColor(getOverallStatus()).bg,
              color: getStatusColor(getOverallStatus()).text,
              border: `1px solid ${getStatusColor(getOverallStatus()).border}`
            }}
          >
            {getStatusText(getOverallStatus())}
          </span>
        </div>
        
        <IoChevronDownOutline className={`text-base sm:text-lg text-gray-700 transition-transform duration-300 ease-in-out flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-300">
          <div className="grid grid-cols-1 gap-3 sm:gap-[15px]">
            {Object.entries(jobSearchStatus).map(([type, value]) => (
              <div key={type} className="flex flex-col gap-1.5">
                <label className="block text-xs sm:text-[13px] font-medium text-gray-800">
                  {getTypeLabel(type)}
                </label>
                <select
                  className="w-full py-1.5 px-2 sm:px-2.5 rounded-md font-medium text-xs sm:text-[13px] cursor-pointer transition-all duration-200 ease-in-out form-select"
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