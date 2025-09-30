import React from 'react';

const HeroSection = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-100 to-white overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
          {/* Left Content - 60% */}
          <div className="flex-1 lg:w-3/5 space-y-2 lg:space-y-4 text-center lg:text-left">
            <div className="space-y-0 sm:space-y-1">
              {/* First Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight">
                Looking For a
              </div>
              
              {/* Second Line - Teaching Job */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                <span className="text-red-500">Teaching</span>
                <span className="text-gray-700"> Job?</span>
              </div>
              
              {/* Third Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight">
                Or Providing Job
              </div>
              
              {/* Fourth Line */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-700 leading-tight">
                to Teachers?
              </div>
              
              {/* Tagline */}
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 font-normal mt-1 lg:mt-2">
                You are at the right place !
              </div>
            </div>

            {/* Register Button */}
            <div className="pt-0 lg:pt-1">
              <button className="text-white font-semibold px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-lg text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-lg w-full sm:w-auto" style={{background: 'linear-gradient(90deg, #F34B58 0%, #A1025D 100%)'}}>
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
                    src="/src/assets/heroSection1.png" 
                    alt="Teacher with glasses" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Middle Image */}
              <div className="absolute top-20 sm:top-24 lg:top-32 left-2 sm:left-3 lg:left-4 z-20">
                <div className="relative w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="/src/assets/herosection2.jpg" 
                    alt="Female teacher in saree" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Bottom Image */}
              <div className="absolute top-40 sm:top-48 lg:top-56 right-2 sm:right-4 lg:right-8 z-10">
                <div className="relative w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="/src/assets/heroSection3.png" 
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
