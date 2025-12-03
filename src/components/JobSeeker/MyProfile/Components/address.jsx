import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import Select from "react-select";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import InputWithTooltip from "../../../../services/InputWithTooltip";

// Reusable react-select styles to match Tailwind design
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '48px',
    padding: '0 0.75rem',
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#fda4af' : '#d1d5db',
    backgroundColor: 'white',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(253, 164, 175, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#fda4af' : '#d1d5db',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#9ca3af',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const Address = forwardRef(({ className, permanentCity, presentCity, formData: parentFormData, updateFormData }, ref) => {
  const { user } = useAuth();

  const menuPortalTarget = typeof window !== "undefined" ? document.body : null;

  // ========== CSC Data ==========
  const [countries, setCountries] = useState([]);
  const [indiaOption, setIndiaOption] = useState(null);
  const [permanentStates, setPermanentStates] = useState([]);
  const [permanentCities, setPermanentCities] = useState([]);
  const [presentStates, setPresentStates] = useState([]);
  const [presentCities, setPresentCities] = useState([]);

  // Load countries on mount
  useEffect(() => {
    GetCountries().then((countriesData) => {
      const formattedCountries = countriesData.map(country => ({
        value: country.id,
        label: country.name,
      }));
      setCountries(formattedCountries);
      
      // Find India in the countries list
      const india = formattedCountries.find(country => country.label === "India");
      setIndiaOption(india || null);
    });
  }, []);

  // ========== Form State ==========
  const [localFormData, setLocalFormData] = useState({
    permanentAddress: parentFormData?.permanentAddress || {
      country: indiaOption || null,
      state: null,
      city: null,
    },
    presentAddress: parentFormData?.presentAddress || {
      country: indiaOption || null,
      state: null,
      city: null,
      sameAsPermanent: false,
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync with parent form data when it changes (e.g., when navigating back)
  useEffect(() => {
    if (parentFormData?.permanentAddress || parentFormData?.presentAddress) {
      setLocalFormData(prev => ({
        permanentAddress: parentFormData.permanentAddress || prev.permanentAddress,
        presentAddress: parentFormData.presentAddress || prev.presentAddress,
      }));
    }
  }, [parentFormData?.permanentAddress, parentFormData?.presentAddress]);

  // Load states when permanent country changes
  useEffect(() => {
    if (localFormData.permanentAddress.country?.value) {
      GetState(localFormData.permanentAddress.country.value).then((statesData) => {
        setPermanentStates(statesData.map(state => ({
          value: state.id,
          label: state.name,
        })));
      });
    } else {
      setPermanentStates([]);
    }
  }, [localFormData.permanentAddress.country]);

  // Load cities when permanent state changes
  useEffect(() => {
    if (localFormData.permanentAddress.country?.value && localFormData.permanentAddress.state?.value) {
      GetCity(localFormData.permanentAddress.country.value, localFormData.permanentAddress.state.value).then((citiesData) => {
        setPermanentCities(citiesData.map(city => ({
          value: city.name,
          label: city.name,
        })));
      });
    } else {
      setPermanentCities([]);
    }
  }, [localFormData.permanentAddress.country, localFormData.permanentAddress.state]);

  // Load states when present country changes
  useEffect(() => {
    if (!localFormData.presentAddress.sameAsPermanent && localFormData.presentAddress.country?.value) {
      GetState(localFormData.presentAddress.country.value).then((statesData) => {
        setPresentStates(statesData.map(state => ({
          value: state.id,
          label: state.name,
        })));
      });
    } else {
      setPresentStates([]);
    }
  }, [localFormData.presentAddress.country, localFormData.presentAddress.sameAsPermanent]);

  // Load cities when present state changes
  useEffect(() => {
    if (!localFormData.presentAddress.sameAsPermanent && localFormData.presentAddress.country?.value && localFormData.presentAddress.state?.value) {
      GetCity(localFormData.presentAddress.country.value, localFormData.presentAddress.state.value).then((citiesData) => {
        setPresentCities(citiesData.map(city => ({
          value: city.name,
          label: city.name,
        })));
      });
    } else {
      setPresentCities([]);
    }
  }, [localFormData.presentAddress.country, localFormData.presentAddress.state, localFormData.presentAddress.sameAsPermanent]);

  const getStates = async (countryId) => {
    if (!countryId) return [];
    const states = await GetState(countryId);
    return states.map(state => ({
      value: state.id,
      label: state.name,
    }));
  };

  const getCities = async (countryId, stateId) => {
    if (!countryId || !stateId) return [];
    const cities = await GetCity(countryId, stateId);
    return cities.map(city => ({
      value: city.name,
      label: city.name,
    }));
  };

  // ========== Validation Errors ==========
  const [validationErrors, setValidationErrors] = useState({
    permanentAddress: {},
    presentAddress: {}
  });

  // ========== Handle Form Changes ==========
  const handleAddressChange = (addressType, field, value) => {
    //console.log('Handling address change:', { addressType, field, value });
    
    const newLocalFormData = {
      ...localFormData,
      [addressType]: {
        ...localFormData[addressType],
        [field]: value,
      },
    };

    // Clear dependent fields
    if (field === "country") {
      newLocalFormData[addressType].state = null;
      newLocalFormData[addressType].city = null;
    } else if (field === "state") {
      newLocalFormData[addressType].city = null;
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
    if (typeof updateFormData === 'function') {
      updateFormData({
        [addressType]: newLocalFormData[addressType],
      });
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
    if (typeof updateFormData === 'function') {
      updateFormData({
        presentAddress: newLocalFormData.presentAddress,
      });
    }
  };

  // ========== Load Saved Addresses ==========
  useEffect(() => {
    if (!user?.uid || countries.length === 0) return;

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
            const states = await getStates(country.value);
            const state = states.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const cities = await getCities(country.value, state.value);
              const city = cities.find(c =>
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
            const states = await getStates(country.value);
            const state = states.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const cities = await getCities(country.value, state.value);
              const city = cities.find(c =>
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

        setLocalFormData(newFormData);
        if (typeof updateFormData === 'function') {
          updateFormData({
            permanentAddress: newFormData.permanentAddress,
            presentAddress: newFormData.presentAddress,
          });
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    fetchAddresses();
  }, [user?.uid, countries.length]);

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

      try {
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

        return { success: true };
      } catch (error) {
        console.error("Error saving address data:", error.response || error);
        throw new Error(`Failed to save address: ${error.message}`);
      }
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
    <div className={`rounded-lg pt-0 px-4 pb-4 md:pt-0 md:px-6 md:pb-6 bg-rose-100 ${className || ""} overflow-x-auto max-w-full`}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="space-y-4 w-full max-w-full">
          {/* PERMANENT ADDRESS */}
          <div>
            <h6 className="text-xl font-semibold mb-4 text-black leading-tight tracking-tight">Permanent Address</h6>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="w-full min-w-0">
                <InputWithTooltip label="Permanent Country" required>
                  <Select
                    required
                    id="permanentCountry"
                    name="permanentCountry"
                    placeholder="Country"
                    options={countries}
                    value={localFormData.permanentAddress.country}
                    onChange={(option) => handleAddressChange("permanentAddress", "country", option)}
                    isClearable={false}
                    styles={selectStyles}
                    menuPortalTarget={menuPortalTarget}
                    menuPosition="fixed"
                  />
                </InputWithTooltip>
              </div>

              <div className="w-full min-w-0">
                <InputWithTooltip label="Permanent State" required>
                  <Select
                    required
                    id="permanentState"
                    name="permanentState"
                    placeholder="State"
                    options={permanentStates}
                    value={localFormData.permanentAddress.state}
                    onChange={(option) => handleAddressChange("permanentAddress", "state", option)}
                    isDisabled={!localFormData.permanentAddress.country}
                    isClearable={false}
                    styles={selectStyles}
                    menuPortalTarget={menuPortalTarget}
                    menuPosition="fixed"
                  />
                </InputWithTooltip>
              </div>

              {permanentCity && (
                <div className="w-full min-w-0">
                  <InputWithTooltip label="Permanent City">
                    <Select
                      id="permanentCity"
                      name="permanentCity"
                      placeholder="City"
                      options={permanentCities}
                      value={localFormData.permanentAddress.city}
                      onChange={(option) => handleAddressChange("permanentAddress", "city", option)}
                      isDisabled={!localFormData.permanentAddress.state}
                      isClearable={false}
                      styles={selectStyles}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </InputWithTooltip>
                </div>
              )}
            </div>
          </div>

          {/* PRESENT ADDRESS CHECKBOX */}
          <div className="mt-4">
            <label className="flex items-center gap-3 mb-0">
              <input
                id="sameAsPermanent"
                name="sameAsPermanent"
                type="checkbox"
                onChange={handleSameAsPermanent}
                checked={localFormData.presentAddress.sameAsPermanent}
                className="w-4 h-4 text-rose-500 border-gray-300 rounded focus:ring-rose-300"
              />
              <span className="text-lg sm:text-base text-gray-700 leading-normal tracking-tight">Present Address (Same as Permanent Address)</span>
            </label>
          </div>

          {/* PRESENT ADDRESS */}
          {!localFormData.presentAddress.sameAsPermanent && (
            <div className="mt-4">
              <h6 className="text-xl font-semibold mb-4 text-black leading-tight tracking-tight">Present Address</h6>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full min-w-0">
                  <InputWithTooltip label="Present Country" required>
                    <Select
                      required
                      id="presentCountry"
                      name="presentCountry"
                      placeholder="Country"
                      options={countries}
                      value={localFormData.presentAddress.country}
                      onChange={(option) => handleAddressChange("presentAddress", "country", option)}
                      isClearable={false}
                      styles={selectStyles}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </InputWithTooltip>
                </div>

                <div className="w-full min-w-0">
                  <InputWithTooltip label="Present State" required>
                    <Select
                      required
                      id="presentState"
                      name="presentState"
                      placeholder="State"
                      options={presentStates}
                      value={localFormData.presentAddress.state}
                      onChange={(option) => handleAddressChange("presentAddress", "state", option)}
                      isDisabled={!localFormData.presentAddress.country}
                      isClearable={false}
                      styles={selectStyles}
                      menuPortalTarget={menuPortalTarget}
                      menuPosition="fixed"
                    />
                  </InputWithTooltip>
                </div>

                {presentCity && (
                  <div className="w-full min-w-0">
                    <InputWithTooltip label="Present City">
                      <Select
                        id="presentCity"
                        name="presentCity"
                        placeholder="City"
                        options={presentCities}
                        value={localFormData.presentAddress.city}
                        onChange={(option) => handleAddressChange("presentAddress", "city", option)}
                        isDisabled={!localFormData.presentAddress.state}
                        isClearable={false}
                        styles={selectStyles}
                        menuPortalTarget={menuPortalTarget}
                        menuPosition="fixed"
                      />
                    </InputWithTooltip>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SAVE BUTTON - Hidden for auto-save */}
        {/* Auto-save handles saving when clicking Next */}
      </form>
    </div>
  );
});

export default Address;