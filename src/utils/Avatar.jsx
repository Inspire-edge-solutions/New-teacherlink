// Import default avatar images from assets
import defaultMaleAvatar from '../assets/default_male_avatar.jpg';
import defaultFemaleAvatar from '../assets/default_female_avatar.jpg';

// Gender-specific default avatars utility
export const getDefaultAvatar = (gender) => {
    const normalizedGender = gender?.toLowerCase();
    
    if (normalizedGender === 'female' || normalizedGender === 'woman') {
      return defaultFemaleAvatar;
    } else if (normalizedGender === 'male' || normalizedGender === 'man') {
      return defaultMaleAvatar;
    } else {
      // For unknown/unspecified gender, use male as default
      return defaultMaleAvatar;
    }
  };
  
  // Fallback SVG avatar for when default images fail to load
  export const fallbackAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24'%3E%3Cpath fill='%236B7280' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
  
  // Function to handle image error with fallback sequence
  export const handleImageError = (e, gender) => {
    const normalizedGender = gender?.toLowerCase();
    
    // Prevent infinite loop - if already showing fallback, don't change
    if (e.target.src.startsWith('data:image/svg') || 
        e.target.src.includes('default_male_avatar') || 
        e.target.src.includes('default_female_avatar')) {
      return;
    }
    
    // Use default avatar based on gender
    if (normalizedGender === 'female' || normalizedGender === 'woman') {
      e.target.src = defaultFemaleAvatar;
    } else if (normalizedGender === 'male' || normalizedGender === 'man') {
      e.target.src = defaultMaleAvatar;
    } else {
      e.target.src = defaultMaleAvatar;
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