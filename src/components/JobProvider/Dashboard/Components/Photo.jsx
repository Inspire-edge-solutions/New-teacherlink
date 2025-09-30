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
  const [organizationId, setOrganizationId] = useState(null);

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
      // Don't show error toast for gender fetch failure as it's not critical
    }
  };

  const fetchOrganizationDetails = async () => {
    try {
      if (!user?.uid) return;

      const response = await axios.get(ORGANIZATION_API);
      
      if (response.data && Array.isArray(response.data)) {
        // Find the organization that matches the current user's firebase_uid
        const userOrg = response.data.find(org => org.firebase_uid === user.uid);
        
        if (userOrg && userOrg.id) {
          setOrganizationId(userOrg.id);
        }
      }
    } catch (error) {
      console.error("Error fetching organization details:", error);
      // Don't show error toast for organization fetch failure as it's not critical
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
      // Only show error toast for unexpected errors, not 404s (no image yet)
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
    <div className="col-lg-4 col-md-6">
      <div className="photo-container">
        {isLoading ? (
          <div className="photo-loading">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <span className="photo-loading-text">Loading photo...</span>
          </div>
        ) : error || !photoUrl ? (
          <div>
            <img
              src={getDefaultAvatarForUser()}
              alt={`${user?.name || 'User'}'s default avatar`}
              className="profile-photo"
              onError={handleImageLoadError}
            />
          </div>
        ) : (
          <div>
            <img
              src={photoUrl}
              alt={`${user?.name || 'User'}'s profile photo`}
              className="profile-photo"
              onError={handleImageLoadError}
            />
          </div>
        )}
        
        {organizationId ? (
          <div className="organization-id-container">
            <span className="organization-id-label">Organization ID:</span>
            <span className="organization-id-value">{organizationId}</span>
          </div>
        ) : !isLoading && (
          <div className="organization-id-container organization-id-pending">
            <span className="organization-id-label">Organization ID:</span>
            <span className="organization-id-pending-text">Complete profile to get ID</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Photo;
