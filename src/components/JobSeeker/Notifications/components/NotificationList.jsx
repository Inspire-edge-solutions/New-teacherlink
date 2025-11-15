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
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MdNotificationsNone className="text-6xl mb-4 opacity-50" />
            <p className="text-lg font-semibold">No notifications found</p>
            <p className="text-sm mt-2">
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

