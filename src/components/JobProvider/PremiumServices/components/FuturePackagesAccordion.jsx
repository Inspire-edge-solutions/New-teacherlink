import React from 'react';
import { FaInfoCircle, FaCheckCircle, FaChevronDown, FaChevronUp, FaCoins, FaArrowRight } from 'react-icons/fa';

const FuturePackagesAccordion = ({ packages, expandedAccordion, onToggleAccordion }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
        <FaInfoCircle className="text-blue-500" />
        Future Advertising Options
      </h2>
      <p className="text-gray-600 mb-6 text-center">
        The following advertising packages are coming soon. Contact us to express interest and be notified when they become available.
      </p>
      
      {/* Single Column Layout */}
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {packages.map((pkg) => {
          const isExpanded = expandedAccordion === pkg.id;
          const rightSideFeatures = pkg.features.slice(0, 4);
          const leftSideFeatures = pkg.features.slice(4);
          
          return (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              {/* Header Section - Compact */}
              <div className=" px-5 py-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                
                <div className="relative z-10">
                  <button
                    onClick={() => onToggleAccordion(pkg.id)}
                    className="w-full flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        {pkg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-black leading-tight truncate">{pkg.name}</h3>
                      </div>
                    </div>
                    {isExpanded ? (
                      <FaChevronUp className="text-gray-600 flex-shrink-0" />
                    ) : (
                      <FaChevronDown className="text-gray-600 flex-shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Content - Same Style as HomepageBannerCard */}
              {isExpanded && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    {/* Left Side - Main Content */}
                    <div className="lg:col-span-3 flex flex-col">
                      <div className="px-6 py-5">
                        {/* Price Section with Button - Centered */}
                        <div className="mb-4 pb-4 text-center">
                          {/* Description */}
                          <p className="text-lg text-gray-700 leading-relaxed mb-3">{pkg.description}</p>
                          
                          <div className="flex items-baseline justify-center gap-2 mb-2">
                            <span className="text-4xl font-bold text-gray-900">₹{pkg.price}</span>
                            <span className="text-gray-500 text-sm">/ {pkg.duration}</span>
                          </div>
                          
                          <div className="flex items-center justify-center gap-1.5 mb-3">
                            <FaCoins className="text-yellow-500 text-xs" />
                            <p className="text-xs text-gray-600">or pay with coins</p>
                          </div>
                          
                          {/* Select Package Button - Disabled */}
                          <button
                            disabled
                            className="w-auto px-8 py-2.5 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 bg-gray-400 text-white cursor-not-allowed shadow-lg mx-auto opacity-60"
                          >
                            <span>Coming Soon</span>
                            <FaArrowRight className="text-sm" />
                          </button>
                        </div>

                        {/* Remaining Features (if any) */}
                        {leftSideFeatures.length > 0 && (
                          <div>
                            <ul className="grid grid-cols-1 gap-2">
                              {leftSideFeatures.map((feature, index) => (
                                <li key={index + 4} className="flex items-start gap-2 text-xs">
                                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-xs" />
                                  <span className="text-gray-700 leading-snug">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - 4 Features */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-pink-50 via-white to-gray-50 p-6 border-l border-gray-100">
                      <h4 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <div className="w-1 h-5 bg-gradient-brand rounded-full"></div>
                        Key Features
                      </h4>
                      <ul className="space-y-3.5">
                        {rightSideFeatures.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0 text-base" />
                            <span className="text-sm text-gray-700 leading-relaxed font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Coming Soon Notice - Full Width */}
                  <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                    <p className="text-sm text-blue-800 text-center">
                      <strong>Coming Soon:</strong> This feature is currently under development. Contact us to express interest and get notified when it becomes available.
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FuturePackagesAccordion;

