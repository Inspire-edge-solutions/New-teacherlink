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
  REDEEM_API: "https://mgwnmhp62h.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral",
  WHATSAPP_API: "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp",
  UNLOCK_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/unlockCandidate"
};

// Utility function to get user ID
const getUserId = (user) => {
  return user?.firebase_uid || user?.uid || user?.id;
};

// Utility function to get candidate ID
const getCandidateId = (candidate) => {
  return candidate?.firebase_uid || candidate?.uid;
};

class CandidateApiService {
  // Fetch all candidates (basic profiles)
  static async fetchCandidates() {
    try {
      const { data } = await axios.get(API_ENDPOINTS.CANDIDATES_API);
      const checkRes = data[0];
      return checkRes || [];
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error("Could not load candidate list. Please refresh.");
      return [];
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
      const { data } = await axios.get(API_ENDPOINTS.FAV_API);
      
      const userRows = Array.isArray(data)
        ? data.filter(row => String(row.added_by) === String(userId))
        : [];

      const savedCandidates = userRows
        .filter(c => c.saved_candidate === 1 || c.saved_candidate === true)
        .map(c => c.firebase_uid);

      const favouriteCandidates = userRows
        .filter(c => c.favroute_candidate === 1 || c.favroute_candidate === true)
        .map(c => c.firebase_uid);

      const downloadedCandidates = userRows
        .filter(c => c.dowloaded_candidate === 1 || c.dowloaded_candidate === true)
        .map(c => c.firebase_uid);

      const unlockedCandidates = userRows
        .filter(c => c.unlocked_candidate === 1 || c.unlocked_candidate === true)
        .map(c => c.firebase_uid);

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
      const { data } = await axios.get(
        `${API_ENDPOINTS.REDEEM_API}?firebase_uid=${userId}`
      );
      
      if (Array.isArray(data) && data.length > 0 && data[0].coin_value) {
        return Number(data[0].coin_value) || 0;
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
        ? allFeatures.find(row => row.firebase_uid === candidateId && row.added_by === userId)
        : null;

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
      await this.upsertCandidateAction(candidate, user, { unlocked_candidate: 1 });

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
}

export default CandidateApiService;

