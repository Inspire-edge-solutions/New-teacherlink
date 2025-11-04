// Chat API Service for TeacherLink
const CHAT_API_BASE = 'https://etm4h8r37d.execute-api.ap-south-1.amazonaws.com/dev';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const FAVROUTE_JOBS_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const FAVROUTE_USERS_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const PERSONAL_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const LOGIN_API = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login';

class ChatApiService {
  constructor() {
    this.ws = null;
    this.wsUrl = 'wss://p822j60sea.execute-api.ap-south-1.amazonaws.com/dev';
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this._connecting = false;
    this._lastParams = null;
  }

  // ================================
  // WebSocket Connection Management
  // ================================
  
  connectWebSocket(userId, userRole, userName) {
    const wsUrl = `${this.wsUrl}?userId=${userId}&userRole=${userRole}&userName=${encodeURIComponent(userName)}`;

    // Prevent duplicate connections (StrictMode mounts/unmounts)
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN && this._lastParams === wsUrl) {
        console.log('WebSocket already connected');
        return;
      }
      if (this.ws.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket is connecting');
        return;
      }
    }
    if (this._connecting) {
      return;
    }
    this._connecting = true;
    this._lastParams = wsUrl;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        console.log('✅ WebSocket URL:', wsUrl);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._connecting = false;
        // Emit connected event immediately to update UI
        this.emit('connected');
        // Double-check status after a brief delay to ensure it's set
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.isConnected = true;
            this.emit('connected');
          }
        }, 100);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Removed excessive logging - uncomment for debugging if needed
          // console.log('WebSocket message received:', data.type || data.action);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('❌ Raw message data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('⚠️ WebSocket disconnected');
        console.log('⚠️ Close code:', event.code, 'Reason:', event.reason);
        console.log('⚠️ Was clean close:', event.wasClean);
        this.isConnected = false;
        this._connecting = false;
        this.emit('disconnected');
        // Only reconnect if it wasn't a clean close (intentional disconnect)
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect(userId, userRole, userName);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._connecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      this._connecting = false;
    }
  }

  attemptReconnect(userId, userRole, userName) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket(userId, userRole, userName);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  disconnectWebSocket() {
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.ws.close();
      }
    } catch (error) {
      // Ignore disconnect errors
      console.log('Disconnect error (ignored):', error);
    }
    this.ws = null;
    this.isConnected = false;
    this._connecting = false;
  }

  // ================================
  // Message Handling
  // ================================

  handleWebSocketMessage(data) {
    // Removed excessive logging - uncomment for debugging if needed
    // console.log('Raw WebSocket data received:', data);
    const { type, action } = data;
    
    // Handle both 'type' and 'action' fields
    const messageType = type || action;
    
    // Removed excessive logging - uncomment for debugging if needed
    // console.log('Message type/action:', messageType);
    
    switch (messageType) {
      case 'message':
      case 'sendMessage': {
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing REAL-TIME message type');
        // Handle both data.message and data format
        // Backend sends: { type: 'message', conversationId: '...', message: {...} }
        // So we prefer data.message but also include top-level conversationId if present
        let messageData = data.message || data;
        
        // Ensure we have a proper message object
        if (!messageData || (typeof messageData === 'object' && Object.keys(messageData).length === 0)) {
          console.warn('⚠️ Message data is empty or invalid, using full data object');
          messageData = data;
        }
        
        // If conversationId is at top level but not in message, use top-level one
        if (data.conversationId && !messageData.conversationId) {
          messageData.conversationId = data.conversationId;
        }
        
        // Ensure all required fields are present
        if (!messageData.conversationId && data.conversationId) {
          messageData.conversationId = data.conversationId;
        }
        
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Extracted message data:', messageData);
        this.emit('newMessage', messageData);
        break;
      }
      case 'userOnlineStatus':
      case 'onlineStatus':
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing user status');
        this.emit('userStatus', data);
        break;
      case 'typing':
      case 'typingIndicator':
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing typing indicator');
        this.emit('typing', data);
        break;
      case 'messageDeleted':
      case 'deleteMessage':
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing message deletion');
        this.emit('messageDeleted', data);
        break;
      case 'userBlockStatus':
      case 'blockStatus':
      case 'blockUser':
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing block status update');
        this.emit('blockStatus', data);
        break;
      case 'messageRead':
      case 'readReceipt':
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Processing read receipt');
        this.emit('messageRead', data);
        break;
      default:
        // If no type, assume it's a message
        if (data.text || data.messageText || data.message || data.conversationId || data.senderId || (data.message && (data.message.text || data.message.messageText))) {
          // Removed excessive logging - uncomment for debugging if needed
          // console.log('Assuming message format (no type field)');
          // Try to extract message from nested structure
          const messageData = data.message || data;
          this.emit('newMessage', messageData);
        } else {
          console.warn('⚠️ Unknown message type:', messageType);
        }
    }
  }

  // ================================
  // Event System
  // ================================

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  // ================================
  // REST API Methods
  // ================================

  async getOrganisations() {
    try {
      const response = await fetch(ORGANISATION_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform data to show only name, state, city
      return data.map(org => ({
        id: org.id,
        firebase_uid: org.firebase_uid,
        name: org.name,
        state: org.state,
        city: org.city,
        isBlocked: org.isBlocked
      }));
    } catch (error) {
      console.error('Error fetching organisations:', error);
      throw error;
    }
  }

  async getFavrouteJobs() {
    try {
      const response = await fetch(FAVROUTE_JOBS_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching favroute jobs:', error);
      throw error;
    }
  }

  async getOrganisationsForJobSeeker(currentUserId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Fetching organizations for job seeker:', currentUserId);
      
      // First, fetch favrouteJobs data
      const favrouteJobsData = await this.getFavrouteJobs();
      
      // Filter by added_by === currentUserId AND favroute_jobs === 1
      const userJobs = favrouteJobsData.filter(job => 
        String(job.added_by) === String(currentUserId) && job.favroute_jobs === 1
      );
      
      if (userJobs.length === 0) {
        return [];
      }
      
      // Extract unique firebase_uids
      const uniqueFirebaseUids = [...new Set(userJobs.map(job => job.firebase_uid))];
      
      // Fetch all organizations
      const allOrgs = await this.getOrganisations();
      
      // Filter organizations by firebase_uid
      const filteredOrgs = allOrgs.filter(org => 
        uniqueFirebaseUids.includes(org.firebase_uid)
      );
      
      return filteredOrgs;
    } catch (error) {
      console.error('Error fetching organisations for job seeker:', error);
      throw error;
    }
  }

  async getFavrouteUsers() {
    try {
      const response = await fetch(FAVROUTE_USERS_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching favroute users:', error);
      throw error;
    }
  }

  async getPersonalUsers() {
    try {
      const response = await fetch(PERSONAL_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching personal users:', error);
      throw error;
    }
  }

  async getCandidatesForJobProvider(currentUserId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Fetching candidates for job provider:', currentUserId);
      
      // First, fetch favrouteUsers data
      const favrouteUsersData = await this.getFavrouteUsers();
      
      // Filter by added_by === currentUserId AND favroute_candidate === 1
      const userCandidates = favrouteUsersData.filter(user => 
        String(user.added_by) === String(currentUserId) && user.favroute_candidate === 1
      );
      
      if (userCandidates.length === 0) {
        return [];
      }
      
      // Extract unique firebase_uids
      const uniqueFirebaseUids = [...new Set(userCandidates.map(user => user.firebase_uid))];
      
      // Fetch all personal users
      const allUsers = await this.getPersonalUsers();
      
      // Filter users by firebase_uid and return with fullName
      const filteredCandidates = allUsers
        .filter(user => uniqueFirebaseUids.includes(user.firebase_uid))
        .map(user => ({
          firebase_uid: user.firebase_uid,
          fullName: user.fullName,
          email: user.email,
          id: user.firebase_uid // Use firebase_uid as id for consistency
        }));
      
      return filteredCandidates;
    } catch (error) {
      console.error('Error fetching candidates for job provider:', error);
      throw error;
    }
  }

  async getConversations(userId) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/chat/conversations?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId, limit = 50, lastMessageId = null) {
    try {
      let url = `${CHAT_API_BASE}/chat/messages?conversationId=${conversationId}&limit=${limit}`;
      if (lastMessageId) {
        url += `&lastMessageId=${lastMessageId}`;
      }
      
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Fetching messages from URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('API Response received, messages count:', data.messages ? data.messages.length : 0);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        conversationId
      });
      throw error;
    }
  }

  async sendMessageRest(messageData) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/chat/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId, userId) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/chat/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId, userId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getUnreadCounts(userId) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/chat/unread-counts?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      throw error;
    }
  }

  async deleteMessage(messageId, conversationId, userId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Starting message deletion process...');
      
      // Always use REST API first to ensure permanent deletion from DynamoDB
      const response = await fetch(`${CHAT_API_BASE}/chat/delete-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          conversationId,
          userId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete failed with status:', response.status);
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const result = await response.json();
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Message deleted successfully from DynamoDB');
      
      // Also notify via WebSocket if connected (for real-time UI updates)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Notifying other participants via WebSocket...');
        try {
          this.sendWebSocketMessage('deleteMessage', {
            messageId,
            conversationId,
            userId
          });
        } catch (wsError) {
          console.warn('⚠️ Failed to notify via WebSocket (non-critical):', wsError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      console.error('❌ Delete error details:', {
        messageId,
        conversationId,
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async editMessage(messageId, conversationId, newText, userId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Starting message edit process...');
      
      // Use REST API to update message in DynamoDB
      const response = await fetch(`${CHAT_API_BASE}/chat/edit-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          conversationId,
          newText,
          userId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edit failed with status:', response.status);
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const result = await response.json();
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Message edited successfully in DynamoDB');
      
      // Also notify via WebSocket if connected (for real-time UI updates)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Notifying other participants via WebSocket...');
        try {
          this.sendWebSocketMessage('editMessage', {
            messageId,
            conversationId,
            newText,
            userId
          });
        } catch (wsError) {
          console.warn('⚠️ Failed to notify via WebSocket (non-critical):', wsError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error editing message:', error);
      console.error('❌ Edit error details:', {
        messageId,
        conversationId,
        userId,
        newText,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async blockUser(blockedUserId, blockedUserName, blockerId, blockerName) {
    try {
      // Try WebSocket first if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Sending block request via WebSocket');
        this.sendWebSocketMessage('blockUser', {
          blockedUserId,
          blockedUserName
        });
        return { success: true, message: 'Block request sent' };
      }
      
      // Fallback to REST API
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('WebSocket not available, using REST API for block');
      const response = await fetch(`${CHAT_API_BASE}/chat/block-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockerId,
          blockedUserId,
          blockerName,
          blockedUserName
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(blockedUserId, blockerId) {
    try {
      // Try WebSocket first if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Removed excessive logging - uncomment for debugging if needed
        // console.log('Sending unblock request via WebSocket');
        this.sendWebSocketMessage('unblockUser', {
          blockedUserId
        });
        return { success: true, message: 'Unblock request sent' };
      }
      
      // Fallback to REST API
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('WebSocket not available, using REST API for unblock');
      const response = await fetch(`${CHAT_API_BASE}/chat/unblock-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockerId,
          blockedUserId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  async getBlockedUsers(userId) {
    try {
      const response = await fetch(`${CHAT_API_BASE}/chat/blocked-users?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.blockedUsers || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }
  }

  // Fetch user name from login API using firebase_uid (fast direct query)
  async getUserName(firebaseUid) {
    try {
      if (!firebaseUid) {
        console.warn('getUserName called with empty firebaseUid');
        return null;
      }
      // Use query parameter for faster lookup
      const response = await fetch(`${LOGIN_API}?firebase_uid=${encodeURIComponent(firebaseUid)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Handle both single user object and array response
      const user = Array.isArray(data) ? data.find(u => u.firebase_uid === firebaseUid) : data;
      if (user && user.name && !user.name.includes('undefined')) {
        return user.name;
      }
      // Fallback: try fetching all users if query param doesn't work
      const allUsersResponse = await fetch(LOGIN_API);
      if (allUsersResponse.ok) {
        const allUsers = await allUsersResponse.json();
        const foundUser = allUsers.find(u => u.firebase_uid === firebaseUid);
        if (foundUser && foundUser.name) {
          return foundUser.name;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching user name:', error);
      return null;
    }
  }

  // Batch fetch user names for multiple firebase_uids (parallel queries)
  async getUserNames(firebaseUids) {
    try {
      if (!firebaseUids || firebaseUids.length === 0) {
        console.warn('getUserNames called with empty array');
        return {};
      }
      // Fetch all names in parallel for speed
      const namePromises = firebaseUids.map(uid => 
        this.getUserName(uid).then(name => ({ uid, name })).catch(err => {
          console.error(`Error fetching name for ${uid}:`, err);
          return { uid, name: null };
        })
      );
      
      const results = await Promise.all(namePromises);
      const nameMap = {};
      results.forEach(({ uid, name }) => {
        if (name && !name.includes('undefined')) {
          nameMap[uid] = name;
        }
      });
      return nameMap;
    } catch (error) {
      console.error('Error fetching user names:', error);
      return {};
    }
  }

  // ================================
  // WebSocket Message Sending
  // ================================

  sendWebSocketMessage(route, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        action: route,
        data: data
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  // kept for future; prefer explicit calls from hook

  sendTypingIndicator(conversationId, isTyping) {
    this.sendWebSocketMessage('typing', {
      conversationId,
      isTyping
    });
  }

  markMessagesAsReadWebSocket(conversationId, userId) {
    this.sendWebSocketMessage('markRead', {
      conversationId,
      userId
    });
  }

  // ================================
  // Utility Methods
  // ================================

  generateConversationId(senderId, receiverId) {
    // Sort IDs to ensure consistent conversation ID
    const sortedIds = [senderId, receiverId].sort();
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
  }

  setCurrentUser(userId, userName, userRole) {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserRole = userRole;
  }
}

// Create singleton instance
const chatApiService = new ChatApiService();

export default chatApiService;