/**
 * Candidate Data Transformation Utilities
 * 
 * This file contains all data parsing and transformation functions
 * for candidate profiles. These utilities handle the complex data formats
 * from the backend and transform them into usable structures.
 */

/**
 * Parse languages from various data formats (JSON, array, comma-separated string)
 * @param {string|Array|Object} languageData - Raw language data in various formats
 * @returns {Array<string>} Array of language strings
 */
export const parseLanguages = (languageData) => {
  if (!languageData) return [];
  
  try {
    // If it's already an array
    if (Array.isArray(languageData)) {
      return languageData.map(lang => {
        if (typeof lang === 'string') return lang.trim();
        if (lang && lang.language) return lang.language.trim();
        return String(lang).trim();
      }).filter(Boolean);
    }
      
    // If it's a string that might be JSON
    if (typeof languageData === 'string') {
      try {
        const parsed = JSON.parse(languageData);
        if (Array.isArray(parsed)) {
          return parsed.map(lang => {
            if (typeof lang === 'string') return lang.trim();
            if (lang && lang.language) return lang.language.trim();
            return String(lang).trim();
          }).filter(Boolean);
        }
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return languageData.split(',').map(lang => lang.trim()).filter(Boolean);
      }
    }
    
    return [String(languageData).trim()].filter(Boolean);
  } catch (error) {
    console.error('Error parsing languages:', error);
    return [];
  }
};

/**
 * Parse education details from JSON string format
 * Handles malformed JSON and various field name variations
 * @param {string} educationJson - JSON string containing education details
 * @returns {Object} Object with types and subjects arrays
 */
export const parseEducation = (educationJson) => {
  if (!educationJson) return { types: [], subjects: [] };
  
  try {
    const typesSet = new Set();
    const subjects = [];
    
    // Match JSON objects in the string - handles nested objects
    const jsonObjects = educationJson.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
    
    jsonObjects.forEach(jsonStr => {
      try {
        // Enhanced JSON cleaning to handle malformed JSON
        let cleanObj = jsonStr
          .replace(/"\[\\?"([^"]+)\\?"\]"/g, '"[$1]"')  // Fix array notation
          .replace(/\\"/g, '"')                         // Fix escaped quotes
          .replace(/,\s*([\]}])/g, '$1')               // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Quote keys
          .replace(/:\s*'([^']*)'/g, ':"$1"')          // Convert single to double quotes
          .replace(/:\s*([^",\{\}\[\]]+?)(?=[,\}])/g, ':"$1"'); // Quote unquoted values
        
        const detail = JSON.parse(cleanObj);
        
        // Check for various possible field names for education type
        const pushValue = (value) => {
          if (value == null) return;
          if (Array.isArray(value)) {
            value.forEach(pushValue);
            return;
          }
          const stringValue = value.toString().trim();
          if (stringValue) {
            typesSet.add(stringValue);
          }
        };

        const typeCandidates = [
          detail.education_type,
          detail.educationType,
          detail.type,
          detail.education_category,
          detail.category,
          detail.level,
          detail.education_level
        ];
        typeCandidates.forEach(pushValue);

        const qualificationCandidates = [
          detail.degree,
          detail.degreeName,
          detail.degree_name,
          detail.course,
          detail.course_name,
          detail.courseName,
          detail.program,
          detail.program_name,
          detail.qualification,
          detail.qualification_name,
          detail.specialization_name,
          detail.specialization,
          detail.major,
          detail.stream
        ];
        qualificationCandidates.forEach(pushValue);
          
        // Check for various possible field names for core subjects
        let subjectList = detail.coreSubjects || detail.core_subjects || 
                          detail.subjects || detail.specialization;
          
        if (subjectList) {
          if (typeof subjectList === 'string') {
            try {
              // Try to parse as JSON first
              subjectList = JSON.parse(subjectList.replace(/\\"/g, '"'));
            } catch {
              // If JSON parsing fails, try regex to extract quoted strings
              const matches = subjectList.match(/"([^"]+)"/g);
              if (matches) {
                subjectList = matches.map(s => s.replace(/"/g, ''));
              } else {
                // Fallback to comma-separated split
                subjectList = subjectList.split(',').map(s => s.trim());
              }
            }
          }
            
          const subjectsArray = Array.isArray(subjectList) ? subjectList : [subjectList];
          subjectsArray.forEach(subject => {
            if (subject && typeof subject === 'string') {
              subjects.push(subject.trim());
            }
          });
        }
      } catch (error) {
        // Skip invalid JSON objects silently
      }
    });
    
    return { types: Array.from(typesSet), subjects };
  } catch (error) {
    console.error('Error parsing education details:', error);
    return { types: [], subjects: [] };
  }
};

/**
 * Format experience in years to readable string
 * @param {number|string} years - Number of years of experience
 * @returns {string} Formatted experience string
 */
export const getExperience = (years) => {
  if (!years || isNaN(years)) return 'Not specified';
  const numYears = parseFloat(years);
  return `${numYears} ${numYears === 1 ? 'year' : 'years'}`;
};

/**
 * Parse education details and return the primary education type
 * @param {string} eduJson - Education details JSON string
 * @returns {string} Primary education type or default message
 */
export const parseEducationDetails = (eduJson) => {
  if (!eduJson) return 'Not specified';
  
  try {
    const jsonObjects = eduJson.match(/\{[^}]+\}/g);
    if (jsonObjects && jsonObjects.length > 0) {
      for (const jsonStr of jsonObjects) {
        try {
          const details = JSON.parse(jsonStr);
          if (details.education_type) {
            return details.education_type;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return 'Education details not available';
  } catch (error) {
    console.error('Error parsing education details:', error);
    return 'Error parsing education details';
  }
};

/**
 * Parse core expertise from candidate object
 * Checks multiple possible fields and formats the output
 * @param {Object} candidate - Candidate object
 * @returns {string|Object} Core expertise string or object with display/full text
 */
export const parseCoreExpertise = (candidate) => {
  const formatSubjects = (subjects) => {
    if (!Array.isArray(subjects)) return subjects;
    if (subjects.length <= 3) {
      return subjects.join(', ');
    } else {
      const displayedSubjects = subjects.slice(0, 3).join(', ');
      const remainingCount = subjects.length - 3;
      const allSubjects = subjects.join(', ');
      return {
        display: `${displayedSubjects} +${remainingCount} more`,
        full: allSubjects,
        hasMore: true
      };
    }
  };

  // Check various fields in order of priority
  if (candidate.teaching_coreExpertise && candidate.teaching_coreExpertise.length > 0) {
    return formatSubjects(candidate.teaching_coreExpertise);
  }
  if (candidate.teaching_subjects && candidate.teaching_subjects.length > 0) {
    return formatSubjects(candidate.teaching_subjects);
  }
  if (candidate.teaching_administrative_coreExpertise && candidate.teaching_administrative_coreExpertise.length > 0) {
    return formatSubjects(candidate.teaching_administrative_coreExpertise);
  }
  if (candidate.teaching_administrative_subjects && candidate.teaching_administrative_subjects.length > 0) {
    return formatSubjects(candidate.teaching_administrative_subjects);
  }
  if (candidate.subjects_taught && candidate.subjects_taught.length > 0) {
    return formatSubjects(candidate.subjects_taught);
  }
  if (candidate.core_subjects && candidate.core_subjects.length > 0) {
    return formatSubjects(candidate.core_subjects);
  }
  if (candidate.grades_taught) {
    return `Grade ${candidate.grades_taught}`;
  }
  if (candidate.curriculum_taught) {
    return candidate.curriculum_taught;
  }
  return 'Core expertise not available';
};

/**
 * Get location string from candidate data
 * Checks present and permanent locations
 * @param {Object} candidate - Candidate object
 * @returns {string} Formatted location string
 */
export const getLocationString = (candidate) => {
  const city = candidate.present_city_name || candidate.permanent_city_name;
  const state = candidate.present_state_name || candidate.permanent_state_name;
  
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return 'Location not specified';
};

/**
 * Get candidate ID from various possible fields
 * @param {Object} candidate - Candidate object
 * @returns {string|null} Candidate ID
 */
export const getCandidateId = (candidate) => {
  return candidate?.firebase_uid || candidate?.uid || candidate?.id || null;
};

/**
 * Format salary to readable string with currency
 * @param {number} salary - Salary amount
 * @returns {string} Formatted salary string
 */
export const formatSalary = (salary) => {
  if (!salary || isNaN(salary)) return 'Not specified';
  return `₹${parseInt(salary).toLocaleString()}`;
};

/**
 * Calculate time ago from a date
 * @param {string|Date} date - Date to calculate from
 * @returns {string} Human-readable time ago string
 */
export const timeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

/**
 * Extract unique values from array of candidates for a specific field
 * Useful for building filter options
 * @param {Array} candidates - Array of candidate objects
 * @param {string} field - Field name to extract
 * @returns {Array} Array of unique values
 */
export const extractUniqueValues = (candidates, field) => {
  if (!Array.isArray(candidates)) return [];
  
  const values = new Set();
  candidates.forEach(candidate => {
    const value = candidate[field];
    if (value && typeof value === 'string' && value.trim()) {
      values.add(value.trim());
    }
  });
  
  return Array.from(values).sort();
};

/**
 * Format options for select dropdowns
 * @param {Array|Set} values - Array or Set of values
 * @returns {Array} Array of {value, label} objects
 */
export const formatSelectOptions = (values) => {
  const valuesArray = Array.isArray(values) ? values : Array.from(values);
  return valuesArray
    .filter(Boolean)
    .map(value => ({
      value: value,
      label: value
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Validate if candidate has minimum required fields
 * @param {Object} candidate - Candidate object
 * @returns {boolean} True if candidate has minimum required fields
 */
export const isValidCandidate = (candidate) => {
  if (!candidate) return false;
  
  const hasId = !!(candidate.firebase_uid || candidate.uid || candidate.id);
  const hasName = !!(candidate.fullName || candidate.name);
  
  return hasId && hasName;
};

