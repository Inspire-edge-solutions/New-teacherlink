import React, { useState } from 'react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import noDataIllustration from '../../../../../assets/Illustrations/No data found.png';

const MessagesSidebar = ({ 
  people = [], 
  inactiveJobs = [], 
  selectedChat, 
  onSelectChat 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white rounded-full p-1">
            <FiPlus size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* People Section */}
        {people.length > 0 && (
          <div className="mb-4">
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-700">People</h3>
            <div className="space-y-1">
              {people.map((person) => (
                <div
                  key={person.id}
                  onClick={() => onSelectChat(person)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === person.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={person.avatar || '/default-avatar.png'}
                        alt={person.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {person.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {person.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {person.name}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {person.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not Active Jobs Section */}
        {inactiveJobs.length > 0 && (
          <div>
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-700">Not active Jobs</h3>
            <div className="space-y-1">
              {inactiveJobs.map((person) => (
                <div
                  key={person.id}
                  onClick={() => onSelectChat(person)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === person.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={person.avatar || '/default-avatar.png'}
                        alt={person.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {person.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {person.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-500 truncate">
                        {person.name}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {person.lastMessage || 'No messages'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {people.length === 0 && inactiveJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <img 
              src={noDataIllustration} 
              alt="No conversations" 
              className="w-48 h-48 md:w-64 md:h-64 mb-4 mx-auto"
            />
            <p className="text-gray-400 text-sm font-medium">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSidebar;

