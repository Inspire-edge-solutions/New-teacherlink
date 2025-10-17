import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../../../Context/AuthContext";
import csc from "countries-states-cities"; // For countries, states, cities
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaIdCard, FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaWhatsapp } from 'react-icons/fa';

const Field = ({ label, value, isUrl = false }) => {
  if (!value) return null;
  
  const displayValue = Array.isArray(value) ? value.join(', ') : 
                      typeof value === 'string' ? value.split(',').join(', ') : 
                      value;

  return (
    <div className="col-12">
      <div className="flex items-start mb-2.5">
        <div className="w-32 min-w-32 text-gray-500 text-sm pr-2.5">{label}:</div>
        <div className="flex-1">
          {isUrl ? (
            <a 
              href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none text-blue-600 text-sm break-all"
            >
              {displayValue}
            </a>
          ) : (
            <span className="text-gray-900 text-sm block">{displayValue}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children, icon: Icon }) => (
  <div className={`mb-3 rounded-lg p-5 shadow-sm ${
    title === "Organization Details" ? 'bg-gray-50' : 'bg-white'
  }`}>
    <div className="flex items-center mb-4 border-b border-gray-200 pb-2.5">
      {Icon && (
        <Icon className="text-blue-600 text-lg mr-2.5" />
      )}
      <h4 className="text-gray-900 text-lg font-semibold m-0">
        {title}
      </h4>
    </div>
    <div className="row">{children}</div>
  </div>
);

const SocialLink = ({ icon: Icon, url, label, color }) => {
  if (!url) return null;
  
  return (
    <div className="col-12">
      <div className="flex items-start mb-2.5">
        <div className="w-32 min-w-32 text-gray-500 text-sm pr-2.5">{label}:</div>
        <div className="flex items-center flex-1">
          <Icon className="text-sm mr-2 flex-shrink-0" style={{ color }} />
          <a 
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none text-blue-600 text-sm break-all"
          >
            {url}
          </a>
        </div>
      </div>
    </div>
  );
};

// Style constants removed - now using Tailwind classes

const ViewProfile = () => {
  const { user, loading } = useAuth();
  const [orgData, setOrgData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  const API_URL = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PARENT_TYPE = "Parent/ Guardian looking for Tuitions";

  // Get organization data and profile image
  useEffect(() => {
    const fetchData = async () => {
      if (loading) return;
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch organization data
        const orgResponse = await axios.get(API_URL, { 
          params: { firebase_uid: user.uid },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (orgResponse.status === 200 && orgResponse.data) {
          //console.log("Organization data:", orgResponse.data);
          const raw = Array.isArray(orgResponse.data) ? orgResponse.data[0] : orgResponse.data;
          setOrgData(raw);
        }

        // Fetch profile image using the same API as LogoCoverUploader
        try {
          const params = { firebase_uid: user.uid, action: "view" };
          const imageResponse = await axios.get(IMAGE_API_URL, { params });

          if (imageResponse.data?.url) {
            setProfileImage(imageResponse.data.url);
          }
        } catch (imageError) {
          console.log("No profile image found or error fetching:", imageError);
          // Only log error for unexpected errors, not 404s (no image yet)
          if (imageError.response?.status !== 404) {
            console.error("Error loading profile image:", imageError);
          }
        }

      } catch (error) {
        console.error("Error fetching organization details:", error);
        if (error.response?.status === 404) {
          toast.info("No organization profile found. Please create your organization profile first.");
        } else {
          toast.error("Failed to load organization details.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, loading]);

  // Helper function to get country name from code
  const getCountryName = (countryCode) => {
    if (!countryCode) return "";
    try {
      const country = csc.getCountryById(countryCode);
      return country ? country.name : countryCode;
    } catch (error) {
      return countryCode;
    }
  };

  // Helper function to get state name from code
  const getStateName = (countryCode, stateCode) => {
    if (!countryCode || !stateCode) return "";
    try {
      const state = csc.getStateById(stateCode, countryCode);
      return state ? state.name : stateCode;
    } catch (error) {
      return stateCode;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="widget-content">
        <div className="p-3 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="widget-content">
        <div className="p-3">
          <p>No organization data found. Please complete your organization profile.</p>
        </div>
      </div>
    );
  }

  const isParent = orgData.type === PARENT_TYPE;

  return (
    <div className="profile-view-container bg-gray-50 min-h-screen p-2.5 md:p-5">
      <div className="container-fluid">
        
        {/* Header Section with Profile Photo */}
        <div className="profile-header-card mb-4 bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="row align-items-center">
            <div className="col-md-3 col-sm-12 text-center mb-md-0 mb-3">
              <div className="profile-image-container w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full border-4 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Organization Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`${profileImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full bg-gray-200 text-gray-600`}>
                  <FaBuilding size={30} />
                </div>
              </div>
            </div>
            <div className="col-md-9 col-sm-12">
              <div className="d-flex align-items-center mb-3">
                <div className="flex items-center w-full">
                  <FaBuilding className="text-blue-600 text-2xl mr-3" />
                  <h3 className="font-semibold text-gray-900 text-2xl m-0">
                    {orgData?.name || 'Organization Name Not Set'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <FaBuilding className="text-blue-600 text-base mr-2.5" />
                <span className="text-base text-gray-900 font-medium">
                  {orgData?.type || 'Organization Type Not Set'}
                </span>
              </div>
              <div className="row">
                <div className="col-12">
                  {orgData?.contact_person_name && (
                    <div className="flex items-start mb-2.5">
                      <FaUser className="text-blue-600 text-sm mr-2 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <strong>Contact:</strong> {orgData.contact_person_name}
                      </div>
                    </div>
                  )}
                  {orgData?.contact_person_email && (
                    <div className="flex items-start mb-2.5">
                      <FaEnvelope className="text-blue-600 text-sm mr-2 mt-1 flex-shrink-0" />
                      <a href={`mailto:${orgData.contact_person_email}`} 
                         className="text-blue-600 no-underline text-sm flex-1">
                        {orgData.contact_person_email}
                      </a>
                    </div>
                  )}
                  {(orgData?.city || orgData?.country) && (
                    <div className="flex items-start mb-2.5">
                      <FaMapMarkerAlt className="text-blue-600 text-sm mr-2 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        {[orgData.city, orgData.state, orgData.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                  {orgData?.contact_person_phone1 && (
                    <div className="flex items-start mb-2.5">
                      <FaPhone className="text-blue-600 text-sm mr-2 mt-1 flex-shrink-0" />
                      <a href={`tel:${orgData.contact_person_phone1}`} 
                         className="text-blue-600 no-underline text-sm flex-1">
                        {orgData.contact_person_phone1}
                      </a>
                    </div>
                  )}
                  {orgData?.contact_person_phone2 && (
                    <div className="flex items-start mb-2.5">
                      <FaWhatsapp className="text-sm mr-2 mt-1 flex-shrink-0" style={{color: '#25D366'}} />
                      <a href={`https://wa.me/${orgData.contact_person_phone2}`} 
                         className="text-blue-600 no-underline text-sm flex-1">
                        {orgData.contact_person_phone2}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="row g-3">
          {/* Left Column */}
          <div className="col-lg-6 col-12">
            {/* Combined Organization Details and Social Media Links */}
            {!isParent && (
              <Section title="Organization Details" icon={FaBuilding}>
                <Field label="Website URL" value={orgData?.website_url} isUrl={true} />
                <Field label="Video URL" value={orgData?.video_url} isUrl={true} />
                <Field label="Address" value={orgData?.address} />
                <Field label="Pincode" value={orgData?.pincode} />

                {/* Social Media Links */}
                {(orgData?.facebook || orgData?.twitter || orgData?.linkedin || orgData?.instagram) && (
                  <>
                    <div className="col-12">
                      <hr className="my-3 border-gray-200" />
                      <div className="flex items-center mb-4">
                        <FaGlobe className="text-blue-600 text-lg mr-2.5" />
                        <h5 className="text-gray-900 text-base font-medium m-0">
                          Social Media Links
                        </h5>
                      </div>
                    </div>
                    <SocialLink 
                      icon={FaFacebook} 
                      url={orgData?.facebook} 
                      label="Facebook Profile" 
                      color="#1877f2" 
                    />
                    <SocialLink 
                      icon={FaTwitter} 
                      url={orgData?.twitter} 
                      label="Twitter Profile" 
                      color="#1da1f2" 
                    />
                    <SocialLink 
                      icon={FaLinkedin} 
                      url={orgData?.linkedin} 
                      label="LinkedIn Profile" 
                      color="#0077b5" 
                    />
                    <SocialLink 
                      icon={FaInstagram} 
                      url={orgData?.instagram} 
                      label="Instagram Profile" 
                      color="#e4405f" 
                    />
                  </>
                )}
              </Section>
            )}
          </div>

          {/* Right Column */}
          <div className="col-lg-6 col-12">
            {/* Contact Person Details */}
            {(orgData?.contact_person_name || orgData?.contact_person_email || orgData?.contact_person_phone1) && (
              <Section title="Contact Person Details" icon={FaUser}>
                <Field label="Name" value={orgData?.contact_person_name} />
                <Field label="Gender" value={orgData?.contact_person_gender} />
                <Field 
                  label="Designation" 
                  value={orgData?.contact_person_designation && [
                    ...orgData.contact_person_designation,
                    orgData.contact_person_other_designation && 
                    orgData.contact_person_designation.includes("Others") ?
                    `(${orgData.contact_person_other_designation})` : ''
                  ].filter(Boolean).join(', ')} 
                />
                <Field label="Phone (Calling)" value={orgData?.contact_person_phone1} />
                <Field label="Phone (WhatsApp)" value={orgData?.contact_person_phone2} />
                <Field label="Email" value={orgData?.contact_person_email} />
              </Section>
            )}

            {/* Parent Details */}
            {isParent && (
              <Section title="Parent Details" icon={FaMapMarkerAlt}>
                <Field label="Address" value={orgData?.parent_address} />
                <Field label="Country" value={orgData?.parent_country ? getCountryName(orgData.parent_country) : null} />
                <Field 
                  label="State" 
                  value={orgData?.parent_country && orgData?.parent_state ? 
                    getStateName(orgData.parent_country, orgData.parent_state) : null} 
                />
                <Field label="City" value={orgData?.parent_city} />
                <Field label="Pincode" value={orgData?.parent_pincode} />
              </Section>
            )}

            {/* Reporting Authority */}
            {!isParent && (orgData?.reporting_authority_name || orgData?.phone1 || orgData?.email) && (
              <Section title="Reporting Authority" icon={FaIdCard}>
                <Field label="Name" value={orgData?.reporting_authority_name} />
                <Field label="Gender" value={orgData?.reporting_authority_gender} />
                <Field 
                  label="Designation" 
                  value={orgData?.reporting_authority_designation && [
                    ...orgData.reporting_authority_designation,
                    orgData.reporting_authority_other_designation && 
                    orgData.reporting_authority_designation.includes("Others") ?
                    `(${orgData.reporting_authority_other_designation})` : ''
                  ].filter(Boolean).join(', ')} 
                />
                <Field label="Phone (Calling)" value={orgData?.phone1} />
                <Field label="Phone (WhatsApp)" value={orgData?.phone2} />
                <Field label="Email" value={orgData?.email} />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfile;
