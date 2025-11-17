import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import InputWithTooltip from "../../../../../services/InputWithTooltip";
import { defaultJobFilters } from '../Sections/searchJobFilters';
import useJobFilterOptions from './useJobFilterOptions';
import { useAuth } from '../../../../../Context/AuthContext';

const JOB_PREFERENCES_API = "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference";

const FilterPanel = ({
  isOpen,
  onClose,
  onApplyFilters,
  onResetFilters,
  activeFiltersCount = 0
}) => {
  const createInitialFilters = () => {
    try {
      const saved = localStorage.getItem('jobFilters');
      return saved ? { ...defaultJobFilters, ...JSON.parse(saved) } : { ...defaultJobFilters };
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return { ...defaultJobFilters };
    }
  };

  const { user } = useAuth();
  const [filters, setFilters] = useState(createInitialFilters);
  const { options: apiOptions, loading: optionsLoading } = useJobFilterOptions();
  const hasAppliedPreferencesRef = useRef(false);
  const [userPreferencesData, setUserPreferencesData] = useState(null);
  const [pendingLocationPref, setPendingLocationPref] = useState({
    country: null,
    state: null,
    city: null
  });

  // Location options state
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Static filter options
  const filterOptions = useMemo(() => ({
    jobCategories: [
      { value: 'fullTime', label: 'Full Time' },
      { value: 'fullPart', label: 'Full Time / Part Time' },
      { value: 'partTime', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'freelance', label: 'Freelance' }
    ],
    jobShifts: [
      { value: 'Week days', label: 'Week days' },
      { value: 'All days', label: 'All days' },
      { value: 'Week ends', label: 'Week ends' },
      { value: 'Vacations', label: 'Vacations' },
    ],
    jobProcesses: [
      { value: 'Regular', label: 'Regular (Offline)' },
      { value: 'Online', label: 'Online' },
      { value: 'Hybrid', label: 'Hybrid' }
    ],
    jobSubProcesses: [
      { value: 'Online', label: 'Online' },
      { value: 'Tuition Center', label: 'Tuition Center' },
      { value: 'Group tuition', label: 'Group tuition' },
      { value: 'Private tuitions', label: 'Private tuitions' },
      { value: 'Home Tuitions', label: 'Home Tuitions' }
    ]
  }), []);

  const saveFiltersToStorage = useCallback((filtersToSave) => {
    try {
      localStorage.setItem('jobFilters', JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, []);

  // Select styles for consistent look
  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '45px',
      borderRadius: '0px',
      borderColor: '#e6e6e6',
      '&:hover': {
        borderColor: '#e6e6e6'
      }
    }),
    placeholder: (base) => ({
      ...base,
      color: '#888888'
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 10001
    })
  };

  // Load data on component mount
  useEffect(() => {
    GetCountries().then((countryData) => {
      const countries = countryData.map(country => ({
        value: country.id,
        label: country.name
      }));

      setLocationOptions(prev => ({
        ...prev,
        countries
      }));

      const indiaOption = countries.find(country => country.label && country.label.toLowerCase() === 'india');
      if (indiaOption) {
        setFilters(prev => {
          const currentLabel = String(prev.country?.label || prev.country?.value || '').toLowerCase();
          const currentValue = prev.country?.value;
          // Only update if country is null/empty, or if it's India but with wrong value type (string instead of number)
          if (!prev.country || currentLabel === '' || (currentLabel === 'india' && typeof currentValue !== 'number')) {
            const updated = { ...prev, country: indiaOption };
            saveFiltersToStorage(updated);
            return updated;
          }
          return prev;
        });
      }
    });
  }, [saveFiltersToStorage]);

  // Update states when country changes
  useEffect(() => {
    const countryValue = filters.country?.value;
    if (typeof countryValue === 'number') {
      GetState(countryValue).then((stateData) => {
        const states = stateData.map(state => ({
          value: state.id,
          label: state.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          states
        }));

        setFilters(prev => {
          const currentState = prev.state;
          const currentStateLabel = String(currentState?.label || currentState?.value || '').toLowerCase();

          const hasMatchingState = states.some((stateOption) => {
            const optionLabel = String(stateOption.label || '').toLowerCase();
            if (currentState?.value !== undefined && currentState?.value !== null && stateOption.value === currentState.value) {
              return true;
            }
            return optionLabel === currentStateLabel && currentStateLabel !== '';
          });

          if (hasMatchingState) {
            return prev;
          }

          if (prev.state === null && prev.city === null) {
            return prev;
          }

          const updatedFilters = {
            ...prev,
            state: null,
            city: null
          };

          saveFiltersToStorage(updatedFilters);
          return updatedFilters;
        });
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        states: [],
        cities: []
      }));
    }
  }, [filters.country, saveFiltersToStorage]);

  // Update cities when state changes
  useEffect(() => {
    const countryValue = filters.country?.value;
    const stateValue = filters.state?.value;
    if (typeof countryValue === 'number' && typeof stateValue === 'number') {
      GetCity(countryValue, stateValue).then((cityData) => {
        const cities = cityData.map(city => ({
          value: city.name,
          label: city.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          cities
        }));

        setFilters(prev => {
          const currentCity = prev.city;
          const currentCityLabel = String(currentCity?.label || currentCity?.value || '').toLowerCase();

          const hasMatchingCity = cities.some((cityOption) => {
            const optionLabel = String(cityOption.label || '').toLowerCase();
            if (currentCity?.value !== undefined && currentCity?.value !== null && cityOption.value === currentCity.value) {
              return true;
            }
            return optionLabel === currentCityLabel && currentCityLabel !== '';
          });

          if (hasMatchingCity) {
            return prev;
          }

          if (prev.city === null) {
            return prev;
          }

          const updatedFilters = {
            ...prev,
            city: null
          };

          saveFiltersToStorage(updatedFilters);
          return updatedFilters;
        });
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        cities: []
      }));
    }
  }, [filters.country, filters.state, saveFiltersToStorage]);

  const resolvePreferences = useCallback((payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.value)) {
      return payload.value;
    }

    if (payload && typeof payload.body === 'string') {
      try {
        const parsedBody = JSON.parse(payload.body);
        return resolvePreferences(parsedBody);
      } catch (error) {
        console.error('Error parsing job preference body:', error);
      }
    }

    if (payload && payload.body && Array.isArray(payload.body.value)) {
      return payload.body.value;
    }

    return [];
  }, []);

  const fetchJobPreferences = useCallback(async () => {
    if (!user?.uid || !isOpen) return;

    try {
      const response = await fetch(JOB_PREFERENCES_API);
      const data = await response.json();
      const preferencesArray = resolvePreferences(data);
      const uid = user.firebase_uid || user.uid;
      const userPreferences = preferencesArray.find((pref) => pref.firebase_uid === uid) || null;

      if (!userPreferences) {
        setUserPreferencesData(null);
        return;
      }

      hasAppliedPreferencesRef.current = false;
      setUserPreferencesData(userPreferences);
      setPendingLocationPref({
        country: userPreferences.preferred_country || null,
        state: userPreferences.preferred_state || null,
        city: userPreferences.preferred_city || null
      });
    } catch (error) {
      console.error('Error fetching job preferences:', error);
    }
  }, [isOpen, resolvePreferences, user]);

  useEffect(() => {
    fetchJobPreferences();
  }, [fetchJobPreferences]);

  useEffect(() => {
    hasAppliedPreferencesRef.current = false;
  }, [user?.uid, isOpen]);

  useEffect(() => {
    if (!pendingLocationPref.country || locationOptions.countries.length === 0) {
      return;
    }

    const preferredCountry = String(pendingLocationPref.country || '').toLowerCase();

    if (!preferredCountry) {
      setPendingLocationPref(prev => ({ ...prev, country: null }));
      return;
    }

    const countryOption = locationOptions.countries.find(
      (option) => option.label?.toLowerCase() === preferredCountry
    );

    setPendingLocationPref(prev => ({ ...prev, country: null }));

    if (!countryOption) {
      return;
    }

    setFilters(prev => {
      if (prev.country?.value === countryOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        country: countryOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [pendingLocationPref.country, locationOptions.countries, saveFiltersToStorage]);

  useEffect(() => {
    if (!pendingLocationPref.state || locationOptions.states.length === 0) {
      return;
    }

    const preferredState = String(pendingLocationPref.state || '').toLowerCase();
    if (!preferredState) {
      setPendingLocationPref(prev => ({ ...prev, state: null }));
      return;
    }

    const preferredCountryLabel = String(userPreferencesData?.preferred_country || '').toLowerCase();
    const selectedCountryLabel = String(
      filters.country?.label || filters.country?.value || ''
    ).toLowerCase();

    if (preferredCountryLabel && selectedCountryLabel !== preferredCountryLabel) {
      return;
    }

    const stateOption = locationOptions.states.find(
      (option) => option.label?.toLowerCase() === preferredState
    );

    setPendingLocationPref(prev => ({ ...prev, state: null }));

    if (!stateOption) {
      return;
    }

    setFilters(prev => {
      if (prev.state?.value === stateOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        state: stateOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [
    pendingLocationPref.state,
    locationOptions.states,
    filters.country,
    userPreferencesData,
    saveFiltersToStorage
  ]);

  useEffect(() => {
    if (!pendingLocationPref.city || locationOptions.cities.length === 0) {
      return;
    }

    const preferredCity = String(pendingLocationPref.city || '').toLowerCase();
    if (!preferredCity) {
      setPendingLocationPref(prev => ({ ...prev, city: null }));
      return;
    }

    const preferredStateLabel = String(userPreferencesData?.preferred_state || '').toLowerCase();
    const selectedStateLabel = String(
      filters.state?.label || filters.state?.value || ''
    ).toLowerCase();

    if (preferredStateLabel && selectedStateLabel !== preferredStateLabel) {
      return;
    }

    const cityOption = locationOptions.cities.find(
      (option) => option.label?.toLowerCase() === preferredCity
    );

    setPendingLocationPref(prev => ({ ...prev, city: null }));

    if (!cityOption) {
      return;
    }

    setFilters(prev => {
      if (prev.city?.value === cityOption.value) {
        return prev;
      }

      const updatedFilters = {
        ...prev,
        city: cityOption
      };

      saveFiltersToStorage(updatedFilters);
      return updatedFilters;
    });
  }, [
    pendingLocationPref.city,
    locationOptions.cities,
    filters.state,
    userPreferencesData,
    saveFiltersToStorage
  ]);

  useEffect(() => {
    if (!userPreferencesData || hasAppliedPreferencesRef.current) {
      return;
    }

    const normalize = (value) =>
      String(value ?? '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim();

    const matchOrCreateOption = (rawValue, optionList = []) => {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
      }

      const rawLabel =
        typeof rawValue === 'object' && rawValue !== null
          ? rawValue.label ?? rawValue.value
          : rawValue;
      const rawStoredValue =
        typeof rawValue === 'object' && rawValue !== null
          ? rawValue.value ?? rawValue.label
          : rawValue;

      const normalizedLabel = normalize(rawLabel);
      const normalizedValue = normalize(rawStoredValue);

      const matchedOption = optionList.find((option) => {
        const optionLabel = normalize(option.label);
        const optionValue = normalize(option.value);
        return (
          (optionLabel && optionLabel === normalizedLabel) ||
          (optionValue && optionValue === normalizedValue)
        );
      });

      if (matchedOption) {
        return matchedOption;
      }

      const label =
        typeof rawLabel === 'string' && rawLabel.trim().length > 0
          ? rawLabel
          : String(rawStoredValue ?? '').trim();

      const value =
        typeof rawStoredValue === 'string' && rawStoredValue.trim().length > 0
          ? rawStoredValue
          : label;

      if (!label) {
        return null;
      }

      return { value, label };
    };

    const mapListToOptions = (values, optionList = []) => {
      if (!Array.isArray(values) || values.length === 0) {
        return [];
      }

      const unique = new Map();

      values.forEach((item) => {
        const option = matchOrCreateOption(item, optionList);
        if (!option) {
          return;
        }

        const key = normalize(option.value) || normalize(option.label);
        if (key && !unique.has(key)) {
          unique.set(key, option);
        }
      });

      return Array.from(unique.values());
    };

    const isTruthy = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      const normalized = String(value).toLowerCase();
      return ['1', 'true', 'yes', 'activelysearching', 'available', 'looking'].includes(
        normalized.replace(/\s+/g, '')
      );
    };

    const hasFullTimeOnline = isTruthy(userPreferencesData.full_time_online);
    const hasFullTimeOffline = isTruthy(userPreferencesData.full_time_offline);
    const hasPartTimeWeekdays =
      isTruthy(userPreferencesData.part_time_weekdays_offline) ||
      isTruthy(userPreferencesData.part_time_weekdays_online);
    const hasPartTimeWeekends =
      isTruthy(userPreferencesData.part_time_weekends_offline) ||
      isTruthy(userPreferencesData.part_time_weekends_online);
    const hasPartTimeVacations =
      isTruthy(userPreferencesData.part_time_vacations_offline) ||
      isTruthy(userPreferencesData.part_time_vacations_online);

    const hasPartTime =
      hasPartTimeWeekdays || hasPartTimeWeekends || hasPartTimeVacations;
    const hasFullTime = hasFullTimeOnline || hasFullTimeOffline;

    let jobCategoryLabel = null;
    if (hasFullTime && hasPartTime) {
      jobCategoryLabel = 'Full Time / Part Time';
    } else if (hasFullTime) {
      jobCategoryLabel = 'Full Time';
    } else if (hasPartTime) {
      jobCategoryLabel = 'Part Time';
    }

    const jobCategoryOption = matchOrCreateOption(
      jobCategoryLabel,
      filterOptions.jobCategories
    );

    const jobProcessOption = (() => {
      if (hasFullTimeOnline && hasFullTimeOffline) {
        return matchOrCreateOption('Hybrid', filterOptions.jobProcesses);
      }
      if (hasFullTimeOnline) {
        return matchOrCreateOption('Online', filterOptions.jobProcesses);
      }
      if (hasFullTimeOffline) {
        return matchOrCreateOption('Regular', filterOptions.jobProcesses);
      }
      return null;
    })();

    const jobShiftsOption = (() => {
      if (hasPartTimeWeekdays && hasPartTimeWeekends) {
        return matchOrCreateOption('All days', filterOptions.jobShifts);
      }
      if (hasPartTimeWeekdays) {
        return matchOrCreateOption('Week days', filterOptions.jobShifts);
      }
      if (hasPartTimeWeekends) {
        return matchOrCreateOption('Week ends', filterOptions.jobShifts);
      }
      if (hasPartTimeVacations) {
        return matchOrCreateOption('Vacations', filterOptions.jobShifts);
      }
      return null;
    })();

    const jobSubProcessOption = (() => {
      const mapping = [
        {
          condition:
            isTruthy(userPreferencesData.Home_Tutor_offline) ||
            isTruthy(userPreferencesData.Home_Tutor_online),
          label: 'Home Tuitions'
        },
        {
          condition:
            isTruthy(userPreferencesData.Private_Tutor_offline) ||
            isTruthy(userPreferencesData.Private_Tutor_online) ||
            isTruthy(userPreferencesData.Private_Tutions_online_online),
          label: 'Private tuitions'
        },
        {
          condition:
            isTruthy(userPreferencesData.Group_Tutor_offline) ||
            isTruthy(userPreferencesData.Group_Tutor_online),
          label: 'Group tuition'
        },
        {
          condition:
            isTruthy(userPreferencesData.coaching_institute_offline) ||
            isTruthy(userPreferencesData.coaching_institute_online),
          label: 'Tuition Center'
        },
        {
          condition:
            isTruthy(userPreferencesData.school_college_university_online) ||
            isTruthy(userPreferencesData.Ed_TechCompanies_online),
          label: 'Online'
        }
      ];

      const entry = mapping.find((item) => item.condition);
      return entry ? matchOrCreateOption(entry.label, filterOptions.jobSubProcesses) : null;
    })();

    const subjects = mapListToOptions(
      [
        ...(userPreferencesData.teaching_subjects || []),
        ...(userPreferencesData.teaching_administrative_subjects || [])
      ],
      apiOptions.subjects
    );

    const designations = mapListToOptions(
      [
        ...(userPreferencesData.teaching_designations || []),
        ...(userPreferencesData.administrative_designations || []),
        ...(userPreferencesData.teaching_administrative_designations || [])
      ],
      apiOptions.designations
    );

    const grades = mapListToOptions(
      [
        ...(userPreferencesData.teaching_grades || []),
        ...(userPreferencesData.teaching_administrative_grades || [])
      ],
      apiOptions.grades
    );

    const curriculum = mapListToOptions(
      [
        ...(userPreferencesData.teaching_curriculum || []),
        ...(userPreferencesData.administrative_curriculum || []),
        ...(userPreferencesData.teaching_administrative_curriculum || [])
      ],
      apiOptions.curriculum
    );

    const coreExpertise = mapListToOptions(
      [
        ...(userPreferencesData.teaching_coreExpertise || []),
        ...(userPreferencesData.teaching_administrative_coreExpertise || [])
      ],
      apiOptions.coreExpertise
    );

    const preferenceFilters = {};

    if (jobCategoryOption) preferenceFilters.job_category = jobCategoryOption;
    if (subjects.length > 0) preferenceFilters.subjects = subjects;
    if (designations.length > 0) preferenceFilters.designations = designations;
    if (grades.length > 0) preferenceFilters.designated_grades = grades;
    if (curriculum.length > 0) preferenceFilters.curriculum = curriculum;
    if (coreExpertise.length > 0) preferenceFilters.core_expertise = coreExpertise;
    if (jobProcessOption) preferenceFilters.job_process = jobProcessOption;
    if (jobShiftsOption) preferenceFilters.job_shifts = jobShiftsOption;
    if (jobSubProcessOption) preferenceFilters.job_sub_process = jobSubProcessOption;

    if (Object.keys(preferenceFilters).length === 0) {
      hasAppliedPreferencesRef.current = true;
      return;
    }

    setFilters((prev) => {
      const mergedFilters = {
        ...prev,
        ...preferenceFilters
      };

      saveFiltersToStorage(mergedFilters);
      return mergedFilters;
    });

    hasAppliedPreferencesRef.current = true;
  }, [apiOptions, filterOptions, saveFiltersToStorage, userPreferencesData]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };

    saveFiltersToStorage(newFilters);
    setFilters(newFilters);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    handleFilterChange(name, value);
  };

  // Handle apply filters
  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  // Handle reset filters
  const handleReset = () => {
    const resetFilters = { ...defaultJobFilters };
    
    // If countries are loaded, ensure India is properly mapped with numeric ID
    if (locationOptions.countries.length > 0) {
      const indiaOption = locationOptions.countries.find(
        country => country.label && country.label.toLowerCase() === 'india'
      );
      if (indiaOption && typeof indiaOption.value === 'number') {
        resetFilters.country = indiaOption;
      } else {
        // If India option not found, set to null to allow manual selection
        resetFilters.country = null;
      }
    }
    
    setFilters(resetFilters);
    try {
      localStorage.removeItem('jobFilters');
    } catch (error) {
      console.error('Error clearing saved filters:', error);
    }
    onResetFilters();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[10000]" style={{ backgroundColor: '#F0D8D9' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            Filter Jobs {activeFiltersCount > 0 && `(${activeFiltersCount} active)`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filter Form */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Filters */}
            <div>
              <InputWithTooltip label="Country">
                <Select
                  value={filters.country}
                  onChange={(value) => handleFilterChange('country', value)}
                  options={locationOptions.countries}
                  placeholder="Select Country"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            <div>
              <InputWithTooltip label="State">
                <Select
                  value={filters.state}
                  onChange={(value) => handleFilterChange('state', value)}
                  options={locationOptions.states}
                  placeholder="Select State"
                  isClearable
                  isDisabled={!filters.country}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            <div>
              <InputWithTooltip label="City">
                <Select
                  value={filters.city}
                  onChange={(value) => handleFilterChange('city', value)}
                  options={locationOptions.cities}
                  placeholder="Select City"
                  isClearable
                  isDisabled={!filters.state}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Category */}
            <div>
              <InputWithTooltip label="Job Category">
                <Select
                  value={filters.job_category}
                  onChange={(value) => handleFilterChange('job_category', value)}
                  options={filterOptions.jobCategories}
                  placeholder="Select Job Category"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Salary Range */}
            <div>
              <InputWithTooltip label="Min Salary">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-none shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  name="min_salary"
                  value={filters.min_salary}
                  onChange={handleInputChange}
                  placeholder="Minimum Salary"
                />
              </InputWithTooltip>
            </div>

            <div>
              <InputWithTooltip label="Max Salary">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-none shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  name="max_salary"
                  value={filters.max_salary}
                  onChange={handleInputChange}
                  placeholder="Maximum Salary"
                />
              </InputWithTooltip>
            </div>

            {/* Job Shifts */}
            <div>
              <InputWithTooltip label="Job Shifts">
                <Select
                  value={filters.job_shifts}
                  onChange={(value) => handleFilterChange('job_shifts', value)}
                  options={filterOptions.jobShifts}
                  placeholder="Select Job Shifts"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Process */}
            <div>
              <InputWithTooltip label="Job Process">
                <Select
                  value={filters.job_process}
                  onChange={(value) => handleFilterChange('job_process', value)}
                  options={filterOptions.jobProcesses}
                  placeholder="Select Job Process"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Sub Process */}
            <div>
              <InputWithTooltip label="Job Sub Process">
                <Select
                  value={filters.job_sub_process}
                  onChange={(value) => handleFilterChange('job_sub_process', value)}
                  options={filterOptions.jobSubProcesses}
                  placeholder="Select Job Sub Process"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Subjects */}
            <div>
              <InputWithTooltip label="Subjects">
                <Select
                  value={filters.subjects}
                  onChange={(value) => handleFilterChange('subjects', value)}
                  options={apiOptions.subjects}
                  placeholder="Select Subjects"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.subjects}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Education */}
            <div>
              <InputWithTooltip label="Education">
                <Select
                  value={filters.education}
                  onChange={(value) => handleFilterChange('education', value)}
                  options={apiOptions.education}
                  placeholder="Select Education"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Designations */}
            <div>
              <InputWithTooltip label="Designations">
                <Select
                  value={filters.designations}
                  onChange={(value) => handleFilterChange('designations', value)}
                  options={apiOptions.designations}
                  placeholder="Select Designations"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Designated Grades */}
            <div>
              <InputWithTooltip label="Grades">
                <Select
                  value={filters.designated_grades}
                  onChange={(value) => handleFilterChange('designated_grades', value)}
                  options={apiOptions.grades}
                  placeholder="Select Grades"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Curriculum */}
            <div>
              <InputWithTooltip label="Curriculum">
                <Select
                  value={filters.curriculum}
                  onChange={(value) => handleFilterChange('curriculum', value)}
                  options={apiOptions.curriculum}
                  placeholder="Select Curriculum"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Core Expertise */}
            <div>
              <InputWithTooltip label="Core Expertise">
                <Select
                  value={filters.core_expertise}
                  onChange={(value) => handleFilterChange('core_expertise', value)}
                  options={apiOptions.coreExpertise}
                  placeholder="Select Core Expertise"
                  isMulti
                  isClearable
                  isLoading={optionsLoading.constants}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
              onClick={handleReset}
            >
              Reset Filters
            </button>
            <button
              className="px-4 py-2 bg-gradient-brand text-white rounded-md hover:bg-gradient-primary-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              onClick={handleApply}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FilterPanel;