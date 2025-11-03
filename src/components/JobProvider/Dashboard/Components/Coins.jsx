
import { React, useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";
import coinsImage from "../../../../assets/coins.png";
import { Skeleton, Box } from "@mui/material";

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

  const COINS_API_URL = "https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral";
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

  const fetchUserCoins = async () => {
    try {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      const { data } = await axios.get(COINS_API_URL);
      
      // Find the coin data for the current user
      const userCoinData = Array.isArray(data) 
        ? data.find(item => item.firebase_uid === user.uid)
        : data;

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
      const { data } = await axios.get(COIN_HISTORY_API_URL);
      
      // Filter history for current user
      const userHistory = Array.isArray(data) 
        ? data.filter(item => item.firebase_uid === user.uid)
        : [];

      if (userHistory.length === 0) {
        toast.info("No coin transactions found for your account");
        setCoinHistory([]);
      } else {
        setCoinHistory(userHistory);
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

  const getStatusClass = (validTo) => {
    return new Date(validTo) > new Date() ? "status-active" : "status-expired";
  };

  const getStatusText = (validTo) => {
    return new Date(validTo) > new Date() ? "Active" : "Expired";
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
          <h5 className="text-xl font-semibold text-red-600 mb-4">Unable to load coin data</h5>
          <button 
            className="px-4 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white rounded-lg transition-colors" 
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
          {coinData && coinData.coupon_code ? (
            <>
              {/* Heading centered */}
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 text-center">Coupon Details</h3>
              
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 sm:mb-4">
                {/* Left Column: Coupon Code and Status */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base text-gray-700 font-bold">Coupon Code:</span>
                    <span className="text-base sm:text-lg font-bold text-red-500">{coinData.coupon_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base text-gray-700 font-bold">Status:</span>
                    <span className={`text-sm sm:text-base font-bold ${
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
                    <span className="text-sm sm:text-base text-gray-700 font-bold">Valid From:</span>
                    <span className="text-sm sm:text-base text-gray-800">{formatDate(coinData.valid_from)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base text-gray-700 font-bold">Valid Till:</span>
                    <span className="text-sm sm:text-base text-gray-800">{formatDate(coinData.redeem_valid)}</span>
                  </div>
                </div>
              </div>

              {/* View Coin History Button - Centered */}
              <div className="text-center mt-3 sm:mt-4">
                <button 
                  className="px-4 sm:px-6 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white text-xs sm:text-sm rounded-lg transition-all font-medium"
                  onClick={handleHistoryClick}
                >
                  View Coin History
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h5 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Coupon Applied</h5>
                <p className="text-xs sm:text-sm text-gray-600">Apply a coupon code to see details here.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Available Coins (40% width) */}
        <div className="lg:col-span-2">
          {coinData ? (
            <div 
              className="rounded-[20px] p-4 sm:p-5 flex flex-col items-center justify-between gap-3 sm:gap-4 h-full"
              style={{ backgroundColor: '#FFDEE0' }}
            >
              <h6 className="text-sm sm:text-base font-semibold text-gray-800">Available Coins</h6>
              
              <div className="text-3xl sm:text-4xl font-bold text-gray-800">
                {coinData.coin_value?.toLocaleString() || 0}
              </div>
              
              <div className="flex justify-center">
                <img src={coinsImage} alt="Coins" className="w-20 sm:w-24 h-auto" />
              </div>
              
              <button 
                className="px-4 sm:px-5 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white text-xs sm:text-sm rounded-lg transition-all font-medium"
                onClick={fetchUserCoins}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh Coins"}
              </button>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 flex flex-col justify-center h-full">
              <div className="flex justify-center mb-3 sm:mb-4">
                <img src={coinsImage} alt="No Coins" className="w-18 sm:w-22 h-auto opacity-50" />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Coins Available</h5>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2">
                Apply coupon code or make payment to get coins!
              </p>
              <button 
                className="px-4 sm:px-5 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white text-xs sm:text-sm rounded-lg transition-all font-medium mx-auto" 
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4" onClick={closeHistoryModal}>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4">
              <h5 className="text-xl font-bold text-gray-800">Coin Transaction History</h5>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Filter Section */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Month:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">Year:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white rounded-lg transition-colors"
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-brand text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Coin Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Reduction</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Candidate ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Payment ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Unblocked Candidate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHistory.map((transaction, index) => (
                        <tr key={transaction.id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateTime(transaction.created_at)}</td>
                          <td className="px-4 py-3 text-sm">{transaction.reason || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm font-bold">🪙 {transaction.coin_value?.toLocaleString() || 0}</td>
                          <td className="px-4 py-3 text-sm text-red-600">{transaction.reduction ? `-${transaction.reduction}` : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{transaction.candidate_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{transaction.job_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{transaction.payment_id || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.unblocked_candidate_name ? (
                              <div>
                                <div className="font-bold">{transaction.unblocked_candidate_name}</div>
                                <small className="text-gray-500">{transaction.unblocked_candidate_id}</small>
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
                  <h6 className="text-lg font-semibold text-gray-600 mb-2">No Coins Transactions</h6>
                  <p className="text-gray-500">
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
                className="px-6 py-2 bg-gradient-brand hover:bg-gradient-brand-hover text-white rounded-lg transition-all font-medium" 
                onClick={closeHistoryModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Content;