import { toast } from "react-toastify";
import axios from "axios";
import { parseLanguages, parseEducation } from '../utils/candidateUtils';

// API Endpoints
const API_ENDPOINTS = {
  CANDIDATES_API: "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/change",
  FULL_API: "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi",
  FAV_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser",
  PROFILE_APPROVED_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved",
  IMAGE_API_URL: "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image",
  REDEEM_API: "https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem",
  WHATSAPP_API: "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp",
  UNLOCK_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/unlockCandidate",
  APPLIED_CANDIDATES_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate",
  LOGIN_API: "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login"
};

// Utility function to get user ID
const getUserId = (user) => {
  return user?.firebase_uid || user?.uid || user?.id;
};

// Utility function to get candidate ID
const getCandidateId = (candidate) => {
  return candidate?.firebase_uid || candidate?.uid;
};

const buildSupplementalRecord = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null;
  const uid = getCandidateId(candidate);
  if (!uid) return null;

  return {
    id: uid,
    languages:
      candidate.languages ??
      candidate.language ??
      candidate.spoken_languages ??
      candidate.preferred_languages ??
      null,
    education_details_json:
      candidate.education_details_json ??
      candidate.education_details ??
      candidate.education ??
      null,
    teaching_subjects: candidate.teaching_subjects ?? null,
    teaching_administrative_subjects: candidate.teaching_administrative_subjects ?? null,
    subjects_taught: candidate.subjects_taught ?? null,
    teaching_coreExpertise:
      candidate.teaching_coreExpertise ??
      candidate.teaching_core_expertise ??
      candidate.core_expertise ??
      null,
    teaching_administrative_coreExpertise:
      candidate.teaching_administrative_coreExpertise ??
      candidate.teaching_administrative_core_expertise ??
      null,
    core_subjects: candidate.core_subjects ?? candidate.coreSubjects ?? null,
    teaching_grades: candidate.teaching_grades ?? null,
    teaching_administrative_grades: candidate.teaching_administrative_grades ?? null,
    grades_taught: candidate.grades_taught ?? null,
    teaching_curriculum: candidate.teaching_curriculum ?? null,
    administrative_curriculum: candidate.administrative_curriculum ?? null,
    teaching_administrative_curriculum: candidate.teaching_administrative_curriculum ?? null,
    curriculum_taught: candidate.curriculum_taught ?? null,
    teaching_designations: candidate.teaching_designations ?? null,
    administrative_designations: candidate.administrative_designations ?? null,
    teaching_administrative_designations: candidate.teaching_administrative_designations ?? null,
    designation: candidate.designation ?? null,
    dateOfBirth: candidate.dateOfBirth ?? candidate.date_of_birth ?? candidate.dob ?? candidate.birthDate ?? null,
    gender: candidate.gender ?? null,
    preferable_timings: candidate.preferable_timings ?? candidate.timing_preference ?? null,
    expected_salary: candidate.expected_salary ?? candidate.salary_expectation ?? null,
    total_experience_years:
      candidate.total_experience_years ??
      candidate.total_experience ??
      candidate.overall_experience ??
      null,
    total_experience_months: candidate.total_experience_months ?? null,
    teaching_experience_years: candidate.teaching_experience_years ?? null,
    teaching_experience_months: candidate.teaching_experience_months ?? null,
    other_teaching_experience: candidate.other_teaching_experience ?? null,
    job_shift_preference: candidate.job_shift_preference ?? candidate.shift_preference ?? null,
    job_search_status: candidate.job_search_status ?? candidate.current_job_search_status ?? null,
    notice_period: candidate.notice_period ?? candidate.noticeperiod ?? null,
    tuition_preferences: candidate.tuition_preferences ?? candidate.tuition_preference ?? null,
    online_tuition: candidate.online_tuition ?? candidate.online_tutoring ?? null,
    offline_tuition: candidate.offline_tuition ?? candidate.offline_tutoring ?? null,
    hybrid_tuition: candidate.hybrid_tuition ?? null,
    preferred_modes: candidate.preferred_modes ?? null
  };
};

class CandidateApiService {
  // Fetch all candidates (basic profiles)
  static async fetchCandidates() {
    try {
      const [{ data }, supplementalMap] = await Promise.all([
        axios.get(API_ENDPOINTS.CANDIDATES_API),
        this.fetchSupplementalCandidateMap()
      ]);

      console.log('🔍 fetchCandidates: Raw API response type:', typeof data);
      console.log('🔍 fetchCandidates: Is array?', Array.isArray(data));
      console.log('🔍 fetchCandidates: Data sample:', Array.isArray(data) ? data.slice(0, 2) : data);

      // Handle different API response formats
      let candidateList = [];
      
      if (Array.isArray(data)) {
        // If data is directly an array of candidates
        candidateList = data;
      } else if (data && typeof data === 'object') {
        // If data is an object, check for common patterns
        if (Array.isArray(data.body)) {
          // API Gateway format with body
          candidateList = data.body;
        } else if (Array.isArray(data.data)) {
          // Nested data property
          candidateList = data.data;
        } else if (Array.isArray(data.candidates)) {
          // Candidates property
          candidateList = data.candidates;
        } else if (data[0] && Array.isArray(data[0])) {
          // First element is an array
          candidateList = data[0];
        } else {
          // Try to parse as single candidate wrapped in array
          candidateList = [data];
        }
      }

      console.log('🔍 fetchCandidates: Parsed candidateList length:', candidateList.length);
      console.log('🔍 fetchCandidates: First candidate sample:', candidateList[0]);

      if (!Array.isArray(candidateList) || candidateList.length === 0) {
        console.warn('⚠️ fetchCandidates: No candidates found in response');
        return [];
      }

      const merged = candidateList.map((candidate) => {
        const uid = getCandidateId(candidate);
        const supplemental = uid ? supplementalMap.get(uid) : null;
        if (!supplemental) return candidate;
        const { id, ...rest } = supplemental;
        return {
          ...candidate,
          ...rest
        };
      });

      console.log('✅ fetchCandidates: Merged candidates count:', merged.length);

      const uniqueEducationTypes = new Set();
      merged.slice(0, 200).forEach((candidate) => {
        const { types } = parseEducation(candidate.education_details_json);
        types.forEach((type) => {
          if (type) {
            uniqueEducationTypes.add(type.toString().trim());
          }
        });
      });
      console.log('[CandidateApiService] sample education types:', Array.from(uniqueEducationTypes));

      return merged;
    } catch (error) {
      console.error('❌ Error fetching candidates:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      toast.error("Could not load candidate list. Please refresh.");
      return [];
    }
  }

  static async fetchSupplementalCandidateMap() {
    try {
      const { data } = await axios.get(API_ENDPOINTS.FULL_API);
      const candidates = Array.isArray(data) ? data : [];
      const map = new Map();

      candidates.forEach((candidate) => {
        const sanitized = buildSupplementalRecord(candidate);
        if (sanitized) {
          map.set(sanitized.id, sanitized);
        }
      });

      return map;
    } catch (error) {
      console.warn('Unable to fetch supplemental candidate data:', error);
      return new Map();
    }
  }

  // Fetch full candidate profiles
  static async fetchFullCandidates() {
    try {
      const { data } = await axios.get(API_ENDPOINTS.FULL_API);
      return data || [];
    } catch (error) {
      console.error('Error fetching full candidates:', error);
      toast.error("Could not load full candidate profiles. Please refresh.");
      return [];
    }
  }

  // Fetch approved candidates only
  static async fetchApprovedCandidates() {
    try {
      const { data } = await axios.get(API_ENDPOINTS.PROFILE_APPROVED_API);
      const approved = Array.isArray(data)
        ? data.filter(candidate => candidate.isApproved === 1).map(candidate => candidate.firebase_uid)
        : [];
      return approved;
    } catch (error) {
      console.error('Error fetching approved candidates:', error);
      return [];
    }
  }

  // Fetch user's candidate preferences (saved, favourite, downloaded, unlocked)
  static async fetchUserCandidatePreferences(user) {
    if (!user) {
      return {
        savedCandidates: [],
        favouriteCandidates: [],
        downloadedCandidates: [],
        unlockedCandidates: []
      };
    }

    try {
      const userId = getUserId(user);
      console.log('🔑 fetchUserCandidatePreferences: Current user ID:', userId);
      console.log('🔑 fetchUserCandidatePreferences: User object:', { firebase_uid: user?.firebase_uid, uid: user?.uid, id: user?.id });
      
      const { data } = await axios.get(API_ENDPOINTS.FAV_API);
      
      console.log('📥 fetchUserCandidatePreferences: Total rows from API:', data?.length || 0);
      console.log('📥 fetchUserCandidatePreferences: Sample API rows (first 5):', Array.isArray(data) ? data.slice(0, 5).map(r => ({
        firebase_uid: r.firebase_uid,
        added_by: r.added_by,
        favroute_candidate: r.favroute_candidate,
        saved_candidate: r.saved_candidate
      })) : 'Not an array');
      
      const userRows = Array.isArray(data)
        ? data.filter(row => {
            const rowAddedBy = String(row.added_by || '');
            const currentUserId = String(userId || '');
            const matches = rowAddedBy === currentUserId;
            return matches;
          })
        : [];

      console.log('📥 fetchUserCandidatePreferences: User rows count:', userRows.length);
      console.log('📥 fetchUserCandidatePreferences: Sample user rows:', userRows.slice(0, 5).map(r => ({
        firebase_uid: r.firebase_uid,
        added_by: r.added_by,
        favroute_candidate: r.favroute_candidate,
        saved_candidate: r.saved_candidate
      })));

      const savedCandidates = userRows
        .filter(c => c.saved_candidate === 1 || c.saved_candidate === true)
        .map(c => String(c.firebase_uid || ''))
        .filter(Boolean);

      const favouriteCandidates = userRows
        .filter(c => {
          const isFav = c.favroute_candidate === 1 || c.favroute_candidate === true;
          return isFav;
        })
        .map(c => String(c.firebase_uid || ''))
        .filter(Boolean);
      
      console.log('📥 fetchUserCandidatePreferences: Favourite candidates count:', favouriteCandidates.length);
      console.log('📥 fetchUserCandidatePreferences: Favourite candidates IDs:', favouriteCandidates);

      const downloadedCandidates = userRows
        .filter(c => c.dowloaded_candidate === 1 || c.dowloaded_candidate === true)
        .map(c => String(c.firebase_uid || ''))
        .filter(Boolean);

      const unlockedCandidates = userRows
        .filter(c => 
          c.unlocked_candidate === 1 ||
          c.unlocked_candidate === true ||
          c.unblocked_candidate === 1 ||
          c.unblocked_candidate === true
        )
        .map(c => String(c.firebase_uid || ''))
        .filter(Boolean);

      return { 
        savedCandidates, 
        favouriteCandidates, 
        downloadedCandidates,
        unlockedCandidates 
      };
    } catch (error) {
      console.error('Error fetching user candidate preferences:', error);
      toast.error("Could not load your candidate preferences. Please refresh.");
      return {
        savedCandidates: [],
        favouriteCandidates: [],
        downloadedCandidates: [],
        unlockedCandidates: []
      };
    }
  }

  // Get user's coin balance
  static async getUserCoins(user) {
    try {
      const userId = getUserId(user);
      let data;

      try {
        const response = await axios.get(
          `${API_ENDPOINTS.REDEEM_API}?firebase_uid=${userId}`
        );
        data = response.data;
      } catch (directQueryError) {
        console.warn('Direct redeem lookup failed, attempting full fetch.', directQueryError);
      }

      if (!Array.isArray(data) || data.length === 0) {
        try {
          const fallbackResponse = await axios.get(API_ENDPOINTS.REDEEM_API);
          if (Array.isArray(fallbackResponse.data)) {
            data = fallbackResponse.data.filter(
              (record) => String(record.firebase_uid) === String(userId)
            );
          } else if (fallbackResponse.data && fallbackResponse.data.firebase_uid) {
            data = [fallbackResponse.data];
          }
        } catch (fallbackError) {
          console.error('Fallback redeem lookup failed:', fallbackError);
          data = [];
        }
      }

      if (Array.isArray(data) && data.length > 0 && data[0].coin_value !== undefined) {
        return Number(data[0].coin_value) || 0;
      }

      if (data && data.coin_value !== undefined) {
        return Number(data.coin_value) || 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching user coins:', error);
      return 0;
    }
  }

  // Check if user can view contact details (has enough coins)
  static async canViewContactDetails(user, requiredCoins = 20) {
    try {
      const coins = await this.getUserCoins(user);
      return coins > requiredCoins;
    } catch (error) {
      console.error('Error checking contact details permission:', error);
      return false;
    }
  }

  // Fetch candidate photo
  static async fetchCandidatePhoto(candidateUid) {
    try {
      const params = { firebase_uid: candidateUid, action: "view" };
      const { data } = await axios.get(API_ENDPOINTS.IMAGE_API_URL, { params });
      return data?.url || null;
    } catch (error) {
      console.error(`Error fetching photo for candidate ${candidateUid}:`, error);
      return null;
    }
  }

  // Fetch multiple candidate photos in batch
  static async fetchCandidatePhotos(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return {};

    const photoPromises = candidates.map(async (candidate) => {
      const uid = getCandidateId(candidate);
      if (!uid) return null;
      
      const url = await this.fetchCandidatePhoto(uid);
      return url ? { id: uid, url } : null;
    });

    const results = await Promise.allSettled(photoPromises);
    const photoMap = {};
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        photoMap[result.value.id] = result.value.url;
      }
    });

    return photoMap;
  }

  // Save or unsave a candidate
  static async toggleSaveCandidate(candidate, user, isSaved) {
    return this.upsertCandidateAction(candidate, user, { saved_candidate: isSaved ? 1 : 0 });
  }

  // Favourite or unfavourite a candidate
  static async toggleFavouriteCandidate(candidate, user, isFavourite) {
    return this.upsertCandidateAction(candidate, user, { favroute_candidate: isFavourite ? 1 : 0 });
  }

  // Update applied candidate status for a specific application
  static async updateAppliedCandidateStatus(candidate, status) {
    if (!candidate) {
      throw new Error("Invalid candidate payload.");
    }

    const candidateId = getCandidateId(candidate) || candidate.user_id;
    if (!candidateId || !candidate.job_id) {
      throw new Error("Missing candidate identifier for status update.");
    }

    // id is required for PUT requests to identify which record to update
    if (!candidate.id) {
      throw new Error("Missing record ID. Cannot update status without database record ID.");
    }

    try {
      const payload = {
        id: candidate.id, // REQUIRED: Database record ID to identify which record to update
        job_id: candidate.job_id,
        user_id: candidateId,
        firebase_uid: candidateId,
        status: status, // Update the status field in applyJobs table
        application_status: status, // Also update application_status for backward compatibility
        is_applied: candidate.is_applied !== undefined ? candidate.is_applied : 1
      };
      
      await axios.put(API_ENDPOINTS.APPLIED_CANDIDATES_API, payload);
      return { success: true };
    } catch (error) {
      console.error("Error updating candidate status:", error);
      throw new Error("Failed to update status. Please try again.");
    }
  }

  // Mark candidate as downloaded
  static async markCandidateDownloaded(candidate, user) {
    return this.upsertCandidateAction(candidate, user, { dowloaded_candidate: 1 });
  }

  // Upsert candidate action (save/favourite/download)
  static async upsertCandidateAction(candidate, user, updatePayload) {
    if (!user) {
      throw new Error("Please login to perform this action.");
    }

    try {
      const candidateId = getCandidateId(candidate);
      const userId = getUserId(user);

      // Check if preference exists for this (candidate, user) pair
      const { data: allFeatures } = await axios.get(API_ENDPOINTS.FAV_API);
      const existing = Array.isArray(allFeatures)
        ? allFeatures.find(row => 
            String(row.firebase_uid || '') === String(candidateId || '') && 
            String(row.added_by || '') === String(userId || '')
          )
        : null;
      
      console.log('💾 upsertCandidateAction: Saving favourite', {
        candidateId: String(candidateId || ''),
        userId: String(userId || ''),
        isFavourite: updatePayload.favroute_candidate === 1,
        existing: !!existing
      });

      const payload = {
        firebase_uid: candidateId,
        added_by: userId,
        ...updatePayload
      };

      if (existing) {
        // Update existing preference (only for this user)
        await axios.put(API_ENDPOINTS.FAV_API, payload);
      } else if (Object.values(updatePayload).some(val => val === 1)) {
        // Only create if marking as true (never create for unmark)
        await axios.post(API_ENDPOINTS.FAV_API, payload);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating candidate preference:', error);
      throw new Error("Could not update candidate preference. Please try again.");
    }
  }

  // Unlock candidate profile (deduct coins)
  static async unlockCandidate(candidate, user, coinCost = 5) {
    const userId = getUserId(user);
    const candidateId = getCandidateId(candidate);

    if (!userId || !candidateId) {
      throw new Error("Invalid user or candidate data");
    }

    try {
      // 1. Check coins
      const coins = await this.getUserCoins(user);
      if (coins < coinCost) {
        throw new Error(`You do not have enough coins to unlock this profile. Required: ${coinCost}, Available: ${coins}`);
      }

      // 2. Check if already unlocked
      const { unlockedCandidates } = await this.fetchUserCandidatePreferences(user);
      if (unlockedCandidates.includes(candidateId)) {
        return { status: "already", message: "You have already unlocked this candidate." };
      }

      // 3. Deduct coins
      const { data: redeemData } = await axios.get(API_ENDPOINTS.REDEEM_API);
      const userCoinRecord = Array.isArray(redeemData)
        ? redeemData.find(d => d.firebase_uid === userId)
        : null;

      if (userCoinRecord) {
        await axios.put(API_ENDPOINTS.REDEEM_API, {
          firebase_uid: userId,
          coin_value: coins - coinCost
        });
      }

      // 4. Mark as unlocked
      await this.upsertCandidateAction(candidate, user, { 
        unlocked_candidate: 1,
        unblocked_candidate: 1
      });

      return { status: "success", message: "Successfully unlocked candidate profile!" };
    } catch (error) {
      console.error('Error unlocking candidate:', error);
      return { status: "error", message: error.message || "Could not unlock candidate profile." };
    }
  }

  // Expose parsing utilities as static methods for backward compatibility
  static parseLanguages = parseLanguages;
  static parseEducation = parseEducation;

  // Search candidates by term
  static searchCandidates(candidates, searchTerm) {
    if (!searchTerm || !Array.isArray(candidates)) return candidates;

    const term = searchTerm.toLowerCase().trim();
    
    return candidates.filter(candidate => {
      // Search in name
      if (candidate.fullName?.toLowerCase().includes(term)) return true;
      if (candidate.name?.toLowerCase().includes(term)) return true;
      
      // Search in designation
      if (candidate.designation?.toLowerCase().includes(term)) return true;
      
      // Search in location
      if (candidate.permanent_city_name?.toLowerCase().includes(term)) return true;
      if (candidate.permanent_state_name?.toLowerCase().includes(term)) return true;
      if (candidate.present_city_name?.toLowerCase().includes(term)) return true;
      if (candidate.present_state_name?.toLowerCase().includes(term)) return true;
      
      // Search in job type
      if (candidate.Job_Type?.toLowerCase().includes(term)) return true;
      
      // Search in education
      if (candidate.education_details_json?.toLowerCase().includes(term)) return true;
      
      // Search in languages
      if (candidate.languages?.toString().toLowerCase().includes(term)) return true;
      
      return false;
    });
  }

  // Filter candidates by approved status
  static filterApprovedCandidates(candidates, approvedUids) {
    if (!Array.isArray(approvedUids) || approvedUids.length === 0) return [];
    return candidates.filter(c => approvedUids.includes(getCandidateId(c)));
  }

  // Send WhatsApp notification to candidate
  static async sendWhatsAppToCandidate(candidate, message) {
    try {
      // Implementation for WhatsApp notification to candidate
      await axios.post(API_ENDPOINTS.WHATSAPP_API, {
        firebase_uid: getCandidateId(candidate),
        message: message
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Fetch applied candidates for a specific employer
  static async fetchAppliedCandidates(user) {
    if (!user) {
      return [];
    }

    try {
      const userId = getUserId(user);
      
      // First, fetch the employer's jobs to get their job_ids
      // This is more reliable than relying on firebase_uid in the applyCandidate response
      let userJobIds = [];
      try {
        const jobsResponse = await axios.get(
          `https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes?firebase_uid=${userId}`
        );
        if (jobsResponse.status === 200 && Array.isArray(jobsResponse.data)) {
          userJobIds = jobsResponse.data
            .filter(job => 
              String(job.firebase_uid) === String(userId) || 
              String(job.user_id) === String(userId) ||
              String(job.posted_by) === String(userId)
            )
            .map(job => job.id)
            .filter(id => id != null);
        }
      } catch (jobsError) {
        console.error('Error fetching user jobs:', jobsError);
        // Fallback to firebase_uid matching if jobs API fails
      }
      
      // Fetch applied candidates and full candidate profiles in parallel
      const [appliedResponse, profilesResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.APPLIED_CANDIDATES_API),
        axios.get(API_ENDPOINTS.FULL_API)
      ]);

      if (appliedResponse.status === 200 && Array.isArray(appliedResponse.data)) {
        // Filter candidates who applied to jobs posted by current employer
        // Method 1: Filter by job_id if we have the user's job IDs
        // Method 2: Fallback to firebase_uid matching (old method)
        let employerCandidates = [];
        
        if (userJobIds.length > 0) {
          // Filter by job_id - more reliable
          employerCandidates = appliedResponse.data.filter(
            candidate => userJobIds.includes(candidate.job_id)
          );
        } else {
          // Fallback: Filter by firebase_uid (old method)
          employerCandidates = appliedResponse.data.filter(
            candidate => String(candidate.firebase_uid) === String(userId)
          );
        }

        // Create a map of candidate profiles for quick lookup
        const profilesMap = new Map();
        if (profilesResponse.status === 200 && Array.isArray(profilesResponse.data)) {
          profilesResponse.data.forEach(profile => {
            profilesMap.set(profile.firebase_uid, profile);
          });
        }

        // Enrich applied candidates with profile data
        // Keep ALL applications separate (same candidate can apply to multiple jobs)
        const enrichedCandidates = employerCandidates.map(appliedCandidate => {
          const profile = profilesMap.get(appliedCandidate.user_id);
          
          // Create a unique identifier for this application (job_id + user_id combination)
          const applicationId = `${appliedCandidate.job_id}_${appliedCandidate.user_id}`;
          
          // Merge applied candidate data with profile data
          // IMPORTANT: appliedCandidate.user_id is the candidate who applied
          // appliedCandidate.firebase_uid is the employer who posted the job
          const candidateUserId = appliedCandidate.user_id; // This is the candidate's ID
          
          // Determine the name - prioritize appliedCandidate.fullName from API
          const candidateName = appliedCandidate.fullName || appliedCandidate.name || profile?.name || profile?.fullName || 'Unknown Candidate';
          
          const enriched = {
            ...(profile || {}),
            // Override with correct candidate ID (must come after profile spread to ensure it's not overridden)
            firebase_uid: candidateUserId, // Candidate's ID for photo fetching and other operations
            user_id: candidateUserId, // Also store as user_id for clarity
            // Keep application-specific data
            id: appliedCandidate.id, // IMPORTANT: Preserve the database ID for updates
            job_id: appliedCandidate.job_id,
            job_name: appliedCandidate.job_name,
            applied_at: appliedCandidate.applied_at,
            is_applied: appliedCandidate.is_applied,
            application_status: appliedCandidate.status || appliedCandidate.application_status,
            status: appliedCandidate.status || appliedCandidate.application_status,
            // Create unique ID for this application entry
            applicationId: applicationId,
            // Use appliedCandidate.fullName first (from API), then profile, then fallback
            fullName: candidateName,
            name: candidateName
          };

          return enriched;
        });

        // Sort by application date (most recent first)
        const sortedCandidates = enrichedCandidates.sort(
          (a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0)
        );

        return sortedCandidates;
      }

      return [];
    } catch (error) {
      console.error('Error fetching applied candidates:', error);
      toast.error("Could not load applied candidates. Please refresh.");
      return [];
    }
  }

  static async fetchUserLoginDetails(firebaseUid) {
    if (!firebaseUid) return null;

    try {
      const response = await axios.get(`${API_ENDPOINTS.LOGIN_API}?firebase_uid=${firebaseUid}`);
      const data = response.data;

      if (Array.isArray(data)) {
        const directMatch = data.find((item) => String(item.firebase_uid) === String(firebaseUid));
        return directMatch || data[0] || null;
      }

      if (data && data.firebase_uid) {
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user login details:', error);

      try {
        const fallback = await axios.get(API_ENDPOINTS.LOGIN_API);
        if (Array.isArray(fallback.data)) {
          return (
            fallback.data.find((item) => String(item.firebase_uid) === String(firebaseUid)) || null
          );
        }
      } catch (fallbackError) {
        console.error('Fallback login fetch failed:', fallbackError);
      }

      return null;
    }
  }

  static async updateUserCoins(user, newCoinValue) {
    try {
      const userId = getUserId(user);
      if (!userId) throw new Error('Invalid user id for coin update');

      await axios.put(API_ENDPOINTS.REDEEM_API, {
        firebase_uid: userId,
        coin_value: newCoinValue
      });

      return true;
    } catch (error) {
      console.error('Error updating user coins:', error);
      throw error;
    }
  }
}

export default CandidateApiService;
