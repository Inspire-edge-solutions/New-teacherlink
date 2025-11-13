import React, { useCallback, useState } from 'react';
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
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleBackToList = (mode) => {
    console.log('handleBackToList called, activeTab:', activeTab, 'lastSelectedJobId:', lastSelectedJobId);
    setSelectedJob(null);
    setViewMode('list');
  };

  // Store the back handlers from job components
  const handleAllJobsBackHandler = useCallback((handler) => {
    setAllJobsBackHandler((prev) => {
      if (prev === handler) return prev;
      console.log('handleAllJobsBackHandler called, storing handler:', !!handler);
      return handler;
    });
  }, []);


  const handleSaveJobsBackHandler = useCallback((handler) => {
    setSaveJobsBackHandler((prev) => {
      if (prev === handler) return prev;
      console.log('handleSaveJobsBackHandler called, storing handler:', !!handler);
      return handler;
    });
  }, []);

  const handleFavouriteJobsBackHandler = useCallback((handler) => {
    setFavouriteJobsBackHandler((prev) => {
      if (prev === handler) return prev;
      console.log('handleFavouriteJobsBackHandler called, storing handler:', !!handler);
      return handler;
    });
  }, []);

  const handleRecommendedJobsBackHandler = useCallback((handler) => {
    setRecommendedJobsBackHandler((prev) => {
      if (prev === handler) return prev;
      console.log('handleRecommendedJobsBackHandler called, storing handler:', !!handler);
      return handler;
    });
  }, []);

  const handleAppliedJobsBackHandler = useCallback((handler) => {
    setAppliedJobsBackHandler((prev) => {
      if (prev === handler) return prev;
      console.log('handleAppliedJobsBackHandler called, storing handler:', !!(handler));
      return handler;
    });
  }, []);

  const handleNavigateToTab = (tabId) => {
    if (!tabId) return;
    console.log('Navigating to tab:', tabId);
    setActiveTab(tabId);
    setViewMode('list');
    setSelectedJob(null);
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
    <div className="space-y-6">
      {/* Tab Navigation - Separate Container */}
      <div className="rounded-lg shadow-sm border border-gray-500">
        <div className="p-4 md:p-6">
          <nav
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 w-full"
            aria-label="Tabs"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`w-full px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium text-sm transition-all duration-200 text-center ${
                  activeTab === tab.id
                    ? 'bg-gradient-brand text-white shadow-sm hover:bg-gradient-primary-hover transition-colors'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => handleNavigateToTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Separate Container */}
      <div className="rounded-lg shadow-sm border">
        <div className="p-4 md:p-6">
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
                    onNavigateTab={handleNavigateToTab}
                    highlightJobId={viewMode === 'list' ? lastSelectedJobId : null}
                  />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabDisplay;