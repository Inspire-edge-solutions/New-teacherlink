import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Section Header */}
      <div 
        className="bg-[#F0D8D9] px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-[#E8C8C9] transition-colors duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center">
          {isOpen ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </div>
      
      {/* Section Content */}
      {isOpen && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
