import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaArrowRight, FaCoins } from 'react-icons/fa';
import { Grow, Zoom, Paper, Tooltip, Skeleton, Box } from '@mui/material';

const HomepageBannerCard = ({ package: pkg, onSelectPackage }) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setChecked(true), 100);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Split features: first 4 for right side, rest for left side
  const rightSideFeatures = pkg.features.slice(0, 4);
  const leftSideFeatures = pkg.features.slice(4);

  if (loading) {
    return (
      <Paper elevation={8} className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
        {/* Header Skeleton */}
        <div className="bg-[#F0D8D9] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 1 }} />
              <Skeleton variant="text" width={200} height={24} />
            </div>
            <Skeleton variant="rectangular" width={120} height={28} sx={{ borderRadius: 16 }} />
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
          {/* Left Side Skeleton */}
          <div className="lg:col-span-3 px-6 py-5">
            <div className="text-center mb-4">
              <Skeleton variant="text" width="80%" height={28} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" width={150} height={48} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width={100} height={20} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="rectangular" width={180} height={40} sx={{ mx: 'auto', borderRadius: 1 }} />
            </div>
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" width="90%" height={16} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="85%" height={16} />
            </Box>
          </div>
          
          {/* Right Side Skeleton */}
          <div className="lg:col-span-2 bg-gradient-to-br from-pink-50 via-white to-gray-50 p-6 border-l border-gray-100">
            <Skeleton variant="text" width={120} height={24} sx={{ mb: 3 }} />
            <Box sx={{ space: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="100%" height={20} />
                </Box>
              ))}
            </Box>
          </div>
        </div>
      </Paper>
    );
  }

  return (
    <Grow in={checked} timeout={1000}>
      <Paper 
        elevation={8}
        className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100 hover:shadow-2xl transition-all duration-300"
        sx={{
          '&:hover': {
            transform: 'translateY(-4px)',
            transition: 'transform 0.3s ease-in-out'
          }
        }}
      >
      {/* Header Section - Compact */}
      <div className="bg-[#F0D8D9] px-5 py-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                {pkg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-black leading-tight tracking-tight truncate">{pkg.name}</h3>
              </div>
            </div>
            <Tooltip title="This package is currently available for booking" arrow>
              <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap flex-shrink-0 cursor-help">
                AVAILABLE NOW
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Left Side - Main Content (Optimized) */}
        <div className="lg:col-span-3 flex flex-col items-center">
          {/* Combined Price and Features Section */}
          <div className="px-6 py-5">
            {/* Price Section with Button - Centered */}
            <div className="mb-4 pb-4 text-center">
              {/* Description */}
              <p className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight mb-3">{pkg.description}</p>
              
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">₹{pkg.price}</span>
                <span className="text-gray-500 text-base leading-normal tracking-tight">/ {pkg.duration}</span>
              </div>
              
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <FaCoins className="text-yellow-500 text-xs" />
                <p className="text-lg sm:text-base text-gray-600 leading-normal tracking-tight">or pay with coins</p>
              </div>
              
              {/* Select Package Button */}
              <Zoom in={checked} timeout={1200} style={{ transitionDelay: '400ms' }}>
                <Tooltip title="Click to book this advertising package" arrow>
                  <button
                    onClick={() => onSelectPackage(pkg)}
                    className="w-auto px-8 py-2.5 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-brand text-white hover:bg-gradient-primary-hover shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transform mx-auto leading-normal tracking-tight"
                  >
                    <span>Select Package</span>
                    <FaArrowRight className="text-sm" />
                  </button>
                </Tooltip>
              </Zoom>
            </div>

            {/* Remaining Features (if any) - Compact Grid */}
            {leftSideFeatures.length > 0 && (
              <div>
                <ul className="grid grid-cols-1 gap-2">
                  {leftSideFeatures.map((feature, index) => (
                    <li key={index + 4} className="flex items-start gap-2">
                      <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-xs" />
                      <span className="text-base text-gray-700 leading-normal tracking-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - 4 Features (Narrower) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-pink-50 via-white to-gray-50 p-6 border-l border-gray-100">
          <h4 className="text-xl sm:text-lg font-bold mb-5 flex items-center gap-2 leading-tight tracking-tight">
            <div className="w-1 h-5 bg-gradient-brand rounded-full"></div>
            <span className="bg-gradient-brand-text bg-clip-text text-transparent">Key Features</span>
          </h4>
          <ul className="space-y-3.5">
            {rightSideFeatures.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-base" />
                <span className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight font-medium">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Paper>
    </Grow>
  );
};

export default HomepageBannerCard;