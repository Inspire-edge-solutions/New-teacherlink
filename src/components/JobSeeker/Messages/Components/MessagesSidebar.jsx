import React, { useState } from 'react';
import { FiSearch, FiPlus, FiX, FiMapPin } from 'react-icons/fi';
import LoadingState from '../../../common/LoadingState';
import ModalPortal from '../../../common/ModalPortal';

const MessagesSidebar = ({ 
  people = [], 
  inactiveJobs = [], 
  selectedChat, 
  onSelectChat,
  organisations = [],
  showOrganisations = false,
  onSelectOrganisation,
  onStartNewChat,
  isLoading = false,
  onCloseSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  // Filter conversations based on search query
  const filteredPeople = people.filter((person) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (person.name || '').toLowerCase().includes(q) ||
      (person.lastMessage || '').toLowerCase().includes(q)
    );
  });

  const filteredInactiveJobs = inactiveJobs.filter((person) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (person.name || '').toLowerCase().includes(q) ||
      (person.lastMessage || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg md:shadow-none">
      {/* Mobile Header with Close Button */}
      <div className="md:hidden p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 leading-tight tracking-tight">Messages</h2>
        <button
          onClick={onCloseSidebar}
          className="text-gray-600 hover:text-gray-900 p-2"
          aria-label="Close sidebar"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base leading-normal tracking-tight"
          />
          <button 
            onClick={onStartNewChat}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            title="Start new chat"
          >
            <FiPlus size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Organisations Modal */}
        {showOrganisations && (
          <ModalPortal>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xl font-semibold text-gray-900 leading-tight tracking-tight">Select Institution</h3>
                  <button 
                    onClick={() => onSelectOrganisation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                {/* Organisation Search */}
                <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search institutions by name, city, state"
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {isLoading ? (
                    <div className="p-4">
                      <LoadingState
                        title="Loading applied jobs institutions…"
                        subtitle="We're gathering the institutions from jobs you've applied to so you can message them."
                        layout="card"
                      />
                    </div>
                  ) : organisations.length > 0 ? (
                    organisations
                      .filter(org => !org.isBlocked)
                      .filter(org => {
                        if (!orgSearch.trim()) return true;
                        const q = orgSearch.toLowerCase();
                        return (
                          (org.name || '').toLowerCase().includes(q) ||
                          (org.city || '').toLowerCase().includes(q) ||
                          (org.state || '').toLowerCase().includes(q)
                        );
                      })
                      .map((org) => (
                        <div
                          key={org.id}
                          onClick={() => onSelectOrganisation(org)}
                          className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-red-600 font-semibold text-base leading-normal tracking-tight">
                                {org.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-medium text-gray-900 truncate leading-tight tracking-tight">
                                {org.name}
                              </h4>
                              <div className="flex items-center text-base text-gray-500 mt-1 leading-normal tracking-tight">
                                <FiMapPin size={12} className="mr-1" />
                                <span className="truncate">
                                  {org.city && org.state ? `${org.city}, ${org.state}` : 'Location not specified'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-gray-500 text-lg sm:text-base leading-normal tracking-tight">No applied jobs institutions available. Apply to jobs to start messaging institutions.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Active Conversations Section */}
        {filteredPeople.length > 0 && (
          <div className="mb-4">
            <h3 className="px-4 py-3 text-lg font-semibold text-gray-700 leading-tight tracking-tight">Active Conversations</h3>
            <div className="space-y-1">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  onClick={() => onSelectChat(person)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === person.id || selectedChat?.conversationId === person.conversationId ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-semibold text-base leading-normal tracking-tight">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {person.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-sm rounded-full w-5 h-5 flex items-center justify-center leading-normal tracking-tight">
                          {person.unreadCount}
                        </span>
                      )}
                      {person.status === 'online' && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900 truncate leading-tight tracking-tight">
                          {person.name}
                        </h4>
                        <span className="text-base text-gray-400 leading-normal tracking-tight">
                          {person.lastMessageTime ? new Date(person.lastMessageTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                        </span>
                      </div>
                      <p className="text-base text-gray-500 truncate mt-1 leading-normal tracking-tight">
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
        {filteredInactiveJobs.length > 0 && (
          <div>
            <h3 className="px-4 py-3 text-lg font-semibold text-gray-700 leading-tight tracking-tight">Not active Jobs</h3>
            <div className="space-y-1">
              {filteredInactiveJobs.map((person) => (
                <div
                  key={person.id}
                  onClick={() => onSelectChat(person)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === person.id || selectedChat?.conversationId === person.conversationId ? 'bg-gray-100' : ''
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
                        <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-sm rounded-full w-5 h-5 flex items-center justify-center leading-normal tracking-tight">
                          {person.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-medium text-gray-500 truncate leading-tight tracking-tight">
                        {person.name}
                      </h4>
                      <p className="text-base text-gray-400 truncate mt-1 leading-normal tracking-tight">
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
        {filteredPeople.length === 0 && filteredInactiveJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-gray-400 text-lg sm:text-base leading-normal tracking-tight">
              {searchQuery.trim() ? 'No conversations match your search' : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSidebar;