/**
 * Print styles for CV components
 * Used by react-to-print for consistent styling across ViewFull and ViewShort components
 */
export const getPrintPageStyle = () => `
  @page {
    size: A4;
    margin: 10mm;
  }
  @media print {
    * {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    button {
      display: none !important;
    }
    .download-section,
    .profile-actions {
      display: none !important;
    }
    .cv-container {
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }
    body {
      background: white;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Reduce padding on content containers */
    .cv-container > div {
      padding: 8px !important;
    }
    .cv-container > div > div {
      padding: 6px !important;
    }
    /* Remove underlines from section titles */
    .section-title {
      border-bottom: none !important;
      padding-bottom: 0 !important;
      margin-bottom: 10px !important;
    }
    /* Use solid darker color from gradient to avoid print rendering issues */
    .bg-gradient-brand.bg-clip-text,
    .candidate-name.bg-gradient-brand.bg-clip-text,
    .section-title.bg-gradient-brand.bg-clip-text {
      background: none !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: unset !important;
      color: #A1025D !important;
      outline: none !important;
      box-shadow: none !important;
    }
    .candidate-name {
      background: none !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: unset !important;
      color: #A1025D !important;
      outline: none !important;
      box-shadow: none !important;
    }
    .section-title {
      background: none !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: unset !important;
      color: #A1025D !important;
      outline: none !important;
      box-shadow: none !important;
    }
    /* Remove any pseudo-elements that might create lines */
    .candidate-name::before,
    .candidate-name::after,
    .section-title::before,
    .section-title::after,
    .candidate-name *::before,
    .candidate-name *::after,
    .section-title *::before,
    .section-title *::after {
      display: none !important;
      content: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    /* Ensure no border, outline, or box-shadow creates vertical lines */
    .candidate-name,
    .section-title,
    .candidate-name *,
    .section-title * {
      border-left: none !important;
      border-right: none !important;
      border-top: none !important;
      border-bottom: none !important;
      outline: none !important;
      box-shadow: none !important;
      position: relative !important;
    }
    /* Remove any wrapper elements that might create lines */
    .candidate-name > *,
    .section-title > * {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    /* Optimize spacing to prevent overlapping but use less space */
    .mb-4 {
      margin-bottom: 1rem !important;
    }
    .mb-6 {
      margin-bottom: 1.25rem !important;
    }
    .mb-8 {
      margin-bottom: 1.5rem !important;
    }
    .mb-\[30px\] {
      margin-bottom: 1.25rem !important;
    }
    /* Ensure proper spacing between contact info items */
    .flex > div {
      margin-bottom: 0.4rem !important;
    }
    /* Fix experience summary spacing */
    .border-b {
      margin-bottom: 0.75rem !important;
      padding-bottom: 0.5rem !important;
    }
    /* Optimize section spacing */
    div > div {
      margin-top: 0.3rem !important;
    }
    /* Ensure proper line height */
    p, div, span {
      line-height: 1.5 !important;
    }
    /* Reduce padding in content blocks */
    .p-3, .p-4, .p-5, .p-6, .p-8 {
      padding: 8px !important;
    }
    .px-2, .px-3, .px-4, .px-6 {
      padding-left: 6px !important;
      padding-right: 6px !important;
    }
    .py-2, .py-3, .py-2\.5 {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
  }
`;

