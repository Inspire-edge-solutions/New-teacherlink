import React from 'react';
import { FaBullhorn } from 'react-icons/fa';

const Header = () => {
  return (
    <div className="text-center mb-6">
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="p-4 bg-gradient-brand rounded-full">
          <FaBullhorn className="text-white text-3xl" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">
          Premium Advertising Services
        </h1>
      </div>
      <p className="text-xl text-gray-600">
        Maximize your reach and attract the best teaching talent with our premium advertising packages.
      </p>
    </div>
  );
};

export default Header;

