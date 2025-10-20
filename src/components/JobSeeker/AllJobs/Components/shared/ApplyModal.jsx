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
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="portal-modal-close-btn" onClick={onClose}>
          &times;
        </button>
        
        {applyStatus === "success" ? (
          <>
            <div className="coins-anim">
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#f7b901", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>-100</span>
            </div>
            <div className="unlock-success-text">Applied! <span role="img" aria-label="applied">✅</span></div>
            <div style={{ color: '#888', fontSize: 14 }}>Successfully applied for the job.</div>
          </>
        ) : applyStatus === "already" ? (
          <>
            <div className="coins-anim" style={{ animation: "none", opacity: 0.85, filter: "grayscale(1)" }}>
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#36b037", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>✓</span>
            </div>
            <div className="unlock-success-text">Already Applied</div>
            <div style={{ color: '#888', fontSize: 14 }}>You already applied for this job.</div>
          </>
        ) : applyStatus === "error" ? (
          <>
            <div className="coins-anim" style={{ animation: "none", opacity: 0.85, filter: "grayscale(1)" }}>
              <span role="img" aria-label="coin">🪙</span>
              <span style={{ color: "#d72660", fontWeight: "bold", fontSize: "20px", marginLeft: 6 }}>×</span>
            </div>
            <div className="unlock-error-text">{error || "Could not apply for this job."}</div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 15, marginTop: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 17 }}>Apply for this job?</span>
            </div>
            <div style={{ color: "#888", fontSize: 15, marginBottom: 15 }}>
              Available Coins: <b>{coinValue === null ? "..." : coinValue}</b>
            </div>
            <div style={{ color: "#333", fontSize: "15px", marginBottom: 10 }}>
              <span>Use <b>100 Coins</b> to apply for this job.</span>
            </div>
            
            <button
              className="unlock-btn-top"
              style={{ width: "100%", justifyContent: "center", marginBottom: 6, fontSize: 16 }}
              disabled={loading}
              onClick={onApply}
            >
              {loading ? "Applying..." : <>Apply <span className="coin-icon"><span role="img" aria-label="coin">🪙</span></span> 100</>}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

export default ApplyModal;
