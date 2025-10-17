import React, { useState } from 'react';
import { FiPaperclip, FiSmile, FiImage, FiSend } from 'react-icons/fi';

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center gap-3">
        {/* Attachment Icon */}
        <button className="text-gray-500 hover:text-gray-700 p-2">
          <FiPaperclip size={20} />
        </button>

        {/* Input Field */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="type your msg here"
            className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-700">
              <FiSmile size={20} />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <FiImage size={20} />
            </button>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className={`p-3 rounded-lg transition-colors ${
            message.trim()
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;

