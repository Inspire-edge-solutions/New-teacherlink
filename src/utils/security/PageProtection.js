
/**
 * Page Protection Utility for React
 * Prevents copy, select all, save, and inspect without affecting functionality
 */

/**
 * Initialize page protection
 */
export const initPageProtection = () => {
    // Block View Source (Ctrl+U)
    const blockViewSource = (e) => {
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Ctrl+Shift+U
    const blockViewSourceAlt = (e) => {
      if (e.ctrlKey && e.shiftKey && e.keyCode === 85) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Save Page (Ctrl+S) - but allow in form fields
    const blockSavePage = (e) => {
      if (e.ctrlKey && e.keyCode === 83) {
        const target = e.target;
        // Allow Ctrl+S in form fields (for form auto-save functionality)
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('[contenteditable="true"]')
        ) {
          return; // Allow in form fields
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Save Page Alternative (Ctrl+Shift+S)
    const blockSavePageAlt = (e) => {
      if (e.ctrlKey && e.shiftKey && e.keyCode === 83) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Select All (Ctrl+A) - but allow in input fields
    const blockSelectAll = (e) => {
      if (e.ctrlKey && e.keyCode === 65) {
        const target = e.target;
        // Allow Ctrl+A in input fields, textareas, and contenteditable elements
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('[contenteditable="true"]')
        ) {
          return; // Allow in form fields
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Copy (Ctrl+C) - but allow in input fields
    const blockCopy = (e) => {
      if (e.ctrlKey && e.keyCode === 67) {
        const target = e.target;
        // Allow Ctrl+C in input fields, textareas, and contenteditable elements
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('[contenteditable="true"]')
        ) {
          return; // Allow in form fields
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Print (Ctrl+P)
    const blockPrint = (e) => {
      if (e.ctrlKey && e.keyCode === 80) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block F12 (Developer Tools)
    const blockF12 = (e) => {
      if (e.keyCode === 123) { // F12
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block Ctrl+Shift+I (Developer Tools)
    const blockDevTools = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Inspector)
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
  
    // Block text selection - but allow in input fields
    const blockTextSelection = (e) => {
      const target = e.target;
      // Allow selection in input fields, textareas, and contenteditable elements
      // Also allow selection in links and buttons (for navigation)
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[contenteditable="true"]') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('nav') ||
        target.closest('[role="button"]')
      ) {
        return; // Allow in form fields and interactive elements
      }
      e.preventDefault();
      return false;
    };
  
    // Block right-click EVERYWHERE (including form fields) to prevent Inspect
    // Users can still use Ctrl+C/Ctrl+V/Ctrl+A for copy/paste/select in form fields
    const blockRightClick = (e) => {
      const target = e.target;
      
      // Only allow right-click if explicitly marked with data attribute
      // This allows specific exceptions if needed in the future
      if (target.closest('[data-allow-context-menu]')) {
        return; // Allow only if explicitly allowed
      }
      
      // Block right-click EVERYWHERE (including form fields, buttons, links, page content)
      // This prevents the Inspect option from appearing
      // Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A) still work in form fields
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };
  
    // Add event listeners
    document.addEventListener('keydown', blockViewSource, true);
    document.addEventListener('keydown', blockViewSourceAlt, true);
    document.addEventListener('keydown', blockSavePage, true);
    document.addEventListener('keydown', blockSavePageAlt, true);
    document.addEventListener('keydown', blockSelectAll, true);
    document.addEventListener('keydown', blockCopy, true);
    document.addEventListener('keydown', blockPrint, true);
    document.addEventListener('keydown', blockF12, true);
    document.addEventListener('keydown', blockDevTools, true);
    document.addEventListener('selectstart', blockTextSelection, true);
    document.addEventListener('contextmenu', blockRightClick, true);
  
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', blockViewSource, true);
      document.removeEventListener('keydown', blockViewSourceAlt, true);
      document.removeEventListener('keydown', blockSavePage, true);
      document.removeEventListener('keydown', blockSavePageAlt, true);
      document.removeEventListener('keydown', blockSelectAll, true);
      document.removeEventListener('keydown', blockCopy, true);
      document.removeEventListener('keydown', blockPrint, true);
      document.removeEventListener('keydown', blockF12, true);
      document.removeEventListener('keydown', blockDevTools, true);
      document.removeEventListener('selectstart', blockTextSelection, true);
      document.removeEventListener('contextmenu', blockRightClick, true);
    };
  };
  
  