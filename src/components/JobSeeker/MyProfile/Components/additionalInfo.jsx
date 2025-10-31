import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from "../../../../Context/AuthContext";
import InputWithTooltip from '../../../../services/InputWithTooltip';
import { FaChevronDown } from 'react-icons/fa';

const AdditionalInfo = forwardRef(({ formData, updateFormData }, ref) => {
  const { user } = useAuth();
  const isMounted = useRef(false);
  const [localFormData, setLocalFormData] = useState({
    computerSkills: [],
    projects: '',
    accomplishments: '',
    certifications: '',
    researchPublications: '',
    patents: '',
    religion: '',
    differentlyAbled: '',
    citizenship: '',
    additionalInfo: ''
  });

  // For available religions (from a reference API)
  const [availableReligions, setAvailableReligions] = useState([]);
  
  const skillOptions = [
    { value: "Basic knowledge", label: "Basic knowledge" },
    { value: "Word", label: "Word" },
    { value: "Excel", label: "Excel" },
    { value: "PPT", label: "PPT" },
    { value: "ERP", label: "ERP" },
    { value: "Tally", label: "Tally" },
    { value: "Other", label: "Other" },
  ];

  // React-select styles
  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#FDA4AF' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 2px #FED7E2' : 'none',
      '&:hover': { borderColor: '#FDA4AF' },
      borderRadius: '0.5rem',
      padding: '0.25rem',
      backgroundColor: 'white'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#EF4444'
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  // Flag to indicate if record already exists (for PUT vs POST)
  const [infoExists, setInfoExists] = useState(false);

  // Initialize local form data from props
  useEffect(() => {
    if (!isMounted.current) return;
    
    if (formData) {
      setLocalFormData(prev => ({
        ...prev,
        ...formData
      }));
    }
  }, [formData]);

  // Effect to handle mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setLocalFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (isMounted.current) {
      updateFormData({
        [field]: value
      });
    }
  };

  // Fetch available religions
  useEffect(() => {
    const fetchReligion = async () => {
      try {
        const response = await axios.get(import.meta.env.VITE_DEV1_API + '/languages');
        const filtered = response.data.filter(lang => lang.category === 'Religion');
        if (isMounted.current) {
          setAvailableReligions(filtered);
        }
      } catch (error) {
        console.error('Error fetching religions:', error);
      }
    };
    fetchReligion();
  }, []);

  // Fetch current user's additional information
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchAdditionalInfo = async () => {
      console.log("Fetching data for user:", user.uid);
      try {
        const response = await axios.get('https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/additional_info1', {
          params: { firebase_uid: user.uid }
        });
        console.log("Additional info response:", response.data);
        
        if (response.status === 200 && response.data.length > 0 && isMounted.current) {
          const record = response.data[0];
          setInfoExists(true);
          
          // Update formData with all fields
          const infoData = {
            firebase_id: record.firebase_uid || user.uid,
            computerSkills: record.computer_skills ? JSON.parse(record.computer_skills) : [],
            projects: record.projects || '',
            accomplishments: record.accomplishments || '',
            certifications: record.certifications || '',
            researchPublications: record.research_publications || '',
            patents: record.patents || '',
            religion: record.religion || '',
            differentlyAbled: record.differently_abled || '',
            citizenship: record.citizenship || '',
            additionalInfo: record.additional_info || ''
          };
          setLocalFormData(prev => ({ ...prev, ...infoData }));
          updateFormData(infoData);
        }
      } catch (error) {
        console.error("Error fetching user's additional information:", error);
      }
    };
    
    fetchAdditionalInfo();
  }, [user?.uid, updateFormData]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      // Prepare payload with all fields
      const payload = {
        firebase_uid: user.uid,
        computer_skills: JSON.stringify(localFormData.computerSkills || []),
        projects: localFormData.projects || '',
        accomplishments: localFormData.accomplishments || '',
        certifications: localFormData.certifications || '',
        research_publications: localFormData.researchPublications || '',
        patents: localFormData.patents || '',
        religion: localFormData.religion || '',
        differently_abled: localFormData.differentlyAbled || '',
        citizenship: localFormData.citizenship || '',
        additional_info: localFormData.additionalInfo || ''
      };

      const baseUrl = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev';
      const headers = { "Content-Type": "application/json" };

      // Use PUT if record exists, otherwise POST
      await axios[infoExists ? 'put' : 'post'](`${baseUrl}/additional_info1`, payload, { headers });
      
      toast.success('Data submitted successfully!');
    } catch (error) {
      console.error('Error submitting form:', error.response?.data || error.message);
      toast.error('Error submitting form!');
    } finally {
      setIsSaving(false);
    }
  };

  // Add validation that always returns valid since no required fields
  useImperativeHandle(ref, () => ({
    validateFields: () => ({
      isValid: true,
      errors: []
    }),
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your additional information.");
      }

      // Prepare payload with all fields
      const payload = {
        firebase_uid: user.uid,
        computer_skills: JSON.stringify(localFormData.computerSkills || []),
        projects: localFormData.projects || '',
        accomplishments: localFormData.accomplishments || '',
        certifications: localFormData.certifications || '',
        research_publications: localFormData.researchPublications || '',
        patents: localFormData.patents || '',
        religion: localFormData.religion || '',
        differently_abled: localFormData.differentlyAbled || '',
        citizenship: localFormData.citizenship || '',
        additional_info: localFormData.additionalInfo || ''
      };

      const baseUrl = 'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev';
      const headers = { "Content-Type": "application/json" };

      // Use PUT if record exists, otherwise POST
      const response = await axios[infoExists ? 'put' : 'post'](`${baseUrl}/additional_info1`, payload, { headers });
      
      console.log("Additional information saved successfully");
      return { success: true, data: response.data };
    }
  }));

  return (
    <div className="rounded-lg pt-4 px-4 pb-4 md:pt-6 md:px-6 md:pb-6 bg-rose-100 overflow-x-hidden">
      <div className="w-full space-y-6">
        {/* Computer Skills */}
        <div className="w-full">
          <InputWithTooltip label="Computer Skills">
            <Select
              isMulti
              options={skillOptions}
              value={skillOptions.filter((opt) =>
                (localFormData.computerSkills || []).includes(opt.value)
              )}
              onChange={(selected) => {
                handleChange('computerSkills', selected ? selected.map((item) => item.value) : []);
              }}
              placeholder="Select computer skills"
              isClearable
              styles={reactSelectStyles}
            />
          </InputWithTooltip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Projects */}
          <div className="w-full">
            <InputWithTooltip label="Projects">
              <input
                type="text"
                id="projects"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Projects"
                maxLength={40}
                value={localFormData.projects || ''}
                onChange={(e) => handleChange('projects', e.target.value)}
              />
            </InputWithTooltip>
          </div>

          {/* Accomplishments */}
          <div className="w-full">
            <InputWithTooltip label="Accomplishments">
              <input
                type="text"
                id="accomplishments"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Accomplishments"
                maxLength={40}
                value={localFormData.accomplishments || ''}
                onChange={(e) => handleChange('accomplishments', e.target.value)}
              />
            </InputWithTooltip>
          </div>

          {/* Certifications */}
          <div className="w-full">
            <InputWithTooltip label="Certifications">
              <input
                type="text"
                id="certifications"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Certifications"
                maxLength={40}
                value={localFormData.certifications || ''}
                onChange={(e) => handleChange('certifications', e.target.value)}
              />
            </InputWithTooltip>
          </div>

          {/* Research Publications */}
          <div className="w-full">
            <InputWithTooltip label="Research Publications">
              <input
                type="text"
                id="researchPublications"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Research Publications"
                maxLength={40}
                value={localFormData.researchPublications || ''}
                onChange={(e) => handleChange('researchPublications', e.target.value)}
              />
            </InputWithTooltip>
          </div>

          {/* Patents */}
          <div className="w-full">
            <InputWithTooltip label="Patents">
              <input
                type="text"
                id="patents"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Patents"
                maxLength={40}
                value={localFormData.patents || ''}
                onChange={(e) => handleChange('patents', e.target.value)}
              />
            </InputWithTooltip>
          </div>

          {/* Religion */}
          <div className="w-full">
            <InputWithTooltip label="Religion">
              <div className="relative">
                <select 
                  id="religion"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  value={localFormData.religion || ''}
                  onChange={(e) => handleChange('religion', e.target.value)}
                >
                  <option value="">Select Religion</option>
                  {availableReligions.map((availableReligion) => (
                    <option key={availableReligion.id} value={availableReligion.value}>
                      {availableReligion.label}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </InputWithTooltip>
          </div>

          {/* Differently Abled */}
          <div className="w-full">
            <InputWithTooltip label="Differently Abled">
              <div className="relative">
                <select 
                  id="differentlyAbled"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 appearance-none pr-10"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  value={localFormData.differentlyAbled || ''}
                  onChange={(e) => handleChange('differentlyAbled', e.target.value)}
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </InputWithTooltip>
          </div>

          {/* Citizenship */}
          <div className="w-full">
            <InputWithTooltip label="Citizenship">
              <input
                type="text"
                id="citizenship"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Citizenship"
                maxLength={40}
                pattern="[A-Za-z]{20}"
                value={localFormData.citizenship || ''}
                onChange={(e) => handleChange('citizenship', e.target.value)}
              />
            </InputWithTooltip>
          </div>
        </div>

        {/* Additional Information */}
        <div className="w-full">
          <InputWithTooltip label="Additional Information">
            <textarea
              id="additionalInfo"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 min-h-[100px]"
              placeholder="Additional Information"
              value={localFormData.additionalInfo || ''}
              onChange={(e) => handleChange('additionalInfo', e.target.value)}
            />
          </InputWithTooltip>
        </div>
      </div>
    </div>
  );
});

AdditionalInfo.displayName = 'AdditionalInfo';

export default AdditionalInfo;