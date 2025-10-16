import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import "./profile-styles.css";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
//import ContactInfoBox from "./ContactInfoBox";

const Social = forwardRef(({ formData, updateFormData }, ref) => {
  const { user } = useAuth();

  // Initialize state for social links (only Facebook and LinkedIn)
  const [socialLinks, setSocialLinks] = useState({
    firebase_id: user?.uid || "",
    facebook: "",
    linkedin: ""
  });
  const [socialExists, setSocialExists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSocialLinks((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch the existing social profile data (if any) for the current user
  useEffect(() => {
    const fetchSocialProfile = async () => {
      try {
        const response = await axios.get(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile",
          { params: { firebase_uid: user.uid } }
        );
        if (response.status === 200 && response.data.length > 0) {
          const record = response.data[0]; // assuming one record per user
          setSocialLinks({
            firebase_id: record.firebase_uid || user.uid,
            facebook: record.facebook || "",
            linkedin: record.linkedin || ""
          });
          setSocialExists(true);
        }
      } catch (error) {
        console.error("Error fetching social profile:", error);
      }
    };

    if (user?.uid) {
      fetchSocialProfile();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Prepare data with null values for empty fields to handle database constraints
      const dataToSend = {
        firebase_id: socialLinks.firebase_id,
        facebook: socialLinks.facebook.trim() || null,
        linkedin: socialLinks.linkedin.trim() || null
      };

      if (socialExists) {
        // Update existing record via PUT
        const response = await axios.put(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile",
          socialLinks,
          { headers: { "Content-Type": "application/json" } }
        );
        toast.success("Social links updated successfully");
        //console.log("Data updated successfully:", response.data);
      } else {
        // Create new record via POST
        const response = await axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile",
          socialLinks,
          { headers: { "Content-Type": "application/json" } }
        );
        toast.success("Social links saved successfully");
        //console.log("Data sent successfully:", response.data);
        setSocialExists(true);
      }
    } catch (error) {
      console.error("Error saving social links:", error);
      toast.error("Failed to save social links");
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
        throw new Error("Please log in to save your social links.");
      }

      if (socialExists) {
        // Update existing record via PUT
        const response = await axios.put(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile",
          socialLinks,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("Social links updated successfully");
        return { success: true, data: response.data };
      } else {
        // Create new record via POST
        const response = await axios.post(
          "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/socialProfile",
          socialLinks,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("Social links saved successfully");
        setSocialExists(true);
        return { success: true, data: response.data };
      }
    }
  }));

  return (
    <div className="rounded-lg p-6" style={{backgroundColor: '#F0D8D9'}}>
      <form onSubmit={handleSubmit}>
        <div className="w-full space-y-6">
          {formData.isEasyMode ? (
            <>
              <div className="w-full">
                <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                <input
                  type="text"
                  id="facebook"
                  name="facebook"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="Facebook - www.facebook.com/your-id"
                  value={socialLinks.facebook}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="w-full">
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                <input
                  type="text"
                  id="linkedin"
                  name="linkedin"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="LinkedIn - www.linkedin.com/your-id"
                  value={socialLinks.linkedin}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                <input
                  type="text"
                  id="facebook"
                  name="facebook"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="Facebook - www.facebook.com/your-id"
                  value={socialLinks.facebook}
                  onChange={handleChange}
                />
              </div>
              <div className="w-full">
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                <input
                  type="text"
                  id="linkedin"
                  name="linkedin"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="LinkedIn - www.linkedin.com/your-id"
                  value={socialLinks.linkedin}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
        </div>
      </form>
      <div className="mt-4">
        {/* <ContactInfoBox /> */}
      </div>
    </div>
  );
});

Social.displayName = 'Social';

export default Social;