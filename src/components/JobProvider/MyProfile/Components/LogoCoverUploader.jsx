import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import ImageUpload from "../../../../services/ImageUpload";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import InputWithTooltip from "../../../../services/InputWithTooltip";
// Worker for pdfjs (works with Vite/CRA)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB for logo
const PAN_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";
const PAN_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-institution-pancard";
const ADDRESS_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-institution-addressproff";
const ADDRESS_ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf", "image/jpg"];

// PAN card validator for images using Tesseract OCR
const validatePanCardImage = async (file) => {
  if (!file.type.startsWith("image/")) return false;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await Tesseract.recognize(e.target.result, "eng");
        const textRaw = (result.data.text || "").replace(/\s+/g, " ").toUpperCase();
        const hasGovt = textRaw.includes("GOVT. OF INDIA");
        const hasIncomeTax = textRaw.includes("INCOME TAX DEPARTMENT");
        const hasPanText = textRaw.includes("PERMANENT ACCOUNT NUMBER");
        const panNumberMatch = textRaw.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g);
        resolve(hasGovt && hasIncomeTax && hasPanText && panNumberMatch && panNumberMatch.length > 0);
      } catch (err) {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
};

// PAN card validator for PDFs using pdfjs
const validatePanCardPDF = async (file) => {
  if (file.type !== "application/pdf") return false;
  try {
    const pdfBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      fullText += pageText + " ";
    }
    const textRaw = fullText.replace(/\s+/g, " ").toUpperCase();
    const hasGovt = textRaw.includes("GOVT. OF INDIA");
    const hasIncomeTax = textRaw.includes("INCOME TAX DEPARTMENT");
    const hasPanText = textRaw.includes("PERMANENT ACCOUNT NUMBER");
    const panNumberMatch = textRaw.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g);
    return hasGovt && hasIncomeTax && hasPanText && panNumberMatch && panNumberMatch.length > 0;
  } catch (e) {
    return false;
  }
};

const LogoCoverUploader = () => {
  const { user, loading } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [panCardImage, setPanCardImage] = useState(null);
  const [panUploading, setPanUploading] = useState(false);
  const [addressProofType, setAddressProofType] = useState("");
  const [addressProofFile, setAddressProofFile] = useState(null);
  const [addressUploading, setAddressUploading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchProfileImage();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchProfileImage = async () => {
    try {
      const params = { firebase_uid: user.uid, action: "view" };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      if (data?.url) setImageUrl(data.url);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error("Error loading profile image");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to upload an image.");
    }
  }, [loading, user]);

  // Prevent duplicate file selection for PAN & Address proof
  useEffect(() => {
    if (panCardImage && addressProofFile) {
      if (
        panCardImage.name &&
        addressProofFile.name &&
        panCardImage.name === addressProofFile.name &&
        panCardImage.size === addressProofFile.size
      ) {
        toast.error("You cannot use the same file for PAN Card and Address Proof. Please select a different file.");
        setPanCardImage(null);
        setAddressProofFile(null);
      }
    }
  }, [panCardImage, addressProofFile]);

  // LOGO IMAGE UPLOAD
  const handleFileChange = (e) => {
    if (!user) {
      toast.error("You must be logged in to upload.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Invalid file type. Only JPG and PNG are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 1MB. Please select a smaller image.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64WithPrefix = reader.result;
      const fileType = file.type;
      const firebaseUid = user.uid;
      try {
        setUploading(true);
        const response = await fetch(
          IMAGE_API_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: base64WithPrefix,
              fileType,
              firebase_uid: firebaseUid,
            }),
          }
        );
        let data = {};
        try {
          data = await response.json();
        } catch {
          data = { message: "Unknown error (non-JSON response from server)" };
        }
        if (response.ok) {
          toast.success("Image uploaded successfully!");
          if (data.url) setImageUrl(data.url);
          else if (data.id) fetchProfileImage();
          else setImageUrl(base64WithPrefix);
        } else {
          toast.error(`Upload failed: ${data.message || "Unknown error"}`);
        }
      } catch (err) {
        toast.error(`Upload error: ${err.message}`);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // PAN CARD IMAGE/PDF UPLOAD
  useEffect(() => {
    if (panCardImage && user?.uid) {
      uploadPanCardImage(panCardImage);
    }
    // eslint-disable-next-line
  }, [panCardImage]);

  const uploadPanCardImage = async (file) => {
    if (!file) return;
    if (!user?.uid) {
      toast.error("You must be logged in to upload.");
      return;
    }
    if (!PAN_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, PDF allowed for PAN Card.");
      setPanCardImage(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB. Please select a smaller file.");
      setPanCardImage(null);
      return;
    }

    // Image: Strict OCR validation
    if (file.type.startsWith("image/")) {
      toast.info("Validating PAN card image. Please wait...");
      const isPan = await validatePanCardImage(file);
      if (!isPan) {
        toast.error("Uploaded image does not appear to be a valid PAN card. Please upload a valid PAN card image.");
        setPanCardImage(null);
        return;
      }
    }

    // PDF: Extract and validate text
    if (file.type === "application/pdf") {
      toast.info("Validating PDF PAN card. Please wait...");
      const isPan = await validatePanCardPDF(file);
      if (!isPan) {
        toast.error(
          "Uploaded PDF does not appear to be a valid PAN card (text not detected). Please upload a valid e-PAN PDF file."
        );
        setPanCardImage(null);
        return;
      }
    }

    setPanUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64WithPrefix = reader.result;
        const fileType = file.type;
        const firebaseUid = user.uid;
        const payload = {
          file: base64WithPrefix,
          fileType,
          firebase_uid: firebaseUid,
          pancard_image: base64WithPrefix
        };
        const { data, status } = await axios.post(PAN_API_URL, payload, {
          headers: { "Content-Type": "application/json" }
        });
        if (status === 200 || status === 201) {
          toast.success("PAN card uploaded & updated successfully!");
        } else {
          toast.error("Failed to upload PAN card.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("PAN card upload error.");
    } finally {
      setPanUploading(false);
    }
  };

  // ADDRESS PROOF IMAGE/PDF UPLOAD
  useEffect(() => {
    if (addressProofType && addressProofFile && user?.uid) {
      uploadAddressProof(addressProofFile, addressProofType);
    }
    // eslint-disable-next-line
  }, [addressProofFile, addressProofType]);

  const uploadAddressProof = async (file, docType) => {
    if (!file) return;
    if (!user?.uid) {
      toast.error("You must be logged in to upload.");
      return;
    }
    if (!ADDRESS_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Only PDF, JPG, JPEG, PNG allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB. Please select a smaller file.");
      return;
    }

    setAddressUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64WithPrefix = reader.result;
        const fileType = file.type;
        const firebaseUid = user.uid;
        const payload = {
          file: base64WithPrefix,
          fileType,
          firebase_uid: firebaseUid,
          address_proff: docType,
          address_proff_image: base64WithPrefix
        };
        const { data, status } = await axios.post(ADDRESS_API_URL, payload, {
          headers: { "Content-Type": "application/json" }
        });
        if (status === 200 || status === 201) {
          toast.success("Address proof uploaded & updated successfully!");
        } else {
          toast.error("Failed to upload address proof.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Address proof upload error.");
    } finally {
      setAddressUploading(false);
    }
  };

  if (loading || isLoading) return <p>Loading...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Address Proof Type Dropdown */}
      <InputWithTooltip label="Address Proof Type">
        <div className="relative">
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-10"
            value={addressProofType}
            onChange={e => setAddressProofType(e.target.value)}
            disabled={addressUploading}
          >
          <option value="" disabled>Select Address Proof University</option>
          <option value="Bank Account Statement">Bank Account Statement</option>
          <option value="Credit Card Statement">Credit Card Statement</option>
          <option value="Service Tax / Sales Tax/ TAN">Service Tax / Sales Tax/ TAN</option>
          <option value="Govt. Registration Certificate">Govt. Registration Certificate</option>
          <option value="Rent Agreement / Lease Proof">Rent Agreement / Lease Proof</option>
          <option value="Certificate of Incorporation">Certificate of Incorporation</option>
          <option value="Shop and Establishment certificate">Shop and Establishment certificate</option>
          <option value="Telephone Bill">Telephone Bill</option>
          <option value="Electricity Bill">Electricity Bill</option>
          <option value="Water Bill">Water Bill</option>
          <option value="Aadhar Card / Passport/Driver's License">Aadhar Card / Passport/Driver's License</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </InputWithTooltip>

      {/* Address Proof Upload */}
      <InputWithTooltip label="Upload Address Proof">
        <div className="relative">
          <input
            type="file"
            id="address-proof-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAddressProofFile(file);
            }}
            disabled={addressUploading || !addressProofType}
          />
          <label
            htmlFor="address-proof-upload"
            className={`flex items-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors ${
              addressUploading || !addressProofType ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{addressProofFile ? addressProofFile.name : 'Upload Address Proof'}</span>
          </label>
          {addressUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
            </div>
          )}
          {!addressProofType && (
            <p className="text-xs text-amber-600 mt-1">
              Please select document type first
            </p>
          )}
        </div>
      </InputWithTooltip>

      {/* Upload PAN card */}
      <InputWithTooltip label="Upload PAN Card">
        <div className="relative">
          <input
            type="file"
            id="pan-card-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPanCardImage(file);
            }}
            disabled={panUploading}
          />
          <label
            htmlFor="pan-card-upload"
            className={`flex items-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors ${
              panUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{panCardImage ? panCardImage.name : 'Upload PAN card'}</span>
          </label>
          {panUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
            </div>
          )}
        </div>
      </InputWithTooltip>

      {/* PAN Number - Empty placeholder to maintain grid */}
      <div></div>
    </div>
  );
};

export default LogoCoverUploader;
