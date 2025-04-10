import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A reusable suspense boundary for lazy-loaded components
 */
export function LazyLoader({ children, fallback }: LazyLoaderProps) {
  return (
    <Suspense
      fallback={fallback || (
        <div className="flex items-center justify-center w-full h-32">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

/**
 * Creates a lazy-loaded component with a built-in suspense boundary
 * @param factory Function that imports a component
 * @param options Configuration options
 * @returns Lazy loaded component with suspense boundary
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ReactNode;
    preload?: boolean;
  }
) {
  const LazyComponent = lazy(factory);
  
  // Optionally preload the component
  if (options?.preload) {
    factory();
  }
  
  // The returned component accepts any props that the original component accepts
  const LazyWithSuspense = (props: any) => {
    return (
      <LazyLoader fallback={options?.fallback}>
        <LazyComponent {...props} />
      </LazyLoader>
    );
  };
  
  return LazyWithSuspense;
}