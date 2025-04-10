/**
 * Collection of utilities for optimizing application performance
 */

/**
 * Creates a debounced version of a function that delays invocation until after 
 * the specified wait time has elapsed since the last time it was invoked
 * 
 * @param func The function to debounce
 * @param wait The wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled version of a function that only invokes the function 
 * at most once per every specified time period
 * 
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const now = Date.now();
    const timeLeft = limit - (now - lastCall);
    
    if (timeLeft <= 0) {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      func(...args);
    } else if (timeout === null) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        func(...args);
      }, timeLeft);
    }
  };
}

/**
 * Simple memoization for expensive pure functions
 * 
 * @param func The function to memoize
 * @returns Memoized function with cached results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}