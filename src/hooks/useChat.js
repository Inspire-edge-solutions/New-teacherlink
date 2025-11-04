import { useState, useEffect, useCallback, useRef } from 'react';
import chatApiService from '../services/chatApi';

const useChat = (currentUserId, currentUserName, currentUserRole) => {
  const [organisations, setOrganisations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, messageId: null, messageText: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, messageId: null, messageText: '', originalText: '' });
  const [blockModal, setBlockModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showBlockedList, setShowBlockedList] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(null);
  
  // Keep ref in sync with selectedChat state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // ================================
  // Initialize Chat
  // ================================

  // ================================
  // Data Loading
  // ================================

  const loadOrganisations = async () => {
    try {
      // For job seekers, use favrouteJobs API to filter organizations
      if (currentUserRole === 'jobseeker') {
        const orgs = await chatApiService.getOrganisationsForJobSeeker(currentUserId);
        setOrganisations(orgs);
      } else {
        const orgs = await chatApiService.getOrganisations();
        setOrganisations(orgs);
      }
    } catch (err) {
      console.error('Error loading organisations:', err);
      setError('Failed to load organisations');
      // Set empty array on error for job seekers
      if (currentUserRole === 'jobseeker') {
        setOrganisations([]);
      }
    }
  };

  const loadCandidates = useCallback(async () => {
    try {
      // For job providers, use favrouteUsers API to filter candidates
      if (currentUserRole === 'jobprovider') {
        const cands = await chatApiService.getCandidatesForJobProvider(currentUserId);
        setCandidates(cands);
      }
    } catch (err) {
      console.error('Error loading candidates:', err);
      setError('Failed to load candidates');
      // Set empty array on error for job providers
      if (currentUserRole === 'jobprovider') {
        setCandidates([]);
      }
    }
  }, [currentUserId, currentUserRole]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Set current user in API service
      chatApiService.setCurrentUser(currentUserId, currentUserName, currentUserRole);

      // Connect WebSocket
      chatApiService.connectWebSocket(currentUserId, currentUserRole, currentUserName);

      // Load organisations/candidates, conversations, and blocked users
      const loadPromises = [
        loadConversations(),
        loadBlockedUsers()
      ];
      
      // Load organisations for job seekers, candidates for job providers
      if (currentUserRole === 'jobseeker') {
        loadPromises.push(loadOrganisations());
      } else if (currentUserRole === 'jobprovider') {
        loadPromises.push(loadCandidates());
      }
      
      await Promise.all(loadPromises);

    } catch (err) {
      console.error('Error initializing chat:', err);
      setError('Failed to initialize chat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId && currentUserName && currentUserRole) {
      initializeChat();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
    
    // Do not force-disconnect on unmount in dev to avoid React StrictMode double-invoke
    // Cleanup can be handled at route change or manual logout
    return () => {};
  }, [currentUserId, currentUserName, currentUserRole]);

  const loadConversations = async () => {
    try {
      console.log('Loading conversations for user:', currentUserId);
      const data = await chatApiService.getConversations(currentUserId);
      let convs = data.conversations || [];
      
      // Normalize conversations: ensure conversationId is set (use id as fallback)
      // Also extract teacherId/studentId from conversationId if missing
      convs = convs.map(c => {
        const conversationId = c.conversationId || c.id;
        let teacherId = c.teacherId || c.receiverId || c.senderId;
        let studentId = c.studentId || c.receiverId || c.senderId;
        
        // Extract IDs from conversationId format: conv_userId1_userId2
        if (conversationId && (!teacherId || !studentId)) {
          const convMatch = conversationId.match(/conv_([^_]+)_(.+)/);
          if (convMatch) {
            const id1 = convMatch[1];
            const id2 = convMatch[2];
            // Determine which is the other user (not current user)
            const otherId = String(id1) === String(currentUserId) ? id2 : id1;
            if (!teacherId) teacherId = otherId;
            if (!studentId) studentId = otherId;
          }
        }
        
        return {
          ...c,
          conversationId,
          teacherId,
          studentId
        };
      });
      
      console.log('Conversations from API:', convs.length, convs);
      
      // Immediately fetch names for conversations that need it
      const convsNeedingNames = convs.filter(c => {
        const userId = c.teacherId || c.studentId;
        return userId && (!c.name || c.name.includes('undefined') || c.name.startsWith('User '));
      });
      
      if (convsNeedingNames.length > 0) {
        console.log('🚀 Immediately fetching names for', convsNeedingNames.length, 'conversations');
        const userIdsToFetch = convsNeedingNames
          .map(c => c.teacherId || c.studentId)
          .filter(Boolean);
        
        // Fetch names in parallel
        Promise.all(
          userIdsToFetch.map(userId => 
            chatApiService.getUserName(userId).then(name => ({ userId, name })).catch(err => {
              console.error(`Error fetching name for ${userId}:`, err);
              return { userId, name: null };
            })
          )
        ).then(nameResults => {
          const nameMap = {};
          nameResults.forEach(({ userId, name }) => {
            if (name && !name.includes('undefined')) {
              nameMap[userId] = name;
            }
          });
          
          console.log('✅ Names fetched:', nameMap);
          
          // Update conversations with fetched names
          setConversations(prev => prev.map(c => {
            const userId = c.teacherId || c.studentId;
            if (userId && nameMap[userId]) {
              return { ...c, name: nameMap[userId] };
            }
            return c;
          }));
        });
      }

      // Get unread counts and merge with conversations
      // This ensures accurate unread counts from backend
      let unreadCounts = {};
      let fallbackConvs = [];
      try {
        console.log('📊 Fetching unread counts from backend...');
        const unreadData = await chatApiService.getUnreadCounts(currentUserId);
        unreadCounts = unreadData.unreadCounts || {};
        console.log('📊 Unread counts received:', unreadCounts);
        
        // Update conversations with unread counts from backend
        convs = convs.map(conv => {
          const convId = conv.conversationId || conv.id;
          const backendUnreadCount = unreadCounts[convId] || 0;
          // Always use backend unread count as source of truth
          return {
            ...conv,
            unreadCount: backendUnreadCount
          };
        });
        
        const conversationIds = Object.keys(unreadCounts);
        console.log('Found conversation IDs from unread counts:', conversationIds.length);

        // Create a set of existing conversation IDs
        const existingConvIds = new Set(convs.map(c => c.conversationId || c.id));

        // Fetch conversations that aren't already in the list
        const newConversationIds = conversationIds.filter(id => !existingConvIds.has(id));
        console.log('New conversation IDs to fetch:', newConversationIds.length);

        if (newConversationIds.length > 0) {
          const fetched = await Promise.all(
            newConversationIds.slice(0, 20).map(async (conversationId) => {
              try {
                const msgRes = await chatApiService.getMessages(conversationId, 1);
                const lastMsg = (msgRes.messages || []).slice(-1)[0];
                if (!lastMsg) {
                  console.log('No messages found for conversation:', conversationId);
                  return null;
                }
                
                console.log('Last message for conversation:', conversationId, lastMsg);
                
                // Determine other user ID
                let otherId = null;
                if (lastMsg.senderId && lastMsg.receiverId) {
                  otherId = String(lastMsg.senderId) === String(currentUserId)
                    ? lastMsg.receiverId
                    : lastMsg.senderId;
                } else if (lastMsg.senderId && String(lastMsg.senderId) !== String(currentUserId)) {
                  otherId = lastMsg.senderId;
                } else if (lastMsg.receiverId && String(lastMsg.receiverId) !== String(currentUserId)) {
                  otherId = lastMsg.receiverId;
                }
                
                // Try to extract from conversationId if otherId is still null
                if (!otherId) {
                  const convMatch = conversationId.match(/conv_([^_]+)_(.+)/);
                  if (convMatch) {
                    const id1 = convMatch[1];
                    const id2 = convMatch[2];
                    otherId = String(id1) === String(currentUserId) ? id2 : id1;
                  }
                }
                
                if (!otherId) {
                  console.error('Could not determine other user ID for conversation:', conversationId, lastMsg);
                  return null;
                }
                
                // Fetch name from login API if not provided
                let otherName = String(lastMsg.senderId) === String(currentUserId)
                  ? (lastMsg.receiverName || null)
                  : (lastMsg.senderName || null);
                
                if (!otherName && otherId) {
                  try {
                    otherName = await chatApiService.getUserName(otherId);
                  } catch (err) {
                    console.error('Error fetching user name:', err);
                    otherName = otherId && typeof otherId === 'string' 
                      ? `User ${otherId.substring(0, 8)}` 
                      : `User ${otherId}`;
                  }
                }
                
                // Final fallback for name
                if (!otherName && otherId) {
                  otherName = typeof otherId === 'string' 
                    ? `User ${otherId.substring(0, 8)}` 
                    : `User ${String(otherId)}`;
                }
                
                // If name is not valid, fetch it immediately
                if (!otherName || otherName.includes('undefined') || otherName.startsWith('User ')) {
                  try {
                    console.log('🔄 Fetching name for otherId:', otherId);
                    otherName = await chatApiService.getUserName(otherId);
                    console.log('✅ Fetched name:', otherName);
                  } catch (err) {
                    console.error('Error fetching name:', err);
                    otherName = null;
                  }
                }
                
                // Final fallback
                const finalName = (otherName && !otherName.includes('undefined') && !otherName.startsWith('User '))
                  ? otherName
                  : `Loading...`; // Show loading instead of User undefined
                
                return {
                  id: conversationId,
                  conversationId,
                  name: finalName,
                  teacherId: otherId, // For JobProvider, this is JobSeeker ID; for JobSeeker, this is JobProvider ID
                  studentId: otherId, // Also set studentId for consistency
                  lastMessage: lastMsg.text || lastMsg.messageText || '',
                  lastMessageTime: lastMsg.timestamp || lastMsg.time,
                  lastMessageId: lastMsg.messageId || lastMsg.id,
                  unreadCount: unreadCounts[conversationId] || 0, // Use backend unread count
                  status: 'offline',
                };
              } catch (err) {
                console.error('Error fetching conversation:', conversationId, err);
                return null;
              }
            })
          );

          fallbackConvs = fetched.filter(Boolean);
          console.log('Additional conversations from fallback:', fallbackConvs.length);
        }

        // Update unread counts for existing conversations
        convs = convs.map(c => {
          const convId = c.conversationId || c.id;
          if (unreadCounts[convId] !== undefined) {
            return { ...c, unreadCount: unreadCounts[convId] };
          }
          return c;
        });
      } catch (fallbackErr) {
        console.error('Fallback check failed:', fallbackErr);
      }

      // Merge conversations from both sources
      convs = [...convs, ...fallbackConvs];
      
      // Normalize all conversations: ensure conversationId is set (use id as fallback)
      convs = convs.map(c => ({
        ...c,
        conversationId: c.conversationId || c.id
      }));
      
      console.log('Total conversations after merge:', convs.length);

      // Fetch names for all conversations that are missing names or have undefined
      // For JobProvider, teacherId is actually the JobSeeker's ID
      // For JobSeeker, teacherId is the JobProvider's ID
      const missingNames = convs.filter(c => {
        const userId = c.teacherId || c.studentId;
        // Also try to extract from conversationId if missing
        if (!userId && c.conversationId) {
          const convMatch = c.conversationId.match(/conv_([^_]+)_(.+)/);
          if (convMatch) {
            const id1 = convMatch[1];
            const id2 = convMatch[2];
            const otherId = String(id1) === String(currentUserId) ? id2 : id1;
            c.teacherId = otherId;
            c.studentId = otherId;
          }
        }
        return (c.teacherId || c.studentId) && (
          !c.name || 
          c.name === 'User undefined' || 
          c.name.includes('undefined') ||
          c.name === `User ${c.teacherId}` ||
          c.name === `User ${c.studentId}` ||
          c.name === 'Loading...' ||
          (c.name && c.name.startsWith('User ') && c.name.length < 20) // Likely a placeholder
        );
      });

      console.log('🔍 Conversations needing name resolution:', missingNames.length);
      if (missingNames.length > 0) {
        console.log('🔍 Missing names conversations:', missingNames.map(c => ({
          id: c.id,
          conversationId: c.conversationId,
          teacherId: c.teacherId,
          studentId: c.studentId,
          name: c.name
        })));
      }

      if (missingNames.length > 0) {
        try {
          // Collect all unique user IDs that need name resolution
          const userIdsToFetch = [];
          missingNames.forEach(c => {
            const userId = c.teacherId || c.studentId;
            if (userId && typeof userId === 'string' && userId.trim() && !userIdsToFetch.includes(userId)) {
              userIdsToFetch.push(userId);
            }
          });

          console.log('📞 Fetching names from login API for user IDs:', userIdsToFetch);
          if (userIdsToFetch.length > 0) {
            const nameMap = await chatApiService.getUserNames(userIdsToFetch);
            console.log('✅ Name map received:', nameMap);
            
            // Update conversations with fetched names
            convs = convs.map(c => {
              const userId = c.teacherId || c.studentId;
              if (userId && nameMap[userId]) {
                const newName = nameMap[userId];
                if (newName && !newName.includes('undefined') && newName !== 'User undefined' && !newName.startsWith('User ')) {
                  console.log(`✅ Updating conversation name: "${c.name}" -> "${newName}" for userId: ${userId}`);
                  return { ...c, name: newName };
                }
              }
              return c;
            });
          } else {
            console.warn('⚠️ No user IDs to fetch - userIdsToFetch is empty');
          }
          
          // For any remaining missing names, fetch individually as fallback (in parallel)
          const remainingMissing = convs.filter(c => {
            const userId = c.teacherId || c.studentId;
            return userId && (!c.name || c.name.includes('undefined') || c.name.startsWith('User ') || c.name === 'Loading...');
          });
          
          if (remainingMissing.length > 0) {
            console.log('🔄 Fetching remaining names individually:', remainingMissing.length);
            Promise.all(
              remainingMissing.map(c => {
                const userId = c.teacherId || c.studentId;
                return chatApiService.getUserName(userId).then(name => {
                  if (name && !name.includes('undefined') && !name.startsWith('User ')) {
                    console.log(`✅ Individual fetch: Got name "${name}" for userId: ${userId}`);
                    setConversations(prev => prev.map(conv => 
                      ((conv.teacherId === userId || conv.studentId === userId) && (conv.id === c.id || conv.conversationId === c.conversationId))
                        ? { ...conv, name }
                        : conv
                    ));
                  }
                }).catch(err => {
                  console.error(`❌ Error fetching individual user name for ${userId}:`, err);
                });
              })
            );
          }
        } catch (err) {
          console.error('❌ Error fetching user names:', err);
          // Try individual fetching as fallback (in parallel)
          Promise.all(
            missingNames.map(c => {
              const userId = c.teacherId || c.studentId;
              if (userId) {
                return chatApiService.getUserName(userId).then(name => {
                  if (name && !name.includes('undefined')) {
                    setConversations(prev => prev.map(conv => 
                      ((conv.teacherId === userId || conv.studentId === userId) && (conv.id === c.id || conv.conversationId === c.conversationId))
                        ? { ...conv, name }
                        : conv
                    ));
                  }
                }).catch(err => {
                  console.error(`❌ Fallback error for ${userId}:`, err);
                });
              }
            })
          );
        }
      }

      console.log('Final conversations to display:', convs.length, convs);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    }
  };

  const loadMessages = useCallback(async (conversationId) => {
    try {
      console.log('📥 loadMessages CALLED for conversationId:', conversationId);
      console.log('📥 Current user ID:', currentUserId);
      
      if (!conversationId) {
        console.error('❌ No conversationId provided to loadMessages');
        setMessages([]);
        return;
      }
      
      console.log('📥 Fetching messages from API...');
      const data = await chatApiService.getMessages(conversationId);
      console.log('📥 API response received:', data);
      
      const loadedMessages = data.messages || data || [];
      console.log('📥 Loaded messages count:', loadedMessages.length);
      console.log('📥 Loaded messages raw data:', loadedMessages);
      
      if (loadedMessages.length === 0) {
        console.warn('⚠️ No messages found for conversation:', conversationId);
      }
      
      // Get blocked user IDs for filtering
      const blockedIds = new Set(blockedUsers.map(b => String(b.blockedUserId)));
      
      // Set messages, ensuring proper formatting
      // DynamoDB messages might have SK as messageId
      const formattedMessages = loadedMessages
        .filter((msg) => {
          // Filter out METADATA records and conversation metadata first
          const messageId = msg.SK || msg.messageId || msg.id;
          if (!messageId || messageId === 'METADATA' || messageId.startsWith('METADATA') || (msg.PK?.startsWith('CONV#') && msg.SK === 'METADATA')) {
            // This is a metadata record, not an actual message - skip it silently
            return false;
          }
          // Must have a valid SK that starts with MSG# to be a real message
          if (msg.SK && !msg.SK.startsWith('MSG#')) {
            return false;
          }
          return true;
        })
        .map((msg, idx) => {
          // Log raw message to see what fields are available
          console.log(`📥 Raw message ${idx}:`, msg);
          
          const formatted = {
            messageId: msg.SK || msg.messageId || msg.id || `msg_${idx}_${Date.now()}`,
            conversationId: msg.conversationId || conversationId,
            senderId: msg.senderId || msg.senderFirebaseUid,
            senderName: msg.senderName || msg.sender,
            receiverId: msg.receiverId || msg.receiverFirebaseUid,
            receiverName: msg.receiverName || msg.receiver,
            text: msg.text || msg.messageText || msg.message || msg.messageText || '',
            timestamp: msg.timestamp || msg.time || msg.createdAt || new Date().toISOString(),
            status: msg.status || 'delivered',
            isOwn: currentUserId && String(msg.senderId || msg.senderFirebaseUid) === String(currentUserId)
          };
          console.log(`📥 Formatted message ${idx}:`, formatted);
          return formatted;
        })
        .filter(msg => {
          // Filter out empty messages
          const text = msg.text || msg.messageText || msg.message || '';
          const hasText = text.trim().length > 0;
          if (!hasText) {
            console.warn('⚠️ Filtering out empty message:', msg);
            return false;
          }
          
          // Filter out messages from blocked users
          const msgSenderId = msg.senderId || msg.senderFirebaseUid;
          const isBlockedSender = msgSenderId && blockedIds.has(String(msgSenderId));
          
          if (isBlockedSender) {
            console.log('🚫 Filtering out message from blocked user:', msgSenderId);
            return false;
          }
          
          return true;
        })
        .map(msg => {
          // Fetch missing sender names from login API
          if (!msg.senderName && msg.senderId && msg.senderId !== currentUserId) {
            console.log('📝 Fetching sender name for message:', msg.senderId);
            chatApiService.getUserName(msg.senderId).then(name => {
              setMessages(prev => prev.map(m => 
                m.messageId === msg.messageId && !m.senderName
                  ? { ...m, senderName: name }
                  : m
              ));
            }).catch(err => {
              console.error('Error fetching sender name:', err);
            });
          }
          return msg;
        });
      
      console.log('✅ Setting messages to state. Count:', formattedMessages.length);
      console.log('✅ Formatted messages array:', formattedMessages);
      setMessages(formattedMessages);
      
      // Also log after setting to verify state update
      setTimeout(() => {
        console.log('✅ Messages state should now contain:', formattedMessages.length, 'messages');
      }, 100);
      
      // Update conversation list with the most recent message after loading
      if (formattedMessages.length > 0) {
        // Sort messages by timestamp to get the latest one
        const sortedMessages = [...formattedMessages].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        const latestMessage = sortedMessages[0];
        
        // Update conversation with the latest message (which might be sent or received)
        if (latestMessage) {
          updateConversationWithMessage(latestMessage);
        }
      }
      
      // Mark messages as read when loading messages for a conversation
      if (formattedMessages.length > 0) {
        console.log('📖 Marking messages as read for conversation:', conversationId);
        try {
          await chatApiService.markMessagesAsRead(conversationId, currentUserId);
          console.log('✅ Messages marked as read successfully');
          
          // IMPORTANT: Refresh unread counts after marking as read
          // This updates the conversation list to show correct unread count (should be 0)
          setTimeout(async () => {
            try {
              console.log('🔄 Refreshing unread counts after marking as read...');
              const unreadData = await chatApiService.getUnreadCounts(currentUserId);
              const unreadCounts = unreadData.unreadCounts || {};
              console.log('📊 Updated unread counts:', unreadCounts);
              
              // Update conversation list with new unread counts
              setConversations(prev => prev.map(conv => {
                const convId = conv.conversationId || conv.id;
                const newUnreadCount = unreadCounts[convId] || 0;
                if (convId === conversationId && conv.unreadCount !== newUnreadCount) {
                  console.log(`✅ Updating unread count for conversation ${convId}: ${conv.unreadCount} -> ${newUnreadCount}`);
                }
                return {
                  ...conv,
                  unreadCount: newUnreadCount
                };
              }));
            } catch (err) {
              console.error('Error refreshing unread counts:', err);
            }
          }, 800);
          
          // Also refresh messages after marking as read to get updated statuses
          setTimeout(async () => {
            try {
              const refreshData = await chatApiService.getMessages(conversationId);
              const refreshMessages = refreshData.messages || refreshData || [];
              const refreshFormatted = refreshMessages
                .filter(msg => {
                  const text = msg.text || msg.messageText || msg.message || '';
                  return text.trim().length > 0;
                })
                .map(msg => ({
                  messageId: msg.SK || msg.messageId || msg.id,
                  conversationId: msg.conversationId || conversationId,
                  senderId: msg.senderId || msg.senderFirebaseUid,
                  senderName: msg.senderName || msg.sender,
                  receiverId: msg.receiverId || msg.receiverFirebaseUid,
                  receiverName: msg.receiverName || msg.receiver,
                  text: msg.text || msg.messageText || msg.message || '',
                  timestamp: msg.timestamp || msg.time || msg.createdAt || new Date().toISOString(),
                  status: msg.status || 'delivered',
                  isOwn: currentUserId && String(msg.senderId || msg.senderFirebaseUid) === String(currentUserId)
                }));
              
              // Update conversation list with the most recent message from refresh
              if (refreshFormatted.length > 0) {
                const sortedRefresh = [...refreshFormatted].sort((a, b) => 
                  new Date(b.timestamp) - new Date(a.timestamp)
                );
                const latestRefreshMessage = sortedRefresh[0];
                if (latestRefreshMessage) {
                  updateConversationWithMessage(latestRefreshMessage);
                }
              }
              
              // Update messages with latest statuses (especially read status)
              setMessages(prev => {
                const merged = prev.map(prevMsg => {
                  const latest = refreshFormatted.find(latestMsg => 
                    latestMsg.messageId === prevMsg.messageId ||
                    (prevMsg.messageId.startsWith('temp_') && 
                     latestMsg.text === prevMsg.text &&
                     Math.abs(new Date(latestMsg.timestamp) - new Date(prevMsg.timestamp)) < 2000)
                  );
                  if (latest) {
                    return { ...prevMsg, status: latest.status };
                  }
                  return prevMsg;
                });
                
                // Add any new messages from refresh that weren't in prev
                refreshFormatted.forEach(latestMsg => {
                  if (!merged.some(m => m.messageId === latestMsg.messageId)) {
                    merged.push(latestMsg);
                  }
                });
                
                return merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              });
            } catch (err) {
              console.error('Error refreshing messages after mark read:', err);
            }
          }, 500);
        } catch (err) {
          console.error('❌ Error marking messages as read:', err);
        }
      }
    } catch (err) {
      console.error('❌ Error loading messages:', err);
      console.error('❌ Error details:', err.message, err.stack);
      setError('Failed to load messages');
      setMessages([]); // Clear messages on error
    }
  }, [currentUserId]);

  // ================================
  // WebSocket Event Handlers
  // ================================

  useEffect(() => {
    // Check connection status immediately and set up periodic check
    const checkConnection = () => {
      if (!chatApiService.ws) {
        setIsConnected(false);
        // Try to reconnect if we have user info
        if (currentUserId && currentUserRole && currentUserName) {
          console.log('🔄 No WebSocket found, attempting to connect...');
          chatApiService.connectWebSocket(currentUserId, currentUserRole, currentUserName);
        }
        return;
      }
      
      const wsState = chatApiService.ws.readyState;
      const isWsOpen = wsState === WebSocket.OPEN;
      setIsConnected(isWsOpen);
      
      if (!isWsOpen && wsState !== WebSocket.CONNECTING && currentUserId && currentUserRole && currentUserName) {
        // Attempt to reconnect if not already connecting
        console.log('🔄 Connection lost (state:', wsState, '), attempting reconnect...');
        chatApiService.connectWebSocket(currentUserId, currentUserRole, currentUserName);
      }
    };
    
    // Check immediately
    checkConnection();
    
    // Set up periodic connection check (every 3 seconds for faster detection)
    const connectionCheckInterval = setInterval(checkConnection, 3000);
    
    const handleConnected = () => {
      setIsConnected(true);
      console.log('✅ Chat connected - status updated');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      console.log('⚠️ Chat disconnected - status updated');
      // Try to reconnect automatically
      if (currentUserId && currentUserRole && currentUserName) {
        setTimeout(() => {
          console.log('🔄 Attempting auto-reconnect after disconnect...');
          chatApiService.connectWebSocket(currentUserId, currentUserRole, currentUserName);
        }, 2000);
      }
    };

    const handleNewMessage = (message) => {
      console.log('MSG RECEIVED VIA WEBSOCKET!');
      console.log('🔥 Raw message object:', JSON.stringify(message, null, 2));
      console.log('🔥 Message conversationId:', message.conversationId);
      console.log('🔥 Message senderId:', message.senderId);
      console.log('🔥 Message text:', message.text || message.messageText || message.message);
      console.log('🔥 Current user ID:', currentUserId);
      console.log('🔥 Current selectedChat:', selectedChatRef.current);
      
      // Filter out empty messages immediately
      const messageText = message.text || message.messageText || message.message || '';
      if (!messageText || !messageText.trim()) {
        console.warn('⚠️ Skipping empty message:', message);
        return;
      }
      
      console.log('✅ Message has text:', messageText);
      
      // Check if sender is blocked - use current blockedUsers state
      const senderId = message.senderId || message.senderFirebaseUid;
      const currentBlockedIds = new Set(blockedUsers.map(b => String(b.blockedUserId)));
      const isBlockedSender = senderId && currentBlockedIds.has(String(senderId));
      if (isBlockedSender) {
        console.log('🚫 Message from blocked user ignored:', senderId);
        return;
      }
      
      // Ensure message has proper format
      const formattedMessage = {
        messageId: message.messageId || message.id || `msg_${Date.now()}`,
        conversationId: message.conversationId,
        senderId: senderId,
        senderName: message.senderName || message.sender,
        receiverId: message.receiverId || message.receiverFirebaseUid,
        receiverName: message.receiverName || message.receiver,
        text: messageText.trim(),
        timestamp: message.timestamp || message.time || new Date().toISOString(),
        status: message.status || 'delivered',
        isOwn: currentUserId && String(senderId) === String(currentUserId)
      };
      
      console.log('✅ Formatted message:', formattedMessage);
      
      // Always update conversation list FIRST (this shows the message in sidebar immediately)
      updateConversationWithMessage(formattedMessage);
      
      // Refresh unread counts after receiving a new message to keep counts accurate
      // This is especially important for messages from other users
      setTimeout(async () => {
        try {
          const unreadData = await chatApiService.getUnreadCounts(currentUserId);
          const unreadCounts = unreadData.unreadCounts || {};
          console.log('📊 Updated unread counts after new message:', unreadCounts);
          
          // Update conversation list with new unread counts
          setConversations(prev => prev.map(conv => {
            const convId = conv.conversationId || conv.id;
            const newUnreadCount = unreadCounts[convId] || 0;
            return {
              ...conv,
              unreadCount: newUnreadCount
            };
          }));
        } catch (err) {
          console.error('Error refreshing unread counts after new message:', err);
        }
      }, 500);
      
      // Get current selectedChat synchronously using ref (avoids stale closures)
      // We need to check if this message belongs to the currently selected conversation
      const currentSelectedChat = selectedChatRef.current;
      setMessages(prevMessages => {
        // Get conversation ID from ref (always latest value)
        const currentConversationId = currentSelectedChat?.conversationId || currentSelectedChat?.id;
        const messageConversationId = formattedMessage.conversationId;
        
        // Normalize conversation IDs for comparison (handle string/number mismatches)
        const normalizedCurrentId = currentConversationId ? String(currentConversationId).trim() : null;
        const normalizedMessageId = messageConversationId ? String(messageConversationId).trim() : null;
        
        // Enhanced conversation ID matching - try multiple formats
        let isCurrentConversation = false;
        if (normalizedCurrentId && normalizedMessageId) {
          // Exact match
          if (normalizedCurrentId === normalizedMessageId) {
            isCurrentConversation = true;
          }
          // Match without 'conv_' prefix
          else if (normalizedCurrentId.replace(/^conv_/, '') === normalizedMessageId.replace(/^conv_/, '')) {
            isCurrentConversation = true;
          }
          // Extract IDs from conversation format (conv_userId1_userId2)
          else {
            const currentParts = normalizedCurrentId.replace(/^conv_/, '').split('_');
            const messageParts = normalizedMessageId.replace(/^conv_/, '').split('_');
            // Check if both contain the same user IDs (order might differ)
            if (currentParts.length === 2 && messageParts.length === 2) {
              const currentSet = new Set(currentParts);
              const messageSet = new Set(messageParts);
              if (currentSet.size === messageSet.size && 
                  [...currentSet].every(id => messageSet.has(id))) {
                isCurrentConversation = true;
              }
            }
          }
        }
        
        console.log('📨 Conversation matching:', {
          currentConversationId: normalizedCurrentId,
          messageConversationId: normalizedMessageId,
          isCurrentConversation,
          selectedChatExists: !!currentSelectedChat
        });
        
        // Clear typing indicator if message is for current conversation
        if (isCurrentConversation && formattedMessage.senderId !== currentUserId) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(formattedMessage.senderId);
            return newSet;
          });
        }
        
        // ALWAYS add message if conversation matches OR if it's for the current user
        // This ensures messages appear in real-time regardless of which side sent them
        if (isCurrentConversation) {
          console.log('📨✅ MATCHED! Adding message to active conversation view.');
          console.log('📨 Current conversation ID:', normalizedCurrentId);
          console.log('📨 Message conversation ID:', normalizedMessageId);
          console.log('📨 Message details:', {
            text: formattedMessage.text.substring(0, 50),
            senderId: formattedMessage.senderId,
            messageId: formattedMessage.messageId,
            timestamp: formattedMessage.timestamp
          });
          
          // Check if message already exists (avoid duplicates)
          const messageExists = prevMessages.some(m => {
            // Check by messageId first (most reliable)
            if (m.messageId && formattedMessage.messageId && 
                String(m.messageId) === String(formattedMessage.messageId)) {
              return true;
            }
            // Check by text + sender + timestamp (for optimistic messages)
            if (m.text === formattedMessage.text && 
                m.senderId === formattedMessage.senderId) {
              const timeDiff = Math.abs(
                new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()
              );
              if (timeDiff < 5000) { // 5 second window for duplicates
                return true;
              }
            }
            return false;
          });
          
          if (messageExists) {
            console.log('🔄 Message already exists, updating status and ensuring it\'s visible');
            // Update existing message (might be an optimistic message that now has real ID)
            const updated = prevMessages.map(m => {
              const isMatch = 
                (m.messageId && formattedMessage.messageId && String(m.messageId) === String(formattedMessage.messageId)) ||
                (m.text === formattedMessage.text && 
                 m.senderId === formattedMessage.senderId && 
                 Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()) < 5000);
              
              if (isMatch) {
                // Merge with new data, keeping optimistic fields if needed
                return { 
                  ...m, 
                  ...formattedMessage, 
                  status: formattedMessage.status || m.status || 'delivered'
                };
              }
              return m;
            });
            
            // Force scroll to ensure visibility
            setTimeout(() => scrollToBottom(), 100);
            
            // Fetch sender name if missing (async, won't block UI)
            if (!formattedMessage.senderName && formattedMessage.senderId && formattedMessage.senderId !== currentUserId) {
              chatApiService.getUserName(formattedMessage.senderId).then(name => {
                if (name && !name.includes('undefined')) {
                  setMessages(current => current.map(m => 
                    m.messageId === formattedMessage.messageId && !m.senderName
                      ? { ...m, senderName: name }
                      : m
                  ));
                }
              }).catch(err => {
                console.error('Error fetching sender name:', err);
              });
            }
            
            return updated;
          }
          
          console.log('✨ NEW MESSAGE! Adding to chat view immediately.');
          console.log('✨ Previous message count:', prevMessages.length);
          
          // Add new message - create new array to ensure React detects the change
          const updatedMessages = [...prevMessages, formattedMessage].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          console.log('✨ New message count:', updatedMessages.length);
          console.log('✨ Message added successfully:', formattedMessage.text.substring(0, 50));
          
          // Fetch sender name if missing (async, won't block UI)
          if (!formattedMessage.senderName && formattedMessage.senderId && formattedMessage.senderId !== currentUserId) {
            chatApiService.getUserName(formattedMessage.senderId).then(name => {
              if (name && !name.includes('undefined')) {
                setMessages(current => current.map(m => 
                  m.messageId === formattedMessage.messageId && !m.senderName
                    ? { ...m, senderName: name }
                    : m
                ));
              }
            }).catch(err => {
              console.error('Error fetching sender name:', err);
            });
          }
          
          // Force scroll to bottom to show new message
          setTimeout(() => scrollToBottom(), 50);
          
          return updatedMessages;
        } else {
          // Message is not for current conversation - still log for debugging
          console.log('ℹ️ Message received but not for current conversation.');
          console.log('ℹ️ Current:', normalizedCurrentId, 'Message:', normalizedMessageId);
          console.log('ℹ️ Message will appear in sidebar.');
        }
        
        return prevMessages;
      });
    };

    const handleUserStatus = (data) => {
      console.log('User status update:', data);
      // Update user online status in conversations
      updateUserStatus(data.userId, data.isOnline, data.lastSeen);
    };

    const handleTyping = (data) => {
      console.log('Typing indicator:', data);
      
      if (data.conversationId === selectedChat?.conversationId && data.userId !== currentUserId) {
        if (data.isTyping) {
          setTypingUsers(prev => new Set([...prev, data.userId]));
          // Auto-clear typing after 5 seconds if no message received
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
          }, 5000);
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        }
      }
    };

    const handleMessageDeleted = (data) => {
      console.log('🗑️ Message deleted event received:', data);
      
      // Use ref to get latest selectedChat value
      const currentSelectedChat = selectedChatRef.current;
      const currentConversationId = currentSelectedChat?.conversationId || currentSelectedChat?.id;
      const messageConversationId = data.conversationId;
      
      // Normalize conversation IDs for comparison
      const normalizedCurrentId = currentConversationId ? String(currentConversationId).trim() : null;
      const normalizedMessageId = messageConversationId ? String(messageConversationId).trim() : null;
      
      const isCurrentConversation = normalizedCurrentId && normalizedMessageId && (
        normalizedCurrentId === normalizedMessageId ||
        normalizedCurrentId.replace(/^conv_/, '') === normalizedMessageId.replace(/^conv_/, '')
      );
      
      if (isCurrentConversation) {
        console.log('🗑️ Removing deleted message from current conversation view');
        setMessages(prev => prev.filter(msg => {
          const shouldRemove = msg.messageId === data.messageId;
          if (shouldRemove) {
            console.log('🗑️ Filtering out deleted message:', msg.messageId);
          }
          return !shouldRemove;
        }));
      } else {
        console.log('ℹ️ Message deleted but not for current conversation');
      }
    };

    const handleMessageRead = (data) => {
      console.log('📖 Message read receipt received via WebSocket:', data);
      
      // Update message status to 'read' when read receipt is received
      if (selectedChat && data.conversationId === (selectedChat.conversationId || selectedChat.id)) {
        setMessages(prev => prev.map(msg => {
          // If specific messageIds are provided, update only those
          if (data.messageIds && Array.isArray(data.messageIds)) {
            if (data.messageIds.includes(msg.messageId)) {
              return { ...msg, status: 'read' };
            }
          } else {
            // Otherwise, update all messages from the current user (messages that were read by the other person)
            if (String(msg.senderId) === String(currentUserId) && msg.status !== 'read') {
              return { ...msg, status: 'read' };
            }
          }
          return msg;
        }));
      }
      
      // Refresh unread counts when messages are marked as read
      // This ensures the conversation list reflects the updated unread count
      setTimeout(async () => {
        try {
          const unreadData = await chatApiService.getUnreadCounts(currentUserId);
          const unreadCounts = unreadData.unreadCounts || {};
          console.log('📊 Updated unread counts from read receipt:', unreadCounts);
          
          // Update conversation list with new unread counts
          setConversations(prev => prev.map(conv => {
            const convId = conv.conversationId || conv.id;
            const newUnreadCount = unreadCounts[convId] || 0;
            return {
              ...conv,
              unreadCount: newUnreadCount
            };
          }));
        } catch (err) {
          console.error('Error refreshing unread counts from read receipt:', err);
        }
      }, 300);
    };

    const handleError = (error) => {
      console.error('Chat error:', error);
      setError('Connection error occurred');
    };

    const handleBlockStatus = (data) => {
      console.log('🚫 Block status update received:', data);
      const { blockedUserId, blockedUserName, isBlocked } = data;
      
      // Update blocked users list
      if (isBlocked) {
        setBlockedUsers(prev => {
          const exists = prev.some(u => u.blockedUserId === blockedUserId);
          if (!exists) {
            return [...prev, { blockedUserId, blockedUserName, blockedAt: new Date().toISOString() }];
          }
          return prev;
        });
        
        // Mark conversation as blocked
        setConversations(prev => prev.map(conv => {
          const userId = conv.teacherId || conv.studentId;
          if (userId === blockedUserId) {
            return { ...conv, isBlocked: true };
          }
          return conv;
        }));
      } else {
        // Unblock - remove from blocked list
        setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== blockedUserId));
        
        // Mark conversation as unblocked
        setConversations(prev => prev.map(conv => {
          const userId = conv.teacherId || conv.studentId;
          if (userId === blockedUserId) {
            return { ...conv, isBlocked: false };
          }
          return conv;
        }));
      }
    };

    const handleReconnectFailed = () => {
      setError('Failed to reconnect to chat');
    };

    // Register event handlers
    chatApiService.on('connected', handleConnected);
    chatApiService.on('disconnected', handleDisconnected);
    // Register WebSocket event handlers
    console.log('🔌 Registering WebSocket event handlers...');
    chatApiService.on('newMessage', handleNewMessage);
    console.log('✅ Registered newMessage handler');
    chatApiService.on('userStatus', handleUserStatus);
    chatApiService.on('typing', handleTyping);
    chatApiService.on('messageDeleted', handleMessageDeleted);
    chatApiService.on('messageRead', handleMessageRead);
    chatApiService.on('blockStatus', handleBlockStatus);
    chatApiService.on('error', handleError);
    chatApiService.on('reconnect_failed', handleReconnectFailed);

    // Cleanup
    return () => {
      clearInterval(connectionCheckInterval);
      chatApiService.off('connected', handleConnected);
      chatApiService.off('disconnected', handleDisconnected);
      chatApiService.off('newMessage', handleNewMessage);
      chatApiService.off('userStatus', handleUserStatus);
      chatApiService.off('typing', handleTyping);
      chatApiService.off('messageDeleted', handleMessageDeleted);
      chatApiService.off('messageRead', handleMessageRead);
      chatApiService.off('blockStatus', handleBlockStatus);
      chatApiService.off('error', handleError);
      chatApiService.off('reconnect_failed', handleReconnectFailed);
    };
  }, [currentUserId, currentUserName, currentUserRole, blockedUsers]); // Include blockedUsers to check blocked status in real-time

  // ================================
  // Helper Functions
  // ================================

  const updateConversationWithMessage = (message) => {
    setConversations(prev => {
      // Find conversation by conversationId (more reliable than id)
      const existingConv = prev.find(conv => 
        (conv.conversationId && conv.conversationId === message.conversationId) ||
        (conv.id && conv.id === message.conversationId)
      );
      
      if (existingConv) {
        // Update existing conversation
        return prev.map(conv => {
          const matches = (conv.conversationId && conv.conversationId === message.conversationId) ||
                         (conv.id && conv.id === message.conversationId);
          
          if (matches) {
            const messageTimestamp = new Date(message.timestamp || message.time || new Date().toISOString()).getTime();
            const currentLastTime = conv.lastMessageTime ? new Date(conv.lastMessageTime).getTime() : 0;
            
            // Only update if this message is newer than the current last message
            // OR if we don't have a lastMessageTime yet
            if (messageTimestamp >= currentLastTime || !conv.lastMessageTime) {
              // IMPORTANT: Don't manually increment/decrement unread count here
              // The backend calculates unread counts based on messages with status 'delivered' or 'sent'
              // that are from other users. We should refresh from backend instead.
              // Only update lastMessage, lastMessageTime, and lastMessageId here
              
              return {
                ...conv,
                lastMessage: message.text || message.messageText || message.message || '',
                lastMessageTime: message.timestamp || message.time || new Date().toISOString(),
                lastMessageId: message.messageId || message.id,
                // Keep existing unreadCount - it will be updated by backend refresh
                // Don't increment here as backend is source of truth
              };
            }
            // Don't update unread count here - backend is source of truth
            // Just return conversation as-is for older messages
            return conv;
          }
          return conv;
        });
      } else {
        // Create new conversation - fetch name if not provided
        const otherId = message.senderId === currentUserId ? message.receiverId : message.senderId;
        let otherName = message.senderId === currentUserId ? message.receiverName : message.senderName;
        
        // Fetch name from login API if not provided
        if (!otherName && otherId) {
          chatApiService.getUserName(otherId).then(name => {
            setConversations(prev => {
              const existing = prev.find(c => c.id === message.conversationId);
              if (existing) {
                return prev.map(c => c.id === message.conversationId ? { ...c, name } : c);
              }
              return prev;
            });
          }).catch(err => {
            console.error('Error fetching user name:', err);
          });
          otherName = `User ${otherId.substring(0, 8)}`;
        }
        
        const newConv = {
          id: message.conversationId,
          conversationId: message.conversationId,
          name: otherName || `User ${otherId.substring(0, 8)}`,
          teacherId: otherId,
          lastMessage: message.text,
          lastMessageTime: message.timestamp,
          lastMessageId: message.messageId,
          unreadCount: message.senderId !== currentUserId ? 1 : 0,
          status: 'offline'
        };
        return [newConv, ...prev];
      }
    });
  };

  const updateUserStatus = (userId, isOnline, lastSeen) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.teacherId === userId 
          ? { ...conv, status: isOnline ? 'online' : 'offline', lastSeen }
          : conv
      )
    );
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ================================
  // Chat Actions
  // ================================

  const selectChat = useCallback(async (chat) => {
    console.log('🎯 selectChat CALLED with chat:', chat);
    console.log('🎯 Chat object keys:', Object.keys(chat || {}));
    console.log('🎯 Chat.id:', chat?.id);
    console.log('🎯 Chat.conversationId:', chat?.conversationId);
    
    if (!chat) {
      console.error('❌ selectChat called with null/undefined chat');
      return;
    }
    
    // Update ref immediately so real-time messages can use it
    selectedChatRef.current = chat;
    
    // Fetch name if missing or undefined
    const userId = chat.teacherId || chat.studentId;
    if ((!chat.name || chat.name === 'User undefined' || chat.name.includes('undefined') || chat.name.startsWith('User ')) && userId) {
      try {
        console.log('📝 Fetching name for chat selection, userId:', userId);
        const fetchedName = await chatApiService.getUserName(userId);
        if (fetchedName && !fetchedName.includes('undefined')) {
          chat = { ...chat, name: fetchedName };
          // Update conversation in list
          setConversations(prev => prev.map(c => 
            c.id === chat.id ? { ...c, name: fetchedName } : c
          ));
        }
      } catch (err) {
        console.error('Error fetching user name:', err);
      }
    }
    
    console.log('✅ Selecting chat:', chat);
    
    // Update ref IMMEDIATELY so real-time messages can match against it
    selectedChatRef.current = chat;
    
    setSelectedChat(chat);
    setTypingUsers(new Set());
    
    // Use conversationId or fall back to id
    const conversationId = chat.conversationId || chat.id;
    console.log('✅ Resolved conversationId:', conversationId);
    console.log('✅ Updated selectedChatRef.current:', selectedChatRef.current?.conversationId || selectedChatRef.current?.id);
    
    // Always reload messages, even if selecting the same chat again
    // This ensures messages are fresh, especially after searching
    if (conversationId) {
      console.log('📨 Loading messages for chat with conversationId:', conversationId);
      // Clear messages first to show loading state, then load fresh messages
      setMessages([]);
      await loadMessages(conversationId);
    } else {
      console.warn('⚠️ No conversationId or id in selected chat:', chat);
      // If no conversation ID, clear messages
      setMessages([]);
    }
  }, [currentUserId, loadMessages]);

  const sendMessage = useCallback(async (messageText, receiverId, receiverName) => {
    console.log('📤 sendMessage CALLED');
    console.log('📤 Parameters:', { messageText, receiverId, receiverName });
    console.log('📤 selectedChat:', selectedChat);
    
    if (!selectedChat || !messageText.trim()) {
      console.warn('⚠️ Cannot send message - missing selectedChat or empty message');
      return;
    }

    const conversationId = selectedChat?.conversationId || selectedChat?.id || 
      chatApiService.generateConversationId(currentUserId, receiverId);
    
    console.log('📤 Using conversationId:', conversationId);
    console.log('📤 Current messages count before send:', messages.length);

    try {
      // Send message via WebSocket
      console.log('📤 Sending via WebSocket...');
      chatApiService.sendWebSocketMessage('sendMessage', {
        conversationId,
        conversationType: 'direct',
        messageType: 'text',
        messageText: messageText.trim(),
        receiverId,
        receiverName
      });

      // Create optimistic message
      const tempId = `temp_${Date.now()}`;
      const optimisticMessage = {
        messageId: tempId,
        conversationId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId,
        receiverName,
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
        status: 'sending',
        isOwn: true
      };

      console.log('📤 Adding optimistic message:', optimisticMessage);
      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        console.log('📤 Messages after adding optimistic:', newMessages.length);
        return newMessages;
      });
      scrollToBottom();

      // REST fallback to persist and mark delivered
      try {
        console.log('📤 Sending via REST API...');
        const restRes = await chatApiService.sendMessageRest({
          conversationId,
          senderId: currentUserId,
          senderName: currentUserName,
          receiverId,
          receiverName,
          text: messageText.trim()
        });
        
        console.log('✅ Message sent via REST, response:', restRes);
        
        // Update the optimistic message with real data
        setMessages(prev => {
          const updated = prev.map(m => 
            m.messageId === tempId
              ? { 
                  ...m, 
                  status: 'delivered', 
                  messageId: restRes.messageId || restRes.id || m.messageId, 
                  timestamp: restRes.timestamp || restRes.time || m.timestamp 
                }
              : m
          );
          console.log('📤 Messages after REST update:', updated.length);
          return updated;
        });
        
        // Reload messages to ensure consistency (especially for other user)
        // Use longer delay to allow DynamoDB to process and index the message
        if (selectedChat?.conversationId === conversationId || selectedChat?.id === conversationId) {
          console.log('📤 Scheduling message reload in 1000ms to allow backend processing...');
          setTimeout(async () => {
            try {
              console.log('📤 Reloading messages after send...');
              // Instead of replacing all messages, merge with existing to preserve optimistic ones
              const data = await chatApiService.getMessages(conversationId);
              const loadedMessages = data.messages || data || [];
              
              // Merge: Keep optimistic messages that aren't confirmed yet, add/update from API
              setMessages(prev => {
                const existingTempIds = prev.filter(m => m.messageId.startsWith('temp_')).map(m => m.messageId);
                
                // Remove temp messages that are now in API (confirmed)
                const confirmedTempIds = existingTempIds.filter(tempId => {
                  // Check if text matches any API message within 2 seconds
                  const tempMsg = prev.find(m => m.messageId === tempId);
                  if (!tempMsg) return false;
                  return loadedMessages.some(apiMsg => {
                    const apiText = apiMsg.text || apiMsg.messageText || apiMsg.message || '';
                    const timeDiff = Math.abs(new Date(apiMsg.timestamp || apiMsg.time || 0) - new Date(tempMsg.timestamp)) / 1000;
                    return apiText === tempMsg.text && timeDiff < 2;
                  });
                });
                
                // Format API messages
                const formattedApiMessages = loadedMessages.map(msg => ({
                  messageId: msg.SK || msg.messageId || msg.id,
                  conversationId: msg.conversationId || conversationId,
                  senderId: msg.senderId || msg.senderFirebaseUid,
                  senderName: msg.senderName || msg.sender,
                  receiverId: msg.receiverId || msg.receiverFirebaseUid,
                  receiverName: msg.receiverName || msg.receiver,
                  text: msg.text || msg.messageText || msg.message || '',
                  timestamp: msg.timestamp || msg.time || msg.createdAt || new Date().toISOString(),
                  status: msg.status || 'delivered',
                  isOwn: currentUserId && String(msg.senderId || msg.senderFirebaseUid) === String(currentUserId)
                }));
                
                // Combine: confirmed API messages + unconfirmed temp messages
                const unconfirmedTemp = prev.filter(m => 
                  m.messageId.startsWith('temp_') && !confirmedTempIds.includes(m.messageId)
                );
                
                // Merge and deduplicate by messageId
                const allMessages = [...formattedApiMessages, ...unconfirmedTemp];
                const uniqueMessages = Array.from(
                  new Map(allMessages.map(m => [m.messageId, m])).values()
                ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                console.log('📤 Merged messages after reload:', uniqueMessages.length);
                return uniqueMessages;
              });
              
              console.log('✅ Messages reloaded and merged after send');
            } catch (err) {
              console.error('❌ Error reloading messages after send:', err);
            }
          }, 1000); // Increased to 1 second to allow DynamoDB processing
        }
      } catch (restErr) {
        console.error('Error sending message via REST:', restErr);
        setMessages(prev => prev.map(m => m.messageId === tempId ? { ...m, status: 'failed' } : m));
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [selectedChat, currentUserId, currentUserName]);

  const sendTypingIndicator = useCallback((isTyping) => {
    if (!selectedChat) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    chatApiService.sendTypingIndicator(selectedChat.conversationId, isTyping);

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        chatApiService.sendTypingIndicator(selectedChat.conversationId, false);
      }, 3000);
    }
  }, [selectedChat]);

  const handleDeleteClick = useCallback((messageId) => {
    console.log('🗑️ handleDeleteClick called with messageId:', messageId);
    
    // Find the message to show in confirmation modal
    const message = messages.find(msg => {
      const msgId = msg.messageId || msg.id;
      return msgId === messageId;
    });
    const messageText = message?.text || message?.messageText || message?.message || '';
    const truncatedText = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
    
    // Extract UUID from messageId if it's in SK format (MSG#timestamp#uuid)
    // Backend expects just the UUID, not the full SK format
    let actualMessageId = messageId;
    if (messageId && messageId.includes('#') && messageId.includes('MSG#')) {
      // Extract UUID from SK format: MSG#timestamp#uuid
      const parts = messageId.split('#');
      actualMessageId = parts[parts.length - 1]; // Get the last part (UUID)
      console.log('🗑️ Extracted UUID from SK format:', actualMessageId, '(original:', messageId, ')');
    }
    
    setDeleteModal({
      isOpen: true,
      messageId: actualMessageId, // Store the UUID for backend
      originalMessageId: messageId, // Keep original for UI reference
      messageText: truncatedText
    });
  }, [messages]);

  const confirmDelete = useCallback(async () => {
    const { messageId } = deleteModal;
    
    if (!selectedChat || !messageId || !currentUserId) {
      console.warn('⚠️ Cannot delete message - missing selectedChat, messageId, or currentUserId');
      setDeleteModal({ isOpen: false, messageId: null, messageText: '' });
      return;
    }

    const conversationId = selectedChat.conversationId || selectedChat.id;
    
    // Close modal immediately
    setDeleteModal({ isOpen: false, messageId: null, messageText: '' });
    
    try {
      // messageId from deleteModal should already be in UUID format (extracted in handleDeleteClick)
      // But ensure it's the UUID, not the full SK format
      let actualMessageId = messageId;
      if (messageId && messageId.includes('#') && messageId.includes('MSG#')) {
        const parts = messageId.split('#');
        actualMessageId = parts[parts.length - 1]; // Extract UUID (last part after #)
        console.log('🗑️ Extracted UUID:', actualMessageId, 'from SK format:', messageId);
      }
      
      console.log('🗑️ Deleting message with UUID:', actualMessageId);
      console.log('🗑️ Conversation ID:', conversationId);
      console.log('🗑️ User ID:', currentUserId);
      
      // Optimistically remove from UI - match both SK format and UUID format
      setMessages(prev => {
        const filtered = prev.filter(msg => {
          const msgId = msg.messageId || msg.id;
          
          // Extract UUID from msgId if it's in SK format
          const msgUuid = (msgId && msgId.includes('#') && msgId.includes('MSG#')) 
            ? msgId.split('#').pop() 
            : msgId;
          
          // Keep message if UUID doesn't match
          const shouldKeep = msgUuid !== actualMessageId;
          
          if (!shouldKeep) {
            console.log('🗑️ Removing message from UI:', msgId, '(UUID:', msgUuid, 'matches delete UUID:', actualMessageId, ')');
          }
          return shouldKeep;
        });
        console.log('🗑️ Messages after optimistic removal:', filtered.length, 'of', prev.length);
        return filtered;
      });
      
      // Send delete request via REST API (ensures permanent deletion from DynamoDB)
      console.log('🗑️ Calling deleteMessage API with UUID:', actualMessageId);
      const deleteResult = await chatApiService.deleteMessage(actualMessageId, conversationId, currentUserId);
      console.log('✅ Delete API response:', deleteResult);
      
      // Verify deletion by reloading messages after a short delay
      setTimeout(async () => {
        console.log('🗑️ Verifying deletion by reloading messages...');
        try {
          await loadMessages(conversationId);
          console.log('✅ Messages reloaded, verifying deletion was successful...');
        } catch (reloadErr) {
          console.error('❌ Error reloading messages after delete:', reloadErr);
        }
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error deleting message:', err);
      console.error('❌ Delete error details:', {
        messageId,
        conversationId,
        currentUserId,
        error: err.message
      });
      setError('Failed to delete message. Please try again.');
      
      // Reload messages to restore the deleted message if deletion failed
      setTimeout(() => {
        console.log('🗑️ Reloading messages to restore state after failed deletion...');
        loadMessages(conversationId);
      }, 500);
    }
  }, [deleteModal, selectedChat, currentUserId, loadMessages]);

  const cancelDelete = useCallback(() => {
    setDeleteModal({ isOpen: false, messageId: null, messageText: '' });
  }, []);

  const handleEditClick = useCallback((messageId) => {
    console.log('✏️ handleEditClick called with messageId:', messageId);
    
    // Find the message to edit
    const message = messages.find(msg => {
      const msgId = msg.messageId || msg.id;
      return msgId === messageId;
    });
    
    if (!message) {
      console.warn('⚠️ Message not found for editing');
      return;
    }
    
    const messageText = message.text || message.messageText || message.message || '';
    
    // Extract UUID from messageId if it's in SK format
    let actualMessageId = messageId;
    if (messageId && messageId.includes('#') && messageId.includes('MSG#')) {
      const parts = messageId.split('#');
      actualMessageId = parts[parts.length - 1];
      console.log('✏️ Extracted UUID from SK format:', actualMessageId, '(original:', messageId, ')');
    }
    
    setEditModal({
      isOpen: true,
      messageId: actualMessageId,
      originalMessageId: messageId,
      messageText: messageText, // Editable text
      originalText: messageText // Keep original for cancel
    });
  }, [messages]);

  const confirmEdit = useCallback(async () => {
    const { messageId, messageText, originalText } = editModal;
    
    if (!selectedChat || !messageId || !currentUserId) {
      console.warn('⚠️ Cannot edit message - missing selectedChat, messageId, or currentUserId');
      setEditModal({ isOpen: false, messageId: null, messageText: '', originalText: '' });
      return;
    }

    // Validate that text has changed and is not empty
    if (!messageText || messageText.trim() === '') {
      setError('Message cannot be empty');
      return;
    }

    if (messageText.trim() === originalText.trim()) {
      // No changes, just close the modal
      setEditModal({ isOpen: false, messageId: null, messageText: '', originalText: '' });
      return;
    }

    const conversationId = selectedChat.conversationId || selectedChat.id;
    
    // Close modal immediately
    setEditModal({ isOpen: false, messageId: null, messageText: '', originalText: '' });
    
    try {
      let actualMessageId = messageId;
      if (messageId && messageId.includes('#') && messageId.includes('MSG#')) {
        const parts = messageId.split('#');
        actualMessageId = parts[parts.length - 1];
        console.log('✏️ Extracted UUID:', actualMessageId, 'from SK format:', messageId);
      }
      
      console.log('✏️ Editing message with UUID:', actualMessageId);
      console.log('✏️ New text:', messageText);
      console.log('✏️ Conversation ID:', conversationId);
      console.log('✏️ User ID:', currentUserId);
      
      // Optimistically update UI
      setMessages(prev => {
        return prev.map(msg => {
          const msgId = msg.messageId || msg.id;
          const msgUuid = (msgId && msgId.includes('#') && msgId.includes('MSG#')) 
            ? msgId.split('#').pop() 
            : msgId;
          
          if (msgUuid === actualMessageId) {
            console.log('✏️ Updating message in UI:', msgId);
            return {
              ...msg,
              text: messageText.trim(),
              messageText: messageText.trim(),
              message: messageText.trim(),
              isEdited: true,
              editedAt: new Date().toISOString()
            };
          }
          return msg;
        });
      });
      
      // Call API to update in DynamoDB
      console.log('✏️ Calling editMessage API with UUID:', actualMessageId);
      const editResult = await chatApiService.editMessage(actualMessageId, conversationId, messageText.trim(), currentUserId);
      console.log('✅ Edit API response:', editResult);
      
      // Reload messages to ensure consistency
      setTimeout(async () => {
        console.log('✏️ Verifying edit by reloading messages...');
        try {
          await loadMessages(conversationId);
          console.log('✅ Messages reloaded after edit.');
        } catch (reloadErr) {
          console.error('❌ Error reloading messages after edit:', reloadErr);
        }
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error editing message:', err);
      console.error('❌ Edit error details:', {
        messageId,
        conversationId,
        currentUserId,
        newText: messageText,
        error: err.message
      });
      setError('Failed to edit message. Please try again.');
      
      // Revert optimistic UI update on failure
      setTimeout(async () => {
        console.log('✏️ Reloading messages to restore state after failed edit...');
        await loadMessages(conversationId);
      }, 500);
    }
  }, [editModal, selectedChat, currentUserId, loadMessages]);

  const cancelEdit = useCallback(() => {
    setEditModal({ isOpen: false, messageId: null, messageText: '', originalText: '' });
  }, []);

  const updateEditText = useCallback((newText) => {
    setEditModal(prev => ({
      ...prev,
      messageText: newText
    }));
  }, []);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const blocked = await chatApiService.getBlockedUsers(currentUserId);
      setBlockedUsers(blocked);
      console.log('🚫 Loaded blocked users:', blocked);
      
      // Mark conversations as blocked
      setConversations(prev => prev.map(conv => {
        const userId = conv.teacherId || conv.studentId;
        const isBlocked = blocked.some(b => b.blockedUserId === userId);
        return { ...conv, isBlocked };
      }));
    } catch (err) {
      console.error('Error loading blocked users:', err);
    }
  }, [currentUserId]);

  const handleBlockClick = useCallback((userId, userName) => {
    setBlockModal({
      isOpen: true,
      userId,
      userName
    });
  }, []);

  const confirmBlock = useCallback(async () => {
    const { userId, userName } = blockModal;
    
    if (!currentUserId || !currentUserName || !userId || !userName) {
      console.warn('⚠️ Cannot block user - missing required info');
      setBlockModal({ isOpen: false, userId: null, userName: '' });
      return;
    }

    // Close modal immediately
    setBlockModal({ isOpen: false, userId: null, userName: '' });

    try {
      console.log('🚫 Blocking user:', userId, userName);
      await chatApiService.blockUser(userId, userName, currentUserId, currentUserName);
      
      // Update UI immediately
      setBlockedUsers(prev => {
        const exists = prev.some(u => u.blockedUserId === userId);
        if (!exists) {
          return [...prev, { blockedUserId: userId, blockedUserName: userName, blockedAt: new Date().toISOString() }];
        }
        return prev;
      });
      
      // Mark conversation as blocked
      setConversations(prev => prev.map(conv => {
        const convUserId = conv.teacherId || conv.studentId;
        if (convUserId === userId) {
          return { ...conv, isBlocked: true };
        }
        return conv;
      }));
      
      console.log('✅ User blocked successfully');
    } catch (err) {
      console.error('❌ Error blocking user:', err);
      setError('Failed to block user');
    }
  }, [blockModal, currentUserId, currentUserName]);

  const cancelBlock = useCallback(() => {
    setBlockModal({ isOpen: false, userId: null, userName: '' });
  }, []);

  const blockUser = useCallback(async (userId, userName) => {
    // This is now just a wrapper that opens the modal
    handleBlockClick(userId, userName);
  }, [handleBlockClick]);

  const unblockUser = useCallback(async (userId) => {
    if (!currentUserId) {
      console.warn('⚠️ Cannot unblock user - missing current user info');
      return;
    }

    try {
      console.log('🔓 Unblocking user:', userId);
      await chatApiService.unblockUser(userId, currentUserId);
      
      // Update UI immediately
      setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== userId));
      
      // Mark conversation as unblocked
      setConversations(prev => prev.map(conv => {
        const convUserId = conv.teacherId || conv.studentId;
        if (convUserId === userId) {
          return { ...conv, isBlocked: false };
        }
        return conv;
      }));
      
      console.log('✅ User unblocked successfully');
    } catch (err) {
      console.error('❌ Error unblocking user:', err);
      setError('Failed to unblock user');
    }
  }, [currentUserId]);

  const startConversation = useCallback(async (organisationOrCandidate) => {
    // Handle both organisations (for job seekers) and candidates (for job providers)
    const firebaseUid = organisationOrCandidate.firebase_uid;
    const conversationId = chatApiService.generateConversationId(currentUserId, firebaseUid);
    
    const newChat = {
      id: organisationOrCandidate.id || firebaseUid,
      conversationId,
      name: organisationOrCandidate.name || organisationOrCandidate.fullName,
      teacherId: firebaseUid, // For JobProvider, this is JobSeeker ID; for JobSeeker, this is JobProvider ID
      studentId: firebaseUid, // Also set studentId for consistency
      state: organisationOrCandidate.state,
      city: organisationOrCandidate.city,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      status: 'offline'
    };

    setSelectedChat(newChat);
    setMessages([]);
    
    // Load messages for the new conversation
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [currentUserId, loadMessages]);

  // ================================
  // Cleanup
  // ================================

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    organisations,
    candidates,
    conversations,
    selectedChat,
    messages,
    isLoading,
    error,
    isConnected,
    typingUsers,
    messagesEndRef,

    // Actions
    selectChat,
    sendMessage,
    sendTypingIndicator,
    deleteMessage: handleDeleteClick,
    confirmDelete,
    cancelDelete,
    editMessage: handleEditClick,
    confirmEdit,
    cancelEdit,
    updateEditText,
    blockUser,
    unblockUser,
    loadBlockedUsers,
    startConversation,
    loadOrganisations,
    loadCandidates,
    loadConversations,
    loadMessages,

    // State
    deleteModal,
    editModal,
    blockModal,
    confirmBlock,
    cancelBlock,
    blockedUsers,
    showBlockedList,
    setShowBlockedList,

    // Utils
    clearError: () => setError(null)
  };
};

export default useChat;