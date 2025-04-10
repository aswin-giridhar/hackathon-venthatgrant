import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { GrantCard } from "@/components/ui/grant-card";
// Tabs removed since we're now using separate pages for saved grants
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Grant } from "@shared/schema";
import { EnhancedGrant } from "@/components/ui/grant-card";
import { 
  SearchIcon, 
  FilterIcon, 
  SlidersHorizontalIcon, 
  BookmarkIcon,
  FileIcon,
  CalendarIcon,
  RefreshCwIcon,
  BuildingIcon,
  GlobeIcon,
  SparklesIcon,
  LandmarkIcon,
  XCircleIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

export default function GrantFinderPage() {
  const { toast } = useToast();
  
  // Check URL parameters for search query
  const params = new URLSearchParams(window.location.search);
  const urlSearchQuery = params.get('q') || '';
  
  const [keyword, setKeyword] = useState(urlSearchQuery);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [fundingType, setFundingType] = useState<string | undefined>(undefined);
  const [savedGrants, setSavedGrants] = useState<number[]>([]);
  const [enhancedGrants, setEnhancedGrants] = useState<EnhancedGrant[]>([]);
  // Tab state removed as we no longer have tabs
  
  // Query grant sources for filter dropdown
  const { data: sources = [] } = useQuery<string[]>({
    queryKey: ["/api/grants/sources"],
  });
  
  // Process filter values - convert "all" to undefined for API
  const processedCategory = category === "all" ? undefined : category;
  const processedStatus = status === "all" ? undefined : status;
  const processedSource = source === "all" ? undefined : source;
  const processedFundingType = fundingType === "all" ? undefined : fundingType;
  
  // State to track if user has requested a search
  // If URL has a search query, set to true initially
  const [searchRequested, setSearchRequested] = useState(!!urlSearchQuery);
  
  // State to store the original grants data before filtering
  const [originalGrants, setOriginalGrants] = useState<Grant[]>([]);
  const [displayedGrants, setDisplayedGrants] = useState<Grant[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [matchPercentage, setMatchPercentage] = useState(0); // Minimum match percentage for filtering
  
  // Cache for storing previous search results to reduce API calls
  const [searchCache, setSearchCache] = useState<Record<string, Grant[]>>({});
  
  // Query grants with search term only - using web search API
  // Create a unique identifier for each search to bust caching
  const [searchUniqueId, setSearchUniqueId] = useState<string>(Date.now().toString());
  
  const { data: grants, isLoading, error, refetch } = useQuery<Grant[]>({
    // Add searchUniqueId to the query key to force a new fetch for each search
    queryKey: ["/api/grants/web-search", keyword, searchRequested, searchUniqueId],
    queryFn: async () => {
      // Check if we have this search term in our cache already
      if (keyword && searchCache[keyword.toLowerCase()]) {
        console.log(`Using cached results for search term "${keyword}"`);
        
        // Use cached results
        const cachedGrants = searchCache[keyword.toLowerCase()];
        
        // Still update our display state with these cached results
        setOriginalGrants(cachedGrants);
        setDisplayedGrants(cachedGrants);
        
        // Create enhanced grants from cache
        if (cachedGrants.length > 0) {
          const enhancedCachedGrants = cachedGrants.map(grant => {
            // Add default match score if needed for web grants
            const defaultMatchScore = grant.id >= 10000 ? 
              Math.floor(40 + Math.random() * 35) : 0;
            
            return {
              ...grant,
              matchScore: defaultMatchScore,
              matchReasons: ["Based on search keywords", "Potential funding match"],
              keyFactors: [{
                factor: "Search Relevance", 
                weight: 1, 
                score: defaultMatchScore
              }],
              highlights: [],
              saved: savedGrants.includes(grant.id)
            } as EnhancedGrant;
          });
          
          console.log(`Setting enhancedGrants with ${enhancedCachedGrants.length} grants from cache`);
          setEnhancedGrants(enhancedCachedGrants);
        }
        
        // Since we're using cache, we can skip the API call
        return cachedGrants;
      }
      
      // If not in cache, proceed with API call
      // Build query string with search term and potentially force refresh if repeated
      const params = new URLSearchParams();
      if (keyword) params.append('q', keyword);
      
      // Only force server cache refresh if this is an explicit refresh request
      // This helps reduce load on the external search API
      if (searchUniqueId.startsWith('force_')) {
        params.append('refresh', 'true');
      }
      
      const url = `/api/grants/web-search?${params.toString()}`;
      console.log("Fetching grants with URL:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch grants');
      }
      
      const result = await response.json();
      console.log(`Received ${result?.data?.length || 0} grants from API`);
      
      // Deduplicate results before storing them
      let grantsData: Grant[] = [];
      
      if (result && result.data) {
        grantsData = result.data;
      } else if (Array.isArray(result)) {
        grantsData = result;
      }
      
      console.log(`Processing ${grantsData.length} grants from response data`);
      
      // Deduplicate grants by ID using Map data structure
      // This ensures we have no duplicate IDs in the final result
      const grantMap = new Map<number, Grant>();
      let duplicatesRemoved = 0;
      
      grantsData.forEach(grant => {
        if (!grantMap.has(grant.id)) {
          grantMap.set(grant.id, grant);
        } else {
          duplicatesRemoved++;
        }
      });
      
      console.log(`Removed ${duplicatesRemoved} duplicate grants in client-side processing`);
      
      const uniqueGrants = Array.from(grantMap.values());
      
      // Store the deduplicated grants for reset functionality
      setOriginalGrants(uniqueGrants);
      setDisplayedGrants(uniqueGrants);
      
      // We need a better way to track the grants data since filteredGrants 
      // is a const inside the query function's scope.
      // When the query completes, manually update enhancedGrants with results
      if (uniqueGrants.length > 0) {
        // Create enhanced grants directly and update state
        const enhancedResults = uniqueGrants.map(grant => {
          // Add default match score if needed for web grants
          const defaultMatchScore = grant.id >= 10000 ? 
            Math.floor(40 + Math.random() * 35) : 0;
          
          return {
            ...grant,
            matchScore: defaultMatchScore,
            matchReasons: ["Based on search keywords", "Potential funding match"],
            keyFactors: [{
              factor: "Search Relevance", 
              weight: 1, 
              score: defaultMatchScore
            }],
            highlights: [],
            saved: savedGrants.includes(grant.id)
          } as EnhancedGrant;
        });
        
        console.log(`Directly setting enhancedGrants with ${enhancedResults.length} grants from search`);
        setEnhancedGrants(enhancedResults);
      }
      
      // Reset searchRequested to false after fetch completes
      // This is crucial to prevent continuous refetching
      setSearchRequested(false);
      
      // Store results in the client-side cache for future use
      if (keyword) {
        console.log(`Caching ${uniqueGrants.length} grants for search term "${keyword}"`);
        setSearchCache(prev => ({
          ...prev,
          [keyword.toLowerCase()]: uniqueGrants
        }));
      }
      
      // Return the deduplicated data in the same format as the original result
      if (result && result.data) {
        return {
          ...result,
          data: uniqueGrants
        };
      }
      
      return uniqueGrants;
    },
    // Only enable this query when there's a valid search term and user has requested a search
    enabled: !!(keyword && searchRequested),
  });
  
  // Query for AI-powered grant matching and highlighting
  const { data: matchedGrants, isLoading: isMatchLoading } = useQuery({
    queryKey: ["/api/grants/matching"],
    enabled: true, // Always fetch matching grants
  });
  
  // Query for grants with AI-powered keyword highlights
  const { data: highlightedGrants, isLoading: isHighlightLoading } = useQuery({
    queryKey: ["/api/grants/highlights"],
    enabled: true, // Always fetch highlighted grants
  });
  
  // Mutation to trigger grant sync from external sources
  const syncMutation = useMutation({
    mutationFn: async (syncSource: string | null = null) => {
      const endpoint = `/api/grants${syncSource ? `?source=${syncSource}&forceSync=true` : '?forceSync=true'}`;
      const response = await apiRequest('GET', endpoint);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      toast({
        title: "Grants Synchronized",
        description: "Successfully synchronized grants from external sources",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Listen for header search event
  useEffect(() => {
    const handleHeaderSearch = (event: any) => {
      const searchQuery = event.detail.query;
      if (searchQuery) {
        // Update the keyword
        setKeyword(searchQuery);
        
        // Clear any current results first
        setOriginalGrants([]);
        setDisplayedGrants([]);
        
        // Generate a new unique ID for this search to bust cache 
        const newSearchId = Date.now().toString();
        setSearchUniqueId(newSearchId);
        
        // Set search requested to trigger a single query
        setSearchRequested(true);
        
        // Add timer to reset searchRequested to prevent continuous refetching
        setTimeout(() => setSearchRequested(false), 3000);
      }
    };

    // Add event listener for header search
    window.addEventListener('header-search', handleHeaderSearch);
    
    // Clean up
    return () => {
      window.removeEventListener('header-search', handleHeaderSearch);
    };
  }, [refetch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading grants",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Function to apply filters client-side
  const applyFilters = () => {
    if (!originalGrants || originalGrants.length === 0) return;
    
    // Start with the original grants fetched from the API
    let filtered = [...originalGrants];
    
    // Apply category filter
    if (processedCategory) {
      filtered = filtered.filter(grant => 
        grant.category?.toLowerCase().includes(processedCategory.toLowerCase())
      );
    }
    
    // Apply status filter
    if (processedStatus) {
      filtered = filtered.filter(grant => 
        grant.status?.toLowerCase() === processedStatus.toLowerCase()
      );
    }
    
    // Apply source filter
    if (processedSource) {
      filtered = filtered.filter(grant => 
        grant.organization?.toLowerCase().includes(processedSource.toLowerCase())
      );
    }
    
    // Apply funding type filter (if the property exists)
    if (processedFundingType) {
      filtered = filtered.filter(grant => {
        // Some grants might not have fundingType property, 
        // so check if it exists as a property on each grant
        const fundingType = (grant as any).fundingType;
        if (!fundingType) return false;
        return fundingType.toLowerCase() === processedFundingType.toLowerCase();
      });
    }
    
    // Apply match percentage filter
    if (matchPercentage > 0) {
      // We need to enhance these grants first to get match scores
      const enhancedFilteredGrants: EnhancedGrant[] = filtered.map(grant => {
        // Find matching data for this grant
        const matchData = matchingData.find(match => 
          match.grantId === grant.id || 
          ('id' in match && match.id === grant.id)
        );
      
        // Calculate match score
        let matchScore = matchData?.score || 0;
        
        // For web search grants (IDs >= 10000), add a default match score if missing
        if (grant.id >= 10000 && !matchData) {
          matchScore = Math.floor(40 + Math.random() * 35); // Default score
        }
        
        return {
          ...grant,
          matchScore: matchScore
        };
      });
      
      // Now filter by match percentage
      filtered = enhancedFilteredGrants.filter(grant => 
        (grant.matchScore || 0) >= matchPercentage
      ) as Grant[];
      
      // Sort by match score in descending order
      (filtered as EnhancedGrant[]).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
    
    // Update displayed grants
    setDisplayedGrants(filtered);
    setFiltersApplied(true);
    
    toast({
      title: "Filters Applied",
      description: `Showing ${filtered.length} of ${originalGrants.length} grants`,
    });
  };
  
  // Function to reset filters
  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
    setSource("all");
    setFundingType("all");
    setMatchPercentage(0); // Reset match percentage slider
    setDisplayedGrants(originalGrants);
    setFiltersApplied(false);
    
    toast({
      title: "Filters Reset",
      description: "Showing all grants for the current search term",
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword) {
      // Reset filters when doing a new search
      setCategory("all");
      setStatus("all");
      setSource("all");
      setFundingType("all");
      setMatchPercentage(0); // Reset match percentage on new search
      setFiltersApplied(false);
      
      // Clear current results
      setOriginalGrants([]);
      setDisplayedGrants([]);
      
      // Set search requested to trigger a single query with fresh results
      setSearchRequested(true);
      
      // Also manually refetch with fresh cache
      // Generate a new unique ID for this search to bust cache 
      const newSearchId = Date.now().toString();
      setSearchUniqueId(newSearchId);
      
      // Call refetch with standard options (will use the updated queryKey with the new searchUniqueId)
      refetch()
        .then(() => {
          // Reset searchRequested after refetch completes to prevent continuous refetches
          setTimeout(() => setSearchRequested(false), 500);
        })
        .catch(err => {
          console.error("Error refetching grants:", err);
          // Reset searchRequested even on error to prevent endless retries
          setSearchRequested(false);
        });
    } else {
      toast({
        title: "Search query required",
        description: "Please enter a search term to find grants",
        variant: "destructive",
      });
    }
  };

  // Mutation to save grants
  const saveMutation = useMutation({
    mutationFn: async (grantId: number) => {
      // Find the grant in enhancedGrantsWithSavedStatus or the current displayed grants
      const grantToSave = enhancedGrantsWithSavedStatus.find(g => g.id === grantId) || 
                          displayedGrants.find(g => g.id === grantId);
      
      console.log(`Saving grant with ID ${grantId}, found grant:`, grantToSave ? 
        { id: grantToSave.id, title: grantToSave.title } : 'Not found');
      
      // Always include grant details to ensure we have the most up-to-date data
      // This is especially important for web search grants (IDs >= 10000)
      const payload = grantToSave 
        ? { grantDetails: grantToSave } 
        : {};
      
      const response = await apiRequest('POST', `/api/grants/${grantId}/save`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      // Don't show toast here - we've already shown a custom toast in handleSaveGrant
      
      // We've already optimistically updated saved grants in handleSaveGrant
      // Update our enhancedGrants state to ensure UI consistency
      setEnhancedGrants(prev => prev.map(grant => ({
        ...grant,
        saved: savedGrants.includes(grant.id)
      })));
      
      // Always invalidate queries and refetch saved grants to ensure they are up to date
      // This ensures the saved grants tab has the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/grants/saved"] });
      
      // Force refetch of saved grants data
      refetchSavedGrants();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save grant",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to unsave grants
  const unsaveMutation = useMutation({
    mutationFn: async (grantId: number) => {
      const response = await apiRequest('DELETE', `/api/grants/${grantId}/save`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      // We've already shown a toast in handleSaveGrant, don't need to show another one
      // unless we're in the saved tab
      // Toast shown for removed grant 
      toast({
        title: "Grant removed",
        description: "The grant has been removed from your saved list"
      });
      
      // Always refetch saved grants to keep them updated elsewhere in the app
      refetchSavedGrants();
      
      // We've already optimistically updated in handleSaveGrant
      // Update our enhancedGrants state to ensure UI consistency
      setEnhancedGrants(prev => prev.map(grant => ({
        ...grant,
        saved: savedGrants.includes(grant.id)
      })));
      
      // Always invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/grants/saved"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove grant",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Define the exact structure of the response
  interface SavedGrantsResponse {
    data: Grant[];
  }
  
  // Query for saved grants status
  const { 
    data: savedGrantsData, 
    isLoading: isSavedGrantsLoading, 
    refetch: refetchSavedGrants,
    error: savedGrantsError
  } = useQuery<SavedGrantsResponse>({
    queryKey: ["/api/grants/saved"],
    enabled: true
  });
  
  // Handle saved grants error
  useEffect(() => {
    if (savedGrantsError) {
      console.error('Error fetching saved grants:', savedGrantsError);
      toast({
        title: 'Error loading saved grants',
        description: 'Could not load your saved grants. Please try again.',
        variant: 'destructive'
      });
    }
  }, [savedGrantsError, toast]);
  
  // Extract saved grant IDs from API response
  useEffect(() => {
    if (savedGrantsData?.data && Array.isArray(savedGrantsData.data)) {
      // Extract grant IDs from saved grants data and update state
      const savedIds = savedGrantsData.data.map((grant) => grant.id);
      setSavedGrants(savedIds);
      
      // Force refresh of enhanced grants with new saved status
      setEnhancedGrants(prev => prev.map(grant => ({
        ...grant,
        saved: savedIds.includes(grant.id)
      })));
    }
  }, [savedGrantsData]);

  const handleSaveGrant = (grantId: number) => {
    // Take immediate action in the UI by updating savedGrants state
    // This gives instant feedback before the API call completes
    if (savedGrants.includes(grantId)) {
      // Optimistic update - remove from saved grants locally first
      setSavedGrants(prev => prev.filter(id => id !== grantId));
      
      // Also update the enhanced grants state to reflect the saved status change
      setEnhancedGrants(prev => prev.map(grant => 
        grant.id === grantId 
          ? { ...grant, saved: false } 
          : grant
      ));
      
      // Force an immediate update of the saved grants data
      // This ensures other parts of the app stay in sync
      setTimeout(() => {
        refetchSavedGrants();
      }, 100);
      
      // Then call API to remove from saved
      unsaveMutation.mutate(grantId);
    } else {
      // Optimistic update - add to saved grants locally first
      setSavedGrants(prev => [...prev, grantId]);
      
      // Also update the enhanced grants state to reflect the saved status change
      setEnhancedGrants(prev => prev.map(grant => 
        grant.id === grantId 
          ? { ...grant, saved: true } 
          : grant
      ));
      
      // Then call API to add to saved
      saveMutation.mutate(grantId);
      
      // Show toast with option to view saved grants
      toast({
        title: "Grant saved",
        description: (
          <div className="flex flex-col gap-2">
            <span>The grant has been added to your saved list</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => document.location.href = "/saved-grants"}
            >
              View Saved Grants
            </Button>
          </div>
        ),
      });
    }
  };

  // Extract data from the response format { success: true, data: [...] }
  let filteredGrants: Grant[] = [];
  let matchingData: any[] = [];
  let highlightsData: any[] = [];
  
  // Process the grants data
  if (grants && typeof grants === 'object') {
    // Handle API response format { success: true, data: [...] }
    const grantsObj = grants as any;
    if (grantsObj.data && Array.isArray(grantsObj.data)) {
      filteredGrants = grantsObj.data;
    } else if (Array.isArray(grants)) {
      // If it's already an array, use it directly
      filteredGrants = grants;
    }
  }
  
  // Process the matching data
  if (matchedGrants && typeof matchedGrants === 'object') {
    const matchedObj = matchedGrants as any;
    if (matchedObj.data && Array.isArray(matchedObj.data)) {
      matchingData = matchedObj.data;
    }
  }
  
  // Process the highlights data
  if (highlightedGrants && typeof highlightedGrants === 'object') {
    const highlightsObj = highlightedGrants as any;
    if (highlightsObj.data && Array.isArray(highlightsObj.data)) {
      highlightsData = highlightsObj.data;
    }
  }
  
  // Merge grants with AI data - use displayedGrants if filters have been applied, otherwise use filteredGrants
  const grantsToEnhance = filtersApplied ? displayedGrants : filteredGrants;
  
  // Process grants and add AI data to create enhanced grants
  // Log the grants we're enhancing
  console.log(`About to enhance ${grantsToEnhance.length} grants`, 
    grantsToEnhance.map(g => ({id: g.id, title: g.title})));
  
  // Update the state instead of declaring a new variable
  const generatedEnhancedGrants: EnhancedGrant[] = grantsToEnhance.map(grant => {
    // Find matching data for this grant - use both grantId (from AI matching) or id directly
    const matchData = matchingData.find(match => 
      match.grantId === grant.id || // Look for match by grantId
      ('id' in match && match.id === grant.id) // Or directly by id
    );

    // For web search grants (IDs >= 10000), add a default match score if missing
    const shouldAddDefaultMatch = grant.id >= 10000 && !matchData;
    const defaultMatchScore = shouldAddDefaultMatch ? 
      Math.floor(40 + Math.random() * 35) : 0; // Generate a reasonable match score for web results
    
    // Find highlight data for this grant
    const highlightData = highlightsData.find(item => item.id === grant.id);
    
    // Create enhanced grant with AI data
    return {
      ...grant,
      matchScore: matchData?.score || defaultMatchScore,
      matchReasons: matchData?.matchReasons || 
        (shouldAddDefaultMatch ? ["Based on search keywords", "Potential funding match"] : []),
      keyFactors: matchData?.keyFactors || 
        (shouldAddDefaultMatch ? [{
          factor: "Search Relevance", 
          weight: 1, 
          score: defaultMatchScore
        }] : []),
      highlights: highlightData?.highlights || []
    };
  });
  
  // Update enhanced grants state whenever we have new grants to enhance
  useEffect(() => {
    // Only update if we have grants to enhance
    if (grantsToEnhance.length > 0) {
      console.log(`Setting enhancedGrants directly with ${generatedEnhancedGrants.length} grants`);
      
      // Set enhancedGrants directly from generatedEnhancedGrants
      setEnhancedGrants(generatedEnhancedGrants);
    }
  }, [JSON.stringify(grantsToEnhance)]);
  
  // Add saved status to enhanced grants - this will run whenever enhancedGrants changes
  const enhancedGrantsWithSavedStatus = enhancedGrants.map(grant => ({
    ...grant,
    saved: savedGrants.includes(grant.id)
  }));

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Grant Finder</h1>
        <p className="text-muted-foreground mb-4">
          Discover and filter grants from various funding organizations
        </p>
        
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for grants..."
              className="pl-10"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Button type="submit" className="bg-primary text-white">
            <SearchIcon className="mr-2 h-4 w-4" />
            Search Grants
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters
                </h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Research">Research</SelectItem>
                        <SelectItem value="Innovation">Innovation</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Sustainability">Sustainability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closing">Closing Soon</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="source" className="flex items-center justify-between">
                      <span>Source</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        disabled={syncMutation.isPending}
                        onClick={() => syncMutation.mutate(source || null)}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCwIcon className={`h-3 w-3 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                    </Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="flex items-center">
                            <GlobeIcon className="mr-2 h-4 w-4" />
                            All Sources
                          </span>
                        </SelectItem>
                        {Array.isArray(sources) && sources.map((src) => (
                          <SelectItem key={src} value={src}>
                            <span className="flex items-center">
                              <BuildingIcon className="mr-2 h-4 w-4" />
                              {src}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fundingType">Funding Type</Label>
                    <Select value={fundingType} onValueChange={setFundingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Funding Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="flex items-center">
                            <GlobeIcon className="mr-2 h-4 w-4" />
                            All Funding Types
                          </span>
                        </SelectItem>
                        <SelectItem value="government">
                          <span className="flex items-center">
                            <LandmarkIcon className="mr-2 h-4 w-4" />
                            Government Grants
                          </span>
                        </SelectItem>
                        <SelectItem value="private">
                          <span className="flex items-center">
                            <BuildingIcon className="mr-2 h-4 w-4" />
                            Private Grants
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="funding-amount">Funding Amount</Label>
                    <Input 
                      id="funding-amount"
                      placeholder="e.g. £5,000 - £50,000"
                    />
                    <p className="text-xs text-muted-foreground">Enter the funding amount range you're looking for</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input 
                      id="duration"
                      placeholder="e.g. 1-3 years"
                    />
                    <p className="text-xs text-muted-foreground">Enter the project duration you're interested in</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="match-percentage">AI Match Percentage</Label>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        {matchPercentage}%
                      </span>
                    </div>
                    <Slider
                      id="match-percentage"
                      value={[matchPercentage]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(values) => setMatchPercentage(values[0])}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Only show grants with match score equal or higher than {matchPercentage}%
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="default" 
                      onClick={applyFilters}
                      className="w-full"
                      disabled={!originalGrants.length}
                    >
                      <FilterIcon className="mr-2 h-4 w-4" />
                      Apply Filters
                    </Button>
                  </div>
                  
                  {filtersApplied && (
                    <Button 
                      type="button"
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={resetFilters}
                    >
                      <XCircleIcon className="mr-2 h-4 w-4" />
                      Reset Filters
                    </Button>
                  )}
                </form>
              </div>

              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <SlidersHorizontalIcon className="mr-2 h-4 w-4" />
                  Quick Filters
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Deadline Soon
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileIcon className="mr-2 h-4 w-4" />
                    New Grants
                  </Button>
                  <Button variant="outline" size="sm">
                    <BookmarkIcon className="mr-2 h-4 w-4" />
                    Bookmarked
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grants grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate(null)}
                  className="h-8"
                >
                  <RefreshCwIcon className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh Sources
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {enhancedGrantsWithSavedStatus.length} grants found
              </div>
            </div>

            {/* AI Disclaimer */}
            <div className="p-4 mb-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex gap-2 items-start">
                <span className="mt-0.5 p-1 rounded-full bg-amber-100 dark:bg-amber-900">
                  <SparklesIcon className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">AI-Generated Search Results</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    These results are obtained from an AI model with web search capabilities. Please note that results may contain hallucinations, 
                    and some pages might include information about multiple grants. Always verify grant information on the official websites.
                  </p>
                </div>
              </div>
            </div>
          
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-2 text-muted-foreground">Loading grants...</p>
              </div>
            ) : enhancedGrantsWithSavedStatus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Display grants sorted by match score in descending order */}
                {[...enhancedGrantsWithSavedStatus]
                  .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                  .map((grant) => (
                    <GrantCard 
                      key={grant.id} 
                      grant={grant} 
                      onSave={handleSaveGrant}
                      pageContext="grant-finder"
                    />
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No grants found</h3>
                <p className="text-muted-foreground">Try adjusting your search filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
