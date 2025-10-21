import React, { useState, useEffect, useCallback, memo } from 'react';
import { FaSearch } from 'react-icons/fa';

const SearchBar = memo(({ onSearch, placeholder = "Search jobs..." }) => {
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
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      display: 'flex', 
      alignItems: 'center',
      border: '1px solid black',
      borderRadius: '6px',
      backgroundColor: '#fff'
    }}>
      <FaSearch 
        style={{ 
          position: 'absolute', 
          left: '12px', 
          color: '#6c757d', 
          fontSize: '14px',
          zIndex: 2
        }} 
      />
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearch}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          padding: '8px 12px 8px 35px',
          fontSize: '14px',
          borderRadius: '6px',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar; 