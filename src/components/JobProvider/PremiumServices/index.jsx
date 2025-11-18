import React, { useState } from 'react';
import Header from './components/Header';
import HowItWorks from './components/HowItWorks';
import HomepageBannerCard from './components/HomepageBannerCard';
import FuturePackagesAccordion from './components/FuturePackagesAccordion';
import ContactSection from './components/ContactSection';
import BookingModal from './components/BookingModal';
import { homepageBannerPackage, futurePackages } from './data/plans.jsx';

const PremiumServicesComponent = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setShowContactModal(true);
  };

  const handleCloseModal = () => {
    setShowContactModal(false);
    setSelectedPackage(null);
  };

  const toggleAccordion = (id) => {
    setExpandedAccordion(expandedAccordion === id ? null : id);
  };

  const handleFormSubmit = (formData) => {
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData);
    // For now, just show success message and close modal
    alert('Thank you for your interest! Our team will contact you shortly.');
    handleCloseModal();
  };

  return (
    <div className="min-h-screen py-4 px-2 sm:px-6 lg:px-2">
      <div className="max-w-7xl mx-auto">
        <Header />
        <HomepageBannerCard 
          package={homepageBannerPackage} 
          onSelectPackage={handleSelectPackage}
        />
         <HowItWorks />
         <ContactSection />
        <FuturePackagesAccordion
          packages={futurePackages}
          expandedAccordion={expandedAccordion}
          onToggleAccordion={toggleAccordion}
        />
        <BookingModal
          isOpen={showContactModal}
          selectedPackage={selectedPackage}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      </div>
    </div>
  );
};

export default PremiumServicesComponent;
