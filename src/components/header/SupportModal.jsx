import React, { useState } from 'react';
import ModalPortal from '../common/ModalPortal';
import { MdClose } from 'react-icons/md';
import { useAuth } from '../../Context/AuthContext';
import { toast } from 'react-toastify';

const SupportModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    reportType: "",
    title: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldLimits = {
    title: 25,
    description: 100
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const maxLength = fieldLimits[name];

    setFormData(prev => ({
      ...prev,
      [name]: maxLength ? value.slice(0, maxLength) : value
    }));
  };

  // Validation functions
  const validateTitle = (title) => {
    if (!title || title.trim().length === 0) {
      return "Title is required";
    }
    
    const trimmedTitle = title.trim();
    const wordCount = trimmedTitle.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = trimmedTitle.length;
    
    // Check if it meets either word count (3-6 words) or character count (15-25 characters)
    if (wordCount < 3 || wordCount > 6) {
      if (charCount < 15 || charCount > 25) {
        return "Title must be 3-6 words OR 15-25 characters";
      }
    }
    
    return null; // Valid
  };

  const validateDescription = (description) => {
    if (!description || description.trim().length === 0) {
      return "Description is required";
    }
    
    const trimmedDesc = description.trim();
    const sentenceCount = trimmedDesc.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
    const charCount = trimmedDesc.length;
    
    // Check if it meets either sentence count (2-3 sentences) or character count (50-100 characters)
    if (sentenceCount < 2 || sentenceCount > 3) {
      if (charCount < 50 || charCount > 100) {
        return "Description must be 2-3 sentences OR 50-100 characters";
      }
    }
    
    return null; // Valid
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic field validation
    if (!formData.reportType || !formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Advanced validation
    const titleError = validateTitle(formData.title);
    if (titleError) {
      toast.error(titleError);
      return;
    }

    const descriptionError = validateDescription(formData.description);
    if (descriptionError) {
      toast.error(descriptionError);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Fetch user details from login API using firebase_uid
      const userRes = await fetch(
        `https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login?firebase_uid=${encodeURIComponent(user.uid)}`
      );
      const userData = await userRes.json();

      let userName = "";
      let userEmail = "";
      let userPhone = "";

      if (Array.isArray(userData) && userData.length > 0) {
        userName = userData[0]?.name || "";
        userEmail = userData[0]?.email || "";
        userPhone = userData[0]?.phone_number || "";
      } else if (userData?.name) {
        userName = userData.name;
        userEmail = userData.email || "";
        userPhone = userData.phone_number || "";
      }

      // 2. Prepare report data according to the database schema
      const reportData = {
        issue: formData.reportType, // Dropdown data (non-technical/technical)
        title: formData.title, // Title field
        description: formData.description, // Description field
        reported_by: userName, // Name from login API
        email: userEmail, // Email from login API
        phone_number: userPhone ? parseInt(userPhone) : null // Phone number from login API (convert to bigint)
      };

      // 3. Submit report to the API
      const response = await fetch(
        "https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/report",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(reportData)
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Report submitted successfully!");
        setFormData({
          reportType: "",
          title: "",
          description: ""
        });
        onClose(); // Close modal on success
      } else {
        toast.error(result.message || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 leading-tight tracking-tight">Report Issues</h2>
            <p className="text-sm text-gray-600 mt-1 leading-normal tracking-tight">Report any issues or bugs you encounter</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Issue Category */}
          <div className="mb-4">
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2 leading-snug tracking-tight">
              Select Issue Category <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all" 
              id="reportType"
              name="reportType"
              value={formData.reportType}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>Select issue type</option>
              <option value="non-technical">Non-Technical issue</option>
              <option value="technical">Technical issue</option>
            </select>
          </div>
          
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2 leading-snug tracking-tight">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all"
              id="title"
              name="title"
              maxLength={fieldLimits.title}
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Example: Unable to upload the resume."
              required
            />
            <p className="text-xs text-gray-500 mt-1 leading-normal tracking-tight">3-6 words OR 15-25 characters</p>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 leading-snug tracking-tight">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F34B58] focus:border-transparent outline-none transition-all resize-none"
              id="description"
              name="description"
              maxLength={fieldLimits.description}
              value={formData.description}
              onChange={handleInputChange}
              rows="5"
              placeholder="Describe the issue in detail and any error messages or impact."
              required
            ></textarea>
            <p className="text-xs text-gray-500 mt-1 leading-normal tracking-tight">2-3 sentences OR 50-100 characters</p>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors leading-normal tracking-tight"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-[#F34B58] to-[#A1025D] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed leading-normal tracking-tight"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default SupportModal;

