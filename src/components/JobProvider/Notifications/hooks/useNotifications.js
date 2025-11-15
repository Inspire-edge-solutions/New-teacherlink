import { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";

// Mock data structure - Replace with actual API call
const mockNotifications = [
  {
    id: 1,
    type: 'application',
    title: 'New Job Application',
    message: 'John Doe applied for Mathematics Teacher position at your school',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    read: false,
    link: '/provider/all-candidates'
  },
  {
    id: 2,
    type: 'application',
    title: 'Application Status Update',
    message: 'You have 5 new applications for Science Teacher position',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    read: false,
    link: '/provider/applied-candidates'
  },
  {
    id: 3,
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from a candidate regarding the job posting',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
    link: '/provider/messages'
  },
  {
    id: 4,
    type: 'job',
    title: 'Job Post Status',
    message: 'Your job posting for English Teacher has been approved and is now live',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    link: '/provider/post-jobs'
  },
  {
    id: 5,
    type: 'system',
    title: 'Profile Update Required',
    message: 'Please complete your organization profile to attract more candidates',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    link: '/provider/my-profile'
  },
  {
    id: 6,
    type: 'job',
    title: 'Job Post Expiring Soon',
    message: 'Your job posting for Physics Teacher will expire in 3 days. Consider renewing it.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    link: '/provider/post-jobs'
  }
];

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

  // Fetch admin notifications from profile_approved API
  const fetchAdminNotifications = async (userId) => {
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

      const adminNotifications = [];

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

        // Priority 1: Admin message (most important - always show if exists and updated)
        if (responseMsg && responseMsg.trim() !== "") {
          const notificationId = `admin-msg-${userId}`;
          if (shouldShowNotification(notificationId, updatedAtString)) {
            adminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Message from Admin',
              message: responseMsg,
              timestamp: updatedAt,
              read: false,
              link: '/provider/my-profile',
              _updatedAt: updatedAtString // Store for comparison
            });
          }
        }

        // Priority 2: Profile rejection (only if rejected and no message already shown)
        if (rejected === 1 && (!responseMsg || responseMsg.trim() === "")) {
          const notificationId = `admin-rejected-${userId}`;
          if (shouldShowNotification(notificationId, updatedAtString)) {
            adminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Profile Rejected',
              message: 'Your profile has been rejected by admin. Please review and update your profile.',
              timestamp: updatedAt,
              read: false,
              link: '/provider/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }

        // Priority 3: Profile under review (only if pending approval and no message/rejection)
        if (approved === 0 && rejected === 0 && (!responseMsg || responseMsg.trim() === "")) {
          const notificationId = `admin-review-${userId}`;
          if (shouldShowNotification(notificationId, updatedAtString)) {
            adminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Profile Under Review',
              message: 'Your profile is currently under admin review. We will notify you once it\'s approved.',
              timestamp: updatedAt,
              read: false,
              link: '/provider/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }
      }

      return adminNotifications;
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      return [];
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
        
        // Fetch admin notifications
        const adminNotifications = await fetchAdminNotifications(userId);
        
        // TODO: Replace with actual API endpoint for other notifications
        // const response = await axios.get(`NOTIFICATION_API?user_id=${userId}`);
        // const otherNotifications = response.data;
        
        // Combine admin notifications with mock data (replace with actual API data)
        const allNotifications = [...adminNotifications, ...mockNotifications];
        
        setNotifications(allNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        // Try to at least get admin notifications on error
        try {
          const userId = user.firebase_uid || user.uid;
          const adminNotifications = await fetchAdminNotifications(userId);
          setNotifications([...adminNotifications, ...mockNotifications]);
        } catch (adminError) {
          setNotifications(mockNotifications); // Fallback to mock data only
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
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
        filtered = filtered.filter(n => n.type === 'job');
        break;
      case 'application':
        filtered = filtered.filter(n => n.type === 'application');
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
            // For admin notifications, store the timestamp so it won't reappear unless updated
            if (n.type === 'admin' && n._updatedAt) {
              setLastSeenTimestamp(id, new Date(n._updatedAt));
            }
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

