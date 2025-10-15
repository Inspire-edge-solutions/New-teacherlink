import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import { Skeleton } from "@mui/material";
import Payment from "./Payments";
import Coupons from "./Coupons";
import Referrals from "./Referrals";

// Success Modal
const SuccessModal = ({ open, onClose, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <img
            src="https://cdn-icons-png.flaticon.com/512/616/616490.png"
            alt="Coin"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Congrats!!</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button 
            className="bg-gradient-brand text-white px-6 py-3 rounded-lg hover:bg-gradient-primary-hover transition-all duration-200"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Info Modal
const InfoModal = ({ open, onClose, iconUrl, message, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mb-4">
            {loading ? (
              <div className="w-10 h-10 mx-auto border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <img
                src={iconUrl || "https://cdn-icons-png.flaticon.com/512/463/463612.png"}
                alt="Info"
                className="w-12 h-12 mx-auto"
              />
            )}
          </div>
          <h3 className="text-xl font-bold text-red-600 mb-4">Info</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button 
            className="bg-gradient-brand text-white px-6 py-3 rounded-lg hover:bg-gradient-primary-hover transition-all duration-200"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Subscription Details View
const SubscriptionDetailsView = ({ subscription }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-green-600">✓</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Premium Subscription Activated!</h3>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 font-medium">Status</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Active</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 font-medium">Start Date</span>
            <span className="text-gray-800">{new Date(subscription.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 font-medium">Valid Until</span>
            <span className="text-gray-800">{new Date(subscription.end_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 font-medium">Plan Type</span>
            <span className="text-gray-800">Premium Job Seeker</span>
          </div>
          <div className="flex justify-between items-center py-2 md:col-span-2">
            <span className="text-gray-600 font-medium">Coins Balance</span>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
              {subscription.coins_balance} coins
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h4 className="text-xl font-bold text-gray-800 mb-6">Premium Benefits Unlocked</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">🎯</span>
            <span className="text-gray-700 font-medium">Priority Job Applications</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">💼</span>
            <span className="text-gray-700 font-medium">Access to Premium Jobs</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">📊</span>
            <span className="text-gray-700 font-medium">Advanced Analytics</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">🌟</span>
            <span className="text-gray-700 font-medium">Featured Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Subscription = () => {

  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('payment');

  // Payment history state
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Coupon code state
  const [headerCouponCode, setHeaderCouponCode] = useState('');

  // Modal state
  const [modal, setModal] = useState({ open: false, type: "", message: "" });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2, mb: 3 }} />
          <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access subscription features.</p>
        </div>
      </div>
    );
  }

  const firebase_uid = user?.uid;

  // Fetch subscription details using the firebase_uid
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://v0trs9tt4k.execute-api.ap-south-1.amazonaws.com/staging/subscription/${firebase_uid}`
      );
      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (err) {
      setError("Failed to fetch subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchSubscription();
    }
  }, [user]);

  const handleSubscriptionSuccess = () => {
    fetchSubscription();
    setActiveTab('subscription-details');
  };

  // Helper: Get auth token
  const getAuthToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Helper: Prepare headers for authenticated API calls
  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return { "Content-Type": "application/json" };
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  // Fetch payment history
  const fetchPaymentHistory = async () => {
    if (!firebase_uid) {
      toast.error("User not logged in!");
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch payment history");
      }
      
      const allPayments = await response.json();
      
      // Filter payments for current user
      const userPayments = allPayments.filter(payment => 
        payment.firebase_uid === firebase_uid
      );
      
      setPaymentHistory(userPayments);
      setShowHistoryPopup(true);
      
    } catch (error) {
      console.error("Error fetching payment history:", error);
      toast.error("Failed to fetch payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle header coupon application
  const handleHeaderCouponApply = async () => {
    if (!headerCouponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const response = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/coupon/apply",
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            couponCode: headerCouponCode.trim(),
            firebase_uid: firebase_uid 
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Coupon applied successfully!");
        setHeaderCouponCode('');
        // Refresh subscription data
        fetchSubscriptionDetails();
      } else {
        toast.error(data.message || "Invalid coupon code");
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error("Failed to apply coupon. Please try again.");
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status display text and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'created':
        return { text: 'Failed', color: '#dc3545' };
      case 'paid':
        return { text: 'Success', color: '#28a745' };
      default:
        return { text: status, color: '#6c757d' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6 sm:mb-8">
            <Skeleton variant="text" width="40%" height={50} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2 }} />
          </div>
          {/* Content Skeleton - 3 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" width="100%" height={400} sx={{ borderRadius: 3 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  
  if (subscription?.active) {
    return (
      <div className="min-h-screen bg-gray-50 bg-opacity-50" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-green-600">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Subscription</h2>
            <div className="space-y-2 text-gray-600">
              <p>Valid until: {new Date(subscription.endDate).toLocaleDateString()}</p>
              <p>Status: <span className="text-green-600 font-semibold">Active</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          {/* Top Row - Title and Coupon Input */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left" style={{ background: 'linear-gradient(to right, #F34B58, #A1025D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Subscription plans
            </h1>
            
            {/* Coupon Code Input */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Coupon code"
                value={headerCouponCode}
                onChange={(e) => setHeaderCouponCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHeaderCouponApply()}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
              />
              <button 
                onClick={handleHeaderCouponApply}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover transition-all duration-200 font-medium text-sm sm:text-base whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </div>
          
          {/* Bottom Row - Segmented Control and Payment History */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Segmented Control - Centered */}
            <div className={`flex justify-center ${activeTab === 'payment' ? 'w-full sm:flex-1' : 'w-full'}`}>
              <div className="flex bg-white rounded-full p-1 shadow-lg w-full sm:w-auto">
                <button
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-200 text-sm sm:text-base ${
                    activeTab === 'payment' 
                      ? 'bg-gradient-brand text-white shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('payment')}
                >
                  <span className="hidden sm:inline">Pay with Razorpay</span>
                  <span className="sm:hidden">Razorpay</span>
                </button>
                
                <button
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-200 text-sm sm:text-base ${
                    activeTab === 'referral' 
                      ? 'bg-gradient-brand text-white shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('referral')}
                >
                  <span className="hidden sm:inline">Refer friends</span>
                  <span className="sm:hidden">Refer</span>
                </button>
              </div>
            </div>
            
            {/* Payment History Button - Only show when Pay with Razorpay is active */}
            {activeTab === 'payment' && (
              <div className="flex justify-center sm:justify-end">
                <button
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg font-medium text-sm sm:text-base"
                  onClick={fetchPaymentHistory}
                  disabled={historyLoading}
                >
                  {historyLoading ? 'Loading...' : 'Payment History'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          {activeTab === 'payment' && (
            <Payment user={user} onSuccess={handleSubscriptionSuccess} />
          )}
          {activeTab === 'referral' && (
            <Referrals 
              user={user} 
              onSuccess={handleSubscriptionSuccess}
              setModal={setModal}
            />
          )}
          {activeTab === 'coupon' && (
            <Coupons 
              user={user} 
              onSuccess={handleSubscriptionSuccess}
              setModal={setModal}
              fetchSubscription={fetchSubscription}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'subscription-details' && subscription && (
            <SubscriptionDetailsView subscription={subscription} />
          )}
        </div>
      </div>

      {/* Payment History Popup */}
      {showHistoryPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 backdrop-blur-sm p-2 sm:p-4 overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistoryPopup(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Close Button */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-start relative">
              <div className="flex-1 pr-3 sm:pr-4">
                <h3 className="text-lg sm:text-2xl font-semibold text-gray-800 flex items-center gap-2 m-0">
                  💳 Payment History
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mt-1 m-0">
                  Your transaction history and payment details
                </p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowHistoryPopup(false)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-gradient-brand text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg hover:bg-gradient-primary-hover hover:scale-110 transition-all duration-200 z-10"
              >
                ×
              </button>
            </div>

            {/* Payment History Content */}
            <div className="p-3 sm:p-6 flex-1 overflow-y-auto min-h-0 flex flex-col">
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
                  ))}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-600 flex-1 flex flex-col justify-center items-center">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📋</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No Payment History</h3>
                  <p className="text-sm sm:text-base">You haven't made any payments yet.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs sm:text-sm bg-white min-w-[600px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-left font-semibold text-gray-700 border-r border-gray-200 text-xs">
                            Amount
                          </th>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-left font-semibold text-gray-700 border-r border-gray-200 text-xs">
                            Status
                          </th>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-left font-semibold text-gray-700 border-r border-gray-200 text-xs">
                            Transaction ID
                          </th>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-left font-semibold text-gray-700 border-r border-gray-200 min-w-[100px] text-xs">
                            Date
                          </th>
                          <th className="px-1 sm:px-2 py-2 sm:py-3 text-left font-semibold text-gray-700 text-xs">
                            Receipt
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                      {paymentHistory.map((payment, index) => {
                        const statusInfo = getStatusInfo(payment.status);
                        return (
                          <tr
                            key={payment.id || index}
                            className="border-b border-gray-200 transition-all duration-200 cursor-pointer hover:bg-gray-50"
                          >
                            <td className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200 font-semibold text-gray-800 text-xs sm:text-sm">
                              ₹{payment.amount}
                            </td>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200">
                              <span 
                                className="inline-block px-1 sm:px-2 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor: statusInfo.color + '20',
                                  color: statusInfo.color,
                                  border: `1px solid ${statusInfo.color}40`
                                }}
                              >
                                {statusInfo.text}
                              </span>
                            </td>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200 font-mono text-xs text-gray-600 break-all max-w-[120px] sm:max-w-[150px]">
                              {payment.user_transaction_id}
                            </td>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200 text-gray-600 min-w-[80px] sm:min-w-[100px]">
                              <div className="text-xs sm:text-sm leading-tight">
                                {formatDate(payment.created_at)}
                                <br />
                                <span className="text-xs text-gray-500">
                                  {formatTime(payment.created_at)}
                                </span>
                              </div>
                            </td>
                            <td className="px-1 sm:px-2 py-2 sm:py-3 text-gray-600 text-xs max-w-[100px] sm:max-w-[120px] break-all">
                              {payment.receipt}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SuccessModal
        open={modal.open && modal.type === "success"}
        onClose={() => setModal({ ...modal, open: false })}
        message={modal.message}
      />
      <InfoModal
        open={modal.open && modal.type === "info"}
        onClose={() => setModal({ ...modal, open: false })}
        iconUrl={modal.iconUrl}
        message={modal.message}
        loading={modal.loading}
      />
    </div>
  );
};

export default Subscription;
