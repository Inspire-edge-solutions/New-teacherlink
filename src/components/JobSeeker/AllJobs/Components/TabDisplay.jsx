import React, { useState } from 'react';
import AllJobs from './Sections/AllJobs';
import SaveJobs from './Sections/SaveJobs';
import FavouriteJobs from './Sections/FavouriteJobs';
import RecommendedJobs from './Sections/RecommendedJobs';
import ViewJobs from './ViewJobs';
import AppliedJobs from './Sections/AppliedJobs';

const TabDisplay = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [allJobsBackHandler, setAllJobsBackHandler] = useState(null);
  const [saveJobsBackHandler, setSaveJobsBackHandler] = useState(null);
  const [favouriteJobsBackHandler, setFavouriteJobsBackHandler] = useState(null);
  const [recommendedJobsBackHandler, setRecommendedJobsBackHandler] = useState(null);
  const [appliedJobsBackHandler, setAppliedJobsBackHandler] = useState(null);
  const [lastSelectedJobId, setLastSelectedJobId] = useState(null);

  // Handle job view
  const handleViewJob = (job) => {
    console.log('TabDisplay: Storing job ID:', job.id);
    setLastSelectedJobId(job.id);
    setSelectedJob(job);
    setViewMode('detail');
  };

  const handleBackToList = (mode) => {
    console.log('handleBackToList called, activeTab:', activeTab, 'lastSelectedJobId:', lastSelectedJobId);
    setSelectedJob(null);
    setViewMode('list');
    
          // Call the appropriate back handler based on active tab
          let backHandler = null;
          switch (activeTab) {
            case 'all':
              backHandler = allJobsBackHandler;
              break;
            case 'save':
              backHandler = saveJobsBackHandler;
              break;
            case 'favourite':
              backHandler = favouriteJobsBackHandler;
              break;
            case 'recommended':
              backHandler = recommendedJobsBackHandler;
              break;
            case 'applied':
              backHandler = appliedJobsBackHandler;
              break;
            default:
              break;
          }
    
    if (backHandler) {
      console.log(`Calling ${activeTab}JobsBackHandler with job ID:`, lastSelectedJobId);
      backHandler(lastSelectedJobId);
    }
  };

  // Store the back handlers from job components
  const handleAllJobsBackHandler = (handler) => {
    console.log('handleAllJobsBackHandler called, storing handler:', !!handler);
    setAllJobsBackHandler(() => handler);
  };


  const handleSaveJobsBackHandler = (handler) => {
    console.log('handleSaveJobsBackHandler called, storing handler:', !!handler);
    setSaveJobsBackHandler(() => handler);
  };

  const handleFavouriteJobsBackHandler = (handler) => {
    console.log('handleFavouriteJobsBackHandler called, storing handler:', !!handler);
    setFavouriteJobsBackHandler(() => handler);
  };

  const handleRecommendedJobsBackHandler = (handler) => {
    console.log('handleRecommendedJobsBackHandler called, storing handler:', !!handler);
    setRecommendedJobsBackHandler(() => handler);
  };

  const handleAppliedJobsBackHandler = (handler) => {
    console.log('handleAppliedJobsBackHandler called, storing handler:', !!handler);
    setAppliedJobsBackHandler(() => handler);
  };

  const tabs = [
    { id: 'all', label: 'All Jobs', component: AllJobs },
    { id: 'save', label: 'Saved Jobs', component: SaveJobs },
    { id: 'favourite', label: 'Favourite Jobs', component: FavouriteJobs },
    { id: 'recommended', label: 'Recommended Jobs', component: RecommendedJobs },
    { id: 'applied', label: 'Applied Jobs', component: AppliedJobs },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AllJobs;

  console.log('TabDisplay rendered - activeTab:', activeTab); // Debug log

  return (
    <div>
      {/* Tab Navigation - Separate Container */}
      <div className="rounded-lg shadow-sm mb-4 border border-gray-500">
        <div className="p-6">
          <nav className="flex justify-between" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => {
                  console.log('Tab clicked:', tab.id); // Debug log
                  setActiveTab(tab.id);
                  // Reset to list view when switching tabs
                  setViewMode('list');
                  setSelectedJob(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Separate Container */}
      <div className=" rounded-lg shadow-sm border">
        <div className="p-6">
          {viewMode === 'detail' && selectedJob ? (
            <ViewJobs job={selectedJob} onBack={handleBackToList} />
          ) : (
                  <ActiveComponent 
                    onViewJob={handleViewJob} 
                    onBackFromJobView={
                      activeTab === 'all' ? handleAllJobsBackHandler :
                      activeTab === 'save' ? handleSaveJobsBackHandler :
                      activeTab === 'favourite' ? handleFavouriteJobsBackHandler :
                      activeTab === 'recommended' ? handleRecommendedJobsBackHandler :
                      activeTab === 'applied' ? handleAppliedJobsBackHandler :
                      undefined
                    }
                  />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabDisplay;
