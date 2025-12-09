import React, { useState, useEffect } from 'react';
import { Fade, Zoom, Paper, Skeleton, Box } from '@mui/material';

const HowItWorks = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setChecked(true), 100);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      number: 1,
      title: 'Choose Package',
      description: 'Select the advertising package that fits your needs'
    },
    {
      number: 2,
      title: 'Contact Us',
      description: 'Get in touch with our team to discuss your requirements'
    },
    {
      number: 3,
      title: 'Customize',
      description: "We'll customize the campaign to match your brand if needed"
    },
    {
      number: 4,
      title: 'Launch',
      description: 'Your advertisement goes live and starts attracting candidates'
    }
  ];

  if (loading) {
    return (
      <Paper elevation={4} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <Skeleton variant="text" width={200} height={32} sx={{ mx: 'auto', mb: 4 }} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <Skeleton variant="circular" width={48} height={48} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="100%" height={20} />
            </div>
          ))}
        </div>
      </Paper>
    );
  }

  return (
    <Fade in={checked} timeout={800}>
      <Paper elevation={4} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <Fade in={checked} timeout={1000} style={{ transitionDelay: '200ms' }}>
          <h2 className="text-xl font-semibold bg-gradient-brand-text bg-clip-text text-transparent text-center mb-4 leading-tight tracking-tight">How It Works</h2>
        </Fade>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <Fade 
              key={step.number} 
              in={checked} 
              timeout={1000} 
              style={{ transitionDelay: `${400 + index * 150}ms` }}
            >
              <div className="text-center">
                <Zoom 
                  in={checked} 
                  timeout={800} 
                  style={{ transitionDelay: `${600 + index * 150}ms` }}
                >
                  <div className="w-12 h-12 bg-gradient-brand hover:bg-gradient-primary-hover rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 leading-tight tracking-tight">
                    {step.number}
                  </div>
                </Zoom>
                <h3 className="text-xl font-semibold text-gray-800 mb-1 leading-snug tracking-tight">{step.title}</h3>
                <p className="text-base text-gray-600 leading-normal tracking-tight">{step.description}</p>
              </div>
            </Fade>
          ))}
        </div>
      </Paper>
    </Fade>
  );
};

export default HowItWorks;