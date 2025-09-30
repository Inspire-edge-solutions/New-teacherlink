import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const BackButton = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // If no history, go to home
      navigate('/');
    }
  };

  return (
    <button 
      onClick={handleBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        color: '#475569',
        fontSize: '14px',
        cursor: 'pointer',
        marginBottom: '5px',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = '#e2e8f0';
        e.target.style.color = '#1d4ed8';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = '#f8fafc';
        e.target.style.color = '#475569';
      }}
    >
      <FaArrowLeft size={12} />
      Back
    </button>
  );
};

export default BackButton; 