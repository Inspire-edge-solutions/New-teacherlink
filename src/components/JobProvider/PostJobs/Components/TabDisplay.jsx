import React, { useState } from "react";
import CreateJobForm from "./CreateJobForm";
import JobPostHistory from "./JobPostHistory";
import SaveJobs from "./SaveJobs";
import ActiveJobs from "./ActiveJobs";

const TabDisplay = () => {
  const [activeTab, setActiveTab] = useState("active-jobs");
  const [editJobData, setEditJobData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Edit job handler
  const handleEditJob = (jobData) => {
    setEditJobData(jobData);
    setActiveTab("create-job");
  };

  // Switch to create tab
  const handleSwitchToCreateTab = () => {
    setActiveTab("create-job");
  };

  // Clear edit data
  const clearEditData = () => {
    setEditJobData(null);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    clearEditData();
    setActiveTab("view-history");
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle create new job
  const handleCreateNewJob = () => {
    handleTabChange("create-job");
  };
  return (
    <div>
      {/* Tab Navigation - Separate Container */}
      <div className="rounded-lg shadow-sm mb-4 border border-gray-500">
        <div className="p-4">
          <nav className="flex justify-between flex-wrap gap-1" aria-label="Tabs">
            <button
              onClick={() => handleTabChange("active-jobs")}
              className={`px-4 py-2 rounded-lg font-medium text-sm duration-200 transition-colors ${
                activeTab === "active-jobs"
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Active Jobs
            </button>
            <button
              onClick={() => handleTabChange("create-job")}
              className={`px-4 py-2 rounded-lg font-medium text-sm duration-200 transition-colors ${
                activeTab === "create-job"
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Create Job
            </button>
            <button
              onClick={() => handleTabChange("view-history")}
              className={`px-4 py-2 rounded-lg font-medium text-sm duration-200 transition-colors ${
                activeTab === "view-history"
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              View History
            </button>
            <button
              onClick={() => handleTabChange("saved-jobs")}
              className={`px-4 py-2 rounded-lg font-medium text-sm duration-200 transition-colors ${
                activeTab === "saved-jobs"
                  ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Saved Jobs
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content - Separate Container */}
      <div className="rounded-lg shadow-sm border">
        <div className="p-6">
          {/* Show create job info only on create-job tab */}
          {activeTab === "create-job" && (
            <div className="mb-4 p-3 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="text-red-500">★</span> Fields highlighted are mandatory to fill
              </p>
            </div>
          )}
          
        {/* Tab Content */}
          {activeTab === "active-jobs" && (
            <div role="tabpanel">
              <ActiveJobs 
                onEditJob={handleEditJob}
                onSwitchToCreateTab={handleSwitchToCreateTab}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}
          {activeTab === "create-job" && (
            <div role="tabpanel">
              <CreateJobForm 
                editJobData={editJobData} 
                onClearEditData={clearEditData}
                onEditSuccess={handleEditSuccess}
              />
            </div>
          )}
          {activeTab === "view-history" && (
            <div role="tabpanel">
              <JobPostHistory 
                onEditJob={handleEditJob}
                onSwitchToCreateTab={handleSwitchToCreateTab}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}
          {activeTab === "saved-jobs" && (
            <div role="tabpanel">
              <SaveJobs 
                onCreateNewJob={handleCreateNewJob}
                onEditJob={handleEditJob}
                onSwitchToCreateTab={handleSwitchToCreateTab}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabDisplay;