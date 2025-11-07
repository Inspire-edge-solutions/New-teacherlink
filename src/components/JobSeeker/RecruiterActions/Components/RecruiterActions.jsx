import React from 'react';
import RecruiterActionItem from './RecruiterActionItem';

const defaultRecruiterActions = [
  {
    id: 'ra-1',
    organisation: 'Abc school',
    action: 'Short Listed',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: true,
  },
  {
    id: 'ra-2',
    organisation: 'Nirmala school',
    action: 'Short Listed',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: false,
  },
  {
    id: 'ra-3',
    organisation: 'Nirmala school',
    action: 'Listed a New Job',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: false,
  },
  {
    id: 'ra-4',
    organisation: 'Abc school',
    action: 'Short Listed',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: false,
  },
  {
    id: 'ra-5',
    organisation: 'Nirmala school',
    action: 'Short Listed',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: false,
  },
  {
    id: 'ra-6',
    organisation: 'Nirmala school',
    action: 'Listed a New Job',
    context: 'you',
    timestamp: 'about 13 hours ago',
    isUnread: false,
  },
];

const RecruiterActions = ({ actions = defaultRecruiterActions }) => {
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F7F7F9] py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">
            Recruiter Actions
          </h1>
          <p className="text-sm sm:text-base text-gray-500 m-0">
            Track how recruiters are interacting with your profile.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {hasActions ? (
            <div className="divide-y divide-gray-100">
              {actions.map((actionItem, index) => (
                <RecruiterActionItem
                  key={actionItem.id || index}
                  action={actionItem}
                  isFirst={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                No recruiter activity yet
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When recruiters shortlist you or publish new jobs relevant to your profile, they will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterActions;

