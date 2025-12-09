import React, { useState } from 'react';
import { FiUser, FiMapPin, FiSlash, FiUnlock } from 'react-icons/fi';

const ChatHeader = ({ chat, isConnected = true, typingUsers = new Set(), isBlocked = false, onBlock, onUnblock }) => {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  if (!chat) return null;

  const getStatusText = () => {
    if (typingUsers.size > 0) {
      return 'Typing...';
    }
    if (chat.status === 'online') {
      return 'Online';
    }
    if (chat.lastSeen) {
      return `Last seen ${new Date(chat.lastSeen).toLocaleTimeString()}`;
    }
    return 'Offline';
  };

  const getStatusColor = () => {
    if (typingUsers.size > 0) {
      return 'text-blue-500';
    }
    if (chat.status === 'online') {
      return 'text-green-500';
    }
    return 'text-gray-500';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-base sm:text-lg">
                {chat.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {chat.status === 'online' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* Chat Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold text-gray-900 truncate leading-tight tracking-tight">
              {chat.name && !chat.name.includes('undefined') && !chat.name.startsWith('User ') && chat.name !== 'Loading...'
                ? chat.name 
                : 'Loading...'}
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <p className={`text-base leading-normal tracking-tight ${getStatusColor()}`}>
                {getStatusText()}
              </p>
              {chat.city && chat.state && (
                <>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <div className="flex items-center text-base text-gray-500 leading-normal tracking-tight">
                    <FiMapPin size={10} className="sm:w-3 sm:h-3 mr-1" />
                    <span className="hidden sm:inline">{chat.city}, {chat.state}</span>
                    <span className="sm:hidden">{chat.city}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Connection Status & Menu */}
        <div className="flex items-center gap-1 sm:gap-2 relative flex-shrink-0">
          {/* Connection Indicator */}
          <div className="hidden sm:flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-base text-gray-500 leading-normal tracking-tight">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Block/Unblock Button */}
          {chat && (chat.teacherId || chat.studentId) && (
            <div className="relative">
              <button
                onClick={() => setShowBlockMenu(!showBlockMenu)}
                className={`p-1 sm:p-2 rounded-lg transition-colors ${
                  isBlocked 
                    ? 'text-red-500 hover:bg-red-50' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={isBlocked ? 'Unblock user' : 'Block user'}
              >
                {isBlocked ? <FiUnlock size={18} className="sm:w-5 sm:h-5" /> : <FiSlash size={18} className="sm:w-5 sm:h-5" />}
              </button>
              
              {/* Block Menu Dropdown */}
              {showBlockMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowBlockMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[180px]">
                    {isBlocked ? (
                      <button
                        onClick={() => {
                          const userId = chat.teacherId || chat.studentId;
                          if (userId && onUnblock) {
                            onUnblock(userId);
                          }
                          setShowBlockMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-base text-gray-700 hover:bg-gray-50 flex items-center gap-2 leading-normal tracking-tight"
                      >
                        <FiUnlock size={16} />
                        <span>Unblock</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const userId = chat.teacherId || chat.studentId;
                          const userName = chat.name;
                          if (userId && userName && onBlock) {
                            onBlock(userId, userName);
                          }
                          setShowBlockMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-base text-red-600 hover:bg-red-50 flex items-center gap-2 leading-normal tracking-tight"
                      >
                        <FiSlash size={16} />
                        <span>Block</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;