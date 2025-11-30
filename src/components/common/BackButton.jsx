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
      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-slate-600 cursor-pointer mb-1 transition-all duration-300 text-base leading-normal tracking-tight hover:bg-slate-200 hover:text-blue-700"
    >
      <FaArrowLeft size={12} />
      Back
    </button>
  );
};

export default BackButton; 