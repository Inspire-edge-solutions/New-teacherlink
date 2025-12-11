import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaBookmark } from 'react-icons/fa';

const RecruiterActionItem = ({ action }) => {
  const navigate = useNavigate();
  const { organisation, action: actionLabel, context, isUnread, favoritedJobIds } = action;

  const getIcon = () => {
    if (actionLabel === 'favorited') {
      return <FaHeart className="mt-1 text-rose-500 flex-shrink-0" size={16} />;
    }
    if (actionLabel === 'saved') {
      return <FaBookmark className="mt-1 text-green-500 flex-shrink-0" size={16} />;
    }
    // For other actions (recommended, updated, viewed), show a simple dot
    return (
      <span className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 bg-gray-300 transition-colors duration-200 group-hover:bg-rose-500 group-focus-within:bg-rose-500" />
    );
  };

  const handleInstitutionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Allow click for favorited or saved actions with favorited job IDs
    if ((actionLabel === 'favorited' || actionLabel === 'saved') && favoritedJobIds && favoritedJobIds.length > 0) {
      const jobId = favoritedJobIds[0];
      
      // Use URL query parameters for more reliable navigation in production
      // This works better than React Router state which can be lost
      const queryParams = new URLSearchParams();
      queryParams.set('action', actionLabel);
      queryParams.set('id', jobId);
      
      // Navigate with both state (for immediate use) and URL params (as fallback)
      navigate(`/seeker/all-jobs?${queryParams.toString()}`, {
        state: {
          openJobId: jobId,
          fromRecruiterActions: true,
        },
      });
    }
  };

  const isInstitutionClickable = (actionLabel === 'favorited' || actionLabel === 'saved') && favoritedJobIds && favoritedJobIds.length > 0;

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 transition-colors duration-200 bg-white hover:bg-[#F0D8D9]/60 focus-within:bg-[#F0D8D9]/60">
      <div className="flex items-start gap-3">
        {getIcon()}
        <p className="m-0 text-base text-gray-700 leading-relaxed">
          {isInstitutionClickable ? (
            <span 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gradient-brand hover:bg-clip-text hover:text-transparent hover:underline transition-all"
              onClick={handleInstitutionClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInstitutionClick(e);
                }
              }}
              role="button"
              tabIndex={0}
              title={`Click to view ${actionLabel} job from ${organisation}`}
              aria-label={'View job from ' + organisation}
            >
              {organisation}
            </span>
          ) : (
            <span className="font-semibold text-gray-900">{organisation}</span>
          )}{' '}
          has{' '}
          <span className="font-semibold text-gray-900">{actionLabel}</span>{' '}
          {context}
        </p>
      </div>
    </div>
  );
};

export default RecruiterActionItem;
