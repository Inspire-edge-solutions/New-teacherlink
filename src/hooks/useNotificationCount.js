import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const PROFILE_VIEW_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/profile_views";
const CANDIDATES_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PRESENT_ADDRESS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress";

// Mock notifications count - Replace with actual API call
const getMockUnreadCount = () => {
  // This is a placeholder - in real implementation, fetch from API
  return 0;
};

// Get last seen timestamp for a notification type from localStorage
const getLastSeenTimestamp = (notificationId) => {
  const key = `admin_notification_seen_${notificationId}`;
  const stored = localStorage.getItem(key);
  return stored ? new Date(stored) : null;
};

// Check if notification should be shown (only if updated_at is newer than last seen)
const shouldShowNotification = (notificationId, updatedAt) => {
  const lastSeen = getLastSeenTimestamp(notificationId);
  if (!lastSeen) return true; // Never seen before, show it
  return new Date(updatedAt) > lastSeen; // Show only if updated_at is newer
};

// Fetch admin notifications count from profile_approved API
const fetchAdminNotificationsCount = async (userId) => {
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

    let userProfile = null;
    if (Array.isArray(res.data) && res.data.length > 0) {
      userProfile = res.data.find(obj => obj.firebase_uid === userId);
    } else if (typeof res.data === "object" && res.data !== null && Object.keys(res.data).length > 0) {
      userProfile = res.data;
    }

    let count = 0;

    if (userProfile) {
      const approved = parseInt(userProfile?.isApproved ?? userProfile?.isapproved ?? 0);
      const rejected = parseInt(userProfile?.isRejected ?? userProfile?.isrejected ?? 0);
      const responseMsg = userProfile?.response;
      const updatedAtString = userProfile?.updated_at || new Date().toISOString();

      // Priority 1: Admin response message (most important - always show if exists and updated)
      if (responseMsg && responseMsg.trim() !== "") {
        const notificationId = `admin-msg-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }

      // Priority 2: Profile Approved (show if approved=1 and no response message)
      if (approved === 1 && (!responseMsg || responseMsg.trim() === "")) {
        const notificationId = `admin-approved-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }

      // Priority 3: Profile rejection (only if rejected=1 and no response message)
      if (rejected === 1 && (!responseMsg || responseMsg.trim() === "")) {
        const notificationId = `admin-rejected-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }

      // Priority 4: Profile under review (only if pending approval and not rejected, and no response)
      if (approved === 0 && rejected === 0 && (!responseMsg || responseMsg.trim() === "")) {
        const notificationId = `admin-review-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error('Error fetching admin notifications count:', error);
    return 0;
  }
};

// Fetch closed job notifications count
const fetchClosedJobNotificationsCount = async (userId) => {
  try {
    // Fetch all jobs user applied to
    const applyRes = await axios.get(`${APPLY_API}?user_id=${userId}`);
    const appliedJobs = Array.isArray(applyRes.data) 
      ? applyRes.data.filter(app => app.is_applied === 1)
      : [];

    if (appliedJobs.length === 0) {
      return 0; // No applied jobs, no closed job notifications
    }

    // Get job IDs user applied to
    const appliedJobIds = appliedJobs.map(app => Number(app.job_id));

    // Fetch all jobs to check which ones are closed
    let allJobs = [];
    try {
      const jobsRes = await axios.get(JOBS_API);
      allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
    } catch (axiosError) {
      // Handle 400/403 errors gracefully - just return 0 count
      if (axiosError?.response?.status === 400 || axiosError?.response?.status === 403) {
        console.warn('Jobs API returned error status, skipping closed job notifications:', axiosError.response.status);
        return 0;
      }
      // Re-throw other errors to be caught by outer catch
      throw axiosError;
    }

    // Filter for closed jobs that user applied to (closed in last 7 days)
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

    // Count unread closed job notifications
    let count = 0;
    for (const job of closedJobs) {
      const notificationId = `job-closed-${job.id}-${userId}`;
      const updatedAtString = job.updated_at || job.updatedAt || new Date().toISOString();
      if (shouldShowNotification(notificationId, updatedAtString)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error('Error fetching closed job notifications count:', error);
    return 0;
  }
};

// Fetch profile view notifications count
const fetchProfileViewNotificationsCount = async (userId) => {
  try {
    // Fetch profile views for this user
    let profileViews = [];
    try {
      const viewRes = await axios.get(`${PROFILE_VIEW_API}?viewed_user_id=${userId}`);
      profileViews = Array.isArray(viewRes.data) ? viewRes.data : [];
    } catch (axiosError) {
      // Handle 400/403 errors gracefully - just return 0 count (403 is expected for users without access)
      if (axiosError?.response?.status === 400 || axiosError?.response?.status === 403) {
        // Silently handle 403 errors - they're expected for users without profile view access
        // Only log 400 errors as they might indicate a real issue
        if (axiosError?.response?.status === 400) {
          console.warn('Profile views API returned 400 error, skipping profile view notifications');
        }
        return 0;
      }
      // Re-throw other errors to be caught by outer catch
      throw axiosError;
    }

    if (profileViews.length === 0) {
      return 0; // No profile views
    }

    // Filter for recent views (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentViews = profileViews.filter(view => {
      const viewedDate = new Date(view.viewed_at || view.created_at || 0);
      return viewedDate >= sevenDaysAgo;
    });

    // Count unread profile view notifications
    let count = 0;
    for (const view of recentViews) {
      const notificationId = `profile-view-${view.viewer_user_id}-${view.viewed_user_id}`;
      const updatedAtString = view.viewed_at || view.created_at || new Date().toISOString();
      if (shouldShowNotification(notificationId, updatedAtString)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error('Error fetching profile view notifications count:', error);
    return 0;
  }
};

// Fetch recommended candidates notifications count (for job providers)
const fetchRecommendedCandidatesNotificationsCount = async (userId) => {
  try {
    // Fetch provider's approved jobs (approved in last 7 days)
    let allJobs = [];
    try {
      const jobsRes = await axios.get(`${JOBS_API}?firebase_uid=${userId}`);
      allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
    } catch (axiosError) {
      // Handle 400/403 errors gracefully - just return 0 count
      if (axiosError?.response?.status === 400 || axiosError?.response?.status === 403) {
        console.warn('Jobs API returned error status, skipping recommended candidates notifications:', axiosError.response.status);
        return 0;
      }
      // Re-throw other errors to be caught by outer catch
      throw axiosError;
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentApprovedJobs = allJobs.filter(job => {
      // Must be user's job
      if (job.firebase_uid !== userId && job.user_id !== userId && job.posted_by !== userId) {
        return false;
      }
      // Must be approved
      if (job.isApproved !== 1) return false;
      // Must be approved recently (updated_at in last 7 days)
      const updatedDate = new Date(job.updated_at || job.created_at || 0);
      return updatedDate >= sevenDaysAgo;
    });
    
    if (recentApprovedJobs.length === 0) {
      return 0; // No recent approved jobs
    }
    
    // Count notifications for jobs with matching candidates
    let count = 0;
    for (const job of recentApprovedJobs) {
      const notificationId = `recommended-candidates-${job.id}-${userId}`;
      const jobUpdatedAt = job.updated_at || job.created_at || new Date().toISOString();
      if (shouldShowNotification(notificationId, jobUpdatedAt)) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('Error fetching recommended candidates notifications count:', error);
    return 0;
  }
};

export const useNotificationCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get stable user ID to prevent unnecessary re-runs
  const userId = user?.firebase_uid || user?.uid || null;

  useEffect(() => {
    const fetchCount = async () => {
      if (!userId) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get user type to determine which notifications to fetch
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const userType = storedUser?.user_type || user?.user_type;
        const isJobProvider = userType === "Employer";
        
        // Fetch admin notifications count
        const adminCount = await fetchAdminNotificationsCount(userId);
        
        let totalCount = adminCount;
        
        // Job seeker specific notifications
        if (!isJobProvider) {
          // Fetch closed job notifications count
          const closedJobCount = await fetchClosedJobNotificationsCount(userId);
          
          // Fetch profile view notifications count
          const profileViewCount = await fetchProfileViewNotificationsCount(userId);
          
          totalCount += closedJobCount + profileViewCount;
        } else {
          // Job provider specific notifications
          // Fetch recommended candidates notifications count
          const recommendedCandidatesCount = await fetchRecommendedCandidatesNotificationsCount(userId);
          
          totalCount += recommendedCandidatesCount;
        }
        
        // TODO: Replace with actual API endpoint for other notifications count
        // const response = await axios.get(`NOTIFICATION_API/count?user_id=${userId}`);
        // const otherCount = response.data.unread_count || 0;
        
        // For now, using mock data
        const mockCount = getMockUnreadCount();
        
        // Combine counts
        totalCount += mockCount;
        
        setUnreadCount(totalCount);
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCount();
    
    let interval = null;
    
    // Set up interval only when tab is visible
    const setupInterval = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (!document.hidden) {
        // Refresh every 30 seconds when tab is active (good balance between real-time and server load)
        interval = setInterval(fetchCount, 30000);
      }
    };
    
    // Handle visibility change - refresh immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        // Tab became visible - refresh immediately to catch missed notifications
        fetchCount();
      }
      // Re-setup interval based on visibility
      setupInterval();
    };
    
    // Handle window focus - refresh when user clicks back into the window
    const handleWindowFocus = () => {
      if (userId) {
        // Window gained focus - refresh to catch any new notifications
        fetchCount();
      }
    };
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (when user switches back to the browser window)
    window.addEventListener('focus', handleWindowFocus);
    
    // Setup initial interval
    setupInterval();
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [userId]); // Only depend on userId, not the entire user object

  return { unreadCount, loading };
};