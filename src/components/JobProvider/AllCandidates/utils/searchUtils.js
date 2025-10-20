/**
 * Search through candidate data based on search term
 * @param {Array} candidates - Array of candidate objects
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} Filtered array of candidates
 */
export const searchCandidates = (candidates, searchTerm) => {
  if (!searchTerm) return candidates;

  const searchTermLower = searchTerm.toLowerCase();
  const searchFields = [
    'fullName',
    'email',
    'phone',
    'designation',
    'permanent_country_name',
    'permanent_state_name',
    'permanent_city_name',
    'education_details_json',
    'languages',
    'full_time_offline',
    'teaching_experience',
    'expected_salary'
  ];

  return candidates.filter(candidate => {
    return searchFields.some(field => {
      const value = candidate[field];
      if (!value) return false;

      // Handle different types of values
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTermLower);
      } else if (typeof value === 'number') {
        return value.toString().includes(searchTermLower);
      } else if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'string' ? 
            item.toLowerCase().includes(searchTermLower) : 
            item.toString().includes(searchTermLower)
        );
      }
      return false;
    });
  });
};

/**
 * Get search suggestions based on search term
 * @param {Array} candidates - Array of candidate objects
 * @param {string} searchTerm - Search term to get suggestions for
 * @returns {Array} Array of suggestion strings
 */
export const getSearchSuggestions = (candidates, searchTerm) => {
  if (!searchTerm) return [];

  const searchTermLower = searchTerm.toLowerCase();
  const suggestions = new Set();
  const maxSuggestions = 5;

  // Define fields to search for suggestions
  const suggestionFields = [
    { field: 'fullName', weight: 3 },
    { field: 'designation', weight: 2 },
    { field: 'permanent_city_name', weight: 1 },
    { field: 'permanent_state_name', weight: 1 }
  ];

  // Sort candidates by relevance
  const sortedCandidates = [...candidates].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    suggestionFields.forEach(({ field, weight }) => {
      const valueA = a[field]?.toLowerCase() || '';
      const valueB = b[field]?.toLowerCase() || '';

      if (valueA.includes(searchTermLower)) scoreA += weight;
      if (valueB.includes(searchTermLower)) scoreB += weight;
    });

    return scoreB - scoreA;
  });

  // Get suggestions from top candidates
  for (const candidate of sortedCandidates) {
    if (suggestions.size >= maxSuggestions) break;

    suggestionFields.forEach(({ field }) => {
      const value = candidate[field];
      if (value && value.toLowerCase().includes(searchTermLower)) {
        suggestions.add(value);
      }
    });
  }

  return Array.from(suggestions).slice(0, maxSuggestions);
}; 