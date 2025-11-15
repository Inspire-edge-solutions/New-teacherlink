import React from 'react';
import { 
  MdNotifications, 
  MdWork,
  MdMessage,
  MdInfo
} from 'react-icons/md';
import { FaUserCheck, FaUserShield } from 'react-icons/fa';

export const getNotificationIcon = (type) => {
  switch (type) {
    case 'job':
      return <MdWork className="text-blue-500" />;
    case 'application':
      return <FaUserCheck className="text-green-500" />;
    case 'message':
      return <MdMessage className="text-purple-500" />;
    case 'system':
      return <MdInfo className="text-orange-500" />;
    case 'admin':
      return <FaUserShield className="text-orange-500" />;
    default:
      return <MdNotifications className="text-gray-500" />;
  }
};

export const formatTimestamp = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleDateString();
};

