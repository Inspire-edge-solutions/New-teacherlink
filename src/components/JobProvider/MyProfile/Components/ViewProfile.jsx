import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../../../Context/AuthContext";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaIdCard, FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import LoadingState from '../../../common/LoadingState';

//------------------------------------------------
// Helper functions: map countries/states/cities by ID
//------------------------------------------------
const mapAllCountries = async () => {
  const countries = await GetCountries();
  return countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
};

const mapStatesOfCountry = async (countryId) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return states.map((state) => ({
    value: state.id,
    label: state.name
  }));
};

const Field = ({ label, value, isUrl = false, icon: Icon }) => {
  if (!value) return null;
  
  const displayValue = Array.isArray(value) ? value.join(', ') : 
  typeof value === 'string' ? value.split(',').join(', ') : 
  value;

  return (
    <div className="mb-3">
      <div className="flex items-start">
        {Icon && (
          <Icon className="text-blue-600 text-base mr-2 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-gray-500 text-base font-medium mb-1 leading-snug tracking-tight">{label}</div>
          {isUrl ? (
            <a 
              href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-base break-all transition-colors leading-normal tracking-tight"
            >
              {displayValue}
            </a>
          ) : (
            <span className="text-gray-900 text-base break-words leading-normal tracking-tight">{displayValue}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const StateField = ({ label, countryCode, stateCode }) => {
  const [stateName, setStateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadStateName = async () => {
      if (!countryCode || !stateCode) {
        setStateName("");
        return;
      }
      
      setIsLoading(true);
      try {
        const states = await mapStatesOfCountry(countryCode);
        const state = states.find(s => s.value === stateCode);
        setStateName(state ? state.label : stateCode);
      } catch (error) {
        setStateName(stateCode);
      } finally {
        setIsLoading(false);
      }
    };

    loadStateName();
  }, [countryCode, stateCode]);

  if (!countryCode || !stateCode) return null;

  return (
    <div className="mb-3">
      <div className="flex items-start">
        <div className="flex-1 min-w-0">
          <div className="text-gray-500 text-base font-medium mb-1 leading-snug tracking-tight">{label}</div>
          <span className="text-gray-900 text-base leading-normal tracking-tight">
            {isLoading ? "Loading..." : stateName}
          </span>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children, icon: Icon }) => (
  <div className="mb-4 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div className="flex items-center px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
      {Icon && (
        <Icon className="text-blue-600 text-lg mr-2" />
      )}
      <h4 className="text-xl text-gray-900 font-semibold m-0 leading-tight tracking-tight">
        {title}
      </h4>
    </div>
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const SocialLink = ({ icon: Icon, url, label, color }) => {
  if (!url) return null;
  
  return (
    <div className="mb-3">
      <div className="flex items-center">
        <Icon className="text-lg mr-2 flex-shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="text-gray-500 text-base font-medium mb-1 leading-snug tracking-tight">{label}</div>
          <a 
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-base break-all transition-colors leading-normal tracking-tight"
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
  const [countries, setCountries] = useState([]);

  const API_URL = "https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation";
  const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
  const PARENT_TYPE = "Parent/ Guardian looking for Tuitions";

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await mapAllCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };
    
    loadCountries();
  }, []);

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
      const country = countries.find(c => c.value === countryCode);
      return country ? country.label : countryCode;
    } catch (error) {
      return countryCode;
    }
  };

  // Helper function to get state name from code
  const getStateName = async (countryCode, stateCode) => {
    if (!countryCode || !stateCode) return "";
    try {
      const states = await mapStatesOfCountry(countryCode);
      const state = states.find(s => s.value === stateCode);
      return state ? state.label : stateCode;
    } catch (error) {
      return stateCode;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="widget-content">
        <div className="py-10">
          <LoadingState
            title="Loading your organisation profile…"
            subtitle="We’re assembling your organisation’s details so you can review them."
            layout="card"
          />
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
    <div className="profile-view-container bg-gray-50 min-h-screen p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section with Profile Photo */}
        <div className="profile-header-card mb-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="profile-image-container w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-white flex items-center justify-center">
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
                    <FaBuilding size={24} />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-1">
                  <FaBuilding className="text-blue-600 text-xl mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900 m-0 truncate leading-tight tracking-tight">
                    {orgData?.name || 'Organization Name Not Set'}
                  </h3>
                </div>
                <div className="text-base text-gray-600 truncate leading-normal tracking-tight">
                  {orgData?.type || 'Organization Type Not Set'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Info Grid */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {orgData?.contact_person_name && (
                <div className="flex items-center">
                  <FaUser className="text-blue-600 text-base mr-2 flex-shrink-0" />
                  <span className="text-base text-gray-900 truncate leading-normal tracking-tight">{orgData.contact_person_name}</span>
                </div>
              )}
              {orgData?.contact_person_email && (
                <div className="flex items-center">
                  <FaEnvelope className="text-blue-600 text-base mr-2 flex-shrink-0" />
                  <a href={`mailto:${orgData.contact_person_email}`} 
                     className="text-blue-600 hover:text-blue-800 text-base truncate transition-colors leading-normal tracking-tight">
                    {orgData.contact_person_email}
                  </a>
                </div>
              )}
              {(orgData?.city || orgData?.country) && (
                <div className="flex items-center">
                  <FaMapMarkerAlt className="text-blue-600 text-base mr-2 flex-shrink-0" />
                  <span className="text-base text-gray-900 truncate leading-normal tracking-tight">
                    {[orgData.city, orgData.state, orgData.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {orgData?.contact_person_phone1 && (
                <div className="flex items-center">
                  <FaPhone className="text-blue-600 text-base mr-2 flex-shrink-0" />
                  <a href={`tel:${orgData.contact_person_phone1}`} 
                     className="text-blue-600 hover:text-blue-800 text-base truncate transition-colors leading-normal tracking-tight">
                    {orgData.contact_person_phone1}
                  </a>
                </div>
              )}
              {orgData?.contact_person_phone2 && (
                <div className="flex items-center">
                  <FaWhatsapp className="text-base mr-2 flex-shrink-0" style={{color: '#25D366'}} />
                  <a href={`https://wa.me/${orgData.contact_person_phone2}`} 
                     className="text-blue-600 hover:text-blue-800 text-base truncate transition-colors leading-normal tracking-tight">
                    {orgData.contact_person_phone2}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div>
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
                    <div className="col-span-full my-2">
                      <hr className="border-gray-200" />
                    </div>
                    <SocialLink 
                      icon={FaFacebook} 
                      url={orgData?.facebook} 
                      label="Facebook" 
                      color="#1877f2" 
                    />
                    <SocialLink 
                      icon={FaTwitter} 
                      url={orgData?.twitter} 
                      label="Twitter" 
                      color="#1da1f2" 
                    />
                    <SocialLink 
                      icon={FaLinkedin} 
                      url={orgData?.linkedin} 
                      label="LinkedIn" 
                      color="#0077b5" 
                    />
                    <SocialLink 
                      icon={FaInstagram} 
                      url={orgData?.instagram} 
                      label="Instagram" 
                      color="#e4405f" 
                    />
                  </>
                )}
              </Section>
            )}
          </div>

          {/* Right Column */}
          <div>
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
                <StateField 
                  label="State" 
                  countryCode={orgData?.parent_country}
                  stateCode={orgData?.parent_state}
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