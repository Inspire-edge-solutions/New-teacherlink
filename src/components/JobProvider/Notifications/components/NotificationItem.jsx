import React from 'react';
import { Grow } from '@mui/material';
import { FaCheckCircle, FaTrash } from 'react-icons/fa';
import { getNotificationIcon, formatTimestamp } from '../utils/notificationUtils';

const NotificationItem = ({ notification, index, checked, onMarkAsRead, onDelete }) => {
  return (
    <Grow
      key={notification.id}
      in={checked}
      style={{ transformOrigin: '0 0 0' }}
      {...(checked ? { timeout: 800 + index * 100 } : {})}
    >
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:bg-[#F0D8D9] cursor-pointer ${
          notification.read
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-pink-200 shadow-sm'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-lg ${
            notification.read ? 'bg-gray-100' : 'bg-pink-50'
          }`}>
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold ${
                    notification.read ? 'text-gray-700' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-gradient-brand rounded-full"></span>
                  )}
                </div>
                <p className={`text-sm mb-2 ${
                  notification.read ? 'text-gray-600' : 'text-gray-700'
                }`}>
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(notification.timestamp)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <FaCheckCircle />
                  </button>
                )}
                <button
                  onClick={() => onDelete(notification.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Grow>
  );
};

export default NotificationItem;

