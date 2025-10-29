import React from 'react';
import { useNavigate } from 'react-router-dom';
const RegBanner = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      <div className="px-4 py-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Candidate Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Image */}
            <div className="h-64 overflow-hidden">
              <img 
                src="/src/assets/candidateReg.png" 
                alt="Teacher with students" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-red-600 mb-4">Job Seekers</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                🎉 Welcome to TeacherLink — India's trusted job portal for teachers.
                👉 Register today to explore opportunities that match your skills and passion.
              </p>
              <button 
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-brand"
                onClick={() => navigate('/register')}
              >
                Register Account
              </button>
            </div>
          </div>

          {/* Employers Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Image */}
            <div className="h-64 overflow-hidden">
              <img 
                src="/src/assets/employerReg.png" 
                alt="Interview scene" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-red-600 mb-4">Job Providers</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
              🏫Welcome to TeacherLink—a platform for institutions/parents to find right teaching professionals.Register now to post jobs & connect with top educators.
              </p>
              <button 
              onClick={() => navigate('/register')}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-brand"
              >
                Register Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegBanner;