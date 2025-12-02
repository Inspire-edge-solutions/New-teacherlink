import React, { useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AllJobs from './Sections/AllJobs';
import SaveJobs from './Sections/SaveJobs';
import FavouriteJobs from './Sections/FavouriteJobs';
import RecommendedJobs from './Sections/RecommendedJobs';
import ViewJobs from './ViewJobs';
import AppliedJobs from './Sections/AppliedJobs';

const JOBS_API = 'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/jobPostIntstitutes';

const TabDisplay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [allJobsBackHandler, setAllJobsBackHandler] = useState(null);
  const [saveJobsBackHandler, setSaveJobsBackHandler] = useState(null);
  const [favouriteJobsBackHandler, setFavouriteJobsBackHandler] = useState(null);
  const [recommendedJobsBackHandler, setRecommendedJobsBackHandler] = useState(null);
  const [appliedJobsBackHandler, setAppliedJobsBackHandler] = useState(null);
  const [lastSelectedJobId, setLastSelectedJobId] = useState(null);
  const [fromNotifications, setFromNotifications] = useState(false);
  const [fromRecruiterActions, setFromRecruiterActions] = useState(false);
  const [saveJobsRefreshTrigger, setSaveJobsRefreshTrigger] = useState(0);

  // Handle job view
  const handleViewJob = (job) => {
    console.log('TabDisplay: Storing job ID:', job.id);
    setLastSelectedJobId(job.id);
    setSelectedJob(job);
    setViewMode('detail');
    // Reset navigation flags when viewing job normally (not from navigation state)
    setFromNotifications(false);
    setFromRecruiterActions(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleBackToList = (mode) => {
    console.log('handleBackToList called, activeTab:', activeTab, 'lastSelectedJobId:', lastSelectedJobId);
    
    // If we came from notifications, navigate back to notifications
    if (fromNotifications) {
      navigate('/seeker/notifications');
      return;
    }
    
    // If we came from recruiter actions, navigate back to recruiter actions
    if (fromRecruiterActions) {
      navigate('/seeker/recruiter-actions');
      return;
    }
    
    setSelectedJob(null);
    setViewMode('list');
  };

  // Check for navigation state from notifications or recruiter actions
  useEffect(() => {
    const state = location.state;
    if (state?.openJobId && (state?.fromNotifications || state?.fromRecruiterActions)) {
      if (state?.fromNotifications) {
        setFromNotifications(true);
      }
      if (state?.fromRecruiterActions) {
        setFromRecruiterActions(true);
      }
      
      // Fetch and open the job
      const fetchAndOpenJob = async () => {
        try {
          const response = await axios.get(`${JOBS_API}?id=${state.openJobId}`);
          let jobData = null;
          
          if (Array.isArray(response.data) && response.data.length > 0) {
            jobData = response.data.find(job => Number(job.id) === Number(state.openJobId));
          } else if (response.data && response.data.id) {
            jobData = response.data;
          }
          
          if (jobData) {
            setSelectedJob(jobData);
            setViewMode('detail');
            setLastSelectedJobId(jobData.id);
            window.scrollTo({ top: 0, behavior: 'auto' });
            
            // Clear the state to prevent re-opening on re-render
            navigate(location.pathname, { replace: true, state: {} });
          }
        } catch (error) {
          console.error('Error fetching job:', error);
        }
      };
      
      fetchAndOpenJob();
    }
  }, [location.state, navigate, location.pathname]);

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
    // Refresh SaveJobs when switching to it
    if (tabId === 'save') {
      setSaveJobsRefreshTrigger(prev => prev + 1);
    }
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
    <div className="space-y-4">
      {/* Tab Navigation - Separate Container */}
      <div className="rounded-lg shadow-sm border border-gray-500">
        <div className="p-2 md:p-6">
          <nav
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 w-full"
            aria-label="Tabs"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`w-full px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium text-base transition-all duration-200 text-center leading-normal tracking-tight ${
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
        <div className="p-2 md:p-6">
          {viewMode === 'detail' && selectedJob ? (
            <ViewJobs 
              job={selectedJob} 
              onBack={handleBackToList} 
              fromNotifications={fromNotifications}
              fromRecruiterActions={fromRecruiterActions}
            />
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
                    refreshTrigger={activeTab === 'save' ? saveJobsRefreshTrigger : undefined}
                  />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabDisplay;