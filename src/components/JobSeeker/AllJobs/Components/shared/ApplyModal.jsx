import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Shared ApplyModal component used across all job sections
 * Handles job application confirmation with coin deduction
 */
function ApplyModal({ isOpen, onClose, onApply, coinValue, loading, applyStatus, error }) {
  useEffect(() => {
    let timer;
    if (isOpen && (applyStatus === "success" || applyStatus === "already")) {
      timer = setTimeout(() => onClose(), 2000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, applyStatus, onClose]);

  if (!isOpen) return null;

        const modalContent = (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-5" onClick={onClose}>
            <div className="bg-[#F0D8D9] rounded-2xl border p-7 w-80 max-w-[90vw] shadow-lg flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
              <button className="absolute top-2.5 right-4 bg-none border-none text-2xl text-gray-500 cursor-pointer p-0.5 z-10 transition-colors hover:text-red-500" onClick={onClose}>
                &times;
              </button>
        
              {applyStatus === "success" ? (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <span role="img" aria-label="coin" className="text-2xl">🪙</span>
                    <span className="text-yellow-500 font-bold text-xl ml-1.5">-100</span>
                  </div>
                  <div className="text-green-600 font-bold text-lg mb-2">Applied! <span role="img" aria-label="applied">✅</span></div>
                  <div className="text-gray-500 text-sm">Successfully applied for the job.</div>
                </>
              ) : applyStatus === "already" ? (
                <>
                  <div className="flex items-center justify-center mb-4 opacity-85 grayscale">
                    <span role="img" aria-label="coin" className="text-2xl">🪙</span>
                    <span className="text-green-600 font-bold text-xl ml-1.5">✓</span>
                  </div>
                  <div className="text-green-600 font-bold text-lg mb-2">Already Applied</div>
                  <div className="text-gray-500 text-sm">You already applied for this job.</div>
                </>
              ) : applyStatus === "error" ? (
                <>
                  <div className="flex items-center justify-center mb-4 opacity-85 grayscale">
                    <span role="img" aria-label="coin" className="text-2xl">🪙</span>
                    <span className="text-red-600 font-bold text-xl ml-1.5">×</span>
                  </div>
                  <div className="text-red-600 font-bold text-lg">{error || "Could not apply for this job."}</div>
                </>
              ) : (
                <>
                  <div className="mb-4 mt-0.5">
                    <span className="font-semibold text-lg">Apply for this job?</span>
                  </div>
                  <div className="text-gray-500 text-sm mb-4">
                    Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
                  </div>
                  <div className="text-gray-800 text-sm mb-2.5">
                    <span>Use <b>100 Coins</b> to apply for this job.</span>
                  </div>
                  
                  <button
                    className="w-full bg-gradient-brand text-white rounded-lg px-4 py-2 font-medium hover:bg-gradient-primary-hover transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-1.5 text-base"
                    disabled={loading}
                    onClick={onApply}
                  >
                    {loading ? "Applying..." : <>Apply <span className="ml-1"><span role="img" aria-label="coin">🪙</span></span> 100</>}
                  </button>
                </>
              )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

export default ApplyModal;
