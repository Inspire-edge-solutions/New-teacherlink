import React from 'react';

const RecruiterActionItem = ({ action, isFirst }) => {
  const { organisation, action: actionLabel, context, timestamp, isUnread } = action;

  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 transition-colors duration-200 bg-white hover:bg-[#F0D8D9]/60 focus-within:bg-[#F0D8D9]/60 ${
        isUnread ? 'hover:bg-[#F0D8D9]/60 focus-within:bg-[#F0D8D9]/60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 bg-gray-300 transition-colors duration-200 ${
            isUnread ? 'group-hover:bg-rose-500 group-focus-within:bg-rose-500' : 'group-hover:bg-rose-500 group-focus-within:bg-rose-500'
          }`}
        />
        <p className="m-0 text-sm sm:text-base text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">{organisation}</span> has{' '}
          <span className="font-semibold text-gray-900">{actionLabel}</span>{' '}
          {context}
        </p>
      </div>

      <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">
        {timestamp}
      </span>
    </div>
  );
};

export default RecruiterActionItem;

