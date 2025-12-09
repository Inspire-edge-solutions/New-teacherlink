import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import ReactDOM from 'react-dom';
import { Skeleton } from "@mui/material";

const Payment = ({ user, onSuccess }) => {
  const firebase_uid = user?.uid;

  // Popup state for blocked coins
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [selectedPlanForPopup, setSelectedPlanForPopup] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  

  // Employer subscription plans
  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      coins: 4000,
      originalPrice: 4000,
      discountedPrice: 3000,
      features: [
        "Access to Basic candidates",
        "4000 Coins Balance",
        "1 Year Validity",
        "Email Support"
      ]
    },
    {
      id: "standard",
      name: "Standard Plan",
      coins: 8000,
      originalPrice: 8000,
      discountedPrice: 6000,
      features: [
        "Access to Standard candidates",
        "8000 Coins Balance",
        "1 Year Validity",
        "Priority Support"
      ]
    },
    {
      id: "premium",
      name: "Premium Plan",
      coins: 12000,
      originalPrice: 12000,
      discountedPrice: 9000,
      features: [
        "Access to Premium candidates",
        "12000 Coins Balance",
        "1 Year Validity",
        "Premium Support"
      ]
    }
  ];

  // Helper: Get auth token
  const getAuthToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Helper: Prepare headers for authenticated API calls
  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return { "Content-Type": "application/json" };
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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

  // Load Razorpay script once on mount
  useEffect(() => {
    if (window.Razorpay) {
      setPlansLoading(false);
      return; // already loaded
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setPlansLoading(false);
    };
    script.onerror = () => {
      toast.error("Failed to load payment system. Please refresh.");
      setPlansLoading(false);
    };
    document.body.appendChild(script);
  }, []);

  // Handle proceed with payment despite blocked coins
  const handleProceedWithBlockedCoins = () => {
    setShowBlockedPopup(false);
    setSelectedPlanForPopup(null);
    if (selectedPlanForPopup) {
      proceedWithPayment(selectedPlanForPopup);
    }
  };

  // Handle cancel payment due to blocked coins
  const handleCancelPayment = () => {
    setShowBlockedPopup(false);
    setSelectedPlanForPopup(null);
    toast.info("Payment cancelled. Please use your existing coins first.");
  };


  // Main purchase function with plan parameter
  const handlePurchase = async (selectedPlan) => {
    if (!firebase_uid) {
      toast.error("User not logged in!");
      return;
    }

    // Check if coins are blocked before proceeding
    const isBlocked = await checkCoinBlockStatus();

    if (isBlocked) {
      setSelectedPlanForPopup(selectedPlan);
      setShowBlockedPopup(true);
      return;
    }

    // If not blocked, proceed normally
    proceedWithPayment(selectedPlan);
  };

  // Separate function to handle the actual payment process
  const proceedWithPayment = async (selectedPlan) => {
    if (!window.Razorpay) {
      toast.info("Loading payment system, please wait...");
      setTimeout(() => proceedWithPayment(selectedPlan), 800);
      return;
    }

    toast.dismiss();
    toast.info("Preparing payment...", { toastId: "pay-prepare", autoClose: false });

    try {
      // 1. Fetch user details from login API
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const userData = await userRes.json();

      let userName = "";
      let userNumber = "";

      if (Array.isArray(userData) && userData.length > 0) {
        userName = userData[0]?.name || "";
        userNumber = userData[0]?.phone_number || "";
      } else if (userData?.name) {
        userName = userData.name;
        userNumber = userData.phone_number || "";
      }

      // 2. Create order on backend (₹1 = 100 paise)
      const res = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            firebase_uid,
            amount: selectedPlan.discountedPrice, // Amount in rupees
            currency: "INR",
            receipt: `${selectedPlan.id}_employer_${Date.now()}`,
            name: userName,
            number: userNumber,
          }),
        }
      );

      const order = await res.json();

      if (!order.id) {
        toast.dismiss("pay-prepare");
        toast.error("Failed to create order. Please try again.");
        return;
      }

      // 3. Setup Razorpay checkout options
      const options = {
        key: "rzp_live_93pNpUOJq57lgB", // Your live key
        amount: order.amount,
        currency: order.currency,
        name: selectedPlan.name,
        description: `TeacherLink ${selectedPlan.name} - Job Provider`,
        order_id: order.id,
        handler: async function (response) {
          toast.dismiss("pay-prepare");
          toast.info("Processing payment...", { toastId: "pay-done", autoClose: false });

          try {
            // 4. Update payment status on backend after success
            const putRes = await fetch(
              "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
              {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  status: "paid",
                  payment_data: response,
                  firebase_uid,
                }),
              }
            );

            if (!putRes.ok) throw new Error("Failed to update payment status");

            // 5. After successful payment update, call redeemGeneral API to add/update coins
            const now = new Date();
            const validFrom = now.toISOString().slice(0, 10);
            const validTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10);

            // Fetch current coin_value from coinRedeem to add coins
            const redeemRes = await fetch(
              `https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem?firebase_uid=${firebase_uid}`
            );
            const redeemData = await redeemRes.json();

            let currentCoins = 0;
            if (Array.isArray(redeemData) && redeemData.length > 0) {
              currentCoins = Number(redeemData[0].coin_value) || 0;
            }

            const newCoinValue = currentCoins + selectedPlan.coins;

            // Prepare payload for PUT to redeemGeneral
            const redeemPayload = {
              firebase_uid,
              coupon_code: "",
              coin_value: newCoinValue,
              valid_from: validFrom + "T00:00:00.000Z",
              valid_to: validTo + "T00:00:00.000Z",
              redeem_at: validFrom + "T00:00:00.000Z",
              redeem_valid: validTo + "T00:00:00.000Z",
              is_coupon: 0,
              is_refer: 0,
              is_razor_pay: 1,
              sended_by: "",
              sended_email: "",
            };

            // Update coinRedeem with new coin value and validity
            const redeemUpdateRes = await fetch(
              "https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem",
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(redeemPayload),
              }
            );

            // Add coin history entry after successful coin update
            if (redeemUpdateRes.ok) {
              try {
                // Get candidate_id (organization id for employers)
                let loginRes = await fetch('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login');
                let loginData = await loginRes.json();
                let userLogin = loginData.find(u => u.firebase_uid === firebase_uid);
                let candidate_id = null;
                
                if (userLogin?.user_type === "Employer") {
                  let orgRes = await fetch('https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation');
                  let orgData = await orgRes.json();
                  let foundOrg = orgData.find(o => o.firebase_uid === firebase_uid);
                  candidate_id = foundOrg?.id;
                }

                // Create coin history entry
                const coinHistoryPayload = {
                  firebase_uid: firebase_uid,
                  candidate_id: candidate_id,
                  job_id: null,
                  coin_value: selectedPlan.coins,
                  reduction: null,
                  reason: `Payment via ${selectedPlan.name}`,
                  payment_id: response.razorpay_payment_id || null,
                };

                const historyResponse = await fetch(
                  "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history",
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(coinHistoryPayload)
                  }
                );

                if (!historyResponse.ok) {
                  console.error('Failed to record coin history for payment');
                } else {
                  console.log('Coin history recorded successfully for payment');
                }
              } catch (historyError) {
                console.error('Error recording coin history for payment:', historyError);
                // Don't fail the payment process if history recording fails
              }
            }

            toast.dismiss("pay-done");

            if (redeemUpdateRes.ok) {
              toast.success(`Payment successful! ${selectedPlan.name} activated with ${selectedPlan.coins} coins.`);
              if (onSuccess) onSuccess();
              window.location.href = "/provider/dashboard";
            } else {
              toast.error("Payment recorded but failed to update coins. Contact support.");
            }
          } catch (err) {
            toast.dismiss("pay-done");
            toast.error("Payment captured, but could not update status or coins. Contact support.");
            console.error(err);
          }
        },
        prefill: {
          name: userName,
          email: user?.email || "",
          contact: userNumber,
        },
        theme: { color: "#3399cc" },
        modal: {
          ondismiss: function () {
            toast.dismiss("pay-prepare");
            toast.info("Payment window closed.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.dismiss("pay-prepare");
      toast.error("Error starting payment. Please try again.");
      console.error("Payment error:", err);
    }
  };

  return (
    <div className="w-full">
      {/* Loading Skeleton for Plans */}
      {plansLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-2 sm:px-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white shadow-lg overflow-hidden" style={{ borderRadius: '20px 4px 20px 4px', padding: '24px' }}>
              <Skeleton variant="rectangular" width="40%" height={30} sx={{ borderRadius: 2, mb: 2 }} />
              <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
              <div className="space-y-2 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} variant="text" width="100%" height={20} />
                ))}
              </div>
              <Skeleton variant="rectangular" width="100%" height={45} sx={{ borderRadius: 2 }} />
            </div>
          ))}
        </div>
      )}
      
      {/* Blocked Coins Popup */}
      {showBlockedPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4" onClick={handleCancelPayment}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
              onClick={handleCancelPayment}
            >
              &times;
            </button>
            <div className="bg-yellow-500 text-gray-800 p-3 sm:p-4 rounded-t-xl sm:rounded-t-2xl -m-4 sm:-m-6 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <h3 className="text-xl font-semibold m-0 leading-tight tracking-tight">⚠️ Coins Already Available</h3>
            </div>
            <div className="mb-4 sm:mb-6">
              <p className="mb-3 sm:mb-4 text-gray-700 leading-normal tracking-tight text-base">
                You already have coins in your account that are currently blocked from use.
                We recommend using your existing coins first before purchasing additional ones.
              </p>
              <p className="text-gray-700 leading-normal tracking-tight text-base">
                <strong>Would you like to proceed with the payment anyway?</strong>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                className="bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-base leading-normal tracking-tight"
                onClick={handleCancelPayment}
              >
                Use Existing Coins
              </button>
              <button
                className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-base leading-normal tracking-tight"
                onClick={handleProceedWithBlockedCoins}
              >
                Proceed with Payment
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Subscription Plans Grid */}
      {!plansLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-2 sm:px-0">
          {plans.map((plan) => (
          <div key={plan.id} className="bg-white shadow-lg overflow-hidden relative" style={{ borderRadius: '20px 4px 20px 4px' }}>
            {/* Plan Name Badge */}
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
              <div 
                className="px-3 sm:px-4 py-1 sm:py-2"
                style={{ 
                  backgroundColor: '#FFD3D6',
                  borderRadius: '20px 4px 20px 4px',
                }}
              >
                <span className="text-gray-800 font-bold text-base leading-normal tracking-tight">{plan.name}</span>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 pt-12 sm:pt-16">
              {/* Price Section */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="text-xl font-semibold text-gray-800 mb-1 leading-tight tracking-tight">
                  ₹{plan.discountedPrice}
                </div>
                <div className="text-gray-500 text-base leading-normal tracking-tight">/ per year</div>
                {plan.originalPrice > plan.discountedPrice && (
                  <div className="mt-1 sm:mt-2">
                    <span className="text-gray-500 text-base leading-normal tracking-tight">Originally </span>
                    <span className="text-red-500 line-through text-base leading-normal tracking-tight">₹{plan.originalPrice}</span>
                  </div>
                )}
              </div>
              
              {/* Features Section */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3 sm:mb-4 leading-tight tracking-tight">Features</h4>
                <ul className="space-y-2 sm:space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-base">✓</span>
                      </div>
                      <span className="text-gray-700 text-base leading-normal tracking-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Choose Plan Button */}
              <button 
                className="w-full bg-gradient-brand text-white py-2 sm:py-3 rounded-lg font-medium hover:bg-gradient-primary-hover duration-200 transition-colors shadow-lg text-base leading-normal tracking-tight"
                onClick={() => handlePurchase(plan)}
              >
                Choose Plan
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

    </div>
  );
};

Payment.propTypes = {
  user: PropTypes.object,
  onSuccess: PropTypes.func,
};

export default Payment;