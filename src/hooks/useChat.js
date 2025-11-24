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
  const sentMessageRegistry = useRef(new Map()); // Track temp messages: tempId -> { realId, timestamp, text }
  const unreadCountUpdateTimeout = useRef(null); // Debounce unread count updates
  const messagesRef = useRef([]); // Keep ref in sync with messages state for reliable access
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ================================
  // Initialize Chat
  // ================================

  // ================================
  // Data Loading
  // ================================

  const loadOrganisations = useCallback(async () => {
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
  }, [currentUserId, currentUserRole]);

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
      console.log('🔌 Initializing WebSocket connection...', {
        userId: currentUserId,
        userRole: currentUserRole,
        userName: currentUserName
      });
      chatApiService.connectWebSocket(currentUserId, currentUserRole, currentUserName);
      
      // Log connection status after a short delay
      setTimeout(() => {
        const ws = chatApiService.ws;
        const readyState = ws ? ws.readyState : null;
        const readyStateText = ws ? 
          (readyState === WebSocket.CONNECTING ? 'CONNECTING' :
           readyState === WebSocket.OPEN ? 'OPEN' :
           readyState === WebSocket.CLOSING ? 'CLOSING' :
           readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN') : 'NO_WEBSOCKET';
        
        console.log('🔌 WebSocket Connection Status (after init):', {
          exists: !!ws,
          readyState,
          readyStateText,
          isConnected: chatApiService.isConnected
        });
      }, 1000);

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
            console.log('🔄 Batch fetching remaining names:', remainingMissing.length);
            const userIdsToFetch = remainingMissing
              .map(c => c.teacherId || c.studentId)
              .filter(Boolean);
            
            if (userIdsToFetch.length > 0) {
              chatApiService.getUserNames(userIdsToFetch).then(nameMap => {
                setConversations(prev => prev.map(conv => {
                  const userId = conv.teacherId || conv.studentId;
                  if (userId && nameMap[userId] && !nameMap[userId].includes('undefined') && !nameMap[userId].startsWith('User ')) {
                    return { ...conv, name: nameMap[userId] };
                  }
                  return conv;
                }));
              }).catch(err => {
                console.error('❌ Error batch fetching remaining names:', err);
              });
            }
          }
        } catch (err) {
          console.error('❌ Error fetching user names:', err);
          // Try batch fetching as fallback
          const userIdsToFetch = missingNames
            .map(c => c.teacherId || c.studentId)
            .filter(Boolean);
          
          if (userIdsToFetch.length > 0) {
            chatApiService.getUserNames(userIdsToFetch).then(nameMap => {
              setConversations(prev => prev.map(conv => {
                const userId = conv.teacherId || conv.studentId;
                if (userId && nameMap[userId] && !nameMap[userId].includes('undefined')) {
                  return { ...conv, name: nameMap[userId] };
                }
                return conv;
              }));
            }).catch(fallbackErr => {
              console.error('❌ Fallback batch fetch error:', fallbackErr);
            });
          }
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
          
          // Extract text from multiple possible field names
          const messageText = msg.text || msg.messageText || msg.message || msg.content || msg.body || '';
          
          const formatted = {
            messageId: msg.SK || msg.messageId || msg.id || `msg_${idx}_${Date.now()}`,
            conversationId: msg.conversationId || conversationId,
            senderId: msg.senderId || msg.senderFirebaseUid,
            senderName: msg.senderName || msg.sender,
            receiverId: msg.receiverId || msg.receiverFirebaseUid,
            receiverName: msg.receiverName || msg.receiver,
            text: messageText,
            messageText: messageText, // Also set messageText for compatibility
            message: messageText, // Also set message for compatibility
            timestamp: msg.timestamp || msg.time || msg.createdAt || msg.created_at || new Date().toISOString(),
            status: msg.status || 'delivered',
            isOwn: currentUserId && String(msg.senderId || msg.senderFirebaseUid) === String(currentUserId)
          };
          
          // Debug: Log if message has no text
          if (!messageText || !messageText.trim()) {
            console.warn(`⚠️ Message ${idx} has no text field. Available fields:`, Object.keys(msg));
          }
          console.log(`📥 Formatted message ${idx}:`, formatted);
          return formatted;
        })
        .filter(msg => {
          // Filter out empty messages - check all possible text fields
          const text = msg.text || msg.messageText || msg.message || msg.content || msg.body || '';
          const hasText = text.trim().length > 0;
          if (!hasText) {
            console.warn('⚠️ Filtering out empty message:', {
              messageId: msg.messageId,
              availableFields: Object.keys(msg),
              sampleFields: {
                text: msg.text,
                messageText: msg.messageText,
                message: msg.message,
                content: msg.content,
                body: msg.body
              }
            });
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
        });
      
      // Sort messages by timestamp (ascending - oldest first) to ensure correct display order
      const sortedMessages = [...formattedMessages].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB; // Ascending order (oldest first)
      });
      
      console.log('✅ Setting messages to state. Count:', sortedMessages.length);
      console.log('✅ Formatted messages array:', sortedMessages);
      console.log('✅ Sample message (first):', sortedMessages[0]);
      console.log('✅ Sample message (last):', sortedMessages[sortedMessages.length - 1]);
      setMessages(sortedMessages);
      
      // Batch fetch missing sender names after setting messages
      const missingNames = formattedMessages
        .filter(msg => !msg.senderName && msg.senderId && msg.senderId !== currentUserId)
        .map(msg => msg.senderId);
      
      if (missingNames.length > 0) {
        const uniqueMissingNames = [...new Set(missingNames)];
        console.log('📝 Batch fetching sender names for', uniqueMissingNames.length, 'users');
        chatApiService.getUserNames(uniqueMissingNames).then(nameMap => {
          setMessages(prev => prev.map(m => {
            if (!m.senderName && m.senderId && nameMap[m.senderId]) {
              return { ...m, senderName: nameMap[m.senderId] };
            }
            return m;
          }));
        }).catch(err => {
          console.error('Error batch fetching sender names:', err);
        });
      }
      
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
          
          // Update unread counts (debounced to prevent race conditions)
          updateUnreadCounts();
          
          // Update message statuses locally instead of reloading
          setMessages(prev => prev.map(msg => {
            // Update status to 'read' for messages in this conversation that are from other users
            if (msg.conversationId === conversationId && 
                String(msg.senderId) !== String(currentUserId) &&
                msg.status !== 'read') {
              return { ...msg, status: 'read' };
            }
            return msg;
          }));
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
    // Log WebSocket connection status for debugging
    const logConnectionStatus = () => {
      const ws = chatApiService.ws;
      const readyState = ws ? ws.readyState : null;
      const readyStateText = ws ? 
        (readyState === WebSocket.CONNECTING ? 'CONNECTING' :
         readyState === WebSocket.OPEN ? 'OPEN' :
         readyState === WebSocket.CLOSING ? 'CLOSING' :
         readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN') : 'NO_WEBSOCKET';
      
      console.log('🔌 WebSocket Connection Status:', {
        exists: !!ws,
        readyState,
        readyStateText,
        isConnected: chatApiService.isConnected,
        wsUrl: chatApiService.wsUrl,
        userId: currentUserId,
        userRole: currentUserRole
      });
    };
    
    // Check connection status immediately and set up periodic check
    const checkConnection = () => {
      logConnectionStatus();
      
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
      
      // Filter out empty messages immediately - check multiple field names
      const messageText = message.text || message.messageText || message.message || message.content || message.body || '';
      if (!messageText || !messageText.trim()) {
        console.warn('⚠️ Skipping empty message:', message);
        console.warn('⚠️ Available fields:', Object.keys(message));
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
      // Extract conversationId from multiple possible field names
      const messageConversationId = message.conversationId || 
                                    message.conversation_id ||
                                    message.convId ||
                                    message.conversationId;
      
      const formattedMessage = {
        messageId: message.messageId || message.id || `msg_${Date.now()}`,
        conversationId: messageConversationId,
        senderId: senderId,
        senderName: message.senderName || message.sender,
        receiverId: message.receiverId || message.receiverFirebaseUid,
        receiverName: message.receiverName || message.receiver,
        text: messageText.trim(),
        timestamp: message.timestamp || message.time || new Date().toISOString(),
        status: message.status || 'delivered',
        isOwn: currentUserId && String(senderId) === String(currentUserId)
      };
      
      console.log('📨 Formatted message conversationId:', formattedMessage.conversationId);
      console.log('📨 Raw message conversationId fields:', {
        conversationId: message.conversationId,
        conversation_id: message.conversation_id,
        convId: message.convId,
        allKeys: Object.keys(message)
      });
      
      console.log('✅ Formatted message:', formattedMessage);
      
      // Always update conversation list FIRST (this shows the message in sidebar immediately)
      updateConversationWithMessage(formattedMessage);
      
      // Update unread counts (debounced to prevent race conditions)
      updateUnreadCounts();
      
      // Get current selectedChat synchronously using ref (avoids stale closures)
      // We need to check if this message belongs to the currently selected conversation
      // IMPORTANT: Use ref directly inside setMessages callback to get latest value
      console.log('🔄 About to call setMessages. Current messages count:', messagesRef.current.length);
      console.log('🔄 Selected chat ref:', selectedChatRef.current);
      console.log('🔄 Formatted message before setMessages:', {
        conversationId: formattedMessage.conversationId,
        senderId: formattedMessage.senderId,
        receiverId: formattedMessage.receiverId,
        text: formattedMessage.text.substring(0, 50)
      });
      
      setMessages(prevMessages => {
        console.log('🔄 Inside setMessages callback. Previous messages count:', prevMessages.length);
        // Get conversation ID from ref (always latest value) - use ref directly inside callback
        const latestSelectedChat = selectedChatRef.current;
        const currentConversationId = latestSelectedChat?.conversationId || latestSelectedChat?.id;
        // Try multiple fields for message conversation ID (backend might use different field names)
        const messageConversationId = formattedMessage.conversationId || 
                                      formattedMessage.conversation_id ||
                                      formattedMessage.convId ||
                                      (formattedMessage.conversationId ? formattedMessage.conversationId : null);
        
        console.log('🔍 Conversation ID check inside setMessages:', {
          latestSelectedChat: !!latestSelectedChat,
          currentConversationId,
          messageConversationId,
          formattedMessageKeys: Object.keys(formattedMessage),
          selectedChatRefCurrent: selectedChatRef.current?.conversationId || selectedChatRef.current?.id,
          selectedChatKeys: latestSelectedChat ? Object.keys(latestSelectedChat) : []
        });
        
        // Normalize conversation IDs for comparison (handle string/number mismatches, case-insensitive)
        // Also handle character variations (O vs 0, L vs /, etc.) by normalizing
        const normalizeId = (id) => {
          if (!id) return null;
          // Convert to string, trim, lowercase, and replace common character confusions
          return String(id).trim().toLowerCase()
            .replace(/[o0]/g, '0') // Normalize O and 0
            .replace(/[il1|]/g, '1') // Normalize I, l, 1, |
            .replace(/[\/\\]/g, '/'); // Normalize forward/back slashes
        };
        
        const normalizedCurrentId = normalizeId(currentConversationId);
        const normalizedMessageId = normalizeId(messageConversationId);
        
        // Enhanced conversation ID matching - try multiple formats (case-insensitive, character-normalized)
        let isCurrentConversation = false;
        if (normalizedCurrentId && normalizedMessageId) {
          // Exact match (case-insensitive, character-normalized)
          if (normalizedCurrentId === normalizedMessageId) {
            isCurrentConversation = true;
          }
          // Match without 'conv_' prefix (case-insensitive, character-normalized)
          else if (normalizedCurrentId.replace(/^conv_/, '') === normalizedMessageId.replace(/^conv_/, '')) {
            isCurrentConversation = true;
          }
          // Extract IDs from conversation format (conv_userId1_userId2) - case-insensitive, character-normalized
          else {
            const currentParts = normalizedCurrentId.replace(/^conv_/, '').split('_');
            const messageParts = normalizedMessageId.replace(/^conv_/, '').split('_');
            // Check if both contain the same user IDs (order might differ, case-insensitive, character-normalized)
            if (currentParts.length === 2 && messageParts.length === 2) {
              const currentSet = new Set(currentParts.map(id => normalizeId(id)));
              const messageSet = new Set(messageParts.map(id => normalizeId(id)));
              if (currentSet.size === messageSet.size && 
                  [...currentSet].every(id => messageSet.has(id))) {
                isCurrentConversation = true;
              }
            }
          }
        }
        
        // FALLBACK: If conversation ID matching fails, try matching by participant IDs
        // This handles cases where conversation IDs might be formatted differently
        if (!isCurrentConversation && latestSelectedChat) {
          // Extract participant ID from selected chat (try multiple fields)
          let selectedChatParticipantId = latestSelectedChat.teacherId || 
                                         latestSelectedChat.studentId || 
                                         latestSelectedChat.firebase_uid;
          
          // If not found, try to extract from conversation ID
          if (!selectedChatParticipantId && currentConversationId) {
            const parts = String(currentConversationId).replace(/^conv_/, '').split('_');
            // Find the part that's not the current user ID
            selectedChatParticipantId = parts.find(id => 
              id && String(id).trim().toLowerCase() !== String(currentUserId || '').trim().toLowerCase()
            );
          }
          
          const messageSenderId = String(formattedMessage.senderId || '').trim().toLowerCase();
          const messageReceiverId = String(formattedMessage.receiverId || '').trim().toLowerCase();
          const currentUserIdStr = String(currentUserId || '').trim().toLowerCase();
          const selectedParticipantIdStr = String(selectedChatParticipantId || '').trim().toLowerCase();
          
          // Check if message is between current user and the selected chat participant
          const isMessageForSelectedChat = selectedParticipantIdStr && (
            (messageSenderId === currentUserIdStr && messageReceiverId === selectedParticipantIdStr) ||
            (messageReceiverId === currentUserIdStr && messageSenderId === selectedParticipantIdStr)
          );
          
          if (isMessageForSelectedChat) {
            console.log('🔄 Fallback match: Conversation IDs don\'t match, but participant IDs do!');
            console.log('🔄 Selected chat participant:', selectedChatParticipantId);
            console.log('🔄 Message sender:', formattedMessage.senderId);
            console.log('🔄 Message receiver:', formattedMessage.receiverId);
            console.log('🔄 Current user:', currentUserId);
            isCurrentConversation = true;
          } else {
            console.log('🔄 Fallback match failed:', {
              selectedChatParticipantId,
              messageSenderId,
              messageReceiverId,
              currentUserIdStr,
              isMessageForSelectedChat
            });
          }
        }
        
        console.log('📨 Conversation matching:', {
          currentConversationId: normalizedCurrentId,
          messageConversationId: normalizedMessageId,
          isCurrentConversation,
          selectedChatExists: !!latestSelectedChat,
          originalCurrentId: currentConversationId,
          originalMessageId: messageConversationId
        });
        
        // Clear typing indicator if message is for current conversation
        if (isCurrentConversation && formattedMessage.senderId !== currentUserId) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(formattedMessage.senderId);
            return newSet;
          });
        }
        
        // Use latestSelectedChat instead of currentSelectedChat
        const currentSelectedChat = latestSelectedChat;
        
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
          // Use registry for better duplicate detection
          const messageExists = prevMessages.some(m => {
            // Check by messageId first (most reliable)
            if (m.messageId && formattedMessage.messageId && 
                String(m.messageId) === String(formattedMessage.messageId)) {
              return true;
            }
            
            // Check registry for temp messages
            const msgId = m.messageId || formattedMessage.messageId;
            if (msgId && sentMessageRegistry.current.has(msgId)) {
              const registryEntry = sentMessageRegistry.current.get(msgId);
              if (registryEntry.realId && String(registryEntry.realId) === String(formattedMessage.messageId)) {
                return true;
              }
              if (formattedMessage.messageId && sentMessageRegistry.current.has(formattedMessage.messageId)) {
                const realId = sentMessageRegistry.current.get(formattedMessage.messageId).realId;
                if (realId && String(realId) === String(m.messageId)) {
                  return true;
                }
              }
            }
            
            // Check by text + sender + timestamp (for optimistic messages)
            if (m.text === formattedMessage.text && 
                m.senderId === formattedMessage.senderId &&
                m.conversationId === formattedMessage.conversationId) {
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
            
            // Note: Sender name will be fetched in batch if missing (handled after message is added)
            
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
          
          // Note: Sender name will be fetched in batch if missing (handled separately)
          
          // Force scroll to bottom to show new message
          setTimeout(() => scrollToBottom(), 50);
          
          console.log('✨ Returning updated messages array. New count:', updatedMessages.length);
          return updatedMessages;
        } else {
          // Message is not for current conversation - still log for debugging
          console.warn('⚠️ Message received but NOT for current conversation!');
          console.warn('⚠️ Current conversation ID (normalized):', normalizedCurrentId);
          console.warn('⚠️ Message conversation ID (normalized):', normalizedMessageId);
          console.warn('⚠️ Current conversation ID (original):', currentConversationId);
          console.warn('⚠️ Message conversation ID (original):', messageConversationId);
          console.warn('⚠️ Selected chat exists:', !!latestSelectedChat);
          console.warn('⚠️ Message will appear in sidebar, but NOT in active chat view.');
          console.warn('⚠️ Previous messages count:', prevMessages.length);
          
          // If there's no selected chat, this is expected. Otherwise, it's a matching issue.
          if (latestSelectedChat) {
            console.error('❌ CRITICAL: Conversation ID mismatch! Message will not appear in active chat.');
            console.error('❌ Attempting to add anyway if message is for current user...');
            
            // LAST RESORT: If message is for current user (sent or received), add it anyway
            // This handles edge cases where conversation ID matching completely fails
            const messageIsForCurrentUser = (
              String(formattedMessage.senderId || '').trim() === String(currentUserId || '').trim() ||
              String(formattedMessage.receiverId || '').trim() === String(currentUserId || '').trim()
            );
            
            if (messageIsForCurrentUser) {
              console.log('🆘 EMERGENCY: Adding message anyway because it\'s for current user');
              // Check if message already exists
              const alreadyExists = prevMessages.some(m => 
                m.messageId === formattedMessage.messageId ||
                (m.text === formattedMessage.text && 
                 m.senderId === formattedMessage.senderId &&
                 Math.abs(new Date(m.timestamp).getTime() - new Date(formattedMessage.timestamp).getTime()) < 5000)
              );
              
              if (!alreadyExists) {
                const emergencyUpdated = [...prevMessages, formattedMessage].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                console.log('🆘 Emergency add successful. New count:', emergencyUpdated.length);
                setTimeout(() => scrollToBottom(), 50);
                return emergencyUpdated;
              } else {
                console.log('🆘 Message already exists, skipping emergency add');
              }
            }
          }
        }
        
        console.log('⚠️ Returning previous messages unchanged. Count:', prevMessages.length);
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
      
      // Update unread counts (debounced to prevent race conditions)
      updateUnreadCounts();
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
    console.log('🔌 Current WebSocket state:', {
      ws: !!chatApiService.ws,
      readyState: chatApiService.ws ? chatApiService.ws.readyState : 'N/A',
      isConnected: chatApiService.isConnected
    });
    chatApiService.on('newMessage', handleNewMessage);
    console.log('✅ Registered newMessage handler');
    console.log('✅ Handler count for newMessage:', chatApiService.messageHandlers?.get('newMessage')?.length || 0);
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

  // Debounced unread count update to prevent race conditions
  const updateUnreadCounts = useCallback(() => {
    // Clear existing timeout
    if (unreadCountUpdateTimeout.current) {
      clearTimeout(unreadCountUpdateTimeout.current);
    }
    
    // Debounce to 300ms to batch multiple updates
    unreadCountUpdateTimeout.current = setTimeout(async () => {
      try {
        const unreadData = await chatApiService.getUnreadCounts(currentUserId);
        const unreadCounts = unreadData.unreadCounts || {};
        console.log('📊 Updated unread counts:', unreadCounts);
        
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
        console.error('Error refreshing unread counts:', err);
      }
    }, 300);
  }, [currentUserId]);

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

    // Extract receiverId and receiverName from selectedChat if not provided
    // This ensures compatibility with both Job Seeker (passes params) and Job Provider (doesn't pass)
    const finalReceiverId = receiverId || selectedChat.teacherId || selectedChat.studentId || selectedChat.firebase_uid;
    const finalReceiverName = receiverName || selectedChat.name || selectedChat.fullName;
    
    if (!finalReceiverId) {
      console.error('❌ Cannot send message - no receiverId found');
      setError('Cannot send message: Receiver information missing');
      return;
    }

    const conversationId = selectedChat?.conversationId || selectedChat?.id || 
      chatApiService.generateConversationId(currentUserId, finalReceiverId);
    
    // Normalize conversation ID to handle case/character variations
    const normalizedConversationId = conversationId ? String(conversationId).trim().toLowerCase() : null;
    console.log('📤 Using conversationId:', conversationId);
    console.log('📤 Normalized conversationId:', normalizedConversationId);
    
    // Use functional update to get current messages state (avoids stale closure)
    let currentMessagesCount = 0;
    setMessages(prev => {
      currentMessagesCount = prev.length;
      return prev; // No change, just reading
    });
    console.log('📤 Current messages count before send:', currentMessagesCount);
    console.log('📤 Messages ref count:', messagesRef.current.length);

    try {
      // Create optimistic message first
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticMessage = {
        messageId: tempId,
        conversationId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: finalReceiverId,
        receiverName: finalReceiverName,
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
        status: 'sending',
        isOwn: true
      };

      // Register temp message for duplicate detection
      sentMessageRegistry.current.set(tempId, {
        text: messageText.trim(),
        timestamp: optimisticMessage.timestamp,
        conversationId,
        senderId: currentUserId
      });

      console.log('📤 Adding optimistic message:', optimisticMessage);
      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        console.log('📤 Messages after adding optimistic:', newMessages.length);
        return newMessages;
      });
      scrollToBottom();

      // Send message via WebSocket (with error handling)
      let wsSent = false;
      if (chatApiService.ws && chatApiService.ws.readyState === WebSocket.OPEN) {
        try {
          console.log('📤 Sending via WebSocket...');
          chatApiService.sendWebSocketMessage('sendMessage', {
            conversationId,
            conversationType: 'direct',
            messageType: 'text',
            messageText: messageText.trim(),
            receiverId: finalReceiverId,
            receiverName: finalReceiverName
          });
          wsSent = true;
        } catch (wsErr) {
          console.error('WebSocket send error:', wsErr);
        }
      } else {
        console.warn('⚠️ WebSocket not connected, will use REST only');
      }

      // REST fallback to persist and mark delivered (always send for persistence)
      try {
        console.log('📤 Sending via REST API...');
        const restRes = await chatApiService.sendMessageRest({
          conversationId,
          senderId: currentUserId,
          senderName: currentUserName,
          receiverId: finalReceiverId,
          receiverName: finalReceiverName,
          text: messageText.trim()
        });
        
        console.log('✅ Message sent via REST, response:', restRes);
        
        const realMessageId = restRes.messageId || restRes.id;
        
        // Update registry with real message ID
        if (realMessageId && sentMessageRegistry.current.has(tempId)) {
          const registryEntry = sentMessageRegistry.current.get(tempId);
          registryEntry.realId = realMessageId;
          sentMessageRegistry.current.set(realMessageId, registryEntry);
        }
        
        // Update the optimistic message with real data
        setMessages(prev => {
          const updated = prev.map(m => 
            m.messageId === tempId
              ? { 
                  ...m, 
                  status: 'delivered', 
                  messageId: realMessageId || m.messageId, 
                  timestamp: restRes.timestamp || restRes.time || m.timestamp 
                }
              : m
          );
          console.log('📤 Messages after REST update:', updated.length);
          return updated;
        });
        
        // Clean up temp message from registry after 10 seconds
        setTimeout(() => {
          sentMessageRegistry.current.delete(tempId);
          if (realMessageId) {
            sentMessageRegistry.current.delete(realMessageId);
          }
        }, 10000);
        
      } catch (restErr) {
        console.error('Error sending message via REST:', restErr);
        setMessages(prev => prev.map(m => m.messageId === tempId ? { ...m, status: 'failed' } : m));
        setError('Failed to send message. Please try again.');
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