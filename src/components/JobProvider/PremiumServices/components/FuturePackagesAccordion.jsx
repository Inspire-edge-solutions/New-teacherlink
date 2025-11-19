import React, { useState, useEffect } from 'react';
import { FaInfoCircle, FaCheckCircle, FaChevronDown, FaChevronUp, FaCoins, FaArrowRight } from 'react-icons/fa';
import { Fade, Slide, Paper, Zoom, Collapse, Skeleton, Box } from '@mui/material';

const FuturePackagesAccordion = ({ packages, expandedAccordion, onToggleAccordion }) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setChecked(true), 100);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Paper elevation={4} className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
        <Skeleton variant="text" width={300} height={32} sx={{ mx: 'auto', mb: 3 }} />
        <Skeleton variant="text" width="90%" height={24} sx={{ mx: 'auto', mb: 6 }} />
        <div className="flex flex-col gap-3 sm:gap-4 max-w-3xl mx-auto">
          {[1, 2, 3].map((i) => (
            <Paper key={i} elevation={6} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <Skeleton variant="rectangular" width={40} height={40} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="text" width={200} height={24} />
                  </div>
                  <Skeleton variant="circular" width={24} height={24} />
                </div>
              </div>
            </Paper>
          ))}
        </div>
      </Paper>
    );
  }

  return (
    <Fade in={checked} timeout={1000}>
      <Paper elevation={4} className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
        <Zoom in={checked} timeout={800} style={{ transitionDelay: '200ms' }}>
          <h2 className="text-xl sm:text-2xl md:text-2xl font-bold mb-3 sm:mb-4 flex items-center justify-center gap-2 flex-wrap">
            <FaInfoCircle className="text-blue-500 text-lg sm:text-xl" />
            <span className="text-center bg-gradient-brand-text bg-clip-text text-transparent">Future Advertising Options</span>
          </h2>
        </Zoom>
        <Fade in={checked} timeout={1000} style={{ transitionDelay: '400ms' }}>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center px-2">
            The following advertising packages are coming soon. Contact us to express interest and be notified when they become available.
          </p>
        </Fade>
        
        {/* Single Column Layout */}
        <div className="flex flex-col gap-3 sm:gap-4 max-w-3xl mx-auto">
          {packages.map((pkg, index) => {
          const isExpanded = expandedAccordion === pkg.id;
          const rightSideFeatures = pkg.features.slice(0, 4);
          const leftSideFeatures = pkg.features.slice(4);
          
            return (
              <Fade 
                key={pkg.id}
                in={checked} 
                timeout={800} 
                style={{ transitionDelay: `${600 + index * 100}ms` }}
              >
                <Paper
                  elevation={6}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
                  sx={{
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      transition: 'transform 0.3s ease-in-out'
                    }
                  }}
                >
              {/* Header Section - Compact */}
              <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full -ml-10 -mb-10 sm:-ml-12 sm:-mb-12"></div>
                
                <div className="relative z-10">
                  <button
                    onClick={() => onToggleAccordion(pkg.id)}
                    className="w-full flex items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <div className="text-sm sm:text-base">{pkg.icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-black leading-tight truncate">{pkg.name}</h3>
                      </div>
                    </div>
                    {isExpanded ? (
                      <FaChevronUp className="text-gray-600 flex-shrink-0 text-sm sm:text-base" />
                    ) : (
                      <FaChevronDown className="text-gray-600 flex-shrink-0 text-sm sm:text-base" />
                    )}
                  </button>
                </div>
              </div>

                  {/* Expanded Content - Same Style as HomepageBannerCard */}
                  <Collapse in={isExpanded} timeout={500}>
                    <div>
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                        {/* Left Side - Main Content */}
                        <div className="lg:col-span-3 flex flex-col">
                          <div className="px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-5">
                            {/* Price Section with Button - Centered */}
                            <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 text-center">
                              {/* Description */}
                              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed mb-2 sm:mb-3 px-2">{pkg.description}</p>
                              
                              <div className="flex items-baseline justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">₹{pkg.price}</span>
                                <span className="text-gray-500 text-xs sm:text-sm">/ {pkg.duration}</span>
                              </div>
                              
                              <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
                                <FaCoins className="text-yellow-500 text-xs" />
                                <p className="text-xs text-gray-600">or pay with coins</p>
                              </div>
                              
                              {/* Select Package Button - Disabled */}
                              <button
                                disabled
                                className="w-auto px-6 py-2 sm:px-7 sm:py-2.5 md:px-8 md:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 bg-gray-400 text-white cursor-not-allowed shadow-lg mx-auto opacity-60"
                              >
                                <span>Coming Soon</span>
                                <FaArrowRight className="text-xs sm:text-sm" />
                              </button>
                            </div>

                            {/* Remaining Features (if any) */}
                            {leftSideFeatures.length > 0 && (
                              <div>
                                <ul className="grid grid-cols-1 gap-1.5 sm:gap-2">
                                  {leftSideFeatures.map((feature, index) => (
                                    <li key={index + 4} className="flex items-start gap-1.5 sm:gap-2">
                                      <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-xs" />
                                      <span className="text-xs text-gray-700 leading-snug">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side - 4 Features */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-pink-50 via-white to-gray-50 p-4 sm:p-5 md:p-6 border-t lg:border-t-0 lg:border-l border-gray-100">
                          <h4 className="text-sm sm:text-base font-bold mb-3 sm:mb-4 md:mb-5 flex items-center gap-2">
                            <div className="w-1 h-4 sm:h-5 bg-gradient-brand rounded-full"></div>
                            <span className="bg-gradient-brand-text bg-clip-text text-transparent">Key Features</span>
                          </h4>
                          <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5">
                            {rightSideFeatures.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 sm:gap-3">
                                <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-sm sm:text-base" />
                                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {/* Coming Soon Notice - Full Width */}
                      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-4 bg-blue-50 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-blue-800 text-center">
                          <strong>Coming Soon:</strong> This feature is currently under development. Contact us to express interest and get notified when it becomes available.
                        </p>
                      </div>
                    </div>
                  </Collapse>
                </Paper>
              </Fade>
            );
          })}
        </div>
      </Paper>
    </Fade>
  );
};

export default FuturePackagesAccordion;