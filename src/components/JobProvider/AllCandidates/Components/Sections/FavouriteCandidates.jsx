import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import CandidateShort from '../shared/CandidateShort';
import CandidateDetail from '../shared/ViewFull';
import { default as ViewShort } from '../shared/ViewShort';
import SearchBar from '../shared/SearchBar';
import { searchCandidates } from '../../utils/searchUtils';
import { useAuth } from "../../../../../Context/AuthContext";
import { AiOutlinePrinter, AiOutlineDownload } from 'react-icons/ai';
import { generatePDFfromHTML, generatePrintHTML, cleanContentForPrint, processProfileImage } from '../utils/printPdfUtils.jsx';
import '../styles/candidates.css';
import '../styles/search.css';

const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const FULL_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/fullapi';
const IMAGE_API_URL = "https://2mubkhrjf5.execute-api.ap-south-1.amazonaws.com/dev/upload-image";

// Profile Type Selection Modal (portal + overlay; mobile-friendly)
const ProfileTypeModal = ({ isOpen, onClose, onConfirm, selectedCount, isDownloading }) => {
  if (!isOpen) return null;
  const stop = (e) => e.stopPropagation();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(1.5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        onClick={stop}
        style={{
          width: '92vw',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff' }}>
          <h5 style={{ margin: 0, fontSize: 16 }}>Choose Profile Type</h5>
          <button type="button" onClick={onClose} disabled={isDownloading} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '16px' }}>
          <p style={{ marginBottom: '12px', fontSize: 14 }}>Select which profile layout to use for {selectedCount} selected candidate(s).</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <button disabled={isDownloading} className="btn btn-primary" onClick={() => onConfirm('short')}>
              Short Profile
            </button>
            <button disabled={isDownloading} className="btn btn-outline-primary" onClick={() => onConfirm('full')}>
              Complete Profile
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FavouriteCandidates = () => {
  const { user, loading } = useAuth();

  const [favCandidates, setFavCandidates] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [checkedProfiles, setCheckedProfiles] = useState(null);
  const [lastSelectedCandidateId, setLastSelectedCandidateId] = useState(null);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [savedCandidateUids, setSavedCandidateUids] = useState([]);
  const [favCandidateUids, setFavCandidateUids] = useState([]);
  const [downloadedCandidateUids, setDownloadedCandidateUids] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const recordsPerPageOptions = [5, 10, 20, 30, 50];

  // Selection state (bulk select / actions)
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showProfileTypeModal, setShowProfileTypeModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'print' | 'download'

  useEffect(() => {
    const saved = localStorage.getItem('candidatesPerPage');
    if (saved) setCandidatesPerPage(parseInt(saved));
  }, []);

  const handleRecordsPerPageChange = (e) => {
    const num = parseInt(e.target.value);
    setCandidatesPerPage(num);
    setCurrentPage(1);
    localStorage.setItem('candidatesPerPage', num.toString());
  };

  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filtered.slice(indexOfFirstCandidate, indexOfLastCandidate);

  const totalPages = Math.ceil(filtered.length / candidatesPerPage);
  
  // Smart pagination: show limited page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const delta = 2; // Pages to show around current page
    const rangeWithDots = [];

    // Always show first page
    rangeWithDots.push(1);

    // Calculate the range around current page
    const startPage = Math.max(2, currentPage - delta);
    const endPage = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after 1 if needed
    if (startPage > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page (excluding 1 and last page)
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots before last page if needed
    if (endPage < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Helper to fetch fresh image URL
  const getFreshImageUrl = async (firebase_uid) => {
    try {
      const params = { firebase_uid, action: 'view' };
      const { data } = await axios.get(IMAGE_API_URL, { params });
      return data?.url || null;
    } catch {
      return null;
    }
  };

  // ---- MAIN DATA FETCH ----
  useEffect(() => {
    if (!user) return;

    const currentUserUid = user.firebase_uid || user.uid || user.id;
    if (!currentUserUid) {
      setDataLoading(false);
      setFavCandidates([]);
      setFiltered([]);
      setHasNoResults(true);
      return;
    }

    setDataLoading(true);
    const fetchData = async () => {
      try {
        // 1. Get all UserFeature rows for this user
        const { data: favRows } = await axios.get(FAV_API);
        const favs = Array.isArray(favRows) ? favRows : [];

        // ---- Extract all your "favourite" candidate uids (added_by = current user) ----
        const favUids = favs
          .filter(f =>
            (f.favroute_candidate === 1 || f.favroute_candidate === true) &&
            (f.added_by === currentUserUid)
          )
          .map(f => f.firebase_uid);

        setFavCandidateUids(favUids);

        // Also extract saved & downloaded for button color
        const savedUids = favs
          .filter(f =>
            (f.saved_candidate === 1 || f.saved_candidate === true) &&
            (f.added_by === currentUserUid)
          )
          .map(f => f.firebase_uid);
        setSavedCandidateUids(savedUids);

        const downloadedUids = favs
          .filter(f =>
            (f.dowloaded_candidate === 1 || f.dowloaded_candidate === true) &&
            (f.added_by === currentUserUid)
          )
          .map(f => f.firebase_uid);
        setDownloadedCandidateUids(downloadedUids);

        // 2. Fetch all full candidate profiles
        const { data: profiles } = await axios.get(FULL_API);
        setAllProfiles(profiles);

        // Show only favourites in the main list
        const onlyFavs = profiles.filter(p => favUids.includes(p.firebase_uid));
        // Decode the candidates data
        // const decodedFavs = decodeCandidatesData(onlyFavs);
        // setFavCandidates(decodedFavs);
        // setFiltered(decodedFavs);
        // setHasNoResults(onlyFavs.length === 0);
      } catch (error) {
        toast.error('Error loading favourite candidates');
        setFavCandidates([]);
        setFiltered([]);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // ---- CORRECT POST/PUT LOGIC (always for (firebase_uid, added_by)) ----
  const postOrPutUserFeature = async (candidateId, updatePayload) => {
    if (!user) return;
    const added_by = user.firebase_uid || user.uid || user.id;
    try {
      // 1. Check for existing row (firebase_uid, added_by)
      const { data: allFeatures } = await axios.get(FAV_API);
      const exists = Array.isArray(allFeatures)
        ? allFeatures.find(row => row.firebase_uid === candidateId && row.added_by === added_by)
        : null;

      if (exists) {
        // Always update your own row (favourite/save/download/unmark)
        await axios.put(FAV_API, { ...updatePayload, firebase_uid: candidateId, added_by });
      } else if (Object.values(updatePayload).some(val => val === 1)) {
        // Only create if not found and "marking" (never for unmark)
        await axios.post(FAV_API, { ...updatePayload, firebase_uid: candidateId, added_by });
      }
      // Refresh for UI state
      const { data: afterUpdate } = await axios.get(FAV_API);
      const currentUserUid = added_by;
      setFavCandidateUids(
        afterUpdate.filter(f =>
          (f.favroute_candidate === 1 || f.favroute_candidate === true) && (f.added_by === currentUserUid)
        ).map(f => f.firebase_uid)
      );
      setSavedCandidateUids(
        afterUpdate.filter(f =>
          (f.saved_candidate === 1 || f.saved_candidate === true) && (f.added_by === currentUserUid)
        ).map(f => f.firebase_uid)
      );
      setDownloadedCandidateUids(
        afterUpdate.filter(f =>
          (f.dowloaded_candidate === 1 || f.dowloaded_candidate === true) && (f.added_by === currentUserUid)
        ).map(f => f.firebase_uid)
      );
      // For main list: re-fetch and filter after update
      if (updatePayload.favroute_candidate !== undefined) {
        // If favourite mark/unmark, re-filter for visible list
        const onlyFavs = allProfiles.filter(p =>
          afterUpdate.some(f =>
            f.firebase_uid === p.firebase_uid &&
            f.added_by === currentUserUid &&
            (f.favroute_candidate === 1 || f.favroute_candidate === true)
          )
        );
        // Decode the candidates data
        // const decodedFavs = decodeCandidatesData(onlyFavs);
        // setFavCandidates(decodedFavs);
        // setFiltered(decodedFavs);
        // setHasNoResults(onlyFavs.length === 0);
      }
    } catch (err) {
      toast.error('Error updating candidate status');
    }
  };

  // ---- Save/Unsave Candidate ----
  const handleSaveCandidate = async (candidate) => {
    const isCurrentlySaved = savedCandidateUids.includes(candidate.firebase_uid);
    await postOrPutUserFeature(candidate.firebase_uid, { saved_candidate: isCurrentlySaved ? 0 : 1 });
    toast[isCurrentlySaved ? 'info' : 'success'](
      `${candidate.fullName || 'Candidate'} ${isCurrentlySaved ? 'removed from saved list!' : 'has been saved successfully!'}`
    );
  };

  // ---- Download/Undownload (here always mark as downloaded for now) ----
  const handleDownloadCandidate = async (candidate) => {
    await postOrPutUserFeature(candidate.firebase_uid, { dowloaded_candidate: 1 });
    // Download JSON as in your previous logic
    try {
      const downloadData = {
        personalInfo: {
          name: candidate.fullName || 'N/A',
          email: candidate.email || 'N/A',
          phone: candidate.phone || 'N/A',
          gender: candidate.gender || 'N/A',
          dateOfBirth: candidate.date_of_birth || 'N/A'
        },
        location: {
          permanentAddress: {
            country: candidate.permanent_country_name || 'N/A',
            state: candidate.permanent_state_name || 'N/A',
            city: candidate.permanent_city_name || 'N/A'
          },
          presentAddress: {
            country: candidate.present_country_name || 'N/A',
            state: candidate.present_state_name || 'N/A',
            city: candidate.present_city_name || 'N/A'
          }
        },
        professional: {
          designation: candidate.designation || 'N/A',
          experience: candidate.full_time_offline || 'N/A',
          teachingExperience: candidate.teaching_experience || 'N/A',
          expectedSalary: candidate.expected_salary || 'N/A',
          jobType: candidate.Job_Type || 'N/A',
          noticePeriod: candidate.notice_period || 'N/A',
          jobSearchStatus: candidate.job_search_status || 'N/A'
        },
        education: candidate.education_details_json || 'N/A',
        languages: candidate.languages || 'N/A',
        downloadedAt: new Date().toISOString()
      };
      const dataStr = JSON.stringify(downloadData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `candidate_${candidate.fullName?.replace(/\s+/g, '_') || 'unknown'}_${candidate.firebase_uid}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${candidate.fullName || 'Candidate'} profile downloaded successfully!`);
    } catch {
      toast.error('Failed to download candidate profile. Please try again.');
    }
  };

  // ---- Mark/unmark Favourite ----
  const handleToggleFavourite = async (candidateId, candidate, isFavourite) => {
    await postOrPutUserFeature(candidate.firebase_uid, { favroute_candidate: isFavourite ? 1 : 0 });
    toast[isFavourite ? 'success' : 'info'](
      `${candidate.fullName || 'Candidate'} ${isFavourite ? 'added to favourites!' : 'removed from favourites!'}`
    );
  };

  // ===== Bulk selection logic =====
  const handleCheckedIdsChange = (ids) => {
    const newSet = new Set(ids);
    setSelectedCandidates(newSet);
    const pageIds = new Set(currentCandidates.map(c => c.firebase_uid));
    const selectedFromPage = Array.from(newSet).filter(id => pageIds.has(id));
    setSelectAll(selectedFromPage.length === pageIds.size && pageIds.size > 0);
  };

  const handleSelectAll = () => {
    const newSelect = !selectAll;
    setSelectAll(newSelect);
    const next = new Set(selectedCandidates);
    const pageIds = currentCandidates.map(c => c.firebase_uid);
    if (newSelect) {
      pageIds.forEach(id => next.add(id));
    } else {
      pageIds.forEach(id => next.delete(id));
    }
    setSelectedCandidates(next);
  };

  useEffect(() => {
    const pageIds = new Set(currentCandidates.map(c => c.firebase_uid));
    const selectedFromPage = Array.from(selectedCandidates).filter(id => pageIds.has(id));
    setSelectAll(selectedFromPage.length === pageIds.size && pageIds.size > 0);
  }, [currentCandidates, selectedCandidates]);

  const handleClearSelection = () => {
    setSelectedCandidates(new Set());
    setSelectAll(false);
  };

  // ===== Offscreen render to HTML for print/download =====
  const renderSelectedProfilesHTML = async (candidates, profileType) => {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    host.style.top = '0';
    host.style.width = '1px';
    host.style.height = '1px';
    document.body.appendChild(host);

    const waitForCv = (container) => new Promise((resolve, reject) => {
      const start = Date.now();
      const poll = () => {
        const el = container.querySelector('.cv-container');
        if (el) return resolve(el);
        if (Date.now() - start > 10000) return reject(new Error('Timeout waiting for CV content'));
        setTimeout(poll, 120);
      };
      poll();
    });

    const blocks = [];
    for (const c of candidates) {
      const wrapper = document.createElement('div');
      host.appendChild(wrapper);
      const root = createRoot(wrapper);
      const Comp = profileType === 'short' ? ViewShort : CandidateDetail;
      try {
        root.render(<Comp candidate={{ firebase_uid: c.firebase_uid }} onBack={() => {}} />);
        const cvNode = await waitForCv(wrapper);
        const cloned = cvNode.cloneNode(true);
        cleanContentForPrint(cloned, false);
        const images = cloned.querySelectorAll('.cv-profile-photo img, .profile-photo img');
        for (const img of images) {
          try {
            await processProfileImage(img, await getFreshImageUrl(c.firebase_uid));
          } catch {}
        }
        blocks.push(cloned.outerHTML);
      } catch (e) {
        blocks.push(`<div class=\"cv-container\"><h1>${c.fullName || 'Candidate'}</h1></div>`);
      } finally {
        try { root.unmount(); } catch {}
      }
    }

    if (host.parentNode) host.parentNode.removeChild(host);
    return blocks.join('');
  };

  const handleProfileTypeConfirm = async (profileType) => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate');
      return;
    }
    const selectedData = filtered.filter(c => selectedCandidates.has(c.firebase_uid));
    if (pendingAction === 'download') {
      const html = await renderSelectedProfilesHTML(selectedData, profileType);
      const res = await generatePDFfromHTML({
        htmlContent: html,
        title: `Selected Candidates - ${profileType === 'short' ? 'Short' : 'Complete'} Profiles`,
        setIsDownloading,
        isUnlocked: false
      });
      if (res?.success) toast.success(`Downloaded ${selectedData.length} ${profileType} profile(s)`);
      else toast.error('Failed to generate PDF');
    } else if (pendingAction === 'print') {
      const html = await renderSelectedProfilesHTML(selectedData, profileType);
      const printWindow = window.open('', '_blank');
      const doc = generatePrintHTML(html, 'Selected Candidates', false);
      printWindow.document.write(doc);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      };
    }
    setShowProfileTypeModal(false);
    setPendingAction(null);
    setIsDownloading(false);
  };

  const handlePrintSelected = () => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to print');
      return;
    }
    setPendingAction('print');
    setShowProfileTypeModal(true);
  };

  const handleDownloadSelected = () => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to download');
      return;
    }
    setPendingAction('download');
    setShowProfileTypeModal(true);
  };

  // ---- Candidate select/view logic (no change) ----
  const handleCandidateSelect = (selection, type) => {
    // Clear any existing highlights when selecting a new candidate
    document.querySelectorAll('.highlighted-candidate').forEach(el => {
      el.classList.remove('highlighted-candidate');
    });

    if (selection.checkedIds) {
      const checked = filtered.filter(c => selection.checkedIds.includes(c.firebase_uid));
      setCheckedProfiles({
        candidates: checked,
        currentIndex: 0
      });
      setSelected(checked[0]);
      setViewType(type);
    } else {
      setCheckedProfiles(null);
      setSelected(selection);
      setViewType(type);
    }
  };

  const handlePrevious = () => {
    if (checkedProfiles && checkedProfiles.currentIndex > 0) {
      const prevIndex = checkedProfiles.currentIndex - 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: prevIndex
      });
      setSelected(checkedProfiles.candidates[prevIndex]);
    }
  };

  const handleNext = () => {
    if (checkedProfiles && checkedProfiles.currentIndex < checkedProfiles.candidates.length - 1) {
      const nextIndex = checkedProfiles.currentIndex + 1;
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: nextIndex
      });
      setSelected(checkedProfiles.candidates[nextIndex]);
    }
  };

  // Function to scroll to a specific candidate
  const scrollToCandidate = (candidateId) => {
    if (!candidateId) return;
    
    // Use setTimeout to ensure the DOM has updated after state change
    setTimeout(() => {
      const candidateElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
      if (candidateElement) {
        candidateElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Remove any existing highlights first
        document.querySelectorAll('.highlighted-candidate').forEach(el => {
          el.classList.remove('highlighted-candidate');
        });
        
        // Add highlight effect - this will persist until new selection
        candidateElement.classList.add('highlighted-candidate');
      }
    }, 100);
  };

  const handleBack = () => {
    // Store the selected candidate ID before clearing selection
    if (selected) {
      setLastSelectedCandidateId(selected.firebase_uid);
    }
    
    setSelected(null);
    setViewType(null);
    setCheckedProfiles(null);
    
    // Scroll to the previously selected candidate
    if (selected) {
      scrollToCandidate(selected.firebase_uid);
    }
  };

  // ---- Search ----
  const handleSearch = useCallback((searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      setIsSearching(false);
      setFiltered(favCandidates);
      return;
    }
    setIsSearching(true);
    const results = searchCandidates(favCandidates, searchTerm);
    setSearchResults(results);
    setFiltered(results);
    setCurrentPage(1);
  }, [favCandidates]);

  // ===== RENDER LOGIC =====
  if (loading || dataLoading) {
    return <div className="loading-ring">Loading...</div>;
  }
  if (!user) {
    return (
      <div className="no-results-message alert alert-danger">
        Please log in to view favourite candidates.
      </div>
    );
  }

  return (
    <div className="favourite-candidates-container">
      <div className="widget-title d-flex justify-content-between align-items-center">
        <div className="title-area">
          <h4>Favourite Candidates <span className="badge bg-primary">{filtered.length}</span></h4>
        </div>
        <div className="chosen-outer d-flex align-items-center">
          {selectedCandidates.size > 0 && (
            <>
              <button className="btn btn-sm btn-outline-primary me-2" onClick={handlePrintSelected} title="Print Selected Candidates">
                <AiOutlinePrinter /> Print Profiles ({selectedCandidates.size})
              </button>
              <button className="btn btn-sm btn-outline-success me-3" onClick={handleDownloadSelected} title="Download Selected Candidates as PDF">
                <AiOutlineDownload /> Download PDF ({selectedCandidates.size})
              </button>
              <button className="btn btn-sm btn-outline-secondary me-3" onClick={handleClearSelection} title="Clear Selection">
                Clear Selection
              </button>
            </>
          )}
          <SearchBar onSearch={handleSearch} />
          <div className="records-per-page me-3">
            <select
              className="form-select records-dropdown"
              value={candidatesPerPage}
              onChange={handleRecordsPerPageChange}
              aria-label="Records per page"
            >
              {recordsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="widget-content">
        {selected ? (
          viewType === 'full' ? (
            <CandidateDetail
              candidate={selected}
              onBack={handleBack}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstProfile={!checkedProfiles || checkedProfiles.currentIndex === 0}
              isLastProfile={!checkedProfiles || checkedProfiles.currentIndex === checkedProfiles.candidates.length - 1}
              checkedProfiles={checkedProfiles}
            />
          ) : (
            <ViewShort
              candidate={selected}
              onBack={handleBack}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstProfile={!checkedProfiles || checkedProfiles.currentIndex === 0}
              isLastProfile={!checkedProfiles || checkedProfiles.currentIndex === checkedProfiles.candidates.length - 1}
              checkedProfiles={checkedProfiles}
            />
          )
        ) : hasNoResults ? (
          <div className="no-results-message alert alert-info">
            No favourite candidates found.
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="select-all-container mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="selectAllCandidates"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <label className="form-check-label" htmlFor="selectAllCandidates">
                  <strong>Select All Candidates on This Page</strong>
                  {selectedCandidates.size > 0 && (
                    <span className="text-muted ms-2">({selectedCandidates.size} total selected)</span>
                  )}
                </label>
              </div>
            </div>
            <CandidateShort
              candidates={currentCandidates}
              onSelect={handleCandidateSelect}
              showCheckboxes
              onSave={handleSaveCandidate}
              onDownload={handleDownloadCandidate}
              onToggleFavourite={handleToggleFavourite}
              savedCandidateUids={savedCandidateUids}
              favCandidateUids={favCandidateUids}
              downloadedCandidateUids={downloadedCandidateUids}
              onCheckedIdsChange={handleCheckedIdsChange}
              externalCheckedIds={Array.from(selectedCandidates)}
            />
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-box">
                <nav>
                  <ul className="pagination">
                    <li className={`page-item prev-button ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {pageNumbers.map((number, index) => {
                      if (number === '...') {
                        return (
                          <li key={`dots-${index}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      return (
                        <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => paginate(number)}
                          >
                            {number}
                          </button>
                        </li>
                      );
                    })}
                    
                    <li className={`page-item next-button ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
                <div className="pagination-info">
                  Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filtered.length)} of {filtered.length} results
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ProfileTypeModal
        isOpen={showProfileTypeModal}
        onClose={() => setShowProfileTypeModal(false)}
        onConfirm={handleProfileTypeConfirm}
        selectedCount={selectedCandidates.size}
        isDownloading={isDownloading}
      />
      
      {/* Enhanced highlight styles for recently viewed candidate */}
      <style>{`
        .candidate-item.compact.highlighted-candidate {
          border: 3px solid #2196f3 !important;
          background-color: #e3f2fd !important;
          background: #e3f2fd !important;
          border-radius: 8px !important;
          transform: scale(1.02) !important;
          transition: all 0.3s ease-in-out !important;
          position: relative !important;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3) !important;
        }
        
        .highlighted-candidate::before {
          content: "Recently Viewed";
          position: absolute;
          top: -8px;
          right: -8px;
          background: #2196f3;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Smooth transition for all candidate cards */
        [data-candidate-id] {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FavouriteCandidates;
