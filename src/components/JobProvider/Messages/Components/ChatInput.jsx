import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiWifi, FiWifiOff } from 'react-icons/fi';

const ChatInput = ({ onSendMessage, disabled = false, onTyping }) => {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Send typing indicator
    if (onTyping) {
      onTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      {/* Connection Status */}
      {disabled && (
        <div className="mb-3 flex items-center justify-center gap-2 text-base text-gray-500 leading-normal tracking-tight">
          <FiWifiOff size={14} className="sm:w-4 sm:h-4" />
          <span>Connecting to chat server...</span>
        </div>
      )}
      
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Input Field */}
        <div className="flex-1">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Connecting..." : "Type your message here"}
            disabled={disabled}
            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base leading-normal tracking-tight ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0 ${
            message.trim() && !disabled
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FiSend size={18} className="sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
