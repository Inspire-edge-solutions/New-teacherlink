import React from 'react';

/**
 * Shared Pagination component with Tailwind CSS styling
 * Used across all job sections for consistent pagination
 */
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage, 
  currentPageStart, 
  currentPageEnd
}) => {
  // Generate page numbers with ellipsis logic
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 3) {
        // Show first 3 pages, ellipsis, last page
        for (let i = 1; i <= 3; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show first page, ellipsis, last 3 pages
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center space-y-4 mt-6">
      {/* Pagination Controls */}
      <nav className="flex items-center space-x-1" aria-label="Pagination">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center px-3 py-2 text-base font-medium rounded-lg transition-all duration-200 leading-normal tracking-tight ${
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed bg-gray-100'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <span className="mr-1">‹</span>
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((number, index) => {
            if (number === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-2 text-base font-medium text-gray-500 leading-normal tracking-tight"
                >
                  ...
                </span>
              );
            }

            const isActive = currentPage === number;
            return (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`px-3 py-2 text-base font-medium rounded-lg transition-all duration-200 leading-normal tracking-tight ${
                  isActive
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {number}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center px-3 py-2 text-base font-medium rounded-lg transition-all duration-200 leading-normal tracking-tight ${
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed bg-gray-100'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          Next
          <span className="ml-1">›</span>
        </button>
      </nav>

      {/* Pagination Info */}
      <div className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
        Showing <span className="font-medium">{currentPageStart}</span> to{' '}
        <span className="font-medium">{currentPageEnd}</span> of{' '}
        <span className="font-medium">{totalItems}</span> jobs
      </div>
    </div>
  );
};

export default Pagination;
