import React, { useState } from "react";
import FormInfoBox from "./Components/FormInfoBox";
import ViewProfile from "./Components/ViewProfile";
import { useAuth } from "../../../Context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

const MyProfileComponent = () => {
    const [showProfile, setShowProfile] = useState(false);
    const [loadingApproval, setLoadingApproval] = useState(false);

    const { user } = useAuth();

    // Handles approval logic before allowing profile view
    const handleViewProfile = async () => {
        if (!user?.uid) {
            toast.error("User not authenticated");
            setShowProfile(false);
            return;
        }
        setLoadingApproval(true);
        try {
            const res = await axios.get(
                `https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved?firebase_uid=${user.uid}`
            );

            let approved, rejected, responseMsg, recordFound = false;

            // Handle both array and object response
            if (Array.isArray(res.data) && res.data.length > 0) {
                const userProfile = res.data.find(obj =>
                    obj.firebase_uid === user.uid
                );
                if (userProfile) {
                    recordFound = true;
                    approved = userProfile.isApproved ?? userProfile.is_approved ?? userProfile.isapproved;
                    rejected = userProfile.isRejected ?? userProfile.is_rejected ?? userProfile.isrejected;
                    responseMsg = userProfile.response;
                }
            } else if (
                typeof res.data === "object" &&
                res.data !== null &&
                Object.keys(res.data).length > 0
            ) {
                recordFound = true;
                approved = res.data.isApproved ?? res.data.is_approved ?? res.data.isapproved;
                rejected = res.data.isRejected ?? res.data.is_rejected ?? res.data.isrejected;
                responseMsg = res.data.response;
            }

            // Convert to int if string
            if (typeof approved === "string") approved = parseInt(approved);
            if (typeof rejected === "string") rejected = parseInt(rejected);

            // Only block if found and has blocking conditions
            if (recordFound) {
                // 1. If rejected
                if (rejected === 1) {
                    toast.error("Your profile has been rejected by admin", {
                        position: "top-center",
                        autoClose: 5000
                    });
                    setLoadingApproval(false);
                    return;
                }
                
                // 2. If pending approval
                if (approved === 0) {
                    toast.warning("Your profile is currently under admin review", {
                        position: "top-center",
                        autoClose: 5000
                    });
                    setLoadingApproval(false);
                    return;
                }
                
                // 3. If there's a custom admin message (but don't block viewing if approved)
                if (responseMsg && responseMsg.trim() !== "") {
                    toast.info("📢 You have a new message from admin", {
                        position: "top-center",
                        autoClose: 5000,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true
                    });
                }

                // 4. If approved (1) or no blocking conditions, proceed to view
                if (approved === 1) {
                    setShowProfile(true);
                }
            } else {
                // No record found: proceed as "approved" (new user)
                setShowProfile(true);
            }

        } catch (error) {
            console.error("Approval API error:", error);
            toast.error("Error checking approval status. Try again later.");
            setShowProfile(false);
        }
        setLoadingApproval(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Header with View/Edit Profile Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h4 className="text-2xl font-bold">Profile Details</h4>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    {/* Mandatory Fields Notice */}
                    {!showProfile && (
                        <div className="text-sm">
                            <p className="m-0 text-gray-700">
                                <span className="text-red-500 font-bold">★ </span>
                                Fields highlighted are mandatory to fill
                            </p>
                        </div>
                    )}

                    {/* View/Edit Profile Button */}
                    <div>
                        {showProfile ? (
                            <button
                                className="px-6 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:opacity-90 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                onClick={() => setShowProfile(false)}
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <button
                                className="px-6 py-2.5 bg-gradient-brand text-white font-medium rounded-lg hover:opacity-90 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                onClick={handleViewProfile}
                                disabled={loadingApproval}
                            >
                                {loadingApproval ? "Checking..." : "View Profile"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Content */}
            {showProfile ? (
                <ViewProfile />
            ) : (
                <FormInfoBox setShowProfile={setShowProfile} />
            )}
        </div>
    );
};

export default MyProfileComponent;
