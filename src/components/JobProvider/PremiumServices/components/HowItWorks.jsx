import React from 'react';

const HowItWorks = () => {
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="w-12 h-12 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
              {step.number}
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;