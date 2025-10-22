import React from 'react';

/**
 * Reusable Pagination component for candidates
 * Displays page numbers with smart ellipsis for large page counts
 */
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems = 0,
  itemsPerPage = 10,
  currentPageStart = 0,
  currentPageEnd = 0
}) => {
  // Generate smart page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 10) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after 1 if needed
    if (startPage > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page (excluding 1 and last page)
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots before last page if needed
    if (endPage < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 border-t pt-4">
      {/* Pagination Info */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-600">
          Showing {currentPageStart} to {currentPageEnd} of {totalItems} candidates
        </p>
      </div>

      {/* Pagination Controls */}
      <nav className="flex justify-center">
        <ul className="flex items-center gap-1">
          {/* Previous Button */}
          <li>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>
          </li>

          {/* Page Numbers */}
          {pageNumbers.map((number, index) => (
            <li key={index}>
              {number === '...' ? (
                <span className="px-3 py-2 text-gray-500">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(number)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === number
                      ? 'bg-gradient-brand text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {number}
                </button>
              )}
            </li>
          ))}

          {/* Next Button */}
          <li>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;

