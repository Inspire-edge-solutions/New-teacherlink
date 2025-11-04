import React from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FiMapPin } from 'react-icons/fi';

const ChatHeader = ({ chat, isConnected = true, typingUsers = new Set() }) => {
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-semibold text-base sm:text-lg">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {chat.status === 'online' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* Chat Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{chat.name}</h3>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <p className={`text-xs sm:text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
              {chat.city && chat.state && (
                <>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <div className="flex items-center text-xs text-gray-500">
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
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Connection Indicator */}
          <div className="hidden sm:flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Menu Button */}
          <button className="text-gray-600 hover:text-gray-900 p-1 sm:p-2">
            <BsThreeDotsVertical size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
