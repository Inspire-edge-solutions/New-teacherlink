/**
 * Utility functions for formatting job data
 */

/**
 * Format qualification data for display
 * @param {string|Array|Object} qualification - Qualification data in various formats
 * @returns {string} Formatted qualification string with proper comma separation and uppercase
 */
export const formatQualification = (qualification) => {
  if (!qualification) return 'Not specified';
  
  // Handle different data types
  let qualArray = [];
  
  if (typeof qualification === 'string') {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qualification);
      if (Array.isArray(parsed)) {
        qualArray = parsed;
      } else {
        // If it's a string with commas, split it
        qualArray = qualification.split(',').map(q => q.trim()).filter(q => q);
      }
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      qualArray = qualification.split(',').map(q => q.trim()).filter(q => q);
    }
  } else if (Array.isArray(qualification)) {
    qualArray = qualification;
  } else if (typeof qualification === 'object' && qualification !== null) {
    // If it's an object, try to extract values
    qualArray = Object.values(qualification).filter(q => q);
  } else {
    return String(qualification);
  }
  
  // Clean up and format each qualification
  const formatted = qualArray
    .filter(qual => qual && qual.toString().trim())
    .map(qual => {
      let qualStr = String(qual).trim();
      // Apply existing formatting rules
      qualStr = qualStr.replace(/grade(\d+)grade(\d+)/i, 'Grade $1 - Grade $2');
      qualStr = qualStr
        .replace(/(\bBBA\b)(\bMBA\b)/g, '$1, $2')
        .replace(/(\bBB\b)(\bA\b)/g, 'BBA')
        .replace(/(\bMB\b)(\bA\b)/g, 'MBA');
      // Convert to uppercase
      return qualStr.toUpperCase();
    });
  
  return formatted.length > 0 ? formatted.join(', ') : 'Not specified';
};

/**
 * Convert salary value to LPA (Lakhs Per Annum) format
 * Handles monthly salaries (20000, 20k) and annual salaries (240000)
 * @param {string|number} salaryValue - Salary value to convert
 * @returns {string} Formatted LPA string (e.g., "2.4 LPA")
 */
const convertSalaryToLPA = (salaryValue) => {
  if (!salaryValue && salaryValue !== 0) return null;
  
  // Convert to string and normalize
  let valueStr = String(salaryValue).trim();
  if (!valueStr) return null;
  
  // Handle "k" notation (e.g., "20k" = 20000)
  const hasK = /k$/i.test(valueStr);
  if (hasK) {
    valueStr = valueStr.replace(/k$/i, '');
  }
  
  // Extract numeric value
  const numericValue = parseFloat(valueStr);
  if (Number.isNaN(numericValue)) return null;
  
  // Convert "k" notation to actual number
  const actualValue = hasK ? numericValue * 1000 : numericValue;
  
  // Determine if it's monthly or annual
  // If value < 100000, assume it's monthly salary
  // If value >= 100000, assume it's already annual
  const annualSalary = actualValue < 100000 ? actualValue * 12 : actualValue;
  
  // Convert to LPA (divide by 100000)
  const lpa = annualSalary / 100000;
  
  // Format to 1 decimal place, remove trailing zeros
  const formattedLPA = parseFloat(lpa.toFixed(1));
  
  return `${formattedLPA} LPA`;
};

/**
 * Format salary range for display in LPA format
 * @param {string|number} minSalary - Minimum salary
 * @param {string|number} maxSalary - Maximum salary
 * @returns {string} Formatted salary string in LPA
 */
export const formatSalary = (minSalary, maxSalary) => {
  if (!minSalary && !maxSalary) return 'Salary not specified';
  
  const minLPA = convertSalaryToLPA(minSalary);
  const maxLPA = convertSalaryToLPA(maxSalary);
  
  if (!minLPA && !maxLPA) return 'Salary not specified';
  if (minLPA && maxLPA) return `${minLPA} to ${maxLPA}`;
  if (minLPA) return `${minLPA}+`;
  if (maxLPA) return `Up to ${maxLPA}`;
  
  return 'Salary not specified';
};

/**
 * Format location for display
 * @param {string} city - City name
 * @param {string} state - State name
 * @returns {string} Formatted location string
 */
export const formatLocation = (city, state) => {
  if (!city && !state) return 'Location not specified';
  if (!state) return city;
  if (!city) return state;
  return `${city}, ${state}`;
};