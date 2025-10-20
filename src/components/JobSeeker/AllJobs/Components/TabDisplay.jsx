import React, { useState } from 'react';
import AllJobs from './Sections/AllJobs';
import SearchJobs from './Sections/SearchJobs';
import SaveJobs from './Sections/SaveJobs';
import FavouriteJobs from './Sections/FavouriteJobs';
import RecommendedJobs from './Sections/RecommendedJobs';
import ViewJobs from './ViewJobs';
import './styles/styles.css';
import './styles/tabs.css';
import AppliedJobs from './Sections/AppliedJobs';

const TabDisplay = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [allJobsBackHandler, setAllJobsBackHandler] = useState(null);
  const [searchJobsBackHandler, setSearchJobsBackHandler] = useState(null);
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
      case 'search':
        backHandler = searchJobsBackHandler;
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

  const handleSearchJobsBackHandler = (handler) => {
    console.log('handleSearchJobsBackHandler called, storing handler:', !!handler);
    setSearchJobsBackHandler(() => handler);
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
    { id: 'search', label: 'Search Jobs', component: SearchJobs },
    { id: 'save', label: 'Saved Jobs', component: SaveJobs },
    { id: 'favourite', label: 'Favourite Jobs', component: FavouriteJobs },
    { id: 'recommended', label: 'Recommended Jobs', component: RecommendedJobs },
    { id: 'applied', label: 'Applied Jobs', component: AppliedJobs },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AllJobs;

  console.log('TabDisplay rendered - activeTab:', activeTab); // Debug log

  return (
    <div className="all-jobs-section">
      <div className="tabs-box">
        <div className="widget-title">
          <div className="chosen-outer">
            {/* Tab Navigation */}
            <div className="tabs-header">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
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
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="widget-content">
          <div className="tab-content">
            {viewMode === 'detail' && selectedJob ? (
              <ViewJobs job={selectedJob} onBack={handleBackToList} />
            ) : (
              <ActiveComponent 
                onViewJob={handleViewJob} 
                onBackFromJobView={
                  activeTab === 'all' ? handleAllJobsBackHandler :
                  activeTab === 'search' ? handleSearchJobsBackHandler :
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
    </div>
  );
};

export default TabDisplay;
