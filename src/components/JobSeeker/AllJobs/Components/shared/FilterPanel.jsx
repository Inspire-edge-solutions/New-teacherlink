import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import InputWithTooltip from "../../../../../services/InputWithTooltip";
import { defaultJobFilters } from '../Sections/searchJobFilters';
import useJobFilterOptions from './useJobFilterOptions';

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

  const [filters, setFilters] = useState(createInitialFilters);
  const { options: apiOptions, loading: optionsLoading } = useJobFilterOptions();

  // Location options state
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Static filter options
  const filterOptions = {
    jobCategories: [
      { value: 'fullTime', label: 'Full Time' },
      { value: 'Full-time', label: 'Full Time' },
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
      { value: 'week days', label: 'Week days' },
      { value: 'all days', label: 'All days' },
      { value: 'week ends', label: 'Week ends' },
      { value: 'vacations', label: 'Vacations' }
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
  };

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
          if (!prev.country || currentLabel === '' || currentLabel === 'india') {
            return { ...prev, country: indiaOption };
          }
          return prev;
        });
      }
    });
  }, []);

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
      localStorage.setItem('jobFilters', JSON.stringify(newFilters));
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
    setFilters({ ...defaultJobFilters });
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
