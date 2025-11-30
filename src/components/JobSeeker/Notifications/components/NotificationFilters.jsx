import React from 'react';
import { FaBell, FaCheckCircle } from 'react-icons/fa';
import { MdNotificationsNone } from 'react-icons/md';
import { FaUserShield } from 'react-icons/fa';

const NotificationFilters = ({ filter, setFilter, unreadCount }) => {
  const filterOptions = [
    { key: 'all', label: 'All', icon: <FaBell /> },
    { key: 'unread', label: 'Unread', icon: <MdNotificationsNone />, count: unreadCount },
    { key: 'read', label: 'Read', icon: <FaCheckCircle /> },
    { key: 'Admin', label: 'Admin', icon: <FaUserShield /> }
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
      {filterOptions.map(({ key, label, icon, count }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 w-[calc(50%-0.25rem)] sm:w-auto text-sm sm:text-base leading-normal tracking-tight ${
            filter === key
              ? 'bg-gradient-brand text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="text-sm sm:text-base">{icon}</span>
          <span className="truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm flex-shrink-0 ${
              filter === key ? 'bg-white/20' : 'bg-gradient-brand text-white'
            } leading-normal tracking-tight`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default NotificationFilters;