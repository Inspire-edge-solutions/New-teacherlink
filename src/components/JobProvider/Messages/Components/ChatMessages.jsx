import React, { useRef, useEffect } from 'react';

const ChatMessages = ({ messages = [] }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-3 rounded-lg relative ${
                message.isOwn
                  ? 'text-gray-800'
                  : 'text-gray-800'
              }`}
              style={{
                backgroundColor: message.isOwn ? '#F0D8D9' : '#E7E7E7'
              }}
            >
              <p className="text-sm break-words">{message.text}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  {message.time || 'Just now'}
                </span>
                {message.isOwn && message.unread && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;

