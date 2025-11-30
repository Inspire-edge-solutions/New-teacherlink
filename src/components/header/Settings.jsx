import React, { useState, useRef, useEffect } from 'react';
import { MdSettings, MdReport, MdLock, MdLogout } from 'react-icons/md';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SupportModal from './SupportModal';
import ChangePasswordModal from './ChangePasswordModal';

const Settings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Get user type from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = storedUser?.user_type;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  const handleSupportClick = () => {
    handleMenuItemClick();
    setShowSupportModal(true);
  };

  const handleChangePasswordClick = () => {
    handleMenuItemClick();
    setShowChangePasswordModal(true);
  };

  const handleLogout = async () => {
    handleMenuItemClick();
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors duration-200"
          onClick={toggleDropdown}
          aria-label="Settings"
        >
          <MdSettings className="w-6 h-6 text-gray-600 hover:text-gray-800 transition-colors duration-200" />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button 
              onClick={handleSupportClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <MdReport className="w-5 h-5 text-gray-600" />
              <span className="text-base font-medium leading-normal tracking-tight">Support</span>
            </button>
            
            <button 
              onClick={handleChangePasswordClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <MdLock className="w-5 h-5 text-gray-600" />
              <span className="text-base font-medium leading-normal tracking-tight">Change Password</span>
            </button>
            
            <div className="border-t border-gray-200 my-1"></div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-150"
            >
              <MdLogout className="w-5 h-5" />
              <span className="text-base font-medium leading-normal tracking-tight">Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />
      <ChangePasswordModal 
        isOpen={showChangePasswordModal} 
        onClose={() => setShowChangePasswordModal(false)} 
      />
    </>
  );
};

export default Settings;

