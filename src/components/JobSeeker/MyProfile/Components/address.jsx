import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

// Find India in the countries list
const findIndiaOption = async () => {
  const countries = await GetCountries();
  const countriesOptions = countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
  const india = countriesOptions.find(country => country.label === "India");
  return india || null;
};

const mapStatesOfCountry = async (countryId) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return states.map((state) => ({
    value: state.id,
    label: state.name
  }));
};

const mapCitiesOfState = async (countryId, stateId) => {
  if (!countryId || !stateId) return [];
  const cities = await GetCity(countryId, stateId);
  return cities.map((city) => ({
    value: city.name,
    label: city.name
  }));
};

const Address = forwardRef(({ className, permanentCity, presentCity, formData: parentFormData, setFormData: setParentFormData }, ref) => {
  const { user } = useAuth();

  // ========== CSC Data ==========
  const [countries, setCountries] = useState([]);
  const [indiaOption, setIndiaOption] = useState(null);

  // ========== Form State ==========
  const [localFormData, setLocalFormData] = useState({
    permanentAddress: parentFormData?.permanentAddress || {
      country: null,
      state: null,
      city: null,
    },
    presentAddress: parentFormData?.presentAddress || {
      country: null,
      state: null,
      city: null,
      sameAsPermanent: false,
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  // ========== Load Countries on Component Mount ==========
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const [countriesData, indiaData] = await Promise.all([
          mapAllCountries(),
          findIndiaOption()
        ]);
        setCountries(countriesData);
        setIndiaOption(indiaData);
        
        // Update form data with India option if not already set
        if (indiaData && !localFormData.permanentAddress.country && !localFormData.presentAddress.country) {
          setLocalFormData(prev => ({
            permanentAddress: {
              ...prev.permanentAddress,
              country: indiaData
            },
            presentAddress: {
              ...prev.presentAddress,
              country: indiaData
            }
          }));
        }
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };
    
    loadCountries();
  }, []);

  const [states, setStates] = useState({ permanent: [], present: [] });
  const [cities, setCities] = useState({ permanent: [], present: [] });

  const getStates = async (countryId, addressType = 'permanent') => {
    if (!countryId) {
      setStates(prev => ({ ...prev, [addressType]: [] }));
      return [];
    }
    try {
      const statesData = await mapStatesOfCountry(countryId);
      setStates(prev => ({ ...prev, [addressType]: statesData }));
      return statesData;
    } catch (error) {
      console.error("Error loading states:", error);
      setStates(prev => ({ ...prev, [addressType]: [] }));
      return [];
    }
  };

  const getCities = async (countryId, stateId, addressType = 'permanent') => {
    if (!countryId || !stateId) {
      setCities(prev => ({ ...prev, [addressType]: [] }));
      return [];
    }
    try {
      const citiesData = await mapCitiesOfState(countryId, stateId);
      setCities(prev => ({ ...prev, [addressType]: citiesData }));
      return citiesData;
    } catch (error) {
      console.error("Error loading cities:", error);
      setCities(prev => ({ ...prev, [addressType]: [] }));
      return [];
    }
  };

  // ========== Validation Errors ==========
  const [validationErrors, setValidationErrors] = useState({
    permanentAddress: {},
    presentAddress: {}
  });

  // ========== Handle Form Changes ==========
  const handleAddressChange = async (addressType, field, value) => {
    //console.log('Handling address change:', { addressType, field, value });
    
    const newLocalFormData = {
      ...localFormData,
      [addressType]: {
        ...localFormData[addressType],
        [field]: value,
      },
    };

    // Clear dependent fields and load new data
    if (field === "country") {
      newLocalFormData[addressType].state = null;
      newLocalFormData[addressType].city = null;
      // Load states for the selected country
      if (value?.value) {
        await getStates(value.value, addressType === 'permanentAddress' ? 'permanent' : 'present');
      }
    } else if (field === "state") {
      newLocalFormData[addressType].city = null;
      // Load cities for the selected state
      if (value?.value && newLocalFormData[addressType].country?.value) {
        await getCities(
          newLocalFormData[addressType].country.value, 
          value.value, 
          addressType === 'permanentAddress' ? 'permanent' : 'present'
        );
      }
    }

    setLocalFormData(newLocalFormData);

    // Clear validation error for this field
    setValidationErrors(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: undefined
      }
    }));

    // Update parent form data
    if (typeof setParentFormData === 'function') {
      setParentFormData(prev => ({
        ...prev,
        [addressType]: newLocalFormData[addressType],
      }));
    }
  };

  const handleSameAsPermanent = (e) => {
    const checked = e.target.checked;
    const newLocalFormData = {
      ...localFormData,
      presentAddress: checked
        ? {
            ...localFormData.permanentAddress,
            sameAsPermanent: true,
          }
        : {
            country: null,
            state: null,
            city: null,
            sameAsPermanent: false,
          },
    };

    setLocalFormData(newLocalFormData);
    if (typeof setParentFormData === 'function') {
      setParentFormData(prev => ({
        ...prev,
        presentAddress: newLocalFormData.presentAddress,
      }));
    }
  };

  // ========== Load Saved Addresses ==========
  useEffect(() => {
    if (!user?.uid) return;

    const fetchAddresses = async () => {
      try {
        const [permResp, presResp] = await Promise.all([
          axios.get(
            "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/permanentAddress",
            { params: { firebase_uid: user.uid } }
          ),
          axios.get(
            "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress",
            { params: { firebase_uid: user.uid } }
          ),
        ]);

        const newFormData = { ...localFormData };

        // Handle permanent address
        if (permResp.data?.[0]) {
          const addr = permResp.data[0];
          const country = countries.find(c =>
            c.label.toLowerCase() === addr.country_name?.toLowerCase()
          );
          
          if (country) {
            const statesData = await getStates(country.value, 'permanent');
            const state = statesData.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const citiesData = await getCities(country.value, state.value, 'permanent');
              const city = citiesData.find(c =>
                c.label.toLowerCase() === addr.city_name?.toLowerCase()
              );

              newFormData.permanentAddress = {
                country,
                state,
                city: city || null,
              };
            }
          }
        }

        // Handle present address
        if (presResp.data?.[0]) {
          const addr = presResp.data[0];
          const country = countries.find(c =>
            c.label.toLowerCase() === addr.country_name?.toLowerCase()
          );
          
          if (country) {
            const statesData = await getStates(country.value, 'present');
            const state = statesData.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const citiesData = await getCities(country.value, state.value, 'present');
              const city = citiesData.find(c =>
                c.label.toLowerCase() === addr.city_name?.toLowerCase()
              );

              newFormData.presentAddress = {
                country,
                state,
                city: city || null,
                sameAsPermanent: false,
              };
            }
          }
        }

        //console.log("Setting form data:", newFormData);
        setLocalFormData(newFormData);
        if (typeof setParentFormData === 'function') {
          setParentFormData(prev => ({
            ...prev,
            permanentAddress: newFormData.permanentAddress,
            presentAddress: newFormData.presentAddress,
          }));
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
        //toast.error("Failed to load saved addresses");
      }
    };

    fetchAddresses();
  }, [user?.uid]);

  // ========== Validation Function ==========
  const validateFields = () => {
    const errors = {
      permanentAddress: {},
      presentAddress: {}
    };

    // Validate permanent address
    if (!localFormData.permanentAddress.country) {
      errors.permanentAddress.country = "Please select a country for permanent address";
    }
    if (!localFormData.permanentAddress.state) {
      errors.permanentAddress.state = "Please select a state for permanent address";
    }
    

    // Validate present address if not same as permanent
    if (!localFormData.presentAddress.sameAsPermanent) {
      if (!localFormData.presentAddress.country) {
        errors.presentAddress.country = "Please select a country for present address";
      }
      if (!localFormData.presentAddress.state) {
        errors.presentAddress.state = "Please select a state for present address";
      }
    }

    // Display validation errors as toasts
    const allErrors = [
      ...Object.values(errors.permanentAddress),
      ...Object.values(errors.presentAddress)
    ];

    if (allErrors.length > 0) {
      allErrors.forEach(error => toast.error(error));
    }

    const hasErrors = allErrors.length > 0;

    return {
      isValid: !hasErrors,
      errors
    };
  };

  // ========== Expose Validation Function ==========
  useImperativeHandle(ref, () => ({
    validateFields,
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your address.");
      }

      const validationResult = validateFields();
      if (!validationResult.isValid) {
        throw new Error("Please fix the validation errors before saving.");
      }

      const permanentAddressPayload = {
        country_name: localFormData.permanentAddress.country?.label || "",
        state_name: localFormData.permanentAddress.state?.label || "",
        city_name: localFormData.permanentAddress.city?.label || "",
        firebase_uid: user.uid,
      };

      const presentAddressPayload = localFormData.presentAddress.sameAsPermanent
        ? { ...permanentAddressPayload }
        : {
            country_name: localFormData.presentAddress.country?.label || "",
            state_name: localFormData.presentAddress.state?.label || "",
            city_name: localFormData.presentAddress.city?.label || "",
            firebase_uid: user.uid,
          };

      await Promise.all([
        axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/permanentAddress",
          permanentAddressPayload,
          { headers: { "Content-Type": "application/json" } }
        ),
        axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress",
          presentAddressPayload,
          { headers: { "Content-Type": "application/json" } }
        ),
      ]);

      console.log("Address data saved successfully");
      return { success: true };
    }
  }));

  // ========== Submit Handler ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!user?.uid) {
        toast.error("Please log in to save your address.");
        return;
      }

      const validationResult = validateFields();

      if (!validationResult.isValid) {
        toast.error("Please fix the validation errors before submitting.");
        return;
      }

      const permanentAddressPayload = {
        country_name: localFormData.permanentAddress.country?.label || "",
        state_name: localFormData.permanentAddress.state?.label || "",
        city_name: localFormData.permanentAddress.city?.label || "",
        firebase_uid: user.uid,
      };

      const presentAddressPayload = localFormData.presentAddress.sameAsPermanent
        ? { ...permanentAddressPayload }
        : {
            country_name: localFormData.presentAddress.country?.label || "",
            state_name: localFormData.presentAddress.state?.label || "",
            city_name: localFormData.presentAddress.city?.label || "",
            firebase_uid: user.uid,
          };

      await Promise.all([
        axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/permanentAddress",
          permanentAddressPayload,
          { headers: { "Content-Type": "application/json" } }
        ),
        axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/presentAddress",
          presentAddressPayload,
          { headers: { "Content-Type": "application/json" } }
        ),
      ]);

      toast.success("Addresses saved successfully!");
    } catch (error) {
      console.error("Error saving addresses:", error);
      toast.error("Failed to save addresses");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`rounded-lg p-6 bg-rose-100 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PERMANENT ADDRESS */}
        <div className="w-full md:col-span-2">
          <h6 className="text-gray-700 font-medium mb-3">Permanent Address</h6>
        </div>
        
        <div className="w-full">
          <FormControl fullWidth required>
            <InputLabel id="permanent-country-label" required>Permanent Country</InputLabel>
            <Select
              labelId="permanent-country-label"
              id="permanentCountry"
              label="Permanent Country"
              value={localFormData.permanentAddress.country?.value || ''}
              onChange={(e) => {
                const selectedCountry = countries.find(c => c.value === e.target.value);
                handleAddressChange("permanentAddress", "country", selectedCountry);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.5rem',
                  height: '48px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FDA4AF',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FDA4AF',
                    borderWidth: 2,
                  },
                },
                '& .MuiSelect-select': {
                  padding: '12px 14px',
                },
              }}
            >
              {countries.map((country) => (
                <MenuItem key={country.value} value={country.value}>
                  {country.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="w-full">
          <FormControl fullWidth required>
            <InputLabel id="permanent-state-label" required>Permanent State</InputLabel>
            <Select
              labelId="permanent-state-label"
              id="permanentState"
              label="Permanent State"
              value={localFormData.permanentAddress.state?.value || ''}
              onChange={(e) => {
                const selectedState = states.permanent.find(s => s.value === e.target.value);
                handleAddressChange("permanentAddress", "state", selectedState);
              }}
              disabled={!localFormData.permanentAddress.country}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.5rem',
                  height: '48px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FDA4AF',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FDA4AF',
                    borderWidth: 2,
                  },
                },
                '& .MuiSelect-select': {
                  padding: '12px 14px',
                },
              }}
            >
              {states.permanent.map((state) => (
                <MenuItem key={state.value} value={state.value}>
                  {state.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {permanentCity && (
          <div className="w-full">
            <FormControl fullWidth>
              <InputLabel id="permanent-city-label">Permanent City</InputLabel>
              <Select
                labelId="permanent-city-label"
                id="permanentCity"
                label="Permanent City"
                value={localFormData.permanentAddress.city?.value || ''}
                onChange={(e) => {
                  const selectedCity = cities.permanent.find(c => c.value === e.target.value);
                  handleAddressChange("permanentAddress", "city", selectedCity);
                }}
                disabled={!localFormData.permanentAddress.state}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '0.5rem',
                    height: '48px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FDA4AF',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FDA4AF',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 14px',
                  },
                }}
              >
                {cities.permanent.map((city) => (
                  <MenuItem key={city.value} value={city.value}>
                    {city.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}

        {/* PRESENT ADDRESS CHECKBOX */}
        <div className="w-full md:col-span-2">
          <label className="flex items-center gap-3 my-4">
            <input
              id="sameAsPermanent"
              name="sameAsPermanent"
              type="checkbox"
              onChange={handleSameAsPermanent}
              checked={localFormData.presentAddress.sameAsPermanent}
              className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-300"
            />
            <span className="text-sm text-gray-700">Present Address (Same as Permanent Address)</span>
          </label>
        </div>

        {/* PRESENT ADDRESS */}
        {!localFormData.presentAddress.sameAsPermanent && (
          <>
            <div className="w-full">
              <FormControl fullWidth>
                <InputLabel id="present-country-label">Present Country</InputLabel>
                <Select
                  labelId="present-country-label"
                  id="presentCountry"
                  label="Present Country"
                  value={localFormData.presentAddress.country?.value || ''}
                  onChange={(e) => {
                    const selectedCountry = countries.find(c => c.value === e.target.value);
                    handleAddressChange("presentAddress", "country", selectedCountry);
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      height: '48px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FDA4AF',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FDA4AF',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiSelect-select': {
                      padding: '12px 14px',
                    },
                  }}
                >
                  {countries.map((country) => (
                    <MenuItem key={country.value} value={country.value}>
                      {country.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full">
              <FormControl fullWidth>
                <InputLabel id="present-state-label">Present State</InputLabel>
                <Select
                  labelId="present-state-label"
                  id="presentState"
                  label="Present State"
                  value={localFormData.presentAddress.state?.value || ''}
                  onChange={(e) => {
                    const selectedState = states.present.find(s => s.value === e.target.value);
                    handleAddressChange("presentAddress", "state", selectedState);
                  }}
                  disabled={!localFormData.presentAddress.country}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      height: '48px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FDA4AF',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FDA4AF',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiSelect-select': {
                      padding: '12px 14px',
                    },
                  }}
                >
                  {states.present.map((state) => (
                    <MenuItem key={state.value} value={state.value}>
                      {state.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {presentCity && (
              <div className="w-full">
                <FormControl fullWidth>
                  <InputLabel id="present-city-label">Present City</InputLabel>
                  <Select
                    labelId="present-city-label"
                    id="presentCity"
                    label="Present City"
                    value={localFormData.presentAddress.city?.value || ''}
                    onChange={(e) => {
                      const selectedCity = cities.present.find(c => c.value === e.target.value);
                      handleAddressChange("presentAddress", "city", selectedCity);
                    }}
                    disabled={!localFormData.presentAddress.state}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '0.5rem',
                        height: '48px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FDA4AF',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FDA4AF',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiSelect-select': {
                        padding: '12px 14px',
                      },
                    }}
                  >
                    {cities.present.map((city) => (
                      <MenuItem key={city.value} value={city.value}>
                        {city.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}
          </>
        )}
      </div>
    </form>
  );
});

export default Address;