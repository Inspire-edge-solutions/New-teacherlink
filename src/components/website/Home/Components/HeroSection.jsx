import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroSection1 from '../../../../assets/heroSection1.png';
import heroSection2 from '../../../../assets/herosection2.jpg';
import heroSection3 from '../../../../assets/heroSection3.png';

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          {/* Left Content - 60% */}
          <div className="flex-1 lg:w-3/5 space-y-2 lg:space-y-4 text-center lg:text-left">
            <div className="space-y-0 sm:space-y-1">
              {/* First Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight tracking-tight">
                Looking For a
              </div>
              
              {/* Second Line - Teaching Job */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-brand-text bg-clip-text text-transparent">Teaching</span>
                <span className="text-gray-700"> Job?</span>
              </div>
              
              {/* Third Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight tracking-tight">
                Or Providing Job
              </div>
              
              {/* Fourth Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight tracking-tight">
                to Teachers?
              </div>
              
              {/* Tagline */}
              <div className="text-lg sm:text-base text-gray-600 font-normal mt-1 lg:mt-2 leading-normal tracking-tight">
                You are at the right place !
              </div>
            </div>

            {/* Register Button */}
            <div className="pt-0 lg:pt-1">
              <button
              onClick={() => navigate('/register')}
                className="text-white font-semibold px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-lg text-base duration-300 transition-colors transform hover:scale-105 shadow-lg w-full sm:w-auto bg-gradient-brand hover:bg-gradient-primary-hover"
              >
                Register
              </button>
            </div>
          </div>

          {/* Right Images - 40% */}
          <div className="flex-1 lg:w-2/5 relative w-full max-w-md lg:max-w-none">
            <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] mx-auto">
              {/* Top Image */}
              <div className="absolute top-0 right-2 sm:right-4 lg:right-8 z-30">
                <div className="relative w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src={heroSection1} 
                    alt="Teacher with glasses" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Middle Image */}
              <div className="absolute top-20 sm:top-24 lg:top-32 left-2 sm:left-3 lg:left-4 z-20">
                <div className="relative w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src={heroSection2} 
                    alt="Female teacher in saree" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Bottom Image */}
              <div className="absolute top-40 sm:top-48 lg:top-56 right-2 sm:right-4 lg:right-8 z-10">
                <div className="relative w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src={heroSection3} 
                    alt="Teacher and student interaction" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
