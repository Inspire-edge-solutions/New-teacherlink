/**
 * Utility function to check if a user is blocked
 * Can be used during login and auto-login (onAuthStateChanged)
 */

const PERSONAL_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
const ORG_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const BLOCK_REASON_API = "https://ripiv6jfrc.execute-api.ap-south-1.amazonaws.com/dev/block_reason";

/**
 * Get block reason from API
 */
const getBlockReason = async (firebase_uid) => {
  try {
    const response = await fetch(BLOCK_REASON_API);
    if (response.ok) {
      const blockReasons = await response.json();
      const userBlockReason = blockReasons.find(
        (item) => item.firebase_uid === firebase_uid
      );
      
      if (userBlockReason) {
        if (userBlockReason.other_reason) {
          return `Your candidate profile has been blocked.\n\nFor details, contact us at info@inspireedgesolutions.com \nor \ncall ‪+91 9980333603‬.`;
        } else if (userBlockReason.reason) {
          return `This account has been blocked due to a violation of our platform policies.\n\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed.`;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching block reason:", error);
  }
  return null;
};

/**
 * Check if a user is blocked (candidate or organization)
 * @param {string} firebase_uid - Firebase user ID
 * @param {string} email - User email (optional, used for organization check)
 * @returns {Promise<{isBlocked: boolean, reason: string|null}>}
 */
export const checkIfBlocked = async (firebase_uid, email = null) => {
  // 1. Check candidate details
  const personalURL = `${PERSONAL_API}?firebase_uid=${encodeURIComponent(firebase_uid)}`;
  try {
    const pRes = await fetch(personalURL);
    if (pRes.ok) {
      const arr = await pRes.json();
      if (Array.isArray(arr) && arr.length > 0) {
        const userData = arr[0];
        if (userData.isBlocked === 1 || userData.isBlocked === "1") {
          const blockReason = await getBlockReason(firebase_uid);
          return {
            isBlocked: true,
            reason: blockReason || "This account has been blocked due to a violation of our platform policies.\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed."
          };
        }
      }
    }
  } catch (error) {
    console.error("Error checking personal details:", error);
  }

  // 2. Check institution details by email or firebase_uid
  let orgUrl = ORG_API;
  if (firebase_uid) {
    orgUrl += `?firebase_uid=${encodeURIComponent(firebase_uid)}`;
  } else if (email) {
    orgUrl += `?contact_person_email=${encodeURIComponent(email)}`;
  }
  
  try {
    const oRes = await fetch(orgUrl);
    if (oRes.ok) {
      const arr = await oRes.json();
      if (Array.isArray(arr) && arr.length > 0) {
        // check all orgs (could be multiple)
        const org = arr.find(
          (o) => o.isBlocked === 1 || o.isBlocked === "1"
        );
        if (org) {
          const blockReason = await getBlockReason(firebase_uid);
          return {
            isBlocked: true,
            reason: blockReason || "This account has been blocked due to a violation of our platform policies.\nThe reported issue has been recorded, and further activity from this account is restricted until reviewed."
          };
        }
      }
    }
  } catch (error) {
    console.error("Error checking organisation details:", error);
  }
  
  // Not blocked in either table
  return { isBlocked: false, reason: null };
};

