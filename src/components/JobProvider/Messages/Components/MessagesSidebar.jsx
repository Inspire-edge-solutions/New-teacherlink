import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiClock, FiUser, FiSlash, FiUnlock, FiX } from 'react-icons/fi';
import LoadingState from "../../../common/LoadingState";
import ModalPortal from "../../../common/ModalPortal";

const MessagesSidebar = ({ 
  people = [], 
  inactiveJobs = [], 
  selectedChat, 
  onSelectChat,
  candidates = [],
  showCandidates = false,
  onSelectCandidate,
  onStartNewChat,
  isLoading = false,
  blockedUsers = [],
  showBlockedList = false,
  onToggleBlockedList,
  onUnblock,
  onCloseSidebar
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');

  // Filter conversations based on search query
  const filteredPeople = people.filter(person => 
    person.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredInactiveJobs = inactiveJobs.filter(person => 
    person.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Blocked Candidates Modal */}
      {showBlockedList && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiSlash className="text-red-500" size={20} />
                Blocked Candidates ({blockedUsers.length})
              </h3>
              <button
                onClick={onToggleBlockedList}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>
              
              {/* Modal Body - Blocked List */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiSlash className="mx-auto mb-2 text-gray-300" size={32} />
                  <p>No blocked candidates</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.blockedUserId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-semibold text-sm">
                            {blocked.blockedUserName?.charAt(0).toUpperCase() || 'B'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {blocked.blockedUserName || 'Unknown User'}
                          </h4>
                          {blocked.blockedAt && (
                            <p className="text-xs text-gray-500">
                              Blocked {new Date(blocked.blockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (blocked.blockedUserId && onUnblock) {
                            onUnblock(blocked.blockedUserId);
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <FiUnlock size={14} />
                        <span>Unblock</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg md:shadow-none">
        {/* Mobile Header with Close Button */}
        <div className="md:hidden p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
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
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm sm:text-base"
              />
              <button 
                onClick={onStartNewChat}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                title="Start new chat"
              >
                <FiPlus size={16} />
              </button>
            </div>
            {/* Blocked Candidates Icon */}
            {blockedUsers.length > 0 && (
              <button
                onClick={onToggleBlockedList}
                className="relative p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title={`Blocked Candidates (${blockedUsers.length})`}
              >
                <FiSlash size={18} className="sm:w-5 sm:h-5" />
                {blockedUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {blockedUsers.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Candidates Modal */}
        {showCandidates && (
          <ModalPortal>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Select Candidate</h3>
                <button 
                  onClick={() => onSelectCandidate(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              {/* Candidate Search */}
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search candidates by name"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              {/* Add More Favourite Candidates Button */}
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => {
                    onSelectCandidate(null);
                    navigate('/provider/all-candidates');
                  }}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <FiPlus size={16} />
                  Add favorite Candidate
                </button>
              </div>
              {/* Scrollable Candidate List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading ? (
                  <div className="p-4">
                    <LoadingState
                      title="Loading favourite candidates…"
                      subtitle="We’re gathering the candidates you’ve bookmarked so you can message them."
                      layout="card"
                    />
                  </div>
                ) : candidates.length > 0 ? (
                  candidates
                    .filter(candidate => {
                      if (!candidateSearch.trim()) return true;
                      const q = candidateSearch.toLowerCase();
                      return (candidate.fullName || '').toLowerCase().includes(q);
                    })
                    .map((candidate) => (
                      <div
                        key={candidate.id || candidate.firebase_uid}
                        onClick={() => onSelectCandidate(candidate)}
                        className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 font-semibold text-sm">
                              {candidate.fullName?.charAt(0).toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {candidate.fullName || 'Unknown Candidate'}
                            </h4>
                            {candidate.email && (
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {candidate.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-gray-500 mb-4">No favorite candidates available. Add candidates to favorites to start messaging.</p>
                    <button
                      onClick={() => {
                        onSelectCandidate(null);
                        navigate('/provider/all-candidates');
                      }}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
                    >
                      Go to All Candidates
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </ModalPortal>
        )}
        {/* Loading State */}
        {isLoading && (
          <div className="px-4 py-6">
            <LoadingState
              title="Loading candidate conversations…"
              subtitle="We’re fetching your recent chats so you can pick up where you left off."
              layout="card"
            />
          </div>
        )}

        {/* Active Candidates Section */}
        {!isLoading && filteredPeople.length > 0 && (
          <div className="mb-4">
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-700">Active Candidates</h3>
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
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {person.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      {person.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {person.unreadCount}
                        </span>
                      )}
                      {/* Online Status */}
                      {person.status === 'online' && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {person.name && !person.name.includes('undefined') && !person.name.startsWith('User ') && person.name !== 'Loading...'
                            ? person.name 
                            : 'Loading...'}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <FiClock size={12} />
                          <span>{formatLastMessageTime(person.lastMessageTime)}</span>
                        </div>
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

        {/* Inactive Candidates Section */}
        {!isLoading && filteredInactiveJobs.length > 0 && (
          <div>
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-700">Inactive Candidates</h3>
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
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 font-semibold text-sm">
                          {person.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      {person.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {person.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-500 truncate">
                          {person.name && !person.name.includes('undefined') && !person.name.startsWith('User ') && person.name !== 'Loading...'
                            ? person.name 
                            : 'Loading...'}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <FiClock size={12} />
                          <span>{formatLastMessageTime(person.lastMessageTime)}</span>
                        </div>
                      </div>
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
        {!isLoading && filteredPeople.length === 0 && filteredInactiveJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FiUser className="text-gray-300 text-4xl mb-2" />
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'No conversations found' : 'No candidate conversations yet'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-red-500 text-xs mt-2 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MessagesSidebar;