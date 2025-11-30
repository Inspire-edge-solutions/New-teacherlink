import { React, useState, useEffect, useRef } from "react";
import { useAuth } from "../../../../Context/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";

const MediaUpload = () => {

    const { user } = useAuth();

// Add state for tooltip visibility
const [showVideoTooltip, setShowVideoTooltip] = useState(false);
const [showResumeTooltip, setShowResumeTooltip] = useState(false);

// Endpoints for video/resume operations
const VIDEO_API_URL =
  "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-video";
const RESUME_API_URL =
  "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-resume";

// Helper function to shorten file names
const shortenFileName = (fileName, maxLength = 20) => {
    if (!fileName) return "";
    if (fileName.length <= maxLength) return fileName;

    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    
    // Calculate how many characters we can keep from the name
    // We add 3 for the ellipsis and extra for the extension
    const availableLength = maxLength - 3 - extension.length - 1; // -1 for the dot
    if (availableLength < 3) return `...${extension}`; // If name would be too short
    
    const shortenedName = nameWithoutExt.substring(0, availableLength);
    return `${shortenedName}...${extension}`;
};

// Add state for file names
const [videoFileName, setVideoFileName] = useState("");
const [resumeFileName, setResumeFileName] = useState("");

// Load existing file names when component mounts
useEffect(() => {
    const checkExistingFiles = async () => {
        if (!user?.uid) {
            console.log("No user ID available, skipping file check");
            return;
        }

        const checkEndpoint = async (url, params, fileType) => {
            try {
                const response = await axios.get(url, { params });
                console.log(`${fileType} response:`, response.data);
                if (response.data?.url) {
                    const urlParts = response.data.url.split('/');
                    const fileName = urlParts[urlParts.length - 1].split('?')[0];
                    return fileName || null;
                }
                return null;
            } catch (error) {
                console.error(`Error checking ${fileType}:`, error);
                // Only show toast for non-404 errors as 404 is expected when no file exists
                if (error.response?.status !== 404) {
                    toast.error(`Unable to check existing ${fileType}. Please try again later.`);
                }
                return null;
            }
        };

        try {
            // Check for video
            const videoFileName = await checkEndpoint(
                VIDEO_API_URL,
                { firebase_uid: user.uid, action: "view" },
                "video"
            );
            if (videoFileName) setVideoFileName(videoFileName);

            // Check for resume
            const resumeFileName = await checkEndpoint(
                RESUME_API_URL,
                { firebase_uid: user.uid, action: "view" },
                "resume"
            );
            if (resumeFileName) setResumeFileName(resumeFileName);
        } catch (error) {
            console.error("Error in checkExistingFiles:", error);
        }
    };

    checkExistingFiles();
}, [user]);

// Validate video file types.
function checkVideoFileTypes(file) {
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  return allowedTypes.includes(file.type);
}

// Validate resume file types.
function checkResumeFileTypes(files) {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  for (let i = 0; i < files.length; i++) {
    if (!allowedTypes.includes(files[i].type)) {
      return false;
    }
  }
  return true;
}

// Helper: Convert file to Base64.
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// ===== VIDEO UPLOAD & VIEW =====
const [demoVideoError, setDemoVideoError] = useState("");
const [demoVideoUploading, setDemoVideoUploading] = useState(false);
const demoVideoInputRef = useRef(null);
// Trigger file input for video upload.
const handleDemoVideoUploadClick = () => {
  if (demoVideoInputRef.current) {
    demoVideoInputRef.current.click();
  }
};

// When a video file is selected.
const handleDemoVideoSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!checkVideoFileTypes(file)) {
    setDemoVideoError("Only accept (.mp4, .webm, .mov) files");
    toast.error("Only accept (.mp4, .webm, .mov) files");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error("File size must be less than 10MB");
    return;
  }
  setDemoVideoError("");
  setVideoFileName(file.name); // Set filename immediately when selected
  await uploadDemoVideo(file);
};

const uploadDemoVideo = async (file) => {
    try {
        setDemoVideoUploading(true);
        const params = { fileType: file.type, firebase_uid: user?.uid };
        
        if (!user?.uid) {
            throw new Error("User ID not available");
        }

        const { data } = await axios.get(VIDEO_API_URL, { params });
        if (!data?.url) {
            throw new Error("Failed to get upload URL");
        }

        const putUrl = data.url;
        await axios.put(putUrl, file, { headers: { "Content-Type": file.type } });
        toast.success("Video uploaded successfully");
    } catch (error) {
        console.error("Error uploading video:", error);
        toast.error(error.response?.status === 404 
            ? "Video upload service is currently unavailable" 
            : "Error uploading video. Please try again later."
        );
        setVideoFileName(""); // Clear filename if upload fails
    } finally {
        setDemoVideoUploading(false);
    }
};

// When user clicks the dedicated "view" button next to "My demo video -".
const handleDemoVideoView = async () => {
    try {
        if (!user?.uid) {
            throw new Error("User ID not available");
        }

        const params = { firebase_uid: user?.uid, action: "view" };
        const { data } = await axios.get(VIDEO_API_URL, { params });
        
        if (data?.url) {
         window.open(data.url, "_blank", "noopener,noreferrer");
        } else {
            toast.error("No video found");
        }
    } catch (error) {
        console.error("Error retrieving video:", error);
        toast.error(error.response?.status === 404 
            ? "No video available to view" 
            : "Error retrieving video. Please try again later."
        );
    }
};

// ===== RESUME UPLOAD & VIEW =====
const [resumeError, setResumeError] = useState("");
const [resumeUploading, setResumeUploading] = useState(false);
const resumeInputRef = useRef(null);

const handleResumeUploadClick = () => {
  if (resumeInputRef.current) {
    resumeInputRef.current.click();
  }
};

const handleResumeSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!checkResumeFileTypes(files)) {
        setResumeError("Only accept (.doc, .docx, .pdf) files");
        toast.error("Only accept (.doc, .docx, .pdf) files");
        return;
    }
    setResumeError("");
    if (files.length > 0) {
        // Only process the first file
        const file = files[0];
        setResumeFileName(file.name);
        await uploadResume(file);
    }
};

const uploadResume = async (file) => {
    try {
        setResumeUploading(true);
        
        if (!user?.uid) {
            throw new Error("User ID not available");
        }

        const base64Data = await fileToBase64(file);
        const payload = { file: base64Data, fileType: file.type, firebase_uid: user?.uid };
        
        await axios.post(RESUME_API_URL, payload, { 
            headers: { "Content-Type": "application/json" }
        });
        
        toast.success("Resume uploaded successfully");
    } catch (error) {
        console.error("Error uploading resume:", error);
        toast.error(error.response?.status === 404 
            ? "Resume upload service is currently unavailable" 
            : "Error uploading resume. Please try again later."
        );
        setResumeFileName(""); // Clear filename if upload fails
    } finally {
        setResumeUploading(false);
    }
};

// When user clicks the dedicated "view" button next to "My resume/cv -".
// We open the resume URL in a new tab/window.
const handleResumeView = async () => {
    try {
        if (!user?.uid) {
            throw new Error("User ID not available");
        }

        const params = { firebase_uid: user?.uid, action: "view" };
        const { data } = await axios.get(RESUME_API_URL, { params });
        
        if (data?.url) {
         window.open(data.url, "_blank", "noopener,noreferrer");
        } else {
            toast.error("No resume found");
        }
    } catch (error) {
        console.error("Error retrieving resume:", error);
        toast.error(error.response?.status === 404 
            ? "No resume available to view" 
            : "Error retrieving resume. Please try again later."
        );
    }
};

return (
    <div className="max-w-5xl mx-auto p-4">
      <h5 className="text-center font-medium text-gray-500 text-lg sm:text-base leading-normal tracking-tight"><span role="img" aria-label="info">ℹ️</span> The resume and video you upload will be visible to the Job Providers.</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Demo Video Card */}
          <div className=" rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 md:mb-6 text-center leading-tight tracking-tight">My demo video</h3>
            
            <div className="mt-auto">
              <div className="flex gap-3 relative">
                <div className="flex-1 relative">
                  <button 
                    className="w-full bg-gradient-brand hover:bg-gradient-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
                    onClick={handleDemoVideoUploadClick}
                    disabled={demoVideoUploading}
                    onMouseEnter={() => setShowVideoTooltip(true)}
                    onMouseLeave={() => setShowVideoTooltip(false)}
                  >
                    {demoVideoUploading ? "Uploading..." : "Upload"}
                  </button>
                  {showVideoTooltip && !videoFileName && (
                    <div className="absolute top-full left-0 mt-2 p-2 bg-gradient-brand text-white text-base rounded z-10 whitespace-nowrap leading-normal tracking-tight">
                      Accepted formats: .mp4, .webm, .mov (Max: 10MB)
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <button 
                    className="w-full bg-gradient-brand hover:bg-gradient-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
                    onClick={handleDemoVideoView}
                    disabled={!videoFileName}
                  >
                    View
                  </button>
                </div>
              </div>
              
              {!videoFileName ? (
                <p className="text-lg sm:text-base text-gray-500 mt-2 leading-normal tracking-tight">
                  Upload a video to enable viewing.
                </p>
              ) : (
                <p className="text-lg sm:text-base text-gray-600 mt-2 truncate leading-normal tracking-tight" title={videoFileName}>
                  {videoFileName}
                </p>
              )}
              
              {demoVideoError && (
                <p className="text-red-500 text-lg sm:text-base mt-2 leading-normal tracking-tight">{demoVideoError}</p>
              )}
            </div>
            
            <input
              type="file"
              ref={demoVideoInputRef}
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleDemoVideoSelect}
            />
          </div>

          {/* Resume Card */}
          <div className="rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-bold bg-gradient-brand-text bg-clip-text text-transparent mb-4 md:mb-6 text-center leading-tight tracking-tight">My resume/cv</h3>
            
            <div className="mt-auto">
              <div className="flex gap-3 relative">
                <div className="flex-1 relative">
                  <button 
                    className="w-full bg-gradient-brand hover:bg-gradient-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
                    onClick={handleResumeUploadClick}
                    disabled={resumeUploading}
                    onMouseEnter={() => setShowResumeTooltip(true)}
                    onMouseLeave={() => setShowResumeTooltip(false)}
                  >
                    {resumeUploading ? "Uploading..." : "Upload"}
                  </button>
                  {showResumeTooltip && !resumeFileName && (
                    <div className="absolute top-full left-0 mt-2 p-2 bg-gradient-brand text-white text-base rounded z-10 whitespace-nowrap leading-normal tracking-tight">
                      Accepted format: .pdf
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <button 
                    className="w-full bg-gradient-brand hover:bg-gradient-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-base leading-normal tracking-tight"
                    onClick={handleResumeView}
                    disabled={!resumeFileName}
                  >
                    View
                  </button>
                </div>
              </div>
              
              {!resumeFileName ? (
                <p className="text-lg sm:text-base text-gray-500 mt-2 leading-normal tracking-tight">
                  Upload a resume to enable viewing.
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-2 truncate" title={resumeFileName}>
                  {resumeFileName}
                </p>
              )}
             
              {resumeError && (
                <p className="text-red-500 text-xs mt-2">{resumeError}</p>
              )}
            </div>
            
            <input
              type="file"
              ref={resumeInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handleResumeSelect}
            />
          </div>
        </div>
    </div>
)
};

export default MediaUpload;