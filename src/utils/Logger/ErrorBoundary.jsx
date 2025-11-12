import React from 'react';
import { Link } from 'react-router-dom';
import illustration404 from '../../assets/Illustrations/404.png';

class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {   
            return { hasError: true };  }
    componentDidCatch(error, errorInfo) {   
    }
    render() {
      if (this.state.hasError) {         
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4 py-10">
            <div className="w-full max-w-xl text-center bg-white/70 backdrop-blur-sm border border-white/60 rounded-3xl shadow-xl p-8 md:p-10 space-y-8">
              <div className="space-y-4">
                <img
                  src={illustration404}
                  alt="Page not found illustration"
                  className="mx-auto w-56 h-auto drop-shadow-lg"
                />
                <h1 className="text-5xl md:text-6xl font-bold text-gray-800 tracking-tight">404</h1>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Looks like you're lost
                </h3>
                <p className="text-gray-600 text-base md:text-lg">
                  The page you are looking for might have been removed, renamed, or is temporarily unavailable.
                </p>
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 transition duration-300 hover:scale-105 hover:from-blue-700 hover:to-indigo-700"
              >
                Go to Home
              </Link>
            </div>
          </div>
        );
      }
      return this.props.children; 
    }
  }

  export default ErrorBoundary