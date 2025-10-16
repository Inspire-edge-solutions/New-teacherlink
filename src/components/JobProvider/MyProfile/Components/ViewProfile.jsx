import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../../../Context/AuthContext";
import { Country, State } from 'country-state-city';
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaVideo, FaIdCard, FaUsers, FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaCamera, FaWhatsapp } from 'react-icons/fa';

const Field = ({ label, value, isUrl = false }) => {
  if (!value) return null;
  
  const displayValue = Array.isArray(value) ? value.join(', ') : 
                      typeof value === 'string' ? value.split(',').join(', ') : 
                      value;

  return (
    <div className="col-12">
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <div style={{ 
          width: '120px',
          minWidth: '120px',
          color: '#666', 
          fontSize: '14px',
          paddingRight: '10px'
        }}>{label}:</div>
        <div style={{ flex: 1 }}>
          {isUrl ? (
            <a 
              href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
              style={{ 
                color: '#1967d2', 
                fontSize: '14px',
                wordBreak: 'break-all'
              }}
            >
              {displayValue}
            </a>
          ) : (
            <span style={{ 
              color: '#202124', 
              fontSize: '14px',
              display: 'block'
            }}>{displayValue}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children, icon: Icon }) => (
  <div className="mb-3" style={{ 
    backgroundColor: title === "Organization Details" ? '#f0f2f5' : '#fff', 
    borderRadius: '8px', 
    padding: '20px', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)' 
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px',
      borderBottom: '1px solid #e6e6e6',
      paddingBottom: '10px'
    }}>
      {Icon && (
        <Icon style={{ 
          color: '#1967d2',
          fontSize: '18px',
          marginRight: '10px'
        }} />
      )}
      <h4 style={{ 
        color: '#202124', 
        fontSize: '18px', 
        fontWeight: '600',
        margin: 0
      }}>
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
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <div style={{ 
          width: '120px',
          minWidth: '120px',
          color: '#666', 
          fontSize: '14px',
          paddingRight: '10px'
        }}>{label}:</div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flex: 1
        }}>
          <Icon style={{ 
            color, 
            fontSize: '14px',
            marginRight: '8px',
            flexShrink: 0
          }} />
          <a 
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
            style={{ 
              color: '#1967d2', 
              fontSize: '14px',
              wordBreak: 'break-all'
            }}
          >
            {url}
          </a>
        </div>
      </div>
    </div>
  );
};

// Update the header section contact info layout
const contactInfoStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '10px'
};

const iconStyle = {
  color: '#1967d2',
  fontSize: '14px',
  marginRight: '8px',
  marginTop: '3px',
  flexShrink: 0
};

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
      const country = Country.getCountryByCode(countryCode);
      return country ? country.name : countryCode;
    } catch (error) {
      return countryCode;
    }
  };

  // Helper function to get state name from code
  const getStateName = (countryCode, stateCode) => {
    if (!countryCode || !stateCode) return "";
    try {
      const state = State.getStateByCodeAndCountry(stateCode, countryCode);
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
    <div className="profile-view-container" style={{ 
      backgroundColor: '#f8f9fa', 
      minHeight: '100vh', 
      padding: window.innerWidth < 768 ? '10px' : '20px' 
    }}>
      <div className="container-fluid">
        
        {/* Header Section with Profile Photo */}
        <div className="profile-header-card mb-4" style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: window.innerWidth < 768 ? '15px' : '25px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef'
        }}>
          <div className="row align-items-center">
            <div className="col-md-3 col-sm-12 text-center mb-md-0 mb-3">
              <div className="profile-image-container" style={{
                width: window.innerWidth < 768 ? '100px' : '120px',
                height: window.innerWidth < 768 ? '100px' : '120px',
                margin: '0 auto',
                borderRadius: '50%',
                border: '3px solid #e9ecef',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Organization Logo" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  display: profileImage ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#e9ecef',
                  color: '#6c757d'
                }}>
                  <FaBuilding size={30} />
                </div>
              </div>
            </div>
            <div className="col-md-9 col-sm-12">
              <div className="d-flex align-items-center mb-3">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <FaBuilding style={{ 
                    color: '#1967d2',
                    fontSize: '24px',
                    marginRight: '12px'
                  }} />
                  <h3 style={{ 
                    fontWeight: '600', 
                    color: '#202124', 
                    fontSize: '24px', 
                    margin: 0
                  }}>
                    {orgData?.name || 'Organization Name Not Set'}
                  </h3>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <FaBuilding style={{ 
                  color: '#1967d2',
                  fontSize: '16px',
                  marginRight: '10px'
                }} />
                <span style={{ 
                  fontSize: '16px',
                  color: '#202124',
                  fontWeight: '500'
                }}>
                  {orgData?.type || 'Organization Type Not Set'}
                </span>
              </div>
              <div className="row">
                <div className="col-12">
                  {orgData?.contact_person_name && (
                    <div style={contactInfoStyle}>
                      <FaUser style={iconStyle} />
                      <div style={{ flex: 1 }}>
                        <strong>Contact:</strong> {orgData.contact_person_name}
                      </div>
                    </div>
                  )}
                  {orgData?.contact_person_email && (
                    <div style={contactInfoStyle}>
                      <FaEnvelope style={iconStyle} />
                      <a href={`mailto:${orgData.contact_person_email}`} 
                         style={{ 
                           color: '#1967d2', 
                           textDecoration: 'none', 
                           fontSize: '14px',
                           flex: 1
                         }}>
                        {orgData.contact_person_email}
                      </a>
                    </div>
                  )}
                  {(orgData?.city || orgData?.country) && (
                    <div style={contactInfoStyle}>
                      <FaMapMarkerAlt style={iconStyle} />
                      <div style={{ flex: 1 }}>
                        {[orgData.city, orgData.state, orgData.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                  {orgData?.contact_person_phone1 && (
                    <div style={contactInfoStyle}>
                      <FaPhone style={iconStyle} />
                      <a href={`tel:${orgData.contact_person_phone1}`} 
                         style={{ 
                           color: '#1967d2', 
                           textDecoration: 'none', 
                           fontSize: '14px',
                           flex: 1
                         }}>
                        {orgData.contact_person_phone1}
                      </a>
                    </div>
                  )}
                  {orgData?.contact_person_phone2 && (
                    <div style={contactInfoStyle}>
                      <FaWhatsapp style={{...iconStyle, color: '#25D366'}} />
                      <a href={`https://wa.me/${orgData.contact_person_phone2}`} 
                         style={{ 
                           color: '#1967d2', 
                           textDecoration: 'none', 
                           fontSize: '14px',
                           flex: 1
                         }}>
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
                      <hr className="my-3" style={{ borderColor: '#e9ecef' }} />
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px'
                      }}>
                        <FaGlobe style={{ 
                          color: '#1967d2',
                          fontSize: '18px',
                          marginRight: '10px'
                        }} />
                        <h5 style={{ 
                          color: '#202124',
                          fontSize: '16px',
                          fontWeight: '500',
                          margin: 0
                        }}>
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
