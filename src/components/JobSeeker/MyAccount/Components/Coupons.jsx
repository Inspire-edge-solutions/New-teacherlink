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
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const firebase_uid = user?.uid;

  // Check if user's profile is complete
  const checkProfileCompletion = async () => {
    try {
      const response = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal`
      );
      const personalData = await response.json();
      
      // Check if user's firebase_uid exists in the personal data
      const userProfile = Array.isArray(personalData) 
        ? personalData.find(profile => profile.firebase_uid === firebase_uid)
        : null;
      
      if (!userProfile) {
        return false; // No profile found
      }
      
          // Check for required fields (basic profile completion)
  const requiredFields = [
    'fullName',
    'email', 
    'callingNumber',
    'gender'
  ];
  
  const hasRequiredFields = requiredFields.every(field => {
    const value = userProfile[field];
    return value && value.toString().trim() !== '' && value.toString().trim() !== 'null';
  });
  
  // Profile is complete if required fields are filled (dateOfBirth is optional)
  return hasRequiredFields;
    } catch (error) {
      console.error("Error checking profile completion:", error);
      return false; // Default to incomplete if API fails
    }
  };

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

  // Handle profile completion popup
  const handleProfilePopupClose = () => {
    setShowProfilePopup(false);
    setCouponCode("");
    // Redirect to profile page
    window.location.href = "/candidates-dashboard/my-profile";
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
      const coinExpiry = couponData.coin_expiry; // Get coin_expiry from coupon data

      // CLIENT-SIDE VALIDATION: Check for negative coin values
      if (couponCoinValue <= 0) {
        toast.dismiss("coupon-process");
        toast.error("Invalid coupon: Coin value must be positive. Please contact support.");
        console.error("Negative coin value detected:", couponCoinValue);
        return;
      }

      // 2. Fetch user_type from login API
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(
          firebase_uid
        )}`
      );
      const loginData = await userRes.json();
      loginUserType = Array.isArray(loginData)
        ? loginData[0]?.user_type
        : loginData?.user_type;

      // SPECIAL HANDLING FOR 'Inaugural2025' AND 'TEACHER2025' COUPONS
      const isInaugural2025 = enteredCode.toLowerCase() === 'inaugural2025';
      const isTeacher2025 = enteredCode.toLowerCase() === 'teacher2025';
      const isSpecialCoupon = isInaugural2025 || isTeacher2025;
      
      if (!isSpecialCoupon) {
        // Only check user_type for non-special coupons
        if (!loginUserType || !couponUserType) {
          toast.dismiss("coupon-process");
          toast.error(
            "Could not verify user type for coupon. Please contact support."
          );
          return;
        }
        if (loginUserType !== couponUserType) {
          toast.dismiss("coupon-process");
          toast.error("Mismatch in the user type for this coupon.");
          return;
        }
      } else {
        // For special coupons, skip user_type validation and proceed
        if (isInaugural2025) {
          console.log("🎉 Special coupon 'Inaugural2025' detected - skipping user_type validation");
        } else if (isTeacher2025) {
          console.log("🎉 Special coupon 'TEACHER2025' detected - skipping user_type validation");
        }
      }

      // 3. Date check
      const today = new Date();
      const validFrom = new Date(couponValidFrom);
      const validTo = new Date(couponValidTo);
      if (today < validFrom) {
        toast.dismiss("coupon-process");
        toast.error(
          `Your coupon starts from ${validFrom.getFullYear()}/${String(
            validFrom.getMonth() + 1
          ).padStart(2, "0")}/${String(validFrom.getDate()).padStart(
            2,
            "0"
          )}. Please try again on that date.`
        );
        return;
      }
      if (today > validTo) {
        toast.dismiss("coupon-process");
        toast.error("Coupon code has expired.");
        return;
      }

      // 4. Check if user already used this coupon_code in /redeemGeneral
      const generalRes = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral?firebase_uid=${firebase_uid}`
      );
      const generalData = await generalRes.json();

      let alreadyUsedThisCoupon = false;
      let userGeneralRow = null;
      let alreadyHasGeneral = false;
      let prevCoinValue = 0;
      let userGeneralValidTo = null;
      let userGeneralRedeemValid = null;
      let userGeneralExpired = false;
      let userIsRefer = false;

      if (Array.isArray(generalData) && generalData.length > 0) {
        alreadyUsedThisCoupon = generalData.some(
          (row) =>
            (row.coupon_code || "").toLowerCase() === enteredCode.toLowerCase()
        );
        userGeneralRow = generalData[0];
        alreadyHasGeneral = true;
        prevCoinValue = Number(userGeneralRow.coin_value) || 0;
        userGeneralValidTo = userGeneralRow.valid_to;
        userGeneralRedeemValid = userGeneralRow.redeem_valid;
        userIsRefer = !!userGeneralRow.is_refer;
        if (userGeneralValidTo && new Date(userGeneralValidTo) < today) {
          userGeneralExpired = true;
          prevCoinValue = 0;
        }
      }

      if (alreadyUsedThisCoupon) {
        toast.dismiss("coupon-process");
        toast.error("You have already used this coupon.");
        return;
      }

      if (alreadyHasGeneral) {
        let redeemValidDate = userGeneralRedeemValid
          ? new Date(userGeneralRedeemValid)
          : null;
        let validToDate = userGeneralValidTo
          ? new Date(userGeneralValidTo)
          : null;
        if (validToDate && validToDate < today) {
          if (!redeemValidDate || redeemValidDate < today) {
            try {
              const resetResponse = await fetch(
                "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral",
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    firebase_uid,
                    coin_value: 0,
                    ...(userIsRefer ? { is_refer: 1 } : {}),
                  }),
                }
              );
              
              if (!resetResponse.ok) {
                const errorData = await resetResponse.json();
                if (resetResponse.status === 400 && errorData.message?.includes("negative")) {
                  toast.dismiss("coupon-process");
                  toast.error("Error: Invalid coin value detected. Please contact support.");
                  return;
                }
                throw new Error(`HTTP ${resetResponse.status}: ${errorData.message || 'Unknown error'}`);
              }
              
              toast.dismiss("coupon-process");
              toast.error("Your coupon is expired. Coin value reset to zero.");
              await fetchSubscription();
              setCouponCode("");
              setActiveTab("subscription-details");
              return;
            } catch (error) {
              console.error("Error resetting coin value:", error);
              toast.dismiss("coupon-process");
              toast.error("Error processing expired coupon. Please try again.");
              return;
            }
          }
        }
      }

      let popupMsg = "";
      let coinsToAdd = couponCoinValue;
      let totalCoinsToUpdate = couponCoinValue;

      const now = new Date();
      const redeem_at = now.toISOString().slice(0, 19).replace("T", " ");
      
      // Calculate redeem_valid based on coin_expiry from coupon data
      let redeemValidDays = 30; // Default 30 days if coin_expiry is not specified
      if (coinExpiry && !isNaN(coinExpiry)) {
        redeemValidDays = coinExpiry * 30; // Convert months to days (1 month = 30 days)
      }
      
      const redeem_valid = new Date(
        now.getTime() + redeemValidDays * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      let newValidToDate = new Date(couponValidTo);
      let existingValidToDate = userGeneralValidTo
        ? new Date(userGeneralValidTo)
        : null;
      let finalValidTo = couponValidTo;
      if (
        existingValidToDate &&
        existingValidToDate > newValidToDate
      ) {
        finalValidTo = existingValidToDate
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
      } else {
        finalValidTo = newValidToDate
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
      }

      let coinsForWhatsapp = couponCoinValue;
      
      // STANDARDIZED API ENDPOINT: Use consistent endpoint for all operations
      const REDEEM_GENERAL_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral";
      const REDEEM_UNIQUE_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemUnique";
      const REDEEM_SAME_API = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemSame";

      if (couponFeature === "Unique") {
        if (alreadyHasGeneral && !userGeneralExpired) {
          toast.dismiss("coupon-process");
          toast.error(
            "You already have a coupon applied. Unique coupons are for one-time use per user."
          );
          return;
        } else {
          try {
            // Update redeemGeneral
            const generalResponse = await fetch(REDEEM_GENERAL_API, {
              method: alreadyHasGeneral ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: couponCoinValue,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!generalResponse.ok) {
              const errorData = await generalResponse.json();
              if (generalResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${generalResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // Update redeemUnique
            const uniqueResponse = await fetch(REDEEM_UNIQUE_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: couponCoinValue,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!uniqueResponse.ok) {
              const errorData = await uniqueResponse.json();
              if (uniqueResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${uniqueResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // --- Add coin history here ---
            await addCoinHistoryEntry(couponCoinValue);

            popupMsg = `Congrats!! You get ${couponCoinValue} coins!!`;
          } catch (error) {
            console.error("Error processing Unique coupon:", error);
            toast.dismiss("coupon-process");
            toast.error("Error processing coupon. Please try again.");
            return;
          }
        }
      } else if (couponFeature === "Same") {
        if (alreadyHasGeneral && !userGeneralExpired) {
          coinsToAdd = couponCoinValue;
          totalCoinsToUpdate = prevCoinValue + coinsToAdd;

          // VALIDATION: Ensure total coins don't become negative
          if (totalCoinsToUpdate < 0) {
            toast.dismiss("coupon-process");
            toast.error("Error: Total coin value cannot be negative. Please contact support.");
            return;
          }

          try {
            // Update redeemGeneral
            const generalResponse = await fetch(REDEEM_GENERAL_API, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: totalCoinsToUpdate,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!generalResponse.ok) {
              const errorData = await generalResponse.json();
              if (generalResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${generalResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // Update redeemSame
            const sameResponse = await fetch(REDEEM_SAME_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: couponCoinValue,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!sameResponse.ok) {
              const errorData = await sameResponse.json();
              if (sameResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${sameResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // --- Add coin history here ---
            await addCoinHistoryEntry(coinsToAdd);

            coinsForWhatsapp = coinsToAdd;
            popupMsg = `Congrats! You get ${coinsToAdd} coins, now you have ${totalCoinsToUpdate} coins!!`;
          } catch (error) {
            console.error("Error processing Same coupon:", error);
            toast.dismiss("coupon-process");
            toast.error("Error processing coupon. Please try again.");
            return;
          }
        } else {
          try {
            // Update redeemGeneral
            const generalResponse = await fetch(REDEEM_GENERAL_API, {
              method: alreadyHasGeneral ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: couponCoinValue,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!generalResponse.ok) {
              const errorData = await generalResponse.json();
              if (generalResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${generalResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // Update redeemSame
            const sameResponse = await fetch(REDEEM_SAME_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firebase_uid,
                coupon_code: enteredCode,
                coin_value: couponCoinValue,
                valid_from: couponValidFrom,
                valid_to: finalValidTo,
                is_coupon: 1,
                redeem_at,
                redeem_valid,
                ...(userIsRefer ? { is_refer: 1 } : {}),
              }),
            });

            if (!sameResponse.ok) {
              const errorData = await sameResponse.json();
              if (sameResponse.status === 400 && errorData.message?.includes("negative")) {
                toast.dismiss("coupon-process");
                toast.error("Error: Invalid coin value detected. Please contact support.");
                return;
              }
              throw new Error(`HTTP ${sameResponse.status}: ${errorData.message || 'Unknown error'}`);
            }

            // --- Add coin history here ---
            await addCoinHistoryEntry(couponCoinValue);

            popupMsg = `Congrats!! You get ${couponCoinValue} coins!!`;
          } catch (error) {
            console.error("Error processing Same coupon:", error);
            toast.dismiss("coupon-process");
            toast.error("Error processing coupon. Please try again.");
            return;
          }
        }
      } else {
        // Handle all other coupon features (including Inaugural2025, TEACHER2025 and any future special coupons)
        console.log(`🎉 Processing special coupon feature: ${couponFeature}`);
        
        // For special coupons like Inaugural2025 and TEACHER2025, always store in redeemGeneral
        // and check for duplicates to prevent multiple redemptions
        if (alreadyUsedThisCoupon) {
          toast.dismiss("coupon-process");
          toast.error("You have already used this coupon.");
          return;
        }
        
        try {
          // Update redeemGeneral for special coupons
          const generalResponse = await fetch(REDEEM_GENERAL_API, {
            method: alreadyHasGeneral ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firebase_uid,
              coupon_code: enteredCode,
              coin_value: couponCoinValue,
              valid_from: couponValidFrom,
              valid_to: finalValidTo,
              is_coupon: 1,
              redeem_at,
              redeem_valid,
              ...(userIsRefer ? { is_refer: 1 } : {}),
            }),
          });

          if (!generalResponse.ok) {
            const errorData = await generalResponse.json();
            if (generalResponse.status === 400 && errorData.message?.includes("negative")) {
              toast.dismiss("coupon-process");
              toast.error("Error: Invalid coin value detected. Please contact support.");
              return;
            }
            throw new Error(`HTTP ${generalResponse.status}: ${errorData.message || 'Unknown error'}`);
          }

          // --- Add coin history here ---
          await addCoinHistoryEntry(couponCoinValue);

          popupMsg = `Congrats!! You get ${couponCoinValue} coins!!`;
        } catch (error) {
          console.error(`Error processing ${couponFeature} coupon:`, error);
          toast.dismiss("coupon-process");
          toast.error("Error processing coupon. Please try again.");
          return;
        }
      }

      // RCS send after success
      await sendRcsCouponMessage(coinsForWhatsapp);

      toast.dismiss("coupon-process");
      setCouponCode("");
      await fetchSubscription();
      setActiveTab("subscription-details");
      toast.success(popupMsg);
      setTimeout(() => {
        window.location.href = "/seeker/dashboard";
      }, 1200);
    } catch (err) {
      toast.dismiss("coupon-process");
      toast.error("Error processing coupon. Please try again later.");
      console.error("Coupon redeem error:", err);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    const enteredCode = couponCode.trim();
    if (!enteredCode) {
      toast.error("Please enter a coupon code");
      return;
    }
    toast.dismiss();

    // First check if profile is complete
    const isProfileComplete = await checkProfileCompletion();
    
    if (!isProfileComplete) {
      setShowProfilePopup(true);
      return;
    }

    // Check if coins are blocked before proceeding
    const isBlocked = await checkCoinBlockStatus();
    
    if (isBlocked) {
      setPendingCouponCode(enteredCode);
      setShowBlockedPopup(true);
      return;
    }

    // If not blocked, proceed normally
    processCouponCode(enteredCode);
  };

  return (
    <div className="w-full">
      {/* Profile Completion Popup */}
      {showProfilePopup && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4" onClick={handleProfilePopupClose}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
              onClick={handleProfilePopupClose}
            >
              &times;
            </button>
            <div className="bg-orange-500 text-white p-3 sm:p-4 rounded-t-xl sm:rounded-t-2xl -m-4 sm:-m-6 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <h3 className="text-base sm:text-lg font-semibold m-0">📝 Complete Your Profile First</h3>
            </div>
            <div className="mb-4 sm:mb-6">
              <p className="mb-3 sm:mb-4 text-gray-700 leading-relaxed text-sm sm:text-base">
                We noticed that your profile is not complete. To redeem coupons and access our services, 
                please complete your profile information first.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                <strong>Please go to your profile section and fill in all required information.</strong>
              </p>
            </div>
            <div className="text-center">
              <button 
                className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
                onClick={handleProfilePopupClose}
              >
                OK, I'll Complete My Profile
              </button>
            </div>
          </div>
        </div>, document.body
      )}

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
                We recommend using your existing coins first before redeeming additional coupons.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                <strong>Would you like to proceed with the coupon redemption anyway?</strong>
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

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Apply Coupon Code</h3>
          <p className="text-gray-600 text-sm sm:text-base">Enter your coupon code to get access to our Basic Plan</p>
        </div>
        
        <form onSubmit={handleCouponSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="Enter coupon code here"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
            />
            <button 
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover duration-200 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
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