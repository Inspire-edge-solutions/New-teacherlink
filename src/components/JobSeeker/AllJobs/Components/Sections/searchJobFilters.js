const normalizeSelectValues = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) =>
    item && typeof item === 'object' && 'value' in item ? item.value : item
  );
};

const toLower = (value) => String(value ?? '').toLowerCase().trim();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const cleaned = String(value).replace(/[^0-9-]/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildJobEducationValues = (job) => {
  const values = [];

  if (Array.isArray(job?.education)) {
    values.push(...job.education.map(toLower));
  }

  const qualification = toLower(job?.qualification);
  if (qualification) {
    values.push(qualification);
  }

  return values.filter(Boolean);
};

export const defaultJobFilters = {
  optional_subject: [],
  country: { value: 'India', label: 'India' },
  state: null,
  city: null,
  job_category: null,
  designations: [],
  designated_grades: [],
  curriculum: [],
  subjects: [],
  education: [],
  core_expertise: [],
  job_shifts: null,
  job_process: null,
  job_sub_process: null,
  min_salary: '',
  max_salary: ''
};

const formatFiltersForMatching = (filters = defaultJobFilters) => {
  const source = { ...defaultJobFilters, ...(filters || {}) };

  return {
    ...source,
    country: source?.country?.label || source?.country?.value || source?.country || null,
    state: source?.state?.label || source?.state?.value || source?.state || null,
    city: source?.city?.label || source?.city?.value || source?.city || null,
    job_category: source?.job_category?.value || source?.job_category || null,
    job_shifts: source?.job_shifts?.value || source?.job_shifts || null,
    job_process: source?.job_process?.value || source?.job_process || null,
    job_sub_process: source?.job_sub_process?.value || source?.job_sub_process || null,
    subjects: normalizeSelectValues(source?.subjects),
    education: normalizeSelectValues(source?.education),
    designations: normalizeSelectValues(source?.designations),
    designated_grades: normalizeSelectValues(source?.designated_grades),
    curriculum: normalizeSelectValues(source?.curriculum),
    core_expertise: normalizeSelectValues(source?.core_expertise)
  };
};

const getActiveFilterKeys = (formattedFilters = {}) =>
  Object.keys(formattedFilters).filter((key) => {
    if (key === 'country') return false;
    const value = formattedFilters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return value > 0;
    return value !== null && value !== undefined;
  });

export const applyJobFilters = (jobs = [], rawFilters = defaultJobFilters) => {
  const formattedFilters = formatFiltersForMatching(rawFilters);
  const activeFilterKeys = getActiveFilterKeys(formattedFilters);
  const hasActiveFilters = activeFilterKeys.length > 0;

  if (!hasActiveFilters) {
    return {
      filteredJobs: jobs,
      activeFilters: [],
      hasActiveFilters: false
    };
  }

  const jobsWithMatches = jobs.map((job) => {
    const hasJobData = job?.job_title || job?.designation || job?.institute_name;
    if (!hasJobData) {
      return { job, matchedFilters: [], relevanceScore: 0, passes: false };
    }

    const matchedFilters = [];
    let passes = true;

    if (formattedFilters.country) {
      const jobCountry = toLower(job?.country || job?.country_name);
      const filterValue = toLower(formattedFilters.country);

      if (filterValue === 'india' && (jobCountry === '' || jobCountry === 'india')) {
        // Country matches by default; no-op because country is the baseline filter
      } else if (jobCountry.includes(filterValue) || filterValue.includes(jobCountry)) {
        // Additional country selected; treat as informational only
      } else {
        passes = false;
      }
    }

    if (formattedFilters.state) {
      const jobState = toLower(job?.state_ut || job?.state || job?.state_name);
      const filterValue = toLower(formattedFilters.state);
      if (jobState.includes(filterValue) || filterValue.includes(jobState)) {
        matchedFilters.push('state');
      } else {
        passes = false;
      }
    }

    if (formattedFilters.city) {
      const jobCity = toLower(job?.city || job?.city_name);
      const filterValue = toLower(formattedFilters.city);
      if (jobCity.includes(filterValue) || filterValue.includes(jobCity)) {
        matchedFilters.push('city');
      } else {
        passes = false;
      }
    }

    if (formattedFilters.job_category) {
      const jobType = toLower(job?.job_type || job?.Job_Type);
      const filterValue = toLower(formattedFilters.job_category);

      const jobTypeMapping = {
        fullpart: ['full-time', 'fulltime', 'full-time-part-time'],
        fulltime: ['full-time', 'fulltime', 'full-time-part-time'],
        'full-time': ['fulltime', 'fullpart', 'full-time-part-time'],
        parttime: ['part-time', 'parttime'],
        'part-time': ['parttime']
      };

      const mappedValues = jobTypeMapping[jobType] || [];
      const normalizedJobType = jobType.replace(/\s+/g, '').replace(/[/-]/g, '');
      const normalizedFilter = filterValue.replace(/\s+/g, '').replace(/[/-]/g, '');

      const hasSpecialMatch = mappedValues.some((value) => toLower(value) === filterValue);
      const isMatch =
        jobType === filterValue ||
        jobType.includes(filterValue) ||
        filterValue.includes(jobType) ||
        normalizedJobType === normalizedFilter ||
        normalizedJobType.includes(normalizedFilter) ||
        normalizedFilter.includes(normalizedJobType) ||
        hasSpecialMatch;

      if (isMatch) {
        matchedFilters.push('job_category');
      }
    }

    if (formattedFilters.job_shifts) {
      const filterValue = toLower(formattedFilters.job_shifts);

      if (
        !job?.job_shifts ||
        (Array.isArray(job.job_shifts) && job.job_shifts.length === 0) ||
        (Array.isArray(job.job_shifts) && job.job_shifts.every((item) => !item))
      ) {
        if (filterValue.includes('all day') || filterValue.includes('week day')) {
          matchedFilters.push('job_shifts');
        }
      } else {
        const jobShifts = Array.isArray(job.job_shifts) ? job.job_shifts : [job.job_shifts];
        if (filterValue.includes('all day')) {
          matchedFilters.push('job_shifts');
        } else {
          const hasMatch = jobShifts.some((shift) => {
            const shiftStr = toLower(shift);
            if (!shiftStr) return false;
            if (shiftStr === filterValue) return true;
            if (shiftStr.includes(filterValue) || filterValue.includes(shiftStr)) return true;
            const shiftWords = shiftStr.split(/\s+/);
            const filterWords = filterValue.split(/\s+/);
            return filterWords.some((filterWord) =>
              shiftWords.some(
                (shiftWord) =>
                  shiftWord === filterWord ||
                  shiftWord.includes(filterWord) ||
                  filterWord.includes(shiftWord)
              )
            );
          });

          if (hasMatch) {
            matchedFilters.push('job_shifts');
          }
        }
      }
    }

    if (formattedFilters.job_process) {
      const filterValue = toLower(formattedFilters.job_process);

      if (
        !job?.job_process ||
        (Array.isArray(job.job_process) && job.job_process.length === 0) ||
        (Array.isArray(job.job_process) && job.job_process.every((item) => !item))
      ) {
        if (filterValue.includes('regular')) {
          matchedFilters.push('job_process');
        }
      } else {
        const jobProcesses = Array.isArray(job.job_process) ? job.job_process : [job.job_process];
        const processMap = {
          regular: ['offline', 'in-person', 'on-site', 'onsite'],
          online: ['remote', 'virtual'],
          hybrid: ['mixed', 'flexible']
        };

        const hasDirectMatch = jobProcesses.some((process) => {
          const processStr = toLower(process);
          return (
            processStr === filterValue ||
            processStr.includes(filterValue) ||
            filterValue.includes(processStr)
          );
        });

        const hasMappedMatch = jobProcesses.some((process) => {
          const processStr = toLower(process);
          const mappedValues = processMap[filterValue] || [];
          return mappedValues.some((val) => processStr.includes(toLower(val)));
        });

        if (hasDirectMatch || hasMappedMatch) {
          matchedFilters.push('job_process');
        }
      }
    }

    if (formattedFilters.subjects.length > 0) {
      const jobCoreSubjects = Array.isArray(job?.core_subjects) ? job.core_subjects : [job?.core_subjects];
      const jobSubjects = Array.isArray(job?.subjects) ? job.subjects : [job?.subjects];
      const allJobSubjects = [...jobCoreSubjects, ...jobSubjects]
        .filter(Boolean)
        .map(toLower);

      const hasMatch = formattedFilters.subjects.some((filterSubject) => {
        const filterValue = toLower(filterSubject);
        return allJobSubjects.some(
          (jobSubject) =>
            jobSubject.includes(filterValue) || filterValue.includes(jobSubject)
        );
      });

      if (hasMatch) {
        matchedFilters.push('subjects');
      }
    }

    if (formattedFilters.education.length > 0) {
      const jobEducationValues = buildJobEducationValues(job);
      const hasMatch = formattedFilters.education.some((filterEducation) => {
        const filterValue = toLower(filterEducation);
        return jobEducationValues.some(
          (jobValue) => jobValue.includes(filterValue) || filterValue.includes(jobValue)
        );
      });

      if (hasMatch) {
        matchedFilters.push('education');
      }
    }

    if (formattedFilters.designations.length > 0) {
      const jobDesignations = Array.isArray(job?.designations) ? job.designations : [job?.designations];
      const jobTitle = job?.job_title || '';
      const allJobDesignations = [...jobDesignations, jobTitle]
        .filter(Boolean)
        .map(toLower);

      const hasMatch = formattedFilters.designations.some((filterDesignation) => {
        const filterValue = toLower(filterDesignation);
        return allJobDesignations.some(
          (jobDesignation) =>
            jobDesignation.includes(filterValue) || filterValue.includes(jobDesignation)
        );
      });

      if (hasMatch) {
        matchedFilters.push('designations');
      }
    }

    if (formattedFilters.designated_grades.length > 0) {
      const jobGrades = Array.isArray(job?.designated_grades) ? job.designated_grades : [job?.designated_grades];
      const jobGradeRange = job?.grade_range || '';
      const allJobGrades = [...jobGrades, jobGradeRange]
        .filter(Boolean)
        .map(toLower);

      const hasMatch = formattedFilters.designated_grades.some((filterGrade) => {
        const filterValue = toLower(filterGrade);
        return allJobGrades.some(
          (jobGrade) => jobGrade.includes(filterValue) || filterValue.includes(jobGrade)
        );
      });

      if (hasMatch) {
        matchedFilters.push('designated_grades');
      }
    }

    if (formattedFilters.curriculum.length > 0) {
      const jobCurriculum = Array.isArray(job?.curriculum) ? job.curriculum : [job?.curriculum];
      const hasMatch = formattedFilters.curriculum.some((filterCurriculum) => {
        const filterValue = toLower(filterCurriculum);
        return jobCurriculum.some((jobCurr) => {
          const jobValue = toLower(jobCurr);
          return jobValue.includes(filterValue) || filterValue.includes(jobValue);
        });
      });

      if (hasMatch) {
        matchedFilters.push('curriculum');
      }
    }

    if (formattedFilters.core_expertise.length > 0) {
      const jobExpertise = Array.isArray(job?.core_expertise) ? job.core_expertise : [job?.core_expertise];
      const hasMatch = formattedFilters.core_expertise.some((filterExpertise) => {
        const filterValue = toLower(filterExpertise);
        return jobExpertise.some((jobExp) => {
          const jobValue = toLower(jobExp);
          return jobValue.includes(filterValue) || filterValue.includes(jobValue);
        });
      });

      if (hasMatch) {
        matchedFilters.push('core_expertise');
      }
    }

    if (formattedFilters.min_salary || formattedFilters.max_salary) {
      const minFilterValue = toNumber(formattedFilters.min_salary);
      const maxFilterValue = toNumber(formattedFilters.max_salary);
      const minTarget = minFilterValue ?? 0;
      const maxTarget = maxFilterValue ?? Infinity;

      const jobMinValue = toNumber(job?.min_salary);
      const jobMaxValue = toNumber(job?.max_salary);
      const jobSalaryValue = toNumber(job?.salary);

      let salaryMatches = false;

      if (jobMinValue !== null || jobMaxValue !== null) {
        const jobMinResolved = jobMinValue !== null ? jobMinValue : jobMaxValue;
        const jobMaxResolved = jobMaxValue !== null ? jobMaxValue : jobMinResolved;
        salaryMatches = jobMaxResolved >= minTarget && jobMinResolved <= maxTarget;
      } else if (jobSalaryValue !== null) {
        salaryMatches = jobSalaryValue >= minTarget && jobSalaryValue <= maxTarget;
      }

      if (salaryMatches) {
        matchedFilters.push('salary');
      }
    }

    let relevanceScore = 100;
    if (activeFilterKeys.length > 0) {
      const validFilters = activeFilterKeys.filter((key) => {
        if (key === 'country' && (!job?.country && !job?.country_name)) return false;
        if (key === 'state' && (!job?.state_ut && !job?.state && !job?.state_name)) return false;
        if (key === 'city' && (!job?.city && !job?.city_name)) return false;
        return true;
      });

      const validMatchedFilters = matchedFilters.filter((filterKey) => {
        if (filterKey === 'country' && (!job?.country && !job?.country_name)) return false;
        if (filterKey === 'state' && (!job?.state_ut && !job?.state && !job?.state_name)) return false;
        if (filterKey === 'city' && (!job?.city && !job?.city_name)) return false;
        return true;
      });

      const baseScore = 40;
      const matchScore =
        validFilters.length > 0
          ? Math.round((validMatchedFilters.length / validFilters.length) * 60)
          : 60;

      relevanceScore = baseScore + matchScore;
      if (Number.isNaN(relevanceScore) || !Number.isFinite(relevanceScore)) {
        relevanceScore = baseScore;
      }
    }

    return {
      job,
      matchedFilters,
      relevanceScore,
      passes
    };
  });

  const filtered = jobsWithMatches
    .filter((item) => item.passes && item.matchedFilters.length > 0)
    .map((item) => ({
      ...item.job,
      relevanceScore: item.relevanceScore,
      matchedFilters: item.matchedFilters
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    filteredJobs: filtered,
    activeFilters: activeFilterKeys,
    hasActiveFilters: true
  };
};

