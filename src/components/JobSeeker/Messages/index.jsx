import React, { useState } from 'react';
import MessagesSidebar from './Components/MessagesSidebar';
import ChatHeader from './Components/ChatHeader';
import ChatMessages from './Components/ChatMessages';
import ChatInput from './Components/ChatInput';
import emptyMessageImg from '../../../assets/backgrounds/errorimg.svg';

const MessagesComponent = () => {
  // Test data - remove this when integrating with backend
  const testPeople = [
    {
      id: 1,
      name: 'Gen......',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Hahahaha!',
      unreadCount: 0,
      status: 'Online'
    },
    {
      id: 2,
      name: 'ABC Intl........',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Kyaaaa!!!!',
      unreadCount: 0,
      status: 'Online'
    },
    {
      id: 3,
      name: 'Hiking',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: "It's just going to happen",
      unreadCount: 0,
      status: 'Offline'
    }
  ];

  const testInactiveJobs = [
    {
      id: 4,
      name: 'Anil',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Yes Sure!',
      unreadCount: 0
    },
    {
      id: 5,
      name: 'Genni',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Good!',
      unreadCount: 0
    },
    {
      id: 6,
      name: 'Mary ma am',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Great!',
      unreadCount: 0
    },
    {
      id: 7,
      name: 'Bill Gates',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'See you!',
      unreadCount: 0
    },
    {
      id: 8,
      name: 'Victoria H',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Have a nice day!',
      unreadCount: 0
    }
  ];

  const testMessages = [
    { id: 1, text: 'Hey There!', isOwn: false, time: 'Today, 8:30pm' },
    { id: 2, text: 'How are you?', isOwn: false, time: 'Today, 8:30pm' },
    { id: 3, text: 'Hello!', isOwn: true, time: 'Today, 8:33pm', unread: true },
    { id: 4, text: 'I am fine and how are you?', isOwn: true, time: 'Today, 8:34pm', unread: true },
    { id: 5, text: 'I am doing well. Can we meet tomorrow?', isOwn: false, time: 'Today, 8:36pm' },
    { id: 6, text: 'Yes Sure!', isOwn: true, time: 'Today, 8:58pm', unread: true }
  ];

  const [selectedChat, setSelectedChat] = useState(null);
  const [people, setPeople] = useState(testPeople);
  const [inactiveJobs, setInactiveJobs] = useState(testInactiveJobs);
  const [messages, setMessages] = useState([]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    // TODO: Fetch messages for selected chat from backend
    // For now, load test messages
    setMessages(testMessages);
  };

  const handleSendMessage = (messageText) => {
    // TODO: Send message to backend
    const newMessage = {
      id: Date.now(),
      text: messageText,
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: false,
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <MessagesSidebar
        people={people}
        inactiveJobs={inactiveJobs}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedChat ? (
          <>
            <ChatHeader chat={selectedChat} />
            <ChatMessages messages={messages} />
            <ChatInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          // Empty State - No Active Message
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-md px-6">
              {/* Illustration */}
              <div className="mb-6">
                <img
                  src={emptyMessageImg}
                  alt="No messages"
                  className="w-64 h-64 mx-auto"
                />
              </div>

              {/* Text */}
              <h2 className="text-2xl font-semibold text-red-500 mb-2">
                No Active Message
              </h2>
              <p className="text-gray-500 mb-6">
                Click on the chat to see full conversation
              </p>

              {/* Button */}
              <button className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors">
                Start a new chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesComponent;
