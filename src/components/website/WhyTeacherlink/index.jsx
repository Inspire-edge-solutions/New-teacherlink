import React from 'react'
import whyTeacherlink1 from '../../../assets/whyTeacherlink1.png'
import whyTeacherlink2 from '../../../assets/whyTeacherlink2.png'
import whyTeacherlink3 from '../../../assets/whyTeacherlink3.png'
import whyTeacherlink4 from '../../../assets/whyTeacherlink4.png'
import whyTeacherlink5 from '../../../assets/whyTeacherlink5.png'

const WhyTeacherlink = () => {
    const features = [
        {
            emoji: "🎉",
            title: "Inaugural Free Offer!",
            description: "Unlock full access to TeacherLink's premium features — absolutely FREE for a limited time! Start hiring or job hunting with zero cost. Don't miss out!",
            image: whyTeacherlink1,
            imagePosition: "left"
        },
        {
            emoji: "🌐",
            title: "Wide Range of Opportunities",
            description: "Discover thousands of teaching jobs across schools, colleges, universities, coaching centers, and even home tuitions — all in one place! Your perfect role is just a click away.",
            image: whyTeacherlink2,
            imagePosition: "right"
        },
        {
            emoji: "🚀",
            title: "User-Friendly Experience",
            description: "Navigate with ease! Our intuitive platform is built to make your job search smooth, simple, and stress-free.",
            image: whyTeacherlink3,
            imagePosition: "left"
        },
        {
            emoji: "🔔",
            title: "Instant Job Alerts",
            description: "Be the first to know! Get real-time updates and personalized notifications so you never miss the perfect opportunity. Stay ahead, always.",
            image: whyTeacherlink4,
            imagePosition: "right"
        },
        {
            emoji: "🤝",
            title: "Direct Access to Top Employers",
            description: "Skip the wait! Connect instantly with leading employers and recruiters who are actively looking for talent like yours. Your next big opportunity is just a click away.",
            image: whyTeacherlink5,
            imagePosition: "left"
        },
        {
            emoji: "💼",
            title: "Verified Profiles & Institutions",
            description: "Apply and hire with confidence! All job postings and user profiles on TeacherLink are verified for authenticity, ensuring a secure and trustworthy experience for both seekers and providers.",
            image: whyTeacherlink1, // Using first image as placeholder since we only have 5 images
            imagePosition: "right"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-100 py-16">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gray-100 opacity-50" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
            
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Card Container */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="bg-red-600 text-white py-6 px-8">
                        <h1 className="text-3xl font-bold text-center">Why Choose TeacherLink.in?</h1>
                    </div>
                    
                    {/* Features Content */}
                    <div className="p-8 space-y-12">
                        {features.map((feature, index) => (
                            <div key={index} className={`flex flex-col lg:flex-row items-center gap-8 ${
                                feature.imagePosition === 'right' ? 'lg:flex-row-reverse' : ''
                            }`}>
                                {/* Image Section */}
                                <div className="flex-shrink-0 w-full lg:w-1/2">
                                    <div className="relative overflow-hidden rounded-xl shadow-lg">
                                        <img 
                                            src={feature.image} 
                                            alt={feature.title}
                                            className="w-full h-64 lg:h-80 object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                </div>
                                
                                {/* Text Section */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{feature.emoji}</span>
                                        <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                                    </div>
                                    <p className="text-gray-700 text-lg leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Call to Action Section */}
                    <div className="text-center py-12 px-8 bg-gray-50 rounded-xl mx-8 mb-8">
                        <h3 className="text-3xl font-bold mb-5 text-red-600">
                            🎯 Your Teaching Career Starts Here
                        </h3>
                        <p className="text-lg mb-5 text-gray-700">
                            Join thousands of teachers who've found success with us.
                        </p>
                        <h3 className="text-2xl font-bold mb-8 text-gray-800">
                            TeacherLink.in – Your Gateway to Career Success!
                        </h3>
                        <a 
                            href="/register" 
                            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold text-lg px-8 py-4 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
                        >
                            🔗 Visit Now & Apply Free
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WhyTeacherlink