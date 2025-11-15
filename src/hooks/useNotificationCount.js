import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";

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

      // Priority 1: Admin message (most important - always show if exists and updated)
      if (responseMsg && responseMsg.trim() !== "") {
        const notificationId = `admin-msg-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }

      // Priority 2: Profile rejection (only if rejected and no message already shown)
      if (rejected === 1 && (!responseMsg || responseMsg.trim() === "")) {
        const notificationId = `admin-rejected-${userId}`;
        if (shouldShowNotification(notificationId, updatedAtString)) {
          count++;
        }
      }

      // Priority 3: Profile under review (only if pending approval and no message/rejection)
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

export const useNotificationCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      if (!user) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userId = user.firebase_uid || user.uid;
        
        // Fetch admin notifications count
        const adminCount = await fetchAdminNotificationsCount(userId);
        
        // TODO: Replace with actual API endpoint for other notifications count
        // const response = await axios.get(`NOTIFICATION_API/count?user_id=${userId}`);
        // const otherCount = response.data.unread_count || 0;
        
        // For now, using mock data
        const mockCount = getMockUnreadCount();
        
        // Combine counts
        const totalCount = adminCount + mockCount;
        
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
      if (!document.hidden && user) {
        // Tab became visible - refresh immediately to catch missed notifications
        fetchCount();
      }
      // Re-setup interval based on visibility
      setupInterval();
    };
    
    // Handle window focus - refresh when user clicks back into the window
    const handleWindowFocus = () => {
      if (user) {
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
  }, [user]);

  return { unreadCount, loading };
};

