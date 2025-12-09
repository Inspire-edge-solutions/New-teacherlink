import React, { useState, useEffect, useMemo } from 'react';
import MessagesSidebar from './Components/MessagesSidebar';
import ChatHeader from './Components/ChatHeader';
import ChatMessages from './Components/ChatMessages';
import ChatInput from './Components/ChatInput';
import emptyMessageImg from '../../../assets/Illustrations/No-msgs.png';
import useChat from '../../../hooks/useChat';
import { useAuth } from '../../../Context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const MessagesComponent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOrganisations, setShowOrganisations] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Ensure we always have valid values for useChat hook
  const currentUserId = user?.uid || 'temp_user_123';
  const currentUserName = user?.displayName || 'Job Seeker';
  const currentUserRole = 'jobseeker';
  
  // Initialize chat with current user data
  const {
    organisations,
    conversations,
    selectedChat,
    messages,
    isLoading,
    error,
    isConnected,
    typingUsers,
    messagesEndRef,
    selectChat,
    sendMessage,
    sendTypingIndicator,
    deleteMessage,
    confirmDelete,
    cancelDelete,
    deleteModal,
    editMessage,
    confirmEdit,
    cancelEdit,
    updateEditText,
    editModal,
    startConversation,
    loadOrganisations,
    clearError
  } = useChat(
    currentUserId, // Firebase UID
    currentUserName, // User name
    currentUserRole // User role
  );

  // Load organisations on component mount
  useEffect(() => {
    loadOrganisations();
  }, [loadOrganisations]);

  useEffect(() => {
    const state = location.state;
    
    if (!state || !state.selectedInstitute || !state.startConversation) {
      return;
    }

    const institute = state.selectedInstitute;
    let isCancelled = false;

    const timer = setTimeout(() => {
      (async () => {
        try {
          if (!isCancelled) {
            await startConversation(institute);
            setShowOrganisations(false);
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
    // Force reload messages even if it's the same chat
    selectChat(chat);
  };

  const handleSendMessage = (messageText) => {
    if (selectedChat && messageText.trim()) {
      sendMessage(
        messageText.trim(),
        selectedChat.teacherId,
        selectedChat.name
      );
    }
  };

  const handleStartNewChat = () => {
    setShowOrganisations(true);
  };

  const handleSelectOrganisation = (organisation) => {
    startConversation(organisation);
    setShowOrganisations(false);
  };

  // Transform conversations for display
  const sortedConversations = useMemo(() => {
    const list = Array.isArray(conversations) ? [...conversations] : [];
    return list.sort((a, b) => {
      const timeA = a?.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b?.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations]);

  const activeConversations = useMemo(
    () => sortedConversations.filter((conv) => conv.unreadCount > 0 || conv.lastMessage),
    [sortedConversations]
  );

  const inactiveConversations = useMemo(
    () => sortedConversations.filter((conv) => conv.unreadCount === 0 && !conv.lastMessage),
    [sortedConversations]
  );

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 leading-tight tracking-tight">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Delete Message?
              </h3>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-3 text-base leading-normal tracking-tight">
                This message will be deleted for everyone in the conversation. This action cannot be undone.
              </p>
              {deleteModal.messageText && (
                <div className="bg-gray-50 rounded-md p-3 mb-3 border border-gray-200">
                  <p className="text-base text-gray-700 italic leading-normal tracking-tight">
                    "{deleteModal.messageText}"
                  </p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors leading-normal tracking-tight"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-base font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors leading-normal tracking-tight"
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
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 leading-tight tracking-tight">
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
                className="px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors leading-normal tracking-tight"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={!editModal.messageText || editModal.messageText.trim() === ''}
                className="px-4 py-2 text-base font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed leading-normal tracking-tight"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-full min-h-0 bg-gray-50 relative overflow-hidden">
        {/* Error Display */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-xs">
            <div className="flex items-center justify-between">
              <span className="text-base leading-normal tracking-tight">{error}</span>
              <button 
                onClick={clearError}
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="fixed top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-base leading-normal tracking-tight">
            Connecting to chat...
          </div>
        )}

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
      } md:translate-x-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ease-in-out w-full md:w-80 md:flex-shrink-0 max-w-full`}>
        <MessagesSidebar
          people={activeConversations}
          inactiveJobs={inactiveConversations}
          selectedChat={selectedChat}
          onSelectChat={(chat) => {
            handleSelectChat(chat);
            setSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          organisations={organisations}
          showOrganisations={showOrganisations}
          onSelectOrganisation={handleSelectOrganisation}
          onStartNewChat={handleStartNewChat}
          isLoading={isLoading}
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
              <h3 className="text-xl font-semibold text-gray-900 truncate leading-tight tracking-tight">{selectedChat.name}</h3>
            </div>
          </div>
        )}
        {selectedChat ? (
          <>
            <ChatHeader 
              chat={selectedChat} 
              isConnected={isConnected}
              typingUsers={typingUsers}
            />
            <ChatMessages 
              messages={messages} 
              messagesEndRef={messagesEndRef}
              onTyping={sendTypingIndicator}
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
              <h2 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent mb-2 leading-tight tracking-tight">
                No Active Message
              </h2>
              <p className="text-base text-gray-500 mb-6 px-4 leading-normal tracking-tight">
                Click on the chat to see full conversation or start a new one
              </p>

              {/* Button */}
              <button 
                onClick={handleStartNewChat}
                className="bg-gradient-brand hover:bg-gradient-primary-hover text-white px-6 py-3 rounded-lg transition-colors text-base leading-normal tracking-tight"
              >
                Start a new chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MessagesComponent;