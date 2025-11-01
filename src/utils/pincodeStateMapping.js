/**
 * Indian States to Pincode Prefixes Mapping
 * First 2 digits of Indian pincodes represent the region/state
 * 
 * Format: { 'State Name': ['prefix1', 'prefix2', ...] }
 * 
 * Note: Some prefixes may be shared between states in certain regions
 */

export const stateToPincodePrefixes = {
  'Andaman and Nicobar Islands': ['744'],
  'Andhra Pradesh': ['50', '51', '52', '53'],
  'Arunachal Pradesh': ['79'],
  'Assam': ['78'],
  'Bihar': ['80', '81', '82', '84', '85'],
  'Chandigarh': ['16'],
  'Chhattisgarh': ['49'],
  'Dadra and Nagar Haveli': ['396'],
  'Daman and Diu': ['396'],
  'Goa': ['403'],
  'Gujarat': ['36', '37', '38', '39'],
  'Haryana': ['12', '13'],
  'Himachal Pradesh': ['17'],
  'Jammu and Kashmir': ['180', '181', '182', '193'],
  'Jharkhand': ['81', '82'],
  'Karnataka': ['56', '57', '58', '59'],
  'Kerala': ['67', '68', '69'],
  'Ladakh': ['194'],
  'Lakshadweep': ['682'],
  'Madhya Pradesh': ['45', '46', '47', '48'],
  'Maharashtra': ['40', '41', '42', '43', '44'],
  'Manipur': ['79'],
  'Meghalaya': ['79'],
  'Mizoram': ['79'],
  'Nagaland': ['79'],
  'Delhi': ['11'],
  'Odisha': ['75', '76'],
  'Puducherry': ['605'],
  'Punjab': ['14', '15'],
  'Rajasthan': ['30', '31', '32', '33', '34'],
  'Sikkim': ['737'],
  'Tamil Nadu': ['60', '61', '62', '63', '64'],
  'Telangana': ['50', '51', '52', '53'],
  'Tripura': ['79'],
  'Uttar Pradesh': ['20', '21', '22', '24', '25', '26', '27', '28'],
  'Uttarakhand': ['24'],
  'West Bengal': ['70', '71', '72', '73', '74']
};

/**
 * Checks if a pincode belongs to the given state
 * @param {string} pincode - 6-digit pincode
 * @param {string} state - State name (must match exactly with mapping keys)
 * @returns {Object} { isValid: boolean, message: string | null }
 */
export const validatePincodeForState = (pincode, state) => {
  // If pincode or state is empty, skip validation
  if (!pincode || !state) {
    return { isValid: true, message: null };
  }

  // Get the pincode prefix (first 2-3 digits depending on the pattern)
  // For most states, it's first 2 digits, but some UTs have 3 digits
  const prefixes = stateToPincodePrefixes[state];
  
  // If state not found in mapping, skip validation (unknown state)
  if (!prefixes) {
    return { isValid: true, message: null };
  }

  // Check if pincode matches any of the state's prefixes
  const isValid = prefixes.some(prefix => {
    if (prefix.length === 3) {
      // For 3-digit prefixes, check first 3 digits
      return pincode.substring(0, 3) === prefix;
    } else {
      // For 2-digit prefixes, check first 2 digits
      return pincode.substring(0, 2) === prefix;
    }
  });

  return {
    isValid,
    message: isValid 
      ? null 
      : `Pincode ${pincode} does not belong to ${state}. Please enter a valid pincode.`
  };
};

/**
 * Get state name from pincode (reverse lookup)
 * @param {string} pincode - 6-digit pincode
 * @returns {string | null} State name or null if not found
 */
export const getStateFromPincode = (pincode) => {
  if (!pincode || pincode.length < 2) {
    return null;
  }

  // Try to find matching state based on first 2-3 digits
  for (const [state, prefixes] of Object.entries(stateToPincodePrefixes)) {
    const matches = prefixes.some(prefix => {
      if (prefix.length === 3) {
        return pincode.substring(0, 3) === prefix;
      } else {
        return pincode.substring(0, 2) === prefix;
      }
    });
    
    if (matches) {
      return state;
    }
  }

  return null;
};
