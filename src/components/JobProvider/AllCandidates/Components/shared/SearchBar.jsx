import React, { useState, useEffect, useCallback, memo } from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = memo(({ onSearch, placeholder = "Search candidates..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Memoize the search handler
  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Debounce search term with useCallback
  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    debouncedSearch();
  }, [debouncedSearch]);

  // Memoize the search callback
  const handleDebouncedSearch = useCallback(() => {
    onSearch(debouncedTerm);
  }, [debouncedTerm, onSearch]);

  useEffect(() => {
    handleDebouncedSearch();
  }, [handleDebouncedSearch]);

  return (
    <div className="relative w-full flex items-center border border-gray-300 rounded-md bg-white">
      <FaSearch className="absolute left-3 text-gray-600 text-sm z-[2]" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearch}
        className="w-full border-none outline-none py-2 px-3 pl-9 text-sm rounded-md bg-transparent focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar; 