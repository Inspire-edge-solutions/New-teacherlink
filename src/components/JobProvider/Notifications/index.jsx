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
              <Skeleton key={i} variant="rectangular" height={80} className="rounded-lg" />
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
