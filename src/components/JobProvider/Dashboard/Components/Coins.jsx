import { React, useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";
import coinsImage from "../../../../assets/coins.png";
import noCoinsIllustration from "../../../../assets/Illustrations/No Coins.png";
import { Skeleton, Box } from "@mui/material";
import ModalPortal from "../../../common/ModalPortal.jsx";

const Content = () => {
  const { user } = useAuth();
  const [coinData, setCoinData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [coinHistory, setCoinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [freezeColumns, setFreezeColumns] = useState(0); // 0 = no freeze, 1-3 = number of columns to freeze
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  const COINS_API_URL = "https://5qkmgbpbd4.execute-api.ap-south-1.amazonaws.com/dev/coinRedeem";
  const COIN_HISTORY_API_URL = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history";

  // Get current year for filter options
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchUserCoins();
  }, [user]);

  useEffect(() => {
    if (showHistoryModal) {
      fetchCoinHistory();
    }
  }, [showHistoryModal]);

  useEffect(() => {
    filterHistory();
  }, [selectedMonth, selectedYear, coinHistory]);

  useEffect(() => {
    // Detect mobile/tablet and set default freeze
    const checkScreenSize = () => {
      const isMobileOrTab = window.innerWidth < 1024; // Less than 1024px (tablet and mobile)
      setIsMobileOrTablet(isMobileOrTab);
      if (isMobileOrTab) {
        setFreezeColumns(1); // Default to 1 frozen column on mobile/tablet
      } else {
        setFreezeColumns(0); // No freeze on desktop
      }
    };

    // Check on mount
    checkScreenSize();

    // Check on resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const fetchUserCoins = async () => {
    try {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      const { data } = await axios.get(`${COINS_API_URL}?firebase_uid=${encodeURIComponent(user.uid)}`);
      
      // Get the coin data for the current user
      const userCoinData = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (userCoinData) {
        setCoinData(userCoinData);
        setError(false);
      } else {
        // No coin data found for this user
        setCoinData(null);
        setError(false);
      }
    } catch (error) {
      console.error("Error fetching user coins:", error);
      setError(true);
      if (error.response?.status !== 404) {
        toast.error("Error loading coin data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoinHistory = async () => {
    try {
      setHistoryLoading(true);
      
      // Try to fetch with query parameter first, fallback to client-side filtering
      let data;
      try {
        const response = await axios.get(`${COIN_HISTORY_API_URL}?firebase_uid=${encodeURIComponent(user.uid)}`);
        data = response.data;
      } catch (queryError) {
        // If query parameter doesn't work, fetch all and filter client-side
        console.warn('Query parameter not supported, fetching all records:', queryError);
        const response = await axios.get(COIN_HISTORY_API_URL);
        data = response.data;
      }
      
      const userHistory = Array.isArray(data) 
        ? data.filter(item => item.firebase_uid === user.uid)
        : (data && data.firebase_uid === user.uid ? [data] : []);

      if (userHistory.length === 0) {
        setCoinHistory([]);
      } else {
        // Sort by created_at descending (most recent first)
        const sortedHistory = userHistory.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });
        setCoinHistory(sortedHistory);
      }
    } catch (error) {
      console.error("Error fetching coin history:", error);
      toast.error("Error loading coin history");
      setCoinHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterHistory = () => {
    if (!selectedMonth && !selectedYear) {
      setFilteredHistory(coinHistory);
      return;
    }

    const filtered = coinHistory.filter(item => {
      const itemDate = new Date(item.created_at);
      const itemYear = itemDate.getFullYear();
      const itemMonth = itemDate.getMonth() + 1;

      if (selectedYear && selectedMonth) {
        return itemYear === parseInt(selectedYear) && itemMonth === parseInt(selectedMonth);
      } else if (selectedYear) {
        return itemYear === parseInt(selectedYear);
      } else if (selectedMonth) {
        return itemMonth === parseInt(selectedMonth);
      }
      return true;
    });

    setFilteredHistory(filtered);
  };

  const handleHistoryClick = () => {
    setShowHistoryModal(true);
    setSelectedMonth("");
    setSelectedYear("");
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setCoinHistory([]);
    setFilteredHistory([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateAndTime = (dateString) => {
    if (!dateString) return { date: 'N/A', time: '' };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getStatusClass = (validTo) => {
    return new Date(validTo) > new Date() ? "status-active" : "status-expired";
  };

  const getStatusText = (validTo) => {
    return new Date(validTo) > new Date() ? "Active" : "Expired";
  };

  const getRechargeMode = (coinData) => {
    if (!coinData) return "N/A";
    
    const modes = [];
    
    // Check all possible sources
    if (coinData.is_razor_pay === 1) modes.push("Payment");
    if (coinData.is_coupon === 1) modes.push("Coupon");
    if (coinData.is_refer === 1) modes.push("Referral");
    
    // Fallback: if coupon_code exists but no flags, determine from coupon_code
    if (modes.length === 0 && coinData.coupon_code && coinData.coupon_code !== "") {
      if (coinData.coupon_code.toLowerCase() === "refer") {
        modes.push("Referral");
      } else {
        modes.push("Coupon");
      }
    }
    
    // Return all modes joined with comma, or N/A if none found
    return modes.length > 0 ? modes.join(", ") : "N/A";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Left Side - Coupon Details Skeleton */}
          <div className="lg:col-span-3">
            <Skeleton 
              variant="text" 
              width="60%" 
              height={32}
              className="mx-auto mb-3 sm:mb-4"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 sm:mb-4">
              {/* Left Column Skeleton */}
              <div className="space-y-2">
                <Skeleton variant="text" width="100%" height={24} />
                <Skeleton variant="text" width="80%" height={24} />
              </div>
              
              {/* Right Column Skeleton */}
              <div className="space-y-2">
                <Skeleton variant="text" width="100%" height={24} />
                <Skeleton variant="text" width="80%" height={24} />
              </div>
            </div>
            
            <div className="text-center mt-3 sm:mt-4">
              <Skeleton 
                variant="rectangular" 
                width={160} 
                height={36}
                className="mx-auto rounded-lg"
              />
            </div>
          </div>

          {/* Right Side - Available Coins Skeleton */}
          <div className="lg:col-span-2">
            <div 
              className="rounded-[20px] p-4 sm:p-5 flex flex-col items-center justify-between gap-3 sm:gap-4 h-full"
              style={{ backgroundColor: '#FFDEE0' }}
            >
              <Skeleton variant="text" width="80%" height={24} />
              
              <Skeleton variant="text" width="60%" height={48} />
              
              <Skeleton 
                variant="rectangular" 
                width={80} 
                height={80}
                className="rounded-lg"
              />
              
              <Skeleton 
                variant="rectangular" 
                width={120} 
                height={36}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <h5 className="text-xl font-semibold text-red-600 mb-4 leading-tight tracking-tight">Unable to load coin data</h5>
          <button 
            className="px-4 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white rounded-lg transition-colors text-base leading-normal tracking-tight" 
            onClick={fetchUserCoins}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Left Side - Coupon Details (60% width) */}
        <div className="lg:col-span-3">
          {coinData && (coinData.coin_value > 0 || coinData.is_razor_pay === 1 || coinData.is_coupon === 1 || coinData.is_refer === 1) ? (
            <>
              {/* Heading centered */}
              <h3 className="text-xl font-semibold text-gray-800 mb-3 sm:mb-4 text-center leading-tight tracking-tight">Coin Details</h3>
              
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 sm:mb-4">
                {/* Left Column: Recharge Mode, Coupon Code (if exists), and Status */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center gap-2 flex-wrap">
                    <span className="text-base text-gray-700 font-medium whitespace-nowrap leading-snug tracking-tight">Recharge Mode:</span>
                    <span className="text-base font-semibold text-red-500 break-words leading-normal tracking-tight">{getRechargeMode(coinData)}</span>
                  </div>
                  {/* Only show coupon code for actual coupons, not for referrals or payments */}
                  {coinData.coupon_code && 
                   coinData.coupon_code !== "" && 
                   coinData.coupon_code.toLowerCase() !== "refer" &&
                   coinData.is_coupon === 1 && 
                   coinData.is_razor_pay !== 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-base text-gray-700 font-medium leading-snug tracking-tight">Coupon Code:</span>
                      <span className="text-base font-semibold text-red-500 leading-normal tracking-tight">{coinData.coupon_code}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-700 font-medium leading-snug tracking-tight">Status:</span>
                    <span className={`text-base font-semibold leading-normal tracking-tight ${
                      new Date(coinData.redeem_valid) > new Date() 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {getStatusText(coinData.redeem_valid)}
                    </span>
                  </div>
                </div>
                
                {/* Right Column: Valid From and Valid Till */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-700 font-medium leading-snug tracking-tight">Valid From:</span>
                    <span className="text-base text-gray-800 leading-normal tracking-tight">{formatDate(coinData.valid_from)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-700 font-medium leading-snug tracking-tight">Valid Till:</span>
                    <span className="text-base text-gray-800 leading-normal tracking-tight">{formatDate(coinData.redeem_valid)}</span>
                  </div>
                </div>
              </div>

              {/* View Coin History Button - Centered */}
              <div className="text-center mt-3 sm:mt-4">
                <button 
                  className="px-4 sm:px-6 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white text-base rounded-lg transition-colors font-medium leading-normal tracking-tight"
                  onClick={handleHistoryClick}
                >
                  View Coin History
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h5 className="text-xl font-semibold text-gray-700 mb-2 leading-tight tracking-tight">You don't have coins yet</h5>
                <p className="text-base text-gray-600 leading-normal tracking-tight">Apply a coupon code or make payment or refer friends to get coins!</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Available Coins (40% width) */}
        <div className="lg:col-span-2">
          {coinData && coinData.coin_value > 0 ? (
            <div 
              className="rounded-[20px] p-4 sm:p-5 flex flex-col items-center justify-between gap-3 sm:gap-4 h-full"
              style={{ backgroundColor: '#FFDEE0' }}
            >
              <h6 className="text-xl font-semibold text-gray-800 leading-snug tracking-tight">Available Coins</h6>
              
              <div className="text-3xl font-bold text-gray-800 leading-tight tracking-tight">
                {coinData.coin_value?.toLocaleString() || 0}
              </div>
              
              <div className="flex justify-center">
                <img src={coinsImage} alt="Coins" className="w-20 sm:w-24 h-auto" />
              </div>
              
              <button 
                className="px-4 sm:px-5 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white text-base rounded-lg transition-colors font-medium leading-normal tracking-tight"
                onClick={fetchUserCoins}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh Coins"}
              </button>
            </div>
          ) : (
            <div className="text-center py-2 sm:py-8 flex flex-col justify-center h-full">
              <div className="flex justify-center mb-3 sm:mb-4">
                <img src={noCoinsIllustration} alt="No Coins" className="w-48 sm:w-64 h-auto" />
              </div>
              <h5 className="text-xl font-semibold text-gray-700 mb-2 leading-tight tracking-tight">No Coins Available</h5>
              <p className="text-base text-gray-600 mb-3 sm:mb-4 px-2 leading-normal tracking-tight">
                Apply coupon code or make payment or refer friends to get coins!
              </p>
              <button 
                className="px-4 sm:px-5 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white text-base rounded-lg transition-colors font-medium mx-auto leading-normal tracking-tight" 
                onClick={fetchUserCoins}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh Coins"}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Coin History Modal */}
      {showHistoryModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4" onClick={closeHistoryModal}>
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="border-b px-6 py-4">
                <h5 className="text-xl font-semibold text-gray-800 leading-tight tracking-tight">Coin Transaction History</h5>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Filter Section */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2 leading-snug tracking-tight">Month:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base leading-normal tracking-tight"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="">All Months</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2 leading-snug tracking-tight">Year:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base leading-normal tracking-tight"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">All Years</option>
                      {Array.from({ length: currentYear - 2024 }, (_, i) => 2025 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      className="w-full px-4 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white rounded-lg transition-colors text-base leading-normal tracking-tight"
                      onClick={filterHistory}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* History Table */}
              {historyLoading ? (
                <div className="space-y-4">
                  {/* Table Header Skeleton */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="grid grid-cols-8 gap-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} variant="text" width="100%" height={20} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Table Rows Skeleton */}
                  {Array.from({ length: 3 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="bg-white border rounded-lg p-4">
                      <div className="grid grid-cols-8 gap-4">
                        {Array.from({ length: 8 }).map((_, colIndex) => (
                          <Skeleton key={colIndex} variant="text" width="100%" height={16} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length > 0 ? (
                <div className="overflow-x-auto" style={{ position: 'relative' }}>
                  <style>{`
                    /* Mobile/Tablet: Narrower first column for better space utilization */
                    .freeze-col-1 { 
                      min-width: 110px; 
                      max-width: 110px; 
                    }
                    .freeze-col-2 { 
                      min-width: 120px; 
                    }
                    .freeze-col-3 { 
                      min-width: 110px; 
                    }
                    .freeze-sticky-1 { 
                      left: 0; 
                    }
                    .freeze-sticky-2 { 
                      left: 110px; 
                    }
                    .freeze-sticky-3 { 
                      left: 230px; 
                    }
                    
                    /* Mobile/Tablet: Compact padding and styling for frozen column */
                    @media (max-width: 1023px) {
                      th.freeze-col-1,
                      td.freeze-col-1 {
                        padding-left: 0.375rem !important;
                        padding-right: 0.375rem !important;
                        font-size: 0.8125rem !important;
                        white-space: normal !important;
                        overflow: visible !important;
                        line-height: 1.3 !important;
                      }
                      th.freeze-col-2,
                      td.freeze-col-2 {
                        padding-left: 0.5rem !important;
                        padding-right: 0.5rem !important;
                        font-size: 0.875rem !important;
                      }
                      th.freeze-col-3,
                      td.freeze-col-3 {
                        padding-left: 0.5rem !important;
                        padding-right: 0.5rem !important;
                        font-size: 0.875rem !important;
                      }
                    }
                    
                    /* Desktop: Wider columns, disable freeze (sticky positioning) */
                    @media (min-width: 1024px) {
                      .freeze-col-1 { 
                        min-width: 200px; 
                        max-width: none;
                      }
                      .freeze-col-2 { 
                        min-width: 180px; 
                      }
                      .freeze-col-3 { 
                        min-width: 150px; 
                      }
                      .freeze-sticky-1,
                      .freeze-sticky-2,
                      .freeze-sticky-3 {
                        position: static !important;
                        left: auto !important;
                        box-shadow: none !important;
                      }
                    }
                  `}</style>
                  <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: freezeColumns > 0 ? '550px' : '100%' }}>
                    <thead className="bg-gradient-brand text-white">
                      <tr>
                        <th 
                          className={`px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal freeze-col-1 ${freezeColumns >= 1 ? 'sticky freeze-sticky-1 z-20 bg-gradient-brand' : ''}`}
                          style={freezeColumns >= 1 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                        >
                          <span className="hidden md:inline">Date & Time</span>
                          <span className="md:hidden">Date</span>
                        </th>
                        <th 
                          className={`px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal freeze-col-2 ${freezeColumns >= 2 ? 'sticky freeze-sticky-2 z-20 bg-gradient-brand' : ''}`}
                          style={freezeColumns >= 2 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                        >
                          Reason
                        </th>
                        <th 
                          className={`px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal freeze-col-3 ${freezeColumns >= 3 ? 'sticky freeze-sticky-3 z-20 bg-gradient-brand' : ''}`}
                          style={freezeColumns >= 3 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                        >
                          Coin Value
                        </th>
                        <th className="px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal">Reduction</th>
                        <th className="px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal">Candidate ID</th>
                        <th className="px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal">Job ID</th>
                        <th className="px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal">Payment ID</th>
                        <th className="px-4 py-3 text-left text-base font-medium uppercase tracking-wider leading-normal">Unblocked Candidate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHistory.map((transaction, index) => (
                        <tr key={transaction.id || index} className="group">
                          <td 
                            className={`px-4 py-3 text-base leading-normal tracking-tight freeze-col-1 ${freezeColumns >= 1 ? 'sticky freeze-sticky-1 z-10 bg-white group-hover:bg-gray-50' : 'group-hover:bg-gray-50'}`}
                            style={freezeColumns >= 1 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                          >
                            <div className="hidden md:block whitespace-nowrap">
                              {formatDateTime(transaction.created_at)}
                            </div>
                            <div className="md:hidden flex flex-col">
                              {(() => {
                                const { date, time } = formatDateAndTime(transaction.created_at);
                                return (
                                  <>
                                    <span className="font-medium">{date}</span>
                                    <span className="text-xs text-gray-600">{time}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td 
                            className={`px-4 py-3 text-base leading-normal tracking-tight freeze-col-2 ${freezeColumns >= 2 ? 'sticky freeze-sticky-2 z-10 bg-white group-hover:bg-gray-50' : 'group-hover:bg-gray-50'}`}
                            style={freezeColumns >= 2 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                          >
                            {transaction.reason || 'N/A'}
                          </td>
                          <td 
                            className={`px-4 py-3 text-base font-bold leading-normal tracking-tight freeze-col-3 ${freezeColumns >= 3 ? 'sticky freeze-sticky-3 z-10 bg-white group-hover:bg-gray-50' : 'group-hover:bg-gray-50'}`}
                            style={freezeColumns >= 3 ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}}
                          >
                            🪙 {transaction.coin_value?.toLocaleString() || 0}
                          </td>
                          <td className="px-4 py-3 text-base text-red-600 leading-normal tracking-tight group-hover:bg-gray-50">{transaction.reduction ? `-${transaction.reduction}` : 'N/A'}</td>
                          <td className="px-4 py-3 text-base leading-normal tracking-tight group-hover:bg-gray-50">{transaction.candidate_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-base leading-normal tracking-tight group-hover:bg-gray-50">{transaction.job_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-base leading-normal tracking-tight group-hover:bg-gray-50">{transaction.payment_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-base leading-normal tracking-tight group-hover:bg-gray-50">
                            {transaction.unblocked_candidate_name ? (
                              <div>
                                <div className="font-bold leading-normal tracking-tight">{transaction.unblocked_candidate_name}</div>
                                <small className="text-gray-500 leading-normal tracking-tight">{transaction.unblocked_candidate_id}</small>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h6 className="text-xl font-semibold text-gray-600 mb-2 leading-tight tracking-tight">No Coins Transactions</h6>
                  <p className="text-base text-gray-500 leading-normal tracking-tight">
                    {selectedMonth || selectedYear 
                      ? "No transactions found for the selected filter criteria."
                      : "No transaction history available."
                    }
                  </p>
                </div>
                )}
              </div>
              
              <div className="border-t px-6 py-4 flex justify-end">
                <button 
                  type="button" 
                  className="px-6 py-2 bg-gradient-brand hover:bg-gradient-primary-hover text-white rounded-lg transition-colors font-medium text-base leading-normal tracking-tight"
                  onClick={closeHistoryModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default Content;