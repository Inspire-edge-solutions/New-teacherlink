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
  const [organizationData, setOrganizationData] = useState(null);

  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PERSONAL_DETAILS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
  const ORGANIZATION_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";

  useEffect(() => {
    if (user?.uid) {
      fetchUserDetails();
      fetchProfilePhoto();
      fetchOrganizationDetails();
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
        setUserGender(response.data[0].gender);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchOrganizationDetails = async () => {
    try {
      if (!user?.uid) return;

      const authHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };

      const response = await axios.get(ORGANIZATION_API, {
        params: { firebase_uid: user.uid },
        ...authHeaders,
      });
      
      if (response.data) {
        const orgData = Array.isArray(response.data) ? response.data[0] : response.data;
        setOrganizationData(orgData);
      }
    } catch (error) {
      console.error("Error fetching organization details:", error);
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
    <div className="bg-white p-4 sm:p-6">
      {isLoading ? (
        <Box className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Profile Photo Skeleton */}
          <div className="flex-shrink-0">
            <Skeleton 
              variant="circular" 
              width={128} 
              height={128} 
              className="sm:w-32 sm:h-32 w-24 h-24"
            />
          </div>

          {/* Profile Info Skeleton */}
          <Box className="flex-grow text-center sm:text-left space-y-2">
            <Skeleton 
              variant="text" 
              width="60%" 
              height={32}
              className="mx-auto sm:mx-0"
            />
            <Skeleton 
              variant="text" 
              width="40%" 
              height={20}
              className="mx-auto sm:mx-0"
            />
            <Skeleton 
              variant="text" 
              width="35%" 
              height={20}
              className="mx-auto sm:mx-0"
            />
          </Box>
        </Box>
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <img
              src={error || !photoUrl ? getDefaultAvatarForUser() : photoUrl}
              alt={`${organizationData?.contact_person_name || 'User'}'s profile`}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover"
              onError={handleImageLoadError}
            />
          </div>

          {/* Profile Info */}
          <div className="flex-grow text-center sm:text-left min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-800 break-words overflow-wrap-anywhere leading-tight tracking-tight">
                  {organizationData?.contact_person_name || user?.displayName || 'User Name'}
                </h2>
              </div>
              {organizationData?.id && (
                <div className="text-lg sm:text-base text-gray-600 flex-shrink-0 mt-1 sm:mt-0 whitespace-nowrap leading-normal tracking-tight">
                  ID: <span className="font-semibold text-gray-800">{organizationData.id}</span>
                </div>
              )}
            </div>
            <p className="text-lg sm:text-base text-gray-600 mb-1 leading-normal tracking-tight">
              {organizationData?.type || 'Organization Type'}
            </p>
            <p className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
              {organizationData?.city || organizationData?.parent_city || 'City'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photo;