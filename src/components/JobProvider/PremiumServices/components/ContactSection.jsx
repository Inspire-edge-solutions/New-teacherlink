import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaInfoCircle } from 'react-icons/fa';
import { Fade, Zoom, Paper, Tooltip, Skeleton, Box, Grow } from '@mui/material';

const ContactSection = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setChecked(true), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Paper 
        elevation={6} 
        sx={{ 
          backgroundColor: '#F0D8D9',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
          textAlign: 'center',
          color: 'black',
          marginBottom: '2rem'
        }}
        className="text-center"
      >
        <Skeleton variant="text" width={300} height={40} sx={{ mx: 'auto', mb: 3 }} />
        <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto', mb: 4 }} />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1, maxWidth: 300 }} />
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1, maxWidth: 300 }} />
        </div>
      </Paper>
    );
  }

  return (
    <Grow in={checked} timeout={1000}>
      <Paper 
        elevation={6}
        sx={{ 
          backgroundColor: '#F0D8D9',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
          textAlign: 'center',
          color: 'black',
          marginBottom: { xs: '1.5rem', sm: '2rem' },
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            elevation: 12
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          }
        }}
        className="text-center"
      >
        <Zoom in={checked} timeout={1000} style={{ transitionDelay: '200ms' }}>
          <h2 className="text-xl font-semibold mb-3 sm:mb-4 bg-gradient-brand-text bg-clip-text text-transparent leading-tight tracking-tight">Ready to Get Started?</h2>
        </Zoom>
        <Fade in={checked} timeout={1000} style={{ transitionDelay: '400ms' }}>
          <p className="text-base mb-3 sm:mb-4 opacity-90 px-2 leading-normal tracking-tight">
            Contact our advertising team to discuss custom packages and special offers
          </p>
        </Fade>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <Zoom in={checked} timeout={800} style={{ transitionDelay: '600ms' }}>
            <Tooltip title="Send us an email" arrow placement="top">
              <Box
                component="a"
                href="mailto:info@inspireedgesolutions.com"
                className="px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3 rounded-lg font-semibold text-base flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm hover:shadow-md break-all sm:break-normal leading-normal tracking-tight"
              >
                <FaEnvelope style={{ flexShrink: 0 }} />
                <Box component="span" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Email Us at : </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Email: </Box>
                  info@inspireedgesolutions.com
                </Box>
              </Box>
            </Tooltip>
          </Zoom>
          <Zoom in={checked} timeout={800} style={{ transitionDelay: '800ms' }}>
            <Tooltip title="Call us directly" arrow placement="top">
              <Box
                component="a"
                href="tel:+919980333603"
                className="px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3 font-semibold text-base transition-colors flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-lg shadow-sm hover:shadow-md leading-normal tracking-tight"
              >
                <FaInfoCircle style={{ flexShrink: 0 }} />
                <Box component="span" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Call Us at : </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Call: </Box>
                  +91 9980333603
                </Box>
              </Box>
            </Tooltip>
          </Zoom>
        </div>
      </Paper>
    </Grow>
  );
};

export default ContactSection;