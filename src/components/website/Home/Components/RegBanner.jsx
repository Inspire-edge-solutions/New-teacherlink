import React from 'react';
import { useNavigate } from 'react-router-dom';
import candidateReg from '../../../../assets/candidateReg.png';
import employerReg from '../../../../assets/employerReg.png';

const RegBanner = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white">
      <div className="px-8 py-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Candidate Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Image */}
            <div className="h-64 overflow-hidden">
              <img 
                src={candidateReg} 
                alt="Teacher with students" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 leading-tight tracking-tight">Job Seekers</h3>
              <p className="text-lg sm:text-base text-gray-700 mb-6 leading-normal tracking-tight">
              Welcome to TeacherLink - India's trusted job portal for teachers.
              Register today to explore opportunities that match your skills, passion, and career goals.
              </p>
              <button 
                className="w-full text-white font-semibold py-3 px-6 rounded-lg duration-300 transition-colors transform hover:scale-105 shadow-lg bg-gradient-brand hover:bg-gradient-primary-hover"
                onClick={() => navigate('/register?role=job-seeker')}
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
                src={employerReg} 
                alt="Interview scene" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 leading-tight tracking-tight">Job Providers</h3>
              <p className="text-lg sm:text-base text-gray-700 mb-6 leading-normal tracking-tight">
              Welcome to TeacherLink - a platform for institutions/parents to find right teaching professionals. Register now to post jobs & connect with top educators.
              </p>
              <button 
              onClick={() => navigate('/register?role=job-provider')}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg duration-300 transition-colors transform hover:scale-105 shadow-lg bg-gradient-brand hover:bg-gradient-primary-hover"
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