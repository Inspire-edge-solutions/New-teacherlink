import React from 'react';
import { FaHeart, FaBookmark } from 'react-icons/fa';

const RecruiterActionItem = ({ action, isFirst }) => {
  const { organisation, action: actionLabel, context, isUnread } = action;

  const getIcon = () => {
    if (actionLabel === 'favorited') {
      return <FaHeart className="mt-1 text-rose-500 flex-shrink-0" size={16} />;
    }
    if (actionLabel === 'saved') {
      return <FaBookmark className="mt-1 text-green-500 flex-shrink-0" size={16} />;
    }
    // For other actions (recommended, updated, viewed), show a simple dot
    return (
      <span
        className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 bg-gray-300 transition-colors duration-200 ${
          isUnread ? 'group-hover:bg-rose-500 group-focus-within:bg-rose-500' : 'group-hover:bg-rose-500 group-focus-within:bg-rose-500'
        }`}
      />
    );
  };

  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 transition-colors duration-200 bg-white hover:bg-[#F0D8D9]/60 focus-within:bg-[#F0D8D9]/60 ${
        isUnread ? 'hover:bg-[#F0D8D9]/60 focus-within:bg-[#F0D8D9]/60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <p className="m-0 text-sm sm:text-base text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">{organisation}</span> has{' '}
          <span className="font-semibold text-gray-900">{actionLabel}</span>{' '}
          {context}
        </p>
      </div>
    </div>
  );
};

export default RecruiterActionItem;

