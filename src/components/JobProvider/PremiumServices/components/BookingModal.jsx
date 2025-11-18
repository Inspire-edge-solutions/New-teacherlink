import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ModalPortal from '../../../common/ModalPortal';
import InputWithTooltip from '../../../../services/InputWithTooltip';

const BookingModal = ({ isOpen, selectedPackage, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    message: '',
    image: null,
    video: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      package: selectedPackage,
      ...formData
    });
    // Reset form
    setFormData({
      name: '',
      schoolName: '',
      message: '',
      image: null,
      video: null
    });
    setImagePreview(null);
    setVideoPreview(null);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      schoolName: '',
      message: '',
      image: null,
      video: null
    });
    setImagePreview(null);
    setVideoPreview(null);
    onClose();
  };

  if (!isOpen || !selectedPackage) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="bg-[#F0D8D9] rounded-xl shadow-2xl max-w-2xl w-full px-4 py-2 my-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Book Advertising Service</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        
        <div className="mb-2 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-800 mb-2">Selected Package: 
          <span className="font-semibold text-gray-800 text-lg"> {selectedPackage.name} </span></p>
          <p className="text-lg font-bold text-pink-600 mt-2">₹{selectedPackage.price} / {selectedPackage.duration}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and School Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithTooltip label="Name" required>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none"
              placeholder="Write your message"
            />
          </InputWithTooltip>

          {/* Image and Video Upload Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add Image */}
            <InputWithTooltip label="Add image">
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
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white text-sm" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    {imagePreview ? 'Image selected' : 'Choose image'}
                  </span>
                </label>
                {imagePreview && (
                  <div className="mt-2 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, image: null }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
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
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white text-sm" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    {videoPreview ? 'Video selected' : 'Choose video'}
                  </span>
                </label>
                {videoPreview && (
                  <div className="mt-2 relative">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPreview(null);
                        setFormData(prev => ({ ...prev, video: null }));
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </InputWithTooltip>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-brand text-white rounded-lg font-semibold hover:bg-gradient-primary-hover transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              Book Service
            </button>
          </div>
        </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default BookingModal;

