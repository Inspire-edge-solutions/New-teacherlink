import { useState, useEffect } from 'react';
import { useAuth } from '../../../../Context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const JOBS_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes";
const CANDIDATES_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change";
const FULL_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi";
const JOB_PREFERENCE_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";
const PRESENT_ADDRESS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const APPLY_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate";
const REDEEM_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral";
const COIN_HISTORY_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history";
const ORGANISATION_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";

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
        let responseMsg = userProfile?.response;
        
        // Check if response is a candidate_status notification (JSON)
        // If so, skip it here (it will be handled by fetchCandidateStatusNotifications)
        try {
          if (responseMsg) {
            const parsed = JSON.parse(responseMsg);
            if (parsed.type === 'candidate_status') {
              responseMsg = null; // Skip candidate_status notifications in admin notifications
            }
          }
        } catch {
          // Not JSON, treat as regular admin message
        }
        
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
              link: '/provider/my-profile',
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
              read: existing ? existing.read : !shouldShowNotification(notificationId, updatedAtString),
              link: '/provider/my-profile',
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
              message: 'Your profile has been approved by admin. You can now post jobs!',
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
              title: 'Profile Approved',
              message: 'Your profile has been approved by admin. You can now post jobs!',
              timestamp: updatedAt,
              read: existing ? existing.read : !shouldShowNotification(notificationId, updatedAtString),
              link: '/provider/my-profile',
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
              link: '/provider/my-profile',
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
              read: existing ? existing.read : !shouldShowNotification(notificationId, updatedAtString),
              link: '/provider/my-profile',
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
              link: '/provider/my-profile',
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
              read: existing ? existing.read : !shouldShowNotification(notificationId, updatedAtString),
              link: '/provider/my-profile',
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

      // Get other admin notifications (old ones not currently active)
      const otherAdminNotifications = existingNotifications.filter(n => {
        if (n.type !== 'admin') return false;
        const baseId = getBaseNotificationId(n.id);
        return !allCurrentBaseIds.has(baseId);
      });

      // Combine all notifications: updated (preserved), new, and other old admin notifications
      return [...updatedNotifications, ...newAdminNotifications, ...otherAdminNotifications];
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      return [];
    }
  };

  // Check if candidate matches job (same logic as AppliedCandidates)
  const checkCandidateJobMatch = (candidate, job, preferences, presentAddress) => {
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
    if (preferences && preferences.teaching_subjects && job.core_subjects) {
      const userSubjects = Array.isArray(preferences.teaching_subjects) 
        ? preferences.teaching_subjects 
        : [preferences.teaching_subjects];
      const jobSubjects = Array.isArray(job.core_subjects) 
        ? job.core_subjects 
        : [job.core_subjects];
      
      const hasSubjectMatch = userSubjects.some(userSubject => 
        jobSubjects.some(jobSubject => 
          jobSubject.toLowerCase().includes(userSubject.toLowerCase()) ||
          userSubject.toLowerCase().includes(jobSubject.toLowerCase())
        )
      );
      
      if (hasSubjectMatch || (job.job_title && userSubjects.some(us => 
        job.job_title.toLowerCase().includes(us.toLowerCase()) ||
        us.toLowerCase().includes(job.job_title.toLowerCase())
      ))) {
        matchCount++;
      }
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
      
      if (job.job_title && userGrades.some(ug => 
        job.job_title.toLowerCase().includes(ug.toLowerCase()) ||
        ug.toLowerCase().includes(job.job_title.toLowerCase())
      )) {
        matchCount++;
      } else if (job.core_subjects) {
        const jobSubjects = Array.isArray(job.core_subjects) 
          ? job.core_subjects 
          : [job.core_subjects];
        if (userGrades.some(ug => 
          jobSubjects.some(js => 
            js.toLowerCase().includes(ug.toLowerCase()) ||
            ug.toLowerCase().includes(js.toLowerCase())
          )
        )) {
          matchCount++;
        }
      }
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
    
    // Require at least 2 matches
    return matchCount >= 2;
  };

  // Fetch candidate status change notifications
  const fetchCandidateStatusNotifications = async (userId, existingNotifications = []) => {
    try {
      const statusNotifications = [];
      
      // Fetch user's profile_approved record to get candidate status change notifications
      const res = await axios.get(`${PROFILE_APPROVED_API}?firebase_uid=${userId}`);
      let userProfile = null;
      if (Array.isArray(res.data) && res.data.length > 0) {
        userProfile = res.data.find(obj => obj.firebase_uid === userId);
      } else if (typeof res.data === "object" && res.data !== null && Object.keys(res.data).length > 0) {
        userProfile = res.data;
      }
      
      if (!userProfile || !userProfile.response) {
        return [];
      }
      
      // Try to parse response as JSON (candidate status notification)
      let notificationData = null;
      try {
        notificationData = JSON.parse(userProfile.response);
        // Check if it's a candidate status notification
        if (notificationData.type !== 'candidate_status') {
          return [];
        }
      } catch {
        // Not a JSON notification, skip
        return [];
      }
      
      // Check coin balance before showing notification
      let userCoins = 0;
      try {
        const coinRes = await axios.get(REDEEM_API);
        const coinList = Array.isArray(coinRes.data) ? coinRes.data : [];
        const userCoinRecord = coinList.find(record => String(record.firebase_uid) === String(userId));
        userCoins = userCoinRecord?.coin_value ? Number(userCoinRecord.coin_value) : 0;
      } catch (coinError) {
        console.error('Error fetching coin balance:', coinError);
        return []; // Don't show notification if can't check coins
      }
      
      // Only show if user has 20+ coins
      if (userCoins < 20) {
        return []; // Not enough coins, don't show notification
      }
      
      // Check if this notification was already seen/paid for
      const notificationId = `candidate-status-${notificationData.candidate_uid}-${notificationData.timestamp}`;
      const existing = existingNotifications.find(n => n.id === notificationId);
      
      // Check localStorage to prevent duplicate charges on page refresh
      const paidNotificationsKey = `candidate_status_paid_${userId}`;
      const paidNotifications = JSON.parse(localStorage.getItem(paidNotificationsKey) || '[]');
      const isAlreadyPaid = paidNotifications.includes(notificationId);
      
      // Check if this is a new notification (not seen before and not paid)
      const isNew = !existing || (!existing._paidFor && !isAlreadyPaid);
      
      if (isNew && !isAlreadyPaid) {
        // Deduct 20 coins
        try {
          const newCoinBalance = userCoins - 20;
          await axios.put(REDEEM_API, {
            firebase_uid: userId,
            coin_value: newCoinBalance
          });
          
          // Record coin history for candidate status notification
          try {
            // Get organization ID for the current user (job provider)
            let orgId = null;
            try {
              const orgResponse = await axios.get(`${ORGANISATION_API}?firebase_uid=${encodeURIComponent(userId)}`);
              if (orgResponse.status === 200 && Array.isArray(orgResponse.data) && orgResponse.data.length > 0) {
                orgId = orgResponse.data[0].id;
              }
            } catch (orgError) {
              console.warn('Could not fetch organization data for coin history:', orgError);
            }

            // Get candidate's personal ID from personal API
            let unblocked_candidate_id = null;
            let unblocked_candidate_name = notificationData.candidate_name || null;
            try {
              const personalRes = await axios.get(PERSONAL_API, { params: { firebase_uid: notificationData.candidate_uid } });
              if (personalRes.status === 200 && Array.isArray(personalRes.data) && personalRes.data.length > 0) {
                unblocked_candidate_id = personalRes.data[0].id;
                // Use candidate_name from notificationData, fallback to fullName from personal API
                if (!unblocked_candidate_name) {
                  unblocked_candidate_name = personalRes.data[0].fullName || null;
                }
              }
            } catch (personalError) {
              console.warn('Could not fetch personal details for coin history:', personalError);
            }

            const coinHistoryPayload = {
              firebase_uid: userId,
              candidate_id: orgId, // Organization ID (job provider)
              job_id: null,
              coin_value: newCoinBalance, // Remaining balance after deduction
              reduction: 20, // Amount deducted
              reason: "Viewed candidate status change",
              unblocked_candidate_id, // Candidate's personal ID
              unblocked_candidate_name // Candidate's name
            };

            await axios.post(COIN_HISTORY_API, coinHistoryPayload);
            console.log('✅ Coin history recorded successfully for candidate status notification');
          } catch (historyError) {
            console.error('Error recording coin history for candidate status notification:', historyError);
            // Don't fail the main flow if history recording fails
          }
          
          // Mark as paid in localStorage to prevent duplicate charges
          paidNotifications.push(notificationId);
          localStorage.setItem(paidNotificationsKey, JSON.stringify(paidNotifications));
          
          console.log(`✅ Deducted 20 coins for candidate status notification. New balance: ${newCoinBalance}`);
        } catch (deductError) {
          console.error('Error deducting coins:', deductError);
          return []; // Don't show notification if coin deduction fails
        }
      }
      
      // Create notification
      const updatedAt = userProfile.updated_at ? new Date(userProfile.updated_at) : new Date(notificationData.timestamp);
      statusNotifications.push({
        id: notificationId,
        type: 'candidate_status',
        title: 'Candidate Status Changed',
        message: notificationData.message || `${notificationData.candidate_name} changed their job search status`,
        timestamp: updatedAt,
        read: existing ? existing.read : false,
        link: '/provider/all-candidates',
        candidateUid: notificationData.candidate_uid,
        candidateName: notificationData.candidate_name,
        newStatus: notificationData.new_status,
        _paidFor: true, // Mark as paid
        _updatedAt: userProfile.updated_at || notificationData.timestamp
      });
      
      return statusNotifications;
    } catch (error) {
      console.error('Error fetching candidate status notifications:', error);
      return [];
    }
  };

  // Fetch recommended candidates notifications (when job is approved and has matching candidates)
  const fetchRecommendedCandidatesNotifications = async (userId, existingNotifications = []) => {
    try {
      const recommendedNotifications = [];
      
      // Fetch provider's approved jobs (approved in last 7 days)
      const jobsRes = await axios.get(`${JOBS_API}?firebase_uid=${userId}`);
      const allJobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      
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
        return []; // No recent approved jobs
      }
      
      // Fetch all approved candidates
      const [candidatesRes, approvedRes] = await Promise.all([
        axios.get(CANDIDATES_API),
        axios.get(PROFILE_APPROVED_API)
      ]);
      
      const allCandidates = Array.isArray(candidatesRes.data) 
        ? (Array.isArray(candidatesRes.data[0]) ? candidatesRes.data[0] : candidatesRes.data)
        : [];
      
      const approvedData = Array.isArray(approvedRes.data) ? approvedRes.data : [];
      const approvedUids = new Set(
        approvedData
          .filter(item => item.isApproved === 1 || item.isapproved === 1)
          .map(item => item.firebase_uid)
      );
      
      const approvedCandidates = allCandidates.filter(c => 
        c.firebase_uid && approvedUids.has(c.firebase_uid)
      );
      
      if (approvedCandidates.length === 0) {
        return []; // No approved candidates
      }
      
      // Get applied candidate IDs to exclude them
      const applyRes = await axios.get(APPLY_API);
      const allApplications = Array.isArray(applyRes.data) ? applyRes.data : [];
      const appliedCandidateIds = new Set(
        allApplications
          .filter(app => recentApprovedJobs.some(job => Number(app.job_id) === Number(job.id)))
          .map(app => app.user_id || app.firebase_uid)
          .filter(Boolean)
      );
      
      // Fetch job preferences and present addresses
      const [jobPreferencesRes, presentAddressRes] = await Promise.all([
        axios.get(JOB_PREFERENCE_API),
        axios.get(PRESENT_ADDRESS_API)
      ]);
      
      const allPreferences = Array.isArray(jobPreferencesRes.data) ? jobPreferencesRes.data : [];
      const allAddresses = Array.isArray(presentAddressRes.data) ? presentAddressRes.data : [];
      
      // For each approved job, find matching candidates
      for (const job of recentApprovedJobs) {
        const matchingCandidates = [];
        
        for (const candidate of approvedCandidates) {
          const candidateId = candidate.firebase_uid;
          
          // Skip if already applied
          if (appliedCandidateIds.has(candidateId)) continue;
          
          // Get candidate preferences and address
          const preferences = allPreferences.find(p => p.firebase_uid === candidateId);
          const presentAddress = allAddresses.find(a => a.firebase_uid === candidateId);
          
          // Check if candidate matches job
          if (checkCandidateJobMatch(candidate, job, preferences, presentAddress)) {
            matchingCandidates.push(candidate);
          }
        }
        
        // Create notification if there are matching candidates
        if (matchingCandidates.length > 0) {
          const notificationId = `recommended-candidates-${job.id}-${userId}`;
          const existing = existingNotifications.find(n => n.id === notificationId);
          const jobUpdatedAt = job.updated_at || job.created_at || new Date().toISOString();
          
          // Check if this is a new or updated notification
          const isUpdated = existing 
            ? new Date(jobUpdatedAt) > new Date(existing.timestamp)
            : true;
          
          if (isUpdated || !existing) {
            recommendedNotifications.push({
              id: existing && isUpdated ? `${notificationId}-${Date.now()}` : notificationId,
              type: 'application',
              title: 'Recommended Candidates Found',
              message: `${matchingCandidates.length} candidate${matchingCandidates.length !== 1 ? 's' : ''} match your job "${job.job_title}". Check them out in Applications!`,
              timestamp: new Date(jobUpdatedAt),
              read: existing ? existing.read : false,
              link: '/provider/all-candidates',
              jobId: job.id,
              jobTitle: job.job_title,
              matchCount: matchingCandidates.length
            });
          } else if (existing) {
            // Keep existing notification
            recommendedNotifications.push(existing);
          }
        }
      }
      
      return recommendedNotifications;
    } catch (error) {
      console.error('Error fetching recommended candidates notifications:', error);
      return [];
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
        
        // Fetch admin notifications, passing existing notifications to preserve read status
        const adminNotifications = await fetchAdminNotifications(userId, notifications);
        
        // Fetch recommended candidates notifications (when jobs are approved and have matches)
        const recommendedCandidatesNotifications = await fetchRecommendedCandidatesNotifications(userId, notifications);
        
        // Fetch candidate status change notifications (when favorited candidates change job search status)
        const candidateStatusNotifications = await fetchCandidateStatusNotifications(userId, notifications);
        
        // Combine all notifications
        const allNotifications = [...adminNotifications, ...recommendedCandidatesNotifications, ...candidateStatusNotifications];
        
        // Only use real notifications from API (no mock data)
        setNotifications(allNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        // Try to at least get admin notifications on error
        try {
          const userId = user.firebase_uid || user.uid;
          const adminNotifications = await fetchAdminNotifications(userId, notifications);
          const recommendedCandidatesNotifications = await fetchRecommendedCandidatesNotifications(userId, notifications);
          const candidateStatusNotifications = await fetchCandidateStatusNotifications(userId, notifications);
          setNotifications([...adminNotifications, ...recommendedCandidatesNotifications, ...candidateStatusNotifications]);
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
      case 'candidate_status':
        filtered = filtered.filter(n => n.type === 'candidate_status');
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
            // For admin notifications, store the timestamp so it won't reappear unless updated
            if (n.type === 'admin' && n._updatedAt) {
              setLastSeenTimestamp(id, new Date(n._updatedAt));
            }
            // Only update read status, don't remove notification
            return { ...n, read: true };
          }
          return n;
        });
        return updated;
      });
      // Dispatch event to trigger immediate badge count refresh
      window.dispatchEvent(new Event('notificationUpdated'));
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
      // Dispatch event to trigger immediate badge count refresh
      window.dispatchEvent(new Event('notificationUpdated'));
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
      // Dispatch event to trigger immediate badge count refresh
      window.dispatchEvent(new Event('notificationUpdated'));
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