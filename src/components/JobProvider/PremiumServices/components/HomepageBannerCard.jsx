import React from 'react';
import { FaCheckCircle, FaArrowRight, FaCoins } from 'react-icons/fa';

const HomepageBannerCard = ({ package: pkg, onSelectPackage }) => {
  // Split features: first 4 for right side, rest for left side
  const rightSideFeatures = pkg.features.slice(0, 4);
  const leftSideFeatures = pkg.features.slice(4);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
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
                <h3 className="text-lg font-bold text-black leading-tight truncate">{pkg.name}</h3>
              </div>
            </div>
            <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap flex-shrink-0">
              AVAILABLE NOW
            </span>
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
              <p className="text-lg text-gray-700 leading-relaxed mb-3">{pkg.description}</p>
              
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900">₹{pkg.price}</span>
                <span className="text-gray-500 text-sm">/ {pkg.duration}</span>
              </div>
              
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <FaCoins className="text-yellow-500 text-xs" />
                <p className="text-xs text-gray-600">or pay with coins</p>
              </div>
              
              {/* Select Package Button */}
              <button
                onClick={() => onSelectPackage(pkg)}
                className="w-auto px-8 py-2.5 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-brand text-white hover:bg-gradient-primary-hover shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transform mx-auto"
              >
                <span>Select Package</span>
                <FaArrowRight className="text-sm" />
              </button>
            </div>

            {/* Remaining Features (if any) - Compact Grid */}
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

        {/* Right Side - 4 Features (Narrower) */}
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
    </div>
  );
};

export default HomepageBannerCard;