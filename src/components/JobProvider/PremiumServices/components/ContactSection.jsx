import React from 'react';
import { FaEnvelope, FaInfoCircle } from 'react-icons/fa';

const ContactSection = () => {
  return (
    <div className="bg-[#F0D8D9] rounded-lg shadow-lg p-4 text-center text-black">
      <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
      <p className="text-lg mb-2 opacity-90">
        Contact our advertising team to discuss custom packages and special offers
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <a
          href="mailto:info@inspireedgesolutions.com"
          className="px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <FaEnvelope />
          Email Us at : info@inspireedgesolutions.com
        </a>
        <a
          href="tel:+919980333603"
          className="px-6 py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <FaInfoCircle />
          Call Us at : +91 9980333603
        </a>
      </div>
    </div>
  );
};

export default ContactSection;

