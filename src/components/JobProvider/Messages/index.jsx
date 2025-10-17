import React, { useState } from 'react';
import MessagesSidebar from './Components/MessagesSidebar';
import ChatHeader from './Components/ChatHeader';
import ChatMessages from './Components/ChatMessages';
import ChatInput from './Components/ChatInput';
import emptyMessageImg from '../../../assets/backgrounds/errorimg.svg';

const MessagesComponent = () => {
  // Test data - remove this when integrating with backend
  const testCandidates = [
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Thank you for the opportunity!',
      unreadCount: 2,
      status: 'Online'
    },
    {
      id: 2,
      name: 'Michael Chen',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'I am interested in the position',
      unreadCount: 0,
      status: 'Online'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'When can we schedule an interview?',
      unreadCount: 1,
      status: 'Offline'
    }
  ];

  const testInactiveCandidates = [
    {
      id: 4,
      name: 'David Wilson',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Position filled, thank you!',
      unreadCount: 0
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Not interested anymore',
      unreadCount: 0
    },
    {
      id: 6,
      name: 'James Brown',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Found another opportunity',
      unreadCount: 0
    },
    {
      id: 7,
      name: 'Maria Garcia',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Thank you for your time',
      unreadCount: 0
    },
    {
      id: 8,
      name: 'Robert Taylor',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Best of luck with hiring!',
      unreadCount: 0
    }
  ];

  const testMessages = [
    { id: 1, text: 'Hello! I saw your job posting and I am very interested.', isOwn: false, time: 'Today, 9:15am' },
    { id: 2, text: 'Great! Can you tell me more about your experience?', isOwn: true, time: 'Today, 9:20am' },
    { id: 3, text: 'I have 5 years of teaching experience in mathematics.', isOwn: false, time: 'Today, 9:25am' },
    { id: 4, text: 'That sounds perfect! When would you be available for an interview?', isOwn: true, time: 'Today, 9:30am', unread: true },
    { id: 5, text: 'I am available this Friday afternoon.', isOwn: false, time: 'Today, 9:35am' },
    { id: 6, text: 'Perfect! I will send you the meeting details shortly.', isOwn: true, time: 'Today, 9:40am', unread: true }
  ];

  const [selectedChat, setSelectedChat] = useState(null);
  const [candidates, setCandidates] = useState(testCandidates);
  const [inactiveCandidates, setInactiveCandidates] = useState(testInactiveCandidates);
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
        people={candidates}
        inactiveJobs={inactiveCandidates}
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
                Click on a candidate to start a conversation
              </p>

              {/* Button */}
              <button className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors">
                Start a new conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesComponent;