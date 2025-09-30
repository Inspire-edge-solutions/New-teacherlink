import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import teacherlinkLogo from "../../assets/teacherlink-logo.png";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/home" className="flex items-center" onClick={closeMobileMenu}>
              <img
                src={teacherlinkLogo}
                alt="TeacherLink"
                className="w-30 h-10"
              />
            </Link>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex space-x-8">
            <NavLink
              to="/why-teacherlink"
              style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
            >
              Why TeacherLink
            </NavLink>
            <NavLink
              to="/salient-features"
              style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
            >
              Salient Features
            </NavLink>
            <NavLink
              to="/subscription-plans"
              style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
            >
              Subscription Plans
            </NavLink>
            <NavLink
              to="/about-us"
              style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
            >
              About Us
            </NavLink>
            <NavLink
              to="/contact-us"
              style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
            >
              Contact Us
            </NavLink>
          </nav>

          {/* Login/Register Button - Desktop only */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink
              to="/login"
              className="p-2 w-30 h-10 rounded text-white text-sm font-medium bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center"
            >
              Login/Register
            </NavLink>
          </div>

          {/* Mobile icons - Login and Menu */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Login Icon */}
            <NavLink
              to="/login"
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 p-2"
              aria-label="Login"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </NavLink>
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              <NavLink
                to="/why-teacherlink"
                style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Why TeacherLink
              </NavLink>
              <NavLink
                to="/salient-features"
                style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Salient Features
              </NavLink>
              <NavLink
                to="/subscription-plans"
                style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Subscription Plans
              </NavLink>
              <NavLink
                to="/about-us"
                style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                About Us
              </NavLink>
              <NavLink
                to="/contact-us"
                style={({ isActive }) => ({ color: isActive ? "red" : "black" })}
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Contact Us
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
