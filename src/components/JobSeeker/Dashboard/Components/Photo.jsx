import { React, useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";
import { getDefaultAvatar, handleImageError } from "../../../../utils/Avatar";
import { Skeleton, Box } from "@mui/material";

const Photo = () => {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  const [personalData, setPersonalData] = useState(null);

  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PERSONAL_DETAILS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";

  useEffect(() => {
    if (user?.uid) {
      fetchUserDetails();
      fetchProfilePhoto();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };

      const response = await axios.get(PERSONAL_DETAILS_API, {
        params: { firebase_uid: user.uid },
        ...authHeaders,
      });

      if (response.data && response.data.length > 0) {
        const userData = response.data[0];
        setPersonalData(userData);
        setUserGender(userData.gender);
        // Extract candidate ID from the response
        if (userData.id) {
          setCandidateId(userData.id);
        }
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Don't show error toast for gender fetch failure as it's not critical
    }
  };

  const fetchProfilePhoto = async () => {
    try {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      const params = { firebase_uid: user.uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });

      if (data?.url) {
        setPhotoUrl(data.url);
        setError(false);
      }
    } catch (error) {
      console.error("Error fetching profile photo:", error);
      setError(true);
      if (error.response?.status !== 404) {
        toast.error("Error loading profile photo");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageLoadError = (e) => {
    setError(true);
    handleImageError(e, userGender);
  };

  const getDefaultAvatarForUser = () => {
    return getDefaultAvatar(userGender);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3">
      {isLoading ? (
        <Box className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
          {/* Profile Photo Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton 
              variant="circular" 
              width={112} 
              height={112} 
              className="sm:w-28 sm:h-28 w-20 h-20"
            />
          </div>

          {/* Profile Info Skeleton */}
          <Box className="flex-grow text-center sm:text-left space-y-1">
            <Skeleton 
              variant="text" 
              width="70%" 
              height={32}
              className="mx-auto sm:mx-0"
            />
            <Skeleton 
              variant="text" 
              width="50%" 
              height={20}
              className="mx-auto sm:mx-0"
            />
            <Skeleton 
              variant="text" 
              width="45%" 
              height={20}
              className="mx-auto sm:mx-0"
            />
          </Box>
        </Box>
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <img
              src={error || !photoUrl ? getDefaultAvatarForUser() : photoUrl}
              alt={`${user?.displayName || 'User'}'s profile`}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover"
              onError={handleImageLoadError}
            />
          </div>

          {/* Profile Info */}
          <div className="flex-grow text-center sm:text-left min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 mb-0.5">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 break-words overflow-wrap-anywhere">
                  {personalData?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User Name'}
                </h2>
              </div>
              {candidateId && (
                <div className="text-sm sm:text-base text-gray-600 flex-shrink-0 mt-1 sm:mt-0 whitespace-nowrap">
                  ID: <span className="font-semibold text-gray-800">{candidateId}</span>
                </div>
              )}
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-0.5">
              {personalData?.designation || 'Teacher'}
            </p>
            <p className="text-sm sm:text-base text-gray-600">
              {personalData?.city_name || personalData?.city || 'Location'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photo;