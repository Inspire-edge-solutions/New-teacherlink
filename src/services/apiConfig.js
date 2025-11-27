/**
 * Centralized API Configuration Service
 * 
 * This service manages all API endpoints and provides a secure way to access them.
 * All API calls should go through this service to maintain consistency and security.
 * 
 * IMPORTANT: In production, set up a reverse proxy on your server (teacherlink.in)
 * to route /api/* requests to the actual AWS endpoints. This way, users will only
 * see teacherlink.in/api/* in the Network tab, not the actual AWS endpoints.
 */

// Base API URL - Use your domain in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? 'https://teacherlink.in/api'  // Production: Use your domain
    : '/api'  // Development: Use proxy or direct
  );

// AWS API Gateway Endpoints (for direct access if proxy is not set up)
// These should be moved to backend environment variables in production
const AWS_ENDPOINTS = {
  // Job Posting APIs
  JOB_POSTING: 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes',
  JOB_CLOSE: 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/jobClose',
  JOB_POST_INSTITUTES: 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes',
  
  // User & Profile APIs
  PERSONAL: 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal',
  ORGANISATION: 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation',
  LOGIN: 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login',
  PROFILE_APPROVED: 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved',
  PRESENT_ADDRESS: 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress',
  
  // Job Seeker APIs
  FAVROUTE_JOBS: 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs',
  FAVROUTE_USERS: 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser',
  APPLY_CANDIDATE: 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate',
  UNLOCK_CANDIDATE: 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/unlockCandidate',
  
  // Candidate APIs
  CANDIDATES: 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change',
  FULL_API: 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi',
  
  // Education & Preferences
  EDUCATION_DETAILS: 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails',
  JOB_PREFERENCE: 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference',
  APPROVE_MESSAGE: 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/approveMessage',
  
  // Coins & Payments
  COIN_REDEEM: 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem',
  REDEEM_GENERAL: 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem',
  COIN_HISTORY: 'https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history',
  
  // Communication
  WHATSAPP: 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp',
  RCS_MESSAGE: 'https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage',
  
  // Image Upload
  UPLOAD_IMAGE: 'https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image',
  
  // Chat
  CHAT_BASE: 'https://etm4h8r37d.execute-api.ap-south-1.amazonaws.com/dev',
  CHAT_WS: 'wss://p822j60sea.execute-api.ap-south-1.amazonaws.com/dev',
  
  // Other APIs
  USER_ENTRY: 'https://8ttpxl67x0.execute-api.ap-south-1.amazonaws.com/dev/userEntry',
  BLOCK_REASON: 'https://ripiv6jfrc.execute-api.ap-south-1.amazonaws.com/dev/block_reason',
  USERS_API: 'https://2u7ec1e22c.execute-api.ap-south-1.amazonaws.com/staging/users',
};

/**
 * Get API endpoint
 * @param {string} endpointKey - Key from AWS_ENDPOINTS
 * @param {boolean} useProxy - Whether to use proxy (default: true in production)
 * @returns {string} Full API URL
 */
export const getApiEndpoint = (endpointKey, useProxy = null) => {
  // Determine if we should use proxy
  const shouldUseProxy = useProxy !== null 
    ? useProxy 
    : import.meta.env.PROD; // Use proxy in production by default
  
  if (shouldUseProxy && API_BASE_URL) {
    // Extract the path from the AWS endpoint
    const awsUrl = AWS_ENDPOINTS[endpointKey];
    if (!awsUrl) {
      console.warn(`API endpoint key "${endpointKey}" not found`);
      return '';
    }
    
    // Extract path from AWS URL (e.g., /dev/jobPosting)
    const urlObj = new URL(awsUrl);
    const path = urlObj.pathname; // e.g., /dev/jobPosting
    
    // Return proxy URL
    return `${API_BASE_URL}${path}`;
  }
  
  // Return direct AWS endpoint
  return AWS_ENDPOINTS[endpointKey] || '';
};

/**
 * API Endpoint Constants
 * Use these in your components instead of hardcoded URLs
 */
export const API_ENDPOINTS = {
  // Job Posting
  JOB_POSTING: () => getApiEndpoint('JOB_POSTING'),
  JOB_CLOSE: () => getApiEndpoint('JOB_CLOSE'),
  JOB_POST_INSTITUTES: () => getApiEndpoint('JOB_POST_INSTITUTES'),
  
  // User & Profile
  PERSONAL: () => getApiEndpoint('PERSONAL'),
  ORGANISATION: () => getApiEndpoint('ORGANISATION'),
  LOGIN: () => getApiEndpoint('LOGIN'),
  PROFILE_APPROVED: () => getApiEndpoint('PROFILE_APPROVED'),
  PRESENT_ADDRESS: () => getApiEndpoint('PRESENT_ADDRESS'),
  
  // Job Seeker
  FAVROUTE_JOBS: () => getApiEndpoint('FAVROUTE_JOBS'),
  FAVROUTE_USERS: () => getApiEndpoint('FAVROUTE_USERS'),
  APPLY_CANDIDATE: () => getApiEndpoint('APPLY_CANDIDATE'),
  UNLOCK_CANDIDATE: () => getApiEndpoint('UNLOCK_CANDIDATE'),
  
  // Candidates
  CANDIDATES: () => getApiEndpoint('CANDIDATES'),
  FULL_API: () => getApiEndpoint('FULL_API'),
  
  // Education & Preferences
  EDUCATION_DETAILS: () => getApiEndpoint('EDUCATION_DETAILS'),
  JOB_PREFERENCE: () => getApiEndpoint('JOB_PREFERENCE'),
  APPROVE_MESSAGE: () => getApiEndpoint('APPROVE_MESSAGE'),
  
  // Coins & Payments
  COIN_REDEEM: () => getApiEndpoint('COIN_REDEEM'),
  COIN_HISTORY: () => getApiEndpoint('COIN_HISTORY'),
  
  // Communication
  WHATSAPP: () => getApiEndpoint('WHATSAPP'),
  RCS_MESSAGE: () => getApiEndpoint('RCS_MESSAGE'),
  
  // Image Upload
  UPLOAD_IMAGE: () => getApiEndpoint('UPLOAD_IMAGE'),
  
  // Chat
  CHAT_BASE: () => getApiEndpoint('CHAT_BASE'),
  CHAT_WS: () => AWS_ENDPOINTS.CHAT_WS, // WebSocket URLs typically can't be proxied easily
  
  // Other
  USER_ENTRY: () => getApiEndpoint('USER_ENTRY'),
  BLOCK_REASON: () => getApiEndpoint('BLOCK_REASON'),
  USERS_API: () => getApiEndpoint('USERS_API'),
};

/**
 * Create a full API URL with query parameters
 * @param {string} endpointKey - Key from AWS_ENDPOINTS
 * @param {object} params - Query parameters
 * @returns {string} Full API URL with query string
 */
export const createApiUrl = (endpointKey, params = {}) => {
  const baseUrl = getApiEndpoint(endpointKey);
  if (!baseUrl) return '';
  
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
};

export default API_ENDPOINTS;