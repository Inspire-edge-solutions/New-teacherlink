import React from 'react'
import aboutUsImage from '../../../assets/AboutUs.jpg'

const AboutUs = () => {
  const features = [
    {
      title: "Built by Educators, for Educators",
      description: "Created by experienced teachers who understand real challenges in the education sector."
    },
    {
      title: "No Middlemen, No Commission",
      description: "We eliminate costly consultants making the hiring process transparent and cost effective."
    },
    {
      title: "Mission: Simplify & Empower",
      description: "Our goal is to make teacher recruitment fast, affordable, and accessible to all."
    }
  ];

  return (
    <div className="min-h-screen py-16 relative">
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left Text Section */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 leading-tight tracking-tight">
              India's First Dedicated Job Portal for{' '}
              <span className="bg-gradient-brand-text bg-clip-text text-transparent">Teachers</span>
            </h1>
            <p className="text-lg text-gray-600 leading-normal tracking-tight">
              Designed exclusively to connect educators with institutions directly and efficiently.
            </p>
          </div>

          {/* Right Image Section */}
          <div className="relative">
            {/* Light Pink Background Shape */}
            <div className="absolute inset-0 rounded-2xl transform -rotate-3 scale-105" style={{backgroundColor: '#F0D8D9'}}></div>
            
            {/* White Image Container */}
            <div className="relative z-10 bg-white rounded-2xl shadow-lg overflow-hidden transform rotate-2">
              <img 
                src={aboutUsImage} 
                alt="Professionals working together" 
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bottom Three Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="rounded-2xl p-8 text-center relative" style={{backgroundColor: '#F0D8D9'}}>
              {/* Red Circular Icon with Checkmark */}
              <div className="flex justify-center mb-8">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Card Content */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 leading-tight tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-normal tracking-tight">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AboutUs;