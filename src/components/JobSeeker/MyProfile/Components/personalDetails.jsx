import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaChevronDown, FaCheckSquare } from "react-icons/fa";
import { getAuth, updateEmail } from "firebase/auth";
import ImageUpload from "../../../../services/ImageUpload";
import WheelDatePicker from "../../../../utils/WheelDatePicker";
import InputWithTooltip from "../../../../services/InputWithTooltip";

const PersonalDetails = forwardRef(({ className, dateOfBirth, photo }, ref) => {
  PersonalDetails.displayName = 'PersonalDetails';
  const { user } = useAuth();
  const currentUid = user?.uid;
  const dataFetched = useRef(false); // Track if data has been fetched from API

  const isGoogleAccount =
    user?.is_google_account === 1 ||
    (user?.providerData?.some((p) => p.providerId === "google.com"));

  const API_BASE = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev";
  const APPROVAL_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
  const OTP_API = "https://hmpffcv3r3.execute-api.ap-south-1.amazonaws.com/dev";
  const MSG91_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev";
  const IMAGE_API_URL =
    "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  const [formData, setFormData] = useState({
    firebase_uid: "",
    fullName: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    callingNumber: "",
    whatsappNumber: "",
  });

  // Track previous user UID to detect user changes
  const previousUserUidRef = useRef(null);

  // Initialize form data when user becomes available (only once)
  useEffect(() => {
    // Detect user change
    const userChanged = previousUserUidRef.current && previousUserUidRef.current !== currentUid;
    
    // Clear form data if user changes (different firebase_uid)
    if (userChanged || (user && currentUid && formData.firebase_uid && formData.firebase_uid !== currentUid)) {
      dataFetched.current = false;
      setFormData({
        firebase_uid: "",
        fullName: "",
        email: "",
        gender: "",
        dateOfBirth: "",
        callingNumber: "",
        whatsappNumber: "",
      });
      setEmailVerified(false);
      setPhoneVerified(false);
      setProfilePicId(null);
      setProfileImageName("");
      previousUserUidRef.current = currentUid;
      return; // Exit early to re-trigger initialization on next render
    }
    
    // Only initialize if we haven't fetched data from API yet
    // CRITICAL: Double-check dataFetched hasn't changed during async operations
    if (user && currentUid && !formData.firebase_uid && !dataFetched.current) {
      // Fetch email from login API if not available in user object
      const initializeFormData = async () => {
        // Double-check dataFetched hasn't changed (API might have completed)
        if (dataFetched.current) {
          return; // Don't overwrite API data
        }
        
        let emailToUse = user.email || "";
        
        // If email is missing, fetch from login API
        if (!emailToUse) {
          try {
            const token = localStorage.getItem("token");
            const loginResp = await axios.get(`${API_BASE}/login`, {
              params: { firebase_uid: currentUid },
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            if (loginResp.data && Array.isArray(loginResp.data) && loginResp.data.length > 0) {
              const loginUser = loginResp.data.find(u => u.firebase_uid === currentUid) || loginResp.data[0];
              emailToUse = loginUser.email || "";
            }
          } catch (err) {
            // Silent fail
          }
        }
        
        // Final check before setting - make sure API hasn't fetched data
        if (dataFetched.current) {
          return; // Don't overwrite API data
        }
        
        setFormData({
          firebase_uid: currentUid,
          fullName: user.name || "",
          email: emailToUse,
          gender: "", // Will be set by API fetch
          dateOfBirth: "", // Will be set by API fetch
          callingNumber: user.phone_number || "",
          whatsappNumber: "", // Will be set by API fetch
        });
        
        // Set email as verified for Google accounts
        if (isGoogleAccount) {
          setEmailVerified(true);
        }
      };
      
      initializeFormData();
      previousUserUidRef.current = currentUid;
    }
  }, [user, currentUid, formData.firebase_uid, isGoogleAccount]);

  // Update form data when user data changes (for cases where user data updates after initialization)
  // But only if we haven't fetched data from API yet
  useEffect(() => {
    if (user && currentUid && formData.firebase_uid && !formData.email && user.email && !dataFetched.current) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        fullName: user.name || prev.fullName,
        callingNumber: user.phone_number || prev.callingNumber,
      }));
    }
  }, [user, currentUid, formData.firebase_uid, formData.email]);

  const [imageFile, setImageFile] = useState(null);
  const [profilePicId, setProfilePicId] = useState(null);
  const [profileImageName, setProfileImageName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(isGoogleAccount);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
  const [showPhoneOtpInput, setShowPhoneOtpInput] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [sameAsCallingNumber, setSameAsCallingNumber] = useState(false);

  const [approvalExists, setApprovalExists] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    if (!currentUid) return;
    
    // Reset dataFetched flag when user changes
    const userChanged = previousUserUidRef.current && previousUserUidRef.current !== currentUid;
    if (userChanged) {
      dataFetched.current = false;
      previousUserUidRef.current = currentUid;
    }
    
    // Don't fetch if already fetched for this user
    if (dataFetched.current) {
      return;
    }
    
    try {
      const resp = await axios.get(`${API_BASE}/personal`, {
        params: { firebase_uid: currentUid, t: Date.now() },
        ...authHeaders,
      });

      if (resp.status === 200 && resp.data && resp.data.length > 0) {
        // Handle array response - take first item if array
        let records = resp.data;
        if (Array.isArray(records) && records.length === 0) {
          dataFetched.current = true;
          return;
        }
        
        // Find the record for the current user (in case backend returns multiple)
        let u = records.find(record => record.firebase_uid === currentUid);
        
        // If not found by firebase_uid, don't use data from wrong user
        if (!u) {
          dataFetched.current = true;
          return;
        }
        
        // Verify user hasn't changed during fetch
        if (!user?.uid || user.uid !== currentUid) {
          return;
        }
        
        // Ensure email falls back to user.email if database email is empty/null/undefined
        const dbEmail = u.email?.trim() || "";
        const finalEmail = dbEmail || user?.email || "";
        const dbName = u.fullName?.trim() || "";
        const finalName = dbName || user?.name || "";
        const dbPhone = u.callingNumber?.trim() || "";
        const finalPhone = dbPhone || user?.phone_number || "";
        
        // If email is still empty, fetch from login API
        let emailFromLogin = finalEmail || user?.email || "";
        if (!emailFromLogin) {
          try {
            const token = localStorage.getItem("token");
            const loginResp = await axios.get(`${API_BASE}/login`, {
              params: { firebase_uid: currentUid },
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            if (loginResp.data && Array.isArray(loginResp.data) && loginResp.data.length > 0) {
              const loginUser = loginResp.data.find(u => u.firebase_uid === currentUid) || loginResp.data[0];
              emailFromLogin = loginUser.email || "";
            }
          } catch (err) {
            console.warn("Failed to fetch email from login API:", err);
          }
        }
        
        // Verify user hasn't changed before setting state
        if (!user?.uid || user.uid !== currentUid) {
          return;
        }
        
        setFormData(prev => {
          // After API response, ensure email comes from login API or user.email if database email is empty
          const emailToUse = emailFromLogin || prev.email || "";
          const nameToUse = finalName || user?.name || prev.fullName || "";
          const phoneToUse = finalPhone || user?.phone_number || prev.callingNumber || "";
          
          // For gender, use database value if it exists and is not empty
          let genderToUse = "";
          // Check multiple possible field names (case-insensitive)
          const genderValue = u.gender !== undefined ? u.gender : 
                             u.Gender !== undefined ? u.Gender : 
                             u.GENDER !== undefined ? u.GENDER : 
                             null;
          
          // More lenient check - accept any truthy value or explicit string (even if empty-looking)
          if (genderValue !== undefined && genderValue !== null) {
            const genderStr = String(genderValue).trim();
            if (genderStr !== "" && genderStr !== "null" && genderStr !== "undefined") {
              // Normalize gender to lowercase to match dropdown options (male, female, transgender)
              const normalizedGender = genderStr.toLowerCase();
              // Map common variations to valid options
              if (normalizedGender === "male" || normalizedGender === "m" || normalizedGender === "1") {
                genderToUse = "male";
              } else if (normalizedGender === "female" || normalizedGender === "f" || normalizedGender === "2") {
                genderToUse = "female";
              } else if (normalizedGender === "transgender" || normalizedGender === "trans" || normalizedGender === "t" || normalizedGender === "3") {
                genderToUse = "transgender";
              } else if (normalizedGender === "male" || normalizedGender === "female" || normalizedGender === "transgender") {
                // Already in correct format
                genderToUse = normalizedGender;
              } else {
                genderToUse = normalizedGender; // Use as-is if it matches one of the options
              }
            }
          }
          
          // If still empty, try previous value
          if (!genderToUse && prev.gender) {
            genderToUse = prev.gender.toLowerCase().trim();
          }
          
          // For WhatsApp number, use database value if it exists
          // Check multiple possible field names (case-insensitive)
          const whatsappValue = u.whatsappNumber !== undefined ? u.whatsappNumber : 
                               u.WhatsAppNumber !== undefined ? u.WhatsAppNumber : 
                               u.whatsapp_number !== undefined ? u.whatsapp_number : 
                               u.WhatsApp_Number !== undefined ? u.WhatsApp_Number :
                               null;
          
          let whatsappToUse = "";
          // More lenient check - accept any truthy value or explicit string
          if (whatsappValue !== undefined && whatsappValue !== null) {
            const whatsappStr = String(whatsappValue).trim();
            if (whatsappStr !== "" && whatsappStr !== "null" && whatsappStr !== "undefined") {
              whatsappToUse = whatsappStr;
            }
          }
          
          // If still empty, try previous value
          if (!whatsappToUse && prev.whatsappNumber) {
            whatsappToUse = prev.whatsappNumber;
          }
          
          return {
            firebase_uid: currentUid,
            fullName: nameToUse,
            email: emailToUse,
            gender: genderToUse,
            dateOfBirth: u.dateOfBirth || prev.dateOfBirth || "",
            callingNumber: phoneToUse,
            whatsappNumber: whatsappToUse,
          };
        });
        
        setEmailVerified(isGoogleAccount || u.email_verify === 1);
        
        // Check database for phone verification
        const isPhoneVerified = u.phone_number_verify === 1;
        setPhoneVerified(isPhoneVerified);
        setIsNewUser(false);
        dataFetched.current = true;

        if (u.profilePicId) {
          setProfilePicId(u.profilePicId);
          let imageName = u.profileImageName;
          if (!imageName) {
            try {
              const storedData = localStorage.getItem(`profileImage_${currentUid}`);
              if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (parsedData.id === u.profilePicId && parsedData.name) {
                  imageName = parsedData.name;
                }
              }
            } catch (e) {
              console.error("Error reading from localStorage:", e);
            }
          }
          setProfileImageName(imageName || "Uploaded profile image");
          if (imageName) {
            localStorage.setItem(`profileImage_${currentUid}`, JSON.stringify({
              id: u.profilePicId,
              name: imageName,
            }));
          }
        }
      }

      // Approval fetch
      try {
        const approvalResp = await axios.get(APPROVAL_API, {
          params: { firebase_uid: currentUid, t: Date.now() },
          ...authHeaders,
        });
        setApprovalExists(Array.isArray(approvalResp.data) && approvalResp.data.length > 0);
      } catch (err) {
        setApprovalExists(false);
      }

    } catch (e) {
      console.error("Error fetching user details:", e);
    }
  }, [currentUid, isGoogleAccount, user]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);



  // Auto-populate WhatsApp number when "same as calling number" is checked
  useEffect(() => {
    if (sameAsCallingNumber && formData.callingNumber) {
      setFormData((prev) => ({
        ...prev,
        whatsappNumber: prev.callingNumber,
      }));
    }
  }, [sameAsCallingNumber]);

  const [dateType, setDateType] = useState("text");
  const handleFocusDate = () => setDateType("date");
  const handleBlurDate = (e) => !e.target.value && setDateType("text");

  const [whatsappType, setWhatsappType] = useState("text");
  const [showWhatsappHint, setShowWhatsappHint] = useState(false);
  const handleFocusWhatsapp = () => {
    setWhatsappType("text");
    setShowWhatsappHint(true);
  };
  const handleBlurWhatsapp = (e) => {
    !e.target.value && setWhatsappType("text");
    setShowWhatsappHint(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (!isGoogleAccount && name === "email" && value !== formData.email) {
      setEmailVerified(false);
      setShowEmailOtpInput(false);
      setEmailOtp("");
    }
    if (name === "whatsappNumber" && sameAsCallingNumber) {
      setSameAsCallingNumber(false);
    }
    
    // Normalize gender to lowercase for consistency
    const normalizedValue = name === "gender" ? value.toLowerCase().trim() : value;
    
    setFormData((p) => ({ ...p, [name]: normalizedValue }));
    setValidationErrors((p) => ({ ...p, [name]: undefined }));
  };

  const fileToBase64 = (file) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
    });

  const handlePhotoUpload = async (file) => {
    if (!file || !currentUid) return;
    try {
      setUploading(true);
      toast.info("Uploading photo...");
      const b64 = await fileToBase64(file);
      const res = await axios.post(
        IMAGE_API_URL,
        {
          file: b64,
          fileType: file.type,
          firebase_uid: currentUid,
          fileName: file.name,
        },
        authHeaders
      );
      if (res.data.id) {
        setProfilePicId(res.data.id);
        setProfileImageName(file.name);
        localStorage.setItem(`profileImage_${currentUid}`, JSON.stringify({
          id: res.data.id,
          name: file.name,
        }));
        toast.success("Photo uploaded successfully!");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error("Photo upload failed");
      setImageFile(null);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (currentUid) {
      // Clear profile pic state first
      if (profilePicId && formData.firebase_uid && formData.firebase_uid !== currentUid) {
        setProfilePicId(null);
        setProfileImageName("");
      }
      
      // Then load for current user
      if (!profilePicId) {
        const storedImageData = localStorage.getItem(`profileImage_${currentUid}`);
        if (storedImageData) {
          try {
            const { id, name } = JSON.parse(storedImageData);
            setProfilePicId(id);
            setProfileImageName(name);
          } catch (e) {
            console.error("Error parsing stored image data", e);
          }
        }
      }
    }
  }, [currentUid, profilePicId, formData.firebase_uid]);

  const checkDuplicates = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/personal`, {
        params: {
          email: formData.email,
          callingNumber: formData.callingNumber,
          whatsappNumber: formData.whatsappNumber,
          t: Date.now(),
        },
        ...authHeaders,
      });
      if (resp.status === 200 && Array.isArray(resp.data)) {
        const others = resp.data.filter((r) => r.firebase_uid !== currentUid);
        if (others.some((r) => r.email?.toLowerCase() === formData.email.toLowerCase())) {
          toast.error("Email already in use");
          return true;
        }
        if (others.some((r) => r.callingNumber === formData.callingNumber)) {
          toast.error("Mobile number already in use");
          return true;
        }
        if (others.some((r) => r.whatsappNumber === formData.whatsappNumber)) {
          toast.error("Mobile number already in use");
          return true;
        }
      }
    } catch (e) {
      console.error("Error checking duplicates:", e);
    }
    return false;
  };

  const sendEmailOtp = async (e) => {
    e.preventDefault();
    if (isGoogleAccount) {
      setEmailVerified(true);
      return;
    }
    setIsEmailVerifying(true);
    
    const requestData = { 
      email: formData.email,
      firebase_uid: currentUid 
    };
    
    try {
      const response = await axios.post(
        `${OTP_API}/otp/create`,
        requestData,
        authHeaders
      );
      toast.success("OTP sent to your email!");
      setShowEmailOtpInput(true);
    } catch (e) {
      console.error("❌ OTP Error Details:", {
        message: e.message,
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        requestData: requestData
      });
      
      toast.error(`Failed to send email OTP: ${e.message}`);
    } finally {
      setIsEmailVerifying(false);
    }
  };

  const verifyEmailOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${OTP_API}/otp/verify`,
        { email: formData.email, otp: emailOtp, firebase_uid: currentUid },
        authHeaders
      );
      
      let firebaseUpdateSuccess = true;
      try {
        const fbAuth = getAuth();
        await updateEmail(fbAuth.currentUser, formData.email);
      } catch (fbErr) {
        console.warn("Firebase update error:", fbErr.message);
        firebaseUpdateSuccess = false;
        
        // Handle specific Firebase errors without redirecting
        if (fbErr.code === "auth/requires-recent-login") {
          toast.warning("Email updated in our system. You may need to re-login later to update Firebase authentication.");
        } else if (fbErr.code === "auth/email-already-in-use") {
          toast.warning("Email updated in our system. This email might already be in use by another Firebase account.");
        } else {
          toast.warning("Email updated in our system. Firebase update failed but your data is saved.");
        }
      }
      
      // Update personal details with complete data
      const personalPayload = {
        ...formData,
        firebase_uid: currentUid,
        emailVerified: true,
        profilePicId: profilePicId || "",
        profileImageName: profileImageName || "",
      };
      
      await axios.put(
        `${API_BASE}/personal`,
        personalPayload,
        authHeaders
      );
      
      await axios.put(
        `${API_BASE}/login`,
        {
          firebase_uid: currentUid,
          email: formData.email,
          name: formData.fullName,
          phone_number: formData.callingNumber,
        },
        authHeaders
      );
      
      // Show success message based on Firebase update status
      if (firebaseUpdateSuccess) {
        toast.success("Email updated and verified successfully!");
      } else {
        toast.success("Email updated in our system successfully!");
      }
      
      setEmailVerified(true);
      setShowEmailOtpInput(false);
      setEmailOtp(""); // Clear the OTP input
    } catch (e) {
      console.error("OTP verify error:", e);
      console.error("Error response data:", e.response?.data);
      console.error("Error status:", e.response?.status);
      if (e.response?.status === 409) {
        toast.error("Email verification failed: Email might already be in use by another account");
      } else {
        toast.error("OTP verification failed");
      }
    }
  };

  const sendPhoneOtp = async (e) => {
    e.preventDefault();
    if (formData.callingNumber.length !== 10) {
      toast.error("Enter a valid 10-digit number");
      return;
    }
    
    setIsPhoneVerifying(true);
    const mobileWithCountryCode = `91${formData.callingNumber}`;
    
    try {
      const response = await axios.post(
        `${MSG91_API}/otp/send`,
        {
          mobile: mobileWithCountryCode,
          expiry: "10",
          via: "sendotp"
        },
        authHeaders
      );
      
      toast.success("OTP sent to your phone!");
      setShowPhoneOtpInput(true);
    } catch (e) {
      console.error("❌ Phone OTP Error:", e);
      toast.error(`Failed to send phone OTP: ${e.message}`);
    } finally {
      setIsPhoneVerifying(false);
    }
  };

  const verifyPhoneOtp = async (e) => {
    e.preventDefault();
    if (!phoneOtp || phoneOtp.length < 4) {
      toast.error("Enter a valid OTP");
      return;
    }
    
    const mobileWithCountryCode = `91${formData.callingNumber}`;
    
    try {
      const response = await axios.post(
        `${MSG91_API}/otp/verify`,
        {
          mobile: mobileWithCountryCode,
          otp: phoneOtp,
          firebase_uid: currentUid
        },
        authHeaders
      );
      
      // Check if the OTP verification was successful
      if (response.data && response.data.ok === true && response.data.provider && response.data.provider.type === 'success') {
        // OTP verification successful
        toast.success("Phone verified successfully!");
        setPhoneVerified(true);
        setShowPhoneOtpInput(false);
        setPhoneOtp(""); // Clear the OTP input
        
        // Update the phone verification status in the database
        try {
          const updatePayload = {
            ...formData,
            firebase_uid: currentUid,
            phone_number_verify: 1  // Use the actual database column name
          };
          
          await axios.put(
            `${API_BASE}/personal`,
            updatePayload,
            authHeaders
          );
          
          // Add a small delay to ensure database update is committed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh user details to ensure verification status is loaded
          await fetchUserDetails();
        } catch (updateErr) {
          console.error("❌ Failed to update phone verification status:", {
            error: updateErr.message,
            status: updateErr.response?.status,
            data: updateErr.response?.data
          });
          
          // If database update fails, show error to user
          toast.error("Phone verification failed to save. Please try again.");
        }
      } else {
        // OTP verification failed
        toast.error("Invalid OTP. Please try again.");
        setPhoneOtp(""); // Clear the OTP input for retry
      }
    } catch (e) {
      console.error("❌ Phone OTP Verification Error:", e);
      if (e.response?.status === 400) {
        toast.error("Invalid OTP. Please try again.");
      } else {
        toast.error(`Phone OTP verification failed: ${e.message}`);
      }
      setPhoneOtp(""); // Clear the OTP input for retry
    }
  };

  const validateFields = () => {
    const errors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^[6-9]\d{9}$/;
    if (!formData.fullName.trim() || formData.fullName.length < 3) {
      errors.fullName = "Full name must be at least 3 characters";
    }
    if (!emailRe.test(formData.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!formData.gender) {
      errors.gender = "Select your gender";
    }
    if (!phoneRe.test(formData.callingNumber)) {
      errors.callingNumber = "Invalid mobile number";
    }
    if (!phoneRe.test(formData.whatsappNumber)) {
      errors.whatsappNumber = "Invalid WhatsApp number";
    }
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };
  useImperativeHandle(ref, () => ({
    validateFields: () => {
      const errors = [];
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRe = /^[6-9]\d{9}$/;
      
      // Validate full name
      if (!formData?.fullName?.trim() || formData.fullName.length < 3) {
        errors.push("Full name must be at least 3 characters");
      }
      
      // Validate email
      if (!formData?.email) {
        errors.push("Email is required");
      } else if (!emailRe.test(formData.email)) {
        errors.push("Enter a valid email address");
      }
      
      // Validate gender
      // if (!formData?.gender) {
      //   errors.push("Select your gender");
      // }
      
      // Validate phone numbers
      if (!formData?.callingNumber) {
        errors.push("Mobile number is required");
      } else if (!phoneRe.test(formData.callingNumber)) {
        errors.push("Invalid mobile number - must be 10 digits starting with 6-9");
      }
      
      if (!formData?.whatsappNumber) {
        errors.push("WhatsApp number is required");
      } else if (!phoneRe.test(formData.whatsappNumber)) {
        errors.push("Invalid WhatsApp number - must be 10 digits starting with 6-9");
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    },
    
    saveData: async () => {
      if (!currentUid) {
        throw new Error("No user is logged in");
      }

      // Phone validation
      const phoneRe = /^[6-9]\d{9}$/;
      if (!phoneRe.test(formData.callingNumber) || !phoneRe.test(formData.whatsappNumber)) {
        throw new Error("Invalid phone number(s)");
      }

      // Check for duplicates
      if (await checkDuplicates()) {
        throw new Error("Duplicate email or phone number found");
      }

      // Check if photo upload is in progress
      if (uploading) {
        throw new Error("Please wait for photo upload to complete");
      }

      // Handle photo upload if needed
      if (imageFile && !profilePicId) {
        try {
          await handlePhotoUpload(imageFile);
        } catch (err) {
          throw new Error("Photo upload failed");
        }
      }

      // Validate required fields before sending
      if (!formData.fullName?.trim()) {
        throw new Error("Full name is required");
      }
      if (!formData.email?.trim()) {
        throw new Error("Email is required");
      }
      if (!formData.gender) {
        throw new Error("Gender is required");
      }
      if (!formData.callingNumber?.trim()) {
        throw new Error("Mobile number is required");
      }
      if (!formData.whatsappNumber?.trim()) {
        throw new Error("WhatsApp number is required");
      }

      const payload = {
        ...formData,
        firebase_uid: currentUid,
        emailVerified: isGoogleAccount || emailVerified,
        phone_number_verify: phoneVerified ? 1 : 0,  // Include phone verification status
        profilePicId: profilePicId || "",
        profileImageName: profileImageName || "",
        fileName: profileImageName || "",
      };

      try {
        const method = isNewUser ? axios.post : axios.put;
        await method(`${API_BASE}/personal`, payload, authHeaders);
        
        const loginPayload = {
          firebase_uid: currentUid,
          email: formData.email,
          name: formData.fullName,
          phone_number: formData.callingNumber,
        };
        
        try {
          await axios.put(
            `${API_BASE}/login`,
            loginPayload,
            authHeaders
          );
        } catch (loginError) {
          // Don't throw error for login update failure - it's not critical for form save
        }
        
        // Approval logic after save
        await handleApprovalStatus();
        
        return { success: true };
      } catch (error) {
        console.error("❌ Save error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          payload: payload
        });
        
        // Provide more specific error messages
        if (error.response?.status === 500) {
          throw new Error("Server error occurred. Please check your data and try again.");
        } else if (error.response?.status === 400) {
          throw new Error(error.response?.data?.message || "Invalid data provided");
        } else if (error.response?.status === 401) {
          throw new Error("Authentication failed. Please login again.");
        } else {
          throw new Error(error.response?.data?.message || error.message);
        }
      }
    }
  }));

  const handleApprovalStatus = async () => {
    try {
      if (!currentUid) return;
      if (!approvalExists) {
        // Create new record, all fields 0/empty
        await axios.post(
          APPROVAL_API,
          {
            firebase_uid: currentUid,
            isApproved: 0,
            isRejected: 0,
            response: "",
            profile_updated: 0,
            education_updated: 0,
            additionalDetails_updated: 0,
            profile_image_updated: 0,
          },
          authHeaders
        );
        setApprovalExists(true);
      } else {
        // Update for edit, profile_updated: 1, rest 0/empty
        await axios.put(
          APPROVAL_API,
          {
            firebase_uid: currentUid,
            isApproved: 0,
            isRejected: 0,
            response: "",
            profile_updated: 1,
            education_updated: 0,
            additionalDetails_updated: 0,
            profile_image_updated: 0,
          },
          authHeaders
        );
      }
    } catch (err) {
      // Do nothing, silent fail
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUid) {
      toast.error("No user is logged in");
      return;
    }
    const phoneRe = /^[6-9]\d{9}$/;
    if (!phoneRe.test(formData.callingNumber) || !phoneRe.test(formData.whatsappNumber)) {
      toast.error("Invalid phone number(s)");
      return;
    }
    if (await checkDuplicates()) return;
    if (uploading) {
      toast.warning("Please wait for photo upload to complete");
      return;
    }
    if (imageFile && !profilePicId) {
      try {
        await handlePhotoUpload(imageFile);
      } catch (err) {
        return;
      }
    }
    const payload = {
      ...formData,
      firebase_uid: currentUid,
      emailVerified: isGoogleAccount || emailVerified,
      phone_number_verify: phoneVerified ? 1 : 0,  // Include phone verification status
      profilePicId: profilePicId || "",
      profileImageName: profileImageName || "",
      fileName: profileImageName || "",
    };
    setIsSaving(true);
    try {
      const method = isNewUser ? axios.post : axios.put;
      await method(`${API_BASE}/personal`, payload, authHeaders);
      toast.success("Personal details saved!");
      await axios.put(
        `${API_BASE}/login`,
        {
          firebase_uid: currentUid,
          email: formData.email,
          name: formData.fullName,
          phone_number: formData.callingNumber,
        },
        authHeaders
      );
      // Approval logic after save
      await handleApprovalStatus();
      fetchUserDetails();
    } catch (e) {
      console.error("Save error:", e);
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-lg p-4 md:p-6 bg-rose-100 ${className} overflow-x-hidden`}>
      <form onSubmit={handleSubmit} className="overflow-x-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
          {/* Full Name */}
          <div className="w-full min-w-0">
            <InputWithTooltip label="Full Name" required>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Full Name"
                required
                maxLength={50}
                className={`w-full px-4 py-3 rounded-lg border ${validationErrors.fullName ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 max-w-full`}
              />
            </InputWithTooltip>
            {validationErrors.fullName && (
              <span className="text-red-500 text-base mt-1 block leading-normal tracking-tight">{validationErrors.fullName}</span>
            )}
          </div>
          {/* Profile Image */}
          {photo && (
            <div className="w-full min-w-0">
              <InputWithTooltip label="Profile Image">
                <ImageUpload
                  imageFile={imageFile || profileImageName || ""}
                  onImageSelect={(file) => {
                    setImageFile(file);
                    handlePhotoUpload(file);
                  }}
                  placeholder="Upload your profile image"
                  id="upload-profile-image"
                />
              </InputWithTooltip>
            </div>
          )}
          {/* Email */}
          <div className="w-full min-w-0">
            <InputWithTooltip label="Email Id" required>
              <div className="relative max-w-full">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  maxLength={50}
                  required
                  disabled={isGoogleAccount || emailVerified}
                  className={`w-full px-3 md:px-4 py-3 rounded-lg border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100 max-w-full ${emailVerified ? 'pr-10 md:pr-12' : 'pr-14 md:pr-28'}`}
                />
                {emailVerified ? (
                  <span className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                    <FaCheckCircle className="text-green-500" size={18} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 px-1.5 py-1 md:px-4 md:py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-xs md:text-base font-medium shadow-sm transition-colors whitespace-nowrap leading-normal tracking-tight flex items-center justify-center min-w-[32px] md:min-w-0"
                    onClick={sendEmailOtp}
                    disabled={isEmailVerifying}
                  >
                    {isEmailVerifying ? (
                      <span className="hidden md:inline">Sending...</span>
                    ) : (
                      <>
                        <FaCheckSquare className="md:hidden" />
                        <span className="hidden md:inline">Verify</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </InputWithTooltip>
            {validationErrors.email && (
              <span className="text-red-500 text-base mt-1 block leading-normal tracking-tight">{validationErrors.email}</span>
            )}
            {showEmailOtpInput && !emailVerified && !isGoogleAccount && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                <input
                  type="text"
                  placeholder="Enter Email OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  maxLength={6}
                  className="flex-1 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-base"
                />
                <button 
                  type="button" 
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-sm sm:text-base font-medium shadow-sm transition-colors leading-normal tracking-tight whitespace-nowrap" 
                  onClick={verifyEmailOtp}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
          {/* Gender */}
          <div className="w-full min-w-0">
            <InputWithTooltip label="Gender">
              <div className="relative max-w-full">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none max-w-full"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <option value="" disabled>
                    Select Gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>
            </InputWithTooltip>
          </div>
          {/* Date of Birth - Wheel Picker */}
          {dateOfBirth && (
            <div className="w-full min-w-0">
              <InputWithTooltip label="Date of Birth">
                <WheelDatePicker
                  value={formData.dateOfBirth}
                  onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
                  placeholder="Select Date of Birth"
                />
              </InputWithTooltip>
            </div>
          )}
          {/* Calling Number */}
          <div className="w-full min-w-0">
            <InputWithTooltip label="Mobile Number" required>
              <div className="relative max-w-full">
                <input
                  type="text"
                  name="callingNumber"
                  value={formData.callingNumber}
                  onChange={handleInputChange}
                  placeholder="Mobile Number"
                  onInput={(e) => (e.target.value = e.target.value.replace(/[^0-9]/g, ""))}
                  maxLength={10}
                  minLength={10}
                  required
                  disabled={phoneVerified}
                  className={`w-full px-3 md:px-4 py-3 rounded-lg border ${validationErrors.callingNumber ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100 max-w-full ${phoneVerified ? 'pr-10 md:pr-12' : 'pr-14 md:pr-28'}`}
                />
                {phoneVerified ? (
                  <span className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                    <FaCheckCircle className="text-green-500" size={18} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 px-1.5 py-1 md:px-4 md:py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-xs md:text-base font-medium shadow-sm transition-colors whitespace-nowrap leading-normal tracking-tight flex items-center justify-center min-w-[32px] md:min-w-0"
                    onClick={sendPhoneOtp}
                    disabled={isPhoneVerifying}
                  >
                    {isPhoneVerifying ? (
                      <span className="hidden md:inline">Sending...</span>
                    ) : (
                      <>
                        <FaCheckSquare className="md:hidden" />
                        <span className="hidden md:inline">Verify</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </InputWithTooltip>
            {validationErrors.callingNumber && (
              <span className="text-red-500 text-base mt-1 block leading-normal tracking-tight">{validationErrors.callingNumber}</span>
            )}
            {showPhoneOtpInput && !phoneVerified && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                <input
                  type="text"
                  placeholder="Enter Phone OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  maxLength={6}
                  className="flex-1 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-base"
                />
                <div className="flex gap-2 sm:gap-3">
                  <button 
                    type="button" 
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-sm sm:text-base font-medium shadow-sm transition-colors leading-normal tracking-tight whitespace-nowrap" 
                    onClick={verifyPhoneOtp}
                  >
                    Submit
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-sm sm:text-base font-medium shadow-sm transition-colors leading-normal tracking-tight whitespace-nowrap" 
                    onClick={sendPhoneOtp}
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Checkbox for same number */}
          <div className="w-full md:col-span-2 mb-0">
            <label className="flex items-center gap-3 mb-0">
              <input
                type="checkbox"
                checked={sameAsCallingNumber}
                onChange={(e) => setSameAsCallingNumber(e.target.checked)}
                className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-300"
              />
              <span className="text-base text-gray-700 leading-normal tracking-tight">WhatsApp Number same as Mobile Number</span>
            </label>
          </div>
          {/* WhatsApp Number */}
          <div className="w-full min-w-0 -mt-2">
            <InputWithTooltip label="WhatsApp Number" required>
              <input
                type={whatsappType}
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleInputChange}
                onFocus={handleFocusWhatsapp}
                onBlur={handleBlurWhatsapp}
                placeholder="WhatsApp Number"
                onInput={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  e.target.value = v.length <= 10 ? v : v.slice(0, 10);
                }}
                required
                disabled={sameAsCallingNumber}
                className={`w-full px-4 py-3 rounded-lg border ${validationErrors.whatsappNumber ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100 max-w-full`}
              />
            </InputWithTooltip>
            {validationErrors.whatsappNumber && (
              <span className="text-red-500 text-base mt-1 block leading-normal tracking-tight">{validationErrors.whatsappNumber}</span>
            )}
          </div>
          {/* {showWhatsappHint && <small>Calling and WhatsApp numbers can be the same</small>} */}
          {/* Save button hidden - auto-save handles saving when clicking Next */}
        </div>
      </form>
    </div>
  );
});

PersonalDetails.propTypes = {
  className: PropTypes.string,
  dateOfBirth: PropTypes.bool,
  photo: PropTypes.bool,
};

export default PersonalDetails;