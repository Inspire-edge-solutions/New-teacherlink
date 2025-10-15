import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import Select from "react-select";
import csc from "countries-states-cities"; // For countries, states, cities
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Address = forwardRef(({ className, permanentCity, presentCity, formData: parentFormData, setFormData: setParentFormData }, ref) => {
  const { user } = useAuth();

  // ========== CSC Data ==========
  const countries = csc.getAllCountries().map(country => ({
    value: country.id,
    label: country.name,
  }));

  // Find India in the countries list
  const indiaOption = countries.find(country => country.label === "India");

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

  const getStates = (countryId) => {
    if (!countryId) return [];
    const states = csc.getStatesOfCountry(countryId);
    return states.map(state => ({
      value: state.id,
      label: state.name,
    }));
  };

  const getCities = (stateId) => {
    if (!stateId) return [];
    const cities = csc.getCitiesOfState(stateId);
    return cities.map(city => ({
      value: city.id,
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
            const states = getStates(country.value);
            const state = states.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const cities = getCities(state.value);
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
            const states = getStates(country.value);
            const state = states.find(s =>
              s.label.toLowerCase() === addr.state_name?.toLowerCase()
            );
            
            if (state) {
              const cities = getCities(state.value);
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
    <form onSubmit={handleSubmit} className={`address ${className}`}>
      <div className="row">
        {/* PERMANENT ADDRESS */}
        <h6>Permanent Address</h6>
        <div className="form-group col-lg-4 col-md-12">
          <div className="input-wrapper">
          <Select
            required
            id="permanentCountry"
            name="permanentCountry"
            placeholder="Permanent Country"
            className="custom-select required"
            options={countries}
            value={localFormData.permanentAddress.country}
            onChange={(option) => handleAddressChange("permanentAddress", "country", option)}
            isClearable={false}
          />
          <span className="custom-tooltip">Permanent Country</span>
          </div>
        </div>

        <div className="form-group col-lg-4 col-md-12">
          <div className="input-wrapper">
          <Select
            required
            id="permanentState"
            name="permanentState"
            placeholder="Permanent State"
            className="custom-select required"
            options={getStates(localFormData.permanentAddress.country?.value)}
            value={localFormData.permanentAddress.state}
            onChange={(option) => handleAddressChange("permanentAddress", "state", option)}
            isDisabled={!localFormData.permanentAddress.country}
            isClearable={false}
          />
          <span className="custom-tooltip">Permanent State</span>
          </div>
        </div>

        {permanentCity && (
            <div className="form-group col-lg-4 col-md-12">
            <div className="input-wrapper">
            <Select
              id="permanentCity"
              name="permanentCity"
              placeholder="Permanent City"
              className="custom-select"
              options={getCities(localFormData.permanentAddress.state?.value)}
              value={localFormData.permanentAddress.city}
              onChange={(option) => handleAddressChange("permanentAddress", "city", option)}
              isDisabled={!localFormData.permanentAddress.state}
              isClearable={false}
            />
            <span className="custom-tooltip">Permanent City</span>
            </div>
          </div>
        )}

        {/* PRESENT ADDRESS CHECKBOX */}
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
          <input
            id="sameAsPermanent"
            name="sameAsPermanent"
            type="checkbox"
            onChange={handleSameAsPermanent}
            checked={localFormData.presentAddress.sameAsPermanent}
            style={{ marginRight: "10px" }}
          />
          Present Address (Same as Permanent Address)
        </label>

        {/* PRESENT ADDRESS */}
        {!localFormData.presentAddress.sameAsPermanent && (
          <>
            <div className="form-group col-lg-4 col-md-12">
              <div className="input-wrapper">
              <Select
                required
                id="presentCountry"
                name="presentCountry"
                placeholder="Present Country"
                className="custom-select required"
                options={countries}
                value={localFormData.presentAddress.country}
                onChange={(option) => handleAddressChange("presentAddress", "country", option)}
                isClearable={false}
              />
              <span className="custom-tooltip">Present Country</span>
              </div>
            </div>

            <div className="form-group col-lg-4 col-md-12">
              <div className="input-wrapper">
              <Select
                required
                id="presentState"
                name="presentState"
                placeholder="Present State"
                className="custom-select required"
                options={getStates(localFormData.presentAddress.country?.value)}
                value={localFormData.presentAddress.state}
                onChange={(option) => handleAddressChange("presentAddress", "state", option)}
                isDisabled={!localFormData.presentAddress.country}
                isClearable={false}
              />
              <span className="custom-tooltip">Present State</span>
              </div>
            </div>

            {presentCity && (
              <div className="form-group col-lg-4 col-md-12">
                <div className="input-wrapper">
                <Select
                  id="presentCity"
                  name="presentCity"
                  placeholder="Present City"
                  className="custom-select"
                  options={getCities(localFormData.presentAddress.state?.value)}
                  value={localFormData.presentAddress.city}
                  onChange={(option) => handleAddressChange("presentAddress", "city", option)}
                  isDisabled={!localFormData.presentAddress.state}
                  isClearable={false}
                />
                <span className="custom-tooltip">Present City</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SAVE BUTTON - Hidden for auto-save */}
      {/* Auto-save handles saving when clicking Next */}
    </form>
  );
});

export default Address;