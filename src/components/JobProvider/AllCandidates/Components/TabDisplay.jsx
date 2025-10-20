import React, { useState } from 'react';
import AllCandidates from './Sections/AllCandidates';
import SearchCandidates from './Sections/SearchCandidates';
import FavouriteCandidates from './Sections/FavouriteCandidates';
import SavedCandidates from './Sections/SavedCandidates';
import AppliedCandidates from './Sections/AppliedCandidates';
import UnlockedCandidates from './Sections/UnlockedCandidates';
import './styles/tabs.css';

const TabDisplay = () => {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Candidates', component: AllCandidates},
    { id: 'search', label: 'Search Candidates', component: SearchCandidates},
    { id: 'favourite', label: 'Favourite Candidates', component: FavouriteCandidates},
    { id: 'saved', label: 'Saved Candidates', component: SavedCandidates},
    { id: 'applied', label: 'Applied Candidates', component: AppliedCandidates},
    { id: 'unlocked', label: 'Unlocked Candidates', component: UnlockedCandidates},
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AllCandidates;

  return (
    <div className="tabs-box">
      <div className="widget-title">
        <div className="chosen-outer">
          {/* Tab Navigation */}
          <div className="tabs-header">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
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
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default TabDisplay; 