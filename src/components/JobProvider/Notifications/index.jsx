import React, { useState, useEffect } from 'react';
import { Paper, Grow, Skeleton } from '@mui/material';
import { useNotifications } from './hooks/useNotifications';
import NotificationHeader from './components/NotificationHeader';
import NotificationFilters from './components/NotificationFilters';
import NotificationList from './components/NotificationList';
import RecommendedCandidatesModal from './components/RecommendedCandidatesModal';

const NotificationsComponent = () => {
  const [checked, setChecked] = useState(false);
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  const {
    filteredNotifications,
    loading,
    filter,
    setFilter,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (notification.type === 'application' && notification.jobId) {
      setSelectedNotification(notification);
      setShowRecommendedModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowRecommendedModal(false);
    setSelectedNotification(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => setChecked(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 w-full md:p-5 p-0">
        <Paper elevation={8} className="p-4 sm:p-6">
          <Skeleton variant="text" width="40%" height={32} className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 sm:p-4 rounded-lg border-2 border-gray-200 bg-white">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon Skeleton */}
                  <div className="p-2 sm:p-3 rounded-lg bg-gray-100 flex-shrink-0">
                    <Skeleton variant="circular" width={24} height={24} className="sm:w-6 sm:h-6" />
                  </div>
                  
                  {/* Content Skeleton */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Title Skeleton */}
                        <div className="flex items-center gap-2 mb-1">
                          <Skeleton variant="text" width="60%" height={24} className="sm:h-6" />
                          <Skeleton variant="circular" width={8} height={8} />
                        </div>
                        {/* Message Skeleton */}
                        <Skeleton variant="text" width="100%" height={28} className="mb-2 sm:h-7" />
                        <Skeleton variant="text" width="80%" height={28} className="sm:h-7" />
                      </div>
                      
                      {/* Date/Time and Actions Skeleton */}
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton variant="text" width="30%" height={20} />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Skeleton variant="rectangular" width={100} height={32} className="rounded-lg sm:w-32" />
                          <Skeleton variant="circular" width={32} height={32} className="sm:w-8 sm:h-8" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Paper>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full md:p-5 p-0">
      {/* Header */}
      <Grow
        in={checked}
        style={{ transformOrigin: '0 0 0' }}
        {...(checked ? { timeout: 400 } : {})}
      >
        <Paper elevation={8} className="p-4 sm:p-6">
          <NotificationHeader 
            unreadCount={unreadCount} 
            onMarkAllAsRead={markAllAsRead} 
          />
          <NotificationFilters 
            filter={filter} 
            setFilter={setFilter} 
            unreadCount={unreadCount} 
          />
        </Paper>
      </Grow>

      {/* Notifications List */}
      <NotificationList
        filteredNotifications={filteredNotifications}
        filter={filter}
        checked={checked}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
        onNotificationClick={handleNotificationClick}
      />

      {/* Recommended Candidates Modal */}
      {selectedNotification && (
        <RecommendedCandidatesModal
          isOpen={showRecommendedModal}
          onClose={handleCloseModal}
          jobId={selectedNotification.jobId}
          jobTitle={selectedNotification.jobTitle || 'Your Job'}
          matchCount={selectedNotification.matchCount || 0}
        />
      )}
    </div>
  );
};

export default NotificationsComponent;

// import React, { useState, useEffect } from 'react';

// const NotificationsComponent = () => {
//   return (
//     <div>
//       <h1>This page is under development.</h1>
//     </div>
//   );
// };

// export default NotificationsComponent;
