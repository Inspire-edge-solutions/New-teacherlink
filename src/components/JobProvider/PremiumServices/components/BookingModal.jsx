import React, { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import ModalPortal from '../../../common/ModalPortal';
import InputWithTooltip from '../../../../services/InputWithTooltip';
import { Fade, Slide, Paper, Zoom, Checkbox, FormControlLabel, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Radio, RadioGroup, FormControl, FormLabel } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';
import axios from 'axios';

const PREMIUM_SERVICE_API = 'https://c84gq6yg5d.execute-api.ap-south-1.amazonaws.com/dev/premium-service';

const BookingModal = ({ isOpen, selectedPackage, onClose, onSubmit }) => {
  const { user } = useAuth();
  const firebase_uid = user?.uid;
  
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    message: '',
    mediaType: '', // 'image' or 'video'
    image: null,
    video: null,
    prepareContent: false
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Helper: Get auth token
  const getAuthToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Helper: Prepare headers for authenticated API calls
  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return { "Content-Type": "application/json" };
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  // Helper: Upload file to S3 using presigned URL
  const uploadToS3ViaPresignedUrl = async (file, presignedUrl) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let timeoutId;
      
      // Set timeout (5 minutes for large files)
      const timeout = 5 * 60 * 1000; // 5 minutes
      
      timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error('Upload timeout. The file may be too large. Please try a smaller file.'));
      }, timeout);
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${percentComplete.toFixed(1)}%`);
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);
        if (xhr.status === 200 || xhr.status === 204) {
          resolve(true);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload failed due to network error. Please check your internet connection.'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload was aborted'));
      });

      xhr.addEventListener('timeout', () => {
        clearTimeout(timeoutId);
        xhr.abort();
        reject(new Error('Upload timeout. Please try again with a smaller file.'));
      });

      try {
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.timeout = timeout;
        xhr.send(file);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start upload: ${error.message}`));
      }
    });
  };

  // Helper: Get presigned URL and upload file to S3, return S3 key
  const uploadFileToS3 = async (file, uploadType) => {
    if (!file) return null;

    // Validate file size (max 100MB for videos, 10MB for images)
    const maxSize = uploadType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(`File size exceeds ${maxSizeMB}MB limit. Please use a smaller file.`);
    }

    try {
      // Generate S3 key (same format as backend uses for base64 uploads)
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `premium-service/${firebase_uid}/${timestamp}_${sanitizedFileName}`;

      // Get presigned URL from backend with the formatted S3 key
      toast.info(`Preparing ${uploadType} upload...`, { toastId: `presign-${uploadType}`, autoClose: 2000 });
      
      const presignResponse = await axios.post(
        PREMIUM_SERVICE_API,
        {
          fileName: s3Key, // Use the formatted S3 key as fileName
          fileType: file.type,
          uploadType: uploadType
        },
        { 
          headers: getAuthHeaders(),
          timeout: 15000 // 15 second timeout for presigned URL request
        }
      );

      if (!presignResponse.data || !presignResponse.data.uploadUrl) {
        throw new Error('Failed to get upload URL from server');
      }

      const { uploadUrl } = presignResponse.data;

      // Upload file directly to S3 using presigned URL
      toast.info(`Uploading ${uploadType}... This may take a moment for large files.`, { 
        toastId: `upload-${uploadType}`, 
        autoClose: false 
      });
      
      await uploadToS3ViaPresignedUrl(file, uploadUrl);

      toast.dismiss(`upload-${uploadType}`);
      toast.dismiss(`presign-${uploadType}`);
      return s3Key;
    } catch (error) {
      console.error(`Error uploading ${uploadType}:`, error);
      toast.dismiss(`presign-${uploadType}`);
      toast.dismiss(`upload-${uploadType}`);
      
      // Provide more specific error messages
      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(`Upload failed: ${errorMsg}`);
      } else if (error.request) {
        throw new Error('Upload failed: No response from server. Please check your internet connection.');
      } else {
        throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Helper: Submit premium service data to API
  const submitPremiumService = async (data) => {
    if (!firebase_uid) {
      throw new Error("User not authenticated");
    }

    try {
      const payload = {
        firebase_uid: firebase_uid,
        name: data.name,
        institution_name: data.schoolName,
        message: data.message,
        prepare_video_images: data.prepareContent || false
      };

      // Upload image using presigned URL if provided
      if (data.image) {
        try {
          toast.info("Uploading image to server...", { toastId: "upload-image", autoClose: false });
          const imageKey = await uploadFileToS3(data.image, 'image');
          payload.image = imageKey; // Send S3 key instead of base64
          toast.dismiss("upload-image");
        } catch (error) {
          toast.dismiss("upload-image");
          throw new Error(`Image upload failed: ${error.message}`);
        }
      }

      // Upload video using presigned URL if provided (much faster than base64)
      if (data.video) {
        try {
          toast.info("Uploading video to server... This may take a moment for large files.", { 
            toastId: "upload-video", 
            autoClose: false 
          });
          const videoKey = await uploadFileToS3(data.video, 'video');
          payload.video = videoKey; // Send S3 key instead of base64
          toast.dismiss("upload-video");
        } catch (error) {
          toast.dismiss("upload-video");
          throw new Error(`Video upload failed: ${error.message}`);
        }
      }

      // Submit the form data with S3 keys
      toast.info("Saving your premium service details...", { toastId: "save-service", autoClose: false });
      
      console.log("Submitting payload to API:", {
        firebase_uid: payload.firebase_uid,
        name: payload.name,
        institution_name: payload.institution_name,
        hasImage: !!payload.image,
        hasVideo: !!payload.video,
        prepare_video_images: payload.prepare_video_images
      });
      
      const response = await axios.post(PREMIUM_SERVICE_API, payload, {
        headers: getAuthHeaders(),
        timeout: 30000 // 30 second timeout
      });

      console.log("API Response:", response.data);
      
      if (!response.data) {
        throw new Error("No response data from server");
      }

      toast.dismiss("save-service");
      return response.data;
    } catch (error) {
      console.error("Premium service submission error:", error);
      toast.dismiss("save-service");
      toast.dismiss("upload-image");
      toast.dismiss("upload-video");
      
      if (error.code === 'ECONNABORTED') {
        throw new Error("Request timed out. Please try again with a smaller file.");
      }
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to submit premium service";
      throw new Error(errorMessage);
    }
  };

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      console.log("Razorpay already loaded");
      return; // already loaded
    }

    console.log("Loading Razorpay script...");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      toast.error("Failed to load payment system. Please refresh the page.");
    };
    document.body.appendChild(script);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMediaTypeChange = (e) => {
    const newMediaType = e.target.value;
    setFormData(prev => ({
      ...prev,
      mediaType: newMediaType,
      // Clear the other media type when switching
      image: newMediaType === 'image' ? prev.image : null,
      video: newMediaType === 'video' ? prev.video : null
    }));
    // Clear previews
    if (newMediaType === 'image') {
      setVideoPreview(null);
    } else {
      setImagePreview(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB for images)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("Image file size exceeds 10MB limit. Please select a smaller image.");
        e.target.value = ''; // Reset input
        return;
      }

      // Validate image file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file.");
        e.target.value = ''; // Reset input
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error("Video file size exceeds 100MB limit. Please select a smaller file.");
        e.target.value = ''; // Reset input
        return;
      }

      // Validate video file type
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a valid video file.");
        e.target.value = ''; // Reset input
        return;
      }

      setFormData(prev => ({
        ...prev,
        video: file
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveVideo = () => {
    setFormData(prev => ({
      ...prev,
      video: null
    }));
    setVideoPreview(null);
  };

  // Handle payment for premium service when checkbox is NOT checked
  const proceedWithPremiumServicePayment = async () => {
    if (!window.Razorpay) {
      toast.info("Loading payment system, please wait...");
      setTimeout(() => proceedWithPremiumServicePayment(), 800);
      return;
    }

    if (!firebase_uid) {
      toast.error("User not logged in!");
      setIsProcessing(false);
      return;
    }

    toast.dismiss();
    toast.info("Preparing payment...", { toastId: "pay-prepare", autoClose: false });

    try {
      // 1. Fetch user details from login API
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const userData = await userRes.json();

      let userName = "";
      let userNumber = "";

      if (Array.isArray(userData) && userData.length > 0) {
        userName = userData[0]?.name || "";
        userNumber = userData[0]?.phone_number || "";
      } else if (userData?.name) {
        userName = userData.name;
        userNumber = userData.phone_number || "";
      }

      // 2. Create order on backend for premium service (₹2000)
      const res = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            firebase_uid,
            amount: 2000, // ₹2000 fixed amount
            currency: "INR",
            receipt: `premium_service_${Date.now()}`,
            name: userName,
            number: userNumber,
            premium_service: true // Set premium_service flag to true
          }),
        }
      );

      if (!res.ok) {
        let errorData;
        try {
          const text = await res.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { message: text || `Server error: ${res.status} ${res.statusText}` };
          }
        } catch {
          errorData = { message: `Server error: ${res.status} ${res.statusText}` };
        }
        toast.dismiss("pay-prepare");
        const errorMessage = errorData.message || errorData.error || errorData.errorMessage || `Failed to create order (${res.status}). Please try again.`;
        toast.error(errorMessage);
        console.error("Order creation failed - Full error:", {
          status: res.status,
          statusText: res.statusText,
          errorData: errorData
        });
        setIsProcessing(false);
        return;
      }

      const order = await res.json();

      if (!order.id) {
        toast.dismiss("pay-prepare");
        toast.error(order.message || "Failed to create order. Please try again.");
        console.error("Order response missing id:", order);
        setIsProcessing(false);
        return;
      }

      // 3. Setup Razorpay checkout options
      const options = {
        key: "rzp_live_93pNpUOJq57lgB", // Live Razorpay key
        amount: order.amount, // Amount in paise (from backend)
        currency: order.currency || "INR",
        name: "TeacherLink",
        description: `Premium Service - Advertising (₹2000)`,
        order_id: order.id,
        handler: async function (response) {
          console.log("Payment successful:", response);
          toast.dismiss("pay-prepare");
          toast.info("Processing payment...", { toastId: "pay-done", autoClose: false });

          try {
            // 4. Update payment status on backend after success
            const putRes = await fetch(
              "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
              {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  status: "paid",
                  payment_data: response,
                  firebase_uid,
                  premium_service: true // Set premium_service flag to true
                }),
              }
            );

            if (!putRes.ok) throw new Error("Failed to update payment status");

            toast.dismiss("pay-done");
            
            // 5. After successful payment, submit premium service data to backend
            try {
              toast.info("Saving your premium service...", { toastId: "save-service", autoClose: false });
              await submitPremiumService({
                ...formData,
                prepareContent: false
              });
              toast.dismiss("save-service");
              toast.success("Payment successful! Your premium service has been submitted successfully!");
              
              // Reset processing state before closing
              setIsProcessing(false);
              
              onSubmit({
                package: selectedPackage,
                ...formData,
                paymentStatus: 'paid',
                requiresContentCreation: false,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              });
              
              // Close booking modal first, then show success dialog
              onClose();
              setTimeout(() => {
                setShowSuccessDialog(true);
              }, 300);
            } catch (submitError) {
              toast.dismiss("save-service");
              console.error("Error submitting premium service:", submitError);
              const errorMsg = submitError?.response?.data?.message || submitError?.response?.data?.error || submitError?.message || "Failed to submit premium service";
              toast.error(`Payment successful, but failed to save service details: ${errorMsg}. Please contact support.`);
              setIsProcessing(false);
            }
          } catch (err) {
            toast.dismiss("pay-done");
            toast.error("Payment captured, but could not update status. Contact support.");
            console.error(err);
            setIsProcessing(false);
          }
        },
        prefill: {
          name: userName,
          email: user?.email || "",
          contact: userNumber,
        },
        theme: { color: "#F34B58" },
        modal: {
          ondismiss: function () {
            toast.dismiss("pay-prepare");
            toast.info("Payment window closed.");
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      
      // Add error handler
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed:", response);
        toast.error(`Payment failed: ${response.error.description || "Unknown error"}`);
        setIsProcessing(false);
      });
      
      rzp.open();
    } catch (err) {
      toast.dismiss("pay-prepare");
      console.error("Payment error:", err);
      const errorMessage = err?.message || err?.toString() || "Error starting payment. Please try again.";
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  // Handle payment for advertising service (currently not used - uploads go directly to backend)
  const _proceedWithPayment = async () => {
    console.log("proceedWithPayment called");
    console.log("window.Razorpay:", window.Razorpay);
    console.log("firebase_uid:", firebase_uid);
    
    if (!window.Razorpay) {
      console.log("Razorpay not loaded, waiting...");
      toast.info("Loading payment system, please wait...");
      setTimeout(() => _proceedWithPayment(), 800);
      return;
    }

    if (!firebase_uid) {
      console.error("No firebase_uid found");
      toast.error("User not logged in!");
      setIsProcessing(false);
      return;
    }

    toast.dismiss();
    toast.info("Preparing payment...", { toastId: "pay-prepare", autoClose: false });

    try {
      // 1. Fetch user details from login API
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(firebase_uid)}`
      );
      const userData = await userRes.json();

      let userName = "";
      let userNumber = "";

      if (Array.isArray(userData) && userData.length > 0) {
        userName = userData[0]?.name || "";
        userNumber = userData[0]?.phone_number || "";
      } else if (userData?.name) {
        userName = userData.name;
        userNumber = userData.phone_number || "";
      }

      // 2. Create order on backend
      // Convert price to number if it's a string
      const amount = typeof selectedPackage.price === 'string' 
        ? parseFloat(selectedPackage.price) 
        : selectedPackage.price;

      console.log("Creating order with payload:", {
        firebase_uid,
        amount: amount,
        amountType: typeof amount,
        currency: "INR",
        receipt: `advertising_${selectedPackage.id}_${Date.now()}`,
        name: userName,
        number: userNumber,
      });

      const res = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            firebase_uid,
            amount: amount, // Amount in rupees (backend converts to paise)
            currency: "INR",
            receipt: `advertising_${selectedPackage.id}_${Date.now()}`,
            name: userName,
            number: userNumber,
          }),
        }
      );

      console.log("Order creation response status:", res.status, res.statusText);

      if (!res.ok) {
        let errorData;
        try {
          const text = await res.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { message: text || `Server error: ${res.status} ${res.statusText}` };
          }
        } catch {
          errorData = { message: `Server error: ${res.status} ${res.statusText}` };
        }
        toast.dismiss("pay-prepare");
        const errorMessage = errorData.message || errorData.error || errorData.errorMessage || `Failed to create order (${res.status}). Please try again.`;
        toast.error(errorMessage);
        console.error("Order creation failed - Full error:", {
          status: res.status,
          statusText: res.statusText,
          errorData: errorData,
          responseHeaders: Object.fromEntries(res.headers.entries())
        });
        setIsProcessing(false);
        return;
      }

      const order = await res.json();
      console.log("Order created successfully:", order);

      if (!order.id) {
        toast.dismiss("pay-prepare");
        toast.error(order.message || "Failed to create order. Please try again.");
        console.error("Order response missing id:", order);
        setIsProcessing(false);
        return;
      }

      // 3. Setup Razorpay checkout options
      console.log("Opening Razorpay with order:", order);
      const options = {
        key: "rzp_live_93pNpUOJq57lgB", // Your live key
        amount: order.amount, // Amount in paise (from backend)
        currency: order.currency || "INR",
        name: "TeacherLink",
        description: `${selectedPackage.name} - Advertising Service`,
        order_id: order.id,
        handler: async function (response) {
          console.log("Payment successful:", response);
          toast.dismiss("pay-prepare");
          toast.info("Processing payment...", { toastId: "pay-done", autoClose: false });

          try {
            // 4. Update payment status on backend after success
            const putRes = await fetch(
              "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/razorpay/order",
              {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  status: "paid",
                  payment_data: response,
                  firebase_uid,
                }),
              }
            );

            if (!putRes.ok) throw new Error("Failed to update payment status");

            toast.dismiss("pay-done");
            
            // Submit form data to backend API
            try {
              toast.info("Saving your premium service details...", { toastId: "save-service", autoClose: false });
              await submitPremiumService({
                ...formData,
                prepareContent: false // Already uploaded their own content
              });
              toast.dismiss("save-service");
              toast.success("Payment successful! Your advertising service has been booked and saved.");
              
              onSubmit({
                package: selectedPackage,
                ...formData,
                paymentStatus: 'paid',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              });
              
              handleClose();
            } catch (submitError) {
              toast.dismiss("save-service");
              console.error("Error saving premium service:", submitError);
              toast.error(`Payment successful, but failed to save service details: ${submitError.message}. Please contact support.`);
              setIsProcessing(false);
            }
          } catch (err) {
            toast.dismiss("pay-done");
            toast.error("Payment captured, but could not update status. Contact support.");
            console.error(err);
            setIsProcessing(false);
          }
        },
        prefill: {
          name: userName,
          email: user?.email || "",
          contact: userNumber,
        },
        theme: { color: "#F34B58" },
        modal: {
          ondismiss: function () {
            toast.dismiss("pay-prepare");
            toast.info("Payment window closed.");
            setIsProcessing(false);
          },
        },
      };

      console.log("Creating Razorpay instance with options:", options);
      const rzp = new window.Razorpay(options);
      console.log("Razorpay instance created, opening...");
      
      // Add error handler
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed:", response);
        toast.error(`Payment failed: ${response.error.description || "Unknown error"}`);
        setIsProcessing(false);
      });
      
      rzp.open();
      console.log("Razorpay open() called");
    } catch (err) {
      toast.dismiss("pay-prepare");
      console.error("Payment error:", err);
      const errorMessage = err?.message || err?.toString() || "Error starting payment. Please try again.";
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);
    
    // Priority: If user wants TeacherLink to prepare content, no payment needed
    if (formData.prepareContent) {
      // No payment needed - just collect information and submit to API
      setIsProcessing(true);
      try {
        toast.info("Saving your premium service request...", { toastId: "save-request", autoClose: false });
        await submitPremiumService({
          ...formData,
          prepareContent: true
        });
        toast.dismiss("save-request");
        toast.success("Your request has been submitted successfully!");
        
        // Reset processing state before closing
        setIsProcessing(false);
        
        onSubmit({
          package: selectedPackage,
          ...formData,
          paymentStatus: 'pending',
          requiresContentCreation: true
        });
        
        // Close booking modal first, then show success dialog
        onClose();
        // Use setTimeout to ensure modal closes before dialog opens
        setTimeout(() => {
          setShowSuccessDialog(true);
        }, 300);
      } catch (submitError) {
        toast.dismiss("save-request");
        console.error("Error submitting premium service request:", submitError);
        const errorMsg = submitError?.response?.data?.message || submitError?.response?.data?.error || submitError?.message || "Failed to submit request";
        toast.error(`Failed to submit request: ${errorMsg}. Please try again.`);
        setIsProcessing(false);
      }
      return;
    }

    // If checkbox is NOT checked, require payment of ₹2000 (regardless of image/video upload)
    // User can submit with or without image/video, but payment is required
    console.log("Checkbox not checked - requiring payment before submission");
    setIsProcessing(true);
    proceedWithPremiumServicePayment();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      schoolName: '',
      message: '',
      mediaType: '',
      image: null,
      video: null,
      prepareContent: false
    });
    setImagePreview(null);
    setVideoPreview(null);
    setIsProcessing(false);
    setShowSuccessDialog(false);
    onClose();
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    // Reset form data when dialog closes
    setFormData({
      name: '',
      schoolName: '',
      message: '',
      mediaType: '',
      image: null,
      video: null,
      prepareContent: false
    });
    setImagePreview(null);
    setVideoPreview(null);
  };

  return (
    <>
      {isOpen && selectedPackage && (
        <ModalPortal>
        <Fade in={isOpen} timeout={300}>
          <div 
            className="fixed inset-0 bg-black/50 z-50 p-2 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh'
            }}
          >
            <Slide direction="up" in={isOpen} timeout={400}>
              <Paper
                elevation={24}
                sx={{
                  backgroundColor: '#F0D8D9',
                  borderRadius: '0.75rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  maxWidth: '42rem',
                  width: '100%',
                  padding: { xs: '0.75rem', sm: '1rem', md: '1.5rem' },
                  margin: { xs: '1rem auto', sm: '2rem auto' },
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}
                className="max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <h3 className="text-xl font-semibold text-gray-800 leading-tight tracking-tight">Book Advertising Service</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-base w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <p className="text-base text-gray-800 mb-1 sm:mb-2 leading-normal tracking-tight">
            Selected Package: 
            <span className="font-semibold text-gray-800 text-base ml-1 leading-snug tracking-tight"> {selectedPackage.name} </span>
          </p>
          <p className="text-base font-bold text-pink-600 mt-1 sm:mt-2 leading-tight tracking-tight">₹{selectedPackage.price} / {selectedPackage.duration}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Name and School Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InputWithTooltip label="Name" required>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none leading-normal tracking-tight"
                placeholder="Enter your name"
              />
            </InputWithTooltip>
            <InputWithTooltip label="Institution Name" required>
              <input
                type="text"
                id="schoolName"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none leading-normal tracking-tight"
                placeholder="Enter Institution name"
              />
            </InputWithTooltip>
          </div>

          {/* Message Textarea */}
          <InputWithTooltip label="Write your message" required>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none leading-normal tracking-tight"
              placeholder="Write your message"
            />
          </InputWithTooltip>

          {/* Media Type Selection with Radio Buttons and Upload Input */}
          <Box 
            sx={{ 
              p: 1.5, 
              bgcolor: 'rgba(255, 255, 255, 0.5)', 
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              mb: 2
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {/* Left Side - Radio Buttons (Vertical) */}
              <div>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel 
                    component="legend" 
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      fontWeight: 'semibold',
                      color: '#000000 !important',
                      mb: 1,
                      '&.Mui-focused': {
                        color: '#000000 !important'
                      }
                    }}
                  >
                    Select Media Type
                  </FormLabel>
                  <RadioGroup
                    name="mediaType"
                    value={formData.mediaType}
                    onChange={handleMediaTypeChange}
                    sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <FormControlLabel
                      value="image"
                      control={
                        <Radio
                          sx={{
                            color: '#F34B58',
                            '&.Mui-checked': {
                              color: '#A1025D',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: { xs: '1.125rem', sm: '1.25rem' }
                            }
                          }}
                        />
                      }
                      label={
                        <span className="text-base text-gray-800 font-medium leading-normal tracking-tight">
                          Image
                        </span>
                      }
                    />
                    <FormControlLabel
                      value="video"
                      control={
                        <Radio
                          sx={{
                            color: '#F34B58',
                            '&.Mui-checked': {
                              color: '#A1025D',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: { xs: '1.125rem', sm: '1.25rem' }
                            }
                          }}
                        />
                      }
                      label={
                        <span className="text-base text-gray-800 font-medium leading-normal tracking-tight">
                          Video
                        </span>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </div>

              {/* Right Side - Upload Input (Shows when media type is selected) */}
              <div className="flex items-center justify-center min-h-full">
                {formData.mediaType === 'image' && (
                  <div className="w-full">
                    <InputWithTooltip label="Upload image">
                      <div className="relative">
                        <input
                          type="file"
                          id="image"
                          name="image"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="image"
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 transition-colors hover:bg-gray-100 active:bg-gray-200"
                        >
                          <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaPlus className="text-white text-xs" />
                          </div>
                          <span className="text-gray-700 text-base truncate leading-normal tracking-tight">
                            {imagePreview ? 'Image selected' : 'Choose image'}
                          </span>
                        </label>
                        {imagePreview && (
                          <div className="mt-2 relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-24 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                              aria-label="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </InputWithTooltip>
                  </div>
                )}

                {formData.mediaType === 'video' && (
                  <div className="w-full">
                    <InputWithTooltip label="Upload video">
                      <div className="relative">
                        <input
                          type="file"
                          id="video"
                          name="video"
                          accept="video/*"
                          onChange={handleVideoChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="video"
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 transition-colors hover:bg-gray-100 active:bg-gray-200"
                        >
                          <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaPlus className="text-white text-xs" />
                          </div>
                          <span className="text-gray-700 text-base truncate leading-normal tracking-tight">
                            {videoPreview ? 'Video selected' : 'Choose video'}
                          </span>
                        </label>
                        {videoPreview && (
                          <div className="mt-2 relative">
                            <video
                              src={videoPreview}
                              controls
                              className="w-full h-24 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveVideo}
                              className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                              aria-label="Remove video"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </InputWithTooltip>
                  </div>
                )}

                {!formData.mediaType && (
                  <div className="w-full flex items-center justify-center min-h-[40px]">
                    <p className="text-sm text-gray-500 text-center">
                      Select a media type
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Box>

          {/* Prepare Content Checkbox */}
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(255, 255, 255, 0.5)', 
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.prepareContent}
                  onChange={handleInputChange}
                  name="prepareContent"
                  sx={{
                    color: '#F34B58',
                    '&.Mui-checked': {
                      color: '#A1025D',
                    },
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.5rem' }
                    }
                  }}
                />
              }
              label={
                <span className="text-base text-gray-800 font-medium leading-normal tracking-tight">
                  I would like TeacherLink to prepare video/images for my advertisement
                </span>
              }
              sx={{
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': {
                  marginTop: { xs: '0.25rem', sm: '0.375rem' }
                }
              }}
            />
            {formData.prepareContent && (
              <Fade in={formData.prepareContent} timeout={300}>
                <Box sx={{ mt: 1.5, ml: 4.5, pr: 1 }}>
                  <p className="text-sm text-gray-600 italic leading-normal tracking-tight">
                    Our creative team will work with you to design professional video and image content for your advertisement.
                  </p>
                </Box>
              </Fade>
            )}
          </Box>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:flex-1 py-2.5 sm:py-3 text-base bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors leading-normal tracking-tight"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:flex-1 py-2.5 sm:py-3 text-base bg-gradient-brand text-white rounded-lg font-semibold hover:bg-gradient-primary-hover active:opacity-90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 leading-normal tracking-tight"
            >
              {isProcessing ? (
                <>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  <span>Processing...</span>
                </>
              ) : (
                'Book Service'
              )}
            </button>
          </div>
        </form>
            </Paper>
          </Slide>
        </div>
      </Fade>
        </ModalPortal>
      )}
      
      {/* Success Dialog Popup - Outside ModalPortal for proper z-index */}
      <Dialog
        open={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: '#F0D8D9',
            borderRadius: '0.75rem',
            padding: { xs: '0.5rem', sm: '1rem' },
            maxWidth: '500px',
            width: '90%',
            zIndex: 9999
          }
        }}
        sx={{
          zIndex: 9999
        }}
      >
        <DialogTitle 
          id="success-dialog-title"
          className="bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 'bold',
            textAlign: 'center',
            pb: 1,
            lineHeight: '1.2',
            letterSpacing: '-0.025em'
          }}
        >
          Thank You!
        </DialogTitle>
        <DialogContent>
          <DialogContentText 
            id="success-dialog-description"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              color: '#333',
              textAlign: 'center',
              lineHeight: 1.5,
              letterSpacing: '-0.025em'
            }}
          >
            Thank you for your interest! Our creative team will connect with you shortly to discuss customization options for your advertisement.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
          <Button
            onClick={handleSuccessDialogClose}
            variant="contained"
            className="bg-gradient-brand text-white font-semibold px-8 py-2 rounded-lg hover:bg-gradient-primary-hover transition-all shadow-md leading-normal tracking-tight"
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              background: 'linear-gradient(135deg, #F34B58 0%, #A1025D 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #A1025D 0%, #F34B58 100%)',
              },
              lineHeight: 1.5,
              letterSpacing: '-0.025em'
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookingModal;