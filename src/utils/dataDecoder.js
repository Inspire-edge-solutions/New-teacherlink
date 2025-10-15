/**
 * Data Decoder Utility
 * Decodes obfuscated data received from API back to real data
 */

/**
 * Decodes a single field if it's encoded
 * @param {string} value - The encoded or normal value
 * @returns {string} - Decoded value or original value
 */
const decodeField = (value) => {
    if (!value || typeof value !== 'string') return value;
    
    // Check if it's encoded (ends with _ENC)
    if (value.endsWith('_ENC')) {
      try {
        // Remove _ENC suffix and decode from base64 using browser's atob
        const encodedValue = value.slice(0, -4); // Remove '_ENC'
        return atob(encodedValue); // Browser's built-in base64 decoder
      } catch (error) {
        console.warn('Failed to decode field:', error);
        return value; // Return original if decoding fails
      }
    }
    
    // Return original value if not encoded
    return value;
  };
  
  /**
   * Decodes all obfuscated fields in a candidate object
   * @param {Object} candidate - Candidate object with potentially encoded fields
   * @returns {Object} - Candidate object with decoded fields
   */
  export const decodeCandidateData = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return candidate;
    
    return {
      ...candidate,
      // firebase_uid is kept as plain text (no decoding needed)
      callingNumber: decodeField(candidate.callingNumber),
      whatsappNumber: decodeField(candidate.whatsappNumber),
      email: decodeField(candidate.email),
      fullName: decodeField(candidate.fullName),
      permanent_address: decodeField(candidate.permanent_address),
      present_address: decodeField(candidate.present_address),
      aadhaar_number: decodeField(candidate.aadhaar_number),
    };
  };
  
  /**
   * Decodes an array of candidates
   * @param {Array} candidates - Array of candidate objects
   * @returns {Array} - Array of decoded candidate objects
   */
  export const decodeCandidatesData = (candidates) => {
    if (!Array.isArray(candidates)) return candidates;
    return candidates.map(candidate => decodeCandidateData(candidate));
  };
  
  export default {
    decodeField,
    decodeCandidateData,
    decodeCandidatesData
  };
  