import React, { useState } from 'react'
import { MdEmail, MdPhone, MdLocationOn, MdContactSupport } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
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
    <div className="min-h-screen py-4 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Main Container */}
        <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: '#F0D8D9' }}>
          <div className="flex flex-col lg:flex-row">
            
            {/* Left Section - Contact Information */}
            <div className="lg:w-1/2 p-8 lg:p-12">
              <div className="h-full flex flex-col justify-center">
                {/* Heading */}
                <div className="mb-8">
                  <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                    <span className="bg-gradient-brand-text bg-clip-text text-transparent">Connect</span>
                    <span className="text-gray-800"> with</span>
                  </h1>
                  <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mt-2 leading-tight tracking-tight">
                    Our Team of Experts
                  </h2>
                </div>

                {/* Contact Details */}
                <div className="space-y-8">
                  {/* Address */}
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-3 text-red-600">
                      <MdLocationOn className="w-6 h-6" />
                      <p className="text-lg font-semibold text-gray-900 tracking-tight">Address</p>
                    </div>
                    <p className="mt-3 text-gray-800 leading-normal tracking-tight">
                      Pulikeshi Nagar, Bengaluru, Karnataka, India 560005
                    </p>
                  </div>

                  {/* Contact Support - Phone & Email */}
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-3 text-red-600">
                      <MdContactSupport className="w-6 h-6" />
                      <p className="text-lg font-semibold text-gray-900 tracking-tight">Connect with us</p>
                    </div>
                    <div className="mt-3 space-y-4">
                      <p className="text-gray-700 leading-normal tracking-tight">
                        <span className="font-semibold">Timings:</span> 11:00 AM to 6:00 PM
                      </p>
                      
                      {/* General Queries */}
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900 tracking-tight">For General Queries:</p>
                        <div className="space-y-1 text-gray-800 ml-4">
                          <p className="flex items-center gap-2 leading-normal tracking-tight">
                            <a href="tel:+919980333603" className="hover:opacity-80 transition-opacity">
                              <MdPhone className="text-red-600 w-5 h-5" />
                            </a>
                            <a href="https://wa.me/919980333603" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                              <FaWhatsapp className="text-green-600 w-5 h-5" />
                            </a>
                            <span className="text-gray-800">+91 9980833603</span>
                          </p>
                          <p className="flex flex-col sm:flex-row sm:items-baseline leading-normal tracking-tight">
                            <MdEmail className="text-red-600 w-5 h-5 mr-2 flex-shrink-0" />
                            <a
                              href="mailto:info@inspireedgesolutions.com"
                              className="hover:text-red-600 transition-colors break-all"
                            >
                              info@inspireedgesolutions.com
                            </a>
                          </p>
                        </div>
                      </div>

                      {/* Technical Queries */}
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900 tracking-tight">For Technical Queries:</p>
                        <div className="space-y-1 text-gray-800 ml-4">
                          <p className="flex items-center gap-2 leading-normal tracking-tight">
                            <a href="tel:+919100731810" className="hover:opacity-80 transition-opacity">
                              <MdPhone className="text-red-600 w-5 h-5" />
                            </a>
                            <a href="https://wa.me/919100731810" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                              <FaWhatsapp className="text-green-600 w-5 h-5" />
                            </a>
                            <span className="text-gray-800">+91 9100731810</span>
                          </p>
                          <p className="flex flex-col sm:flex-row sm:items-baseline leading-normal tracking-tight">
                            <MdEmail className="text-red-600 w-5 h-5 mr-2 flex-shrink-0" />
                            <a
                              href="mailto:support@inspireedgesolutions.com"
                              className="hover:text-red-600 transition-colors break-all"
                            >
                              support@inspireedgesolutions.com
                            </a>
                          </p>
                        </div>
                      </div>
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
                  className="w-full bg-gradient-brand hover:bg-gradient-primary-hover text-white py-3 px-6 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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