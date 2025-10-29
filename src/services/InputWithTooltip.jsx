import React from 'react';

/**
 * Reusable component for form inputs with hover tooltips
 * Usage: <InputWithTooltip label="Field Name" required>...</InputWithTooltip>
 * If required prop is true, the input will have a gradient border
 */
const InputWithTooltip = ({ label, required = false, children }) => {
  const gradientBorderStyle = {
    background: 'linear-gradient(90deg, #F34B58 0%, #A1025D 100%)',
    padding: '2px',
    borderRadius: '0.5rem'
  };

  return (
    <div className="relative group">
      {required ? (
        <div 
          style={gradientBorderStyle}
          className="relative rounded-lg"
        >
          <div className="bg-white rounded-lg">
            {children}
          </div>
        </div>
      ) : (
        children
      )}
      {/* Tooltip with gradient-brand background - can be reused across application */}
      <div className="absolute -top-8 left-0 bg-gradient-brand text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {label} {required && '*'}
      </div>
    </div>
  );
};

export default InputWithTooltip;

