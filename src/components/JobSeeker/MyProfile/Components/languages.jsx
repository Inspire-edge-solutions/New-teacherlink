import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PropTypes from "prop-types";
import "./languages.css";

const Languages = forwardRef(({ updateFormData, formData }, ref) => {
  const { user } = useAuth();

  // State for user's language entries
  const [languages, setLanguages] = useState(
    formData?.languages || [{ language: "", speak: false, read: false, write: false }]
  );
  
  // State for available language options
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Validation function
  const validateLanguages = () => {
    const errors = [];
    
    // Check if at least one language is added
    if (languages.length === 0) {
      errors.push("Please add at least one language");
      return errors;
    }

    // Validate each language entry
    languages.forEach((lang, index) => {
      if (!lang.language) {
        errors.push(`Please select a language for row ${index + 1}`);
      }
      if (!lang.speak && !lang.read && !lang.write) {
        errors.push(`Please select at least one proficiency (speak/read/write) for ${lang.language || `row ${index + 1}`}`);
      }
    });

    return errors;
  };

  // Expose validation method to parent
  useImperativeHandle(ref, () => ({
    validateFields: () => {
      const errors = validateLanguages();
      return {
        isValid: errors.length === 0,
        errors
      };
    },
    saveData: async () => {
      if (!user?.uid) {
        throw new Error("Please log in to save your languages.");
      }

      const validationErrors = validateLanguages();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(", "));
      }

      const payload = {
        firebase_uid: user.uid,
        languages: JSON.stringify(languages)
      };
      
      const response = await axios.post(
        "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/languages",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (response.status === 200 || response.status === 201) {
        console.log("Languages saved successfully");
        return { success: true };
      } else {
        throw new Error("Failed to save languages");
      }
    }
  }));

  // Fetch available languages (reference data)
  useEffect(() => {
    const fetchAvailableLanguages = async () => {
      try {
        const response = await axios.get(
          import.meta.env.VITE_DEV1_API + "/languages"
        );
        const filtered = response.data.filter(
          (lang) => lang.category === "languages in India"
        );
        setAvailableLanguages(filtered);
      } catch (error) {
        console.error("Error fetching available languages:", error);
        toast.error("Failed to load available languages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableLanguages();
  }, []);

  // Fetch user's stored languages from backend (if any)
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const fetchUserLanguages = async () => {
      try {
        const response = await axios.get(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/languages",
          { params: { firebase_uid: user.uid } }
        );
        if (response.status === 200 && response.data.length > 0) {
          const record = response.data[0];
          let stored = record.languages;
          if (typeof stored === "string") {
            stored = JSON.parse(stored);
          }
          const languageData = Array.isArray(stored) ? stored : [stored];
          setLanguages(languageData);
        }
      } catch (error) {
        console.error("Error fetching user's languages:", error);
        toast.error("Failed to load your saved languages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserLanguages();
  }, [user?.uid]);

  // Separate useEffect for updating form data
  useEffect(() => {
    if (languages.length > 0) {
      updateFormData({ languages }, true);
    }
  }, [languages, updateFormData]);

  // Handle changes in the language rows
  const handleLanguageChange = (index, field, value) => {
    setLanguages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLanguage = () => {
    setLanguages((prev) => {
      const updated = [
        ...prev,
        { language: "", speak: false, read: false, write: false }
      ];
      return updated;
    });
  };

  // Remove language row
  const removeLanguage = (index) => {
    if (languages.length === 1) {
      toast.warning("You must have at least one language entry");
      return;
    }
    
    setLanguages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
  };

  // Submit handler to upsert languages
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error("Please log in to save your languages.");
      return;
    }

    const validationErrors = validateLanguages();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firebase_uid: user.uid,
        languages: JSON.stringify(languages)
      };
      const response = await axios.post(
        "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/languages",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.status === 200 || response.status === 201) {
        toast.success("Languages saved successfully!");
      } else {
        throw new Error("Failed to save languages");
      }
    } catch (error) {
      console.error(
        "Error details:",
        error.response?.data || error.message || "Unknown error"
      );
      toast.error(
        `Error: ${
          error.response?.data?.message ||
          error.message ||
          "Failed to save languages"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="languages-loading">Loading languages...</div>;
  }

  return (
    <div className="language-section">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="language-table">
            <table className="table">
              <thead>
                <tr>
                  <th className="language-col">Languages Known</th>
                  <th className="checkbox-col">Speak</th>
                  <th className="checkbox-col">Read</th>
                  <th className="checkbox-col">Write</th>
                  <th className="action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((lang, index) => (
                  <tr key={index}>
                    <td className="language-col">
                      <select
                        className="form-control"
                        id={`language-${index}`}
                        name={`language-${index}`}
                        value={lang.language}
                        onChange={(e) =>
                          handleLanguageChange(index, "language", e.target.value)
                        }
                      >
                        <option value="" disabled>Select Language</option>
                        {availableLanguages
                          .filter((availableLang) =>
                            !languages.some(
                              (l, i) =>
                                i !== index && l.language === availableLang.value
                            )
                          )
                          .map((availableLang) => (
                            <option key={availableLang.id} value={availableLang.value}>
                              {availableLang.label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={lang.speak}
                        onChange={(e) =>
                          handleLanguageChange(index, "speak", e.target.checked)
                        }
                      />
                    </td>
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={lang.read}
                        onChange={(e) =>
                          handleLanguageChange(index, "read", e.target.checked)
                        }
                      />
                    </td>
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={lang.write}
                        onChange={(e) =>
                          handleLanguageChange(index, "write", e.target.checked)
                        }
                      />
                    </td>
                    <td className="action-col">
                      <div className="action-col-container">
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeLanguage(index)}
                          disabled={languages.length === 1}
                          title="Remove language"
                        >
                          <span className="remove-text">Remove</span>
                          <span className="remove-icon">✕</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="language-actions">
            <button
              type="button"
              className="theme-btn btn-style-three"
              onClick={addLanguage}
            >
              Add Language
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

Languages.propTypes = {
  updateFormData: PropTypes.func.isRequired,
  formData: PropTypes.object
};

Languages.displayName = 'Languages';

export default Languages;

