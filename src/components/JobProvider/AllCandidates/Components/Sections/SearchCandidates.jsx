import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FilterDrawer from '../shared/filters';
import CandidateList from '../shared/CandidateShort';
import CandidateDetail from '../shared/ViewFull';
import { default as ViewShort } from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import { searchCandidates } from '../../utils/searchUtils';
import { decodeCandidatesData } from '../../../../../utils/dataDecoder';
import { useAuth } from "../../../../../Context/AuthContext";
import '../styles/search.css';

const API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const PROFILE_APPROVED_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved';

const SearchCandidates = () => {
  const { user } = useAuth();
  // State Management
  const [all, setAll] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(true); // Always show filters in search tab
  const [selected, setSelected] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [checkedProfiles, setCheckedProfiles] = useState(null);
  const [lastSelectedCandidateId, setLastSelectedCandidateId] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadedCandidateUids, setDownloadedCandidateUids] = useState([]);
  const [savedCandidateUids, setSavedCandidateUids] = useState([]);
  const [favCandidateUids, setFavCandidateUids] = useState([]);
  
  // Profile approval data
  const [approvedCandidates, setApprovedCandidates] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const recordsPerPageOptions = [5, 10, 20, 30, 50];

  // Filter Options State
  const [filters, setFilters] = useState({
    country: null,
    state: null,
    city: null,
    experience: [0, 30],
    salary: [0, 200000],
    languages: [],
    education: [],
    coreSubjects: [],
    jobTypes: [],
    grades: [],
    curriculum: [],
    designations: [],
    gender: [],
    teachingExperience: [0, 30],
    otherTeachingExperience: [],
    noticePeriod: [],
    jobSearchStatus: [],
    jobShiftPreferences: [],
    online: null,
    offline: null,
    tutionPreferences: []
  });

  // State for available options
  const [options, setOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    languages: [],
    education: [],
    coreSubjects: [],
    jobTypes: [
      { value: 'administration', label: 'Administration' },
      { value: 'teaching', label: 'Teaching' },
      { value: 'teachingAndAdmin', label: 'Teaching & Administration' }
    ],
    grades: [],
    curriculum: [],
    designations: [],
    expRange: [0, 30],
    salRange: [0, 200000]
  });

  // Get current candidates for pagination
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filtered.slice(indexOfFirstCandidate, indexOfLastCandidate);

  // Calculate total pages
  const totalPages = Math.ceil(filtered.length / candidatesPerPage);

  // Smart pagination: show limited page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const delta = 2; // Pages to show around current page
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

  // Fetch profile approval data
  useEffect(() => {
    const fetchApprovedCandidates = async () => {
      try {
        const { data } = await axios.get(PROFILE_APPROVED_API);
        // Filter only approved candidates (isApproved === 1)
        const approved = Array.isArray(data)
          ? data.filter(candidate => candidate.isApproved === 1).map(candidate => candidate.firebase_uid)
          : [];
        setApprovedCandidates(approved);
      } catch (error) {
        console.error('Error fetching approved candidates:', error);
        setApprovedCandidates([]);
      }
    };
    fetchApprovedCandidates();
  }, []);

  // Fetch user features (downloaded, saved, favorite candidates)
  useEffect(() => {
    if (!user) return;
    const fetchUserFeatures = async () => {
      try {
        const { data } = await axios.get(FAV_API);
        const currentUserUid = user.firebase_uid || user.uid;
        
        // Downloaded candidates
        const downloadedUids = data
          .filter(f => 
            (f.dowloaded_candidate === 1 || f.dowloaded_candidate === true) &&
            f.added_by === currentUserUid
          )
          .map(f => f.firebase_uid);
        setDownloadedCandidateUids(downloadedUids);
        
        // Saved candidates
        const savedUids = data
          .filter(f => 
            (f.saved_candidate === 1 || f.saved_candidate === true) &&
            f.added_by === currentUserUid
          )
          .map(f => f.firebase_uid);
        setSavedCandidateUids(savedUids);
        
        // Favorite candidates
        const favUids = data
          .filter(f => 
            (f.favroute_candidate === 1 || f.favroute_candidate === true) &&
            f.added_by === currentUserUid
          )
          .map(f => f.firebase_uid);
        setFavCandidateUids(favUids);
      } catch (error) {
        console.error('Error fetching user features:', error);
        setDownloadedCandidateUids([]);
        setSavedCandidateUids([]);
        setFavCandidateUids([]);
      }
    };
    fetchUserFeatures();
  }, [user]);

  // Fetch Candidates Data - only approved candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const { data } = await axios.get(API);
        const checkRes = data[0];
        console.log(checkRes);
        // Decode obfuscated data back to real data for application use
        // const decodedData = decodeCandidatesData(data);
        // const normalizedData = decodedData.map(candidate => ({
        //   ...candidate,
        //   permanent_country_name: candidate.permanent_country_name?.trim(),
        //   permanent_state_name: candidate.permanent_state_name?.trim(),
        //   permanent_city_name: candidate.permanent_city_name?.trim(),
        //   Job_Type: candidate.Job_Type?.trim(),
        //   languages: candidate.languages || '',
        //   education_details_json: candidate.education_details_json || ''
        // }));
        
        // Filter only approved candidates (if approvedCandidates is available)
        const approvedOnly = approvedCandidates.length > 0 
          ? checkRes.filter(candidate => 
              approvedCandidates.includes(candidate.firebase_uid)
            )
          : []; // Show no candidates if no approved candidates yet
        
        setAll(approvedOnly); // This array will be used for search and filters - contains only approved candidates
        setFiltered(approvedOnly);
        extractFilterOptions(approvedOnly);
      } catch (error) {
        console.error('Error fetching candidates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [approvedCandidates]);

  // Extract Filter Options from Data with improved consistency
  const extractFilterOptions = (data) => {
    const newOptions = {
      countries: new Set(), states: new Set(), cities: new Set(),
      languages: new Set(), education: new Set(), coreSubjects: new Set(),
      grades: new Set(), curriculum: new Set(), designations: new Set(),
      expRange: [0, 30], salRange: [0, 200000]
    };

    data.forEach(candidate => {
      // Location data - normalize and trim
      if (candidate.permanent_country_name) {
        newOptions.countries.add(candidate.permanent_country_name.trim());
      }
      if (candidate.permanent_state_name) {
        newOptions.states.add(candidate.permanent_state_name.trim());
      }
      if (candidate.permanent_city_name) {
        newOptions.cities.add(candidate.permanent_city_name.trim());
      }
      
             // Languages - use improved parsing
       try {
         if (candidate.languages) {
           const languageList = parseLanguages(candidate.languages);
           languageList.forEach(lang => {
             if (lang) newOptions.languages.add(lang);
           });
         }
       } catch (error) {
         console.error('Error parsing languages for filter options:', error);
       }
       
       // Education and subjects - use improved parsing
       if (candidate.education_details_json) {
         try {
           const { types, subjects } = parseEducation(candidate.education_details_json);
           
           types.forEach(type => {
             if (type) newOptions.education.add(type);
           });
           
           subjects.forEach(subject => {
             if (subject) newOptions.coreSubjects.add(subject);
           });
         } catch (error) {
           console.error('Error parsing education for filter options:', error);
         }
       }
      
      // Other fields - normalize and trim
      if (candidate.grades_taught && candidate.grades_taught.trim()) {
        newOptions.grades.add(candidate.grades_taught.trim());
      }
      if (candidate.curriculum_taught && candidate.curriculum_taught.trim()) {
        newOptions.curriculum.add(candidate.curriculum_taught.trim());
      }
      if (candidate.designation && candidate.designation.trim()) {
        newOptions.designations.add(candidate.designation.trim());
      }
    });
    
    const formatOptions = (set) => Array.from(set).filter(Boolean).map(value => ({ value, label: value }));
    setOptions(prev => ({
      ...prev,
      countries: formatOptions(newOptions.countries),
      states: formatOptions(newOptions.states),
      cities: formatOptions(newOptions.cities),
      languages: formatOptions(newOptions.languages),
      education: formatOptions(newOptions.education),
      coreSubjects: formatOptions(newOptions.coreSubjects),
      grades: formatOptions(newOptions.grades),
      curriculum: formatOptions(newOptions.curriculum),
      designations: formatOptions(newOptions.designations),
      expRange: newOptions.expRange,
      salRange: newOptions.salRange
    }));
  };

  // Apply filters to candidate list
  const applyCurrentFilters = useCallback((filtersToApply, dataToFilter = all) => {
    // Debug log to see the raw filter values
    console.log("Raw filter values:", {
      country: filtersToApply.country,
      state: filtersToApply.state,
      city: filtersToApply.city
    });
    
    // Formatting filters for comparison
    const formattedFilters = {
      ...filtersToApply,
      country: filtersToApply.country?.value,
      state: filtersToApply.state?.value,
      city: filtersToApply.city?.value,
      languages: filtersToApply.languages?.map(l => l.value) || [],
      education: filtersToApply.education?.map(e => e.value) || [],
      coreSubjects: filtersToApply.coreSubjects?.map(s => s.value) || [],
      jobTypes: filtersToApply.jobTypes?.map(j => j.value) || [],
      grades: filtersToApply.grades?.map(g => g.value) || [],
      curriculum: filtersToApply.curriculum?.map(c => c.value) || [],
      designations: filtersToApply.designations?.map(d => d.value) || [],
      gender: filtersToApply.gender?.map(g => g.value) || [],
      noticePeriod: filtersToApply.noticePeriod?.map(n => n.value) || [],
      jobSearchStatus: filtersToApply.jobSearchStatus?.map(j => j.value) || [],
      jobShiftPreferences: filtersToApply.jobShiftPreferences?.map(j => j.value) || [],
      tutionPreferences: filtersToApply.tutionPreferences?.map(t => t.value) || [],
      otherTeachingExperience: filtersToApply.otherTeachingExperience?.map(t => t.value) || [],
      online: filtersToApply.online?.value,
      offline: filtersToApply.offline?.value
    };

    // Helper function to safely parse languages
    const parseLanguages = (languageData) => {
      if (!languageData) return [];
      
      try {
        // If it's already an array
        if (Array.isArray(languageData)) {
          return languageData.map(lang => {
            if (typeof lang === 'string') return lang.trim();
            if (lang && lang.language) return lang.language.trim();
            return String(lang).trim();
          });
        }
          
        // If it's a string that might be JSON
        if (typeof languageData === 'string') {
          try {
            const parsed = JSON.parse(languageData);
            if (Array.isArray(parsed)) {
              return parsed.map(lang => {
                if (typeof lang === 'string') return lang.trim();
                if (lang && lang.language) return lang.language.trim();
                return String(lang).trim();
              });
            }
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            return languageData.split(',').map(lang => lang.trim()).filter(Boolean);
          }
        }
        
        return [String(languageData).trim()];
      } catch (error) {
        return [];
      }
    };

    // Helper function to safely parse education details with better error handling
    const parseEducation = (educationJson) => {
      if (!educationJson) return { types: [], subjects: [] };
      
      try {
        const types = [];
        const subjects = [];
        
        // Match JSON objects in the string - improved regex
        const jsonObjects = educationJson.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
        
        jsonObjects.forEach(jsonStr => {
          try {
            // Enhanced JSON cleaning
            let cleanObj = jsonStr
              .replace(/"\[\\?"([^"]+)\\?"\]"/g, '"[$1]"')  // Fix array notation
              .replace(/\\"/g, '"')                         // Fix escaped quotes
              .replace(/,\s*([\]}])/g, '$1')               // Remove trailing commas
              .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Quote keys
              .replace(/:\s*'([^']*)'/g, ':"$1"')          // Convert single to double quotes
              .replace(/:\s*([^",\{\}\[\]]+?)(?=[,\}])/g, ':"$1"'); // Quote unquoted values
            
            const detail = JSON.parse(cleanObj);
            
            // Check for various possible field names for education type
            const educationType = detail.education_type || detail.educationType || 
                                detail.type || detail.degree || detail.degreeName;
            if (educationType && typeof educationType === 'string') {
              types.push(educationType.trim());
            }
              
            // Check for various possible field names for core subjects
            let subjectList = detail.coreSubjects || detail.core_subjects || 
                              detail.subjects || detail.specialization;
              
            if (subjectList) {
              if (typeof subjectList === 'string') {
                try {
                  // Try to parse as JSON first
                  subjectList = JSON.parse(subjectList.replace(/\\"/g, '"'));
                } catch {
                  // If JSON parsing fails, try regex to extract quoted strings
                  const matches = subjectList.match(/"([^"]+)"/g);
                  if (matches) {
                    subjectList = matches.map(s => s.replace(/"/g, ''));
                  } else {
                    // Fallback to comma-separated split
                    subjectList = subjectList.split(',').map(s => s.trim());
                  }
                }
              }
                
              const subjectsArray = Array.isArray(subjectList) ? subjectList : [subjectList];
              subjectsArray.forEach(subject => {
                if (subject && typeof subject === 'string') {
                  subjects.push(subject.trim());
                }
              });
            }
          } catch (error) {
            // Skip invalid JSON objects
          }
        });
        
        return { types, subjects };
      } catch (error) {
        console.error('Error parsing education details:', error);
        return { types: [], subjects: [] };
      }
    };

    // Check if any filters are actually applied
    const activeFilterKeys = Object.keys(formattedFilters).filter(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });

    // If no filters are applied, show all candidates
    if (activeFilterKeys.length === 0) {
      setFiltered(dataToFilter);
      setFiltersApplied(false);
      setHasNoResults(false);
      setCurrentPage(1);
      return;
    }

    // Apply relevance-based filtering like in SearchJobs
    let candidatesWithMatches = dataToFilter.map(candidate => {
      // Track which filters this candidate matches
      const matchedFilters = [];
      // Track if this candidate passes the minimum required filters
      let passes = true;
      
      // Location filters - consistent exact matching for all locations
      if (formattedFilters.country) {
        const candidateCountry = String(candidate.permanent_country_name || '').toLowerCase().trim();
        const filterCountry = String(formattedFilters.country).toLowerCase().trim();
        
        // Only match if candidate actually has a country value and it matches exactly
        if (candidateCountry && candidateCountry === filterCountry) {
          console.log(`✅ Country filter passed for ${candidate.fullName}: '${candidateCountry}' vs '${filterCountry}'`);
          matchedFilters.push('country');
        } else {
          console.log(`❌ Country filter failed for ${candidate.fullName}: '${candidateCountry}' vs '${filterCountry}'`);
          // Country is a required filter - if it fails, mark the candidate as not passing
          passes = false;
        }
      }
      
      if (formattedFilters.state) {
        // Get candidate state from multiple possible fields
        const candidateState = String(candidate.permanent_state_name || candidate.state_name || candidate.state || '').toLowerCase().trim();
        const filterState = String(formattedFilters.state).toLowerCase().trim();
        
        // Debug log to see what's being compared
        console.log(`Comparing states: Candidate state "${candidateState}" vs Filter state "${filterState}"`);
        
        // Exact match only - no partial matches, no variations
        if (candidateState && candidateState === filterState) {
          console.log(`✅ State filter passed for ${candidate.fullName}: '${candidateState}' exactly matches '${filterState}'`);
          matchedFilters.push('state');
        } else {
          console.log(`❌ State filter failed for ${candidate.fullName}: '${candidateState}' does not match '${filterState}'`);
          passes = false;
        }
      }
      
      if (formattedFilters.city) {
        const candidateCity = String(candidate.permanent_city_name || '').toLowerCase().trim();
        const filterCity = String(formattedFilters.city).toLowerCase().trim();
        
        // Only match if candidate actually has a city value and it matches exactly
        if (candidateCity && candidateCity === filterCity) {
          console.log(`✅ City filter passed for ${candidate.fullName}: '${candidateCity}' vs '${filterCity}'`);
          matchedFilters.push('city');
        } else {
          console.log(`❌ City filter failed for ${candidate.fullName}: '${candidateCity}' vs '${filterCity}'`);
          // City is a required filter - if it fails, mark the candidate as not passing
          passes = false;
        }
      }
      
      // Language filter - improved parsing with case-insensitive matching
      if (formattedFilters.languages.length > 0) {
        const candidateLanguages = parseLanguages(candidate.languages);
        const hasMatchingLanguage = formattedFilters.languages.some(filterLang => {
          const filterLangLower = filterLang.toLowerCase();
          return candidateLanguages.some(candLang => {
            const candLangLower = candLang.toLowerCase();
            // More flexible matching - exact match or contains
            return candLangLower === filterLangLower || 
                   candLangLower.includes(filterLangLower) || 
                   filterLangLower.includes(candLangLower);
          });
        });
        if (hasMatchingLanguage) {
          matchedFilters.push('languages');
        }
      }
      
      // Education and core subjects filter - improved parsing with case-insensitive matching
      if (formattedFilters.education.length > 0 || formattedFilters.coreSubjects.length > 0) {
        const { types: educationTypes, subjects: coreSubjects } = parseEducation(candidate.education_details_json);
        
        if (formattedFilters.education.length > 0) {
          const hasMatchingEducation = formattedFilters.education.some(filterEdu => {
            const filterEduLower = filterEdu.toLowerCase();
            return educationTypes.some(candEdu => {
              const candEduLower = candEdu.toLowerCase();
              // More flexible matching - exact match or contains
              return candEduLower === filterEduLower || 
                     candEduLower.includes(filterEduLower) || 
                     filterEduLower.includes(candEduLower);
            });
          });
          if (hasMatchingEducation) {
            matchedFilters.push('education');
          }
        }
        
        if (formattedFilters.coreSubjects.length > 0) {
          const hasMatchingSubject = formattedFilters.coreSubjects.some(filterSubj => {
            const filterSubjLower = filterSubj.toLowerCase();
            return coreSubjects.some(candSubj => {
              const candSubjLower = candSubj.toLowerCase();
              // More flexible matching - exact match or contains
              return candSubjLower === filterSubjLower || 
                     candSubjLower.includes(filterSubjLower) || 
                     filterSubjLower.includes(candSubjLower);
            });
          });
          if (hasMatchingSubject) {
            matchedFilters.push('coreSubjects');
          }
        }
      }
      
      // Job Type filter - improved matching with normalization
      if (formattedFilters.jobTypes.length > 0) {
        const candidateJobType = candidate.Job_Type ? candidate.Job_Type.trim() : '';
        const hasMatchingJobType = formattedFilters.jobTypes.some(filterJobType => {
          // Normalize both values for comparison
          const normalizedFilter = filterJobType.toLowerCase().trim();
          const normalizedCandidate = candidateJobType.toLowerCase();
          return normalizedCandidate === normalizedFilter ||
                 normalizedCandidate.includes(normalizedFilter) ||
                 normalizedFilter.includes(normalizedCandidate);
        });
        if (hasMatchingJobType) {
          matchedFilters.push('jobTypes');
        }
      }
      
      // Other filters with improved matching - use case-insensitive comparison
      if (formattedFilters.grades.length > 0) {
        const candidateGrade = candidate.grades_taught ? candidate.grades_taught.trim().toLowerCase() : '';
        const hasMatch = formattedFilters.grades.some(grade => 
          candidateGrade === grade.toLowerCase() || 
          candidateGrade.includes(grade.toLowerCase()) || 
          grade.toLowerCase().includes(candidateGrade)
        );
        if (hasMatch) {
          matchedFilters.push('grades');
        }
      }
      
      if (formattedFilters.curriculum.length > 0) {
        const candidateCurriculum = candidate.curriculum_taught ? candidate.curriculum_taught.trim().toLowerCase() : '';
        const hasMatch = formattedFilters.curriculum.some(curr => 
          candidateCurriculum === curr.toLowerCase() || 
          candidateCurriculum.includes(curr.toLowerCase()) || 
          curr.toLowerCase().includes(candidateCurriculum)
        );
        if (hasMatch) {
          matchedFilters.push('curriculum');
        }
      }
      
      if (formattedFilters.designations.length > 0) {
        const candidateDesignation = candidate.designation ? candidate.designation.trim().toLowerCase() : '';
        const hasMatch = formattedFilters.designations.some(desig => 
          candidateDesignation === desig.toLowerCase() || 
          candidateDesignation.includes(desig.toLowerCase()) || 
          desig.toLowerCase().includes(candidateDesignation)
        );
        if (hasMatch) {
          matchedFilters.push('designations');
        }
      }
      
      if (formattedFilters.gender.length > 0) {
        const candidateGender = candidate.gender ? candidate.gender.trim().toLowerCase() : '';
        const hasMatch = formattedFilters.gender.some(gender => 
          candidateGender === gender.toLowerCase()
        );
        if (hasMatch) {
          matchedFilters.push('gender');
        }
      }
      
      // Experience filters
      if (formattedFilters.minExperience && candidate.full_time_offline) {
        const candidateExp = parseInt(candidate.full_time_offline);
        if (!isNaN(candidateExp) && candidateExp >= parseInt(formattedFilters.minExperience)) {
          matchedFilters.push('experience');
        }
      }
      
      if (formattedFilters.teachingExperience && candidate.teaching_experience) {
        const candidateTeachingExp = parseInt(candidate.teaching_experience);
        if (!isNaN(candidateTeachingExp) && candidateTeachingExp >= parseInt(formattedFilters.teachingExperience[0])) {
          matchedFilters.push('teachingExperience');
        }
      }
      
      // Salary filter
      if (formattedFilters.minSalary && candidate.expected_salary) {
        const candidateSalary = parseInt(candidate.expected_salary);
        if (!isNaN(candidateSalary) && candidateSalary >= parseInt(formattedFilters.minSalary)) {
          matchedFilters.push('salary');
        }
      }
      
      // Calculate relevance score (percentage of active filters matched)
      let relevanceScore = 100; // Default to 100% if no filters are active
      
      // Ensure all candidates have at least some minimal score when filters are active
      if (activeFilterKeys.length > 0) {
        // Filter out location filters that don't apply to this candidate
        const validFilters = activeFilterKeys.filter(key => {
          if (key === 'country' && !candidate.permanent_country_name) return false;
          if (key === 'state' && !candidate.permanent_state_name) return false;
          if (key === 'city' && !candidate.permanent_city_name) return false;
          return true;
        });
        
        // Filter matched filters to only include valid ones
        const validMatchedFilters = matchedFilters.filter(filter => {
          if (filter === 'country' && !candidate.permanent_country_name) return false;
          if (filter === 'state' && !candidate.permanent_state_name) return false;
          if (filter === 'city' && !candidate.permanent_city_name) return false;
          return true;
        });
        
        // Add a base minimum score (40%) for all candidates that pass the filters
        const baseScore = 40;
        
        // Calculate the remaining 60% based on matched filter proportion
        const matchScore = validFilters.length > 0 
          ? Math.round((validMatchedFilters.length / validFilters.length) * 60)
          : 60;
        
        // Combine scores and ensure it's a valid number
        relevanceScore = baseScore + matchScore;
        
        // Validate the score is a proper number
        if (isNaN(relevanceScore) || !isFinite(relevanceScore)) {
          relevanceScore = 40; // Default to base score if calculation fails
        }
      }
      
      // Debug log for candidates that pass the filter
      if (passes) {
        console.log(`Candidate ${candidate.fullName} PASSED filters with:`, {
          location: `${candidate.permanent_city_name || ''}, ${candidate.permanent_state_name || ''}`,
          matchedFilters,
          relevanceScore
        });
      }
      
      // Return the candidate with match data
      return {
        candidate,
        matchedFilters,
        relevanceScore,
        passes
      };
    });
    
    // Now filter to only include candidates that pass the required filters
    // and have at least one matching filter if filters are active
    let filtered = candidatesWithMatches
      .filter(item => item.passes && (activeFilterKeys.length === 0 || item.matchedFilters.length > 0))
      .map(item => {
        // Ensure we're adding the properties with both names for compatibility
        return {
          ...item.candidate,
          relevanceScore: item.relevanceScore,
          matchedFilters: item.matchedFilters,
          matchingFilters: item.matchedFilters // Add with both property names for compatibility
        };
      });

    // Sort candidates by location precision first, then by relevance score
    filtered.sort((a, b) => {
      // If location filters are active, prioritize exact location matches
      if (formattedFilters.city || formattedFilters.state || formattedFilters.country) {
        // City is highest priority
        if (formattedFilters.city) {
          const aHasCity = a.matchedFilters && a.matchedFilters.includes('city');
          const bHasCity = b.matchedFilters && b.matchedFilters.includes('city');
          
          if (aHasCity && !bHasCity) return -1;
          if (!aHasCity && bHasCity) return 1;
        }
        
        // State is second priority
        if (formattedFilters.state) {
          const aHasState = a.matchedFilters && a.matchedFilters.includes('state');
          const bHasState = b.matchedFilters && b.matchedFilters.includes('state');
          
          if (aHasState && !bHasState) return -1;
          if (!aHasState && bHasState) return 1;
          
          // If filtering by state, ensure exact state match gets priority
          if (aHasState && bHasState) {
            const stateFilter = String(formattedFilters.state).toLowerCase().trim();
            const aState = String(a.permanent_state_name || a.state_name || a.state || '').toLowerCase().trim();
            const bState = String(b.permanent_state_name || b.state_name || b.state || '').toLowerCase().trim();
            
            const aExactMatch = aState === stateFilter;
            const bExactMatch = bState === stateFilter;
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
          }
        }
        
        // Country is third priority
        if (formattedFilters.country) {
          const aHasCountry = a.matchedFilters && a.matchedFilters.includes('country');
          const bHasCountry = b.matchedFilters && b.matchedFilters.includes('country');
          
          if (aHasCountry && !bHasCountry) return -1;
          if (!aHasCountry && bHasCountry) return 1;
        }
      }
      
      // If location priorities are equal, sort by relevance score
      return b.relevanceScore - a.relevanceScore;
    });
    
    // Update state with filtered results
    setFiltered(filtered);
    setFiltersApplied(activeFilterKeys.length > 0);
    setHasNoResults(filtered.length === 0);
    setCurrentPage(1);
  }, [all]);

  // Handle Filter Change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    applyCurrentFilters(newFilters);
  };

  // Handle records per page change
  const handleRecordsPerPageChange = (e) => {
    const newCandidatesPerPage = parseInt(e.target.value);
    setCandidatesPerPage(newCandidatesPerPage);
    setCurrentPage(1);
    localStorage.setItem('candidatesPerPage', newCandidatesPerPage.toString());
  };

  // Change page
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const handleCandidateSelect = (selection, type) => {
    // Clear any existing highlights when selecting a new candidate
    document.querySelectorAll('.highlighted-candidate').forEach(el => {
      el.classList.remove('highlighted-candidate');
    });

    // firebase_uid is now kept as plain text, no decoding needed
    const decodedCandidate = selection;
    
    setSelected(decodedCandidate);
    setViewType(type);
  };

  // Function to scroll to a specific candidate
  const scrollToCandidate = (candidateId) => {
    if (!candidateId) return;
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        // Add highlight effect - this will persist until new selection
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  const handleBack = () => {
    // Store the selected candidate ID before clearing selection
    if (selected) {
      setLastSelectedCandidateId(selected.firebase_uid);
    }
    
    setSelected(null);
    setViewType(null);
    
    // Scroll to the previously selected candidate
    if (selected) {
      scrollToCandidate(selected.firebase_uid);
    }
  };

  // Handle search - only searches through approved candidates
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      // If filters are applied, reapply them instead of showing all
      if (filtersApplied) {
        applyCurrentFilters(filters);
      } else {
        setFiltered(all); // 'all' contains only approved candidates
      }
      return;
    }
    
    setIsSearching(true);
    
    // Apply search to the base dataset first (all contains only approved candidates)
    const searchResults = searchCandidates(all, searchTerm);
    
    // If filters are applied, apply them to the search results
    if (filtersApplied) {
      // Apply filters to search results using the same relevance-based approach
      const searchResultsWithFilters = [...searchResults];
      applyCurrentFilters(filters, searchResultsWithFilters);
    } else {
      setSearchResults(searchResults);
      setFiltered(searchResults);
    }
    
    setCurrentPage(1);
  }, [all, filtersApplied, filters, applyCurrentFilters]);

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="search-candidates-container">
      <div className="widget-title d-flex justify-content-between align-items-center">
        <div className="title-area">
          {filtersApplied ? (
            <h4>Filtered Candidates <span className="badge bg-primary">{filtered.length}</span></h4>
          ) : (
            <h4>Search Candidates</h4>
          )}
        </div>
        <div className="chosen-outer d-flex align-items-center">
          <SearchBar onSearch={handleSearch} />
          {filtersApplied && (
            <div className="me-3">
              <span className="text-muted">
                Showing {filtered.length} of {all.length} candidates
              </span>
            </div>
          )}
          <div className="records-per-page">
            <select
              value={candidatesPerPage}
              onChange={handleRecordsPerPageChange}
              className="form-select records-dropdown"
            >
              {recordsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="widget-content">
        {!showFilter && (
          <div className="filter-toggle mb-3">
            <button 
              className="btn btn-primary"
              onClick={() => setShowFilter(true)}
            >
              <i className="fas fa-filter me-2"></i>Show Filters
              {filtersApplied && (
                <span className="badge bg-light text-dark ms-2">Active</span>
              )}
            </button>
            {filtersApplied && (
              <button 
                className="btn btn-outline-secondary ms-2"
                onClick={() => {
                  setFilters({
                    country: null,
                    state: null,
                    city: null,
                    experience: [0, 30],
                    salary: [0, 200000],
                    languages: [],
                    education: [],
                    coreSubjects: [],
                    jobTypes: [],
                    grades: [],
                    curriculum: [],
                    designations: [],
                    gender: [],
                    teachingExperience: [0, 30],
                    otherTeachingExperience: [],
                    noticePeriod: [],
                    jobSearchStatus: [],
                    jobShiftPreferences: [],
                    online: null,
                    offline: null,
                    tutionPreferences: []
                  });
                  setFiltered(all);
                  setFiltersApplied(false);
                  setHasNoResults(false);
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-times me-1"></i>Clear All Filters
              </button>
            )}
          </div>
        )}
        
        {showFilter && (
          <div className="filter-drawer-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                {filtersApplied && (
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setFilters({
                        country: null,
                        state: null,
                        city: null,
                        jobTypes: [],
                        curriculum: [],
                        designations: [],
                        gender: [],
                        teachingExperience: [0, 30],
                        otherTeachingExperience: [],
                        noticePeriod: [],
                        jobSearchStatus: [],
                        jobShiftPreferences: [],
                        online: null,
                        offline: null,
                        tutionPreferences: []
                      });
                      setFiltered(all);
                      setFiltersApplied(false);
                      setHasNoResults(false);
                      setCurrentPage(1);
                    }}
                  >
                    <i className="fas fa-times me-1"></i>Clear All
                  </button>
                )}
              </div>
            </div>
            <FilterDrawer
              initialOptions={options}
              initialFilters={filters}
              onClose={() => setShowFilter(false)}
              onApply={handleFilterChange}
              candidates={all}
              isInline={true}
            />
             
          </div>
        )}

        {selected ? (
          viewType === 'full' ? (
            <CandidateDetail
              candidate={selected}
              onBack={handleBack}
              checkedProfiles={checkedProfiles}
            />
          ) : (
            <ViewShort
              candidate={selected}
              onBack={handleBack}
              checkedProfiles={checkedProfiles}
            />
          )
        ) : hasNoResults ? (
          <div className="no-results-message alert alert-info">
            No candidates match the selected filters. Try adjusting your criteria.
          </div>
        ) : (
          <>

            
            <CandidateList
              candidates={currentCandidates}
              onSelect={handleCandidateSelect}
              setCheckedProfiles={setCheckedProfiles}
              downloadedCandidateUids={downloadedCandidateUids}
              savedCandidateUids={savedCandidateUids}
              favCandidateUids={favCandidateUids}
            />

            {totalPages > 1 && (
              <div className="pagination-box">
                <nav>
                  <ul className="pagination">
                    <li className={`page-item prev-button ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {pageNumbers.map((number, index) => {
                      if (number === '...') {
                        return (
                          <li key={`dots-${index}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      return (
                        <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => paginate(number)}
                          >
                            {number}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item next-button ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
                <div className="pagination-info">
                  Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filtered.length)} of {filtered.length} results
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Custom styles for better filter UI and enhanced highlight styles */}
      <style jsx>{`
        .filter-toggle {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          text-align: center;
        }
        
        .filter-drawer-container {
          background: #ffffff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-toggle button {
          margin: 0 5px;
        }
        
        /* Enhanced highlight styles for recently viewed candidate */
        .candidate-item.compact.highlighted-candidate {
          border: 3px solid #2196f3 !important;
          background-color: #e3f2fd !important;
          background: #e3f2fd !important;
          border-radius: 8px !important;
          transform: scale(1.02) !important;
          transition: all 0.3s ease-in-out !important;
          position: relative !important;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3) !important;
        }
        
        .highlighted-candidate::before {
          content: "Recently Viewed";
          position: absolute;
          top: -8px;
          right: -8px;
          background: #2196f3;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Smooth transition for all candidate cards */
        [data-candidate-id] {
          transition: all 0.3s ease-in-out;
        }
        
        @media (max-width: 768px) {
          .filter-toggle {
            text-align: left;
          }
          
          .filter-toggle button {
            width: 100%;
            margin: 5px 0;
          }
          
          .filter-drawer-container {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchCandidates; 
