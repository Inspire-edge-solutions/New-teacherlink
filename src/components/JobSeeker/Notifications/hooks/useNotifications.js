import { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PRESENT_ADDRESS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress";
const LOGIN_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const PROFILE_VIEW_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/profile_views";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Get last seen timestamp for a notification type from localStorage
  const getLastSeenTimestamp = (notificationId) => {
    const key = `admin_notification_seen_${notificationId}`;
    const stored = localStorage.getItem(key);
    return stored ? new Date(stored) : null;
  };

  // Store last seen timestamp for a notification type
  const setLastSeenTimestamp = (notificationId, timestamp) => {
    const key = `admin_notification_seen_${notificationId}`;
    localStorage.setItem(key, timestamp.toISOString());
  };

  // Check if notification should be shown (only if updated_at is newer than last seen)
  const shouldShowNotification = (notificationId, updatedAt) => {
    const lastSeen = getLastSeenTimestamp(notificationId);
    if (!lastSeen) return true; // Never seen before, show it
    return new Date(updatedAt) > lastSeen; // Show only if updated_at is newer
  };

  // Check if job matches user preferences (same logic as RecommendedJobs)
  const checkJobMatch = (job, preferences, presentAddress) => {
    if (!preferences && !presentAddress) return false;

    let matchCount = 0;

    // 1. Job type match
    if (preferences) {
      const jobType = job.job_type ? job.job_type.toLowerCase() : '';
      if (preferences.full_time_online === "1" && (
        jobType === "online" || jobType === "remote" || jobType === "workfromhome" ||
        jobType === "wfh" || jobType.includes("online")
      )) {
        matchCount++;
      } else if (preferences.full_time_offline === "1" && (
        jobType === "offline" || jobType === "fulltime" || jobType === "parttime" ||
        jobType === "fullpart" || jobType === "full_time" || jobType === "part_time" ||
        jobType.includes("time") || jobType === ""
      )) {
        matchCount++;
      }
    }

    // 2. Salary range match
    if (preferences && preferences.expected_salary && job.min_salary && job.max_salary) {
      const prefSalary = preferences.expected_salary;
      const jobMinSalary = parseInt(job.min_salary);
      const jobMaxSalary = parseInt(job.max_salary);
      if (prefSalary === "20k_40k" && jobMinSalary >= 20000 && jobMaxSalary <= 40000) {
        matchCount++;
      } else if (prefSalary === "40k_60k" && jobMinSalary >= 40000 && jobMaxSalary <= 60000) {
        matchCount++;
      } else if (prefSalary === "60k_80k" && jobMinSalary >= 60000 && jobMaxSalary <= 80000) {
        matchCount++;
      } else if (prefSalary === "80k_above" && jobMinSalary >= 80000) {
        matchCount++;
      }
    }

    // 3. Teaching subjects match
    if (preferences && preferences.teaching_subjects) {
      const userSubjects = Array.isArray(preferences.teaching_subjects) 
        ? preferences.teaching_subjects 
        : [preferences.teaching_subjects];
      let hasSubjectMatch = false;
      if (job.core_subjects) {
        const jobSubjects = Array.isArray(job.core_subjects) ? job.core_subjects : [job.core_subjects];
        hasSubjectMatch = userSubjects.some(userSubject => 
          jobSubjects.some(jobSubject => 
            jobSubject.toLowerCase().includes(userSubject.toLowerCase()) ||
            userSubject.toLowerCase().includes(jobSubject.toLowerCase())
          )
        );
      }
      if (!hasSubjectMatch && job.job_title) {
        hasSubjectMatch = userSubjects.some(userSubject => 
          job.job_title.toLowerCase().includes(userSubject.toLowerCase()) ||
          userSubject.toLowerCase().includes(job.job_title.toLowerCase())
        );
      }
      if (hasSubjectMatch) matchCount++;
    }

    // 4. Preferred country match
    if (preferences && preferences.preferred_country && job.country) {
      if (preferences.preferred_country.toLowerCase() === job.country.toLowerCase()) {
        matchCount++;
      }
    }

    // 5. Preferred state match
    if (preferences && preferences.preferred_state && job.state_ut) {
      if (preferences.preferred_state.toLowerCase() === job.state_ut.toLowerCase()) {
        matchCount++;
      }
    }

    // 6. Preferred city match
    if (preferences && preferences.preferred_city && job.city) {
      if (preferences.preferred_city.toLowerCase() === job.city.toLowerCase()) {
        matchCount++;
      }
    }

    // 7. Teaching grades match
    if (preferences && preferences.teaching_grades) {
      const userGrades = Array.isArray(preferences.teaching_grades) 
        ? preferences.teaching_grades 
        : [preferences.teaching_grades];
      let hasGradeMatch = false;
      if (job.job_title) {
        hasGradeMatch = userGrades.some(userGrade => 
          job.job_title.toLowerCase().includes(userGrade.toLowerCase()) ||
          userGrade.toLowerCase().includes(job.job_title.toLowerCase())
        );
      }
      if (!hasGradeMatch && job.core_subjects) {
        const jobSubjects = Array.isArray(job.core_subjects) ? job.core_subjects : [job.core_subjects];
        hasGradeMatch = userGrades.some(userGrade => 
          jobSubjects.some(jobSubject => 
            jobSubject.toLowerCase().includes(userGrade.toLowerCase()) ||
            userGrade.toLowerCase().includes(jobSubject.toLowerCase())
          )
        );
      }
      if (hasGradeMatch) matchCount++;
    }

    // 8. Present address state match
    if (presentAddress && presentAddress.state_name && job.state_ut) {
      if (presentAddress.state_name.toLowerCase() === job.state_ut.toLowerCase()) {
        matchCount++;
      }
    }

    // 9. Present address city match
    if (presentAddress && presentAddress.city_name && job.city) {
      if (presentAddress.city_name.toLowerCase() === job.city.toLowerCase()) {
        matchCount++;
      }
    }

    // Return true if matches at least 2 criteria
    return matchCount >= 2;
  };

  // Fetch job match notifications (new jobs that match user preferences)
  const fetchJobMatchNotifications = async (userId, existingNotifications = []) => {
    try {
      const jobMatchNotifications = [];
      
      // Fetch user job preferences
      const prefRes = await axios.get(JOB_PREFERENCE_API);
      const prefData = Array.isArray(prefRes.data) 
        ? prefRes.data.find(pref => pref.firebase_uid === userId)
        : null;

      // Fetch user present address
      const addrRes = await axios.get(PRESENT_ADDRESS_API);
      const addrData = Array.isArray(addrRes.data)
        ? addrRes.data.find(addr => addr.firebase_uid === userId)
        : null;

      if (!prefData && !addrData) {
        return []; // No preferences/address, no job matches
      }

      // Fetch recent jobs (last 7 days)
      const jobsRes = await axios.get(JOBS_API);
      const allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentJobs = allJobs.filter(job => {
        // Only approved jobs
        if (job.isApproved !== 1) return false;
        
        // Jobs created OR updated in last 7 days (check both created_at and updated_at)
        const createdDate = new Date(job.created_at || job.createdAt || 0);
        const updatedDate = new Date(job.updated_at || job.updatedAt || 0);
        const mostRecentDate = updatedDate > createdDate ? updatedDate : createdDate;
        return mostRecentDate >= sevenDaysAgo;
      });

      // Check each recent job for matches
      for (const job of recentJobs) {
        if (checkJobMatch(job, prefData, addrData)) {
          const notificationId = `job-match-${job.id}-${userId}`;
          const existing = existingNotifications.find(n => n.id === notificationId);
          
          // Get organization name
          let orgName = job.institute_name || job.organization_name || "Organization";
          try {
            const orgRes = await axios.get(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
            const orgData = Array.isArray(orgRes.data) ? orgRes.data[0] : orgRes.data;
            if (orgData) {
              orgName = orgData.name || orgData.organization_name || orgName;
            }
          } catch {
            // Use default orgName
          }

          if (!existing) {
            // New notification
            jobMatchNotifications.push({
              id: notificationId,
              type: 'job',
              title: 'New Job Match Found',
              message: `A new job matches your profile for ${job.job_title}. To unlock details click here.`,
              timestamp: new Date(job.created_at || job.createdAt || Date.now()),
              read: false,
              link: `/seeker/all-jobs?highlight=${job.id}`,
              jobId: job.id
            });
          } else {
            // Keep existing notification
            jobMatchNotifications.push(existing);
          }
        }
      }

      return jobMatchNotifications;
    } catch (error) {
      console.error('Error fetching job match notifications:', error);
      return [];
    }
  };

  // Fetch closed job notifications (jobs user applied to that were closed)
  const fetchClosedJobNotifications = async (userId, existingNotifications = []) => {
    try {
      const closedJobNotifications = [];
      
      // Fetch all jobs user applied to
      const applyRes = await axios.get(`${APPLY_API}?user_id=${userId}`);
      const appliedJobs = Array.isArray(applyRes.data) 
        ? applyRes.data.filter(app => app.is_applied === 1)
        : [];

      if (appliedJobs.length === 0) {
        return []; // No applied jobs, no closed job notifications
      }

      // Get job IDs user applied to
      const appliedJobIds = appliedJobs.map(app => Number(app.job_id));

      // Fetch all jobs to check which ones are closed
      const jobsRes = await axios.get(JOBS_API);
      const allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];

      // Filter for closed jobs that user applied to
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const closedJobs = allJobs.filter(job => {
        // Must be a job user applied to
        if (!appliedJobIds.includes(Number(job.id))) return false;
        
        // Must be closed
        if (job.is_closed !== 1 && job.is_closed !== "1") return false;
        
        // Must be closed recently (updated_at in last 7 days)
        const updatedDate = new Date(job.updated_at || job.updatedAt || 0);
        return updatedDate >= sevenDaysAgo;
      });

      // Create notifications for closed jobs
      for (const job of closedJobs) {
        const notificationId = `job-closed-${job.id}-${userId}`;
        const existing = existingNotifications.find(n => n.id === notificationId);
        
        // Get organization name
        let orgName = job.institute_name || job.organization_name || "Organization";
        try {
          const orgRes = await axios.get(`${ORG_API}?firebase_uid=${job.firebase_uid}`);
          const orgData = Array.isArray(orgRes.data) ? orgRes.data[0] : orgRes.data;
          if (orgData) {
            orgName = orgData.name || orgData.organization_name || orgName;
          }
        } catch {
          // Use default orgName
        }

        // Format close reason
        let reasonText = "";
        if (job.reason) {
          const reasonMap = {
            'position_filled_teacherlink': 'Position was filled via TeacherLink',
            'position_filled_other': 'Position was filled through other means',
            'hiring_on_hold': 'Hiring is on hold / deferred',
            'other': job.reason
          };
          reasonText = reasonMap[job.reason] || job.reason;
        }

        if (!existing) {
          // New notification
          closedJobNotifications.push({
            id: notificationId,
            type: 'job',
            title: 'Job Closed',
            message: `The job you applied for "${job.job_title}" has been closed.${reasonText ? ` Reason: ${reasonText}` : ''}`,
            timestamp: new Date(job.updated_at || job.updatedAt || Date.now()),
            read: false,
            link: `/seeker/all-jobs?highlight=${job.id}`,
            jobId: job.id
          });
        } else {
          // Keep existing notification
          closedJobNotifications.push(existing);
        }
      }

      return closedJobNotifications;
    } catch (error) {
      console.error('Error fetching closed job notifications:', error);
      return [];
    }
  };

  // Fetch profile view notifications (when job provider views job seeker profile)
  const fetchProfileViewNotifications = async (userId, existingNotifications = []) => {
    try {
      const profileViewNotifications = [];
      
      // Fetch profile views for this user
      const viewRes = await axios.get(`${PROFILE_VIEW_API}?viewed_user_id=${userId}`);
      const profileViews = Array.isArray(viewRes.data) ? viewRes.data : [];

      if (profileViews.length === 0) {
        return []; // No profile views
      }

      // Filter for recent views (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentViews = profileViews.filter(view => {
        const viewedDate = new Date(view.viewed_at || view.created_at || 0);
        return viewedDate >= sevenDaysAgo;
      });

      // Create notifications for profile views
      for (const view of recentViews) {
        const notificationId = `profile-view-${view.viewer_user_id}-${view.viewed_user_id}-${view.id || Date.now()}`;
        const existing = existingNotifications.find(n => {
          // Check if this is the same base notification (same viewer and viewed user)
          const baseId = n.id?.split('-').slice(0, 3).join('-');
          return baseId === `profile-view-${view.viewer_user_id}-${view.viewed_user_id}`;
        });
        
        // Get institution name from view data
        const institutionName = view.institution_name || 'An Institution';

        // Check if this is a new view (not seen before)
        const shouldShow = existing 
          ? false // Don't show if already exists
          : true; // Show new views

        if (shouldShow) {
          profileViewNotifications.push({
            id: notificationId,
            type: 'profile_view',
            title: 'Profile Viewed',
            message: `${institutionName} viewed your profile`,
            timestamp: new Date(view.viewed_at || view.created_at || Date.now()),
            read: existing ? existing.read : false,
            link: null, // No link for profile views
            institutionName: institutionName
          });
        } else if (existing) {
          // Preserve existing notification with updated timestamp if view is newer
          const viewTimestamp = new Date(view.viewed_at || view.created_at || Date.now());
          const existingTimestamp = new Date(existing.timestamp);
          
          if (viewTimestamp > existingTimestamp) {
            // Update with newer view but keep read status
            profileViewNotifications.push({
              ...existing,
              timestamp: viewTimestamp,
              message: `${institutionName} viewed your profile`
            });
          } else {
            // Keep existing notification as is
            profileViewNotifications.push(existing);
          }
        }
      }

      return profileViewNotifications;
    } catch (error) {
      console.error('Error fetching profile view notifications:', error);
      return [];
    }
  };

  // Fetch admin notifications from profile_approved API
  const fetchAdminNotifications = async (userId, existingNotifications = []) => {
    try {
      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      };

      const res = await axios.get(
        `${APPROVAL_API}?firebase_uid=${userId}`,
        authHeaders
      );

      const newAdminNotifications = [];
      const updatedNotifications = [];

      let userProfile = null;
      if (Array.isArray(res.data) && res.data.length > 0) {
        userProfile = res.data.find(obj => obj.firebase_uid === userId);
      } else if (typeof res.data === "object" && res.data !== null && Object.keys(res.data).length > 0) {
        userProfile = res.data;
      }

      if (userProfile) {
        const approved = parseInt(userProfile?.isApproved ?? userProfile?.isapproved ?? 0);
        const rejected = parseInt(userProfile?.isRejected ?? userProfile?.isrejected ?? 0);
        const responseMsg = userProfile?.response;
        const updatedAt = userProfile?.updated_at ? new Date(userProfile.updated_at) : new Date();
        const updatedAtString = userProfile?.updated_at || updatedAt.toISOString();

        // Helper function to check if notification exists
        const getExistingNotification = (notificationId) => {
          return existingNotifications.find(n => n.id === notificationId);
        };

        // Helper function to check if notification was updated (new updated_at)
        const isNotificationUpdated = (existing, newUpdatedAt) => {
          if (!existing || !existing._updatedAt) return true;
          return new Date(newUpdatedAt) > new Date(existing._updatedAt);
        };

        // Priority 1: Admin response message (most important - always show if exists)
        if (responseMsg && responseMsg.trim() !== "") {
          const notificationId = `admin-msg-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);
          
          // If notification was updated, keep old one as is and create new one as unread
          if (existing && isUpdated) {
            // Keep old notification with its current read status (don't auto-mark as read)
            updatedNotifications.push(existing);
            // Create new notification as unread
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`, // Unique ID for new notification
              type: 'admin',
              title: 'Message from Admin',
              message: responseMsg,
              timestamp: updatedAt,
              read: false, // New notification is unread
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            // No update, keep existing notification as is
            updatedNotifications.push(existing);
          } else {
            // New notification
            newAdminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Message from Admin',
              message: responseMsg,
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }

        // Priority 2: Profile Approved (show if approved=1 and no response message)
        if (approved === 1 && (!responseMsg || responseMsg.trim() === "")) {
          const notificationId = `admin-approved-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);
          
          if (existing && isUpdated) {
            // Keep old notification with its current read status (don't auto-mark as read)
            updatedNotifications.push(existing);
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`,
              type: 'admin',
              title: 'Profile Approved',
              message: 'Your profile has been approved by admin. You can now apply for jobs!',
              timestamp: updatedAt,
              read: false,
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            updatedNotifications.push(existing);
          } else {
            newAdminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Profile Approved',
              message: 'Your profile has been approved by admin. You can now apply for jobs!',
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }

        // Priority 3: Profile rejection (only if rejected=1 and no response message)
        if (rejected === 1 && (!responseMsg || responseMsg.trim() === "")) {
          const notificationId = `admin-rejected-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);
          
          if (existing && isUpdated) {
            // Keep old notification with its current read status (don't auto-mark as read)
            updatedNotifications.push(existing);
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`,
              type: 'admin',
              title: 'Profile Rejected',
              message: 'Your profile has been rejected by admin. Please review and update your profile.',
              timestamp: updatedAt,
              read: false,
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            updatedNotifications.push(existing);
          } else {
            newAdminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Profile Rejected',
              message: 'Your profile has been rejected by admin. Please review and update your profile.',
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }

        // Priority 4: Profile under review (only if pending approval and not rejected, and no response)
        if (approved === 0 && rejected === 0 && (!responseMsg || responseMsg.trim() === "")) {
          const notificationId = `admin-review-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);
          
          if (existing && isUpdated) {
            // Keep old notification with its current read status (don't auto-mark as read)
            updatedNotifications.push(existing);
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`,
              type: 'admin',
              title: 'Profile Under Review',
              message: 'Your profile is currently under admin review. We will notify you once it\'s approved.',
              timestamp: updatedAt,
              read: false,
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            updatedNotifications.push(existing);
          } else {
            newAdminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Profile Under Review',
              message: 'Your profile is currently under admin review. We will notify you once it\'s approved.',
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: '/seeker/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }
      }

      // Get base notification IDs (without timestamp suffix) for current notifications
      const getBaseNotificationId = (id) => {
        // If ID has timestamp suffix (format: baseId-timestamp), return baseId
        const parts = id.split('-');
        if (parts.length > 2 && !isNaN(parts[parts.length - 1])) {
          return parts.slice(0, -1).join('-');
        }
        return id;
      };

      const allCurrentBaseIds = new Set([
        ...updatedNotifications.map(n => getBaseNotificationId(n.id)),
        ...newAdminNotifications.map(n => getBaseNotificationId(n.id))
      ]);
      
      // Keep all other existing admin notifications as they are (preserve their read status)
      // These are notifications that exist but are not in the current API state
      const otherAdminNotifications = existingNotifications
        .filter(n => {
          if (n.type !== 'admin') return false;
          const baseId = getBaseNotificationId(n.id);
          return !allCurrentBaseIds.has(baseId);
        });
      // Don't auto-mark as read - preserve their current read status
      
      const otherNonAdminNotifications = existingNotifications.filter(n => n.type !== 'admin');

      return [...updatedNotifications, ...newAdminNotifications, ...otherAdminNotifications, ...otherNonAdminNotifications];
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      return existingNotifications; // Return existing on error to preserve them
    }
  };

  // Fetch notifications - Replace with actual API call
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userId = user.firebase_uid || user.uid;
        
        // Fetch admin notifications, passing existing notifications to preserve read status
        const adminNotifications = await fetchAdminNotifications(userId, notifications);
        
        // Fetch job match notifications (new jobs that match user preferences)
        const jobMatchNotifications = await fetchJobMatchNotifications(userId, notifications);
        
        // Fetch closed job notifications (jobs user applied to that were closed)
        const closedJobNotifications = await fetchClosedJobNotifications(userId, notifications);
        
        // Fetch profile view notifications (when job provider views profile)
        const profileViewNotifications = await fetchProfileViewNotifications(userId, notifications);
        
        // Combine all notifications
        const allNotifications = [...adminNotifications, ...jobMatchNotifications, ...closedJobNotifications, ...profileViewNotifications];
        
        setNotifications(allNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        // Try to at least get admin notifications on error
        try {
          const userId = user.firebase_uid || user.uid;
          const adminNotifications = await fetchAdminNotifications(userId, notifications);
          const jobMatchNotifications = await fetchJobMatchNotifications(userId, notifications);
          const closedJobNotifications = await fetchClosedJobNotifications(userId, notifications);
          const profileViewNotifications = await fetchProfileViewNotifications(userId, notifications);
          setNotifications([...adminNotifications, ...jobMatchNotifications, ...closedJobNotifications, ...profileViewNotifications]);
        } catch {
          setNotifications([]); // No fallback - only show real data
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filter notifications
  useEffect(() => {
    let filtered = [...notifications];

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'read':
        filtered = filtered.filter(n => n.read);
        break;
      case 'job':
        filtered = filtered.filter(n => n.type === 'job' || n.type === 'application');
        break;
      case 'message':
        filtered = filtered.filter(n => n.type === 'message');
        break;
      case 'system':
        filtered = filtered.filter(n => n.type === 'system');
        break;
      case 'Admin':
        filtered = filtered.filter(n => n.type === 'admin');
        break;
      default:
        // 'all' - no filter
        break;
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  const markAsRead = async (id) => {
    try {
      // TODO: Replace with actual API call
      // await axios.put(`NOTIFICATION_API/${id}`, { read: true });
      
      setNotifications(prev => {
        const updated = prev.map(n => {
          if (n.id === id) {
            // For admin notifications, store the timestamp to track that it was seen
            // But keep the notification visible (don't remove it)
            if (n.type === 'admin' && n._updatedAt) {
              setLastSeenTimestamp(id, new Date(n._updatedAt));
            }
            // Just mark as read, don't remove the notification
            return { ...n, read: true };
          }
          return n;
        });
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user) return;
      
      // TODO: Replace with actual API call
      // await axios.put(`NOTIFICATION_API/mark-all-read`, { user_id: user.firebase_uid || user.uid });
      
      setNotifications(prev => 
        prev.map(n => {
          // For admin notifications, store the timestamp so they won't reappear unless updated
          if (n.type === 'admin' && n._updatedAt) {
            setLastSeenTimestamp(n.id, new Date(n._updatedAt));
          }
          return { ...n, read: true };
        })
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (id) => {
    try {
      // TODO: Replace with actual API call
      // await axios.delete(`NOTIFICATION_API/${id}`);
      
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        // For admin notifications, store the timestamp so it won't reappear unless updated
        if (notification && notification.type === 'admin' && notification._updatedAt) {
          setLastSeenTimestamp(id, new Date(notification._updatedAt));
        }
        return prev.filter(n => n.id !== id);
      });
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    filteredNotifications,
    loading,
    filter,
    setFilter,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};