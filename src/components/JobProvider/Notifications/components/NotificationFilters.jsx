import React from 'react';
import { FaBell, FaCheckCircle, FaUserShield, FaUserCheck } from 'react-icons/fa';
import { MdNotificationsNone, MdWork, MdMessage } from 'react-icons/md';

const NotificationFilters = ({ filter, setFilter, unreadCount }) => {
  const filterOptions = [
    { key: 'all', label: 'All', icon: <FaBell /> },
    { key: 'unread', label: 'Unread', icon: <MdNotificationsNone />, count: unreadCount },
    { key: 'read', label: 'Read', icon: <FaCheckCircle /> },
    { key: 'application', label: 'Applications', icon: <FaUserCheck /> },
    { key: 'job', label: 'Jobs', icon: <MdWork /> },
    { key: 'message', label: 'Messages', icon: <MdMessage /> },
    { key: 'Admin', label: 'Admin', icon: <FaUserShield /> }
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
      {filterOptions.map(({ key, label, icon, count }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-[calc(50%-0.25rem)] sm:w-auto ${
            filter === key
              ? 'bg-gradient-brand text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {icon}
          <span>{label}</span>
          {count !== undefined && count > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === key ? 'bg-white/20' : 'bg-gradient-brand text-white'
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default NotificationFilters;

