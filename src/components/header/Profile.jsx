import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Menu,
  Avatar,
  Typography,
  Divider,
  Button,
  IconButton,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useNavigate } from "react-router-dom";
import { MailIcon } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { getDefaultAvatar, handleImageError } from "../../utils/Avatar";
import axios from "axios";
import { MdReport, MdLock, MdLogout } from "react-icons/md";
import SupportModal from "./SupportModal";
import ChangePasswordModal from "./ChangePasswordModal";

// Module-level cache to persist across component remounts
const profileDataCache = {
  fetchedUserId: null,
  isFetching: false,
  photoUrl: null,
  personalData: null,
  organizationData: null,
  userGender: null,
  error: false
};

const Profile = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [anchorEl2, setAnchorEl2] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(profileDataCache.photoUrl);
  const [userGender, setUserGender] = useState(profileDataCache.userGender);
  const [personalData, setPersonalData] = useState(profileDataCache.personalData);
  const [organizationData, setOrganizationData] = useState(profileDataCache.organizationData);
  const [error, setError] = useState(profileDataCache.error);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PERSONAL_DETAILS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
  const ORGANIZATION_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";

  // Stabilize user ID to prevent unnecessary effect runs
  const currentUserId = useMemo(() => {
    const uid = user?.uid;
    return (uid && typeof uid === 'string' && uid.trim() !== '') ? uid : null;
  }, [user?.uid]);

  // Get user type from localStorage (only for display, not for triggering fetches)
  const getIsEmployer = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return storedUser?.user_type === "Employer" || user?.user_type === "Employer";
    } catch {
      return user?.user_type === "Employer";
    }
  };

  // Fetch profile data only once when user.uid is available
  useEffect(() => {
    // Early return if no user ID
    if (!currentUserId) {
      // Reset if user logs out (only if we had a user before)
      if (profileDataCache.fetchedUserId !== null) {
        profileDataCache.fetchedUserId = null;
        profileDataCache.photoUrl = null;
        profileDataCache.personalData = null;
        profileDataCache.organizationData = null;
        profileDataCache.userGender = null;
        profileDataCache.error = false;
        setPhotoUrl(null);
        setPersonalData(null);
        setOrganizationData(null);
        setUserGender(null);
        setError(false);
      }
      return;
    }

    // Skip if this is the same user ID we've already processed
    if (profileDataCache.fetchedUserId === currentUserId) {
      // Restore cached data if component was remounted
      if (photoUrl !== profileDataCache.photoUrl) setPhotoUrl(profileDataCache.photoUrl);
      if (personalData !== profileDataCache.personalData) setPersonalData(profileDataCache.personalData);
      if (organizationData !== profileDataCache.organizationData) setOrganizationData(profileDataCache.organizationData);
      if (userGender !== profileDataCache.userGender) setUserGender(profileDataCache.userGender);
      if (error !== profileDataCache.error) setError(profileDataCache.error);
      return;
    }

    // Skip if already fetching
    if (profileDataCache.isFetching) {
      return;
    }

    // Mark as fetching to prevent concurrent calls
    profileDataCache.isFetching = true;
    // Update the cache immediately to prevent duplicate calls
    profileDataCache.fetchedUserId = currentUserId;
    const isEmployer = getIsEmployer();

    const fetchUserDetails = async () => {
      try {
        const authHeaders = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        };

        const response = await axios.get(PERSONAL_DETAILS_API, {
          params: { firebase_uid: currentUserId },
          ...authHeaders,
        });

        if (response.data && response.data.length > 0) {
          const userData = response.data[0];
          profileDataCache.personalData = userData;
          profileDataCache.userGender = userData.gender;
          setPersonalData(userData);
          setUserGender(userData.gender);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    const fetchOrganizationDetails = async () => {
      try {
        const authHeaders = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        };

        const response = await axios.get(ORGANIZATION_API, {
          params: { firebase_uid: currentUserId },
          ...authHeaders,
        });
        
        if (response.data) {
          const orgData = Array.isArray(response.data) ? response.data[0] : response.data;
          profileDataCache.organizationData = orgData;
          setOrganizationData(orgData);
        }
      } catch (error) {
        console.error("Error fetching organization details:", error);
      }
    };

    const fetchProfilePhoto = async () => {
      try {
        const params = { firebase_uid: currentUserId, action: "view" };
        const { data } = await axios.get(IMAGE_API_URL, { params });

        if (data?.url) {
          profileDataCache.photoUrl = data.url;
          profileDataCache.error = false;
          setPhotoUrl(data.url);
          setError(false);
        }
      } catch (error) {
        console.error("Error fetching profile photo:", error);
        profileDataCache.error = true;
        setError(true);
      }
    };

    // Fetch all data once
    Promise.all([
      fetchUserDetails(),
      fetchProfilePhoto(),
      isEmployer ? fetchOrganizationDetails() : Promise.resolve()
    ]).finally(() => {
      // Reset fetching flag
      profileDataCache.isFetching = false;
    });
  }, [currentUserId]); // Depend on memoized currentUserId only

  const handleImageLoadError = (e) => {
    setError(true);
    handleImageError(e, userGender);
  };

  const getProfileImageUrl = () => {
    if (error || !photoUrl) {
      return getDefaultAvatar(userGender);
    }
    return photoUrl;
  };

  const getUserName = () => {
    const isEmployer = getIsEmployer();
    if (isEmployer) {
      return organizationData?.contact_person_name || user?.displayName || user?.email?.split('@')[0] || 'User Name';
    }
    return personalData?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User Name';
  };

  const getUserDesignation = () => {
    const isEmployer = getIsEmployer();
    if (isEmployer) {
      return organizationData?.type || 'Organization';
    }
    return personalData?.designation || 'Teacher';
  };

  const getUserEmail = () => {
    const isEmployer = getIsEmployer();
    if (isEmployer) {
      return organizationData?.contact_person_email || personalData?.email || user?.email || 'email@example.com';
    }
    return personalData?.email || user?.email || 'email@example.com';
  };

  const handleClick2 = (event) => {
    setAnchorEl2(event.currentTarget);
  };  
  const handleClose2 = () => {
    setAnchorEl2(null);
  };
  const handlelogout = async() => {
   await logout();
   navigate("/");
  };

  const openSupport = () => {
    setAnchorEl2(null);
    setShowSupportModal(true);
  };

  const openChangePassword = () => {
    setAnchorEl2(null);
    setShowChangePasswordModal(true);
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === "object" && {
            color: "primary.main",
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
          src={getProfileImageUrl()}
          alt={getUserName()}
          sx={{
            width: 35,
            height: 35,
          }}
          imgProps={{
            onError: handleImageLoadError
          }}
        />
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        sx={{
          "& .MuiMenu-paper": {
            width: "360px",
          },
        }}
      >
        {/* <Scrollbar sx={{ height: "100%", maxHeight: "85vh" }}> */}
        <Box px={3} pb={3} pt={0}>
          <Stack direction="row" pt={2} pb={1} spacing={2} alignItems="center">
            <Avatar
              src={getProfileImageUrl()}
              alt={getUserName()}
              sx={{ width: 95, height: 95 }}
              imgProps={{
                onError: handleImageLoadError
              }}
            />
            <Box>
              <Typography
                variant="subtitle2"
                color="textPrimary"
                fontWeight={600}
                sx={{
                  lineHeight: '1.2',
                  letterSpacing: '0'
                }}
              >
                {getUserName()}
              </Typography>
              <Typography 
                variant="subtitle2" 
                color="textSecondary"
                sx={{
                  lineHeight: '1.4',
                  letterSpacing: '0'
                }}
              >
                {getUserDesignation()}
              </Typography>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                sx={{
                  lineHeight: '1.5',
                  letterSpacing: '0',
                  wordBreak: "break-word"
                }}
              >
                {getUserEmail()}
              </Typography>
            </Box>
          </Stack>
          <Divider />
          <Box mt={1}>
            <Stack spacing={1}>
              <Button
                onClick={openSupport}
                startIcon={<MdReport />}
                variant="text"
                color="inherit"
                sx={{ 
                  justifyContent: "flex-start",
                  lineHeight: '1.5',
                  letterSpacing: '0'
                }}
              >
                Support
              </Button>
              <Button
                onClick={openChangePassword}
                startIcon={<MdLock />}
                variant="text"
                color="inherit"
                sx={{ 
                  justifyContent: "flex-start",
                  lineHeight: '1.5',
                  letterSpacing: '0'
                }}
              >
                Change Password
              </Button>
              <Divider />
              <Button
                onClick={handlelogout}
                startIcon={<MdLogout />}
                variant="text"
                color="error"
                sx={{ 
                  justifyContent: "flex-start",
                  lineHeight: '1.5',
                  letterSpacing: '0'
                }}
              >
                Logout
              </Button>
            </Stack>
          </Box>
        </Box>
        {/* </Scrollbar> */}
      </Menu>
      <SupportModal 
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </Box>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(Profile);