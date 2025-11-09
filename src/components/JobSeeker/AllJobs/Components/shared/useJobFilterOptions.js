import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SUBJECTS_ENDPOINT = `${import.meta.env.VITE_DEV1_API}/education-data`;
const CONSTANTS_ENDPOINT = `${import.meta.env.VITE_DEV1_API}/constants`;

const initialOptions = {
  subjects: [],
  education: [],
  designations: [],
  grades: [],
  curriculum: [],
  coreExpertise: []
};

const initialLoading = {
  subjects: false,
  constants: false
};

const uniqueByValue = (options = []) => {
  const map = new Map();
  options.forEach((option) => {
    const key = option.value || option.label;
    if (key && !map.has(key)) {
      map.set(key, option);
    }
  });
  return Array.from(map.values());
};

const extractEducationOptions = (items = []) => {
  const categories = [
    'Diploma',
    'Degrees',
    'MasterDegree',
    'Doctorate',
    'BachelorDegree',
    'Certification',
    'PostGraduate',
    'UnderGraduate'
  ];

  return items.filter((item) => {
    const category = item.category || '';
    return categories.includes(category) || /degree|diploma|doctor/i.test(category);
  });
};

const useJobFilterOptions = () => {
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(initialLoading);

  const fetchSubjects = useCallback(async () => {
    setLoading((prev) => ({ ...prev, subjects: true }));
    try {
      const response = await axios.get(SUBJECTS_ENDPOINT);
      const data = Array.isArray(response.data) ? response.data : [];
      const formattedSubjects = data.map((subject) => ({
        value: subject.value || subject,
        label: subject.label || subject
      }));

      setOptions((prev) => ({
        ...prev,
        subjects: formattedSubjects
      }));
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading((prev) => ({ ...prev, subjects: false }));
    }
  }, []);

  const fetchConstants = useCallback(async () => {
    setLoading((prev) => ({ ...prev, constants: true }));
    try {
      const response = await axios.get(CONSTANTS_ENDPOINT);
      const data = Array.isArray(response.data) ? response.data : [];
      const transformedData = data.map((item) => ({
        category: item.category,
        value: item.value,
        label: item.label
      }));

      const educationOptions = uniqueByValue(extractEducationOptions(transformedData));

      setOptions((prev) => ({
        ...prev,
        designations: transformedData.filter(
          (item) => item.category === 'Teaching' || item.category === 'Administration'
        ),
        grades: transformedData.filter((item) => item.category === 'Grades'),
        curriculum: transformedData.filter((item) => item.category === 'Curriculum'),
        coreExpertise: transformedData.filter((item) => item.category === 'Core Expertise'),
        education: educationOptions
      }));
    } catch (error) {
      console.error('Error fetching constants:', error);
    } finally {
      setLoading((prev) => ({ ...prev, constants: false }));
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    fetchConstants();
  }, [fetchSubjects, fetchConstants]);

  return {
    options,
    loading,
    refresh: {
      fetchSubjects,
      fetchConstants
    }
  };
};

export default useJobFilterOptions;

