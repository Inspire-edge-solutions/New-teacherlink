/**
 * Utility function to clean up Bootstrap modal and offcanvas backdrops
 * Use this when navigating between pages to prevent lingering backdrops
 */
export const cleanupModals = () => {
  // Remove any existing modal backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop');
  backdrops.forEach(backdrop => {
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
  });
  
  // Remove modal-open class from body
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};
