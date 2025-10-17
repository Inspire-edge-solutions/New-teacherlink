import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mb-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ background: '#F0D8D9' }}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={toggleOpen}
      >
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {isOpen ? (
          <FaChevronUp className="text-gray-600 transition-transform" />
        ) : (
          <FaChevronDown className="text-gray-600 transition-transform" />
        )}
      </div>
      {isOpen && (
        <div className="p-6 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;

