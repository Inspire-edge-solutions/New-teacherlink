import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import Head from './components/header';
import Forget from './components/forget';

const ForgetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Add specific class for forget password page styling
    document.body.classList.add('forget-password-main-page');
    
    return () => {
      document.body.classList.remove('forget-password-main-page');
    };
  }, []);

  const handleBackClick = () => {
    navigate('/login'); // Go back to previous page
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Desktop Header */}
      <div className="d-none d-md-block">
        <Head />
      </div>

      {/* Mobile Header with Back Button */}
      <div className="d-block d-md-none">
        <header className="main-header main-header-mobile forget-password-header">
          <div className="auto-container">
            <div className="inner-box">
              <div className="nav-outer">
                <div className="logo-box">
                  <div className="logo">
                    <Link to="/">
                      <img
                        src="/images/teacherlink-logo.png"
                        alt="TeacherLink"
                        style={{ height: '40px', width: 'auto' }}
                      />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="outer-box">
                <div className="login-box">
                  <button
                    className="call-modal back-button-header"
                    onClick={handleBackClick}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#666',
                      fontSize: '16px',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <IoArrowBack className="back-icon" size={20} />
                    <span>Back</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="flex-grow-1">
        <Forget />
      </div>
    </div>
  );
};

export default ForgetPassword;