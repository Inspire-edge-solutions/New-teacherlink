// ComponentInterface.js - Template for all form section components
// Each of your section components (PersonalDetails, Address, Education, etc.) 
// should implement these methods to work with the auto-save system

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import axios from 'axios';

const ComponentInterface = forwardRef((props, ref) => {
  const [formData, setFormData] = useState({});
  const [loading, setSaving] = useState(false);

  // Expose these methods to parent component
  useImperativeHandle(ref, () => ({
    validateFields,
    saveData,
    getData: () => formData
  }));

  // Validation method - return { isValid: boolean, errors: array }
  const validateFields = () => {
    const errors = [];
    
    // Example validation logic
    if (!formData.requiredField) {
      errors.push("Required field is missing");
    }
    
    // Add more validation rules as needed
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  // Save method - should call your API
  const saveData = async () => {
    setSaving(true);
    try {
      // Example API call - replace with your actual API endpoint
      const response = await axios.post('/api/save-section-data', {
        firebase_uid: props.formData?.firebase_uid,
        section: 'section_name', // personal_details, education, etc.
        data: formData
      });
      
      console.log('Data saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Handle form data changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update parent form data if needed
    if (props.updateFormData) {
      props.updateFormData({ [field]: value });
    }
  };

  return (
    <div className="component-section">
      {/* Your component JSX here */}
      {loading && <div className="saving-indicator">Saving...</div>}
      
      {/* Example form field */}
      <input
        type="text"
        value={formData.requiredField || ''}
        onChange={(e) => handleInputChange('requiredField', e.target.value)}
        placeholder="Required Field"
      />
    </div>
  );
});

export default ComponentInterface; 