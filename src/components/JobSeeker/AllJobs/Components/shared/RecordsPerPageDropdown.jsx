import React from 'react';

/**
 * Records per page dropdown component
 * Used in section headings for consistent styling
 */
const RecordsPerPageDropdown = ({ 
  itemsPerPage, 
  onItemsPerPageChange,
  className = ""
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <label htmlFor="itemsPerPage" className="text-base font-medium text-gray-700 leading-normal tracking-tight">
        Records per page:
      </label>
      <div className="relative">
        <select
          id="itemsPerPage"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange && onItemsPerPageChange(Number(e.target.value))}
          className="appearance-none px-4 py-2.5 text-base font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[90px] pr-10 cursor-pointer hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md leading-normal tracking-tight"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default RecordsPerPageDropdown;
