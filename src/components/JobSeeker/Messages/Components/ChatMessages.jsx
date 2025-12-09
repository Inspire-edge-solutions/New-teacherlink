import React, { useRef, useEffect, useState } from 'react';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';

const ChatMessages = ({ messages = [], messagesEndRef, onTyping, currentUserId, onDeleteMessage, onEditMessage }) => {
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [isTyping, setIsTyping] = React.useState(false);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef?.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        onTyping && onTyping(true);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping && onTyping(false);
      }, 3000);
    } else {
      if (isTyping) {
        setIsTyping(false);
        onTyping && onTyping(false);
      }
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const messageTime = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const getMessageStatus = (message) => {
    if (message.status === 'sending') return 'Sending...';
    if (message.status === 'delivered') return 'Delivered';
    if (message.status === 'read') return 'Read';
    return '';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-rose-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-base text-gray-500 leading-normal tracking-tight">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages
            .filter(message => {
              // Filter out empty messages
              const text = message.text || message.messageText || message.message || '';
              return text.trim().length > 0;
            })
            .map((message, index) => {
              const isOwn = currentUserId && String(message.senderId) === String(currentUserId) || message.isOwn;
              
              return (
                <div
                  key={message.messageId || message.id || index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                  onMouseEnter={() => setHoveredMessageId(message.messageId || message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs md:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg relative ${
                      isOwn ? 'bg-red-100 border-2 border-red-200' : 'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <p className={`text-base break-words ${isOwn ? 'text-gray-800' : 'text-gray-800'} leading-normal tracking-tight`}>
                      {message.text || message.messageText || message.message || ''}
                      {message.isEdited && (
                        <span className={`text-base italic ml-2 ${isOwn ? 'text-gray-400' : 'text-gray-400'} leading-normal tracking-tight`}>(edited)</span>
                      )}
                    </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-base ${isOwn ? 'text-gray-500' : 'text-gray-500'} leading-normal tracking-tight`}>
                        {formatMessageTime(message.timestamp || message.time)}
                      </span>
                      {isOwn && getMessageStatus(message) && (
                        <>
                          <span className={`text-base ${isOwn ? 'text-gray-400' : 'text-gray-400'} leading-normal tracking-tight`}>
                            {getMessageStatus(message)}
                          </span>
                          {message.status === 'read' && (
                            <span className={`w-2 h-2 ${isOwn ? 'bg-blue-500' : 'bg-blue-500'} rounded-full`}></span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwn && (
                        <>
                          {/* Edit button - always visible for own messages, more prominent on hover */}
                          {onEditMessage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMessage(message.messageId || message.id);
                              }}
                              className={`${isOwn ? 'text-blue-600 hover:text-blue-700 hover:bg-pink-200' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'} transition-all p-1 rounded ${
                                hoveredMessageId === (message.messageId || message.id) 
                                  ? 'opacity-100' 
                                  : 'opacity-60 hover:opacity-100'
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
                              className={`${isOwn ? 'text-red-600 hover:text-red-700 hover:bg-pink-200' : 'text-red-500 hover:text-red-700 hover:bg-red-50'} transition-all p-1 rounded ${
                                hoveredMessageId === (message.messageId || message.id) 
                                  ? 'opacity-100' 
                                  : 'opacity-60 hover:opacity-100'
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
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-3 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-base text-gray-500 ml-2 leading-normal tracking-tight">Typing...</span>
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