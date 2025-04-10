/**
 * Utility functions for image optimization
 */

/**
 * Compresses and optimizes an image to a target size while maintaining quality
 * 
 * @param file The image file to compress
 * @param maxSizeKB Maximum target size in kilobytes
 * @param quality Initial quality to try (0-1)
 * @returns Promise resolving to a compressed File object
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 500,
  quality: number = 0.8
): Promise<File> {
  // Skip compression for small files or non-image files
  if (file.size <= maxSizeKB * 1024 || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calculate dimensions while maintaining aspect ratio
        const maxDimension = 1920; // Limit max dimension to 1920px
        let width = img.width;
        let height = img.height;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }
        
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image to canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to compress with initial quality
        let currentQuality = quality;
        const attemptCompression = () => {
          const dataUrl = canvas.toDataURL(file.type, currentQuality);
          
          // Convert data URL to Blob
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: mimeType });
          
          // Check if the size is acceptable
          if (blob.size <= maxSizeKB * 1024 || currentQuality <= 0.1) {
            // Create a new file from the compressed blob
            const compressedFile = new File([blob], file.name, { 
              type: file.type,
              lastModified: file.lastModified 
            });
            
            resolve(compressedFile);
          } else {
            // Try again with lower quality
            currentQuality -= 0.1;
            attemptCompression();
          }
        };
        
        attemptCompression();
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Converts an image to WebP format for better compression
 * 
 * @param file The image file to convert
 * @param quality Quality of WebP output (0-1)
 * @returns Promise resolving to a WebP File object
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/') || file.type === 'image/webp') {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert to WebP format
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        
        // Convert data URL to Blob
        const byteString = atob(webpDataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: 'image/webp' });
        
        // Create a new file from the WebP blob, changing extension to .webp
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const webpFile = new File([blob], `${nameWithoutExt}.webp`, { 
          type: 'image/webp',
          lastModified: file.lastModified 
        });
        
        resolve(webpFile);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Processes an image for optimal web use - compresses and converts to WebP
 * 
 * @param file The image file to process
 * @returns Promise resolving to a processed File object
 */
export async function optimizeImageForWeb(file: File): Promise<File> {
  try {
    // First compress the image
    const compressedFile = await compressImage(file);
    
    // Then convert to WebP if browser supports it
    if (typeof self !== 'undefined' && 'createImageBitmap' in self) {
      return await convertToWebP(compressedFile);
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Image optimization failed:', error);
    return file;
  }
}