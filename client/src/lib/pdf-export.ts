import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

/**
 * Simple interface for jsPDF
 * This avoids declaring type definitions that might conflict with the library
 */
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    internal: any;
    setPage: (pageNumber: number) => jsPDF;
    getTextWidth: (text: string) => number;
    saveGraphicsState: () => jsPDF;
    restoreGraphicsState: () => jsPDF;
    GState: any;
    // Note: We don't explicitly redefine addImage to avoid type conflicts
  }
}

// Types for export options
export interface PdfExportOptions {
  title?: string;
  filename?: string;
  author?: string;
  subject?: string;
  headerText?: string;
  footerText?: string;
  includeDate?: boolean;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  watermark?: string;
  imageQuality?: number;
}

// Default export options
const defaultOptions: PdfExportOptions = {
  title: 'Exported Document',
  filename: 'document.pdf',
  author: 'VenThatGrant',
  subject: 'Grant Document',
  headerText: 'VenThatGrant',
  footerText: 'Generated with VenThatGrant',
  includeDate: true,
  orientation: 'portrait',
  pageSize: 'a4',
  margins: {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
  },
  imageQuality: 0.95,
};

/**
 * Export element to PDF with professional formatting
 */
export async function exportToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  try {
    console.log('PDF Export: Beginning export process', {
      elementType: element.tagName,
      elementId: element.id,
      elementClasses: element.className,
      childrenCount: element.children.length,
      hasContent: element.textContent && element.textContent.length > 0,
      options: options
    });

    if (!element) {
      console.error('PDF Export: Null element provided');
      throw new Error('Cannot export null element to PDF');
    }

    if (!element.isConnected) {
      console.error('PDF Export: Element is not connected to the DOM');
      throw new Error('Cannot export element that is not in the DOM');
    }

    if (element.textContent === '') {
      console.warn('PDF Export: Element has no text content');
    }

    // Merge default options with user options
    const mergedOptions = { ...defaultOptions, ...options };
    const {
      title,
      filename,
      author,
      subject,
      headerText,
      footerText,
      includeDate,
      orientation,
      pageSize,
      margins,
      watermark,
      imageQuality,
    } = mergedOptions;

    // Create PDF document
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pageSize,
    });

    // Set document properties
    pdf.setProperties({
      title: title || 'Document',
      author: author || 'VenThatGrant',
      subject: subject || 'Grant Document',
      creator: 'VenThatGrant',
    });

    // Apply font size modification to the element before capture
    // Save original styles to restore later
    const originalElements: { element: HTMLElement, fontSize: string }[] = [];
    
    // Find all text elements and increase their font size for the PDF
    element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, li, td, th').forEach(el => {
      if (el instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(el);
        const currentSize = parseFloat(computedStyle.fontSize);
        
        // Only store and modify if we can get a valid size
        if (!isNaN(currentSize)) {
          originalElements.push({ element: el, fontSize: el.style.fontSize });
          
          // Increase size based on element type
          if (el.tagName === 'H1') {
            el.style.fontSize = '32px'; // Title font size
          } else if (el.tagName === 'H2') {
            el.style.fontSize = '28px';
          } else if (el.tagName === 'H3') {
            el.style.fontSize = '24px';
          } else if (el.tagName.match(/^H[4-6]$/)) {
            el.style.fontSize = '20px';
          } else {
            // Regular text - ensure minimum size of 18px
            el.style.fontSize = `${Math.max(currentSize * 1.5, 18)}px`;
          }
        }
      }
    });
    
    console.log('Modified font sizes for PDF export');
    
    console.log('PDF Export: Capturing element to canvas', {
      modifiedElements: originalElements.length,
      elementDimensions: {
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
      }
    });

    // Generate canvas from the HTML element with enhanced scale for better quality
    const canvas = await html2canvas(element, {
      scale: 4, // Increased scale for better quality and larger text
      logging: true, // Enable html2canvas logging for debugging
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 30000, // Increased timeout for larger content
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
    
    console.log('PDF Export: Canvas generated successfully', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      canvasEmpty: canvas.width === 0 || canvas.height === 0
    });
    
    // Restore original styles
    originalElements.forEach(item => {
      item.element.style.fontSize = item.fontSize;
    });
    
    console.log('PDF Export: Restored original font sizes');

    // Calculate dimensions to fit within the PDF page
    const imgData = canvas.toDataURL('image/jpeg', imageQuality);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = margins?.left || 15;
    const contentWidth = pageWidth - (2 * margin);
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add header
    if (headerText) {
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(headerText, margin, 10);
      
      if (includeDate) {
        const date = new Date().toLocaleDateString();
        pdf.setFontSize(9);
        pdf.text(date, pageWidth - margin - pdf.getTextWidth(date), 10);
      }
      
      // Add a light horizontal line below the header
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, 12, pageWidth - margin, 12);
    }

    // Watermark if specified
    if (watermark) {
      pdf.setFontSize(60);
      pdf.setTextColor(230, 230, 230);
      pdf.saveGraphicsState();
      pdf.setGState(pdf.GState({ opacity: 0.3 }));
      pdf.text(
        watermark,
        pageWidth / 2,
        pageHeight / 2,
        {
          align: 'center',
          angle: 45,
        }
      );
      pdf.restoreGraphicsState();
    }

    // Calculate content position (after header)
    const startY = margins?.top || 20;
    
    // Add content (paging if necessary)
    let currentY = startY;
    const maxContentHeight = pageHeight - startY - (margins?.bottom || 20);
    
    if (imgHeight <= maxContentHeight) {
      // Content fits on one page
      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        currentY,
        imgWidth,
        imgHeight
      );
    } else {
      // Content needs multiple pages
      let remainingHeight = imgHeight;
      let sourceY = 0;
      
      while (remainingHeight > 0) {
        // How much can fit on this page
        const contentHeightOnThisPage = Math.min(maxContentHeight, remainingHeight);
        
        // Proportionally calculate how much of the source image to use
        const sourceHeight = (contentHeightOnThisPage / imgHeight) * canvas.height;
        
        // Use a more compatible approach to add images with clipping
        // Create a temporary canvas for the current page's content
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          throw new Error('Could not create canvas context for PDF export');
        }
        
        // Set dimensions of the temp canvas to match the source section
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        
        // Draw the portion of the original canvas we want for this page
        tempCtx.drawImage(
          canvas, 
          0, sourceY, 
          canvas.width, sourceHeight, 
          0, 0, 
          canvas.width, sourceHeight
        );
        
        // Convert this section to an image data URL
        const pageImgData = tempCanvas.toDataURL('image/jpeg', imageQuality);
        
        // Add the image section to the PDF
        pdf.addImage(
          pageImgData,
          'JPEG',
          margin,
          currentY,
          imgWidth,
          contentHeightOnThisPage
        );
        
        remainingHeight -= contentHeightOnThisPage;
        sourceY += sourceHeight;
        
        if (remainingHeight > 0) {
          pdf.addPage();
          currentY = startY;
          
          // Add header to new page
          if (headerText) {
            pdf.setFontSize(11);
            pdf.setTextColor(100, 100, 100);
            pdf.text(headerText, margin, 10);
            
            if (includeDate) {
              const date = new Date().toLocaleDateString();
              pdf.setFontSize(9);
              pdf.text(date, pageWidth - margin - pdf.getTextWidth(date), 10);
            }
            
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, 12, pageWidth - margin, 12);
          }
          
          // Add watermark to new page
          if (watermark) {
            pdf.setFontSize(60);
            pdf.setTextColor(230, 230, 230);
            pdf.saveGraphicsState();
            pdf.setGState(pdf.GState({ opacity: 0.3 }));
            pdf.text(
              watermark,
              pageWidth / 2,
              pageHeight / 2,
              {
                align: 'center',
                angle: 45,
              }
            );
            pdf.restoreGraphicsState();
          }
        }
      }
    }

    // Add footer to each page
    // Use the pages array length to get total pages
    const totalPages = pdf.internal.pages ? pdf.internal.pages.length - 1 : 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Footer text
      if (footerText) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          footerText,
          margin,
          pageHeight - (margins?.bottom || 10)
        );
      }
      
      // Page numbers
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const pageNumber = `Page ${i} of ${totalPages}`;
      pdf.text(
        pageNumber,
        pageWidth - margin - pdf.getTextWidth(pageNumber),
        pageHeight - (margins?.bottom || 10)
      );
      
      // Light horizontal line above footer
      pdf.setDrawColor(200, 200, 200);
      pdf.line(
        margin,
        pageHeight - (margins?.bottom || 10) - 3,
        pageWidth - margin,
        pageHeight - (margins?.bottom || 10) - 3
      );
    }

    // Save the PDF
    pdf.save(filename);

    return;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Export data as a table in PDF format
 */
export function exportTableToPdf(
  tableData: { [key: string]: any }[],
  columns: { header: string; dataKey: string }[],
  options: PdfExportOptions = {}
): void {
  try {
    // Merge default options with user options
    const mergedOptions = { ...defaultOptions, ...options };
    const {
      title,
      filename,
      author,
      subject,
      headerText,
      footerText,
      includeDate,
      orientation,
      pageSize,
      margins,
      watermark,
    } = mergedOptions;

    // Create PDF document
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: pageSize,
    });

    // Set document properties
    pdf.setProperties({
      title: title || 'Document',
      author: author || 'VenThatGrant',
      subject: subject || 'Grant Document',
      creator: 'VenThatGrant',
    });

    // Add title
    if (title) {
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text(title, margins?.left || 15, 20);
    }

    // Add date if requested
    if (includeDate) {
      const date = new Date().toLocaleDateString();
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Generated on: ${date}`,
        margins?.left || 15,
        title ? 28 : 20
      );
    }

    // Add watermark if specified
    if (watermark) {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.setFontSize(60);
      pdf.setTextColor(230, 230, 230);
      pdf.saveGraphicsState();
      pdf.setGState(pdf.GState({ opacity: 0.3 }));
      pdf.text(
        watermark,
        pageWidth / 2,
        pageHeight / 2,
        {
          align: 'center',
          angle: 45,
        }
      );
      pdf.restoreGraphicsState();
    }

    // Prepare column headers
    const headers = columns.map(col => col.header);
    
    // Prepare data rows
    const data = tableData.map(row => {
      return columns.map(col => row[col.dataKey] || '');
    });

    // Calculate start position for table
    const tableStartY = title ? (includeDate ? 35 : 30) : (includeDate ? 25 : 20);

    // Add the table with autotable
    (pdf as any).autoTable({
      head: [headers],
      body: data,
      startY: tableStartY,
      margin: {
        top: margins?.top || 20,
        right: margins?.right || 15,
        bottom: margins?.bottom || 20, 
        left: margins?.left || 15
      },
      headStyles: {
        fillColor: [61, 90, 254],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 246, 250],
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      didDrawPage: function(data: any) {
        // Header on each page
        if (headerText) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(headerText, margins?.left || 15, 10);
        }
        
        // Footer on each page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        if (footerText) {
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.text(
            footerText,
            margins?.left || 15,
            pageHeight - 10
          );
        }
        
        // Page numbers
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        const pageNumber = `Page ${data.pageNumber} of ${data.pageCount}`;
        pdf.text(
          pageNumber, 
          pageWidth - (margins?.right || 15) - pdf.getTextWidth(pageNumber),
          pageHeight - 10
        );
      }
    });

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating table PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}