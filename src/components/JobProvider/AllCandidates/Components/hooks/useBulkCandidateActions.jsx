import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import { AiOutlineEye, AiOutlineFileText, AiOutlinePrinter, AiOutlineClose } from 'react-icons/ai';
import CandidateDetail from '../shared/ViewFull';
import ViewShort from '../shared/ViewShort';
import { getPrintPageStyle } from '../utils/printStyles';

/**
 * Custom hook for managing bulk candidate selection, viewing, and printing
 * 
 * @param {Object} config - Configuration object
 * @param {Array} config.filteredCandidates - Full list of filtered candidates
 * @param {Array} config.currentCandidates - Candidates on current page
 * @param {Function} config.getCandidateId - Function to extract unique ID from candidate (e.g., (c) => c.firebase_uid)
 * @param {string} config.documentTitlePrefix - Prefix for print document title (e.g., "Selected Unlocked Candidates")
 * @returns {Object} Object containing state, handlers, and render functions
 */
const useBulkCandidateActions = ({
  filteredCandidates = [],
  currentCandidates = [],
  getCandidateId = (candidate) => candidate.firebase_uid,
  documentTitlePrefix = 'Selected Candidates'
}) => {
  // Selection state
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Bulk view mode state
  const [bulkViewMode, setBulkViewMode] = useState(null); // null | 'complete' | 'short'
  const [checkedProfiles, setCheckedProfiles] = useState(null); // { candidates: [], currentIndex: 0 }
  
  // Print/Download state
  const [showProfileTypeModal, setShowProfileTypeModal] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [selectedProfileType, setSelectedProfileType] = useState(null); // 'short' | 'full' | null
  const printWrapperRef = useRef(null);

  // Get selected candidates for print (used in multiple places)
  const selectedCandidatesForPrint = filteredCandidates.filter(c => 
    selectedCandidates.has(getCandidateId(c))
  );

  // ===== Checkbox selection logic =====
  const handleCheckboxChange = useCallback((candidateId) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
    
    // Update selectAll state based on current page
    const pageIds = new Set(currentCandidates.map(c => getCandidateId(c)));
    const selectedFromPage = Array.from(newSelected).filter(id => pageIds.has(id));
    setSelectAll(selectedFromPage.length === pageIds.size && pageIds.size > 0);
  }, [selectedCandidates, currentCandidates, getCandidateId]);

  const handleSelectAll = useCallback(() => {
    const newSelect = !selectAll;
    setSelectAll(newSelect);
    const next = new Set(selectedCandidates);
    const pageIds = currentCandidates.map(c => getCandidateId(c));
    
    if (newSelect) {
      pageIds.forEach(id => next.add(id));
    } else {
      pageIds.forEach(id => next.delete(id));
    }
    
    setSelectedCandidates(next);
  }, [selectAll, selectedCandidates, currentCandidates, getCandidateId]);

  // Keep selectAll in sync when page or selection changes
  useEffect(() => {
    const pageIds = new Set(currentCandidates.map(c => getCandidateId(c)));
    const selectedFromPage = Array.from(selectedCandidates).filter(id => pageIds.has(id));
    setSelectAll(selectedFromPage.length === pageIds.size && pageIds.size > 0);
  }, [currentCandidates, selectedCandidates, getCandidateId]);

  const handleClearSelection = useCallback(() => {
    setSelectedCandidates(new Set());
    setSelectAll(false);
    setBulkViewMode(null);
    setCheckedProfiles(null);
  }, []);

  // ===== View Mode Handlers =====
  const handleViewCompleteProfiles = useCallback(() => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to view');
      return;
    }
    const selectedData = filteredCandidates.filter(c => 
      selectedCandidates.has(getCandidateId(c))
    );
    setCheckedProfiles({
      candidates: selectedData,
      currentIndex: 0
    });
    setBulkViewMode('complete');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCandidates, filteredCandidates, getCandidateId]);

  const handleViewShortProfiles = useCallback(() => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to view');
      return;
    }
    const selectedData = filteredCandidates.filter(c => 
      selectedCandidates.has(getCandidateId(c))
    );
    setCheckedProfiles({
      candidates: selectedData,
      currentIndex: 0
    });
    setBulkViewMode('short');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCandidates, filteredCandidates, getCandidateId]);

  const handleViewPrevious = useCallback(() => {
    if (checkedProfiles && checkedProfiles.currentIndex > 0) {
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: checkedProfiles.currentIndex - 1
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [checkedProfiles]);

  const handleViewNext = useCallback(() => {
    if (checkedProfiles && checkedProfiles.currentIndex < checkedProfiles.candidates.length - 1) {
      setCheckedProfiles({
        ...checkedProfiles,
        currentIndex: checkedProfiles.currentIndex + 1
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [checkedProfiles]);

  const handleBackFromView = useCallback(() => {
    setBulkViewMode(null);
    setCheckedProfiles(null);
  }, []);

  // Scroll to top when navigating between profiles
  useEffect(() => {
    if (bulkViewMode && checkedProfiles) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [bulkViewMode, checkedProfiles?.currentIndex]);

  // ===== Print/Download Handlers =====
  const handlePrintDownload = useCallback(() => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate to print/download');
      return;
    }
    setShowProfileTypeModal(true);
  }, [selectedCandidates.size]);

  // React-to-print hook for printing/downloading multiple profiles
  const handlePrintMultiple = useReactToPrint({
    contentRef: printWrapperRef,
    documentTitle: `${documentTitlePrefix} - ${selectedProfileType === 'short' ? 'Short' : 'Complete'} Profiles`,
    pageStyle: getPrintPageStyle(),
    onPrintError: (error) => {
      console.error('Print error:', error);
      toast.error('Failed to print. Please try again.');
      setIsPreparingPrint(false);
      setSelectedProfileType(null);
    },
    onBeforeGetContent: () => {
      if (!printWrapperRef.current) {
        return Promise.reject(new Error('Print wrapper not found'));
      }
      
      const wrapper = printWrapperRef.current;
      
      // Ensure wrapper is visible and in viewport
      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.width = '794px';
      wrapper.style.zIndex = '999999';
      wrapper.style.visibility = 'visible';
      wrapper.style.opacity = '1';
      wrapper.style.backgroundColor = 'white';
      wrapper.style.display = 'block';
      
      // Force a reflow to ensure browser renders the content
      void wrapper.offsetHeight;
      
      // Wait for browser to fully render and ensure all images are loaded
      return new Promise((resolve) => {
        // Use requestAnimationFrame to ensure content is painted
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Wait for all images to load
            const images = wrapper.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise((imgResolve) => {
                img.onload = imgResolve;
                img.onerror = imgResolve; // Resolve even on error to not block
                setTimeout(imgResolve, 2000); // Timeout after 2s
              });
            });
            
            Promise.all(imagePromises).then(() => {
              // Force a final reflow
              void wrapper.offsetHeight;
              
              // One more frame to ensure everything is painted
              requestAnimationFrame(() => {
                resolve();
              });
            });
          });
        });
      });
    },
    onAfterPrint: () => {
      // Restore hidden position
      const wrapper = printWrapperRef.current;
      if (wrapper) {
        wrapper.style.position = wrapper.dataset.originalPosition || 'fixed';
        wrapper.style.left = wrapper.dataset.originalLeft || '-9999px';
        wrapper.style.top = wrapper.dataset.originalTop || '0';
        wrapper.style.zIndex = wrapper.dataset.originalZIndex || '-9999';
      }
      const count = selectedCandidates.size;
      setIsPreparingPrint(false);
      setSelectedProfileType(null);
      toast.success(`Print dialog opened for ${count} profile(s)`);
    }
  });

  const handleProfileTypeConfirm = useCallback(async (profileType) => {
    if (selectedCandidates.size === 0) {
      toast.warning('Please select at least one candidate');
      return;
    }

    setShowProfileTypeModal(false);
    setSelectedProfileType(profileType);
    setIsPreparingPrint(true);

    // Wait for components to render and load data
    // Check multiple times to ensure ALL content is fully loaded
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = ~15 seconds max wait for async data
    
    const checkAndPrint = () => {
      attempts++;
      
      if (!printWrapperRef.current) {
        if (attempts < maxAttempts) {
          setTimeout(checkAndPrint, 500);
          return;
        } else {
          toast.error('Failed to prepare print content. Please try again.');
          setIsPreparingPrint(false);
          setSelectedProfileType(null);
          return;
        }
      }

      // Check if content has actually loaded (not just loading spinners)
      const wrapper = printWrapperRef.current;
      if (!wrapper) return;
      
      // Find all CV containers
      const cvContainers = wrapper.querySelectorAll('.cv-container');
      
      // Also check for loading indicators/spinners in the DOM
      const loadingElements = wrapper.querySelectorAll('[class*="spinner"], [class*="loading"], .animate-spin');
      const hasLoadingElements = loadingElements.length > 0;
      
      // Check each container's content - ensure it's FULLY loaded
      let allContainersReady = true;
      let allContainersFullyLoaded = true;
      const containerStatuses = [];
      
      cvContainers.forEach((container, idx) => {
        const text = container.textContent || '';
        const textLength = text.trim().length;
        const html = container.innerHTML || '';
        
        // Check for loading indicators in this specific container
        const hasLoadingText = text.includes('Loading') || 
                              text.includes('Loading...') ||
                              text.includes('Loading candidates');
        const hasLoadingInHTML = html.includes('spinner') || 
                                html.includes('animate-spin') ||
                                html.includes('Loading');
        
        // Basic check: has content and not loading
        const hasSubstantialContent = textLength > 100;
        const notLoading = !hasLoadingText && !hasLoadingInHTML;
        const isReady = hasSubstantialContent && notLoading;
        
        // Full check: has substantial content with key sections
        const hasKeySections = text.includes('Education') || 
                              text.includes('Experience') || 
                              text.includes('Skills') ||
                              text.includes('Contact') ||
                              text.includes('Job Preference') ||
                              text.includes('Additional Information') ||
                              textLength > 1500; // Long content likely complete
        
        const isFullyLoaded = textLength > 500 && hasKeySections && notLoading;
        
        const status = {
          idx: idx + 1,
          ready: isReady,
          fullyLoaded: isFullyLoaded,
          length: textLength,
          hasKeySections,
          hasLoading: hasLoadingText || hasLoadingInHTML
        };
        containerStatuses.push(status);
        
        if (!isReady) allContainersReady = false;
        if (!isFullyLoaded) allContainersFullyLoaded = false;
      });
      
      // Check if any container is still loading
      const anyStillLoading = containerStatuses.some(s => s.hasLoading) || hasLoadingElements;
      
      // Only consider content ready if ALL containers are FULLY loaded AND no loading indicators
      const hasContent = cvContainers.length > 0 && 
                        allContainersFullyLoaded && 
                        !anyStillLoading &&
                        cvContainers.length === selectedCandidatesForPrint.length;
      
      // If any container is still loading or not fully loaded, wait more
      if (anyStillLoading || !allContainersFullyLoaded) {
        if (attempts < maxAttempts - 2) {
          setTimeout(checkAndPrint, 500);
          return;
        }
      }

      if (hasContent || attempts >= maxAttempts) {
        
        // Make wrapper visible BEFORE calling print
        const wrapper = printWrapperRef.current;
        if (wrapper) {
          wrapper.style.position = 'fixed';
          wrapper.style.left = '0';
          wrapper.style.top = '0';
          wrapper.style.width = '794px';
          wrapper.style.zIndex = '999999';
          wrapper.style.visibility = 'visible';
          wrapper.style.opacity = '1';
          wrapper.style.backgroundColor = 'white';
        }
        
        // Wait for browser to render using requestAnimationFrame for better rendering
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (printWrapperRef.current) {
              // Additional delay to ensure all async content is rendered
              setTimeout(() => {
                try {
                  handlePrintMultiple();
                } catch (error) {
                  console.error('Error triggering print:', error);
                  toast.error('Failed to trigger print. Please try again.');
                  setIsPreparingPrint(false);
                  setSelectedProfileType(null);
                  if (wrapper) {
                    wrapper.style.left = '-9999px';
                    wrapper.style.zIndex = '-9999';
                  }
                }
              }, 300);
            } else {
              toast.error('Failed to prepare print content. Please try again.');
              setIsPreparingPrint(false);
              setSelectedProfileType(null);
            }
          });
        });
      } else {
        setTimeout(checkAndPrint, 500);
      }
    };

    // Start checking after initial render delay
    setTimeout(checkAndPrint, 1000);
  }, [selectedCandidates.size, selectedCandidatesForPrint.length, handlePrintMultiple]);

  // Render bulk view mode
  const renderBulkView = () => {
    if (!bulkViewMode || !checkedProfiles || checkedProfiles.candidates.length === 0) {
      return null;
    }

    const currentCandidate = checkedProfiles.candidates[checkedProfiles.currentIndex];
    const isFirst = checkedProfiles.currentIndex === 0;
    const isLast = checkedProfiles.currentIndex === checkedProfiles.candidates.length - 1;
    
    if (bulkViewMode === 'complete') {
      return (
        <CandidateDetail
          candidate={currentCandidate}
          onBack={handleBackFromView}
          checkedProfiles={checkedProfiles}
          onNext={handleViewNext}
          onPrevious={handleViewPrevious}
          isFirstProfile={isFirst}
          isLastProfile={isLast}
        />
      );
    } else if (bulkViewMode === 'short') {
      return (
        <ViewShort
          candidate={currentCandidate}
          onBack={handleBackFromView}
          checkedProfiles={checkedProfiles}
          onNext={handleViewNext}
          onPrevious={handleViewPrevious}
          isFirstProfile={isFirst}
          isLastProfile={isLast}
        />
      );
    }
    
    return null;
  };

  // Render action buttons
  const renderActionButtons = () => {
    if (selectedCandidates.size === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:flex md:items-center gap-2 shrink-0 w-full sm:w-auto">
        <button
          onClick={handleViewCompleteProfiles}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-brand text-white rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm whitespace-nowrap"
          title="View Selected Complete Profiles"
        >
          <AiOutlineEye className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">View Complete</span>
          <span className="lg:hidden">Complete</span>
          <span className="shrink-0">({selectedCandidates.size})</span>
        </button>
        <button
          onClick={handleViewShortProfiles}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-brand text-white rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm whitespace-nowrap"
          title="View Selected Short Profiles"
        >
          <AiOutlineFileText className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">View Short</span>
          <span className="lg:hidden">Short</span>
          <span className="shrink-0">({selectedCandidates.size})</span>
        </button>
        <button
          onClick={handlePrintDownload}
          disabled={isPreparingPrint}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm whitespace-nowrap"
          title="Print/Download Selected Profiles"
        >
          {isPreparingPrint ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></div>
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <AiOutlinePrinter className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Print/Download</span>
              <span className="lg:hidden">Print</span>
              <span className="shrink-0">({selectedCandidates.size})</span>
            </>
          )}
        </button>
        <button
          onClick={handleClearSelection}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-xs sm:text-sm border border-gray-200 whitespace-nowrap"
          title="Clear all selected candidates"
        >
          <AiOutlineClose className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">Clear Selection</span>
          <span className="lg:hidden">Clear</span>
        </button>
      </div>
    );
  };

  // Render print wrapper
  const renderPrintWrapper = () => {
    if (!selectedProfileType || selectedCandidatesForPrint.length === 0) {
      return null;
    }

    return (
      <div 
        ref={printWrapperRef} 
        className="print-wrapper-hidden"
        style={{ 
          position: isPreparingPrint ? 'fixed' : 'fixed',
          left: isPreparingPrint ? '0' : '-9999px',
          top: '0',
          width: '794px', // A4 width in pixels
          visibility: 'visible',
          opacity: 1,
          zIndex: isPreparingPrint ? 999999 : -9999,
          pointerEvents: 'none',
          overflow: 'visible',
          backgroundColor: 'white',
          display: 'block'
        }}
      >
        {selectedCandidatesForPrint.map((candidate, index) => (
          <div 
            key={getCandidateId(candidate)} 
            className="candidate-profile-page"
            style={{
              pageBreakAfter: index < selectedCandidatesForPrint.length - 1 ? 'always' : 'auto',
              pageBreakBefore: index > 0 ? 'always' : 'auto'
            }}
          >
            {selectedProfileType === 'short' ? (
              <ViewShort candidate={candidate} onBack={() => {}} hideDownloadPrint={true} />
            ) : (
              <CandidateDetail candidate={candidate} onBack={() => {}} hideDownloadPrint={true} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render profile type selection modal
  const renderProfileTypeModal = () => {
    if (!showProfileTypeModal) {
      return null;
    }

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => { setShowProfileTypeModal(false); }}
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-lg shadow-xl max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
            <h5 className="text-lg font-medium m-0">Choose Profile Type</h5>
            <button
              type="button"
              onClick={() => { setShowProfileTypeModal(false); }}
              disabled={isPreparingPrint}
              className="text-2xl leading-none border-none bg-transparent cursor-pointer hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            <p className="mb-3 text-sm">
              Select which profile layout to use for {selectedCandidates.size} selected candidate(s).
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                disabled={isPreparingPrint}
                className="px-4 py-2 bg-gradient-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                onClick={() => handleProfileTypeConfirm('short')}
              >
                Short Profile
              </button>
              <button
                disabled={isPreparingPrint}
                className="px-4 py-2 bg-gradient-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                onClick={() => handleProfileTypeConfirm('full')}
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return {
    // State
    selectedCandidates,
    selectAll,
    bulkViewMode,
    checkedProfiles,
    isPreparingPrint,
    
    // Handlers
    handleCheckboxChange,
    handleSelectAll,
    handleClearSelection,
    handleViewCompleteProfiles,
    handleViewShortProfiles,
    handleViewPrevious,
    handleViewNext,
    handleBackFromView,
    handlePrintDownload,
    
    // Render functions
    renderBulkView,
    renderActionButtons,
    renderPrintWrapper,
    renderProfileTypeModal
  };
};

export default useBulkCandidateActions;

