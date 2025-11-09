import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_DEV1_API;

const LANGUAGE_ENDPOINT = `${API_BASE}/languages`;
const EDUCATION_ENDPOINT = `${API_BASE}/education-data`;
const CONSTANTS_ENDPOINT = `${API_BASE}/constants`;

const initialOptions = {
  languages: [],
  education: [],
  coreSubjects: [],
  curriculum: [],
  designations: [],
  coreExpertise: [],
  grades: []
};

const initialLoading = {
  languages: false,
  education: false,
  constants: false
};

const uniqueByValue = (options = []) => {
  const map = new Map();
  options.forEach((option) => {
    const key = option?.value ?? option?.label;
    if (key && !map.has(key)) {
      map.set(key, {
        value: option.value ?? key,
        label: option.label ?? key
      });
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
    const category = item?.category || '';
    return categories.includes(category) || /degree|diploma|doctor/i.test(category);
  });
};

const useCandidateFilterOptions = () => {
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(initialLoading);

  const fetchLanguages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, languages: true }));
    try {
      const response = await axios.get(LANGUAGE_ENDPOINT);
      const languageOptions = Array.isArray(response.data)
        ? response.data
            .filter((item) => {
              const category = item?.category || '';
              return category.toLowerCase().includes('language');
            })
            .map((item) => ({
              value: item.value || item.label || item.language || item.name,
              label: item.label || item.value || item.language || item.name
            }))
        : [];

      setOptions((prev) => ({
        ...prev,
        languages: uniqueByValue(languageOptions)
      }));
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setLoading((prev) => ({ ...prev, languages: false }));
    }
  }, []);

  const fetchEducation = useCallback(async () => {
    setLoading((prev) => ({ ...prev, education: true }));
    try {
      const response = await axios.get(EDUCATION_ENDPOINT);
      const rawResponse = response.data;

      let raw = [];

      if (Array.isArray(rawResponse)) {
        raw = rawResponse;
      } else if (rawResponse?.data && Array.isArray(rawResponse.data)) {
        raw = rawResponse.data;
      } else if (rawResponse?.subjects && Array.isArray(rawResponse.subjects)) {
        raw = rawResponse.subjects;
    }

      const subjectOptions = Array.isArray(raw)
        ? raw.map((entry) =>
            typeof entry === 'object'
              ? {
                  value: entry.value ?? entry.label ?? entry.id ?? entry,
                  label: entry.label ?? entry.value ?? entry.name ?? entry.subject ?? entry.core_subject ?? entry.coreSubject ?? entry.id ?? entry
                }
              : {
                  value: entry,
                  label: entry
                }
          )
        : [];

      setOptions((prev) => ({
        ...prev,
        coreSubjects: uniqueByValue(subjectOptions)
      }));
    } catch (error) {
      console.error('Error fetching education data:', error);
    } finally {
      setLoading((prev) => ({ ...prev, education: false }));
    }
  }, []);

  const fetchConstants = useCallback(async () => {
    setLoading((prev) => ({ ...prev, constants: true }));
    try {
      const response = await axios.get(CONSTANTS_ENDPOINT);
      const data = Array.isArray(response.data) ? response.data : [];

      const transformedData = data.map((item) => ({
        category: item?.category,
        value: item?.value || item?.label,
        label: item?.label || item?.value
      }));

      const constantsByCategory = transformedData.reduce((acc, item) => {
        const category = item?.category;
        if (!category) return acc;

        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          value: item.value,
          label: item.label
        });
        return acc;
      }, {});

      const mapCategory = (names) =>
        names.reduce(
          (acc, name) => (constantsByCategory[name] ? acc.concat(constantsByCategory[name]) : acc),
          []
        );

      setOptions((prev) => ({
        ...prev,
        education: uniqueByValue(
          extractEducationOptions(transformedData).map((item) => ({
            value: item.value,
            label: item.label
          }))
        ),
        designations: uniqueByValue(
          mapCategory(['Teaching', 'Administration', 'Teaching Designations']).map((item) => ({
            value: item.value,
            label: item.label
          }))
        ),
        grades: uniqueByValue(
          mapCategory(['Grades']).map((item) => ({
            value: item.value,
            label: item.label
          }))
        ),
        curriculum: uniqueByValue(
          mapCategory(['Curriculum']).map((item) => ({
            value: item.value,
            label: item.label
          }))
        ),
        coreExpertise: uniqueByValue(
          mapCategory(['Core Expertise', 'CoreExpertise']).map((item) => ({
            value: item.value,
            label: item.label
          }))
        )
      }));
    } catch (error) {
      console.error('Error fetching constants for candidate filters:', error);
    } finally {
      setLoading((prev) => ({ ...prev, constants: false }));
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
    fetchEducation();
    fetchConstants();
  }, [fetchLanguages, fetchEducation, fetchConstants]);

  return {
    options,
    loading,
    refresh: {
      fetchLanguages,
      fetchEducation,
      fetchConstants
    }
  };
};

export default useCandidateFilterOptions;

