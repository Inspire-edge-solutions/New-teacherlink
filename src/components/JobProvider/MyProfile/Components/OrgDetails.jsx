import React, { useState, useEffect } from "react";
import Select from "react-select";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { FaCheckCircle, FaCheckSquare } from "react-icons/fa";
import { useAuth } from "../../../../Context/AuthContext";
import { getAuth, updateEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { validateField, formatFieldValue, validateWithFeedback, validatePincodeForStateWithFeedback } from "../../../../utils/formValidation";
import CollapsibleSection from "./CollapsibleSection";
import LogoCoverUploader from "./LogoCoverUploader";
import InputWithTooltip from "../../../../services/InputWithTooltip";
import { selectMenuPortalStyles } from "../../PostJobs/Shared/utils";

const LOGIN_API_URL = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login";
const API_URL = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
const PROFILE_APPROVED_API = "https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/profile_approved";
const MSG91_API = "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev";

const authHeaders = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
};

//------------------------------------------------
// Helper functions: map countries/states/cities by ID
//------------------------------------------------
const mapAllCountries = async () => {
  const countries = await GetCountries();
  return countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
};

// Find India in the countries list
const findIndiaOption = async () => {
  const countries = await GetCountries();
  const countriesOptions = countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
  const india = countriesOptions.find(country => country.label === "India");
  return india || null;
};

const mapStatesOfCountry = async (countryId) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return states.map((state) => ({
    value: state.id,
    label: state.name
  }));
};

const mapCitiesOfState = async (countryId, stateId) => {
  if (!countryId || !stateId) return [];
  const cities = await GetCity(countryId, stateId);
  return cities.map((city) => ({
    value: city.name,
    label: city.name
  }));
};

const OrgDetails = () => {
  const { user, loading } = useAuth();
  
  const providerIsGoogle = user?.providerData?.some?.((p) => p.providerId === "google.com");
  const isGoogleFromDb = user?.is_google_account === 1 || user?.is_google_account === true;
  const isGoogleAccount = providerIsGoogle || isGoogleFromDb;

  const PARENT_TYPE = "Parent/ Guardian looking for Tuitions";
  const [selectedType, setSelectedType] = useState("");
  const [originalType, setOriginalType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(isGoogleAccount);
  
  // Phone verification states
  const [showPhoneOtpInput, setShowPhoneOtpInput] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  if (loading) return <div>Loading...</div>;
  const firebase_uid = user.uid;

  const [orgDetails, setOrgDetails] = useState({
    name: "",
    websiteUrl: "",
    video: "",
    panNumber: "",
    panName: "",
    gstin: "",
    address: "",
    country: "India",
    state: "",
    city: "",
    pincode: "",
    contactPerson: {
      name: user.name || "",
      gender: "",
      designation: [],
      phone1: user.phone_number || "",
      phone2: "",
      email: user.email || ""
    }
  });
  const [parentDetails, setParentDetails] = useState({
    address: "",
    country: "India",
    state: "",
    city: "",
    pincode: ""
  });
  const [reportingAuthority, setReportingAuthority] = useState({
    name: "",
    gender: "",
    designation: [],
    phone1: "",
    phone2: "",
    email: ""
  });
  const [otherContactPersonDesignation, setOtherContactPersonDesignation] = useState("");
  const [otherReportingAuthorityDesignation, setOtherReportingAuthorityDesignation] = useState("");
  const [images, setImages] = useState([]);
  const [socialData, setSocialData] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: ""
  });
  const [designations, setDesignations] = useState([]);
  const [isOwner, setIsOwner] = useState("");
  const [sameAsCallingNumber, setSameAsCallingNumber] = useState(false);
  const [reportingAuthoritySameNumber, setReportingAuthoritySameNumber] = useState(false);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [parentStates, setParentStates] = useState([]);
  const [parentCities, setParentCities] = useState([]);
  const [isFetched, setIsFetched] = useState(false);
  const [indiaOption, setIndiaOption] = useState(null);
  const [pincodeInteracted, setPincodeInteracted] = useState(false);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const [countriesData, indiaData] = await Promise.all([
          mapAllCountries(),
          findIndiaOption()
        ]);
        setCountries(countriesData);
        setIndiaOption(indiaData);
        
        // Load India states by default
        if (indiaData) {
          const indiaStates = await mapStatesOfCountry(indiaData.value);
          setStates(indiaStates);
          setParentStates(indiaStates);
        }
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };
    
    loadCountries();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await axios.get(API_URL, { params: { firebase_uid } });
        const raw = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (raw) {
          setSelectedType(raw.type || "");
          setOriginalType(raw.type || "");
          setEmailVerified(isGoogleAccount || raw.is_email_verified === 1 || raw.is_email_verified === true);
          setPhoneVerified(raw.is_phone1_verified === 1 || raw.is_phone1_verified === true);
          setOrgDetails(prev => ({
            ...prev,
            name: raw.name || "",
            websiteUrl: raw.website_url || "",
            video: raw.video_url || "",
            panNumber: raw.pan_number || "",
            panName: raw.pan_name || "",
            gstin: raw.gstin || "",
            address: raw.address || "",
            country: (raw.country && raw.country.trim()) || "India",
            state: (raw.state && raw.state.trim()) || "",
            city: (raw.city && raw.city.trim()) || "",
            pincode: raw.pincode || "",
            contactPerson: {
              name: raw.contact_person_name || user.name || "",
              gender: raw.contact_person_gender || "",
              designation: raw.contact_person_designation || [],
              phone1: raw.contact_person_phone1 || user.phone_number || "",
              phone2: raw.contact_person_phone2 || "",
              email: raw.contact_person_email || user.email || ""
            }
          }));
          // Mark pincode as interacted if it exists in loaded data
          if (raw.pincode) {
            setPincodeInteracted(true);
          }
          setParentDetails(prev => ({
            ...prev,
            address: raw.parent_address || "",
            country: (raw.parent_country && raw.parent_country.trim()) || "India",
            state: (raw.parent_state && raw.parent_state.trim()) || "",
            city: (raw.parent_city && raw.parent_city.trim()) || "",
            pincode: raw.parent_pincode || ""
          }));
          setReportingAuthority({
            name: raw.reporting_authority_name || "",
            gender: raw.reporting_authority_gender || "",
            designation: raw.reporting_authority_designation || [],
            phone1: raw.phone1 || "",
            phone2: raw.phone2 || "",
            email: raw.email || ""
          });
          setSocialData({
            facebook: raw.facebook || "",
            twitter: raw.twitter || "",
            linkedin: raw.linkedin || "",
            instagram: raw.instagram || ""
          });
        }
      } catch (err) {
        console.error("Error loading existing org:", err);
      } finally {
        setIsFetched(true);
      }
    })();
  }, [firebase_uid, user.name, user.phone_number, user.email, isGoogleAccount]);

  useEffect(() => {
    if (isGoogleAccount) setEmailVerified(true);
  }, [isGoogleAccount]);

  // Fetch designations on mount
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_DEV1_API}/constants`);
        const transformedData = response.data.map((item) => ({
          category: item.category,
          value: item.value,
          label: item.label,
        }));
        setDesignations(transformedData.filter((item) => item.category === "Administration") || []);
      } catch (error) {
        console.error("Error fetching designations:", error);
      }
    };
    
    fetchDesignations();
  }, []);

  useEffect(() => {
    if (!isFetched || !countries.length) return;
    
    const loadOrgLocationData = async () => {
      const orgCountry = orgDetails.country || "India";
      const countryObj = countries.find(c => c.label === orgCountry);
      if (countryObj) {
        try {
          const newStates = await mapStatesOfCountry(countryObj.value);
          setStates(newStates);
          if (orgDetails.state) {
            const stateObj = newStates.find(s => s.label === orgDetails.state);
            if (stateObj) {
              const newCities = await mapCitiesOfState(countryObj.value, stateObj.value);
              setCities(newCities);
            }
          } else {
            setCities([]);
          }
        } catch (error) {
          console.error("Error loading org location data:", error);
        }
      }
    };

    const loadParentLocationData = async () => {
      const parentCountry = parentDetails.country || "India";
      const parentCountryObj = countries.find(c => c.label === parentCountry);
      if (parentCountryObj) {
        try {
          const newParentStates = await mapStatesOfCountry(parentCountryObj.value);
          setParentStates(newParentStates);
          if (parentDetails.state) {
            const stateObj = newParentStates.find(s => s.label === parentDetails.state);
            if (stateObj) {
              const newCities = await mapCitiesOfState(parentCountryObj.value, stateObj.value);
              setParentCities(newCities);
            }
          } else {
            setParentCities([]);
          }
        } catch (error) {
          console.error("Error loading parent location data:", error);
        }
      }
    };

    loadOrgLocationData();
    loadParentLocationData();
  }, [isFetched, countries, orgDetails.country, orgDetails.state, parentDetails.country, parentDetails.state]);

  useEffect(() => {
    setOrgDetails(prev => ({
      ...prev,
      contactPerson: { ...prev.contactPerson, designation: [] }
    }));
    setReportingAuthority(prev => ({ ...prev, designation: [] }));
  }, [selectedType]);

  useEffect(() => {
    if (sameAsCallingNumber && orgDetails.contactPerson.phone1) {
      setOrgDetails(prev => ({
        ...prev,
        contactPerson: {
          ...prev.contactPerson,
          phone2: prev.contactPerson.phone1
        }
      }));
    }
  }, [sameAsCallingNumber, orgDetails.contactPerson.phone1]);

  useEffect(() => {
    if (reportingAuthoritySameNumber && reportingAuthority.phone1) {
      setReportingAuthority(prev => ({
        ...prev,
        phone2: prev.phone1
      }));
    }
  }, [reportingAuthoritySameNumber, reportingAuthority.phone1]);

  const checkEmailExists = async (emailToCheck) => {
    if (!emailToCheck) return false;
    
    console.log("ðŸ” Checking email:", emailToCheck);
    console.log("ðŸ” Current user firebase_uid:", firebase_uid);
    
    // Firebase check
    try {
      const auth = getAuth();
      const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
      console.log("ðŸ”¥ Firebase methods for email:", methods);
      if (methods.length > 0) {
        console.log("ðŸ”¥ Firebase found methods, checking if different from current email");
        if (emailToCheck.toLowerCase() !== orgDetails.contactPerson.email.toLowerCase()) {
          console.log("ðŸ”¥ Firebase: Email already in use (different from current)");
          return true;
        }
      }
    } catch (err) {
      console.warn("Firebase fetchSignInMethodsForEmail error:", err);
    }
    
    // Backend check
    try {
      const resp = await axios.get(LOGIN_API_URL, { params: { email: emailToCheck } });
      console.log("ðŸ“¡ Backend response:", resp.data);
      console.log("ðŸ“¡ Response status:", resp.status);
      console.log("ðŸ“¡ Is array:", Array.isArray(resp.data));
      
      if (resp.status === 200 && Array.isArray(resp.data)) {
        // Filter users that actually have the email we're checking
        const usersWithThisEmail = resp.data.filter(u => 
          u.email && u.email.toLowerCase() === emailToCheck.toLowerCase()
        );
        console.log("ðŸ“¡ Users with this specific email:", usersWithThisEmail);
        
        if (usersWithThisEmail.length > 0) {
          // Check if any user with this email has a different firebase_uid
          const conflictingUsers = usersWithThisEmail.filter(u => u.firebase_uid !== firebase_uid);
          console.log("ðŸ“¡ Conflicting users (different firebase_uid):", conflictingUsers);
          
          if (conflictingUsers.length > 0) {
            console.log("ðŸ“¡ Backend: Email already in use (different firebase_uid found)");
            return true;
          }
        }
      }
    } catch (err) {
      console.warn("Backend login table email check error:", err);
    }
    
    console.log("âœ… Email check passed - email is available");
    return false;
  };

  const sendEmailOtp = async () => {
    if (isGoogleAccount) {
      setEmailVerified(true);
      toast.info("Google sign-in: Email auto-verified.");
      return;
    }
    const emailToCheck = orgDetails.contactPerson.email.trim().toLowerCase();
    if (!emailToCheck) {
      toast.error("Enter a valid email.");
      return;
    }
    setIsVerifying(true);
    try {
      const exists = await checkEmailExists(emailToCheck);
      if (exists) {
        toast.error("Email already in use.");
        setIsVerifying(false);
        return;
      }
      await axios.post(`${import.meta.env.VITE_DEV1_API}/otp/create`, {
        email: emailToCheck
      });
      toast.success("OTP sent!");
      setShowOtpInput(true);
    } catch (err) {
      toast.error("OTP send failed.");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyEmailOtp = async () => {
    setIsVerifying(true);
    try {
      await axios.post(`${import.meta.env.VITE_DEV1_API}/otp/verify`, {
        email: orgDetails.contactPerson.email,
        otp: emailOtp
      });
      try {
        const auth = getAuth();
        if (auth.currentUser && orgDetails.contactPerson.email !== auth.currentUser.email) {
          await updateEmail(auth.currentUser, orgDetails.contactPerson.email);
        }
      } catch (err) {
        console.warn("Firebase updateEmail error:", err);
        if (err.code === "auth/email-already-in-use") {
          toast.error("Email already in use");
          setIsVerifying(false);
          return;
        }
        if (err.code === "auth/requires-recent-login") {
          toast.error("Please re-login to update email.");
          setIsVerifying(false);
          return;
        }
      }
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
        const loginResp = await axios.put(
          LOGIN_API_URL,
          {
            firebase_uid,
            email: orgDetails.contactPerson.email,
            name: orgDetails.contactPerson.name,
            phone_number: orgDetails.contactPerson.phone1
          },
          headers
        );
        if (loginResp.status !== 200 && loginResp.status !== 201) {
          throw new Error("Login table not updated");
        }
      } catch (err) {
        console.warn("User table update error:", err);
      }
      setEmailVerified(true);
      setShowOtpInput(false);
      toast.success("Email verified and updated everywhere!");
    } catch (err) {
      toast.error("Invalid OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (orgDetails.contactPerson.phone1.length !== 10) {
      toast.error("Enter a valid 10-digit number");
      return;
    }
    
    setIsPhoneVerifying(true);
    const mobileWithCountryCode = `91${orgDetails.contactPerson.phone1}`;
    
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
      
      console.log("âœ… Phone OTP Response:", response.data);
      toast.success("OTP sent to your phone!");
      setShowPhoneOtpInput(true);
    } catch (e) {
      console.error("âŒ Phone OTP Error:", e);
      toast.error(`Failed to send phone OTP: ${e.message}`);
    } finally {
      setIsPhoneVerifying(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length < 4) {
      toast.error("Enter a valid OTP");
      return;
    }
    
    const mobileWithCountryCode = `91${orgDetails.contactPerson.phone1}`;
    
    try {
      const response = await axios.post(
        `${MSG91_API}/otp/verify`,
        {
          mobile: mobileWithCountryCode,
          otp: phoneOtp,
          firebase_uid: firebase_uid
        },
        authHeaders
      );
      
      console.log("âœ… Phone OTP Verification Response:", response.data);
      
      // Check if the OTP verification was successful
      if (response.data && response.data.ok === true && response.data.provider && response.data.provider.type === 'success') {
        // OTP verification successful
        toast.success("Phone verified successfully!");
        setPhoneVerified(true);
        setShowPhoneOtpInput(false);
        setPhoneOtp(""); // Clear the OTP input
        
        // Update the phone verification status in the database
        try {
          console.log("ðŸ” Phone verification successful - updating database");
          
          const updatePayload = {
            firebase_uid: firebase_uid,
            is_phone1_verified: 1  // Update the phone verification status
          };
          
          console.log("ðŸ” Updating phone verification in database:", updatePayload);
          
          const updateResponse = await axios.put(
            API_URL,
            updatePayload,
            authHeaders
          );
          console.log("âœ… Phone verification status updated in database");
          console.log("ðŸ” Update Response:", updateResponse.data);
          
          // Add a small delay to ensure database update is committed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh organization details to ensure verification status is loaded
          try {
            const resp = await axios.get(API_URL, { params: { firebase_uid } });
            const raw = Array.isArray(resp.data) ? resp.data[0] : resp.data;
            if (raw) {
              setPhoneVerified(raw.is_phone1_verified === 1 || raw.is_phone1_verified === true);
            }
          } catch (refreshErr) {
            console.error("âŒ Failed to refresh organization details:", refreshErr);
          }
        } catch (updateErr) {
          console.error("âŒ Failed to update phone verification status:", {
            error: updateErr.message,
            status: updateErr.response?.status,
            data: updateErr.response?.data
          });
          
          // If database update fails, show error to user
          toast.error("Phone verification failed to save. Please try again.");
        }
      } else {
        // OTP verification failed
        console.log("âŒ OTP verification failed:", response.data);
        toast.error("Invalid OTP. Please try again.");
        setPhoneOtp(""); // Clear the OTP input for retry
      }
    } catch (e) {
      console.error("âŒ Phone OTP Verification Error:", e);
      if (e.response?.status === 400) {
        toast.error("Invalid OTP. Please try again.");
      } else {
        toast.error(`Phone OTP verification failed: ${e.message}`);
      }
      setPhoneOtp(""); // Clear the OTP input for retry
    }
  };

  const updateUserEmail = async (newEmail) => {
    if (!newEmail) return;
    try {
      const auth = getAuth();
      if (auth.currentUser && newEmail !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, newEmail);
        toast.success("Firebase email updated");
      }
    } catch (err) {
      console.warn("Firebase updateEmail error:", err);
      toast.error("Failed to update email in Firebase");
    }
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const loginResp = await axios.put(
        LOGIN_API_URL,
        {
          firebase_uid,
          email: newEmail,
          name: orgDetails.contactPerson.name,
          phone_number: orgDetails.contactPerson.phone1
        },
        headers
      );
      if (loginResp.status !== 200 && loginResp.status !== 201) {
        throw new Error("Login table not updated");
      }
    } catch (err) {
      toast.error("User data update failed!");
      console.warn("User table update error:", err);
    }
  };

  const handleTypeChange = e => setSelectedType(e.target.value);

  const handleInputChange = e => {
    const { name, value } = e.target;
    const formattedValue = formatFieldValue(name, value);
    validateWithFeedback(name, formattedValue, false);
    // Track if pincode has been interacted with
    if (name === "pincode") {
      setPincodeInteracted(true);
    }
    setOrgDetails(prev => ({
      ...prev,
      [name]: formattedValue,
      ...(name === "country" ? { state: "", city: "" } : {}),
      ...(name === "state" ? { city: "" } : {})
    }));
  };

  const handleParentInputChange = e => {
    const { name, value } = e.target;
    const formattedValue = formatFieldValue(name, value);
    validateWithFeedback(name, formattedValue, false);
    setParentDetails(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    const converted = await Promise.all(
      files.map(f =>
        new Promise((res, rej) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => {
            const b64 = reader.result.split(",")[1];
            res({ base64: b64, fileName: f.name });
          };
          reader.onerror = rej;
        })
      )
    );
    setImages(converted);
  };

  const handleSocialChange = e => {
    const { name, value } = e.target;
    setSocialData(prev => ({ ...prev, [name]: value }));
  };

  const handleContactPersonChange = e => {
    const { name, value } = e.target;
    const formattedValue = formatFieldValue(name, value);
    validateWithFeedback(name, formattedValue, false);
    if (name === "phone2" && sameAsCallingNumber) {
      setSameAsCallingNumber(false);
    }
    if (name === "phone1" && sameAsCallingNumber) {
      setOrgDetails(prev => ({
        ...prev,
        contactPerson: {
          ...prev.contactPerson,
          [name]: formattedValue,
          phone2: formattedValue
        }
      }));
    } else {
      setOrgDetails(prev => ({
        ...prev,
        contactPerson: { ...prev.contactPerson, [name]: formattedValue }
      }));
    }
  };

  const handleContactPersonDesignationChange = opts => {
    setOrgDetails(prev => ({
      ...prev,
      contactPerson: {
        ...prev.contactPerson,
        designation: opts ? opts.map(o => o.value) : []
      }
    }));
  };

  const handleReportingAuthorityChange = e => {
    const { name, value } = e.target;
    const formattedValue = formatFieldValue(name, value);
    if (name === 'name' && formattedValue.toLowerCase() === orgDetails.contactPerson.name.toLowerCase()) {
      toast.error("Reporting authority name cannot be same as contact person name");
      return;
    }
    if (name === 'email' && formattedValue.toLowerCase() === orgDetails.contactPerson.email.toLowerCase()) {
      toast.error("Reporting authority email cannot be same as contact person email");
      return;
    }
    if (name === 'phone1' && formattedValue === orgDetails.contactPerson.phone1) {
      toast.error("Reporting authority phone number cannot be same as contact person phone number");
      return;
    }
    if (name === 'phone2' && formattedValue === orgDetails.contactPerson.phone2) {
      toast.error("Reporting authority WhatsApp number cannot be same as contact person WhatsApp number");
      return;
    }
    validateWithFeedback(name, formattedValue, false);
    if (name === "phone2" && reportingAuthoritySameNumber) {
      setReportingAuthoritySameNumber(false);
    }
    if (name === "phone1" && reportingAuthoritySameNumber) {
      setReportingAuthority(prev => ({
        ...prev,
        [name]: formattedValue,
        phone2: formattedValue
      }));
    } else {
      setReportingAuthority(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const handleReportingAuthorityDesignationChange = opts => {
    const newDesignations = opts ? opts.map(o => o.value) : [];
    const contactPersonDesignations = new Set(orgDetails.contactPerson.designation);
    const hasMatchingDesignations = newDesignations.some(d => contactPersonDesignations.has(d));
    if (hasMatchingDesignations) {
      toast.error("Reporting authority designation cannot be same as contact person designation");
      return;
    }
    setReportingAuthority(prev => ({
      ...prev,
      designation: newDesignations
    }));
  };

  const isNonParent = () => selectedType && selectedType !== PARENT_TYPE;

  // ---- /profile_approved HANDLING ----
  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validate pincode against selected state before submission
    // Only validate if user has interacted with the pincode field
    if (pincodeInteracted && orgDetails.pincode && orgDetails.state) {
      const isPincodeValid = validatePincodeForStateWithFeedback(orgDetails.pincode, orgDetails.state, true);
      if (!isPincodeValid) {
        toast.error("Please correct the pincode before submitting");
        return;
      }
    }
    
    const cp = orgDetails.contactPerson;
    const isParent = selectedType === PARENT_TYPE;
    const payload = {
      firebase_uid,
      type: selectedType || null,
      name: orgDetails.name || null,
      website_url: orgDetails.websiteUrl || null,
      institution_photos: images.length ? images : null,
      video_url: orgDetails.video || null,
      pan_number: orgDetails.panNumber || null,
      pan_name: orgDetails.panName || null,
      gstin: orgDetails.gstin || null,
      address: orgDetails.address || null,
      country: orgDetails.country || null,
      state: orgDetails.state || null,
      city: orgDetails.city || null,
      pincode: orgDetails.pincode || null,
      contact_person_name: cp.name || null,
      contact_person_gender: cp.gender || null,
      contact_person_designation: cp.designation.length ? cp.designation : null,
      contact_person_other_designation: cp.designation.includes("Others") ? otherContactPersonDesignation : null,
      contact_person_phone1: cp.phone1 || null,
      contact_person_phone2: cp.phone2 || null,
      contact_person_email: cp.email || null,
      is_owner: isOwner === "yes" ? 1 : 0,
      reporting_authority_name: isOwner === "no" ? reportingAuthority.name || null : null,
      reporting_authority_gender: isOwner === "no" ? reportingAuthority.gender || null : null,
      reporting_authority_designation: isOwner === "no" && reportingAuthority.designation.length
        ? reportingAuthority.designation : null,
      reporting_authority_other_designation: isOwner === "no" && reportingAuthority.designation.includes("Others")
        ? otherReportingAuthorityDesignation : null,
      phone1: isOwner === "no" ? reportingAuthority.phone1 || null : null,
      phone2: isOwner === "no" ? reportingAuthority.phone2 || null : null,
      email: isOwner === "no" ? reportingAuthority.email || null : null,
      parent_address: isParent ? parentDetails.address || null : null,
      parent_country: isParent ? parentDetails.country || null : null,
      parent_state: isParent ? parentDetails.state || null : null,
      parent_city: isParent ? parentDetails.city || null : null,
      parent_pincode: isParent ? parentDetails.pincode || null : null,
      facebook: socialData.facebook || null,
      twitter: socialData.twitter || null,
      linkedin: socialData.linkedin || null,
      instagram: socialData.instagram || null,
             is_email_verified: isGoogleAccount ? 1 : (emailVerified ? 1 : 0),
       is_phone1_verified: phoneVerified ? 1 : 0,
       is_phone2_verified: 0,
       isBlocked: 0
    };

    setIsSaving(true);
    try {
      let result;
      if (originalType) {
        result = await axios.put(API_URL, payload);
      } else {
        result = await axios.post(API_URL, payload);
      }
      if (result.status === 200 || result.status === 201) {
        toast.success("Organization details saved!");
        toast.info("Thank you for providing details. Your profile is now under review by Admin! You will be notified soon");
        
        // Update login endpoint with organization name
        try {
          await axios.put(
            LOGIN_API_URL,
            {
              firebase_uid: firebase_uid,
              email: cp.email,
              name: orgDetails.name || cp.name, // Use organization name if available, otherwise contact person name
              phone_number: cp.phone1,
            },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("âœ… Login endpoint updated successfully with organization name:", orgDetails.name);
        } catch (loginError) {
          console.error("âŒ Failed to update login endpoint:", loginError);
          console.error("Login update payload:", {
            firebase_uid: firebase_uid,
            email: cp.email,
            name: orgDetails.name || cp.name,
            phone_number: cp.phone1,
          });
        }
      } else {
        toast.error("Failed to save details. Try again.");
      }

      // PROFILE_APPROVED logic
      let exists = false;
      let existingRow = null;
      try {
        const checkRes = await axios.get(`${PROFILE_APPROVED_API}?firebase_uid=${firebase_uid}`);
        if (Array.isArray(checkRes.data) && checkRes.data.length > 0) {
          existingRow = checkRes.data.find(obj => obj.firebase_uid === firebase_uid);
        } else if (typeof checkRes.data === "object" && checkRes.data !== null && checkRes.data.firebase_uid === firebase_uid) {
          existingRow = checkRes.data;
        }
        if (existingRow) exists = true;
      } catch (err) {}

      if (exists) {
        await axios.put(PROFILE_APPROVED_API, {
          firebase_uid: firebase_uid,
          isApproved: 0,
          isRejected: 0,
          response: 0,
          profile_updated: 1,
          approved_by: "",
          approved_email: "",
          education_updated: "",
          additionalDetails_updated: "",
          profile_image_updated: ""
        });
      } else {
        await axios.post(PROFILE_APPROVED_API, {
          firebase_uid: firebase_uid,
          isApproved: 0,
          isRejected: 0,
          response: 0,
          profile_updated: 0,
          approved_by: "",
          approved_email: "",
          education_updated: "",
          additionalDetails_updated: "",
          profile_image_updated: ""
        });
      }
    } catch (err) {
      toast.error("Failed to save organization details");
      console.error("Save error:", err, err?.response?.data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-3 sm:py-4 md:py-6 px-0 sm:px-2">
      <form onSubmit={handleSubmit} className="w-full">
        {/* Organization Type Selection */}
        <div className="mb-6">
          <div className="bg-[#F0D8D9] rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="mb-4">
              <label className="block text-lg sm:text-base font-medium text-gray-700 mb-2 leading-snug tracking-tight">
                Organization/Entity Type
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700 bg-white"
                value={selectedType}
                onChange={handleTypeChange}
                required
              >
                <option value="" disabled>Select Organization/Entity Type</option>
                <option value="School / College/ University">School / College/ University</option>
                <option value="Coaching Centers/ Institutes">Coaching Centers/ Institutes</option>
                <option value="Ed Tech company">Ed Tech company</option>
                <option value={PARENT_TYPE}>Parent/ Guardian looking for Tuitions</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Account Details Section */}
        {selectedType && (
          <CollapsibleSection title="Account Details" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* School / College / University Name */}
              <div>
                    <InputWithTooltip label="School / College / University" required>
                      <input
                        name="name"
                        type="text"
                        placeholder="School / College / University"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.name}
                        onChange={handleInputChange}
                        required
                        maxLength={50}
                        minLength={10}
                      />
                    </InputWithTooltip>
                  </div>

              {/* Website URL */}
              <div>
                    <InputWithTooltip label="Website URL">
                      <input
                        name="websiteUrl"
                        type="text"
                        placeholder="Website URL"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.websiteUrl}
                        onChange={handleInputChange}
                        onBlur={(e) => validateWithFeedback('websiteUrl', e.target.value, true)}
                      />
                    </InputWithTooltip>
                  </div>
                </div>

            {/* Logo and Document Uploads - Full Width */}
            <div className="mt-6">
              <LogoCoverUploader />
            </div>

            {/* Continue with remaining fields in grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
              {/* PAN Number */}
              <div>
                    <InputWithTooltip label="PAN Number">
                      <input
                        name="panNumber"
                        type="text"
                        placeholder="PAN Number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.panNumber}
                        onChange={handleInputChange}
                        onBlur={(e) => validateWithFeedback('panNumber', e.target.value, true)}
                        pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                        title="Enter a valid 10-character PAN number (e.g., ABCDE1234F)"
                        minLength={10}
                        maxLength={10}
                      />
                    </InputWithTooltip>
                  </div>

              {/* Name on PAN Number */}
              <div>
                    <InputWithTooltip label="Name on PAN Number">
                      <input
                        name="panName"
                        type="text"
                        placeholder="Name on PAN Number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.panName}
                        onChange={handleInputChange}
                      />
                    </InputWithTooltip>
                  </div>

              {/* GSTIN */}
              <div>
                    <InputWithTooltip label="GSTIN">
                      <input
                        name="gstin"
                        type="text"
                        placeholder="GSTIN"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.gstin}
                        onChange={handleInputChange}
                        onBlur={(e) => validateWithFeedback('gstin', e.target.value, true)}
                        pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                        title="Enter a valid 15-character GSTIN (e.g., 27AAPFU0939F1Z5)"
                        minLength={15}
                        maxLength={15}
                      />
                    </InputWithTooltip>
                  </div>

              {/* Street / Area */}
              <div>
                    <InputWithTooltip label="Street / Area" required>
                      <input
                        name="address"
                        type="text"
                        placeholder="Street / Area"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.address}
                        onChange={handleInputChange}
                        required
                      />
                    </InputWithTooltip>
                  </div>

              {/* Country Dropdown */}
              <div>
                    <InputWithTooltip label="Country">
                      <Select
                        name="country"
                        options={countries}
                        value={countries.find(c => c.label === orgDetails.country) || null}
                        onChange={async (selectedOption) => {
                          const countryName = selectedOption ? selectedOption.label : "";
                          const countryId = selectedOption ? selectedOption.value : "";
                          
                          
                          setOrgDetails(prev => ({
                            ...prev,
                            country: countryName,
                            state: "",
                            city: ""
                          }));
                          
                          if (countryId) {
                            try {
                              const newStates = await mapStatesOfCountry(countryId);
                              setStates(newStates);
                            } catch (error) {
                              console.error("Error loading states:", error);
                              setStates([]);
                            }
                          } else {
                            setStates([]);
                          }
                          setCities([]);
                        }}
                        placeholder="Country"
                        menuPortalTarget={document.body}
                        styles={selectMenuPortalStyles}
                        className="react-select-container w-full border border-gray-300 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-200 hover:border-pink-300 bg-white"
                        classNamePrefix="react-select"
                        isSearchable
                        isClearable
                      />
                    </InputWithTooltip>
                  </div>

              {/* State Dropdown */}
              <div>
                    <InputWithTooltip label="State">
                      <Select
                        name="state"
                        options={states}
                        value={states.find(s => s.label === orgDetails.state) || null}
                        onChange={async (selectedOption) => {
                          const stateName = selectedOption ? selectedOption.label : "";
                          const stateId = selectedOption ? selectedOption.value : "";
                          const countryId = countries.find(c => c.label === orgDetails.country)?.value;
                          
                          setOrgDetails(prev => ({
                            ...prev,
                            state: stateName,
                            city: ""
                          }));
                          
                          if (stateId && countryId) {
                            try {
                              const newCities = await mapCitiesOfState(countryId, stateId);
                              setCities(newCities);
                            } catch (error) {
                              console.error("Error loading cities:", error);
                              setCities([]);
                            }
                          } else {
                            setCities([]);
                          }
                        }}
                        placeholder="State"
                        menuPortalTarget={document.body}
                        styles={selectMenuPortalStyles}
                        className="react-select-container w-full border border-gray-300 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-200 hover:border-pink-300 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        classNamePrefix="react-select"
                        isSearchable
                        isClearable
                        isDisabled={!orgDetails.country}
                      />
                    </InputWithTooltip>
                  </div>

              {/* City Dropdown */}
              <div>
                    <InputWithTooltip label="City">
                      <Select
                        name="city"
                        options={cities}
                        value={cities.find(c => c.label === orgDetails.city) || null}
                        onChange={(selectedOption) => {
                          const cityName = selectedOption ? selectedOption.label : "";
                          setOrgDetails(prev => ({
                            ...prev,
                            city: cityName
                          }));
                        }}
                        placeholder="City"
                        menuPortalTarget={document.body}
                        styles={selectMenuPortalStyles}
                        className="react-select-container w-full border border-gray-300 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-200 hover:border-pink-300 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        classNamePrefix="react-select"
                        isSearchable
                        isClearable
                        isDisabled={!orgDetails.state}
                      />
                    </InputWithTooltip>
                  </div>

              {/* Pincode */}
              <div>
                    <InputWithTooltip label="Pincode">
                      <input
                        name="pincode"
                        type="text"
                        placeholder="Pincode"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.pincode}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          setPincodeInteracted(true);
                          validatePincodeForStateWithFeedback(e.target.value, orgDetails.state, true);
                        }}
                        pattern="^[1-9][0-9]{5}$"
                        title="Enter a valid 6-digit pincode"
                        minLength={6}
                        maxLength={6}
                      />
                    </InputWithTooltip>
                  </div>

              {/* Organization Name (Read-only) */}
              <div>
                  <InputWithTooltip label="Organization Name">
                    <input
                      type="text"
                      placeholder="Organization Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                      value={orgDetails.name}
                      readOnly
                    />
                  </InputWithTooltip>
                </div>
              </div>
          </CollapsibleSection>
          )}

        {/* Contact Person Section */}
          {selectedType && (
          <CollapsibleSection title="Contact Person" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Contact Person Name */}
              <div>
                    <InputWithTooltip label="Name" required>
                      <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.contactPerson.name}
                        onChange={handleContactPersonChange}
                        required
                      />
                    </InputWithTooltip>
                  </div>

              {/* Gender */}
              <div>
                    <InputWithTooltip label="Gender">
                      <select
                        name="gender"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700 bg-white"
                        value={orgDetails.contactPerson.gender}
                        onChange={handleContactPersonChange}
                      >
                        <option value="" disabled>Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="transgender">Transgender</option>
                      </select>
                    </InputWithTooltip>
                  </div>

              {/* Designation */}
              <div>
                    <InputWithTooltip label="Designation">
                      <Select
                        isMulti
                        options={designations}
                        value={designations.filter(opt =>
                          orgDetails.contactPerson.designation.includes(opt.value)
                        )}
                        onChange={handleContactPersonDesignationChange}
                        placeholder="Designation"
                        menuPortalTarget={document.body}
                        styles={selectMenuPortalStyles}
                        className="react-select-container w-full border border-gray-300 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-200 hover:border-pink-300 bg-white"
                        classNamePrefix="react-select"
                      />
                    </InputWithTooltip>
                  </div>

              {/* Mobile Number with Verification */}
              <div>
                <div className="relative">
                      <input
                        type="text"
                        name="phone1"
                        placeholder="Mobile Number"
                        className="w-full px-4 py-3 pr-12 sm:pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        value={orgDetails.contactPerson.phone1}
                        onChange={handleContactPersonChange}
                        onBlur={(e) => validateWithFeedback('phone', e.target.value, true)}
                        maxLength="10"
                        required
                        disabled={phoneVerified}
                      />
                      {phoneVerified ? (
                        <FaCheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                      ) : (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-brand text-white text-lg sm:text-base rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium whitespace-nowrap leading-normal tracking-tight flex items-center justify-center"
                          onClick={sendPhoneOtp}
                          disabled={isPhoneVerifying}
                        >
                          {isPhoneVerifying ? (
                            <span className="hidden sm:inline">Sending...</span>
                          ) : (
                            <>
                              <FaCheckSquare className="sm:hidden" />
                              <span className="hidden sm:inline">Verify</span>
                            </>
                          )}
                        </button>
                      )}
                  </div>
                  {showPhoneOtpInput && !phoneVerified && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2 sm:gap-0 mt-2">
                      <input
                        type="text"
                        placeholder="Enter Phone OTP"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        maxLength="6"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                      />
                      <button
                        type="button"
                      className="px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium whitespace-nowrap leading-normal tracking-tight"
                        onClick={verifyPhoneOtp}
                        disabled={isPhoneVerifying}
                      >
                        {isPhoneVerifying ? "Verifying..." : "Submit"}
                      </button>
                    </div>
                  )}
                </div>

              {/* Email Address with Verification */}
              <div>
                <div className="relative">
                      <input
                        type="email"
                        name="email"
                        className="w-full px-4 py-3 pr-12 sm:pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                        placeholder="Email Address"
                        value={orgDetails.contactPerson.email}
                        onChange={handleContactPersonChange}
                        onBlur={(e) => validateWithFeedback('email', e.target.value, true)}
                        required
                        disabled={isGoogleAccount || emailVerified}
                      />
                      {(isGoogleAccount || emailVerified) ? (
                        <FaCheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                      ) : (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-brand text-white text-lg sm:text-base rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium whitespace-nowrap leading-normal tracking-tight flex items-center justify-center"
                          onClick={sendEmailOtp}
                          disabled={isVerifying}
                        >
                          {isVerifying ? (
                            <span className="hidden sm:inline">Sendingâ€¦</span>
                          ) : (
                            <>
                              <FaCheckSquare className="sm:hidden" />
                              <span className="hidden sm:inline">Verify</span>
                            </>
                          )}
                        </button>
                      )}
                  </div>
                  {showOtpInput && !emailVerified && !isGoogleAccount && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2 sm:gap-0 mt-2">
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={emailOtp}
                        onChange={e => setEmailOtp(e.target.value)}
                        maxLength="6"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
                      />
                      <button
                        type="button"
                      className="px-4 py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium whitespace-nowrap leading-normal tracking-tight"
                        onClick={verifyEmailOtp}
                        disabled={isVerifying}
                      >
                      {isVerifying ? "Verifyingâ€¦" : "Submit"}
                      </button>
                    </div>
                  )}
                </div>

              {/* WhatsApp Number with Checkbox */}
              <div>
                <InputWithTooltip label="Whatsapp Number">
                  <input
                    type="text"
                    name="phone2"
                    placeholder="Whatsapp Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                    value={orgDetails.contactPerson.phone2}
                    onChange={handleContactPersonChange}
                    onBlur={(e) => validateWithFeedback('phone', e.target.value, true)}
                    maxLength="10"
                    disabled={sameAsCallingNumber}
                  />
                </InputWithTooltip>
                <label className="flex items-center space-x-3 mt-2">
                  <input
                    type="checkbox"
                    checked={sameAsCallingNumber}
                    onChange={(e) => setSameAsCallingNumber(e.target.checked)}
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-200"
                  />
                  <span className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight">Whatsapp Number same as Mobile Number</span>
                </label>
              </div>

              {/* Are you the owner - Radio Buttons */}
              {isNonParent() && (
                <div className="col-span-1 md:col-span-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <span className="text-lg sm:text-base font-medium text-gray-700 flex-shrink-0 leading-snug tracking-tight">Are you the owner or the main head of the organization?</span>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isOwner"
                          value="yes"
                          checked={isOwner === "yes"}
                          onChange={(e) => setIsOwner(e.target.value)}
                          className="w-4 h-4 text-pink-600 border-gray-300 focus:ring-pink-200"
                        />
                        <span className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight">Yes</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isOwner"
                          value="no"
                          checked={isOwner === "no"}
                          onChange={(e) => setIsOwner(e.target.value)}
                          className="w-4 h-4 text-pink-600 border-gray-300 focus:ring-pink-200"
                        />
                        <span className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Reporting Authority Section - Shows when user is NOT the owner */}
        {selectedType && isNonParent() && isOwner === "no" && (
          <CollapsibleSection title="Reporting Authority" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Reporting Authority Name */}
              <div>
                  <InputWithTooltip label="Name" required>
                    <input
                      type="text"
                      name="name"
                      placeholder="Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                      value={reportingAuthority.name}
                      onChange={handleReportingAuthorityChange}
                      required
                    />
                  </InputWithTooltip>
                </div>

              {/* Gender */}
              <div>
                  <InputWithTooltip label="Gender">
                    <select
                      name="gender"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700 bg-white"
                      value={reportingAuthority.gender}
                      onChange={handleReportingAuthorityChange}
                    >
                      <option value="" disabled>Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="transgender">Transgender</option>
                    </select>
                  </InputWithTooltip>
                </div>

              {/* Designation */}
              <div>
                  <InputWithTooltip label="Designation">
                    <Select
                      isMulti
                      options={designations}
                      value={designations.filter(opt =>
                        reportingAuthority.designation.includes(opt.value)
                      )}
                      onChange={handleReportingAuthorityDesignationChange}
                      placeholder="Designation"
                      menuPortalTarget={document.body}
                      styles={selectMenuPortalStyles}
                        className="react-select-container w-full border border-gray-300 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-200 hover:border-pink-300 bg-white"
                      classNamePrefix="react-select"
                    />
                  </InputWithTooltip>
                </div>

              {/* Mobile Number */}
              <div>
                  <InputWithTooltip label="Mobile Number" required>
                    <input
                      type="text"
                      name="phone1"
                      placeholder="Mobile Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                      value={reportingAuthority.phone1}
                      onChange={handleReportingAuthorityChange}
                      onBlur={(e) => validateWithFeedback('phone', e.target.value, true)}
                      maxLength="10"
                      required
                    />
                  </InputWithTooltip>
                </div>

              {/* Email Address */}
              <div>
                  <InputWithTooltip label="Email Address" required>
                    <input
                      type="email"
                      name="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                      placeholder="Email Address"
                      value={reportingAuthority.email}
                      onChange={handleReportingAuthorityChange}
                      onBlur={(e) => validateWithFeedback('email', e.target.value, true)}
                      required
                    />
                  </InputWithTooltip>
              </div>

              {/* WhatsApp Number */}
              <div>
                <InputWithTooltip label="WhatsApp Number">
                  <input
                    type="text"
                    name="phone2"
                    placeholder="WhatsApp Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-gray-700"
                    value={reportingAuthority.phone2}
                    onChange={handleReportingAuthorityChange}
                    onBlur={(e) => validateWithFeedback('phone', e.target.value, true)}
                    maxLength="10"
                    disabled={reportingAuthoritySameNumber}
                  />
                </InputWithTooltip>
                <label className="flex items-center space-x-3 mt-2">
                  <input
                    type="checkbox"
                    checked={reportingAuthoritySameNumber}
                    onChange={(e) => setReportingAuthoritySameNumber(e.target.checked)}
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-200"
                  />
                  <span className="text-sm text-gray-700">WhatsApp Number same as Mobile Number</span>
                </label>
              </div>
              </div>
          </CollapsibleSection>
        )}

        {/* Submit Button */}
          {selectedType && (
          <div className="mt-6 sm:mt-8 text-center">
              <button 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 duration-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save details"}
              </button>
            </div>
          )}
      </form>
    </div>
  );
};

export default OrgDetails;