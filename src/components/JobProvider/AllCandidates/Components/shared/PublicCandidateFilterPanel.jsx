import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';
import InputWithTooltip from "../../../../../services/InputWithTooltip";
import useCandidateFilterOptions from './useCandidateFilterOptions';

const PublicCandidateFilterPanel = ({
  isOpen,
  onClose,
  onApplyFilters,
  onResetFilters,
  activeFiltersCount = 0
}) => {
  // Filters: country, state, city, education, experience, salary, subjects
  const defaultFilters = {
    country: null,
    state: null,
    city: null,
    education: [],
    coreSubjects: [],
    minExperienceYears: null,
    maxExperienceYears: null,
    minSalary: '',
    maxSalary: ''
  };

  // Create year options
  const yearOptions = Array.from({ length: 51 }, (_, i) => ({
    value: i,
    label: i.toString()
  }));

  const [filters, setFilters] = useState(defaultFilters);
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: []
  });

  // Fetch education and subjects options from API
  const { options: apiOptions, loading: optionsLoading } = useCandidateFilterOptions();

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

  // Load countries on mount and set India as default
  useEffect(() => {
    GetCountries().then((countryData) => {
      const countries = countryData.map(country => ({
        value: country.id,
        label: country.name
      }));
      setLocationOptions(prev => ({ ...prev, countries }));

      // Set India as default country if not already set
      const indiaOption = countries.find(country => country.label && country.label.toLowerCase() === 'india');
      if (indiaOption) {
        setFilters(prev => {
          // Only set India if country is not already set
          if (!prev.country) {
            return { ...prev, country: indiaOption };
          }
          return prev;
        });
      }
    });
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (filters.country) {
      GetState(filters.country.value).then((stateData) => {
        const states = stateData.map(state => ({
          value: state.id,
          label: state.name
        }));
        setLocationOptions(prev => ({ ...prev, states, cities: [] }));
        setFilters(prev => ({ ...prev, state: null, city: null }));
      });
    } else {
      setLocationOptions(prev => ({ ...prev, states: [], cities: [] }));
    }
  }, [filters.country]);

  // Load cities when state changes
  useEffect(() => {
    if (filters.state) {
      GetCity(filters.country.value, filters.state.value).then((cityData) => {
        const cities = cityData.map(city => ({
          value: city.id,
          label: city.name
        }));
        setLocationOptions(prev => ({ ...prev, cities }));
        setFilters(prev => ({ ...prev, city: null }));
      });
    } else {
      setLocationOptions(prev => ({ ...prev, cities: [] }));
    }
  }, [filters.state, filters.country]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = { ...defaultFilters };
    
    // If countries are loaded, ensure India is properly set
    if (locationOptions.countries.length > 0) {
      const indiaOption = locationOptions.countries.find(
        country => country.label && country.label.toLowerCase() === 'india'
      );
      if (indiaOption) {
        resetFilters.country = indiaOption;
      }
    }
    
    setFilters(resetFilters);
    onResetFilters();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto z-[10000]" style={{ backgroundColor: '#F0D8D9' }}>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-[#F0D8D9] z-10">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
            Filter Candidates {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

            {/* Education */}
            <div>
              <InputWithTooltip label="Education">
                <Select
                  value={filters.education}
                  onChange={(value) => handleFilterChange('education', value)}
                  options={apiOptions.education || []}
                  placeholder="Education"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  isLoading={optionsLoading.education}
                />
              </InputWithTooltip>
            </div>

            {/* Subjects */}
            <div>
              <InputWithTooltip label="Subjects">
                <Select
                  value={filters.coreSubjects}
                  onChange={(value) => handleFilterChange('coreSubjects', value)}
                  options={apiOptions.coreSubjects || []}
                  placeholder="Subjects"
                  isMulti
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  isLoading={optionsLoading.education}
                />
              </InputWithTooltip>
            </div>

            {/* Experience Range */}
            <div>
              <InputWithTooltip label="Min Experience (Years)">
                <Select
                  value={filters.minExperienceYears}
                  onChange={(value) => handleFilterChange('minExperienceYears', value)}
                  options={yearOptions}
                  placeholder="Minimum Experience Years"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            <div>
              <InputWithTooltip label="Max Experience (Years)">
                <Select
                  value={filters.maxExperienceYears}
                  onChange={(value) => handleFilterChange('maxExperienceYears', value)}
                  options={yearOptions}
                  placeholder="Maximum Experience Years"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </InputWithTooltip>
            </div>

            {/* Salary Range */}
            <div>
              <InputWithTooltip label="Min Salary (₹)">
                <input
                  type="number"
                  value={filters.minSalary}
                  onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                  placeholder="Min Salary"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </InputWithTooltip>
            </div>

            <div>
              <InputWithTooltip label="Max Salary (₹)">
                <input
                  type="number"
                  value={filters.maxSalary}
                  onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                  placeholder="Max Salary"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </InputWithTooltip>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-colors"
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

export default PublicCandidateFilterPanel;

