import React, { useState, useEffect } from 'react';
import { FaBullhorn } from 'react-icons/fa';
import { Fade, Zoom, Skeleton, Box } from '@mui/material';

const Header = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setChecked(true), 100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Skeleton variant="circular" width={64} height={64} />
          <Skeleton variant="text" width={400} height={48} sx={{ fontSize: '2.5rem' }} />
        </div>
        <Skeleton variant="text" width={600} height={32} sx={{ fontSize: '1.25rem', mx: 'auto' }} />
      </div>
    );
  }

  return (
    <Fade in={checked} timeout={800}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Zoom in={checked} timeout={1000} style={{ transitionDelay: '200ms' }}>
            <div className="p-4 bg-gradient-brand rounded-full">
              <FaBullhorn className="text-white text-3xl" />
            </div>
          </Zoom>
          <Fade in={checked} timeout={1000} style={{ transitionDelay: '400ms' }}>
            <h1 className="text-3xl mb-4 p-2 font-bold bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">
              Premium Advertising Services
            </h1>
          </Fade>
        </div>
        <Fade in={checked} timeout={1000} style={{ transitionDelay: '600ms' }}>
          <p className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">
            Maximize your reach and attract the best teaching talent with our premium advertising packages.
          </p>
        </Fade>
      </div>
    </Fade>
  );
};

export default Header;

