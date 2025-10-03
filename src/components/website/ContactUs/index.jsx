import React, { useState } from 'react'
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        message: formData.message.trim()
      }

      const response = await fetch("https://aqi0ep5u95.execute-api.ap-south-1.amazonaws.com/dev/contactus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.")
        setFormData({
          name: '',
          phone_number: '',
          email: '',
          message: ''
        })
      } else {
        throw new Error(data.message || "Something went wrong")
      }
    } catch (error) {
      toast.error(error.message || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Main Container */}
        <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: '#F0D8D9' }}>
          <div className="flex flex-col lg:flex-row">
            
            {/* Left Section - Contact Information */}
            <div className="lg:w-1/2 p-8 lg:p-12">
              <div className="h-full flex flex-col justify-center">
                {/* Heading */}
                <div className="mb-8">
                  <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                    <span className="text-red-600">Connect</span>
                    <span className="text-gray-800"> with</span>
                  </h1>
                  <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mt-2">
                    Our Team of Experts
                  </h2>
                </div>

                {/* Contact Details */}
                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 mt-1">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <div>
                      <a 
                        href="mailto:info@inspireedgesolutions.com" 
                        className="text-gray-800 underline hover:text-red-600 transition-colors"
                      >
                        info@inspireedgesolutions.com
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 mt-1">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <div>
                      <a 
                        href="tel:+919100731810" 
                        className="text-gray-800 underline hover:text-red-600 transition-colors"
                      >
                        +91 9100731810
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 mt-1">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-800 leading-relaxed">
                        Standage Road, Pulikeshi Nagar,<br />
                        Bengaluru, Karnataka, India<br />
                        560005
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Contact Form */}
            <div className="lg:w-1/2 p-8 lg:p-12">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-red-600 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Smith"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>

                {/* Mobile Number Field */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-red-600 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="John Smith"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-red-600 mb-2">
                    Your email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@gmail.com"
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-red-600 transition-colors"
                    required
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-red-600 mb-2">
                    Your message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-red-600 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Send message"}
                </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default ContactUs;