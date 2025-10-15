import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import Select from 'react-select';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from "../../../../Context/AuthContext";

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
    <div className="default-form">
      <div className="row">
        {/* Computer Skills */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <Select
              isMulti
              name="computerSkills"
              options={skillOptions}
              placeholder="Computer Skills"
              value={skillOptions.filter(option => 
                Array.isArray(localFormData.computerSkills) && 
                localFormData.computerSkills.includes(option.value)
              )}
              onChange={(selectedOptions) => {
                const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
                handleChange('computerSkills', values);
              }}
              className="basic-multi-select"
              classNamePrefix="select"
            />
            <span className="custom-tooltip">Computer Skills</span>
          </div>
        </div>

        {/* Projects */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Projects"
              maxLength={40}
              value={localFormData.projects || ''}
              onChange={(e) => handleChange('projects', e.target.value)}
            />
            <span className="custom-tooltip">Projects</span>
          </div>
        </div>

        {/* Accomplishments */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Accomplishments"
              maxLength={40}
              value={localFormData.accomplishments || ''}
              onChange={(e) => handleChange('accomplishments', e.target.value)}
            />
            <span className="custom-tooltip">Accomplishments</span>
          </div>
        </div>

        {/* Certifications */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Certifications"
              maxLength={40}
              value={localFormData.certifications || ''}
              onChange={(e) => handleChange('certifications', e.target.value)}
            />
            <span className="custom-tooltip">Certifications</span>
          </div>
        </div>

        {/* Research Publications */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Research Publications"
              maxLength={40}
              value={localFormData.researchPublications || ''}
              onChange={(e) => handleChange('researchPublications', e.target.value)}
            />
            <span className="custom-tooltip">Research Publications</span>
          </div>
        </div>

        {/* Patents */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Patents"
              maxLength={40}
              value={localFormData.patents || ''}
              onChange={(e) => handleChange('patents', e.target.value)}
            />
            <span className="custom-tooltip">Patents</span>
          </div>
        </div>

        {/* Religion */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <select 
              className="chosen-single form-select"
              value={localFormData.religion || ''}
              onChange={(e) => handleChange('religion', e.target.value)}
            >
              <option value="" disabled>Religion</option>
              {availableReligions.map((availableReligion) => (
                <option key={availableReligion.id} value={availableReligion.value}>
                  {availableReligion.label}
                </option>
              ))}
            </select>
            <span className="custom-tooltip">Religion</span>
          </div>
        </div>

        {/* Differently Abled */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <select 
              className="chosen-single form-select"
              value={localFormData.differentlyAbled || ''}
              onChange={(e) => handleChange('differentlyAbled', e.target.value)}
            >
              <option value="" disabled>Differently Abled</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <span className="custom-tooltip">Differently Abled</span>
          </div>
        </div>

        {/* Citizenship */}
        <div className="form-group col-lg-6 col-md-12">
          <div className="input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Citizenship"
              maxLength={40}
              pattern="[A-Za-z]{20}"
              value={localFormData.citizenship || ''}
              onChange={(e) => handleChange('citizenship', e.target.value)}
            />
            <span className="custom-tooltip">Citizenship</span>
          </div>
        </div>

        {/* Additional Information */}
        <div className="form-group col-lg-12 col-md-12">
          <div className="input-wrapper">
            <textarea
              className="form-control"
              placeholder="Additional Information"
              value={localFormData.additionalInfo || ''}
              onChange={(e) => handleChange('additionalInfo', e.target.value)}
            />
            <span className="custom-tooltip">Additional Information</span>
          </div>
        </div>

        {/* Save button hidden - auto-save handles saving when clicking Next */}
      </div>
    </div>
  );
});

AdditionalInfo.displayName = 'AdditionalInfo';

export default AdditionalInfo;