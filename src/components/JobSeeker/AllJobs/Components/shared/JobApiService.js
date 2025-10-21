import { toast } from "react-toastify";

// API Endpoints
const API_ENDPOINTS = {
  FAV_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteJobs",
  JOBS_API: "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes",
  APPLY_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/applyCandidate",
  REDEEM_API: "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral",
  PERSONAL_API: "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal",
  LOGIN_API: "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login",
  ORG_API: "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation",
  WHATSAPP_API: "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/whatsapp",
  RCS_API: "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage",
  COIN_HISTORY_API: "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history",
  EDUCATION_API: "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/educationDetails",
  JOB_PREFERENCE_API: "https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPreference",
  PROFILE_APPROVED_API: "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved",
  PRESENT_ADDRESS_API: "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress"
};

// Utility function to get user ID
const getUserId = (user) => {
  return user?.firebase_uid || user?.uid || user?.id;
};

// Utility function to get job ID
const getJobId = (job) => Number(job.id);

// Utility function to sort jobs by recency
const sortJobsByRecency = (jobs) => {
  return [...jobs].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA;
  });
};

// Format phone number correctly with +91 prefix
const formatPhone = (phone) => {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, ""); // remove hidden chars
  if (!clean.startsWith("+")) clean = `+91${clean}`;
  return clean;
};

class JobApiService {
  // Fetch all jobs
  static async fetchJobs() {
    try {
      const response = await fetch(API_ENDPOINTS.JOBS_API);
      const data = await response.json();
      return sortJobsByRecency(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error("Could not load job list. Please refresh.");
      return [];
    }
  }

  // Fetch user's saved, favourite, and applied jobs
  static async fetchUserJobPreferences(user) {
    if (!user) {
      return {
        savedJobs: [],
        favouriteJobs: [],
        appliedJobs: []
      };
    }

    try {
      const userId = getUserId(user);
      const [favRes, applyRes] = await Promise.all([
        fetch(API_ENDPOINTS.FAV_API),
        fetch(`${API_ENDPOINTS.APPLY_API}?user_id=${userId}`)
      ]);

      const favData = await favRes.json();
      const applyData = await applyRes.json();

      const userRows = Array.isArray(favData)
        ? favData.filter(row => String(row.added_by) === String(userId))
        : [];

      const savedJobs = userRows
        .filter(j => j.saved_jobs === 1 || j.saved_jobs === true)
        .map(j => Number(j.id));

      const favouriteJobs = userRows
        .filter(j => j.favroute_jobs === 1 || j.favroute_jobs === true)
        .map(j => Number(j.id));

      const appliedJobs = Array.isArray(applyData)
        ? applyData.filter(j => j.is_applied === 1).map(j => Number(j.job_id))
        : [];

      return { savedJobs, favouriteJobs, appliedJobs };
    } catch (error) {
      console.error('Error fetching user job preferences:', error);
      toast.error("Could not load your job preferences. Please refresh.");
      return {
        savedJobs: [],
        favouriteJobs: [],
        appliedJobs: []
      };
    }
  }

  // Get user's coin balance
  static async getUserCoins(user) {
    try {
      const response = await fetch(API_ENDPOINTS.REDEEM_API);
      const data = await response.json();
      const found = Array.isArray(data)
        ? data.find(d => d.firebase_uid === getUserId(user))
        : null;
      return found?.coin_value ?? 0;
    } catch (error) {
      console.error('Error fetching user coins:', error);
      return 0;
    }
  }

  // Get user's personal details
  static async getUserPersonalDetails(user) {
    try {
      const response = await fetch(`${API_ENDPOINTS.PERSONAL_API}?firebase_uid=${getUserId(user)}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching user personal details:', error);
      return null;
    }
  }

  // Check if user has already applied for a job
  static async checkIfApplied(job, user) {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.APPLY_API}?job_id=${job.id}&user_id=${getUserId(user)}`
      );
      const data = await response.json();
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.error('Error checking if applied:', error);
      return false;
    }
  }

  // Apply for a job
  static async applyForJob(job, user, coinCost = 100) {
    const userId = getUserId(user);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // 1. Check coins
      const coins = await this.getUserCoins(user);
      if (coins < coinCost) {
        throw new Error(`You do not have enough coins to apply for this job. Required: ${coinCost}, Available: ${coins}`);
      }

      // 2. Check if already applied
      const alreadyApplied = await this.checkIfApplied(job, user);
      if (alreadyApplied) {
        return { status: "already", message: "You have already applied for this job." };
      }

      // 3. Get personal details
      const personalDetails = await this.getUserPersonalDetails(user);
      const fullName = personalDetails?.fullName || "Candidate";

      // 4. Deduct coins
      await fetch(API_ENDPOINTS.REDEEM_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: userId,
          coin_value: coins - coinCost
        })
      });

      // 5. Store application
      await fetch(API_ENDPOINTS.APPLY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(job.id),
          firebase_uid: userId,
          user_id: userId,
          job_firebase_uid: job.firebase_uid,
          job_name: job.job_title,
          fullName: fullName,
          is_applied: 1
        })
      });

      return { status: "success", message: "Successfully applied for the job!" };
    } catch (error) {
      console.error('Error applying for job:', error);
      return { status: "error", message: error.message || "Could not apply for this job." };
    }
  }

  // Save or unsave a job
  static async toggleSaveJob(job, user, isSaved) {
    return this.upsertJobAction(job, user, { saved_jobs: isSaved });
  }

  // Favourite or unfavourite a job
  static async toggleFavouriteJob(job, user, isFavourite) {
    return this.upsertJobAction(job, user, { favroute_jobs: isFavourite });
  }

  // Upsert job action (save/favourite)
  static async upsertJobAction(job, user, { favroute_jobs, saved_jobs }) {
    if (!user) {
      throw new Error("Please login to perform this action.");
    }

    try {
      const jobId = getJobId(job);
      const userId = getUserId(user);

      // Check if preference exists
      const res = await fetch(API_ENDPOINTS.FAV_API);
      const data = await res.json();
      const existingPref = Array.isArray(data) 
        ? data.find(r => Number(r.id) === jobId && String(r.added_by) === String(userId))
        : null;

      const payload = {
        id: jobId,
        firebase_uid: job.firebase_uid,
        job_name: job.job_title,
        added_by: userId,
        favroute_jobs: favroute_jobs ? 1 : 0,
        saved_jobs: saved_jobs ? 1 : 0
      };

      const response = await fetch(API_ENDPOINTS.FAV_API, {
        method: existingPref ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update job preference');
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating job preference:', error);
      throw new Error("Could not update job preference. Please try again.");
    }
  }

  // Send WhatsApp notification to institution
  static async sendWhatsAppToInstitution(job, user) {
    try {
      const userId = getUserId(user);
      const [personalRes, orgRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.PERSONAL_API}?firebase_uid=${userId}`),
        fetch(`${API_ENDPOINTS.ORG_API}?firebase_uid=${job.firebase_uid}`)
      ]);

      const [personalData, orgData] = await Promise.all([
        personalRes.json(),
        orgRes.json()
      ]);

      const personal = Array.isArray(personalData) ? personalData[0] : {};
      const org = Array.isArray(orgData) ? orgData[0] : {};

      const phone = formatPhone(org.phone);
      const userName = personal.fullName || "Candidate";
      const orgName = org.organization_name || job.institute_name || "Institution";

      if (!phone) {
        console.log('No phone number found for institution');
        return;
      }

      await fetch(API_ENDPOINTS.WHATSAPP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          template: 'applied_institution',
          userName,
          orgName,
          jobTitle: job.job_title
        })
      });

      // Also send RCS if available
      await fetch(API_ENDPOINTS.RCS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          template: 'applied_institution',
          userName,
          orgName,
          jobTitle: job.job_title
        })
      });
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      toast.error("Failed to send WhatsApp notification.");
    }
  }

  // Record coin history
  static async recordCoinHistory(job, user, coinCost, candidateId) {
    try {
      await fetch(API_ENDPOINTS.COIN_HISTORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          firebase_uid: getUserId(user),
          coin_value: -coinCost,
          description: `Applied for job: ${job.job_title}`,
          job_id: job.id
        })
      });
    } catch (error) {
      console.error('Error recording coin history:', error);
    }
  }
}

export default JobApiService;
