import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiCache } from "./api-cache";
import { throttle } from "./optimization";

/**
 * Default cache durations for different types of data
 */
const CACHE_DURATIONS = {
  STATIC: 24 * 60 * 60 * 1000,  // 24 hours for static data
  STANDARD: 5 * 60 * 1000,      // 5 minutes for standard data
  SHORT: 1 * 60 * 1000,         // 1 minute for frequently updated data
};

/**
 * Resource-specific cache TTLs
 */
const RESOURCE_CACHE_TTLS: Record<string, number> = {
  "/api/grants": CACHE_DURATIONS.STANDARD,
  "/api/dashboard": CACHE_DURATIONS.SHORT,
  "/api/user": CACHE_DURATIONS.SHORT,
  "/api/proposals": CACHE_DURATIONS.STANDARD,
  "/api/reports": CACHE_DURATIONS.STANDARD,
};

/**
 * Checks response and throws appropriate errors if needed
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    
    // Try to parse the response to extract error message
    try {
      const errorData = JSON.parse(text);
      
      // Handle specific error codes with user-friendly messages
      if (res.status === 401 && errorData?.error?.code === "AUTHENTICATION_FAILED") {
        throw new Error("Invalid username or password. Please try again.");
      } else if (errorData?.error?.message) {
        throw new Error(errorData.error.message);
      }
    } catch (e) {
      // If parsing fails, just use the original text
    }
    
    // Default error message
    throw new Error(text || res.statusText);
  }
}

/**
 * Determines cache TTL based on resource URL
 */
function getCacheTTL(url: string): number | undefined {
  const pathname = typeof url === 'string' ? new URL(url, window.location.origin).pathname : '';
  
  // First check for exact matches
  if (RESOURCE_CACHE_TTLS[pathname]) {
    return RESOURCE_CACHE_TTLS[pathname];
  }
  
  // Then check for path patterns
  for (const [pattern, ttl] of Object.entries(RESOURCE_CACHE_TTLS)) {
    if (pathname.startsWith(pattern)) {
      return ttl;
    }
  }
  
  // Default: undefined means use the default TTL
  return undefined;
}

/**
 * Enhanced API request function with caching and throttling
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: {
    bypassCache?: boolean;
    cacheTTL?: number;
  } = {}
): Promise<Response> {
  const { bypassCache = false, cacheTTL } = options;
  
  // Only cache GET requests
  const useCache = method.toUpperCase() === 'GET' && !bypassCache;
  const cacheKey = `${method}-${url}-${JSON.stringify(data || '')}`;
  
  if (useCache) {
    const cachedResponse = apiCache.get<Response>(cacheKey);
    if (cachedResponse) {
      return cachedResponse.clone(); // Return a clone since Response can only be consumed once
    }
  }
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Cache successful GET responses
  if (useCache && res.ok) {
    // The TTL priority: explicit TTL > resource-specific TTL > default TTL
    const ttl = cacheTTL || getCacheTTL(url);
    apiCache.set(cacheKey, res.clone(), ttl);
  }
  
  return res;
}

// Throttled version of invalidateQueries to prevent excessive cache clearing
export const throttledInvalidateQueries = throttle(
  (queryClient: QueryClient, queryKey: any) => {
    queryClient.invalidateQueries({ queryKey });
  },
  500 // Throttle to once per 500ms max
);

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Enhanced query function with caching for React Query
 */
export const getQueryFn: <TData>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<TData> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const cacheKey = `GET-${url}`;
    
    // Check memory cache first
    const cachedData = apiCache.get<any>(cacheKey);
    if (cachedData !== null) {
      return cachedData as TData;
    }
    
    // If not in cache, fetch from network
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    // Cache the response data
    const ttl = getCacheTTL(url);
    apiCache.set(cacheKey, data, ttl);
    
    return data as TData;
  };

/**
 * Create and configure query client with optimized settings
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute stale time - after this, data is considered stale but still shown
      gcTime: 300000, // 5 minutes garbage collection time (renamed from cacheTime in v5)
      retry: false,
      // Use structural sharing if available for better performance
      structuralSharing: true, 
    },
    mutations: {
      retry: false,
    },
  },
});
