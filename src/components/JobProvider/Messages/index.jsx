import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../Context/AuthContext';
import useChat from '../../../hooks/useChat';
import MessagesSidebar from './Components/MessagesSidebar';
import ChatHeader from './Components/ChatHeader';
import ChatMessages from './Components/ChatMessages';
import ChatInput from './Components/ChatInput';
import emptyMessageImg from '../../../assets/Illustrations/No-msgs.png';

const MessagesComponent = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ensure we always have valid values for useChat hook
  const currentUserId = user?.uid || 'temp_provider_123';
  const currentUserName = user?.displayName || 'Recruiter';
  const currentUserRole = 'jobprovider';
  
  // Use the chat hook for real-time messaging
  // Always call with same structure to avoid hook order issues
  const {
    candidates,
    conversations,
    selectedChat,
    messages,
    isLoading,
    error,
    isConnected,
    typingUsers,
    selectChat,
    sendMessage,
    deleteMessage,
    confirmDelete,
    cancelDelete,
    deleteModal,
    editMessage,
    confirmEdit,
    cancelEdit,
    updateEditText,
    editModal,
    blockUser,
    confirmBlock,
    cancelBlock,
    blockModal,
    unblockUser,
    blockedUsers,
    showBlockedList,
    setShowBlockedList,
    startConversation,
    clearError
  } = useChat(currentUserId, currentUserName, currentUserRole);

  // Note: Candidates are automatically loaded by useChat hook in initializeChat

  const handleStartNewChat = () => {
    setShowCandidates(true);
  };

  const handleSelectCandidate = (candidate) => {
    if (candidate) {
      startConversation(candidate);
    }
    setShowCandidates(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const state = location.state;
    if (!state || !state.selectedCandidate || !state.startConversation) {
      return;
    }

    const candidate = state.selectedCandidate;

    let isCancelled = false;

    const timer = setTimeout(() => {
      (async () => {
        try {
          if (!isCancelled) {
            await startConversation(candidate);
            setShowCandidates(false);
            setSidebarOpen(false);
          }
        } catch (err) {
          console.error('Error starting conversation from navigation state:', err);
        } finally {
          if (!isCancelled) {
            navigate('.', { replace: true, state: {} });
          }
        }
      })();
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [location.state, startConversation, navigate]);

  const handleSelectChat = (chat) => {
    selectChat(chat);
  };

  const handleSendMessage = (messageText) => {
    if (selectedChat && messageText.trim()) {
      sendMessage(messageText);
    }
  };


  // Split conversations for sidebar sections and sort by most recent message
  const allConversations = (conversations || []).sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA; // Most recent first
  });
  
  const activeConversations = allConversations.filter(c => c.unreadCount > 0 || c.lastMessage);
  const inactiveConversations = allConversations.filter(c => c.unreadCount === 0 && !c.lastMessage);

  // Show error if any - MUST be after all hooks
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Connection Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={clearError}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Delete Message?
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-3">
                This message will be deleted for everyone in the conversation. This action cannot be undone.
              </p>
              {deleteModal.messageText && (
                <div className="bg-gray-50 rounded-md p-3 mb-3 border border-gray-200">
                  <p className="text-sm text-gray-700 italic">
                    "{deleteModal.messageText}"
                  </p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Message
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <textarea
                value={editModal.messageText}
                onChange={(e) => updateEditText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Type your message here..."
                autoFocus
              />
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={!editModal.messageText || editModal.messageText.trim() === ''}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {blockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Block User?
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-3">
                Are you sure you want to block <span className="font-semibold text-gray-900">{blockModal.userName}</span>? They won't be able to send you messages anymore.
              </p>
              <div className="bg-red-50 rounded-md p-3 mb-3 border border-red-200">
                <p className="text-sm text-red-700">
                  <strong>Note:</strong> Once blocked, this user will not be able to contact you. You can unblock them later from the blocked candidates list.
                </p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelBlock}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBlock}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full bg-gray-50 relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ease-in-out`}>
        <MessagesSidebar
          people={activeConversations}
          inactiveJobs={inactiveConversations}
          selectedChat={selectedChat}
          onSelectChat={(chat) => {
            handleSelectChat(chat);
            setSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          candidates={candidates}
          showCandidates={showCandidates}
          onSelectCandidate={handleSelectCandidate}
          onStartNewChat={handleStartNewChat}
          isLoading={isLoading}
          blockedUsers={blockedUsers}
          showBlockedList={showBlockedList}
          onToggleBlockedList={() => setShowBlockedList(!showBlockedList)}
          onUnblock={unblockUser}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 w-full md:w-auto">
          {/* Mobile Header with Menu Button */}
          {selectedChat && (
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-600 hover:text-gray-900 p-2"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{selectedChat.name}</h3>
              </div>
            </div>
          )}
        {selectedChat ? (
          <>
            <ChatHeader 
              chat={selectedChat} 
              isConnected={isConnected}
              typingUsers={typingUsers}
              isBlocked={selectedChat?.isBlocked || false}
              onBlock={blockUser}
              onUnblock={unblockUser}
            />
            <ChatMessages 
              messages={messages} 
              messagesEndRef={messagesEndRef}
              typingUsers={typingUsers}
              currentUserId={user?.uid}
              onDeleteMessage={deleteMessage}
              onEditMessage={editMessage}
            />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={!isConnected}
            />
          </>
        ) : (
          // Empty State - No Active Message
          <div className="flex-1 flex items-center justify-center bg-white px-4 relative">
            {/* Mobile Menu Button when no chat selected - positioned at top-left */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden absolute top-4 left-4 text-gray-600 hover:text-gray-900 p-2 z-10"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="text-center max-w-md w-full">
              {/* Illustration */}
              <div className="mb-6">
                <img
                  src={emptyMessageImg}
                  alt="No messages"
                  className="w-48 h-48 sm:w-64 sm:h-64 mx-auto"
                />
              </div>

              {/* Text */}
              <h2 className="text-xl sm:text-2xl font-semibold text-red-500 mb-2">
                No Active Message
              </h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 px-4">
                {isConnected 
                  ? "Click on a candidate to start a conversation"
                  : "Connecting to chat server..."
                }
              </p>

              {/* Connection Status */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs sm:text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MessagesComponent;