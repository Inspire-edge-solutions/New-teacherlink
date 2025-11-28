import React from 'react';
import { FaBell, FaCheckDouble } from 'react-icons/fa';

const NotificationHeader = ({ unreadCount, onMarkAllAsRead }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 bg-gradient-brand rounded-lg">
            <FaBell className="text-white text-xl" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent">Notifications</h1>
            <p className="text-sm text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap"
          >
            <FaCheckDouble className="text-sm sm:text-base" />
            <span className="hidden sm:inline">Mark all as read</span>
            <span className="sm:hidden">Mark all</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationHeader;

