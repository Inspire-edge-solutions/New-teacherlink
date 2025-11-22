import React, { useRef, useEffect, useState } from 'react';
import { FiCheck, FiCheckCircle, FiClock, FiTrash2, FiEdit2 } from 'react-icons/fi';

const ChatMessages = ({ messages = [], messagesEndRef, onTyping, typingUsers = new Set(), currentUserId, onDeleteMessage, onEditMessage }) => {
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Debug: Log messages for troubleshooting
  useEffect(() => {
    console.log('💬 ChatMessages received messages:', messages.length);
    if (messages.length > 0) {
      console.log('💬 First message:', messages[0]);
      console.log('💬 Last message:', messages[messages.length - 1]);
      const filtered = messages.filter(message => {
        const text = message.text || message.messageText || message.message || '';
        return text.trim().length > 0;
      });
      console.log('💬 Filtered messages count:', filtered.length);
      if (filtered.length !== messages.length) {
        console.warn('⚠️ Some messages were filtered out:', messages.length - filtered.length);
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - date) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getMessageStatus = (message) => {
    if (message.status === 'sending') return { icon: FiClock, color: 'text-gray-400' };
    if (message.status === 'delivered') return { icon: FiCheck, color: 'text-gray-400' };
    if (message.status === 'read') return { icon: FiCheckCircle, color: 'text-blue-500' };
    return { icon: FiCheck, color: 'text-gray-400' };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages
            .filter(message => {
              // Filter out empty messages
              const text = message.text || message.messageText || message.message || '';
              return text.trim().length > 0;
            })
            .map((message, index) => {
            const isOwn = String(message.senderId) === String(currentUserId); // Own messages
            const statusInfo = getMessageStatus(message);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={message.id || message.messageId || index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                onMouseEnter={() => setHoveredMessageId(message.messageId || message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div
                  className={`max-w-[85%] sm:max-w-xs md:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg relative ${
                    isOwn
                      ? 'bg-red-100 text-gray-800'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="text-sm break-words">
                    {message.text || message.messageText || message.message || ''}
                    {message.isEdited && (
                      <span className="text-xs text-gray-400 italic ml-2">(edited)</span>
                    )}
                  </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.timestamp || message.time)}
                  </span>
                  <div className="flex items-center gap-2">
                    {isOwn && (
                      <>
                        <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon size={12} />
                          <span className="text-xs">
                            {message.status === 'sending' && 'Sending...'}
                            {message.status === 'delivered' && 'Delivered'}
                            {message.status === 'read' && 'Read'}
                          </span>
                          {message.status === 'read' && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full ml-1"></span>
                          )}
                        </div>
                        {/* Edit button - always visible for own messages, more prominent on hover */}
                        {onEditMessage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMessage(message.messageId || message.id);
                            }}
                            className={`text-blue-500 hover:text-blue-700 transition-all p-1 rounded hover:bg-blue-50 ${
                              hoveredMessageId === (message.messageId || message.id) 
                                ? 'opacity-100' 
                                : 'opacity-40 hover:opacity-100'
                            }`}
                            title="Edit message"
                            onMouseEnter={(e) => e.stopPropagation()}
                          >
                            <FiEdit2 size={16} />
                          </button>
                        )}
                        {/* Delete button - always visible for own messages, more prominent on hover */}
                        {onDeleteMessage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMessage(message.messageId || message.id);
                            }}
                            className={`text-red-500 hover:text-red-700 transition-all p-1 rounded hover:bg-red-50 ${
                              hoveredMessageId === (message.messageId || message.id) 
                                ? 'opacity-100' 
                                : 'opacity-40 hover:opacity-100'
                            }`}
                            title="Delete message"
                            onMouseEnter={(e) => e.stopPropagation()}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
        
        {/* Typing Indicator - Only show when someone is typing */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">Typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
