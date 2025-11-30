import React from 'react';

/**
 * Reusable Records Per Page Dropdown component for candidates
 * Allows users to change how many candidates are displayed per page
 */
const RecordsPerPageDropdown = ({ 
  itemsPerPage, 
  onItemsPerPageChange,
  options = [5, 10, 20, 30, 50]
}) => {
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    onItemsPerPageChange(newValue);
    
    // Save to localStorage for persistence
    localStorage.setItem('candidatesPerPage', newValue.toString());
  };

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <label htmlFor="records-per-page" className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight whitespace-nowrap flex-shrink-0">
        Records per page:
      </label>
      <select
        id="records-per-page"
        value={itemsPerPage}
        onChange={handleChange}
        className="flex-1 sm:flex-initial sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-lg sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white leading-normal tracking-tight min-w-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RecordsPerPageDropdown;

