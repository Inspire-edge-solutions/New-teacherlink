// Profile completion calculation utility
export const calculateProfileCompletion = (formData, mode = 'easy') => {
  if (!formData || typeof formData !== 'object') {
    return { percentage: 0, completedSections: [], missingSections: [] };
  }

  const easyModeFields = {
    personalDetails: {
      weight: 25,
      fields: ['fullName', 'email', 'callingNumber', 'gender'],
      label: 'Personal Details'
    },
    address: {
      weight: 15,
      fields: ['presentAddress', 'presentState', 'presentCountry', 'address', 'city_name', 'state_name', 'country_name'],
      label: 'Address'
    },
    education: {
      weight: 35,
      fields: ['degreeName', 'degreeYear', 'grade12Year', 'education_type', 'syllabus', 'schoolName', 'courseName'],
      label: 'Education'
    },
    experience: {
      weight: 15,
      fields: ['teachingExperience', 'teaching_experience_years', 'teaching_experience_months', 'total_experience_years', 'total_experience_months'],
      label: 'Experience'
    },
    jobPreferences: {
      weight: 10,
      fields: ['Job_Type', 'expected_salary', 'preferredJobType', 'preferredLocation'],
      label: 'Job Preferences'
    }
  };

  const fullModeFields = {
    personalDetails: {
      weight: 20,
      fields: ['fullName', 'email', 'callingNumber', 'gender', 'dateOfBirth'],
      label: 'Personal Details'
    },
    address: {
      weight: 10,
      fields: ['presentAddress', 'presentState', 'presentCountry', 'permanentAddress', 'permanentState', 'permanentCountry', 'address', 'city_name', 'state_name', 'country_name'],
      label: 'Address'
    },
    languages: {
      weight: 5,
      fields: ['languages', 'language_name'],
      label: 'Languages'
    },
    education: {
      weight: 30,
      fields: ['degreeName', 'degreeYear', 'degreeCollege', 'degreePercentage', 'grade12Year', 'grade12School', 'grade12Percentage', 'education_type', 'syllabus', 'schoolName', 'courseName'],
      label: 'Education'
    },
    experience: {
      weight: 20,
      fields: ['teachingExperience', 'adminExperience', 'teaching_experience_years', 'teaching_experience_months', 'total_experience_years', 'total_experience_months'],
      label: 'Experience'
    },
    jobPreferences: {
      weight: 10,
      fields: ['Job_Type', 'expected_salary', 'preferredJobType', 'preferredLocation'],
      label: 'Job Preferences'
    },
    social: {
      weight: 2.5,
      fields: ['linkedin', 'facebook', 'twitter', 'instagram'],
      label: 'Social Media'
    },
    additionalInfo: {
      weight: 2.5,
      fields: ['computer_skills', 'projects', 'accomplishments', 'certifications', 'research_publications', 'patents', 'religion', 'citizenship', 'additional_info'],
      label: 'Additional Information'
    }
  };

  const fieldsToCheck = mode === 'easy' ? easyModeFields : fullModeFields;
  
  let totalWeight = 0;
  let completedWeight = 0;
  const completedSections = [];
  const missingSections = [];

  Object.entries(fieldsToCheck).forEach(([sectionKey, section]) => {
    totalWeight += section.weight;
    
    const sectionCompletion = calculateSectionCompletion(formData, section.fields);
    
    if (sectionCompletion.percentage > 0) {
      completedWeight += (section.weight * sectionCompletion.percentage / 100);
      
      if (sectionCompletion.percentage === 100) {
        completedSections.push({
          name: section.label,
          percentage: 100
        });
      } else {
        completedSections.push({
          name: section.label,
          percentage: sectionCompletion.percentage,
          missingFields: sectionCompletion.missingFields
        });
      }
    } else {
      missingSections.push({
        name: section.label,
        missingFields: sectionCompletion.missingFields
      });
    }
  });

  const percentage = Math.round((completedWeight / totalWeight) * 100);

  return {
    percentage,
    completedSections,
    missingSections,
    mode
  };
};

const calculateSectionCompletion = (formData, fields) => {
  if (!fields || fields.length === 0) {
    return { percentage: 0, missingFields: [] };
  }

  let completedFields = 0;
  const missingFields = [];

  fields.forEach(field => {
    const value = getNestedValue(formData, field);
    
    if (isFieldComplete(value)) {
      completedFields++;
    } else {
      missingFields.push(field);
    }
  });

  const percentage = Math.round((completedFields / fields.length) * 100);
  
  return {
    percentage,
    missingFields
  };
};

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

const isFieldComplete = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return false;
    }
    
    // Handle JSON strings (like computer_skills)
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.length > 0 && parsed.some(item => 
            item !== null && item !== undefined && item !== ''
          );
        }
        if (typeof parsed === 'object') {
          return Object.values(parsed).some(val => 
            val !== null && val !== undefined && val !== ''
          );
        }
      } catch (e) {
        // If JSON parsing fails, treat as regular string
        return trimmed.length > 0;
      }
    }
    
    return trimmed.length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0 && value.some(item => 
      item !== null && item !== undefined && item !== ''
    );
  }
  
  if (typeof value === 'object') {
    return Object.values(value).some(val => 
      val !== null && val !== undefined && val !== ''
    );
  }
  
  if (typeof value === 'number') {
    return value >= 0; // Consider 0 as valid for numeric fields
  }
  
  if (typeof value === 'boolean') {
    return true; // Boolean fields are considered complete if they have a value
  }
  
  return true;
};

// Get profile completion status text
export const getCompletionStatus = (percentage) => {
  if (percentage === 0) return { text: 'Not Started', color: '#dc3545' };
  if (percentage < 25) return { text: 'Just Started', color: '#fd7e14' };
  if (percentage < 50) return { text: 'In Progress', color: '#ffc107' };
  if (percentage < 75) return { text: 'Almost There', color: '#20c997' };
  if (percentage < 100) return { text: 'Nearly Complete', color: '#0d6efd' };
  return { text: 'Complete', color: '#198754' };
};

// Get next steps for profile completion
export const getNextSteps = (missingSections, mode) => {
  if (missingSections.length === 0) {
    return ['Your profile is complete! 🎉'];
  }

  const steps = [];
  const prioritySections = mode === 'easy' 
    ? ['Personal Details', 'Education', 'Experience']
    : ['Personal Details', 'Education', 'Experience', 'Job Preferences'];

  // Add priority sections first
  prioritySections.forEach(priority => {
    const section = missingSections.find(s => s.name === priority);
    if (section) {
      steps.push(`Complete ${section.name}`);
    }
  });

  // Add remaining sections
  missingSections.forEach(section => {
    if (!prioritySections.includes(section.name)) {
      steps.push(`Complete ${section.name}`);
    }
  });

  return steps.slice(0, 3); // Return top 3 next steps
}; 