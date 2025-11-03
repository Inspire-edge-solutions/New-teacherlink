import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import axios from 'axios';
import { toast } from "react-toastify";
import { useAuth } from "../../../../../Context/AuthContext";
import InputWithTooltip from "../../../../../services/InputWithTooltip";

const CandidateFilterPanel = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  onResetFilters,
  activeFiltersCount = 0,
  initialOptions = {}
}) => {
  const { user } = useAuth();
  
  // Initialize filters with saved values or defaults
  const defaultFilters = {
    country: null,
    state: null,
    city: null,
    languages: [],
    education: [],
    coreSubjects: [],
    jobTypes: [],
    grades: [],
    curriculum: [],
    designations: [],
    gender: [],
    teachingExperience: [0, 30],
    otherTeachingExperience: [],
    noticePeriod: [],
    jobSearchStatus: [],
    jobShiftPreferences: [],
    online: null,
    offline: null,
    tutionPreferences: [],
    min_salary: '',
    max_salary: ''
  };

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('candidateFilters');
      return saved ? JSON.parse(saved) : defaultFilters;
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return defaultFilters;
    }
  });

  // Location options state
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Loading states
  const [isLoading, setIsLoading] = useState({
    locations: false
  });

  // Static filter options
  const filterOptions = {
    jobTypes: [
      { value: 'administration', label: 'Administration' },
      { value: 'teaching', label: 'Teaching' },
      { value: 'teachingAndAdmin', label: 'Teaching & Administration' }
    ],
    genderOptions: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' }
    ],
    noticePeriodOptions: [
      { value: 'Immediate', label: 'Immediate' },
      { value: '15 days', label: '15 days' },
      { value: '1 month', label: '1 month' },
      { value: '2 months', label: '2 months' },
      { value: '3 months', label: '3 months' }
    ],
    jobSearchStatusOptions: [
      { value: 'Active', label: 'Actively Looking' },
      { value: 'Passive', label: 'Passively Looking' },
      { value: 'Not Looking', label: 'Not Looking' }
    ],
    jobShiftOptions: [
      { value: 'Morning', label: 'Morning' },
      { value: 'Afternoon', label: 'Afternoon' },
      { value: 'Evening', label: 'Evening' },
      { value: 'Night', label: 'Night' },
      { value: 'Flexible', label: 'Flexible' }
    ],
    onlineOfflineOptions: [
      { value: 'Online', label: 'Online' },
      { value: 'Offline', label: 'Offline' },
      { value: 'Hybrid', label: 'Hybrid' }
    ],
    tutionPreferenceOptions: [
      { value: 'Home Tuition', label: 'Home Tuition' },
      { value: 'Online Tuition', label: 'Online Tuition' },
      { value: 'Group Tuition', label: 'Group Tuition' },
      { value: 'Private Tuition', label: 'Private Tuition' }
    ]
  };

  // Select styles for consistent look (matching AllJobs)
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

  // Load countries on component mount
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
    });
  }, []);

  // Update states when country changes
  useEffect(() => {
    if (filters.country) {
      GetState(filters.country.value).then((stateData) => {
        const states = stateData.map(state => ({
          value: state.id,
          label: state.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          states
        }));

        // Reset state and city selections
        setFilters(prev => ({
          ...prev,
          state: null,
          city: null
        }));
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        states: [],
        cities: []
      }));
    }
  }, [filters.country]);

  // Update cities when state changes
  useEffect(() => {
    if (filters.country && filters.state) {
      GetCity(filters.country.value, filters.state.value).then((cityData) => {
        const cities = cityData.map(city => ({
          value: city.name,
          label: city.name
        }));

        setLocationOptions(prev => ({
          ...prev,
          cities
        }));

        // Reset city selection
        setFilters(prev => ({
          ...prev,
          city: null
        }));
      });
    } else {
      setLocationOptions(prev => ({
        ...prev,
        cities: []
      }));
    }
  }, [filters.country, filters.state]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('candidateFilters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
    
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
    setFilters(defaultFilters);
    try {
      localStorage.removeItem('candidateFilters');
    } catch (error) {
      console.error('Error clearing saved filters:', error);
    }
    onResetFilters();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto z-[10000]" style={{ backgroundColor: '#F0D8D9' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-[#F0D8D9] z-10">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 truncate pr-2">
            Filter Candidates {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Filter Form */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Location Filters */}
            <div>
              <InputWithTooltip label="Country">
                <Select
                  value={filters.country}
                  onChange={(value) => handleFilterChange('country', value)}
                  options={locationOptions.countries}
                  placeholder="Country"
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
                  placeholder="State"
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
                  placeholder="City"
                  isClearable
                  isDisabled={!filters.state}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Languages */}
            <div>
              <InputWithTooltip label="Languages">
                <Select
                  value={filters.languages}
                  onChange={(value) => handleFilterChange('languages', value)}
                  options={initialOptions.languages || []}
                  placeholder="Languages"
                  isMulti
                  isClearable
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
                  options={initialOptions.education || []}
                  placeholder="Education"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Core Subjects */}
            <div>
              <InputWithTooltip label="Core Subjects">
                <Select
                  value={filters.coreSubjects}
                  onChange={(value) => handleFilterChange('coreSubjects', value)}
                  options={initialOptions.coreSubjects || []}
                  placeholder="Core Subjects"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Types */}
            <div>
              <InputWithTooltip label="Job Type">
                <Select
                  value={filters.jobTypes}
                  onChange={(value) => handleFilterChange('jobTypes', value)}
                  options={filterOptions.jobTypes}
                  placeholder="Job Type"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Grades */}
            <div>
              <InputWithTooltip label="Grades">
                <Select
                  value={filters.grades}
                  onChange={(value) => handleFilterChange('grades', value)}
                  options={initialOptions.grades || []}
                  placeholder="Grades"
                  isMulti
                  isClearable
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
                  options={initialOptions.curriculum || []}
                  placeholder="Curriculum"
                  isMulti
                  isClearable
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
                  options={initialOptions.designations || []}
                  placeholder="Designations"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Gender */}
            <div>
              <InputWithTooltip label="Gender">
                <Select
                  value={filters.gender}
                  onChange={(value) => handleFilterChange('gender', value)}
                  options={filterOptions.genderOptions}
                  placeholder="Gender"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Notice Period */}
            <div>
              <InputWithTooltip label="Notice Period">
                <Select
                  value={filters.noticePeriod}
                  onChange={(value) => handleFilterChange('noticePeriod', value)}
                  options={filterOptions.noticePeriodOptions}
                  placeholder="Notice Period"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Search Status */}
            <div>
              <InputWithTooltip label="Job Search Status">
                <Select
                  value={filters.jobSearchStatus}
                  onChange={(value) => handleFilterChange('jobSearchStatus', value)}
                  options={filterOptions.jobSearchStatusOptions}
                  placeholder="Job Search Status"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Job Shift Preferences */}
            <div>
              <InputWithTooltip label="Job Shift Preferences">
                <Select
                  value={filters.jobShiftPreferences}
                  onChange={(value) => handleFilterChange('jobShiftPreferences', value)}
                  options={filterOptions.jobShiftOptions}
                  placeholder="Job Shift Preferences"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Online/Offline */}
            <div>
              <InputWithTooltip label="Online/Offline">
                <Select
                  value={filters.online}
                  onChange={(value) => handleFilterChange('online', value)}
                  options={filterOptions.onlineOfflineOptions}
                  placeholder="Online/Offline"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Tuition Preferences */}
            <div>
              <InputWithTooltip label="Tuition Preferences">
                <Select
                  value={filters.tutionPreferences}
                  onChange={(value) => handleFilterChange('tutionPreferences', value)}
                  options={filterOptions.tutionPreferenceOptions}
                  placeholder="Tuition Preferences"
                  isMulti
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
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 mt-6 pt-6 border-t">
            <button
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
              onClick={handleReset}
            >
              Reset Filters
            </button>
            <button
              className="w-full sm:w-auto px-4 py-2 bg-gradient-brand text-white rounded-md hover:bg-gradient-primary-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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

export default CandidateFilterPanel;

