// Chat API Service for TeacherLink
const CHAT_API_BASE = 'https://etm4h8r37d.execute-api.ap-south-1.amazonaws.com/dev';
const ORGANISATION_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';
const FAVROUTE_JOBS_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs';
const FAVROUTE_USERS_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const APPLY_CANDIDATE_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate';
const JOB_POSTING_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes';
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
        console.log('🔌 WebSocket already connected, verifying handler...');
        console.log('🔌 Existing WebSocket onmessage handler:', typeof this.ws.onmessage);
        // Ensure handler is still attached even if already connected
        if (!this.ws.onmessage) {
          console.warn('⚠️ Handler missing on existing connection! Re-attaching...');
          this.attachMessageHandler();
        }
        return;
      }
      if (this.ws.readyState === WebSocket.CONNECTING) {
        console.log('🔌 WebSocket is connecting, waiting...');
        return;
      }
      // Close existing connection if it's not open
      console.log('🔌 Closing existing WebSocket before creating new one');
      try {
        this.ws.close();
      } catch (e) {
        console.warn('⚠️ Error closing existing WebSocket:', e);
      }
    }
    if (this._connecting) {
      console.log('🔌 Already connecting, skipping');
      return;
    }
    this._connecting = true;
    this._lastParams = wsUrl;
    
    try {
      console.log('🔌 Creating new WebSocket connection to:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      // Verify onmessage handler is attached immediately after creation
      console.log('🔌 WebSocket created. Setting up handlers...');
      
      this.ws.onopen = () => {
        console.log('✅✅✅ WebSocket connected successfully! ✅✅✅');
        console.log('✅ WebSocket URL:', wsUrl);
        console.log('✅ ReadyState:', this.ws.readyState, '(OPEN =', WebSocket.OPEN, ')');
        console.log('✅ Verifying onmessage handler after onopen:', typeof this.ws.onmessage);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._connecting = false;
        // Emit connected event immediately to update UI
        console.log('✅ Emitting connected event...');
        this.emit('connected');
        // Double-check status after a brief delay to ensure it's set
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.isConnected = true;
            console.log('✅ Double-check: WebSocket still OPEN, emitting connected again');
            console.log('✅ Double-check: onmessage handler still attached:', typeof this.ws.onmessage);
            console.log('✅ Double-check: WebSocket instance:', this.ws);
            console.log('✅ Double-check: Handler function:', this.ws.onmessage);
            
            // Re-verify handler is still there and re-attach if needed
            if (!this.ws.onmessage) {
              console.error('❌❌❌ CRITICAL: onmessage handler was removed! Re-attaching...');
              this.attachMessageHandler();
            } else {
              // Test if handler is actually callable
              console.log('✅ Testing handler by checking if it can be called...');
              try {
                const handlerType = typeof this.ws.onmessage;
                console.log('✅ Handler type:', handlerType);
                if (handlerType === 'function') {
                  console.log('✅ Handler is a function - should work');
                } else {
                  console.error('❌ Handler is not a function! Type:', handlerType);
                }
              } catch (e) {
                console.error('❌ Error testing handler:', e);
              }
            }
            
            // Store reference to WebSocket for debugging
            window.__debugWebSocket = this.ws;
            console.log('✅ WebSocket stored in window.__debugWebSocket for debugging');
            
            this.emit('connected');
          } else {
            console.warn('⚠️ Double-check: WebSocket state changed to:', this.ws?.readyState);
          }
        }, 100);
      };

      // Attach message handler using a method to ensure it's always set
      this.attachMessageHandler();
      
      // Verify handler is attached
      console.log('🔌 onmessage handler attached:', typeof this.ws.onmessage);
      console.log('🔌 WebSocket readyState after setup:', this.ws.readyState);

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

  attachMessageHandler() {
    if (!this.ws) {
      console.warn('⚠️ Cannot attach handler - WebSocket does not exist');
      return;
    }
    
    console.log('🔌 Attaching message handler to WebSocket:', this.ws);
    console.log('🔌 WebSocket readyState:', this.ws.readyState);
    console.log('🔌 WebSocket URL:', this.ws.url);
    
    // Store reference to the WebSocket instance we're attaching to
    const wsInstance = this.ws;
    const serviceInstance = this;
    
    // Use arrow function to preserve 'this' context
    const messageHandler = (event) => {
      console.log('📨📨📨 WebSocket onmessage handler FIRED! 📨📨📨');
      console.log('📨 Event type:', event.type);
      console.log('📨 Event data type:', typeof event.data);
      console.log('📨 Event target:', event.target);
      console.log('📨 WebSocket instance match:', wsInstance === event.target ? '✅ MATCH' : '❌ MISMATCH');
      console.log('📨 Current serviceInstance.ws:', serviceInstance.ws);
      console.log('📨 Instance match:', wsInstance === serviceInstance.ws ? '✅ MATCH' : '❌ MISMATCH');
      
      try {
        console.log('📨 WebSocket raw message received:', event.data);
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket parsed data:', JSON.stringify(data, null, 2));
        console.log('📨 WebSocket message type:', data.type || data.action || 'NO TYPE');
        serviceInstance.handleWebSocketMessage(data);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('❌ Raw message data:', event.data);
      }
    };
    
    // Remove any existing listener first to avoid duplicates
    if (this._messageHandler && this.ws.removeEventListener) {
      try {
        this.ws.removeEventListener('message', this._messageHandler);
        console.log('🔌 Removed previous message listener');
      } catch (e) {
        console.warn('⚠️ Could not remove previous listener:', e);
      }
    }
    
    // Attach using BOTH methods for maximum compatibility
    // Method 1: onmessage property (standard)
    this.ws.onmessage = messageHandler;
    
    // Method 2: addEventListener (more robust, can't be overwritten as easily)
    if (this.ws.addEventListener) {
      this.ws.addEventListener('message', messageHandler);
      console.log('🔌 Also attached via addEventListener');
    }
    
    // Verify it's attached
    console.log('✅ Message handler attached successfully');
    console.log('✅ Handler function:', typeof this.ws.onmessage);
    console.log('✅ Handler matches:', this.ws.onmessage === messageHandler ? 'YES' : 'NO');
    
    // Store handler reference for debugging
    this._messageHandler = messageHandler;
    window.__debugWebSocketHandler = messageHandler;
    window.__debugWebSocket = this.ws;
    console.log('✅ Handler stored in window.__debugWebSocketHandler for debugging');
    console.log('✅ WebSocket stored in window.__debugWebSocket for debugging');
    
    // Add a test to verify handler works
    console.log('✅ You can test the handler manually with: window.__debugWebSocketHandler({data: \'{"test": true}\'})');
  }

  handleWebSocketMessage(data) {
    console.log('📡 Raw WebSocket data received:', JSON.stringify(data, null, 2));
    const { type, action } = data;
    
    // Handle both 'type' and 'action' fields
    const messageType = type || action;
    
    console.log('📡 Message type/action:', messageType);
    console.log('📡 Full data object keys:', Object.keys(data));
    
    switch (messageType) {
      case 'message':
      case 'sendMessage': {
        console.log('📡 Processing REAL-TIME message type');
        // Handle both data.message and data format
        // Backend sends: { type: 'message', conversationId: '...', message: {...} }
        // So we prefer data.message but also include top-level conversationId if present
        let messageData = data.message || data;
        
        console.log('📡 Initial messageData:', messageData);
        console.log('📡 data.message exists:', !!data.message);
        console.log('📡 data itself:', data);
        
        // Ensure we have a proper message object
        if (!messageData || (typeof messageData === 'object' && Object.keys(messageData).length === 0)) {
          console.warn('⚠️ Message data is empty or invalid, using full data object');
          messageData = data;
        }
        
        // If conversationId is at top level but not in message, use top-level one
        if (data.conversationId && !messageData.conversationId) {
          console.log('📡 Adding top-level conversationId to messageData');
          messageData.conversationId = data.conversationId;
        }
        
        // Ensure all required fields are present
        if (!messageData.conversationId && data.conversationId) {
          console.log('📡 Adding conversationId from data');
          messageData.conversationId = data.conversationId;
        }
        
        console.log('📡 Final messageData before emit:', JSON.stringify(messageData, null, 2));
        console.log('📡 About to emit newMessage event');
        this.emit('newMessage', messageData);
        console.log('📡 ✅ Emitted newMessage event');
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
    console.log(`📢 Emitting event: ${event}`, data ? `with data: ${JSON.stringify(data).substring(0, 200)}` : 'no data');
    const handlers = this.messageHandlers.get(event);
    console.log(`📢 Handlers for ${event}:`, handlers ? handlers.length : 0);
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).forEach(handler => {
        try {
          console.log(`📢 Calling handler for ${event}`);
          handler(data);
          console.log(`📢 Handler for ${event} completed`);
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

  async getAppliedJobs(currentUserId) {
    try {
      const response = await fetch(`${APPLY_CANDIDATE_API}?user_id=${currentUserId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Filter by is_applied === 1
      const appliedJobs = Array.isArray(data)
        ? data.filter(job => job.is_applied === 1)
        : [];
      return appliedJobs;
    } catch (error) {
      console.error('Error fetching applied jobs:', error);
      throw error;
    }
  }

  async getJobs() {
    try {
      const response = await fetch(JOB_POSTING_API);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Only return approved jobs
      return Array.isArray(data) ? data.filter(job => job.isApproved === 1) : [];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  }

  async getOrganisationsForJobSeeker(currentUserId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Fetching organizations for job seeker:', currentUserId);
      
      // First, fetch applied jobs data
      const appliedJobsData = await this.getAppliedJobs(currentUserId);
      
      if (appliedJobsData.length === 0) {
        return [];
      }
      
      // Extract job_ids from applied jobs
      const appliedJobIds = appliedJobsData
        .map(job => Number(job.job_id))
        .filter(id => !isNaN(id) && id > 0);
      
      if (appliedJobIds.length === 0) {
        return [];
      }
      
      // Fetch all jobs to get firebase_uid for each applied job
      const allJobs = await this.getJobs();
      
      // Create a map of job_id -> firebase_uid
      const jobIdToFirebaseUid = {};
      allJobs.forEach(job => {
        if (job.id && job.firebase_uid) {
          jobIdToFirebaseUid[Number(job.id)] = job.firebase_uid;
        }
      });
      
      // Get unique firebase_uids from applied jobs
      // First try job_firebase_uid from applied jobs response, then fallback to job details
      const uniqueFirebaseUids = [...new Set(
        appliedJobsData
          .map(job => {
            // First try job_firebase_uid from applied jobs response
            if (job.job_firebase_uid) {
              return job.job_firebase_uid;
            }
            // Fallback: get firebase_uid from job details using job_id
            const jobId = Number(job.job_id);
            return jobIdToFirebaseUid[jobId];
          })
          .filter(Boolean) // Remove undefined/null values
      )];
      
      if (uniqueFirebaseUids.length === 0) {
        return [];
      }
      
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

  // Helper function to get unlocked candidate IDs from localStorage
  getUnlockedCandidatesFromLocalStorage(currentUserId) {
    if (!currentUserId) return [];
    
    const unlockedCandidateIds = [];
    
    // Check all localStorage keys for unlocked candidates
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`unlocked_${currentUserId}_`)) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          
          const parsed = JSON.parse(stored);
          
          if (parsed.unlocked && parsed.timestamp) {
            const unlockTime = new Date(parsed.timestamp);
            const now = new Date();
            const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);
            
            // Only include if unlocked within 30 days (matching UnlockedCandidates component)
            if (daysDiff <= 30) {
              const candidateId = key.replace(`unlocked_${currentUserId}_`, '');
              if (candidateId) {
                unlockedCandidateIds.push(candidateId);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing localStorage item:', key, error);
          // Continue to next item if parsing fails
        }
      }
    }
    
    return unlockedCandidateIds;
  }

  async getCandidatesForJobProvider(currentUserId) {
    try {
      // Removed excessive logging - uncomment for debugging if needed
      // console.log('Fetching candidates for job provider:', currentUserId);
      
      // Get unlocked candidate IDs from localStorage (backward compatibility)
      const localStorageUnlockedIds = this.getUnlockedCandidatesFromLocalStorage(currentUserId);
      
      // Get unlocked candidate IDs from database (favrouteUsers table)
      const favrouteUsersData = await this.getFavrouteUsers();
      const databaseUnlockedIds = favrouteUsersData
        .filter(user => 
          String(user.added_by) === String(currentUserId) && 
          (user.unlocked_candidate === 1 || user.unblocked_candidate === 1)
        )
        .map(user => user.firebase_uid)
        .filter(Boolean);
      
      // Merge both sources (remove duplicates using Set)
      const allUnlockedIds = new Set([
        ...localStorageUnlockedIds.map(String),
        ...databaseUnlockedIds.map(String)
      ]);
      
      if (allUnlockedIds.size === 0) {
        return [];
      }
      
      // Fetch all personal users
      const allUsers = await this.getPersonalUsers();
      
      // Filter users by firebase_uid and return with fullName
      const filteredCandidates = allUsers
        .filter(user => allUnlockedIds.has(String(user.firebase_uid)))
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
    // Normalize IDs to handle case variations
    const normalizedSenderId = String(senderId || '').trim();
    const normalizedReceiverId = String(receiverId || '').trim();
    const sortedIds = [normalizedSenderId, normalizedReceiverId].sort();
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