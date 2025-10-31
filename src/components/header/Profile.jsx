import React, { useState, useEffect } from "react";
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

const Profile = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [anchorEl2, setAnchorEl2] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [userGender, setUserGender] = useState(null);
  const [personalData, setPersonalData] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [error, setError] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PERSONAL_DETAILS_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal";
  const ORGANIZATION_API = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";

  // Get user type from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = storedUser?.user_type;
  const isEmployer = userType === "Employer";

  useEffect(() => {
    if (user?.uid) {
      fetchUserDetails();
      fetchProfilePhoto();
      if (isEmployer) {
        fetchOrganizationDetails();
      }
    }
  }, [user, isEmployer]);

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
      if (!user?.uid) return;

      const params = { firebase_uid: user.uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });

      if (data?.url) {
        setPhotoUrl(data.url);
        setError(false);
      }
    } catch (error) {
      console.error("Error fetching profile photo:", error);
      setError(true);
    }
  };

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
    if (isEmployer) {
      return organizationData?.contact_person_name || user?.displayName || user?.email?.split('@')[0] || 'User Name';
    }
    return personalData?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User Name';
  };

  const getUserDesignation = () => {
    if (isEmployer) {
      return organizationData?.type || 'Organization';
    }
    return personalData?.designation || 'Teacher';
  };

  const getUserEmail = () => {
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
              >
                {getUserName()}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                {getUserDesignation()}
              </Typography>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                display="flex"
                alignItems="center"
                gap={1}
              >
                {/* <IconMail width={15} height={15} /> */}
                <MailIcon width={15} height={15} />
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
                sx={{ justifyContent: "flex-start" }}
              >
                Support
              </Button>
              <Button
                onClick={openChangePassword}
                startIcon={<MdLock />}
                variant="text"
                color="inherit"
                sx={{ justifyContent: "flex-start" }}
              >
                Change Password
              </Button>
              <Divider />
              <Button
                onClick={handlelogout}
                startIcon={<MdLogout />}
                variant="text"
                color="error"
                sx={{ justifyContent: "flex-start" }}
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

export default Profile;
