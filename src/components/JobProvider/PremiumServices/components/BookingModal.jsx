import React, { useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import ModalPortal from '../../../common/ModalPortal';
import InputWithTooltip from '../../../../services/InputWithTooltip';
import { Fade, Slide, Paper, Zoom, Checkbox, FormControlLabel, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../Context/AuthContext';

const BookingModal = ({ isOpen, selectedPackage, onClose, onSubmit }) => {
  const { user } = useAuth();
  const firebase_uid = user?.uid;
  
  const MAX_IMAGES = 5; // Maximum number of images allowed
  
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    message: '',
    images: [],
    video: null,
    prepareContent: false
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Helper: Get auth token
  const getAuthToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // Helper: Prepare headers for authenticated API calls
  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) return { "Content-Type": "application/json" };
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const currentImageCount = formData.images.length;
      const remainingSlots = MAX_IMAGES - currentImageCount;
      
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`);
        e.target.value = '';
        return;
      }
      
      // Limit the number of files to the remaining slots
      const filesToAdd = files.slice(0, remainingSlots);
      
      if (files.length > remainingSlots) {
        toast.warning(`Only ${remainingSlots} more image${remainingSlots > 1 ? 's' : ''} can be added. Maximum ${MAX_IMAGES} images allowed.`);
      }
      
      // Add new images to existing ones
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...filesToAdd]
      }));
      
      // Create previews for new images
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  // Handle payment for advertising service
  const proceedWithPayment = async () => {
    console.log("proceedWithPayment called");
    console.log("window.Razorpay:", window.Razorpay);
    console.log("firebase_uid:", firebase_uid);
    
    if (!window.Razorpay) {
      console.log("Razorpay not loaded, waiting...");
      toast.info("Loading payment system, please wait...");
      setTimeout(() => proceedWithPayment(), 800);
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
          errorData = await res.json();
        } catch (e) {
          errorData = { message: `Server error: ${res.status} ${res.statusText}` };
        }
        toast.dismiss("pay-prepare");
        const errorMessage = errorData.message || errorData.error || `Failed to create order (${res.status}). Please try again.`;
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
            toast.success("Payment successful! Your advertising service has been booked.");
            
            // Submit form data to backend (TODO: Implement API call to save booking)
            onSubmit({
              package: selectedPackage,
              ...formData,
              paymentStatus: 'paid',
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id
            });
            
            handleClose();
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
      toast.error("Error starting payment. Please try again.");
      console.error("Payment error:", err);
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);
    
      // Priority: If user wants TeacherLink to prepare content, no payment needed
      if (formData.prepareContent) {
        // No payment needed - just collect information
        // Submit form data (TODO: Implement API call to save booking request)
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
        return;
      }

    // If prepareContent is not checked, check if user uploaded their own images/video
    if (formData.images.length > 0 || formData.video) {
      console.log("User uploaded content - proceeding with payment");
      // Proceed with payment
      setIsProcessing(true);
      try {
        await proceedWithPayment();
      } catch (error) {
        console.error("Error in proceedWithPayment:", error);
        toast.error("Failed to initiate payment. Please try again.");
        setIsProcessing(false);
      }
      return;
    }

    // If neither condition is met, show error
    console.log("Neither condition met - showing error");
    toast.error("Please either upload your own images/video or select the option for TeacherLink to prepare content.");
  };

  const handleClose = () => {
    setFormData({
      name: '',
      schoolName: '',
      message: '',
      images: [],
      video: null,
      prepareContent: false
    });
    setImagePreviews([]);
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
      images: [],
      video: null,
      prepareContent: false
    });
    setImagePreviews([]);
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
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight">Book Advertising Service</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-800 mb-1 sm:mb-2">
            Selected Package: 
            <span className="font-semibold text-gray-800 text-sm sm:text-base md:text-lg ml-1"> {selectedPackage.name} </span>
          </p>
          <p className="text-base sm:text-lg md:text-xl font-bold text-pink-600 mt-1 sm:mt-2">₹{selectedPackage.price} / {selectedPackage.duration}</p>
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
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
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
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
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
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none"
              placeholder="Write your message"
            />
          </InputWithTooltip>

          {/* Image and Video Upload Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Add Images */}
            <InputWithTooltip label={`Add images (max ${MAX_IMAGES})`}>
              <div className="relative">
                <input
                  type="file"
                  id="images"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={formData.images.length >= MAX_IMAGES}
                />
                <label
                  htmlFor="images"
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-300 rounded-lg transition-colors ${
                    formData.images.length >= MAX_IMAGES
                      ? 'bg-gray-200 cursor-not-allowed opacity-60'
                      : 'cursor-pointer bg-gray-50 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    formData.images.length >= MAX_IMAGES ? 'bg-gray-400' : 'bg-red-500'
                  }`}>
                    <FaPlus className="text-white text-xs sm:text-sm" />
                  </div>
                  <span className="text-gray-700 text-xs sm:text-sm truncate">
                    {imagePreviews.length > 0 
                      ? `${imagePreviews.length}/${MAX_IMAGES} image${imagePreviews.length > 1 ? 's' : ''} selected` 
                      : `Choose images (max ${MAX_IMAGES})`}
                  </span>
                </label>
                {imagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </InputWithTooltip>

            {/* Upload Video */}
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
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 transition-colors hover:bg-gray-100 active:bg-gray-200"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaPlus className="text-white text-xs sm:text-sm" />
                  </div>
                  <span className="text-gray-700 text-xs sm:text-sm truncate">
                    {videoPreview ? 'Video selected' : 'Choose video'}
                  </span>
                </label>
                {videoPreview && (
                  <div className="mt-2 relative">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPreview(null);
                        setFormData(prev => ({ ...prev, video: null }));
                      }}
                      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      aria-label="Remove video"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </InputWithTooltip>
          </div>

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
                <span className="text-sm sm:text-base text-gray-800 font-medium">
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
                  <p className="text-xs sm:text-sm text-gray-600 italic">
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
              className="w-full sm:flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-brand text-white rounded-lg font-semibold hover:bg-gradient-primary-hover active:opacity-90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          className="bg-gradient-brand-text bg-clip-text text-transparent"
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            fontWeight: 'bold',
            textAlign: 'center',
            pb: 1
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
              lineHeight: 1.6
            }}
          >
            Thank you for your interest! Our creative team will connect with you shortly to discuss customization options for your advertisement.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
          <Button
            onClick={handleSuccessDialogClose}
            variant="contained"
            className="bg-gradient-brand text-white font-semibold px-8 py-2 rounded-lg hover:bg-gradient-primary-hover transition-all shadow-md"
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              background: 'linear-gradient(135deg, #F34B58 0%, #A1025D 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #A1025D 0%, #F34B58 100%)',
              }
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

