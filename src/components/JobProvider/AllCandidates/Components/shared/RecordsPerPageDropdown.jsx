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
    <div className="flex items-center gap-2">
      <label htmlFor="records-per-page" className="text-sm text-gray-600 whitespace-nowrap">
        Records per page:
      </label>
      <select
        id="records-per-page"
        value={itemsPerPage}
        onChange={handleChange}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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

