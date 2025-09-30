// Gender-specific default avatars utility
export const getDefaultAvatar = (gender) => {
    const normalizedGender = gender?.toLowerCase();
    
    if (normalizedGender === 'female' || normalizedGender === 'woman') {
      return '/images/teacherlink_images/default_female_avatar.jpg';
    } else if (normalizedGender === 'male' || normalizedGender === 'man') {
      return '/images/teacherlink_images/default_male_avatar.jpg';
    } else {
      // For unknown/unspecified gender, use male as default
      return '/images/teacherlink_images/default_male_avatar.jpg';
    }
  };
  
  // Fallback SVG avatar for when default images fail to load
  export const fallbackAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
  
  // Function to handle image error with fallback sequence
  export const handleImageError = (e, gender) => {
    // If it's already showing the fallback, don't change
    if (e.target.src === fallbackAvatar) {
      return;
    }
    
    // If it's not a gender-specific default, try the gender default first
    if (!e.target.src.includes('default_male_avatar') && !e.target.src.includes('default_female_avatar')) {
      e.target.src = getDefaultAvatar(gender);
    } else {
      // If gender default failed, use fallback SVG
      e.target.src = fallbackAvatar;
    }
  };
  
  // Component for consistent avatar rendering
  export const AvatarImage = ({ 
    src, 
    alt, 
    gender, 
    className = '', 
    style = {},
    onError: customOnError,
    ...props 
  }) => {
    const handleError = (e) => {
      if (customOnError) {
        customOnError(e);
      } else {
        handleImageError(e, gender);
      }
    };
  
    return (
      <img
        src={src || getDefaultAvatar(gender)}
        alt={alt}
        className={className}
        style={style}
        onError={handleError}
        {...props}
      />
    );
  }; 