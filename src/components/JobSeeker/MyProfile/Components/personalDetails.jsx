import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle } from "react-icons/fa";
import { getAuth, updateEmail } from "firebase/auth";
import "./profile-styles.css";
import ImageUpload from "../../../../services/ImageUpload";
import WheelDatePicker from "../../../../utils/WheelDatePicker";

const PersonalDetails = forwardRef(({ className, dateOfBirth, photo }, ref) => {
  PersonalDetails.displayName = 'PersonalDetails';
  const { user } = useAuth();
  const currentUid = user?.uid;

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

  // Initialize form data when user becomes available (only once)
  useEffect(() => {
    if (user && currentUid && !formData.firebase_uid) {
      console.log("🚀 Initializing form data with user:", {
        userEmail: user.email,
        userName: user.name,
        userPhone: user.phone_number,
        currentUid: currentUid,
        isGoogleAccount: isGoogleAccount
      });
      
      setFormData({
        firebase_uid: currentUid,
        fullName: user.name || "",
        email: user.email || "",
        gender: "",
        dateOfBirth: "",
        callingNumber: user.phone_number || "",
        whatsappNumber: "",
      });
      
      // Set email as verified for Google accounts
      if (isGoogleAccount) {
        setEmailVerified(true);
      }
    }
  }, [user, currentUid, formData.firebase_uid, isGoogleAccount]);

  // Update form data when user data changes (for cases where user data updates after initialization)
  useEffect(() => {
    if (user && currentUid && formData.firebase_uid && !formData.email && user.email) {
      console.log("🔄 Updating form data with user email:", user.email);
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
    try {
      const resp = await axios.get(`${API_BASE}/personal`, {
        params: { firebase_uid: currentUid, t: Date.now() },
        ...authHeaders,
      });

      if (resp.status === 200 && resp.data.length > 0) {
        const u = resp.data[0];
        setFormData({
          firebase_uid: currentUid,
          fullName: u.fullName || "",
          email: u.email || "",
          gender: u.gender || "",
          dateOfBirth: u.dateOfBirth || "",
          callingNumber: u.callingNumber || "",
          whatsappNumber: u.whatsappNumber || "",
        });
                 console.log("🔍 Database verification status:", {
           email_verify: u.email_verify,
           phone_number_verify: u.phone_number_verify,
           isGoogleAccount: isGoogleAccount
         });
         
         setEmailVerified(isGoogleAccount || u.email_verify === 1);
         
         // Check database for phone verification
         const isPhoneVerified = u.phone_number_verify === 1;
         
         console.log("🔍 Phone verification check:", {
           dbPhoneVerified: isPhoneVerified
         });
         
         setPhoneVerified(isPhoneVerified);
         setIsNewUser(false);

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
  }, [currentUid, isGoogleAccount]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);



  useEffect(() => {
    if (sameAsCallingNumber && formData.callingNumber) {
      setFormData((prev) => ({
        ...prev,
        whatsappNumber: prev.callingNumber,
      }));
    }
  }, [sameAsCallingNumber, formData.callingNumber]);

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
    setFormData((p) => ({ ...p, [name]: value }));
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
    if (currentUid && !profilePicId) {
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
  }, [currentUid, profilePicId]);

  const imageFileHandler = (e) => setImageFile(e.target.files[0]);
  const handleFileChange = (e) => {
    const placeholder = document.querySelector(".file-placeholder");
    placeholder && (placeholder.textContent = e.target.files[0]?.name || "Upload your profile image");
  };

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
    
    console.log("🔍 OTP Request Data:", requestData);
    console.log("🔍 OTP API URL:", `${OTP_API}/otp/create`);
    console.log("🔍 Auth Headers:", authHeaders);
    
    try {
      const response = await axios.post(
        `${OTP_API}/otp/create`,
        requestData,
        authHeaders
      );
      console.log("✅ OTP Response:", response.data);
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
      console.log("✅ Login endpoint updated successfully with name:", formData.fullName);
      
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
      
      console.log("✅ Phone OTP Response:", response.data);
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
      
      console.log("✅ Phone OTP Verification Response:", response.data);
      
      // Check if the OTP verification was successful
      if (response.data && response.data.ok === true && response.data.provider && response.data.provider.type === 'success') {
        // OTP verification successful
        toast.success("Phone verified successfully!");
        setPhoneVerified(true);
        setShowPhoneOtpInput(false);
        setPhoneOtp(""); // Clear the OTP input
        
        // Update the phone verification status in the database
        try {
          console.log("🔍 Phone verification successful - updating database");
          
          const updatePayload = {
            ...formData,
            firebase_uid: currentUid,
            phone_number_verify: 1  // Use the actual database column name
          };
          
          console.log("🔍 Updating phone verification in database:", updatePayload);
          
          const updateResponse = await axios.put(
            `${API_BASE}/personal`,
            updatePayload,
            authHeaders
          );
          console.log("✅ Phone verification status updated in database");
          console.log("🔍 Update Response:", updateResponse.data);
          
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
        console.log("❌ OTP verification failed:", response.data);
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

      console.log("🔍 Save Data Payload:", payload);
      console.log("🔍 API URL:", `${API_BASE}/personal`);
      console.log("🔍 Method:", isNewUser ? "POST" : "PUT");
      console.log("🔍 Auth Headers:", authHeaders);

      try {
        const method = isNewUser ? axios.post : axios.put;
        const response = await method(`${API_BASE}/personal`, payload, authHeaders);
        console.log("✅ Personal API Response:", response.data);
        
                 const loginPayload = {
           firebase_uid: currentUid,
           email: formData.email,
           name: formData.fullName,
           phone_number: formData.callingNumber,
         };
         
         console.log("🔍 Login Payload:", loginPayload);
         console.log("🔍 Login API URL:", `${API_BASE}/login`);
         
         try {
           const loginResponse = await axios.put(
             `${API_BASE}/login`,
             loginPayload,
             authHeaders
           );
           console.log("✅ Login API Response:", loginResponse.data);
         } catch (loginError) {
           console.warn("⚠️ Login update failed (non-critical):", {
             message: loginError.message,
             status: loginError.response?.status,
             data: loginError.response?.data,
             payload: loginPayload
           });
           // Don't throw error for login update failure - it's not critical for form save
         }
        
        // Approval logic after save
        await handleApprovalStatus();
        
        console.log("Personal details saved successfully");
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
      console.log("✅ Login endpoint updated successfully with name:", formData.fullName);
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
    <div className={`rounded-lg p-6 ${className}`} style={{backgroundColor: '#F0D8D9'}}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="w-full">
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Name"
              required
              maxLength={50}
              className={`w-full px-4 py-3 rounded-lg border ${validationErrors.fullName ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300`}
            />
            {validationErrors.fullName && (
              <span className="text-red-500 text-xs mt-1">{validationErrors.fullName}</span>
            )}
          </div>
          {/* Gender */}
          <div className="w-full relative">
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
            >
              <option value="" disabled>Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="transgender">Transgender</option>
            </select>
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {/* Date of Birth */}
          {dateOfBirth && (
            <div className="w-full relative">
              <WheelDatePicker
                value={formData.dateOfBirth}
                onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
                placeholder="Select Date of Birth"
              />
            </div>
          )}

          {/* Email */}
          <div className="w-full">
            <div className="flex gap-2">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Id"
                maxLength={50}
                required
                disabled={isGoogleAccount || emailVerified}
                className={`flex-1 px-4 py-3 rounded-lg border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100`}
              />
              {emailVerified ? (
                <span className="flex items-center justify-center w-12">
                  <FaCheckCircle color="green" size={20} />
                </span>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 text-sm font-medium"
                  onClick={sendEmailOtp}
                  disabled={isEmailVerifying}
                >
                  {isEmailVerifying ? "Sending..." : "Verify"}
                </button>
              )}
            </div>
            {validationErrors.email && (
              <span className="text-red-500 text-xs mt-1">{validationErrors.email}</span>
            )}
            {showEmailOtpInput && !emailVerified && !isGoogleAccount && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter Email OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  maxLength={6}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <button 
                  type="button" 
                  className="px-4 py-2 bg-green-400 text-white rounded-lg hover:bg-green-500 text-sm font-medium" 
                  onClick={verifyEmailOtp}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
          {/* Mobile Number */}
          <div className="w-full">
            <div className="flex gap-2">
              <div className="flex items-center px-4 py-3 bg-white rounded-lg border border-gray-300 w-12 justify-center">
                <span className="text-gray-600">?</span>
              </div>
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
                className={`flex-1 px-4 py-3 rounded-lg border ${validationErrors.callingNumber ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100`}
              />
              {phoneVerified ? (
                <span className="flex items-center justify-center w-12">
                  <FaCheckCircle color="green" size={20} />
                </span>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 text-sm font-medium"
                  onClick={sendPhoneOtp}
                  disabled={isPhoneVerifying}
                >
                  {isPhoneVerifying ? "Sending..." : "Verify"}
                </button>
              )}
            </div>
            {validationErrors.callingNumber && (
              <span className="text-red-500 text-xs mt-1">{validationErrors.callingNumber}</span>
            )}
            {showPhoneOtpInput && !phoneVerified && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter Phone OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  maxLength={6}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <button 
                  type="button" 
                  className="px-4 py-2 bg-green-400 text-white rounded-lg hover:bg-green-500 text-sm font-medium" 
                  onClick={verifyPhoneOtp}
                >
                  Submit
                </button>
                <button 
                  type="button" 
                  className="px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 text-xs font-medium" 
                  onClick={sendPhoneOtp}
                >
                  Resend
                </button>
              </div>
            )}
          </div>
          {/* WhatsApp Number */}
          <div className="w-full md:col-span-2">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={sameAsCallingNumber}
                onChange={(e) => setSameAsCallingNumber(e.target.checked)}
                className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-300"
              />
              <span className="text-sm text-gray-700">WhatsApp Number same as Mobile Number</span>
            </label>
          </div>

          {/* WhatsApp Number Input */}
          <div className="w-full relative">
            <input
              type={whatsappType}
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleInputChange}
              onFocus={handleFocusWhatsapp}
              onBlur={handleBlurWhatsapp}
              placeholder="Whats app Number"
              onInput={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                e.target.value = v.length <= 10 ? v : v.slice(0, 10);
              }}
              required
              disabled={sameAsCallingNumber}
              className={`w-full px-4 py-3 rounded-lg border ${validationErrors.whatsappNumber ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-gray-100`}
            />
            {validationErrors.whatsappNumber && (
              <span className="text-red-500 text-xs mt-1">{validationErrors.whatsappNumber}</span>
            )}
          </div>
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