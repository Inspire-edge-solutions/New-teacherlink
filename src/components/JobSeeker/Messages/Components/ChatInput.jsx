import React, { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';

const ChatInput = ({ onSendMessage, onTyping, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      setIsTyping(false);
      onTyping && onTyping(false);
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
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim() && onTyping) {
      if (!isTyping) {
        setIsTyping(true);
        onTyping(true);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 3000);
    } else if (onTyping) {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
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

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Input Field */}
        <div className="flex-1">
          <input
            ref={inputRef}
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
      
      {/* Connection Status */}
      {disabled && (
        <div className="text-base text-gray-500 mt-2 text-center leading-normal tracking-tight">
          Connecting to chat server...
        </div>
      )}
    </div>
  );
};

export default ChatInput;