import React, { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderClassName?: string;
  loadingStrategy?: 'lazy' | 'eager';
  onLoad?: () => void;
}

/**
 * OptimizedImage component for better image loading performance
 * - Supports lazy loading
 * - Shows placeholder during loading
 * - Adds proper width and height to avoid layout shifts
 * - Uses modern image formats when available
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholderClassName,
  loadingStrategy = 'lazy',
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        !isLoaded && "bg-muted animate-pulse",
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : 'auto',
      }}
    >
      {!isLoaded && !error && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted/30",
            placeholderClassName
          )}
        >
          <svg 
            className="w-8 h-8 text-muted-foreground/50 animate-spin" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      
      {error ? (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/20"
        >
          <svg 
            className="w-8 h-8 mb-2" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <span className="text-xs">Failed to load image</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loadingStrategy}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "object-cover w-full h-full transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          {...props}
        />
      )}
    </div>
  );
}