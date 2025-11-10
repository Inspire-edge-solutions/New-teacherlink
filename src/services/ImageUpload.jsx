import React from 'react';
import PropTypes from 'prop-types';

const ImageUpload = ({ 
  imageFile, 
  onImageSelect, 
  placeholder = "Upload your image",
  accept = "image/*",
  id = "upload-image",
  className = ""
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageSelect(file);
    }
  };

  // Truncate filename if it's too long with mobile responsiveness
  const truncateFileName = (name, maxLength = 30) => {
    if (!name || name.length <= maxLength) return name;
    
    // Adjust max length based on screen width to prevent overlap
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth <= 360) {
        maxLength = 12; // Very aggressive truncation for small screens
      } else if (screenWidth <= 480) {
        maxLength = 16; // Aggressive truncation for mobile
      } else if (screenWidth <= 768) {
        maxLength = 20; // Moderate truncation for tablets
      }
    }
    
    if (name.length <= maxLength) return name;
    
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const availableLength = maxLength - extension.length - 4; // -4 for "..." and "."
    
    if (availableLength < 1) {
      // If name would be too short, show just extension
      return `...${extension}`;
    }
    
    const truncatedName = nameWithoutExt.substring(0, availableLength);
    return `${truncatedName}...${extension}`;
  };

  // Get display name from either file object or string filename
  const getDisplayName = () => {
    if (!imageFile) return placeholder;
    if (typeof imageFile === 'string') {
      // If it's a URL or path, get the filename
      const filename = imageFile.split('/').pop().split('?')[0];
      return truncateFileName(filename);
    }
    return truncateFileName(imageFile.name) || placeholder;
  };

  return (
    <div className={`relative max-w-full ${className}`}>
      <input
        type="text"
        value={getDisplayName()}
        placeholder={placeholder}
        readOnly
        className="w-full max-w-full px-4 py-3 pr-24 md:pr-28 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
        onClick={() => document.getElementById(id).click()}
        title={typeof imageFile === 'string' ? imageFile : imageFile?.name || placeholder}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-brand text-white rounded-lg hover:bg-gradient-primary-hover text-xs md:text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
        onClick={() => document.getElementById(id).click()}
      >
        Browse
      </button>
      <input
        id={id}
        type="file"
        accept={accept}
        style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
        onChange={handleFileChange}
      />
    </div>
  );
};

ImageUpload.propTypes = {
  imageFile: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string
  ]),
  onImageSelect: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  accept: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string
};

export default ImageUpload; 