import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import defaultMaleAvatar from '../../../../../assets/default_male_avatar.jpg';
import defaultFemaleAvatar from '../../../../../assets/default_female_avatar.jpg';

/**
 * Common styling functions used by both print and PDF generation
 */

// Apply header styling
export const applyHeaderStyling = (element) => {
  if (!element) return;
  
  element.style.display = 'flex';
  element.style.gap = '20px';
  element.style.marginBottom = '20px';
  element.style.paddingBottom = '15px';
  element.style.borderBottom = '2px solid #ddd';
  element.style.pageBreakInside = 'avoid';
  element.style.alignItems = 'flex-start';
};

// Apply profile photo styling
export const applyProfilePhotoStyling = (photos) => {
  photos.forEach(photo => {
    photo.style.width = '120px';
    photo.style.height = '120px';
    photo.style.borderRadius = '50%';
    photo.style.overflow = 'hidden';
    photo.style.border = '2px solid #1967d2';
    photo.style.flexShrink = '0';
  });
};

// Apply header content styling
export const applyHeaderContentStyling = (element) => {
  if (!element) return;
  element.style.flex = '1';
};

// Apply candidate name styling
export const applyCandidateNameStyling = (element) => {
  if (!element) return;
  
  element.style.fontSize = '22px';
  element.style.marginBottom = '8px';
  element.style.color = '#000';
  element.style.fontWeight = 'bold';
};

// Apply body layout styling
export const applyBodyLayoutStyling = (element) => {
  if (!element) return;
  
  element.style.display = 'flex';
  element.style.gap = '20px';
  element.style.width = '100%';
  element.style.alignItems = 'start';
};

// Apply sidebar styling
export const applySidebarStyling = (element) => {
  if (!element) return;
  
  element.style.width = '280px';
  element.style.backgroundColor = '#f8f9fa';
  element.style.padding = '15px';
  element.style.flexShrink = '0';
  element.style.border = '1px solid #ddd';
};

// Apply main content styling
export const applyMainContentStyling = (element) => {
  if (!element) return;
  
  element.style.flex = '1';
  element.style.padding = '15px';
};

// Apply section styling
export const applySectionStyling = (sections) => {
  sections.forEach((section, index) => {
    section.style.marginBottom = '15px';
    section.style.pageBreakInside = 'auto';
    section.style.breakInside = 'auto';
    
    if (index === 0) {
      section.style.pageBreakBefore = 'auto';
      section.style.breakBefore = 'auto';
      section.style.marginTop = '0';
    }
  });
};

// Apply section title styling
export const applySectionTitleStyling = (titles) => {
  titles.forEach(title => {
    title.style.fontSize = '16px';
    title.style.color = '#1967d2';
    title.style.marginBottom = '10px';
    title.style.paddingBottom = '5px';
    title.style.borderBottom = '1px solid #1967d2';
    title.style.fontWeight = 'bold';
    title.style.pageBreakAfter = 'avoid';
  });
};

// Apply content block styling (education, experience)
export const applyContentBlockStyling = (blocks) => {
  blocks.forEach(block => {
    block.style.marginBottom = '12px';
    block.style.padding = '12px';
    block.style.background = '#f5f7fc';
    block.style.borderRadius = '6px';
    block.style.pageBreakInside = 'avoid';
    block.style.border = '1px solid #e0e0e0';
  });
};

// Apply large content block styling (work exposure, job preferences, etc.)
export const applyLargeContentBlockStyling = (blocks) => {
  blocks.forEach(block => {
    block.style.background = '#f8f9fa';
    block.style.border = '1px solid #ddd';
    block.style.padding = '12px';
    block.style.marginBottom = '12px';
    block.style.borderRadius = '6px';
    block.style.pageBreakInside = 'auto';
  });
};

// Apply contact grid styling
export const applyContactGridStyling = (grids) => {
  grids.forEach(grid => {
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '10px';
    grid.style.fontSize = '13px';
    grid.style.marginTop = '8px';
  });
};

// Apply typography styling
export const applyPersonalMetaStyling = (metas) => {
  metas.forEach(meta => {
    meta.style.marginBottom = '6px';
    meta.style.color = '#666';
    meta.style.fontSize = '13px';
  });
};

// Apply education specific styling
export const applyEducationStyling = (element, type) => {
  switch (type) {
    case 'title':
      element.style.fontWeight = 'bold';
      element.style.fontSize = '14px';
      element.style.marginBottom = '5px';
      element.style.color = '#1967d2';
      break;
    case 'details':
      element.style.fontSize = '13px';
      element.style.lineHeight = '1.3';
      break;
    case 'meta':
      element.style.color = '#666';
      element.style.fontSize = '12px';
      element.style.marginTop = '5px';
      break;
  }
};

/**
 * Print-specific functions
 */

// Generate print CSS as a string
export const generatePrintCSS = (isUnlocked = false) => {
  const maskedContentStyles = !isUnlocked ? `
    /* Styles for masked content when not unlocked */
    .blurred-contact,
    .blurred-contact * {
      filter: none !important;
      color: #999 !important;
      font-style: italic !important;
      background-color: #f5f5f5 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-size: 0.9em !important;
      text-decoration: line-through !important;
      position: relative !important;
    }
    
    /* Disable links for masked content */
    a[style*="pointer-events: none"],
    .blurred-contact a {
      pointer-events: none !important;
      color: #999 !important;
      text-decoration: line-through !important;
      cursor: not-allowed !important;
    }
    
    /* Add a visual indicator for masked content */
    .blurred-contact::before {
      content: "🔒 ";
      margin-right: 4px;
      font-style: normal !important;
    }
    
    /* Ensure masked content is clearly visible in print/PDF */
    .blurred-contact {
      border: 1px solid #ddd !important;
      display: inline-block !important;
      min-width: 60px !important;
      text-align: center !important;
    }
    
    /* Handle specific masked elements */
    .blurred-contact a[href] {
      color: #999 !important;
      text-decoration: line-through !important;
      pointer-events: none !important;
    }
    
    /* Ensure phone numbers and emails are properly masked */
    .blurred-contact[data-type="phone"],
    .blurred-contact[data-type="email"],
    .blurred-contact[data-type="whatsapp"] {
      font-family: monospace !important;
      letter-spacing: 1px !important;
    }
  ` : `
    /* Styles when content is unlocked */
    .blurred-contact {
      filter: none !important;
      color: inherit !important;
      font-style: normal !important;
      background-color: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      font-size: inherit !important;
      text-decoration: none !important;
      border: none !important;
      display: inline !important;
      min-width: auto !important;
      text-align: left !important;
      letter-spacing: normal !important;
    }
    
    .blurred-contact::before {
      content: none !important;
    }
    
    .blurred-contact a {
      color: inherit !important;
      text-decoration: underline !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }
  `;

  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      color: #333;
      background: white;
      margin: 0;
      padding: 20px;
    }
    
    .cv-container {
      max-width: none;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    
    .cv-header {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ddd;
      page-break-inside: avoid;
    }
    
    .cv-profile-photo {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #1967d2;
    }
    
    .cv-profile-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .header-content {
      flex: 1;
    }
    
    .candidate-name {
      font-size: 22px;
      margin-bottom: 8px;
      color: #000;
    }
    
    .personal-meta {
      margin-bottom: 6px;
      color: #666;
      font-size: 13px;
    }
    
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 13px;
    }
    
    .cv-body {
      display: flex;
      gap: 20px;
    }
    
    .cv-sidebar {
      width: 280px;
      background: #f8f9fa;
      padding: 15px;
      border: 1px solid #ddd;
    }
    
    .cv-main {
      flex: 1;
      padding: 15px;
    }
    
    .cv-section {
      margin-bottom: 15px;
      page-break-inside: auto;
    }
    
    .section-title {
      font-size: 16px;
      color: #1967d2;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #1967d2;
      page-break-after: avoid;
    }
    
    ${maskedContentStyles}
    
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      
      .cv-container {
        padding: 20px;
      }
      
      .download-section,
      .profile-actions {
        display: none !important;
      }
    }
  `;
};

// Clean up content for print/PDF
export const cleanContentForPrint = (clonedContent, isUnlocked = false) => {
  // Remove unnecessary elements
  const elementsToRemove = clonedContent.querySelectorAll('.download-section, .profile-actions, .profile-counter');
  elementsToRemove.forEach(el => el.remove());
  
  // Handle masked content based on unlock status
  if (!isUnlocked) {
    // Find all blurred contact elements and replace with placeholder text
    const blurredElements = clonedContent.querySelectorAll('.blurred-contact');
    blurredElements.forEach(el => {
      // Replace the content with placeholder text
      const originalText = el.textContent || el.innerText;
      if (originalText && originalText.trim()) {
        // Determine the type of content for better masking
        let maskedText = '';
        const text = originalText.trim();
        
        // Check if it's an email
        if (text.includes('@')) {
          const [localPart, domain] = text.split('@');
          maskedText = `${localPart.charAt(0)}•••@${domain}`;
          el.setAttribute('data-type', 'email');
        }
        // Check if it's a phone number
        else if (/^[\d\s\+\-\(\)]+$/.test(text)) {
          const digits = text.replace(/\D/g, '');
          if (digits.length >= 10) {
            maskedText = `••••••••••`;
            el.setAttribute('data-type', 'phone');
          } else {
            maskedText = text.replace(/./g, '•');
          }
        }
        // Check if it's a WhatsApp number
        else if (text.toLowerCase().includes('whatsapp') || text.includes('wa.me')) {
          maskedText = `••••••••••`;
          el.setAttribute('data-type', 'whatsapp');
        }
        // Default masking
        else {
          maskedText = text.replace(/./g, '•');
        }
        
        el.textContent = maskedText;
        el.innerText = maskedText;
        
        // Remove the blur class and apply print-friendly masking
        el.classList.remove('blurred-contact');
        el.style.filter = 'none';
        el.style.color = '#999';
        el.style.fontStyle = 'italic';
        el.style.backgroundColor = '#f5f5f5';
        el.style.padding = '2px 6px';
        el.style.borderRadius = '3px';
        el.style.fontSize = '0.9em';
        el.style.border = '1px solid #ddd';
        el.style.display = 'inline-block';
        el.style.minWidth = '60px';
        el.style.textAlign = 'center';
        el.style.position = 'relative';
      }
    });

    // Also handle any links that should be disabled
    const disabledLinks = clonedContent.querySelectorAll('a[style*="pointer-events: none"]');
    disabledLinks.forEach(link => {
      link.style.pointerEvents = 'none';
      link.style.color = '#999';
      link.style.textDecoration = 'line-through';
      link.style.cursor = 'not-allowed';
      link.href = 'javascript:void(0)';
      link.removeAttribute('target');
      link.removeAttribute('rel');
    });
  } else {
    // If unlocked, remove blur effects and restore normal appearance
    const blurredElements = clonedContent.querySelectorAll('.blurred-contact');
    blurredElements.forEach(el => {
      el.classList.remove('blurred-contact');
      el.style.filter = 'none';
      el.style.color = '';
      el.style.fontStyle = '';
      el.style.backgroundColor = '';
      el.style.padding = '';
      el.style.borderRadius = '';
      el.style.fontSize = '';
      el.style.border = '';
      el.style.display = '';
      el.style.minWidth = '';
      el.style.textAlign = '';
      el.style.position = '';
      el.removeAttribute('data-type');
    });
  }
  
  // Clean up styling
  const allElements = clonedContent.getElementsByTagName('*');
  for (let el of allElements) {
    el.style.transition = 'none';
    el.style.animation = 'none';
  }
};

// Generate complete HTML for print/PDF
export const generatePrintHTML = (content, title, isUnlocked = false) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - CV</title>
        <meta charset="utf-8">
        <style>${generatePrintCSS(isUnlocked)}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
};

// Process profile image for PDF
export const processProfileImage = async (img, freshImageUrl = null) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 120;
    canvas.height = 120;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Try to load image through proxy if it's an S3 URL
    const proxyImage = async (url) => {
      try {
        // Check if it's an S3 URL
        if (url.includes('amazonaws.com')) {
          // Convert the image to base64 using a fetch request
          const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'image/jpeg,image/png,image/*'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        return url;
      } catch (error) {
        console.warn('Error proxying image:', error);
        return url;
      }
    };

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    await new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 5000);
      
      tempImg.onload = () => {
        clearTimeout(timeoutId);
        try {
          const aspectRatio = tempImg.width / tempImg.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          
          if (aspectRatio > 1) {
            drawHeight = canvas.width / aspectRatio;
          } else {
            drawWidth = canvas.height * aspectRatio;
          }
          
          const x = (canvas.width - drawWidth) / 2;
          const y = (canvas.height - drawHeight) / 2;
          
          ctx.drawImage(tempImg, x, y, drawWidth, drawHeight);
          img.src = canvas.toDataURL('image/jpeg', 0.95);
          resolve();
        } catch (drawError) {
          reject(drawError);
        }
      };
      
      tempImg.onerror = async (error) => {
        clearTimeout(timeoutId);
        console.warn('Initial image load failed, trying alternative methods...', error);
        
        try {
          // Try loading through proxy
          let imageUrl = freshImageUrl || img.src;
          if (imageUrl.startsWith('/')) {
            imageUrl = window.location.origin + imageUrl;
          }
          
          const proxiedUrl = await proxyImage(imageUrl);
          tempImg.src = proxiedUrl;
        } catch (retryError) {
          reject(new Error('Failed to load image after retry'));
        }
      };
      
      // First attempt to load the image
      let imageUrl = freshImageUrl || img.src;
      if (imageUrl.startsWith('/')) {
        imageUrl = window.location.origin + imageUrl;
      }
      tempImg.src = imageUrl;
    });
    
    return true;
  } catch (error) {
    console.warn('Image processing failed:', error);
    return false;
  }
};

// Main PDF generation function
export const generatePDF = async ({
  cvElement,
  profileData,
  candidate,
  getFreshImageUrl,
  setIsDownloading,
  isUnlocked = false
}) => {
  let iframe = null;
  try {
    setIsDownloading(true);
    console.log('Starting PDF generation process');
    
    if (!cvElement) {
      throw new Error('CV container not found');
    }

    // Clone and clean the CV content
    const clonedElement = cvElement.cloneNode(true);
    cleanContentForPrint(clonedElement, isUnlocked);

    // Get fresh image URL if needed
    let freshImageUrl = null;
    if (candidate?.firebase_uid) {
      try {
        freshImageUrl = await getFreshImageUrl(candidate.firebase_uid);
        console.log('Fresh image URL obtained:', !!freshImageUrl);
      } catch (imageError) {
        console.warn('Failed to get fresh image URL:', imageError);
      }
    }

    // Process images
    const profileImages = clonedElement.querySelectorAll('.cv-profile-photo img, .profile-photo img');
    console.log('Found profile images:', profileImages.length);

    for (const img of profileImages) {
      const success = await processProfileImage(img, freshImageUrl);
      if (!success) {
        // Use default image
        const gender = profileData?.gender?.toLowerCase();
        img.src = gender === 'female' ? defaultFemaleAvatar : defaultMaleAvatar;
      }
    }

    // Create iframe for PDF generation
    iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px'; // A4 width at 96 DPI
    iframe.style.height = '1123px'; // A4 height at 96 DPI
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    // Generate content
    const printContent = generatePrintHTML(
      clonedElement.outerHTML,
      profileData?.fullName || 'Candidate',
      isUnlocked
    );

    // Write content to iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(printContent);
    iframe.contentDocument.close();

    // Wait for content and images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF using html2canvas
    const canvas = await html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true,
      width: 794,
      height: iframe.contentDocument.body.scrollHeight,
      windowWidth: 794,
      windowHeight: iframe.contentDocument.body.scrollHeight
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add image to PDF
    if (imgHeight <= pageHeight) {
      // Single page
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multiple pages
      let heightLeft = imgHeight;
      let position = 0;
      let page = 0;

      while (heightLeft > 0) {
        if (page > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position += pageHeight;
        page++;
      }
    }

    // Save the PDF
    const filename = `${profileData?.fullName || 'Candidate'}_CV_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    console.log('PDF generated successfully:', filename);

    return { success: true };
  } catch (error) {
    console.error('PDF Generation Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    // Clean up iframe
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    setIsDownloading(false);
  }
}; 

export const generateMultipleProfilesPDF = async ({
  candidates,
  profileType = 'short', // 'short' or 'full'
  setIsDownloading,
  getFreshImageUrl,
  isUnlocked = false
}) => {
  try {
    setIsDownloading(true);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let currentY = 20;
    const pageHeight = 297; // A4 height in mm
    const margin = 20;
    const contentHeight = pageHeight - (2 * margin);
    
    // Add title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(25, 103, 210);
    pdf.text('Selected Candidates Report', margin, currentY);
    
    currentY += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, currentY);
    currentY += 8;
    pdf.text(`Total Candidates: ${candidates.length}`, margin, currentY);
    currentY += 8;
    pdf.text(`Profile Type: ${profileType === 'short' ? 'Short Profile' : 'Complete Profile'}`, margin, currentY);
    
    currentY += 20;
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      // Check if we need a new page
      if (currentY > contentHeight - 50) {
        pdf.addPage();
        currentY = 20;
      }
      
      // Add candidate header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(25, 103, 210);
      pdf.text(`${i + 1}. ${candidate.fullName || 'Unknown Candidate'}`, margin, currentY);
      
      currentY += 10;
      
      // Add candidate details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      const basicDetails = [
        `Applied for: ${candidate.job_name || 'Unknown Position'}`,
        `Experience: ${candidate.experience ? `${candidate.experience} years` : 'Not specified'}`,
        `Expected Salary: ₹${candidate.expectedSalary?.toLocaleString() || 'Not specified'}`,
        `Location: ${candidate.location || 'Not specified'}`,
        `Education: ${candidate.education || 'Not specified'}`,
        `Core Expertise: ${candidate.coreExpertise || 'Not specified'}`,
        `Applied Date: ${new Date(candidate.applied_at).toLocaleDateString()}`
      ];
      
      basicDetails.forEach(detail => {
        if (currentY > contentHeight) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.text(detail, margin, currentY);
        currentY += 6;
      });
      
      // Add additional details for full profile
      if (profileType === 'full' && candidate.profile) {
        currentY += 5;
        
        // Personal Information
        if (currentY > contentHeight - 30) {
          pdf.addPage();
          currentY = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(25, 103, 210);
        pdf.text('Personal Information:', margin, currentY);
        currentY += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        const personalInfo = [
          `Gender: ${candidate.profile.gender || 'Not specified'}`,
          `Date of Birth: ${candidate.profile.date_of_birth || 'Not specified'}`,
          `Marital Status: ${candidate.profile.marital_status || 'Not specified'}`,
          `Job Type: ${candidate.profile.Job_Type || 'Not specified'}`
        ];
        
        personalInfo.forEach(info => {
          if (currentY > contentHeight) {
            pdf.addPage();
            currentY = 20;
          }
          pdf.text(info, margin + 5, currentY);
          currentY += 5;
        });
        
        // Education Details (if available)
        if (candidate.profile.education_details_json) {
          currentY += 5;
          if (currentY > contentHeight - 20) {
            pdf.addPage();
            currentY = 20;
          }
          
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(25, 103, 210);
          pdf.text('Education Details:', margin, currentY);
          currentY += 8;
          
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          try {
            const educationDetails = JSON.parse(candidate.profile.education_details_json);
            if (Array.isArray(educationDetails)) {
              educationDetails.forEach((edu, index) => {
                if (currentY > contentHeight - 15) {
                  pdf.addPage();
                  currentY = 20;
                }
                pdf.text(`${index + 1}. ${edu.education_type || 'Education'} - ${edu.institution || 'Institution'}`, margin + 5, currentY);
                currentY += 5;
              });
            }
          } catch (e) {
            pdf.text('Education details not available', margin + 5, currentY);
            currentY += 5;
          }
        }
      }
      
      // Add separator between candidates
      currentY += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, 210 - margin, currentY);
      currentY += 15;
    }
    
    // Save the PDF
    const fileName = `selected_candidates_${profileType}_profiles_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    setIsDownloading(false);
    return true;
  } catch (error) {
    console.error('Error generating multiple profiles PDF:', error);
    setIsDownloading(false);
    return false;
  }
}; 

// Generate a PDF from provided HTML string (multiple `.cv-container` blocks)
export const generatePDFfromHTML = async ({
  htmlContent,
  title = 'Selected Candidates',
  setIsDownloading,
  isUnlocked = false
}) => {
  let iframe = null;
  try {
    if (typeof setIsDownloading === 'function') setIsDownloading(true);

    // Hidden iframe to render print HTML
    iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const content = generatePrintHTML(htmlContent, title, isUnlocked);
    iframe.contentDocument.open();
    iframe.contentDocument.write(content);
    iframe.contentDocument.close();

    // Allow layout/images to settle
    await new Promise(resolve => setTimeout(resolve, 1500));
    const fullHeight = iframe.contentDocument.body.scrollHeight || 1123;
    iframe.style.height = `${fullHeight}px`;

    const canvas = await html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      height: fullHeight,
      windowWidth: 794,
      windowHeight: fullHeight
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      let page = 0;
      while (heightLeft > 0) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position += pageHeight;
        page++;
      }
    }

    const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    return { success: true };
  } catch (error) {
    console.error('PDF Generation Error (from HTML):', error);
    return { success: false, error: error.message };
  } finally {
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    if (typeof setIsDownloading === 'function') setIsDownloading(false);
  }
};