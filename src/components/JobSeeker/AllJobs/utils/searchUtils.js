/**
 * Search through job data based on search term
 * @param {Array} jobs - Array of job objects
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} Filtered array of jobs
 */
export const searchJobs = (jobs, searchTerm) => {
  if (!searchTerm) return jobs;

  const searchTermLower = searchTerm.toLowerCase();
  const searchFields = [
    'job_title',
    'institute_name',
    'job_description',
    'city',
    'state_ut',
    'qualification',
    'core_subjects',
    'job_type',
    'job_process',
    'curriculum',
    'experience_required',
    'min_salary',
    'max_salary'
  ];

  return jobs.filter(job => {
    return searchFields.some(field => {
      const value = job[field];
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
 * @param {Array} jobs - Array of job objects
 * @param {string} searchTerm - Search term to get suggestions for
 * @returns {Array} Array of suggestion strings
 */
export const getJobSearchSuggestions = (jobs, searchTerm) => {
  if (!searchTerm) return [];

  const searchTermLower = searchTerm.toLowerCase();
  const suggestions = new Set();
  const maxSuggestions = 5;

  // Define fields to search for suggestions
  const suggestionFields = [
    { field: 'job_title', weight: 3 },
    { field: 'institute_name', weight: 2 },
    { field: 'city', weight: 1 },
    { field: 'state_ut', weight: 1 }
  ];

  // Sort jobs by relevance
  const sortedJobs = [...jobs].sort((a, b) => {
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

  // Get suggestions from top jobs
  for (const job of sortedJobs) {
    if (suggestions.size >= maxSuggestions) break;

    suggestionFields.forEach(({ field }) => {
      const value = job[field];
      if (value && value.toLowerCase().includes(searchTermLower)) {
        suggestions.add(value);
      }
    });
  }

  return Array.from(suggestions).slice(0, maxSuggestions);
}; 