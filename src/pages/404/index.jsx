import { Link } from "react-router-dom";

import MetaComponent from "../../components/common/MetaComponent";

import teacherlinkLogo from "../../assets/teacherlink-logo.svg";

const metadata = {
  title: "Page Not Found | Return to TeacherLink Education Job Board",
  description: "The page you're looking for doesn't exist. Return to TeacherLink's education job board to continue exploring teaching opportunities and recruitment services.",
};

const NotFoundPage = () => {
  return (
    <>
      <MetaComponent meta={metadata} />
      <div
        className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4"
        data-aos="fade"
      >
        <div className="text-center max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-12 transform transition-all duration-500 hover:scale-105">
            <Link to="/" className="inline-block">
              <img
                src={teacherlinkLogo}
                alt="TeacherLink Logo"
                className="h-16 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* 404 Number */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 transform transition-all duration-700 hover:scale-110">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="mb-12 space-y-4">
            <h2 className="text-3xl font-semibold text-gray-800 transform transition-all duration-500">
              Oops! Page Not Found
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed transform transition-all duration-500 delay-100">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
          </div>

          {/* Back to Home Button */}
          <div className="transform transition-all duration-500 delay-200">
            <Link 
              to="/"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-blue-700 hover:to-indigo-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage
