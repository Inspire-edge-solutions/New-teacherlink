import React from 'react';
import { Paper, Grow } from '@mui/material';
import { MdNotificationsNone } from 'react-icons/md';
import NotificationItem from './NotificationItem';

const NotificationList = ({ 
  filteredNotifications, 
  filter, 
  checked, 
  onMarkAsRead, 
  onDelete 
}) => {
  return (
    <Grow
      in={checked}
      style={{ transformOrigin: '0 0 0' }}
      {...(checked ? { timeout: 600 } : {})}
    >
      <Paper elevation={8} className="p-4 sm:p-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500 px-4">
            <MdNotificationsNone className="text-4xl sm:text-6xl mb-4 opacity-50" />
            <p className="text-lg sm:text-xl font-semibold leading-tight tracking-tight text-center">No notifications found</p>
            <p className="text-base sm:text-lg mt-2 leading-normal tracking-tight text-center">
              {filter === 'all' 
                ? "You're all caught up!" 
                : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                index={index}
                checked={checked}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </Paper>
    </Grow>
  );
};

export default NotificationList;

