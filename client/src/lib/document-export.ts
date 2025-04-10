import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import 'jspdf-autotable';

/**
 * Export options for different document formats
 */
export interface ExportOptions {
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
const defaultOptions: ExportOptions = {
  title: 'Exported Document',
  filename: 'document',
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
 * Export content to PDF format
 */
export async function exportToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
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

    // Create PDF document with better formatting options
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

    // Create a deep clone of the element to modify without affecting the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Apply enhanced styling to the cloned element for better PDF rendering
    clonedElement.style.width = '100%';
    clonedElement.style.padding = '20px';
    clonedElement.style.backgroundColor = '#ffffff';
    clonedElement.style.color = '#000000';
    clonedElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
    
    // Append to body temporarily, but hidden
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '-9999px';
    document.body.appendChild(clonedElement);
    
    // Enhance styling for the content to improve PDF quality
    // Apply more sophisticated font styling and spacing for better readability
    Array.from(clonedElement.querySelectorAll('*')).forEach((el) => {
      if (el instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(el);
        const fontSize = parseFloat(computedStyle.fontSize);
        if (!isNaN(fontSize)) {
          if (el.tagName === 'H1') {
            el.style.fontSize = '32px';
            el.style.fontWeight = 'bold';
            el.style.marginBottom = '16px';
            el.style.color = '#111111';
            el.style.borderBottom = '1px solid #dddddd';
            el.style.paddingBottom = '8px';
          } else if (el.tagName === 'H2') {
            el.style.fontSize = '28px';
            el.style.fontWeight = 'bold';
            el.style.marginTop = '20px';
            el.style.marginBottom = '12px';
            el.style.color = '#222222';
          } else if (el.tagName === 'H3') {
            el.style.fontSize = '24px';
            el.style.fontWeight = 'bold';
            el.style.marginTop = '16px';
            el.style.marginBottom = '10px';
            el.style.color = '#333333';
          } else if (el.tagName.match(/^H[4-6]$/)) {
            el.style.fontSize = '20px';
            el.style.fontWeight = 'bold';
            el.style.marginTop = '14px';
            el.style.marginBottom = '8px';
            el.style.color = '#444444';
          } else if (el.tagName === 'P') {
            el.style.fontSize = '16px';
            el.style.lineHeight = '1.5';
            el.style.marginBottom = '10px';
          } else if (el.tagName === 'LI') {
            el.style.fontSize = '16px';
            el.style.lineHeight = '1.5';
            el.style.marginBottom = '6px';
          } else {
            el.style.fontSize = `${Math.max(fontSize * 1.5, 16)}px`;
            el.style.lineHeight = '1.5';
          }
        }
        
        // Add spacing for list items
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          el.style.marginBottom = '16px';
          el.style.paddingLeft = '30px';
        }
        
        // Improve table styling
        if (el.tagName === 'TABLE') {
          el.style.borderCollapse = 'collapse';
          el.style.width = '100%';
          el.style.marginBottom = '16px';
        }
        
        if (el.tagName === 'TD' || el.tagName === 'TH') {
          el.style.border = '1px solid #dddddd';
          el.style.padding = '8px';
          el.style.textAlign = 'left';
        }
        
        if (el.tagName === 'TH') {
          el.style.backgroundColor = '#f2f2f2';
          el.style.fontWeight = 'bold';
        }
      }
    });

    // Generate canvas from the clone with enhanced scale for better quality
    const canvas = await html2canvas(clonedElement, {
      scale: 4, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: clonedElement.scrollWidth,
      windowHeight: clonedElement.scrollHeight,
      logging: false, // Disable logging to improve performance
    });
    
    // Clean up - remove the clone from the DOM
    document.body.removeChild(clonedElement);
    
    // Calculate dimensions to fit within the PDF page
    const imgData = canvas.toDataURL('image/jpeg', imageQuality || 0.98); // Higher quality
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
        
        // Calculate scaling factors
        const srcHeight = (contentHeightOnThisPage / imgHeight) * canvas.height;
        
        // Create a temporary canvas for the current page segment
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = srcHeight;
        
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        
        // Draw portion of the original canvas to the temp canvas
        ctx.drawImage(
          canvas, 
          0, sourceY, 
          canvas.width, srcHeight, 
          0, 0, 
          canvas.width, srcHeight
        );
        
        // Add this segment to the PDF
        const pageImgData = tempCanvas.toDataURL('image/jpeg', imageQuality || 0.95);
        
        pdf.addImage(
          pageImgData,
          'JPEG',
          margin,
          currentY,
          imgWidth,
          contentHeightOnThisPage
        );
        
        remainingHeight -= contentHeightOnThisPage;
        sourceY += srcHeight;
        
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
    pdf.save(`${filename || 'document'}.pdf`);

    return;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Export content to plain text format with improved formatting
 */
export function exportToText(
  element: HTMLElement,
  options: ExportOptions = {}
): void {
  try {
    // Merge default options with user options
    const mergedOptions = { ...defaultOptions, ...options };
    const { title, filename } = mergedOptions;
    
    // Extract text content with improved formatting
    let textContent = '';
    
    // Create a nice header
    if (title) {
      textContent += `${title.toUpperCase()}\n`;
      textContent += '='.repeat(Math.min(title.length, 80)) + '\n\n';
    }
    
    // Add document metadata
    textContent += `Document generated by VenThatGrant\n`;
    if (mergedOptions.includeDate) {
      textContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    }
    textContent += `${'-'.repeat(80)}\n\n`;
    
    // Create a better formatted document by traversing the DOM
    const extractFormattedText = (element: HTMLElement): string => {
      let formattedText = '';
      
      // Clone the element to preserve the original
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Process headings, paragraphs, and lists with better formatting
      const processNode = (node: Node, level = 0): void => {
        const indent = '  '.repeat(level);
        
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            formattedText += indent + text + '\n';
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          // Process by element type for better formatting
          switch (tagName) {
            case 'h1':
              const h1Text = element.textContent?.trim();
              if (h1Text) {
                formattedText += '\n' + h1Text.toUpperCase() + '\n';
                formattedText += '='.repeat(Math.min(h1Text.length, 80)) + '\n\n';
              }
              break;
              
            case 'h2':
              const h2Text = element.textContent?.trim();
              if (h2Text) {
                formattedText += '\n' + h2Text.toUpperCase() + '\n';
                formattedText += '-'.repeat(Math.min(h2Text.length, 80)) + '\n\n';
              }
              break;
              
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
              const hText = element.textContent?.trim();
              if (hText) {
                const level = parseInt(tagName.substring(1));
                const prefix = '#'.repeat(level) + ' ';
                formattedText += '\n' + prefix + hText + '\n\n';
              }
              break;
              
            case 'p':
              // Format paragraphs with proper wrapping at ~80 chars
              const pText = element.textContent?.trim();
              if (pText) {
                // Split into words and rebuild with wrapping
                const words = pText.split(/\s+/);
                let line = '';
                
                words.forEach(word => {
                  if (line.length + word.length + 1 > 80) {
                    formattedText += indent + line.trim() + '\n';
                    line = word + ' ';
                  } else {
                    line += word + ' ';
                  }
                });
                
                if (line.trim().length > 0) {
                  formattedText += indent + line.trim() + '\n';
                }
                
                formattedText += '\n';
              }
              break;
              
            case 'ul':
              formattedText += '\n';
              // Get all list items and format them
              Array.from(element.querySelectorAll('li')).forEach(item => {
                const itemText = item.textContent?.trim();
                if (itemText) {
                  formattedText += indent + '• ' + itemText + '\n';
                }
              });
              formattedText += '\n';
              break;
              
            case 'ol':
              formattedText += '\n';
              // Get all list items and format them with numbers
              Array.from(element.querySelectorAll('li')).forEach((item, index) => {
                const itemText = item.textContent?.trim();
                if (itemText) {
                  formattedText += indent + `${index + 1}. ` + itemText + '\n';
                }
              });
              formattedText += '\n';
              break;
              
            case 'hr':
              formattedText += '\n' + '-'.repeat(80) + '\n\n';
              break;
              
            case 'br':
              formattedText += '\n';
              break;
              
            case 'table':
              formattedText += '\n';
              
              // Get table headers
              const headers = Array.from(element.querySelectorAll('th'))
                .map(th => th.textContent?.trim() || '');
              
              // Calculate column widths (minimum 10 chars, maximum 30)
              const columnWidths = headers.map(header => 
                Math.min(30, Math.max(10, header.length + 2))
              );
              
              // If headers exist, output them
              if (headers.length > 0) {
                // Create header row
                let headerRow = '| ';
                headers.forEach((header, i) => {
                  headerRow += header.padEnd(columnWidths[i] - 2, ' ') + ' | ';
                });
                formattedText += indent + headerRow.trimEnd() + '\n';
                
                // Create separator row
                let separatorRow = '| ';
                columnWidths.forEach(width => {
                  separatorRow += '-'.repeat(width - 2) + ' | ';
                });
                formattedText += indent + separatorRow.trimEnd() + '\n';
              }
              
              // Get and format table rows
              Array.from(element.querySelectorAll('tr')).forEach(tr => {
                // Skip header row if it contains th elements
                if (tr.querySelector('th')) return;
                
                const cells = Array.from(tr.querySelectorAll('td'))
                  .map(td => td.textContent?.trim() || '');
                
                // Skip empty rows
                if (cells.every(cell => cell === '')) return;
                
                // Create data row with proper column widths
                let dataRow = '| ';
                cells.forEach((cell, i) => {
                  // Use header's column width or default to 15
                  const width = columnWidths[i] || 15;
                  dataRow += cell.padEnd(width - 2, ' ') + ' | ';
                });
                formattedText += indent + dataRow.trimEnd() + '\n';
              });
              
              formattedText += '\n';
              break;
              
            case 'blockquote':
              const quoteText = element.textContent?.trim();
              if (quoteText) {
                formattedText += '\n';
                // Split into lines and prefix each with a quote character
                const lines = quoteText.split('\n');
                lines.forEach(line => {
                  formattedText += indent + '> ' + line.trim() + '\n';
                });
                formattedText += '\n';
              }
              break;
              
            case 'pre':
            case 'code':
              const codeText = element.textContent?.trim();
              if (codeText) {
                formattedText += '\n```\n';
                formattedText += codeText + '\n';
                formattedText += '```\n\n';
              }
              break;
              
            default:
              // For other elements, process child nodes
              if (element.childNodes && element.childNodes.length > 0) {
                Array.from(element.childNodes).forEach(child => {
                  processNode(child, level);
                });
              }
              break;
          }
        }
      };
      
      // Start processing from the root
      Array.from(clone.childNodes).forEach(node => {
        processNode(node);
      });
      
      return formattedText;
    };
    
    // Get formatted content
    textContent += extractFormattedText(element);
    
    // Add a footer if specified
    if (mergedOptions.footerText) {
      textContent += '\n';
      textContent += '-'.repeat(80) + '\n';
      textContent += mergedOptions.footerText + '\n';
    }
    
    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename || 'document'}.txt`;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting to text:', error);
    throw new Error('Failed to export to text. Please try again.');
  }
}

