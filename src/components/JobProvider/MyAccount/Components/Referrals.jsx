import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Skeleton } from "@mui/material";

const normalizePhoneNumber = (value = "") =>
  value.replace(/[^0-9]/g, "").slice(0, 10);

const isValidPhoneNumber = (value = "") => /^[6-9]\d{9}$/.test(value);

const Referrals = ({ user, onSuccess }) => {
  const navigate = useNavigate();
  const [contactNumber, setContactNumber] = useState('');
  const [contacts, setContacts] = useState([]);
  const [registeredContacts, setRegisteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isRewardGiven, setIsRewardGiven] = useState(false);

  const firebase_uid = user?.uid;

  const getAuthToken = () =>
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return { 'Content-Type': 'application/json' };
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };

  const calculateRegisteredContacts = (contactsArr, allUsers) => {
    const registered = [];
    for (let c of contactsArr) {
      if (
        allUsers.some(u =>
          (u.phone_number || '').replace(/[^0-9]/g, '').slice(-10) === c
        )
      ) registered.push(c);
    }
    return registered;
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/Reffering?firebase_uid=${firebase_uid}`,
        { headers: getAuthHeaders() }
      );
      const rows = await response.json();
      let contactsArr = [];
      if (Array.isArray(rows) && rows.length > 0) {
        for (let i = 1; i <= 10; i++) {
          const val = rows[0][`contact${i}`];
          if (val && val.trim()) {
            const normalized = normalizePhoneNumber(val);
            if (normalized.length === 10) {
              contactsArr.push(normalized);
            }
          }
        }
      }
      setContacts(contactsArr);

      const allUsers = await fetchAllUsers();
      const reg = calculateRegisteredContacts(contactsArr, allUsers);
      setRegisteredContacts(reg);

      checkRewardEligibility(reg, contactsArr);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebase_uid) fetchContacts();
  }, [firebase_uid]);

  const fetchCurrentUserName = async (firebase_uid) => {
    try {
      const res = await fetch('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login');
      if (!res.ok) return "User";
      const users = await res.json();
      const userObj = Array.isArray(users)
        ? users.find(u => (u.firebase_uid || u.uid) === firebase_uid)
        : null;
      return userObj?.name || "User";
    } catch {
      return "User";
    }
  };


  const sendRcsInvite = async (contact, name) => {
    const rcsPayload = {
      contactId: contact,
      templateName: "referal",
      customParam: {
        CUSTOM_PARAM: name,
      },
      sent_by: name,
      sent_email: user?.email || ""
    };

    try {
      await fetch("https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/rcsMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rcsPayload)
      });
    } catch {}
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(contactNumber);

    if (!isValidPhoneNumber(normalized)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (contacts.includes(normalized)) {
      toast.warning("This number has already been added.");
      return;
    }

    try {
      const allUsers = await fetchAllUsers();
      const found = allUsers.some(
        u => (u.phone_number || "").replace(/[^0-9]/g, "").slice(-10) === normalized
      );
      if (found) {
        toast.error("This mobile number is already in use.");
        return;
      }

      const newContacts = [...contacts, normalized].slice(0, 10);
      const body = { firebase_uid, is_active: 1 };
      newContacts.forEach((num, idx) => {
        body[`contact${idx + 1}`] = num;
      });
      for (let i = newContacts.length + 1; i <= 10; i++) {
        body[`contact${i}`] = null;
      }

      const addResponse = await fetch('https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/Reffering', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!addResponse.ok) throw new Error("Failed to add organization");
      setContacts(newContacts);
      setContactNumber('');
      toast.success("Organization added successfully!");

      const name = await fetchCurrentUserName(firebase_uid);
      await sendRcsInvite(normalized, name);

      const reg = calculateRegisteredContacts(newContacts, allUsers);
      setRegisteredContacts(reg);
      checkRewardEligibility(reg, newContacts);

    } catch (err) {
      toast.error("Network error adding organization. Please try again.");
    }
  };

  const handleEditSave = async (idx) => {
    const normalized = normalizePhoneNumber(editValue);

    if (!isValidPhoneNumber(normalized)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (contacts.includes(normalized) && contacts[idx] !== normalized) {
      toast.warning("This number has already been added.");
      return;
    }

    try {
      const allUsers = await fetchAllUsers();
      const found = allUsers.some(
        u => (u.phone_number || "").replace(/[^0-9]/g, "").slice(-10) === normalized
      );
      if (found) {
        toast.error("This mobile number is already in use.");
        return;
      }

      const updatedContacts = [...contacts];
      updatedContacts[idx] = normalized;
      const body = { firebase_uid, is_active: 1 };
      updatedContacts.forEach((num, i) => {
        body[`contact${i + 1}`] = num;
      });
      for (let i = updatedContacts.length + 1; i <= 10; i++) {
        body[`contact${i}`] = null;
      }
      const updateResponse = await fetch('https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/Reffering', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!updateResponse.ok) throw new Error("Failed to update organization");
      setContacts(updatedContacts);
      setEditIndex(null);
      setEditValue('');
      toast.success("Organization updated successfully!");

      const name = await fetchCurrentUserName(firebase_uid);
      await sendRcsInvite(normalized, name);

      const reg = calculateRegisteredContacts(updatedContacts, allUsers);
      setRegisteredContacts(reg);
      checkRewardEligibility(reg, updatedContacts);

    } catch (err) {
      toast.error("Network error updating organization. Please try again.");
    }
  };

  const handleEditCancel = () => {
    setEditIndex(null);
    setEditValue('');
  };
  const handleEditStart = (idx) => {
    setEditIndex(idx);
    setEditValue(contacts[idx]);
  };

  const handleRemoveContact = async (numberToRemove) => {
    try {
      const idxToRemove = contacts.findIndex(num => num === numberToRemove);
      if (idxToRemove === -1) return;
      const updatedContacts = [...contacts];
      updatedContacts.splice(idxToRemove, 1);

      const body = { firebase_uid, is_active: updatedContacts.length > 0 ? 1 : 0 };
      updatedContacts.forEach((num, i) => {
        body[`contact${i + 1}`] = num;
      });
      for (let i = updatedContacts.length + 1; i <= 10; i++) {
        body[`contact${i}`] = null;
      }
      const response = await fetch('https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/Reffering', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Failed to remove organization");
      setContacts(updatedContacts);
      if (editIndex !== null) handleEditCancel();
      toast.success("Organization removed successfully!");

      const allUsers = await fetchAllUsers();
      const reg = calculateRegisteredContacts(updatedContacts, allUsers);
      setRegisteredContacts(reg);
      checkRewardEligibility(reg, updatedContacts);

    } catch (err) {
      toast.error("Failed to remove organization");
    }
  };

  const checkRewardEligibility = async (reg, contactArr) => {
    if (isRewardGiven) return;
    // Check in redeemGeneral
    if (reg.length >= 5) {
      const reward = await checkCanGiveReward();
      if (reward) {
        setIsRewardGiven(true);
        await handleReward();
      }
    }
  };

  // Logic for PUT/POST to redeemGeneral
  const checkCanGiveReward = async () => {
    try {
      const res = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral?firebase_uid=${firebase_uid}`
      );
      if (!res.ok) return true;
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return true;
      const rec = rows[0];
      // reward only if valid_to < now OR coin_value < 10
      const now = new Date();
      let validToDate = rec.valid_to ? new Date(rec.valid_to.replace(" ", "T")) : null;
      let coinVal = typeof rec.coin_value === "number" ? rec.coin_value : Number(rec.coin_value || 0);
      if ((validToDate && validToDate < now) || coinVal < 10) return true;
      return false;
    } catch {
      return true;
    }
  };

  const handleReward = async () => {
    try {
      // Get coupon_value from config
      const referConfigRes = await fetch("https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/referConfigure");
      const referConfig = await referConfigRes.json();
      const couponValue = Array.isArray(referConfig) && referConfig.length > 0 ? Number(referConfig[0]?.coupon_value || 8000) : 8000;

      const redeemRes = await fetch(
        `https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral?firebase_uid=${firebase_uid}`
      );
      let coinValue = couponValue;
      let oldValidTo = null, oldRec = {};
      let method = "POST";
      if (redeemRes.ok) {
        const redeemRows = await redeemRes.json();
        if (Array.isArray(redeemRows) && redeemRows.length > 0) {
          oldRec = redeemRows[0];
          if (oldRec.coin_value) coinValue += Number(oldRec.coin_value || 0);
          if (oldRec.valid_to) oldValidTo = new Date(oldRec.valid_to.replace(" ", "T"));
          method = "PUT";
        }
      }
      const now = new Date();
      const valid_from = now.toISOString().slice(0, 19).replace("T", " ");
      const newValidTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      let valid_to = newValidTo;
      if (oldValidTo && oldValidTo > newValidTo) valid_to = oldValidTo;
      const redeem_at = valid_from;
      // always keep flags as 1 if they were present
      let payload = {
        firebase_uid,
        coupon_code: "refer",
        coin_value: coinValue,
        valid_from,
        valid_to: valid_to.toISOString().slice(0, 19).replace("T", " "),
        redeem_at,
        is_refer: 1,
      };
      if ("is_razor_pay" in oldRec) payload.is_razor_pay = oldRec.is_razor_pay;
      if ("is_coupon" in oldRec) payload.is_coupon = oldRec.is_coupon;

      await fetch("https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/redeemGeneral", {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      // Update /coin_history
      let loginRes = await fetch('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login');
      let loginData = await loginRes.json();
      let userLogin = loginData.find(u => u.firebase_uid === firebase_uid);
      let candidate_id = null;
      if (userLogin?.user_type === "Candidate") {
        let personalRes = await fetch('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal');
        let personalData = await personalRes.json();
        let foundPersonal = personalData.find(p => p.firebase_uid === firebase_uid);
        candidate_id = foundPersonal?.id;
      } else if (userLogin?.user_type === "Employer") {
        let orgRes = await fetch('https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation');
        let orgData = await orgRes.json();
        let foundOrg = orgData.find(o => o.firebase_uid === firebase_uid);
        candidate_id = foundOrg?.id;
      }
      let coinHistoryPayload = {
        firebase_uid: firebase_uid,
        candidate_id: candidate_id,
        job_id: null,
        coin_value: couponValue,
        reduction: null,
        reason: "10 members registered from refer"
      };
      await fetch("https://fgitrjv9mc.execute-api.ap-south-1.amazonaws.com/dev/coin_history", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coinHistoryPayload)
      });

      toast.success("Congratulations! You have received your referral coins.");
      if (onSuccess) onSuccess();
      navigate("/provider/dashboard");
    } catch {
      toast.error("Failed to redeem referral coins or update coin history. Please contact support.");
    }
  };

  useEffect(() => {
    if (!firebase_uid || contacts.length === 0) return;
    const intervalId = setInterval(() => {
      fetchContacts();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [firebase_uid, contacts.length]);

  // Add this function to handle the submit-all-organizations button
  const handleSubmitReferrals = (event) => {
    event.preventDefault();
    toast.info("Submit all organizations logic not implemented yet.");
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          {/* Header Skeleton */}
          <div className="text-center mb-6 sm:mb-8">
            <Skeleton variant="text" width="70%" height={40} sx={{ mx: 'auto', mb: 1 }} />
            <Skeleton variant="text" width="50%" height={20} sx={{ mx: 'auto' }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Side Skeleton */}
            <div className="space-y-4">
              <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2 }} />
            </div>

            {/* Right Side Skeleton */}
            <div className="space-y-3">
              <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" width="100%" height={60} sx={{ borderRadius: 2 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Refer Organizations & Get Access to our Basic Plan</h3>
          <p className="text-gray-600 text-sm sm:text-base">Add up to 10 Organizations contact numbers and get free access to our Basic Plan when 5 register.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Side - Progress and Form */}
          <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Organizations Added</label>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800">{contacts.length}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(contacts.length / 10) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Organizations Registered</label>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800">{registeredContacts.length}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(registeredContacts.length / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Add Contact Form */}
            {contacts.length < 10 && (
              <form onSubmit={handleAddContact} className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(normalizePhoneNumber(e.target.value))}
                    placeholder="Enter friend's mobile number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    minLength="10"
                    required
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={contacts.length >= 10}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed duration-200 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
                  >
                    Add Organization
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Side - Contacts List */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">Added Organizations ({contacts.length}/10)</h4>
            
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm sm:text-base">Loading organizations...</p>
              </div>
            ) : contacts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                {contacts.map((number, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 flex items-center justify-between">
                    <div className="flex-1">
                      {editIndex === index ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <input
                            type="tel"
                            value={editValue}
                            onChange={e => setEditValue(normalizePhoneNumber(e.target.value))}
                            maxLength="10"
                            pattern="[0-9]{10}"
                            className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm w-24 sm:w-32"
                          />
                          <div className="flex gap-1 sm:gap-2">
                            <button 
                              className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded text-xs sm:text-sm hover:bg-green-700 transition-colors"
                              onClick={() => handleEditSave(index)}
                            >
                              Save
                            </button>
                            <button 
                              className="px-2 sm:px-3 py-1 bg-gray-600 text-white rounded text-xs sm:text-sm hover:bg-gray-700 transition-colors"
                              onClick={handleEditCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-800 text-sm sm:text-base">{number}</div>
                          <div className={`text-xs sm:text-sm ${
                            registeredContacts.includes(number) 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-500'
                          }`}>
                            {registeredContacts.includes(number)
                              ? 'Registration Completed'
                              : 'Registration Pending'
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editIndex !== index && !registeredContacts.includes(number) && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEditStart(index)}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M14.7 3.29a1 1 0 0 1 1.41 0l.6.6a1 1 0 0 1 0 1.41l-9.09 9.09a1 1 0 0 1-.45.26l-3.12.78a.5.5 0 0 1-.61-.61l.78-3.12a1 1 0 0 1 .26-.45l9.09-9.09zm2.12-2.12a3 3 0 0 0-4.24 0l-9.09 9.09a3 3 0 0 0-.77 1.34l-.78 3.12a2.5 2.5 0 0 0 3.06 3.06l3.12-.78a3 3 0 0 0 1.34-.77l9.09-9.09a3 3 0 0 0 0-4.24l-.6-.6zm-2.83 6.48l-1.42-1.42 2.83-2.83 1.42 1.42-2.83 2.83z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveContact(number)}
                          className="p-1 sm:p-2 text-red-500 hover:text-red-700 transition-colors"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <div className="text-3xl sm:text-4xl mb-2">📱</div>
                <p className="text-sm sm:text-base">No organizations added yet</p>
              </div>
            )}

            {/* Submit Button */}
            {contacts.length > 0 && (
              <button
                className={`w-full py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                  contacts.length >= 10 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleSubmitReferrals}
                disabled={contacts.length < 10}
              >
                {contacts.length < 10
                  ? `Add ${10 - contacts.length} more organization${10 - contacts.length === 1 ? '' : 's'} to submit`
                  : 'Submit All Organizations'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Referrals;