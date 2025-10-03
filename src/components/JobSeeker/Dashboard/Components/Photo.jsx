import { React, useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";
import { getDefaultAvatar, handleImageError } from "../../../../utils/Avatar";

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
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {/* ID Badge in top right */}
      {candidateId && (
        <div className="absolute top-6 right-6 text-sm text-gray-600">
          ID: <span className="font-semibold text-gray-800">{candidateId}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <img
              src={error || !photoUrl ? getDefaultAvatarForUser() : photoUrl}
              alt={`${user?.displayName || 'User'}'s profile`}
              className="w-32 h-32 rounded-full object-cover"
              onError={handleImageLoadError}
            />
          </div>

          {/* Profile Info */}
          <div className="flex-grow">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {personalData?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User Name'}
            </h2>
            <p className="text-gray-600 mb-1">
              {personalData?.designation || 'Teacher'}
            </p>
            <p className="text-gray-600">
              {personalData?.city_name || personalData?.city || 'Location'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photo;