import React from 'react';
import { Grow } from '@mui/material';
import { FaCheckCircle, FaTrash } from 'react-icons/fa';
import { getNotificationIcon, formatTimestamp } from '../utils/notificationUtils';

const NotificationItem = ({ notification, index, checked, onMarkAsRead, onDelete, onClick }) => {
  const handleClick = (e) => {
    // Don't trigger if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    
    // Handle click for recommended candidates notifications
    if (notification.type === 'application' && notification.jobId && onClick) {
      onClick(notification);
    } else if (notification.link) {
      // For other notifications with links, navigate
      window.location.href = notification.link;
    }
  };

  return (
    <Grow
      key={notification.id}
      in={checked}
      style={{ transformOrigin: '0 0 0' }}
      {...(checked ? { timeout: 800 + index * 100 } : {})}
    >
      <div
        onClick={handleClick}
        className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:bg-[#F0D8D9] cursor-pointer ${
          notification.read
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-pink-200 shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${
            notification.read ? 'bg-gray-100' : 'bg-pink-50'
          }`}>
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-base sm:text-lg ${
                    notification.read ? 'text-gray-700' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-gradient-brand rounded-full flex-shrink-0"></span>
                  )}
                </div>
                <p className={`text-lg mb-2 ${
                  notification.read ? 'text-gray-600' : 'text-gray-700'
                }`}>
                  {notification.message}
                </p>
              </div>

              {/* Date/Time and Actions in same line */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">
                  {formatTimestamp(notification.timestamp)}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification.id);
                      }}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-500 border border-gray-300 hover:text-green-500 hover:bg-green-50 hover:border-green-500 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <FaCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Mark as read</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="p-1.5 sm:p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Grow>
  );
};

export default NotificationItem;