import React from 'react'
import { Link } from 'react-router-dom'

const SalientFeatures = () => {
  return (
    <div className="min-h-screen py-16 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gray-100 opacity-50 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="text-center">
          {/* Red Headline */}
          <h1 className="mb-6 md:mb-8 bg-gradient-brand-text bg-clip-text text-transparent font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight px-4">
            Find Your Dream Teaching Job Absolutely FREE at TeacherLink.in!
          </h1>
          
          {/* Red Box with Description */}
          <div className="bg-gradient-brand rounded-xl p-4 md:p-8 shadow-lg max-w-4xl mx-auto mb-12 md:mb-16">
            <p className="text-base md:text-lg text-white leading-normal tracking-tight text-center">
              Looking to land the perfect teaching role? Welcome to TeacherLink.in : India's #1 dedicated job platform made exclusively for educators. 
              Whether you're a fresher or a seasoned teacher, we've got you covered.
            </p>
          </div>
          
          {/* Feature Cards Section */}
          <div className="max-w-6xl mx-auto mb-12 md:mb-16 px-4">
            {/* First Row - 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              {/* Smart Job Search */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">🔍</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Smart Job Search</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Easily discover jobs that match your skills, experience, and preferred location using our advanced search filters. Save time, apply smarter!
                </p>
              </div>
              
              {/* Application Tracker */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">📊</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Application Tracker</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Stay organized with real-time tracking of your applications. Know where you stand at every step of the hiring process.
                </p>
              </div>
              
              {/* Instant Alerts */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">🔔</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Instant Alerts</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Never miss an opportunity! Set personalized alerts and get notified as soon as a matching job is posted.
                </p>
              </div>
            </div>
            
            {/* Second Row - 4th Card and Call-to-Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Curated Job Matches */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">🧩</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Curated Job Matches</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Go beyond basic search! Get handpicked job recommendations tailored to your profile, preferences, and career goals helping you discover roles you might have missed.
                </p>
              </div>
              
              {/* Call-to-Action Section - Takes 2 columns */}
              <div className="lg:col-span-2 bg-red-100 rounded-xl p-6 md:p-8 shadow-lg text-center">
                <h2 className="text-xl md:text-2xl font-bold text-red-900 mb-3 leading-tight tracking-tight">Your Teaching Career Starts Here</h2>
                <p className="text-sm md:text-base text-gray-700 mb-3 leading-normal tracking-tight">Join thousands of teachers who've found success with us.</p>
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 md:mb-6 leading-tight tracking-tight">TeacherLink.in : Your Gateway to Career Success!</h3>
                <button className="bg-gradient-brand hover:bg-gradient-primary-hover text-white font-semibold px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base">
                  <Link to="/login">
                    Apply Here
                  </Link>
                </button>
              </div>
            </div>
          </div>
          
          {/* Job Providers Section */}
          {/* Red Headline for Job Providers */}
          <h1 className="mb-6 md:mb-8 bg-gradient-brand-text bg-clip-text text-transparent font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight px-4">
            Hire the Best Educators Fast & FREE at TeacherLink.in!
          </h1>
          
          {/* Red Box with Description for Job Providers */}
          <div className="bg-gradient-brand rounded-xl p-4 md:p-8 shadow-lg max-w-4xl mx-auto mb-12 md:mb-16">
            <p className="text-base md:text-lg text-white leading-normal tracking-tight text-center">
              Looking to fill teaching roles with top talent? Welcome to TeacherLink.in : India's #1 job platform built exclusively for schools, colleges, coaching centers, and educational institutes.
            </p>
          </div>
          <div className="max-w-6xl mx-auto mb-12 md:mb-16 px-4">
            {/* First Row - 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              {/* Post Jobs Instantly */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">📢</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Post Jobs Instantly</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Easily create job listings and reach thousands of verified teaching professionals across India all in just a few clicks.
                </p>
              </div>
              
              {/* Smart Candidate Matching */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">🎯</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Smart Candidate Matching</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Our AI powered engine suggests the best candidates based on your requirements, saving you time and effort.
                </p>
              </div>
              
              {/* Application Dashboard */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">📋</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Application Dashboard</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Track applicants, shortlist profiles, and manage your entire hiring process from one intuitive dashboard.
                </p>
              </div>
            </div>
            
            {/* Second Row - 4th Card and Call-to-Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Instant Notifications */}
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-red-600 text-xl md:text-2xl mr-2">🔔</span>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 leading-tight tracking-tight">Instant Notifications</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 text-left leading-normal tracking-tight">
                  Get real time updates when candidates apply or respond, so you never miss a great hire.
                </p>
              </div>
              
              {/* Call-to-Action Section - Takes 2 columns */}
              <div className="lg:col-span-2 bg-red-100 rounded-xl p-6 md:p-8 shadow-lg text-center">
                <h2 className="text-xl md:text-2xl font-bold text-red-900 mb-3 leading-tight tracking-tight">Your Hiring Success Starts Here</h2>
                <p className="text-sm md:text-base text-gray-700 mb-3 leading-normal tracking-tight">Looking to fill teaching roles with top talent?</p>
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 md:mb-6 leading-tight tracking-tight">TeacherLink.in : Your Gateway to Hiring Success!</h3>
                <button className="bg-gradient-brand hover:bg-gradient-primary-hover text-white font-semibold px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm md:text-base">
                  <Link to="/login">
                    Post Jobs Here
                  </Link>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalientFeatures