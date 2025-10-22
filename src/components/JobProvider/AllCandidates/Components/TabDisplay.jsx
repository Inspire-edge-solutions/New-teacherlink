import React, { useState } from 'react';
import AllCandidates from './Sections/AllCandidates';
import FavouriteCandidates from './Sections/FavouriteCandidates';
import SavedCandidates from './Sections/SavedCandidates';
import AppliedCandidates from './Sections/AppliedCandidates';
import UnlockedCandidates from './Sections/UnlockedCandidates';

const TabDisplay = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [viewType, setViewType] = useState(null); // 'full' or 'short'
  const [lastSelectedCandidateId, setLastSelectedCandidateId] = useState(null);
  
  // Back handlers for each section
  const [allCandidatesBackHandler, setAllCandidatesBackHandler] = useState(null);
  const [favouriteCandidatesBackHandler, setFavouriteCandidatesBackHandler] = useState(null);
  const [savedCandidatesBackHandler, setSavedCandidatesBackHandler] = useState(null);
  const [appliedCandidatesBackHandler, setAppliedCandidatesBackHandler] = useState(null);
  const [unlockedCandidatesBackHandler, setUnlockedCandidatesBackHandler] = useState(null);

  // Handle candidate view (when user clicks to view full or short profile)
  const handleViewCandidate = (candidate, type = 'full') => {
    console.log('TabDisplay: Viewing candidate:', candidate.firebase_uid, 'Type:', type);
    setLastSelectedCandidateId(candidate.firebase_uid);
    setSelectedCandidate(candidate);
    setViewType(type);
    setViewMode('detail');
  };

  // Handle back to list
  const handleBackToList = () => {
    console.log('handleBackToList called, activeTab:', activeTab, 'lastSelectedCandidateId:', lastSelectedCandidateId);
    setSelectedCandidate(null);
    setViewType(null);
    setViewMode('list');
    
    // Call the appropriate back handler based on active tab
    let backHandler = null;
    switch (activeTab) {
      case 'all':
        backHandler = allCandidatesBackHandler;
        break;
      case 'favourite':
        backHandler = favouriteCandidatesBackHandler;
        break;
      case 'saved':
        backHandler = savedCandidatesBackHandler;
        break;
      case 'applied':
        backHandler = appliedCandidatesBackHandler;
        break;
      case 'unlocked':
        backHandler = unlockedCandidatesBackHandler;
        break;
      default:
        break;
    }
    
    if (backHandler) {
      console.log(`Calling ${activeTab}CandidatesBackHandler with candidate ID:`, lastSelectedCandidateId);
      backHandler(lastSelectedCandidateId);
    }
  };

  // Store back handlers from candidate components
  const handleAllCandidatesBackHandler = (handler) => {
    console.log('handleAllCandidatesBackHandler called, storing handler:', !!handler);
    setAllCandidatesBackHandler(() => handler);
  };

  const handleFavouriteCandidatesBackHandler = (handler) => {
    console.log('handleFavouriteCandidatesBackHandler called, storing handler:', !!handler);
    setFavouriteCandidatesBackHandler(() => handler);
  };

  const handleSavedCandidatesBackHandler = (handler) => {
    console.log('handleSavedCandidatesBackHandler called, storing handler:', !!handler);
    setSavedCandidatesBackHandler(() => handler);
  };

  const handleAppliedCandidatesBackHandler = (handler) => {
    console.log('handleAppliedCandidatesBackHandler called, storing handler:', !!handler);
    setAppliedCandidatesBackHandler(() => handler);
  };

  const handleUnlockedCandidatesBackHandler = (handler) => {
    console.log('handleUnlockedCandidatesBackHandler called, storing handler:', !!handler);
    setUnlockedCandidatesBackHandler(() => handler);
  };

  const tabs = [
    { id: 'all', label: 'All Candidates', component: AllCandidates },
    { id: 'favourite', label: 'Favourite Candidates', component: FavouriteCandidates },
    { id: 'saved', label: 'Saved Candidates', component: SavedCandidates },
    { id: 'applied', label: 'Applied Candidates', component: AppliedCandidates },
    { id: 'unlocked', label: 'Unlocked Candidates', component: UnlockedCandidates },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AllCandidates;

  console.log('TabDisplay rendered - activeTab:', activeTab, 'viewMode:', viewMode);

  return (
    <div>
      {/* Tab Navigation - Separate Container */}
      <div className="rounded-lg shadow-sm mb-4 border border-gray-500">
        <div className="p-4">
          <nav className="flex justify-between flex-wrap gap-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-brand text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => {
                  console.log('Tab clicked:', tab.id);
                  setActiveTab(tab.id);
                  // Reset to list view when switching tabs
                  setViewMode('list');
                  setSelectedCandidate(null);
                  setViewType(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content - Separate Container */}
      <div className="rounded-lg shadow-sm border">
        <div className="p-6">
          <ActiveComponent 
            onViewCandidate={handleViewCandidate}
            onBackFromCandidateView={
              activeTab === 'all' ? handleAllCandidatesBackHandler :
              activeTab === 'favourite' ? handleFavouriteCandidatesBackHandler :
              activeTab === 'saved' ? handleSavedCandidatesBackHandler :
              activeTab === 'applied' ? handleAppliedCandidatesBackHandler :
              activeTab === 'unlocked' ? handleUnlockedCandidatesBackHandler :
              undefined
            }
            selectedCandidate={selectedCandidate}
            viewType={viewType}
            viewMode={viewMode}
            onBackToList={handleBackToList}
          />
        </div>
      </div>
    </div>
  );
};

export default TabDisplay; 