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
 * Map education type value to display label
 * Maps actual stored values from Education.jsx dropdowns
 * @param {string} educationType - Education type value from database
 * @returns {string} Formatted education type label
 */
export const formatEducationType = (educationType) => {
  if (!educationType) return 'Not specified';
  
  const normalized = String(educationType).toLowerCase().trim();
  
  // Map actual stored values from Education.jsx educationTypes array
  const mappings = {
    'grade10': 'Grade 10',
    'grade12': 'Grade 12',
    'degree': 'Degree',
    'masterdegree': 'Master Degree',
    'doctorate': 'Doctorate',
    'bed': 'B.Ed',
    'ded': 'D.Ed/D.EID',
    'nttmtt': 'NTT/MTT',
    'certificate': 'Certificate/Other Course'
  };
  
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Return capitalized version if not in mappings
  return String(educationType).charAt(0).toUpperCase() + String(educationType).slice(1);
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
            // Format the education type using the mapping function
            return formatEducationType(details.education_type);
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
 * Checks ONLY core expertise fields (not subjects)
 * @param {Object} candidate - Candidate object
 * @returns {string|Object} Core expertise string or object with display/full text
 */
export const parseCoreExpertise = (candidate) => {
  const formatExpertise = (expertise) => {
    if (!Array.isArray(expertise)) return expertise;
    if (expertise.length <= 3) {
      return expertise.join(', ');
    } else {
      const displayedExpertise = expertise.slice(0, 3).join(', ');
      const remainingCount = expertise.length - 3;
      const allExpertise = expertise.join(', ');
      return {
        display: `${displayedExpertise} +${remainingCount} more`,
        full: allExpertise,
        hasMore: true
      };
    }
  };

  // Helper to convert to array
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
      } catch {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [value].filter(Boolean);
  };

  // Check ONLY core expertise fields (not subjects)
  const coreExpertiseFields = [
    candidate.teaching_coreExpertise,
    candidate.teaching_core_expertise,
    candidate.core_expertise,
    candidate.teaching_administrative_coreExpertise,
    candidate.teaching_administrative_core_expertise
  ];

  for (const field of coreExpertiseFields) {
    const expertiseArray = toArray(field);
    if (expertiseArray.length > 0) {
      return formatExpertise(expertiseArray);
    }
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
 * Convert salary value to LPA (Lakhs Per Annum) format
 * Handles monthly salaries (20000, 20k) and annual salaries (240000)
 * @param {string|number} salaryValue - Salary value to convert
 * @returns {string|null} Formatted LPA string (e.g., "2.4 LPA") or null
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
  
  return `₹${formattedLPA} LPA`;
};

/**
 * Format salary to readable string in LPA format
 * Maps actual stored values from JobPreferences.jsx salaryRanges dropdown to LPA
 * @param {string|number} salary - Salary value from database
 * @returns {string} Formatted salary string in LPA
 */
export const formatSalary = (salary) => {
  if (!salary && salary !== 0) return 'Not specified';
  
  // If it's a string (stored range value), convert to LPA
  if (typeof salary === 'string') {
    const normalized = salary.toLowerCase().trim();
    
    // Map actual stored values from JobPreferences.jsx salaryRanges (these are monthly)
    // Convert monthly ranges to LPA ranges
    const rangeMappings = {
      'less_than_40k': 'Less than 4.8 LPA',      // 40k * 12 / 100000 = 4.8
      '40k_60k': '4.8 LPA to 7.2 LPA',          // 40k-60k monthly = 4.8-7.2 LPA
      '60k_80k': '7.2 LPA to 9.6 LPA',          // 60k-80k monthly = 7.2-9.6 LPA
      '80k_100k': '9.6 LPA to 12 LPA',          // 80k-100k monthly = 9.6-12 LPA
      '100k_120k': '12 LPA to 14.4 LPA',        // 100k-120k monthly = 12-14.4 LPA
      '120k_140k': '14.4 LPA to 16.8 LPA',      // 120k-140k monthly = 14.4-16.8 LPA
      '140k_160k': '16.8 LPA to 19.2 LPA',      // 140k-160k monthly = 16.8-19.2 LPA
      '160k_180k': '19.2 LPA to 21.6 LPA',      // 160k-180k monthly = 19.2-21.6 LPA
      '180k_200k': '21.6 LPA to 24 LPA',        // 180k-200k monthly = 21.6-24 LPA
      'more_than_200k': 'More than 24 LPA'      // >200k monthly = >24 LPA
    };
    
    if (rangeMappings[normalized]) {
      return rangeMappings[normalized];
    }
    
    // If it's a numeric string, try to parse and convert to LPA
    const numeric = parseFloat(salary);
    if (!Number.isNaN(numeric)) {
      // Validate: numbers less than 1000 are likely invalid salary values
      if (numeric < 1000) {
        return 'Not specified';
      }
      const lpaFormatted = convertSalaryToLPA(numeric);
      return lpaFormatted || 'Not specified';
    }
    
    // Return as-is if it's a string but not in mappings
    return salary;
  }
  
  // If it's a number, validate and convert to LPA
  if (typeof salary === 'number') {
    // Validate: numbers less than 1000 are likely invalid salary values
    if (salary < 1000) {
      return 'Not specified';
    }
    const lpaFormatted = convertSalaryToLPA(salary);
    return lpaFormatted || 'Not specified';
  }
  
  return 'Not specified';
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

/**
 * Build candidate subjects from various fields
 * Collects subjects from education details and candidate fields
 * @param {Object} candidate - Candidate object
 * @returns {Array<string>} Array of subject strings
 */
export const buildCandidateSubjects = (candidate) => {
  if (!candidate) return [];
  
  const subjects = new Set();
  
  // Get subjects from education details
  const { subjects: parsedSubjects } = parseEducation(candidate.education_details_json);
  parsedSubjects.forEach((subject) => {
    if (subject) subjects.add(subject);
  });
  
  // Helper to convert to array and add to set
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return value.split(',').map(s => s.trim());
      }
    }
    return [value];
  };
  
  // Collect from various candidate fields
  const subjectFields = [
    candidate.teaching_subjects,
    candidate.teaching_administrative_subjects,
    candidate.subjects_taught,
    candidate.core_subjects,
    candidate.coreSubjects
  ];
  
  subjectFields.forEach((field) => {
    toArray(field).forEach((subject) => {
      if (subject) subjects.add(subject);
    });
  });
  
  return Array.from(subjects);
};

/**
 * Get formatted subjects string for display
 * Uses ONLY subject fields (not core expertise)
 * @param {Object} candidate - Candidate object
 * @returns {string} Formatted subjects string
 */
export const getSubjectsString = (candidate) => {
  if (!candidate) return 'Not specified';
  
  const subjects = buildCandidateSubjects(candidate);
  if (subjects.length === 0) return 'Not specified';
  
  // Show first 2 subjects, then "+X more" if there are more
  if (subjects.length <= 2) {
    return subjects.join(', ');
  } else {
    const displayed = subjects.slice(0, 2).join(', ');
    const remaining = subjects.length - 2;
    return `${displayed} +${remaining} more`;
  }
};

/**
 * Format job type (Job Status) to readable string
 * @param {string} jobType - Job type value
 * @returns {string} Formatted job type string
 */
export const formatJobType = (jobType) => {
  if (!jobType) return 'Not specified';
  
  const normalized = String(jobType).toLowerCase().trim();
  const mappings = {
    'teaching': 'Teaching',
    'administration': 'Administration',
    'teachingandadmin': 'Teaching & Admin',
    'teaching_admin': 'Teaching & Admin',
    'teaching & admin': 'Teaching & Admin'
  };
  
  return mappings[normalized] || String(jobType).charAt(0).toUpperCase() + String(jobType).slice(1);
};

/**
 * Format notice period to readable string
 * Maps actual stored values from dropdowns to display labels
 * @param {string|number} noticePeriod - Notice period value
 * @returns {string} Formatted notice period string
 */
export const formatNoticePeriod = (noticePeriod) => {
  if (!noticePeriod && noticePeriod !== 0) return 'Not specified';
  
  const normalized = String(noticePeriod).toLowerCase().trim();
  
  // Map actual stored values from dropdowns
  const mappings = {
    // From JobPreferences.jsx (Job Seeker)
    'immediatejoiner': 'Immediate Joiner',
    'lessthan7': '< 7 days',
    'lessthan15': '< 15 days',
    'lessthan1month': '< 1 month',
    'morethan1month': '> 1 Month',
    // From CreateJobForm.jsx (Job Provider) - these use < and > symbols
    '<7': '< 7 days',
    '<15': '< 15 days',
    '<30': '< 1 month',
    '>30': '> 1 Month',
    // Legacy/alternative formats (for backward compatibility)
    'immediate': 'Immediate',
    'less_than_15': '< 15 days',
    '15days': '< 15 days',
    '15 days': '< 15 days',
    '1month': '< 1 month',
    '1 month': '< 1 month',
    '2months': '2 months',
    '2 months': '2 months',
    '3months': '3 months',
    '3 months': '3 months'
  };
  
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Handle case-sensitive matches for < and > symbols
  if (noticePeriod === '<7') return '< 7 days';
  if (noticePeriod === '<15') return '< 15 days';
  if (noticePeriod === '<30') return '< 1 month';
  if (noticePeriod === '>30') return '> 1 Month';
  
  // Handle numeric values
  const numeric = parseFloat(normalized);
  if (!Number.isNaN(numeric)) {
    if (numeric === 0) return 'Immediate';
    if (numeric < 7) return '< 7 days';
    if (numeric < 15) return '< 15 days';
    if (numeric < 30) return '< 1 month';
    if (numeric === 30) return '< 1 month';
    if (numeric > 30) return '> 1 Month';
  }
  
  return String(noticePeriod);
};

/**
 * Get preferred location string from candidate data
 * @param {Object} candidate - Candidate object
 * @returns {string} Formatted preferred location string
 */
export const getPreferredLocationString = (candidate) => {
  if (!candidate) return 'Not specified';
  
  const city = candidate.preferred_city;
  const state = candidate.preferred_state;
  const country = candidate.preferred_country;
  
  const parts = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  
  if (parts.length === 0) return 'Not specified';
  return parts.join(', ');
};

/**
 * Get formatted gender string
 * @param {Object} candidate - Candidate object
 * @returns {string} Formatted gender string
 */
export const getGenderString = (candidate) => {
  if (!candidate) return 'Not specified';
  
  const gender = candidate.gender || candidate.profileData?.gender;
  if (!gender) return 'Not specified';
  
  // Capitalize first letter
  return String(gender).charAt(0).toUpperCase() + String(gender).slice(1).toLowerCase();
};

/**
 * Get age from date of birth
 * Checks multiple possible field names for date of birth
 * @param {Object} candidate - Candidate object
 * @returns {string} Age string or 'Not specified'
 */
export const getAgeString = (candidate) => {
  if (!candidate) return 'Not specified';
  
  // Check multiple possible field names for date of birth
  const dateOfBirth = 
    candidate.dateOfBirth || 
    candidate.date_of_birth ||
    candidate.dob ||
    candidate.birthDate ||
    candidate.birth_date ||
    candidate.profileData?.dateOfBirth ||
    candidate.profileData?.date_of_birth ||
    candidate.profileData?.dob ||
    candidate.profile?.dateOfBirth ||
    candidate.profile?.date_of_birth;
  
  if (!dateOfBirth) return 'Not specified';
  
  try {
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return 'Not specified';
    
    // Validate that the date is reasonable (not in the future, not too old)
    const today = new Date();
    if (birthDate > today) return 'Not specified'; // Future date is invalid
    if (birthDate.getFullYear() < 1950) return 'Not specified'; // Too old to be valid
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Validate age is reasonable (between 18 and 100)
    if (age < 18 || age > 100) return 'Not specified';
    
    return `${age} Years`;
  } catch (error) {
    return 'Not specified';
  }
};

/**
 * Get highest qualification from education details
 * @param {string} eduJson - Education details JSON string
 * @returns {string} Highest qualification or default message
 */
export const getQualificationString = (eduJson) => {
  if (!eduJson) return 'Not specified';
  
  try {
    const { types } = parseEducation(eduJson);
    if (types.length === 0) return 'Not specified';
    
    // Priority order: doctorate > masterDegree > degree > bEd > dEd > grade12 > grade10 > others
    const priority = {
      'doctorate': 8,
      'masterdegree': 7,
      'degree': 6,
      'bed': 5,
      'ded': 4,
      'nttmtt': 3,
      'grade12': 2,
      'grade10': 1
    };
    
    // Find highest priority qualification
    let highestQual = null;
    let highestPriority = 0;
    
    types.forEach(type => {
      const normalized = String(type).toLowerCase().trim();
      const currentPriority = priority[normalized] || 0;
      if (currentPriority > highestPriority) {
        highestPriority = currentPriority;
        highestQual = type;
      }
    });
    
    if (highestQual) {
      return formatEducationType(highestQual);
    }
    
    // If no priority match, return first type formatted
    return formatEducationType(types[0]);
  } catch (error) {
    console.error('Error parsing qualification:', error);
    return 'Not specified';
  }
};