//AllCandidates.jsx


import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CandidateCard from '../shared/CandidateCard';
import CandidateDetail from '../shared/ViewFull';
import ViewShort from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import Pagination from '../shared/Pagination';
import RecordsPerPageDropdown from '../shared/RecordsPerPageDropdown';
import CandidateFilterPanel from '../shared/CandidateFilterPanel';
import CandidateApiService from '../shared/CandidateApiService';
import useCandidateFilterOptions from '../shared/useCandidateFilterOptions';
import { parseEducation, parseLanguages } from '../utils/candidateUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import noCandidateIllustration from '../../../../../assets/Illustrations/No candidate.png';
import '../styles/candidate-highlight.css';
import LoadingState from '../../../../common/LoadingState';
import CandidateActionConfirmationModal from '../shared/CandidateActionConfirmationModal';
import ModalPortal from '../../../../common/ModalPortal';

const REDEEM_API = 'https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem';
const CANDIDATES_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change';
// NOTE: Update this URL with your actual profile_approved API Gateway URL
// Check AWS Console > API Gateway > offer service > profile_approved endpoint
const APPROVED_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved';

// TEMPORARY DEBUG: Set to true to bypass CandidateApiService and call API directly
const USE_DIRECT_API_CALL = true;
// TEMPORARY DEBUG: Set to true to bypass approval filtering and show all candidates
const BYPASS_APPROVAL_FILTER = false;

const normalizeString = (value) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .trim();

const normalizeComparisonValue = (value) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // ignore parse errors
    }

    return trimmed
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value].filter(Boolean);
};

const buildCandidateSubjects = (candidate) => {
  const subjects = new Set();
  const { subjects: parsedSubjects } = parseEducation(candidate.education_details_json);
  parsedSubjects.forEach((subject) => subject && subjects.add(subject));

  [
    candidate.teaching_subjects,
    candidate.teaching_administrative_subjects,
    candidate.subjects_taught,
    candidate.teaching_coreExpertise,
    candidate.teaching_administrative_coreExpertise,
    candidate.core_subjects
  ].forEach((source) => {
    toArray(source).forEach((subject) => subjects.add(subject));
  });

  return Array.from(subjects);
};

const buildCandidateGrades = (candidate) => {
  const grades = new Set();
  [
    candidate.teaching_grades,
    candidate.teaching_administrative_grades,
    candidate.grades_taught
  ].forEach((source) => {
    toArray(source).forEach((grade) => grades.add(grade));
  });
  return Array.from(grades);
};

const buildCandidateCurriculum = (candidate) => {
  const curriculum = new Set();
  [
    candidate.teaching_curriculum,
    candidate.administrative_curriculum,
    candidate.teaching_administrative_curriculum,
    candidate.curriculum_taught
  ].forEach((source) => {
    toArray(source).forEach((entry) => curriculum.add(entry));
  });
  return Array.from(curriculum);
};

const buildCandidateDesignations = (candidate) => {
  const designations = new Set();
  [
    candidate.teaching_designations,
    candidate.administrative_designations,
    candidate.teaching_administrative_designations,
    candidate.designation
  ].forEach((source) => {
    toArray(source).forEach((entry) => designations.add(entry));
  });
  return Array.from(designations);
};

const mapNoticeValueToLabel = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  const mappings = new Map([
    // From JobPreferences.jsx (Job Seeker)
    ['immediatejoiner', 'Immediate Joiner'],
    ['lessthan7', '< 7 days'],
    ['lessthan15', '< 15 days'],
    ['lessthan1month', '< 1 month'],
    ['morethan1month', '> 1 Month'],
    // From CreateJobForm.jsx (Job Provider)
    ['<7', '< 7 days'],
    ['<15', '< 15 days'],
    ['<30', '< 1 month'],
    ['>30', '> 1 Month'],
    // Legacy/alternative formats (for backward compatibility)
    ['immediate', 'Immediate'],
    ['less_than_15', '< 15 days'],
    ['15days', '< 15 days'],
    ['15 days', '< 15 days'],
    ['1month', '< 1 month'],
    ['1 month', '< 1 month'],
    ['2months', '2 months'],
    ['2 months', '2 months'],
    ['3months', '3 months'],
    ['3 months', '3 months']
  ]);

  if (mappings.has(normalized)) {
    return mappings.get(normalized);
  }

  const numeric = parseFloat(normalized);
  if (!Number.isNaN(numeric)) {
    if (numeric === 0) return 'Immediate';
    if (numeric <= 0.5) return '15 days';
    if (numeric <= 1) return '1 month';
    if (numeric <= 2) return '2 months';
    if (numeric <= 3) return '3 months';
  }

  return null;
};

const parseSalaryRange = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return { min: value, max: value };
  }

  const raw = value.toString().toLowerCase().trim();
  if (!raw) return null;

  const numbers = raw.match(/(\d+(\.\d+)?)/g)?.map((n) => parseFloat(n)) || [];
  const hasK = raw.includes('k');
  const hasLakh = raw.includes('lac') || raw.includes('lakh') || raw.includes('l');

  const convert = (num) => {
    if (Number.isNaN(num)) return null;
    if (hasK) return num * 1000;
    if (hasLakh || num <= 25) return num * 100000;
    return num;
  };

  if (numbers.length >= 2) {
    const [first, second] = numbers.map(convert);
    if (first != null && second != null) {
      return {
        min: Math.min(first, second),
        max: Math.max(first, second)
      };
    }
  }

  if (numbers.length === 1) {
    const converted = convert(numbers[0]);
    if (converted != null) {
      if (raw.includes('less')) {
        return { min: 0, max: converted };
      }
      if (raw.includes('more') || raw.includes('above') || raw.includes('greater')) {
        return { min: converted, max: Infinity };
      }
      return { min: converted, max: converted };
    }
  }

  return null;
};

const candidateHasModeAvailability = (candidate, mode) => {
  const onlineFields = [
    'full_time_online',
    'part_time_weekdays_online',
    'part_time_weekends_online',
    'part_time_vacations_online',
    'school_college_university_online',
    'coaching_institute_online',
    'Ed_TechCompanies_online',
    'Home_Tutor_online',
    'Private_Tutor_online',
    'Group_Tutor_online',
    'tuitions_2_online',
    'Private_Tutions_online_online'
  ];

  const offlineFields = [
    'full_time_offline',
    'part_time_weekdays_offline',
    'part_time_weekends_offline',
    'part_time_vacations_offline',
    'school_college_university_offline',
    'coaching_institute_offline',
    'Ed_TechCompanies_offline',
    'Home_Tutor_offline',
    'Private_Tutor_offline',
    'Group_Tutor_offline',
    'tuitions_2_offline'
  ];

  const fieldsToCheck = mode === 'online' ? onlineFields : offlineFields;
  return fieldsToCheck.some((field) => {
    const value = candidate[field];
    if (value === undefined || value === null) return false;
    const normalized = normalizeString(value);
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  });
};

const candidateSalaryWithinRange = (candidate, minSalary, maxSalary) => {
  const range = parseSalaryRange(candidate.expected_salary);
  if (!range) return false;

  const candidateMin = range.min ?? range.max ?? 0;
  const candidateMax = range.max ?? range.min ?? 0;

  const minTarget = minSalary ?? 0;
  const maxTarget = maxSalary ?? Infinity;

  return candidateMax >= minTarget && candidateMin <= maxTarget;
};

const parseSalaryInput = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseExperienceInput = (value) => {
  if (value === null || value === undefined || value === '') return null;
  // Handle react-select option object format
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const parsed = Number(value.value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  // Handle string/number format (backward compatibility)
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getCandidateExperienceYears = (candidate) => {
  const sources = [
    candidate.total_experience_years,
    candidate.total_experience,
    candidate.overall_experience,
    candidate.teaching_experience_years
  ];

  for (const source of sources) {
    const parsed = parseExperienceInput(source);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const buildCandidateCoreExpertise = (candidate) => {
  const expertise = new Set();
  [
    candidate.teaching_coreExpertise,
    candidate.teaching_core_expertise,
    candidate.core_expertise,
    candidate.teaching_administrative_coreExpertise,
    candidate.teaching_administrative_core_expertise
  ].forEach((source) => {
    toArray(source).forEach((item) => expertise.add(item));
  });

  return Array.from(expertise);
};

const AllCandidates = ({ 
  onViewCandidate, 
  onBackFromCandidateView,
  selectedCandidate,
  viewType,
  viewMode,
  onBackToList
}) => {
  const { user, loading: userLoading } = useAuth();
  const navigate = useNavigate();

  // Candidates data state
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User preferences state
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [favouriteCandidates, setFavouriteCandidates] = useState([]);
  const [downloadedCandidates, setDownloadedCandidates] = useState([]);
  const [unlockedCandidateIds, setUnlockedCandidateIds] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(() => {
    const saved = localStorage.getItem('candidatesPerPage');
    return saved ? parseInt(saved) : 10;
  });
  
  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [userHasAppliedFilters, setUserHasAppliedFilters] = useState(false); // Track if user explicitly applied filters
  const [filteredCandidatesByFilters, setFilteredCandidatesByFilters] = useState([]);

  // Candidate photos
  const [candidatePhotos, setCandidatePhotos] = useState({});
  const [pendingScrollCandidate, setPendingScrollCandidate] = useState(null);

  const getUnlockedCandidatesFromLocalStorage = useCallback(() => {
    if (!user) return [];

    const userId = user.firebase_uid || user.uid;
    if (!userId) return [];

    const unlockedIds = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`unlocked_${userId}_`)) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const parsed = JSON.parse(stored);
        if (!parsed?.unlocked || !parsed?.timestamp) continue;

        const unlockTime = new Date(parsed.timestamp);
        const now = new Date();
        const daysDiff = (now - unlockTime) / (1000 * 60 * 60 * 24);

        if (Number.isFinite(daysDiff) && daysDiff <= 30) {
          const candidateId = key.replace(`unlocked_${userId}_`, '');
          if (candidateId) {
            unlockedIds.push(String(candidateId));
          }
        }
      } catch (error) {
        console.error('AllCandidates: Error parsing localStorage entry', key, error);
      }
    }

    return unlockedIds;
  }, [user]);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [candidateToMessage, setCandidateToMessage] = useState(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [candidateToUnlock, setCandidateToUnlock] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [showFavouriteConfirmModal, setShowFavouriteConfirmModal] = useState(false);
  const [candidateToFavourite, setCandidateToFavourite] = useState(null);

const { options: apiFilterOptions, loading: filterOptionsLoading } = useCandidateFilterOptions();

  // Filter options state
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    languages: [],
    education: [],
    coreSubjects: [],
    coreExpertise: [],
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

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      
      let allCandidates, approvedUids;
      
      if (USE_DIRECT_API_CALL) {
        // DIRECT API CALL - bypass CandidateApiService to test
        console.log('🧪 DIRECT API MODE: Calling APIs directly');
        
        try {
          const [candidatesRes, approvedRes] = await Promise.all([
            axios.get(CANDIDATES_API),
            axios.get(APPROVED_API)
          ]);
          
          console.log('🔴 DIRECT API: candidatesRes.status:', candidatesRes.status);
          console.log('🔴 DIRECT API: candidatesRes.data type:', typeof candidatesRes.data);
          console.log('🔴 DIRECT API: candidatesRes.data length:', Array.isArray(candidatesRes.data) ? candidatesRes.data.length : 'not array');
          console.log('🔴 DIRECT API: candidatesRes.data sample:', Array.isArray(candidatesRes.data) ? candidatesRes.data.slice(0, 2) : candidatesRes.data);
          
          // Handle API Gateway response format
          let candidatesData = candidatesRes.data;
          if (candidatesData && typeof candidatesData === 'object' && 'body' in candidatesData) {
            try {
              candidatesData = JSON.parse(candidatesData.body);
              console.log('🔴 DIRECT API: Parsed body, length:', Array.isArray(candidatesData) ? candidatesData.length : 'not array');
            } catch (e) {
              console.error('🔴 DIRECT API: Error parsing body:', e);
            }
          }
          
          allCandidates = Array.isArray(candidatesData) ? candidatesData : [];
          
          console.log('🔴 DIRECT API: approvedRes.status:', approvedRes.status);
          console.log('🔴 DIRECT API: approvedRes.data type:', typeof approvedRes.data);
          console.log('🔴 DIRECT API: approvedRes.data length:', Array.isArray(approvedRes.data) ? approvedRes.data.length : 'not array');
          console.log('🔴 DIRECT API: approvedRes.data sample:', Array.isArray(approvedRes.data) ? approvedRes.data.slice(0, 5) : approvedRes.data);
          
          // Handle API Gateway response format
          let approvedData = approvedRes.data;
          if (approvedData && typeof approvedData === 'object' && 'body' in approvedData) {
            try {
              approvedData = JSON.parse(approvedData.body);
              console.log('🔴 DIRECT API: Parsed approved body, length:', Array.isArray(approvedData) ? approvedData.length : 'not array');
            } catch (e) {
              console.error('🔴 DIRECT API: Error parsing approved body:', e);
            }
          }
          
          approvedUids = Array.isArray(approvedData) ? approvedData : [];
          
        } catch (apiError) {
          console.error('❌ DIRECT API ERROR:', apiError);
          console.error('❌ Error response:', apiError.response?.data);
          console.error('❌ Error status:', apiError.response?.status);
          throw apiError;
        }
      } else {
        // Use CandidateApiService (original method)
        [allCandidates, approvedUids] = await Promise.all([
          CandidateApiService.fetchCandidates(),
          CandidateApiService.fetchApprovedCandidates()
        ]);
      }
      
      // DEBUG: Log raw responses
      console.log('🔴 RAW DEBUG: allCandidates type:', typeof allCandidates, Array.isArray(allCandidates) ? 'array' : 'not array');
      console.log('🔴 RAW DEBUG: allCandidates length:', allCandidates?.length || 0);
      console.log('🔴 RAW DEBUG: allCandidates sample:', allCandidates?.slice?.(0, 2) || allCandidates);
      console.log('🔴 RAW DEBUG: approvedUids type:', typeof approvedUids, Array.isArray(approvedUids) ? 'array' : 'not array');
      console.log('🔴 RAW DEBUG: approvedUids length:', approvedUids?.length || 0);
      console.log('🔴 RAW DEBUG: approvedUids sample:', approvedUids?.slice?.(0, 5) || approvedUids);
      
      // Check if allCandidates is empty - this is the main issue
      if (!allCandidates || allCandidates.length === 0) {
        console.error('❌ CRITICAL: allCandidates is empty! Check CandidateApiService.fetchCandidates()');
        console.error('❌ This means the API call failed or returned empty data');
        console.error('❌ Check Network tab for the candidates API request');
        setCandidates([]);
        setSearchResults([]);
        toast.error('No candidates found. Please check the API connection.');
        return;
      }
      
      // Normalize approvedUids to array of strings (handle both formats)
      let normalizedApprovedUids = [];
      if (Array.isArray(approvedUids)) {
        if (approvedUids.length > 0) {
          // Check if it's array of objects or array of strings
          if (typeof approvedUids[0] === 'object' && approvedUids[0] !== null) {
            // Array of objects: extract firebase_uid
            normalizedApprovedUids = approvedUids
              .map(uid => String(uid?.firebase_uid || uid))
              .filter(Boolean);
            console.log('🔍 DEBUG: Converted from objects to strings, count:', normalizedApprovedUids.length);
          } else {
            // Array of strings/numbers: convert to strings
            normalizedApprovedUids = approvedUids.map(uid => String(uid)).filter(Boolean);
            console.log('🔍 DEBUG: Already strings, normalized count:', normalizedApprovedUids.length);
          }
        }
      } else if (approvedUids) {
        // Single value, convert to array
        normalizedApprovedUids = [String(approvedUids)].filter(Boolean);
        console.log('🔍 DEBUG: Single value converted to array');
      }
      
      console.log('🔍 DEBUG: Normalized approved UIDs count:', normalizedApprovedUids.length);
      console.log('🔍 DEBUG: Normalized approved UIDs sample:', normalizedApprovedUids.slice(0, 5));
      
      // IMPORTANT: Fallback logic - if no approved UIDs, show all candidates
      let approvedCandidates;
      
      // TEMPORARY BYPASS: Set BYPASS_APPROVAL_FILTER = true to test without filtering
      if (BYPASS_APPROVAL_FILTER) {
        console.log('🧪 BYPASS MODE: Showing all candidates without approval filtering');
        approvedCandidates = allCandidates;
      } else if (normalizedApprovedUids.length > 0) {
        // We have approved UIDs, filter the candidates
        approvedCandidates = CandidateApiService.filterApprovedCandidates(
          allCandidates,
          normalizedApprovedUids
        );
        console.log('🔍 DEBUG: Filtered to approved candidates, count:', approvedCandidates?.length || 0);
      } else {
        // No approved UIDs found - fallback to showing all candidates
        console.warn('⚠️ WARNING: No approved UIDs found – using all candidates as fallback');
        console.warn('⚠️ This might mean the approval API is not working or returning empty');
        approvedCandidates = allCandidates;
      }
      
      // Safety check: if filtering resulted in 0 but we have candidates, log warning
      if (approvedCandidates.length === 0 && allCandidates.length > 0) {
        console.warn('⚠️ WARNING: Filtering resulted in 0 candidates but backend returned', allCandidates.length);
        console.warn('⚠️ Sample candidate firebase_uid:', allCandidates[0]?.firebase_uid);
        console.warn('⚠️ Sample approved UID:', normalizedApprovedUids[0]);
        console.warn('⚠️ Type match check:', typeof allCandidates[0]?.firebase_uid, 'vs', typeof normalizedApprovedUids[0]);
        console.warn('⚠️ Check CandidateApiService.filterApprovedCandidates() implementation');
      }
      
      setCandidates(approvedCandidates);
      setSearchResults([]);
      
      // Fetch photos for visible candidates
      const photos = await CandidateApiService.fetchCandidatePhotos(approvedCandidates);
      setCandidatePhotos(photos);
    } catch (err) {
      console.error('❌ Error fetching candidates:', err);
      console.error('❌ Error stack:', err.stack);
      toast.error('Failed to load candidates. Please try again later.');
      setCandidates([]);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatSetWithBaseOptions = useCallback((set, baseOptions = []) => {
    const map = new Map();
    baseOptions.forEach((option) => {
      const key = option?.value ?? option?.label;
      if (key) {
        map.set(key, { value: option.value ?? key, label: option.label ?? key });
      }
    });
    set.forEach((value) => {
      if (!value) return;
      if (!map.has(value)) {
        map.set(value, { value, label: value });
      }
    });
    return Array.from(map.values());
  }, []);

  const initializeSetFromOptions = useCallback((options = []) => {
    const set = new Set();
    options.forEach((option) => {
      const key = option?.value ?? option?.label;
      if (key) set.add(key);
    });
    return set;
  }, []);

  const extractFilterOptions = useCallback(
    (data, baseOptions) => {
      const countrySet = new Set();
      const stateSet = new Set();
      const citySet = new Set();
      const languageSet = initializeSetFromOptions(baseOptions.languages);
      const educationSet = initializeSetFromOptions(baseOptions.education);
      const coreSubjectSet = initializeSetFromOptions(baseOptions.coreSubjects);
      const coreExpertiseSet = initializeSetFromOptions(baseOptions.coreExpertise);
      const gradeSet = initializeSetFromOptions(baseOptions.grades);
      const curriculumSet = initializeSetFromOptions(baseOptions.curriculum);
      const designationSet = initializeSetFromOptions(baseOptions.designations);

      let minExperience = Infinity;
      let maxExperience = 0;
      let minSalary = Infinity;
      let maxSalary = 0;

      data.forEach((candidate) => {
        const presentCountry = candidate.present_country_name?.trim();
        const permanentCountry = candidate.permanent_country_name?.trim();
        if (presentCountry) countrySet.add(presentCountry);
        if (permanentCountry) countrySet.add(permanentCountry);

        const presentState = candidate.present_state_name?.trim();
        const permanentState = candidate.permanent_state_name?.trim();
        if (presentState) stateSet.add(presentState);
        if (permanentState) stateSet.add(permanentState);

        const presentCity = candidate.present_city_name?.trim();
        const permanentCity = candidate.permanent_city_name?.trim();
        if (presentCity) citySet.add(presentCity);
        if (permanentCity) citySet.add(permanentCity);

        try {
          const candidateLanguages = parseLanguages(candidate.languages);
          candidateLanguages.forEach((lang) => lang && languageSet.add(lang.trim()));
        } catch (error) {
          console.error('Error parsing languages for filter options:', error);
        }

        if (candidate.education_details_json) {
          try {
            const { types } = parseEducation(candidate.education_details_json);
            types.forEach((type) => type && educationSet.add(type));
          } catch (error) {
            console.error('Error parsing education for filter options:', error);
          }
        }

        buildCandidateSubjects(candidate).forEach((subject) => coreSubjectSet.add(subject));
        buildCandidateCoreExpertise(candidate).forEach((expertise) => coreExpertiseSet.add(expertise));
        buildCandidateGrades(candidate).forEach((grade) => gradeSet.add(grade));
        buildCandidateCurriculum(candidate).forEach((curriculum) => curriculumSet.add(curriculum));
        buildCandidateDesignations(candidate).forEach((designation) => designationSet.add(designation));

        const totalExperience = parseFloat(candidate.total_experience_years);
        if (!Number.isNaN(totalExperience)) {
          minExperience = Math.min(minExperience, totalExperience);
          maxExperience = Math.max(maxExperience, totalExperience);
        }

        const salaryRange = parseSalaryRange(candidate.expected_salary);
        if (salaryRange) {
          if (salaryRange.min != null) {
            minSalary = Math.min(minSalary, salaryRange.min);
          }
          if (salaryRange.max != null) {
            maxSalary = Math.max(maxSalary, salaryRange.max);
          }
        }
      });

      const derivedExpRange =
        minExperience === Infinity
          ? [0, 30]
          : [Math.max(0, Math.floor(minExperience)), Math.max(Math.ceil(maxExperience), 0)];

      const derivedSalaryRange =
        minSalary === Infinity
          ? [0, 200000]
          : [Math.max(0, Math.floor(minSalary)), Math.max(Math.ceil(maxSalary), 0)];

      setFilterOptions((prev) => ({
        ...prev,
        countries: formatSetWithBaseOptions(countrySet),
        states: formatSetWithBaseOptions(stateSet),
        cities: formatSetWithBaseOptions(citySet),
        languages: formatSetWithBaseOptions(languageSet, baseOptions.languages),
        education: formatSetWithBaseOptions(educationSet, baseOptions.education),
        coreSubjects: formatSetWithBaseOptions(coreSubjectSet, baseOptions.coreSubjects),
        coreExpertise: formatSetWithBaseOptions(coreExpertiseSet, baseOptions.coreExpertise),
        grades: formatSetWithBaseOptions(gradeSet, baseOptions.grades),
        curriculum: formatSetWithBaseOptions(curriculumSet, baseOptions.curriculum),
        designations: formatSetWithBaseOptions(designationSet, baseOptions.designations),
        expRange: derivedExpRange,
        salRange: derivedSalaryRange
      }));
    },
    [formatSetWithBaseOptions, initializeSetFromOptions]
  );

  // Fetch user preferences
  const fetchUserPreferences = useCallback(async () => {
    try {
      const prefs = await CandidateApiService.fetchUserCandidatePreferences(user);
      setSavedCandidates(prefs.savedCandidates);
      setFavouriteCandidates(prefs.favouriteCandidates);
      setDownloadedCandidates(prefs.downloadedCandidates);
      const combinedUnlocked = new Set([
        ...getUnlockedCandidatesFromLocalStorage(),
        ...(prefs.unlockedCandidates || []).map((id) => String(id))
      ]);
      setUnlockedCandidateIds(Array.from(combinedUnlocked));
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast.warning('Could not load your saved preferences. You can still browse candidates.');
      setSavedCandidates([]);
      setFavouriteCandidates([]);
      setDownloadedCandidates([]);
      setUnlockedCandidateIds(getUnlockedCandidatesFromLocalStorage());
    }
  }, [user, getUnlockedCandidatesFromLocalStorage]);

  // Initial data fetch
  useEffect(() => {
    if (!user && !userLoading) {
      toast.error("Please log in to view candidates.");
      setLoading(false);
      return;
    }
    
    if (user) {
    fetchCandidates();
      fetchUserPreferences();
    }
  }, [user, userLoading, fetchCandidates, fetchUserPreferences]);

  useEffect(() => {
    if (candidates.length === 0) {
      setFilterOptions((prev) => ({
        ...prev,
        ...apiFilterOptions
      }));
      return;
    }

    extractFilterOptions(candidates, apiFilterOptions);
  }, [candidates, apiFilterOptions, extractFilterOptions]);

  // SEARCH functionality
  const handleSearch = useCallback((searchTerm) => {
    const normalizedTerm = (searchTerm ?? '').trim();

    if (!normalizedTerm) {
      setSearchResults([]);
      if (isSearching) {
        setIsSearching(false);
        setCurrentPage(1);
      } else {
        setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    const results = CandidateApiService.searchCandidates(candidates, normalizedTerm);
    setSearchResults(results);
    setCurrentPage(1);
  }, [candidates, isSearching]);

  // FILTER functionality
  const handleApplyFilters = useCallback((filters) => {
    // Format filters - use LABELS for location (not IDs)
    const formattedFilters = {
      ...filters,
      country: filters.country?.label,  // Use label (name) instead of value (ID)
      state: filters.state?.label,      // Use label (name) instead of value (ID)
      city: filters.city?.label || filters.city?.value,  // City uses name as value
      languages: filters.languages?.map(l => l.value) || [],
      education: filters.education?.map(e => e.value) || [],
      coreSubjects: filters.coreSubjects?.map(s => s.value) || [],
      coreExpertise: filters.coreExpertise?.map(s => s.value) || [],
      jobTypes: filters.jobTypes?.map(j => j.value) || [],
      grades: filters.grades?.map(g => g.value) || [],
      curriculum: filters.curriculum?.map(c => c.value) || [],
      designations: filters.designations?.map(d => d.value) || [],
      gender: filters.gender?.map(g => g.value) || [],
      noticePeriod: filters.noticePeriod?.map(n => n.value) || [],
      online: filters.online?.value,
      min_experience: filters.minExperienceYears?.value ?? filters.min_experience ?? null,
      max_experience: filters.maxExperienceYears?.value ?? filters.max_experience ?? null
    };

    // Check if any filters are actually applied
    const hasActiveFilters = Object.keys(formattedFilters).some(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });

    if (!hasActiveFilters) {
      setFilteredCandidatesByFilters([]);
      setActiveFilters(new Set());
      setCurrentPage(1);
      return;
    }
    
    const minSalaryFilter = parseSalaryInput(formattedFilters.min_salary);
    const maxSalaryFilter = parseSalaryInput(formattedFilters.max_salary);
    const minExperienceFilter = parseExperienceInput(formattedFilters.min_experience);
    const maxExperienceFilter = parseExperienceInput(formattedFilters.max_experience);
    
    let filtered = candidates.filter(candidate => {
      // Location filters - use PRESENT location fields (present_country_name, present_state_name, present_city_name)
      if (formattedFilters.country) {
        const candidateCountry = String(candidate.present_country_name || candidate.permanent_country_name || '').toLowerCase().trim();
        const filterCountry = String(formattedFilters.country).toLowerCase().trim();
        
        // If candidate has no country data, exclude them
        if (!candidateCountry) return false;
        // Must match exactly
        if (candidateCountry !== filterCountry) return false;
      }
      
      if (formattedFilters.state) {
        const candidateState = String(candidate.present_state_name || candidate.permanent_state_name || '').toLowerCase().trim();
        const filterState = String(formattedFilters.state).toLowerCase().trim();
        
        // If candidate has no state data, exclude them
        if (!candidateState) return false;
        // Must match exactly
        if (candidateState !== filterState) return false;
      }
      
      if (formattedFilters.city) {
        const candidateCity = String(candidate.present_city_name || candidate.permanent_city_name || '').toLowerCase().trim();
        const filterCity = String(formattedFilters.city).toLowerCase().trim();
        // If candidate has no city data, exclude them
        if (!candidateCity) return false;
        // Must match exactly
        if (candidateCity !== filterCity) return false;
      }

      // Language filter
      if (formattedFilters.languages.length > 0) {
        const candidateLanguages = parseLanguages(candidate.languages);
        const hasMatch = formattedFilters.languages.some(filterLang => {
          const filterLangLower = filterLang.toLowerCase();
          return candidateLanguages.some(candLang => {
            const candLangLower = candLang.toLowerCase();
            return candLangLower === filterLangLower || 
                   candLangLower.includes(filterLangLower) || 
                   filterLangLower.includes(candLangLower);
          });
        });
        if (!hasMatch) return false;
      }

      // Education filter
      if (formattedFilters.education.length > 0) {
        const { types } = parseEducation(candidate.education_details_json);
        const candidateTypes = types
          .map((type) => type && type.toString().trim())
          .filter(Boolean);
        if (candidateTypes.length === 0) {
          return false;
        }

        const normalizedCandidateTypes = candidateTypes.map(normalizeComparisonValue);

        const hasMatch = formattedFilters.education.some((filterEdu) => {
          const normalizedFilter = normalizeComparisonValue(filterEdu);
          if (!normalizedFilter) return false;

          return (
            normalizedCandidateTypes.some(
              (candidateValue) =>
                candidateValue === normalizedFilter ||
                candidateValue.includes(normalizedFilter) ||
                normalizedFilter.includes(candidateValue)
            ) ||
            candidateTypes.some((candidateValue) => {
              const candidateLower = candidateValue.toLowerCase();
              const filterLower = filterEdu.toLowerCase();
              return (
                candidateLower === filterLower ||
                candidateLower.includes(filterLower) ||
                filterLower.includes(candidateLower)
              );
            })
          );
        });
        if (!hasMatch) return false;
      }

      // Job Type filter
      if (formattedFilters.jobTypes.length > 0) {
        const candidateJobType = candidate.Job_Type?.trim() || '';
        const hasMatch = formattedFilters.jobTypes.some(filterJobType => {
          const normalizedFilter = filterJobType.toLowerCase().trim();
          const normalizedCandidate = candidateJobType.toLowerCase();
          return normalizedCandidate === normalizedFilter ||
                 normalizedCandidate.includes(normalizedFilter) ||
                 normalizedFilter.includes(normalizedCandidate);
        });
        if (!hasMatch) return false;
      }

      // Core subjects filter
      if (formattedFilters.coreSubjects.length > 0) {
        const candidateSubjects = buildCandidateSubjects(candidate).map(normalizeString);
        if (
          candidateSubjects.length === 0 ||
          !formattedFilters.coreSubjects.some((filterSubject) => {
            const normalizedFilter = normalizeString(filterSubject);
            return candidateSubjects.some(
              (subject) =>
                subject === normalizedFilter ||
                subject.includes(normalizedFilter) ||
                normalizedFilter.includes(subject)
            );
          })
        ) {
          return false;
        }
      }

      // Core expertise filter
      if (formattedFilters.coreExpertise.length > 0) {
        const candidateExpertise = buildCandidateCoreExpertise(candidate).map(normalizeString);
        if (
          candidateExpertise.length === 0 ||
          !formattedFilters.coreExpertise.some((filterExpertise) => {
            const normalizedFilter = normalizeString(filterExpertise);
            return candidateExpertise.some(
              (expertise) =>
                expertise === normalizedFilter ||
                expertise.includes(normalizedFilter) ||
                normalizedFilter.includes(expertise)
            );
          })
        ) {
          return false;
        }
      }

      // Grades filter
      if (formattedFilters.grades.length > 0) {
        const candidateGrades = buildCandidateGrades(candidate).map(normalizeString);
        if (
          candidateGrades.length === 0 ||
          !formattedFilters.grades.some((filterGrade) => {
            const normalizedFilter = normalizeString(filterGrade);
            return candidateGrades.some(
              (grade) =>
                grade === normalizedFilter ||
                grade.includes(normalizedFilter) ||
                normalizedFilter.includes(grade)
            );
          })
        ) {
          return false;
        }
      }

      // Curriculum filter
      if (formattedFilters.curriculum.length > 0) {
        const candidateCurriculum = buildCandidateCurriculum(candidate).map(normalizeString);
        if (
          candidateCurriculum.length === 0 ||
          !formattedFilters.curriculum.some((filterCurriculum) => {
            const normalizedFilter = normalizeString(filterCurriculum);
            return candidateCurriculum.some(
              (curriculum) =>
                curriculum === normalizedFilter ||
                curriculum.includes(normalizedFilter) ||
                normalizedFilter.includes(curriculum)
            );
          })
        ) {
          return false;
        }
      }

      // Designations filter
      if (formattedFilters.designations.length > 0) {
        const candidateDesignations = buildCandidateDesignations(candidate).map(normalizeString);
        if (
          candidateDesignations.length === 0 ||
          !formattedFilters.designations.some((filterDesignation) => {
            const normalizedFilter = normalizeString(filterDesignation);
            return candidateDesignations.some(
              (designation) =>
                designation === normalizedFilter ||
                designation.includes(normalizedFilter) ||
                normalizedFilter.includes(designation)
            );
          })
        ) {
          return false;
        }
      }

      // Gender filter
      if (formattedFilters.gender.length > 0) {
        const candidateGender = normalizeString(candidate.gender);
        if (!candidateGender) return false;
        const hasMatch = formattedFilters.gender.some(
          (filterGender) => normalizeString(filterGender) === candidateGender
        );
        if (!hasMatch) return false;
      }

      // Notice period filter
      if (formattedFilters.noticePeriod.length > 0) {
        const candidateNotice = mapNoticeValueToLabel(candidate.notice_period);
        if (!candidateNotice) return false;
        const hasMatch = formattedFilters.noticePeriod.some(
          (filterNotice) => normalizeString(filterNotice) === normalizeString(candidateNotice)
        );
        if (!hasMatch) return false;
      }

      // Online/offline availability
      if (formattedFilters.online) {
        const mode = normalizeString(formattedFilters.online);
        if (mode === 'hybrid') {
          const hasOnline = candidateHasModeAvailability(candidate, 'online');
          const hasOffline = candidateHasModeAvailability(candidate, 'offline');
          if (!hasOnline || !hasOffline) return false;
        } else if (mode === 'online') {
          if (!candidateHasModeAvailability(candidate, 'online')) return false;
        } else if (mode === 'offline') {
          if (!candidateHasModeAvailability(candidate, 'offline')) return false;
        }
      }

      // Salary range filter
      if (minSalaryFilter !== null || maxSalaryFilter !== null) {
        if (!candidateSalaryWithinRange(candidate, minSalaryFilter, maxSalaryFilter)) {
          return false;
        }
      }

      // Experience range filter
      if (minExperienceFilter !== null || maxExperienceFilter !== null) {
        const candidateExperience = getCandidateExperienceYears(candidate);
        if (candidateExperience === null) return false;
        if (minExperienceFilter !== null && candidateExperience < minExperienceFilter) return false;
        if (maxExperienceFilter !== null && candidateExperience > maxExperienceFilter) return false;
      }

      // Add more filters as needed...
      return true;
    });

    setFilteredCandidatesByFilters(filtered);
    setUserHasAppliedFilters(true); // Mark that user has explicitly applied filters
    
    const activeFilterKeys = Object.keys(formattedFilters).filter(key => {
      const value = formattedFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });
    
    setActiveFilters(new Set(activeFilterKeys));
    setCurrentPage(1);
  }, [candidates]);

  const handleResetFilters = useCallback(() => {
    setFilteredCandidatesByFilters([]);
    setActiveFilters(new Set());
    setUserHasAppliedFilters(false); // Reset the flag when filters are reset
    setCurrentPage(1);
  }, []);

  // Combine search and filter results (like AllJobs)
  const getCombinedResults = useCallback(() => {
    let baseCandidates = candidates;
    
    // Apply filters first if any are active
    if (activeFilters.size > 0) {
      baseCandidates = filteredCandidatesByFilters;
    }
    
    // Then apply search if searching
    if (isSearching) {
      // If both search and filters are active, return intersection
      if (activeFilters.size > 0) {
        return searchResults.filter(candidate => 
          filteredCandidatesByFilters.some(filteredCandidate => 
            filteredCandidate.firebase_uid === candidate.firebase_uid
          )
        );
      }
      // If only search is active, return search results
      return searchResults;
    }
    
    return baseCandidates;
  }, [candidates, activeFilters, filteredCandidatesByFilters, isSearching, searchResults]);

  const finalFilteredCandidates = getCombinedResults();

  const getCandidatePage = useCallback(
    (candidateId) => {
      if (!candidateId) return null;

      const normalizedId = String(candidateId);
      const candidateIndex = finalFilteredCandidates.findIndex(
        (candidate) => String(candidate.firebase_uid) === normalizedId
      );

      if (candidateIndex === -1) return null;

      return Math.floor(candidateIndex / candidatesPerPage) + 1;
    },
    [finalFilteredCandidates, candidatesPerPage]
  );

  // Handle save candidate - saves directly without coin deduction modal
  const handleSaveCandidate = async (candidate) => {
    if (!user) {
      toast.error("Please login to save candidates.");
      return;
    }
    
    const isSaved = savedCandidates.includes(candidate.firebase_uid);
    
    // Save directly without showing any confirmation modal
    try {
      await CandidateApiService.toggleSaveCandidate(candidate, user, !isSaved);
      await fetchUserPreferences();
      toast[isSaved ? 'info' : 'success'](
        `${candidate.fullName || candidate.name || 'Candidate'} ${
          isSaved ? 'removed from saved list!' : 'has been saved successfully!'
        }`
      );
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Failed to save candidate. Please try again.');
    }
  };

  // Handle toggle favourite
  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    if (!user) {
      toast.error("Please login to favourite candidates.");
      return;
    }
    
    // If adding to favourites, show confirmation modal first
    if (isFavourite) {
      setCandidateToFavourite({ candidateId, candidate, isFavourite });
      setShowFavouriteConfirmModal(true);
      return;
    }
    
    // If removing from favourites, proceed directly
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, isFavourite);
      await fetchUserPreferences();
      toast[isFavourite ? 'success' : 'info'](
        `${candidate.fullName || candidate.name || 'Candidate'} ${
          isFavourite ? 'added to favourites!' : 'removed from favourites!'
        }`
      );
    } catch (error) {
      console.error('Error favouriting candidate:', error);
      toast.error('Failed to update favourite status. Please try again.');
    }
  };

  // Handle confirm favourite after modal confirmation
  const handleConfirmFavourite = async () => {
    if (!candidateToFavourite || !user) {
      setShowFavouriteConfirmModal(false);
      setCandidateToFavourite(null);
      return;
    }
    
    const { candidate, isFavourite } = candidateToFavourite;
    
    try {
      await CandidateApiService.toggleFavouriteCandidate(candidate, user, true);
      await fetchUserPreferences();
      toast.success(
        `${candidate.fullName || candidate.name || 'Candidate'} added to favourites!`
      );
    } catch (error) {
      console.error('Error updating favourite:', error);
      toast.error('Failed to update favourite status. Please try again.');
    } finally {
      setShowFavouriteConfirmModal(false);
      setCandidateToFavourite(null);
    }
  };

  // Handle cancel favourite confirmation
  const handleCancelFavourite = () => {
    setShowFavouriteConfirmModal(false);
    setCandidateToFavourite(null);
  };

  // Handle view full profile
  const handleViewFull = (candidate) => {
    console.log('AllCandidates: Viewing full profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'full');
  };

  // Handle view short profile
  const handleViewShort = (candidate) => {
    console.log('AllCandidates: Viewing short profile:', candidate.firebase_uid);
    onViewCandidate && onViewCandidate(candidate, 'short');
  };

  // Handle message candidate - show modal
  const buildMessagingCandidate = useCallback(
    (candidate) => {
      if (!candidate) return null;

      return {
        firebase_uid: candidate.firebase_uid,
        id: candidate.firebase_uid,
        fullName:
          candidate.fullName ||
          candidate.name ||
          candidate?.profileData?.fullName ||
          'Candidate',
        name:
          candidate.name ||
          candidate.fullName ||
          candidate?.profileData?.fullName ||
          'Candidate',
        state:
          candidate.present_state_name ||
          candidate.state ||
          candidate.permanent_state_name ||
          null,
        city:
          candidate.present_city_name ||
          candidate.city ||
          candidate.permanent_city_name ||
          null,
        email: candidate.email || null,
        phone: candidate.callingNumber || null,
        photoUrl:
          candidatePhotos[candidate.firebase_uid] ||
          candidate.profile_picture ||
          null
      };
    },
    [candidatePhotos]
  );

  const handleMessage = (candidate) => {
    if (!candidate) return;

    const candidateId = String(candidate.firebase_uid || '');
    const isUnlocked = candidateId && unlockedCandidateIds.includes(candidateId);

    if (!isUnlocked) {
      console.log('AllCandidates: Candidate not unlocked, prompting unlock:', candidateId);
      setCandidateToUnlock(candidate);
      setShowUnlockPrompt(true);
      setUnlockError('');
      return;
    }

    console.log('AllCandidates: Messaging candidate:', candidateId);
    setCandidateToMessage({
      original: candidate,
      messaging: buildMessagingCandidate(candidate)
    });
    setShowMessageModal(true);
  };

  // Handle "Ok" button - close modal, stay on page
  const handleMessageModalOk = () => {
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  // Handle "Continue Single" button - redirect to messages
  const handleMessageModalContinue = () => {
    if (candidateToMessage?.messaging) {
      navigate('/provider/messages', { 
        state: { 
          selectedCandidate: candidateToMessage.messaging,
          startConversation: true 
        },
        replace: false
      });
    }
    setShowMessageModal(false);
    setCandidateToMessage(null);
  };

  const handleUnlockPromptClose = () => {
    setShowUnlockPrompt(false);
    setCandidateToUnlock(null);
    setUnlockError('');
    setUnlockLoading(false);
  };

  const handleUnlockForMessaging = async () => {
    if (!candidateToUnlock || !user) return;

    setUnlockLoading(true);
    setUnlockError('');

    try {
      const userId = user.firebase_uid || user.uid;
      if (!userId) {
        throw new Error('User not found');
      }

      const candidateId = String(candidateToUnlock.firebase_uid || '');
      if (!candidateId) {
        throw new Error('Candidate not found');
      }

      // Check if already unlocked
      if (unlockedCandidateIds.includes(candidateId)) {
        // Already unlocked, redirect to messages
        const messagingCandidate = buildMessagingCandidate(candidateToUnlock);
        setShowUnlockPrompt(false);
        setCandidateToUnlock(null);
        navigate('/provider/messages', {
          state: {
            selectedCandidate: messagingCandidate,
            startConversation: true
          },
          replace: false
        });
        setUnlockLoading(false);
        return;
      }

      // Get current coins
      const { data: redeemData } = await axios.get(`${REDEEM_API}?firebase_uid=${userId}`);
      const userCoinRecord = Array.isArray(redeemData) && redeemData.length > 0
        ? redeemData[0]
        : redeemData;
      
      if (!userCoinRecord) {
        throw new Error("Don't have enough coins in your account");
      }

      const coins = userCoinRecord.coin_value || 0;
      const UNLOCK_COST = 60; // 50 for profile + 10 for messaging

      if (coins < UNLOCK_COST) {
        throw new Error(`You do not have enough coins. Required: ${UNLOCK_COST}, Available: ${coins}`);
      }

      // Deduct 60 coins
      await axios.put(REDEEM_API, {
        firebase_uid: userId,
        coin_value: coins - UNLOCK_COST
      });

      // Mark candidate as unlocked
      await CandidateApiService.upsertCandidateAction(candidateToUnlock, user, {
        unlocked_candidate: 1,
        unblocked_candidate: 1
      });

      // Update local state
      const candidateIdStr = String(candidateId);
      setUnlockedCandidateIds(prev => [...prev, candidateIdStr]);
      
      // Store in localStorage
      const userIdStr = String(userId);
      const unlockKey = `unlocked_${userIdStr}_${candidateIdStr}`;
      localStorage.setItem(unlockKey, JSON.stringify({
        unlocked: true,
        timestamp: new Date().toISOString()
      }));

      // Show success message
      toast.success('Candidate unlocked successfully!');

      // Redirect to messages section
      const messagingCandidate = buildMessagingCandidate(candidateToUnlock);
      setShowUnlockPrompt(false);
      setCandidateToUnlock(null);
      setUnlockLoading(false);
      
      navigate('/provider/messages', {
        state: {
          selectedCandidate: messagingCandidate,
          startConversation: true
        },
        replace: false
      });
    } catch (error) {
      console.error('Error unlocking candidate:', error);
      setUnlockError(error.message || 'Failed to unlock candidate. Please try again.');
      setUnlockLoading(false);
    }
  };

  // Function to scroll to a specific candidate
  const scrollToCandidate = useCallback((candidateId) => {
    if (!candidateId) return;
    
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        // Add highlight effect
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  }, []);

  // Handle back from candidate view
  const handleBackFromCandidateView = useCallback(
    (candidateId) => {
      console.log('AllCandidates handleBackFromCandidateView called, candidateId:', candidateId);
      if (!candidateId) return;

      const targetPage = getCandidatePage(candidateId);
      if (targetPage) {
        if (currentPage !== targetPage) {
          setPendingScrollCandidate(String(candidateId));
          setCurrentPage(targetPage);
        } else {
          setPendingScrollCandidate(String(candidateId));
        }
      } else {
        setPendingScrollCandidate(String(candidateId));
      }
    },
    [getCandidatePage, currentPage]
  );

  // Register back handler with parent
  useEffect(() => {
    if (onBackFromCandidateView) {
      console.log('AllCandidates: Registering handleBackFromCandidateView with parent');
      onBackFromCandidateView(handleBackFromCandidateView);
    }
  }, [onBackFromCandidateView, handleBackFromCandidateView]);

  useEffect(() => {
    if (!pendingScrollCandidate) return;

    const timer = setTimeout(() => {
      scrollToCandidate(pendingScrollCandidate);
      setPendingScrollCandidate(null);
    }, 200);

    return () => clearTimeout(timer);
  }, [pendingScrollCandidate, scrollToCandidate, currentPage]);

  // Handle records per page change
  const handleRecordsPerPageChange = (newValue) => {
    setCandidatesPerPage(newValue);
    setCurrentPage(1);
  };

  // Pagination calculations
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = finalFilteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);
  const totalPages = Math.ceil(finalFilteredCandidates.length / candidatesPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-dismiss error message when user is not logged in
  useEffect(() => {
    if (!user && !userLoading) {
      const timer = setTimeout(() => {
        if (onBackToList) {
          onBackToList();
        } else {
          navigate(-1);
        }
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [user, userLoading, onBackToList, navigate]);

  // Loading state
  if (loading || userLoading) {
    return (
      <div className="py-12">
        <LoadingState
          title="Loading candidate directory…"
          subtitle="We’re assembling the candidate list so you can review them."
        />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800 text-center mb-2 text-lg sm:text-base leading-normal tracking-tight">
          Please log in to view candidates.
        </p>
        <p className="text-red-600 text-center text-lg sm:text-base leading-normal tracking-tight">
          Redirecting you back in a few seconds...
        </p>
      </div>
    );
  }

  // If viewing a candidate detail, show the detail view
  if (viewMode === 'detail' && selectedCandidate) {
    if (viewType === 'full') {
      return <CandidateDetail candidate={selectedCandidate} onBack={onBackToList} />;
    } else if (viewType === 'short') {
      return <ViewShort candidate={selectedCandidate} onBack={onBackToList} />;
    }
  }

  const totalCandidates = candidates.length;
  const visibleCandidates = finalFilteredCandidates.length;

  return (
    <div className="widget-content">
      {/* Header with title, Search, and Filter Button */}
      <div className="widget-title mb-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold bg-gradient-brand bg-clip-text text-transparent m-0 leading-tight tracking-tight">
              {isSearching
                ? `Found ${visibleCandidates.toLocaleString()} candidate${visibleCandidates === 1 ? '' : 's'}`
                : `${totalCandidates.toLocaleString()} Candidate${totalCandidates === 1 ? '' : 's'} Available`}
            </h3>
            <div className="text-lg sm:text-base text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1 leading-normal tracking-tight">
              <span>
                Showing {visibleCandidates.toLocaleString()} of {totalCandidates.toLocaleString()} candidates
              </span>
              {activeFilters.size > 0 && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-300">•</span>
                  Filters applied
                </span>
              )}
              {isSearching && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-300">•</span>
                  Search active
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 min-w-[240px]">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search candidates..."
              />
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={`w-full sm:w-auto px-4 py-2 rounded-md font-medium text-base transition-all duration-200 leading-normal tracking-tight ${
                activeFilters.size > 0
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover transition-colors'
                  : 'bg-gradient-brand text-white hover:bg-gradient-primary-hover transition-colors'
              }`}
            >
              Apply Filters {activeFilters.size > 0 && `(${activeFilters.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Records per Page */}
      <div className="candidate-listing">
        <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center gap-3 mb-3">
          <RecordsPerPageDropdown
            itemsPerPage={candidatesPerPage}
            onItemsPerPageChange={handleRecordsPerPageChange}
          />
        </div>
      </div>

      {/* Candidates List */}
      {currentCandidates.length > 0 ? (
        <div className="candidates-results">
          <div className="candidates-list">
            {currentCandidates.map((candidate) => {
              const candidateId = candidate.firebase_uid;
              const isSaved = savedCandidates.includes(candidateId);
              const isFavourite = favouriteCandidates.includes(candidateId);
              const isDownloaded = downloadedCandidates.includes(candidateId);
              
              return (
                <CandidateCard
                  key={candidateId}
                  candidate={candidate}
                  isSaved={isSaved}
                  isFavourite={isFavourite}
                  isDownloaded={isDownloaded}
                  loading={loading}
                  onViewFull={handleViewFull}
                  onViewShort={handleViewShort}
                  onSave={handleSaveCandidate}
                  onToggleFavourite={handleToggleFavourite}
                  onMessage={handleMessage}
                  candidatePhoto={candidatePhotos[candidateId]}
                />
              );
            })}
            </div>
            </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <img 
              src={noCandidateIllustration} 
              alt="No candidates" 
              className="w-64 h-64 md:w-80 md:h-80 mb-6 mx-auto"
            />
            <p className="text-gray-600 text-lg sm:text-base font-medium leading-normal tracking-tight">
              {userHasAppliedFilters && activeFilters.size > 0 && filteredCandidatesByFilters.length === 0
                ? 'No candidates match your filters. Try adjusting your selections or reset them to see more candidates.'
                : isSearching 
                ? 'No candidates found matching your search.'
                : 'No candidates available at the moment.'
              }
            </p>
          </div>
              </div>
            )}

      {/* Pagination */}
      {finalFilteredCandidates.length > candidatesPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={finalFilteredCandidates.length}
          itemsPerPage={candidatesPerPage}
          currentPageStart={indexOfFirstCandidate + 1}
          currentPageEnd={Math.min(indexOfLastCandidate, finalFilteredCandidates.length)}
        />
      )}

      {/* Filter Panel Modal */}
      <CandidateFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        activeFiltersCount={activeFilters.size}
        initialOptions={filterOptions}
        optionsLoading={filterOptionsLoading}
      />

      {/* Unlock Prompt Modal */}
      {showUnlockPrompt && candidateToUnlock && (
        <ModalPortal>
          <div 
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleUnlockPromptClose}
          >
          <div 
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all" 
              onClick={handleUnlockPromptClose}
              disabled={unlockLoading}
            >
              &times;
            </button>

            <div className="mb-6 mt-0.5 text-center">
              <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                Unlock Candidate Contact Details
              </h3>
              <p className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight mb-4">
                To start messaging {candidateToUnlock.fullName || candidateToUnlock.name || 'this candidate'}, you'll need to unlock their contact information first. <span className="font-semibold">Unlocking costs 50 coins</span> (one-time payment) and gives you full access to their profile. After unlocking, <span className="font-semibold">each message you sent costs 10 coins</span>.
              </p>

              {unlockError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-left">
                  <p className="text-red-700 text-lg sm:text-base leading-normal tracking-tight">{unlockError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
                onClick={handleUnlockPromptClose}
                disabled={unlockLoading}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
                onClick={handleUnlockForMessaging}
                disabled={unlockLoading}
              >
                {unlockLoading ? 'Unlocking...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={handleMessageModalOk}
          >
          <div 
            className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all" 
              onClick={handleMessageModalOk}
            >
              &times;
            </button>
            
            <div className="mb-4 mt-0.5">
              <h3 className="font-semibold text-xl mb-4 text-center text-gray-800 leading-tight tracking-tight">
                Message Candidate
              </h3>
              <p className="text-gray-600 text-lg sm:text-base mb-6 text-center leading-normal tracking-tight">
                If you want to send bulk message, save the candidate.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
                onClick={handleMessageModalOk}
              >
                Ok
              </button>
              <button 
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
                onClick={handleMessageModalContinue}
              >
                Continue Single
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Favourite Confirmation Modal */}
      <CandidateActionConfirmationModal
        isOpen={showFavouriteConfirmModal && !!candidateToFavourite}
        actionType="favorite"
        onConfirm={handleConfirmFavourite}
        onCancel={handleCancelFavourite}
      />

    </div>
  );
};

export default AllCandidates;