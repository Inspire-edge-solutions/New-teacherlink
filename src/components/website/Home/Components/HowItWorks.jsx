import React from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { BsPeople } from 'react-icons/bs';
import { MdOutlineAutoGraph } from 'react-icons/md';

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      icon: FaUserPlus,
      title: "Register an account to start",
      text: `Register in teacherlink as a teacher or an institution to start exploring the teaching job opportunities or can provide job to teachers.`,
    },
    {
      id: 2,
      icon: BsPeople,
      title: `Find right opportunity`,
      text: `Access a curated pool of certified teachers, subject experts, and educational professionals for your institution.`,
    },
    {
      id: 3,
      icon: MdOutlineAutoGraph,
      title: "Smart Matching System",
      text: `Register in teacherlink as a teacher or an institution to start exploring the teaching job opportunities or can provide job to teachers.`,
    },
  ];

  return (
    <div className="relative bg-gradient-to-br from-gray-100 to-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="network" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1" fill="#9CA3AF" opacity="0.4"/>
              <circle cx="0" cy="0" r="1" fill="#9CA3AF" opacity="0.4"/>
              <circle cx="60" cy="0" r="1" fill="#9CA3AF" opacity="0.4"/>
              <circle cx="0" cy="60" r="1" fill="#9CA3AF" opacity="0.4"/>
              <circle cx="60" cy="60" r="1" fill="#9CA3AF" opacity="0.4"/>
              <line x1="30" y1="30" x2="0" y2="0" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
              <line x1="30" y1="30" x2="60" y2="0" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
              <line x1="30" y1="30" x2="0" y2="60" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
              <line x1="30" y1="30" x2="60" y2="60" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network)"/>
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">How It Works?</h1>
          <div className="text-lg text-gray-600 max-w-3xl mx-auto">
            It's super easy! Just follow a few quick steps to land your dream job or find the perfect teacher — all on TeacherLink.
          </div>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={step.id} className="relative">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  {/* Icon - Inside the card */}
                  <div className="mb-6">
                    <div className="bg-red-500 w-16 h-16 rounded-full flex items-center justify-center shadow-lg mx-auto">
                      <IconComponent className="text-white text-2xl" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
