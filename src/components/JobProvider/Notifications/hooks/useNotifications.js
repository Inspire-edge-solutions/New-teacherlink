import { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
const LOGIN_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login";
const REQUIREMENT_ACTION_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/requirementAction";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Get last seen timestamp for a notification type from localStorage
  const getLastSeenTimestamp = (notificationId) => {
    const key = `provider_notification_seen_${notificationId}`;
    const stored = localStorage.getItem(key);
    return stored ? new Date(stored) : null;
  };

  // Store last seen timestamp for a notification type
  const setLastSeenTimestamp = (notificationId, timestamp) => {
    const key = `provider_notification_seen_${notificationId}`;
    localStorage.setItem(key, timestamp.toISOString());
  };

  // Check if notification should be shown (only if updated_at is newer than last seen)
  const shouldShowNotification = (notificationId, updatedAt) => {
    const lastSeen = getLastSeenTimestamp(notificationId);
    if (!lastSeen) return true; // Never seen before, show it
    return new Date(updatedAt) > lastSeen; // Show only if updated_at is newer
  };

  // Fetch job application notifications
  const fetchApplicationNotifications = async (userId, existingNotifications = []) => {
    try {
      const applicationNotifications = [];
      
      // Fetch all jobs posted by this user
      const jobsRes = await axios.get(`${JOBS_API}?firebase_uid=${userId}`);
      const userJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      
      if (userJobs.length === 0) {
        return []; // No jobs posted, no application notifications
      }

      const jobIds = userJobs.map(job => Number(job.id));
      
      // Fetch all applications
      const applyRes = await axios.get(APPLY_API);
      const allApplications = Array.isArray(applyRes.data) 
        ? applyRes.data.filter(app => app.is_applied === 1 && jobIds.includes(Number(app.job_id)))
        : [];

      if (allApplications.length === 0) {
        return []; // No applications
      }

      // Filter for recent applications (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentApplications = allApplications.filter(app => {
        const appliedDate = new Date(app.created_at || app.updated_at || 0);
        return appliedDate >= thirtyDaysAgo;
      });

      // Group applications by job_id and get candidate info
      const jobApplicationsMap = new Map();
      
      for (const app of recentApplications) {
        const jobId = Number(app.job_id);
        if (!jobApplicationsMap.has(jobId)) {
          jobApplicationsMap.set(jobId, []);
        }
        jobApplicationsMap.get(jobId).push(app);
      }

      // Create notifications for each job with applications
      for (const [jobId, applications] of jobApplicationsMap.entries()) {
        const job = userJobs.find(j => Number(j.id) === jobId);
        if (!job) continue;

        const notificationId = `application-${jobId}-${userId}`;
        const existing = existingNotifications.find(n => n.id === notificationId);
        
        // Get the most recent application timestamp
        const latestApplication = applications.reduce((latest, app) => {
          const appDate = new Date(app.created_at || app.updated_at || 0);
          const latestDate = new Date(latest.created_at || latest.updated_at || 0);
          return appDate > latestDate ? app : latest;
        }, applications[0]);

        const latestTimestamp = new Date(latestApplication.created_at || latestApplication.updated_at || Date.now());
        const applicationCount = applications.length;

        if (!existing) {
          // New notification
          applicationNotifications.push({
            id: notificationId,
            type: 'application',
            title: 'New Job Applications',
            message: `${applicationCount} candidate${applicationCount > 1 ? 's have' : ' has'} applied for "${job.job_title}"`,
            timestamp: latestTimestamp,
            read: false,
            link: `/provider/all-candidates?jobId=${jobId}`,
            jobId: jobId,
            jobTitle: job.job_title,
            matchCount: applicationCount
          });
        } else {
          // Check if there are new applications (compare timestamp)
          const existingTimestamp = new Date(existing.timestamp);
          if (latestTimestamp > existingTimestamp || applicationCount > (existing.matchCount || 0)) {
            // New applications, update notification
            applicationNotifications.push({
              ...existing,
              message: `${applicationCount} candidate${applicationCount > 1 ? 's have' : ' has'} applied for "${job.job_title}"`,
              timestamp: latestTimestamp,
              read: false, // Mark as unread if new applications
              matchCount: applicationCount
            });
          } else {
            // No new applications, keep existing
            applicationNotifications.push(existing);
          }
        }
      }

      return applicationNotifications;
    } catch (error) {
      console.error('Error fetching application notifications:', error);
      return [];
    }
  };

  // Fetch job approval/rejection notifications
  const fetchJobStatusNotifications = async (userId, existingNotifications = []) => {
    try {
      const jobStatusNotifications = [];
      
      // Fetch all jobs posted by this user
      const jobsRes = await axios.get(`${JOBS_API}?firebase_uid=${userId}`);
      const userJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];

      // Filter for recent status changes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const job of userJobs) {
        const updatedDate = new Date(job.updated_at || job.created_at || 0);
        if (updatedDate < thirtyDaysAgo) continue;

        const notificationId = `job-status-${job.id}-${userId}`;
        const existing = existingNotifications.find(n => n.id === notificationId);
        
        const isApproved = job.isApproved === 1 || job.isApproved === "1";
        const isRejected = job.isRejected === 1 || job.isRejected === "1";

        // Only create notification if status changed recently
        if (isApproved && (!existing || existing.type !== 'job-approved')) {
          if (!existing) {
            jobStatusNotifications.push({
              id: notificationId,
              type: 'job',
              title: 'Job Approved',
              message: `Your job "${job.job_title}" has been approved and is now live.`,
              timestamp: updatedDate,
              read: !shouldShowNotification(notificationId, job.updated_at),
              link: `/provider/post-jobs`,
              jobId: job.id,
              jobTitle: job.job_title
            });
          } else if (existing.type !== 'job-approved') {
            // Status changed, update notification
            jobStatusNotifications.push({
              ...existing,
              type: 'job',
              title: 'Job Approved',
              message: `Your job "${job.job_title}" has been approved and is now live.`,
              timestamp: updatedDate,
              read: false
            });
          } else {
            jobStatusNotifications.push(existing);
          }
        } else if (isRejected && (!existing || existing.type !== 'job-rejected')) {
          if (!existing) {
            jobStatusNotifications.push({
              id: notificationId,
              type: 'job',
              title: 'Job Rejected',
              message: `Your job "${job.job_title}" has been rejected. ${job.response ? `Reason: ${job.response}` : ''}`,
              timestamp: updatedDate,
              read: !shouldShowNotification(notificationId, job.updated_at),
              link: `/provider/post-jobs`,
              jobId: job.id,
              jobTitle: job.job_title
            });
          } else if (existing.type !== 'job-rejected') {
            jobStatusNotifications.push({
              ...existing,
              type: 'job',
              title: 'Job Rejected',
              message: `Your job "${job.job_title}" has been rejected. ${job.response ? `Reason: ${job.response}` : ''}`,
              timestamp: updatedDate,
              read: false
            });
          } else {
            jobStatusNotifications.push(existing);
          }
        } else if (existing) {
          // Keep existing notification
          jobStatusNotifications.push(existing);
        }
      }

      return jobStatusNotifications;
    } catch (error) {
      console.error('Error fetching job status notifications:', error);
      return [];
    }
  };

  // Fetch admin notifications and candidate status change notifications
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
        const responseMsg = userProfile?.response;
        const updatedAt = userProfile?.updated_at ? new Date(userProfile.updated_at) : new Date();
        const updatedAtString = userProfile?.updated_at || updatedAt.toISOString();

        // Helper function to check if notification exists
        const getExistingNotification = (notificationId) => {
          return existingNotifications.find(n => n.id === notificationId);
        };

        // Helper function to check if notification was updated
        const isNotificationUpdated = (existing, newUpdatedAt) => {
          if (!existing || !existing._updatedAt) return true;
          return new Date(newUpdatedAt) > new Date(existing._updatedAt);
        };

        // Check if response is a candidate status change notification (JSON)
        let candidateStatusNotification = null;
        try {
          const parsedResponse = JSON.parse(responseMsg || '{}');
          if (parsedResponse.type === 'candidate_status') {
            candidateStatusNotification = parsedResponse;
          }
        } catch {
          // Not JSON, treat as regular admin message
        }

        if (candidateStatusNotification) {
          // Handle candidate status change notification
          const notificationId = `candidate-status-${candidateStatusNotification.candidate_uid}-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);

          if (existing && isUpdated) {
            updatedNotifications.push(existing);
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`,
              type: 'candidate_status',
              title: 'Candidate Status Update',
              message: candidateStatusNotification.message || `${candidateStatusNotification.candidate_name} changed their job search status`,
              timestamp: updatedAt,
              read: false,
              link: `/provider/all-candidates`,
              candidateUid: candidateStatusNotification.candidate_uid,
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            updatedNotifications.push(existing);
          } else {
            newAdminNotifications.push({
              id: notificationId,
              type: 'candidate_status',
              title: 'Candidate Status Update',
              message: candidateStatusNotification.message || `${candidateStatusNotification.candidate_name} changed their job search status`,
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: `/provider/all-candidates`,
              candidateUid: candidateStatusNotification.candidate_uid,
              _updatedAt: updatedAtString
            });
          }
        } else if (responseMsg && responseMsg.trim() !== "") {
          // Regular admin message
          const notificationId = `admin-msg-${userId}`;
          const existing = getExistingNotification(notificationId);
          const isUpdated = isNotificationUpdated(existing, updatedAtString);

          if (existing && isUpdated) {
            updatedNotifications.push(existing);
            newAdminNotifications.push({
              id: `${notificationId}-${Date.now()}`,
              type: 'admin',
              title: 'Message from Admin',
              message: responseMsg,
              timestamp: updatedAt,
              read: false,
              link: '/provider/my-profile',
              _updatedAt: updatedAtString
            });
          } else if (existing && !isUpdated) {
            updatedNotifications.push(existing);
          } else {
            newAdminNotifications.push({
              id: notificationId,
              type: 'admin',
              title: 'Message from Admin',
              message: responseMsg,
              timestamp: updatedAt,
              read: !shouldShowNotification(notificationId, updatedAtString),
              link: '/provider/my-profile',
              _updatedAt: updatedAtString
            });
          }
        }
      }

      // Get base notification IDs (without timestamp suffix)
      const getBaseNotificationId = (id) => {
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

      // Keep all other existing admin notifications
      const otherAdminNotifications = existingNotifications
        .filter(n => {
          if (n.type !== 'admin' && n.type !== 'candidate_status') return false;
          const baseId = getBaseNotificationId(n.id);
          return !allCurrentBaseIds.has(baseId);
        });

      const otherNonAdminNotifications = existingNotifications.filter(n => 
        n.type !== 'admin' && n.type !== 'candidate_status'
      );

      return [...updatedNotifications, ...newAdminNotifications, ...otherAdminNotifications, ...otherNonAdminNotifications];
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      return existingNotifications;
    }
  };

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userId = user.firebase_uid || user.uid;
        
        // Fetch all notification types
        const [
          adminNotifications,
          applicationNotifications,
          jobStatusNotifications
        ] = await Promise.all([
          fetchAdminNotifications(userId, notifications),
          fetchApplicationNotifications(userId, notifications),
          fetchJobStatusNotifications(userId, notifications)
        ]);
        
        // Combine all notifications
        const allNotifications = [
          ...adminNotifications,
          ...applicationNotifications,
          ...jobStatusNotifications
        ];
        
        setNotifications(allNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        // Try to at least get admin notifications on error
        try {
          const userId = user.firebase_uid || user.uid;
          const adminNotifications = await fetchAdminNotifications(userId, notifications);
          const applicationNotifications = await fetchApplicationNotifications(userId, notifications);
          const jobStatusNotifications = await fetchJobStatusNotifications(userId, notifications);
          setNotifications([...adminNotifications, ...applicationNotifications, ...jobStatusNotifications]);
        } catch {
          setNotifications([]);
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
      case 'application':
        filtered = filtered.filter(n => n.type === 'application');
        break;
      case 'job':
        filtered = filtered.filter(n => n.type === 'job');
        break;
      case 'message':
        filtered = filtered.filter(n => n.type === 'message');
        break;
      case 'system':
        filtered = filtered.filter(n => n.type === 'system');
        break;
      case 'admin':
        filtered = filtered.filter(n => n.type === 'admin' || n.type === 'candidate_status');
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
      setNotifications(prev => {
        const updated = prev.map(n => {
          if (n.id === id) {
            if ((n.type === 'admin' || n.type === 'candidate_status') && n._updatedAt) {
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
      
      setNotifications(prev => 
        prev.map(n => {
          if ((n.type === 'admin' || n.type === 'candidate_status') && n._updatedAt) {
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
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        if (notification && (notification.type === 'admin' || notification.type === 'candidate_status') && notification._updatedAt) {
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
