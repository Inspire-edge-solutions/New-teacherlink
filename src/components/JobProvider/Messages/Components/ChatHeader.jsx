import React from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';

const ChatHeader = ({ chat }) => {
  if (!chat) return null;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={chat.avatar || '/default-avatar.png'}
            alt={chat.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{chat.name}</h3>
            <p className="text-sm text-green-500">{chat.status || 'Online'}</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-900 p-2">
          <BsThreeDotsVertical size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

