import React, { useState } from "react";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import ReactDOM from 'react-dom';

const Coupons = ({
  user,
  fetchSubscription,
  setActiveTab,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [pendingCouponCode, setPendingCouponCode] = useState("");
  const firebase_uid = user?.uid;

  // Check if user's coins are blocked
  const checkCoinBlockStatus = async () => {
    try {
      const response = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/blockCoins`
      );
      const blockData = await response.json();
      
      // Find the user's record in the block data
      const userBlockRecord = Array.isArray(blockData) 
        ? blockData.find(record => record.firebase_uid === firebase_uid)
        : null;
      
      return userBlockRecord?.coinBlocked === 1;
    } catch (error) {
      console.error("Error checking coin block status:", error);
      return false; // Default to not blocked if API fails
    }
  };

  // Handle proceed with coupon despite blocked coins
  const handleProceedWithBlockedCoins = () => {
    setShowBlockedPopup(false);
    if (pendingCouponCode) {
      processCouponCode(pendingCouponCode);
    }
  };

  // Handle cancel coupon due to blocked coins
  const handleCancelCoupon = () => {
    setShowBlockedPopup(false);
    setPendingCouponCode("");
    toast.info("Coupon redemption cancelled. Please use your existing coins first.");
  };


  // Helper: send RCS coupon message
  const sendRcsCouponMessage = async (coinValue) => {
    try {
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const users = await userRes.json();
      const userObj = Array.isArray(users)
        ? users.find((u) => (u.firebase_uid || u.uid) === firebase_uid)
        : null;
      if (!userObj) return;

      const contactId = (userObj.phone_number || "")
        .replace(/[^0-9]/g, "")
        .slice(-10);

      const sent_by = userObj.name || "User";
      const sent_email = userObj.email || "";
      const templateName =
        userObj.user_type === "candidate"
          ? "coupon_candidate"
          : "coupon_institute";

      const payload = {
        contactId,
        templateName,
        customParam: {
          CUSTOM_PARAM: `${coinValue}`,
        },
        sent_by,
        sent_email,
      };

      await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } catch (err) {
      console.error("Error sending RCS coupon message:", err);
    }
  };

  // Helper: add to coin_history
  const addCoinHistoryEntry = async (coinValue) => {
    try {
      // VALIDATION: Ensure coin value is positive before adding to history
      if (!coinValue || coinValue <= 0) {
        console.error("Invalid coin value for history:", coinValue);
        return;
      }

      // Prepare payload
      const payload = {
        firebase_uid,
        candidate_id: null,
        job_id: null,
        coin_value: coinValue,
        reduction: null,
        reason: "Coupon code applied",
      };
      
      const response = await fetch(
        "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error adding coin history:", errorData);
        // Don't throw error here as it's not critical for coupon processing
      }
    } catch (err) {
      console.error("Error adding coin history:", err);
      // Don't throw error here as it's not critical for coupon processing
    }
  };

  // Separate function to process coupon code
  const processCouponCode = async (enteredCode) => {
    let couponData = null;
    let loginUserType = null;
    let couponUserType = null;
    let couponFeature = null;
    let couponValidFrom = null;
    let couponValidTo = null;
    let couponCoinValue = null;

    try {
      toast.info("Processing coupon...", {
        autoClose: false,
        toastId: "coupon-process",
      });

      // 1. Get coupon details
      const couponRes = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/generateCoupon`
      );
      const allCoupons = await couponRes.json();
      couponData = Array.isArray(allCoupons)
        ? allCoupons.find(
            (c) =>
              (c.coupon_code || "").toLowerCase() ===
              enteredCode.toLowerCase()
          )
        : null;

      if (!couponData) {
        toast.dismiss("coupon-process");
        toast.error("Invalid coupon code. Please try again.");
        return;
      }

      couponUserType = couponData.user_type;
      couponFeature = couponData.coupon_feature;
      couponValidFrom = couponData.valid_from;
      couponValidTo = couponData.valid_to;
      couponCoinValue = Number(couponData.coin_value);

      // 2. Get user type from login API
      const loginRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const loginUsers = await loginRes.json();
      const loginUser = Array.isArray(loginUsers)
        ? loginUsers.find((u) => (u.firebase_uid || u.uid) === firebase_uid)
        : null;
      if (!loginUser) {
        toast.dismiss("coupon-process");
        toast.error("User not found.");
        return;
      }
      loginUserType = (loginUser.user_type || "").toLowerCase();

      // 3. Validate user type
      const couponUserTypeLower = (couponUserType || "").toLowerCase();
      if (couponUserTypeLower !== loginUserType) {
        toast.dismiss("coupon-process");
        toast.error("This coupon is not valid for your user type.");
        return;
      }

      // 4. Check if coupon is already used
      const redeemRes = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const redeemRows = await redeemRes.json();
      if (Array.isArray(redeemRows) && redeemRows.length > 0) {
        const existingRecord = redeemRows[0];
        if (existingRecord.coupon_code === enteredCode) {
          toast.dismiss("coupon-process");
          toast.warning("You have already used this coupon code.");
          return;
        }
      }

      // 5. Validate coupon dates
      const now = new Date();
      const validFromDate = new Date(couponValidFrom.replace(" ", "T"));
      const validToDate = new Date(couponValidTo.replace(" ", "T"));
      if (now < validFromDate || now > validToDate) {
        toast.dismiss("coupon-process");
        toast.error("This coupon is not valid at this time.");
        return;
      }

      // 6. Get existing coin value
      let existingCoinValue = 0;
      let existingValidTo = null;
      let existingRecord = null;
      if (Array.isArray(redeemRows) && redeemRows.length > 0) {
        existingRecord = redeemRows[0];
        existingCoinValue = Number(existingRecord.coin_value || 0);
        existingValidTo = existingRecord.valid_to
          ? new Date(existingRecord.valid_to.replace(" ", "T"))
          : null;
      }

      // 7. Calculate new coin value and validity
      const newCoinValue = existingCoinValue + couponCoinValue;
      let newValidTo = validToDate;
      if (existingValidTo && existingValidTo > validToDate) {
        newValidTo = existingValidTo;
      }

      // 8. Prepare payload for redeemGeneral
      const redeemPayload = {
        firebase_uid,
        coupon_code: enteredCode,
        coin_value: newCoinValue,
        valid_from: couponValidFrom,
        valid_to: newValidTo.toISOString().slice(0, 19).replace("T", " "),
        redeem_at: now.toISOString().slice(0, 19).replace("T", " "),
        redeem_valid: couponValidTo,
        is_coupon: 1,
        is_refer: existingRecord?.is_refer || 0,
        is_razor_pay: existingRecord?.is_razor_pay || 0,
        sended_by: "",
        sended_email: "",
      };

      // 9. Update redeemGeneral
      const method = existingRecord ? "PUT" : "POST";
      const redeemUpdateRes = await fetch(
        "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral",
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(redeemPayload),
        }
      );

      if (!redeemUpdateRes.ok) {
        throw new Error("Failed to update redeemGeneral");
      }

      // 10. Add to coin_history
      await addCoinHistoryEntry(couponCoinValue);

      // 11. Send RCS message
      await sendRcsCouponMessage(couponCoinValue);

      toast.dismiss("coupon-process");
      toast.success(`Coupon applied successfully! You received ${couponCoinValue} coins.`);
      
      setCouponCode("");
      setPendingCouponCode("");
      
      if (fetchSubscription) fetchSubscription();
      if (setActiveTab) setActiveTab("payment");
    } catch (err) {
      toast.dismiss("coupon-process");
      toast.error("Error applying coupon. Please try again.");
      console.error("Coupon error:", err);
    }
  };

  // Main handler for coupon submission
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    if (!firebase_uid) {
      toast.error("User not logged in!");
      return;
    }

    // Check if coins are blocked before proceeding
    const isBlocked = await checkCoinBlockStatus();
    
    if (isBlocked) {
      setPendingCouponCode(couponCode);
      setShowBlockedPopup(true);
      return;
    }

    // If not blocked, proceed normally
    processCouponCode(couponCode);
  };

  return (
    <div className="w-full">
      {/* Blocked Coins Popup */}
      {showBlockedPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4" onClick={handleCancelCoupon}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
              onClick={handleCancelCoupon}
            >
              &times;
            </button>
            <div className="bg-yellow-500 text-gray-800 p-3 sm:p-4 rounded-t-xl sm:rounded-t-2xl -m-4 sm:-m-6 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <h3 className="text-base sm:text-lg font-semibold m-0">⚠️ Coins Already Available</h3>
            </div>
            <div className="mb-4 sm:mb-6">
              <p className="mb-3 sm:mb-4 text-gray-700 leading-relaxed text-sm sm:text-base">
                You already have coins in your account that are currently blocked from use.
                We recommend using your existing coins first before redeeming a coupon.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                <strong>Would you like to proceed with the coupon anyway?</strong>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                className="bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
                onClick={handleCancelCoupon}
              >
                Use Existing Coins
              </button>
              <button
                className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
                onClick={handleProceedWithBlockedCoins}
              >
                Proceed with Coupon
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Coupon Form */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Redeem Coupon Code</h3>
          <p className="text-gray-600 text-sm sm:text-base">Enter your coupon code to receive coins and benefits</p>
        </div>

        <form onSubmit={handleApplyCoupon} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
              required
            />
            <button
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 font-medium text-sm sm:text-base whitespace-nowrap"
            >
              Apply Coupon
            </button>
          </div>
        </form>

        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">How to use:</h4>
          <ul className="text-gray-600 space-y-1 text-xs sm:text-sm">
            <li>• Enter your coupon code in the field above</li>
            <li>• Click "Apply Coupon" to redeem</li>
            <li>• Coins will be added to your account instantly</li>
            <li>• Each coupon can only be used once</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

Coupons.propTypes = {
  user: PropTypes.object,
  fetchSubscription: PropTypes.func,
  setActiveTab: PropTypes.func,
};

export default Coupons;