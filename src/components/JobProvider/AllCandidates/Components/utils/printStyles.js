/**
 * Print styles for CV components
 * Used by react-to-print for consistent styling across ViewFull and ViewShort components
 */
export const getPrintPageStyle = () => `
  @page {
    size: A4;
    margin: 3mm;
  }
  @media print {
    * {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
    }
    .print-wrapper-hidden {
      position: static !important;
      left: auto !important;
      top: auto !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: auto !important;
      pointer-events: auto !important;
      display: block !important;
    }
    button {
      display: none !important;
    }
    .download-section,
    .profile-actions,
    .demo-resume-heading {
      display: none !important;
    }
    .cv-container {
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }
    body {
      background: white;
      margin: 0 !important;
      padding: 0 !important;
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
    /* Ensure emails and long text don't truncate in print */
    a[href^="mailto:"],
    a[href^="mailto:"] * {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
    }
    /* Reduce padding in content blocks */
    .p-3, .p-4, .p-5, .p-6, .p-8 {
      padding: 8px !important;
    }
    /* Reduce left padding for right column content to maximize space */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]) .px-2,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]) .px-3,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]) .px-4,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]) .px-6 {
      padding-left: 2px !important;
      padding-right: 6px !important;
    }
    /* Default padding for other elements */
    .px-2, .px-3, .px-4, .px-6 {
      padding-left: 6px !important;
      padding-right: 6px !important;
    }
    .py-2, .py-3, .py-2\.5 {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
    /* Ensure header doesn't force a page break - content should flow immediately after */
    .cv-container > div[class*="border-b"] {
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-bottom: 0.5rem !important;
      padding: 0.75rem !important;
    }
    /* Force two-column grid layout for print (matching ViewFull and ViewShort) */
    /* Target the main body grid container - override all responsive classes */
    .cv-container > div[class*="grid"] {
      display: grid !important;
      grid-template-columns: 250px 1fr !important;
      gap: 0.25rem !important;
      margin-top: 0 !important;
      padding-top: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    /* Override Tailwind responsive grid classes - force two columns in print */
    .cv-container > div[class*="grid-cols-1"],
    .cv-container > div[class*="grid-cols-"] {
      grid-template-columns: 250px 1fr !important;
    }
    /* Sidebar column (left, with bg-gray-100 class) - Education section */
    .cv-container > div[class*="grid"] > div[class*="bg-gray-100"] {
      width: 250px !important;
      min-width: 250px !important;
      max-width: 250px !important;
      grid-column: 1 !important;
      background-color: #f3f4f6 !important;
      padding: 0.75rem !important;
      box-sizing: border-box !important;
      flex-shrink: 0 !important;
    }
    /* Main content column (right) - Work Experience, Job Preferences, etc. */
    /* Target divs that come after the sidebar and are not hidden */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) {
      grid-column: 2 !important;
      min-width: 0 !important;
      max-width: none !important;
      width: 100% !important;
      padding: 0.5rem 0 !important;
      padding-left: 0.25rem !important;
      padding-right: 0 !important;
      margin-right: 0 !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    /* Ensure content inside right column doesn't overflow */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) > * {
      max-width: 100% !important;
      overflow: visible !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      box-sizing: border-box !important;
    }
    /* Prevent nested grids and content from exceeding column width */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) [class*="grid"],
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) .grid {
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    /* Ensure text and inline elements wrap properly */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) span,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) div,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) p,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) strong,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) b,
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) * {
      max-width: 100% !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      text-overflow: clip !important;
      overflow: visible !important;
    }
    /* Prevent any element from having nowrap or fixed widths */
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) [class*="whitespace-nowrap"],
    .cv-container > div[class*="grid"] > div:not([class*="bg-gray-100"]):not([class*="hidden"]) [style*="white-space: nowrap"] {
      white-space: normal !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    /* Hide mobile-only sections in print (like mobile work experience) */
    .cv-container > div[class*="grid"] > div[class*="hidden"] {
      display: none !important;
    }
    /* Page breaks for multiple profiles */
    .candidate-profile-page {
      page-break-after: always !important;
      page-break-inside: avoid !important;
    }
    .candidate-profile-page:last-child {
      page-break-after: auto !important;
    }
    /* Ensure each profile starts on a new page */
    .candidate-profile-page + .candidate-profile-page {
      page-break-before: always !important;
    }
  }
`;

