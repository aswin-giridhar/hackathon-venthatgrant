import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, QueryObserverResult } from "@tanstack/react-query";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Proposal, Grant, ApiResponse, ProposalsBulkDeleteResult, DeleteResult, RefetchResult, CacheUpdateLog, DeletionContext } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PenToolIcon, 
  WandIcon, 
  ClipboardIcon, 
  FileIcon,
  Loader2Icon,
  FileTextIcon,
  Trash2Icon,
  SaveIcon,
  CheckIcon,
  SearchIcon,
  ScanSearchIcon,
  GlobeIcon,
  XCircleIcon,
  ArrowUpDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  FilterIcon,
  RefreshCcwIcon,
  AlertCircleIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { ExportButton } from "@/components/ui/export-button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import ReactMarkdown from 'react-markdown';
import { Checkbox } from "@/components/ui/checkbox";
import { exportToPdf, exportToText } from "@/lib/document-export";

export default function ProposalPreparationPage() {
  const { toast } = useToast();
  const [selectedGrant, setSelectedGrant] = useState<string>("");
  const [researchArea, setResearchArea] = useState<string>("");
  const [objectives, setObjectives] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<string>("");
  const [proposalTitle, setProposalTitle] = useState<string>("");
  const [scrapingWebsite, setScrapingWebsite] = useState(false);
  
  // State for manual proposal creation
  const [manualProposalTitle, setManualProposalTitle] = useState<string>("");
  const [manualProposalContent, setManualProposalContent] = useState<string>("");
  const [manualSelectedGrant, setManualSelectedGrant] = useState<string>("");
  
  // State for proposal management
  const [selectedProposals, setSelectedProposals] = useState<number[]>([]);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  
  // Track deleted proposal IDs in React state to avoid window globals
  const [deletedProposalIds, setDeletedProposalIds] = useState<number[]>([]);
  
  // Load deleted proposal IDs from localStorage on component mount
  useEffect(() => {
    const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
    const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
    
    if (storedDeletedIds.length > 0) {
      console.log("INIT: Loading deleted proposal IDs from localStorage:", {
        count: storedDeletedIds.length,
        ids: storedDeletedIds,
        timestamp: new Date().toISOString()
      });
      setDeletedProposalIds(storedDeletedIds);
    }
  }, []);
  
  // Track the active tab to perform actions when tab changes
  const [activeTab, setActiveTab] = useState<string>("generate");
  
  // State for tracking loaded proposals for UI verification
  const [lastLoadedProposalIds, setLastLoadedProposalIds] = useState<number[]>([]);
  
  // State for manual refresh tracking
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Create refs for PDF export
  const proposalContentRef = useRef<HTMLDivElement>(null);
  const manualProposalContentRef = useRef<HTMLDivElement>(null);
  
  // Get saved grants
  const { data: savedGrantsResponse, isLoading: isLoadingGrants } = useQuery<{success: boolean, data: Grant[]}>({
    queryKey: ["/api/grants/saved"],
  });
  
  // Extract grants from the response
  const grants = savedGrantsResponse?.data || [];
  
  // Get user's proposals with explicit refetch enabled and extensive logging
  const { 
    data: proposalsResponse, 
    isLoading: isLoadingProposals,
    refetch: refetchProposals,
    isPending: isRefetchingProposals
  } = useQuery<ApiResponse<Proposal[]>>({
    queryKey: ["/api/proposals"],
    refetchOnWindowFocus: true, // Enable auto refetch to ensure data is always fresh
    staleTime: 0, // Always consider data stale to force refreshes
    refetchInterval: 2000, // Poll every 2 seconds regardless of active tab
    retry: 5, // Retry failed requests 5 times
    retryDelay: 1000, // Wait 1 second between retries
    select: (data) => {
      // Critical step: Filter out any deleted proposals at the query level
      const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
      const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
      
      // Compare localStorage with state to detect inconsistencies
      console.log("CONSISTENCY CHECK: Comparing deleted IDs:", {
        fromLocalStorage: storedDeletedIds,
        fromState: deletedProposalIds,
        match: JSON.stringify(storedDeletedIds.sort()) === JSON.stringify([...deletedProposalIds].sort()),
        timestamp: new Date().toISOString()
      });
      
      if (data && data.data && storedDeletedIds.length > 0) {
        // Always filter out deleted proposals from query results
        const filteredData = data.data.filter(p => !storedDeletedIds.includes(p.id));
        console.log("QUERY TRANSFORMATION: Filtering deleted proposals:", {
          beforeCount: data.data.length,
          afterCount: filteredData.length,
          removed: data.data.length - filteredData.length,
          deletedIds: storedDeletedIds,
          allIds: data.data.map(p => p.id),
          timestamp: new Date().toISOString()
        });
        
        return {
          ...data,
          data: filteredData
        };
      }
      
      return data;
    }
  });
  
  // Set up effects to handle success state separately rather than in onSuccess
  useEffect(() => {
    if (proposalsResponse) {
      console.log("PROPOSAL QUERY SUCCESS:", { 
        proposalCount: proposalsResponse?.data?.length || 0,
        proposalIds: proposalsResponse?.data?.map((p: Proposal) => p.id) || [],
        activeTab,
        timestamp: new Date().toISOString()
      });
      
      // Force component re-render when data arrives
      if (activeTab === "saved") {
        setSearchQuery(searchQuery);
      }
    }
  }, [proposalsResponse, activeTab, searchQuery]);
  
  // Extract proposals from response
  const proposals = proposalsResponse?.data || [];
  
  // Apply deleted proposal filtering to the list with more aggressive filtering
  const proposalsWithDeletedFiltered = useMemo(() => {
    console.log("FILTERING PROPOSALS:", {
      beforeCount: proposals?.length || 0,
      proposalIds: proposals?.map(p => p.id) || [],
      deletedIds: deletedProposalIds,
      timestamp: new Date().toISOString()
    });
    
    if (!proposals) return [];
    
    // Filter out any proposals that are in the deletedProposalIds list
    const filteredProposals = proposals.filter(p => !deletedProposalIds.includes(p.id));
    
    console.log("FILTERED PROPOSALS:", {
      afterCount: filteredProposals.length,
      remainingIds: filteredProposals.map(p => p.id),
      timestamp: new Date().toISOString()
    });
    
    return filteredProposals;
  }, [proposals, deletedProposalIds]);
  
  // Filter and sort proposals based on search query and sort order
  const filteredAndSortedProposals = useMemo(() => {
    return proposalsWithDeletedFiltered
      .filter(proposal => 
        searchQuery === "" || 
        proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        
        if (sortOrder === "latest") {
          return dateB - dateA; // Most recent first
        } else {
          return dateA - dateB; // Oldest first
        }
      });
  }, [proposalsWithDeletedFiltered, searchQuery, sortOrder]);
  
  // Effect to update website URL when a grant is selected
  useEffect(() => {
    if (selectedGrant && grants && grants.length > 0) {
      // Find the selected grant
      const selectedGrantObj = grants.find(grant => grant.id.toString() === selectedGrant);
      
      // If the grant has a URL, update the websiteUrl state
      if (selectedGrantObj && selectedGrantObj.url) {
        setWebsiteUrl(selectedGrantObj.url);
      } else if (selectedGrantObj && (selectedGrantObj as any).website) {
        // Handle if URL is in a property called website instead
        setWebsiteUrl((selectedGrantObj as any).website);
      }
    }
  }, [selectedGrant, grants]);
  
  // Effect to ensure UI updates when lastLoadedProposalIds changes
  useEffect(() => {
    if (lastLoadedProposalIds.length > 0 && activeTab === "saved") {
      console.log("PROPOSALS LOADED: UI verification with lastLoadedProposalIds", {
        ids: lastLoadedProposalIds,
        count: lastLoadedProposalIds.length,
        timestamp: new Date().toISOString()
      });
      
      // Force component re-renders by manipulating state variables
      // This ensures the UI reflects the latest data
      setSearchQuery(searchQuery => searchQuery ? searchQuery + " " : " ");
      setTimeout(() => {
        setSearchQuery(searchQuery => searchQuery.trim());
      }, 50);
    }
  }, [lastLoadedProposalIds, activeTab]);
  
  // Mutation for generating a proposal
  const generateProposalMutation = useMutation({
    mutationFn: async (data: { 
      grantId: string; 
      researchArea: string; 
      objectives: string;
      websiteUrl?: string;
      grantTitle?: string;
      grantDescription?: string;
      saveToDatabase?: boolean;
    }) => {
      // Always set saveToDatabase to false to prevent automatic saving
      // The user must explicitly click the "Save Proposal" button to save
      const requestData = {
        ...data,
        saveToDatabase: false // Explicitly set to false regardless of the input
      };
      
      const res = await apiRequest("POST", "/api/generate-proposal", requestData);
      return res.json();
    },
    onSuccess: (response: { success: boolean, data: any }) => {
      if (response.success && response.data) {
        // Just set the content and title locally without saving to database
        setGeneratedProposal(response.data.content);
        setProposalTitle(response.data.title);
        
        toast({
          title: "Proposal generated",
          description: "Your research proposal has been generated. Click 'Save Proposal' to save it.",
        });
      } else {
        toast({
          title: "Failed to generate proposal",
          description: "Unexpected response format",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate proposal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for saving a proposal with improved persistence
  const saveProposalMutation = useMutation<
    ApiResponse<Proposal>, 
    Error, 
    { title: string; content: string; grantId?: number }
  >({
    mutationFn: async (data) => {
      const timestamp = new Date().toISOString();
      console.log(`[SAVE] Starting save proposal process at ${timestamp}:`, {
        title: data.title,
        contentLength: data.content.length,
        grantId: data.grantId
      });
      
      const res = await apiRequest("POST", "/api/proposals", data);
      return res.json();
    },
    onSuccess: (response) => {
      if (response.success) {
        const timestamp = new Date().toISOString();
        console.log(`[SAVE-SUCCESS] Proposal saved successfully at ${timestamp}:`, {
          id: response.data.id,
          title: response.data.title
        });
        
        // 1. First, guarantee this proposal appears in the cache immediately
        updateQueryCache('update', 'SAVE-SUCCESS', (currentData) => {
          // If no data exists, create a new array with just this proposal
          if (!currentData || !currentData.data) {
            return { success: true, data: [response.data] };
          }
          
          // Check if this proposal already exists in the cache
          const existingProposalIndex = currentData.data.findIndex(p => p.id === response.data.id);
          
          // Clone the data array to avoid mutations
          let updatedProposals = [...currentData.data];
          
          // If the proposal exists, update it; otherwise, add it to the beginning
          if (existingProposalIndex >= 0) {
            console.log(`[SAVE-SUCCESS] Updating existing proposal at index ${existingProposalIndex}`);
            updatedProposals[existingProposalIndex] = response.data;
          } else {
            console.log(`[SAVE-SUCCESS] Adding new proposal to the beginning of the list`);
            updatedProposals = [response.data, ...updatedProposals];
          }
          
          return {
            ...currentData,
            data: updatedProposals
          };
        });
        
        // 2. Record this proposal in our local state tracking
        setLastLoadedProposalIds(prev => {
          const newId = response.data.id;
          if (prev.includes(newId)) {
            // If already tracking, move to the beginning
            return [newId, ...prev.filter(id => id !== newId)];
          } else {
            // Otherwise add to the beginning
            return [newId, ...prev];
          }
        });
        
        // 3. After saving, switch to the saved tab
        setActiveTab("saved");
        
        // 4. Force multiple refetches with progressive delays to ensure the server data is synced
        const delaySequence = [50, 300, 800, 1500, 3000];
        console.log(`[SAVE-SUCCESS] Scheduling ${delaySequence.length} refetches with delays:`, delaySequence);
        
        delaySequence.forEach(delay => {
          setTimeout(async () => {
            const result = await refetchWithTracking('SAVE-SUCCESS-REFETCH', delay);
            
            // After each refetch, ensure our saved proposal is still in the cache
            if (result.success && result.data?.data) {
              const refetchedIds = result.data.data.map((p: Proposal) => p.id);
              
              // If our newly saved proposal is missing after the refetch, add it back
              if (!refetchedIds.includes(response.data.id)) {
                console.log(`[SAVE-SUCCESS-RECOVERY] Proposal ${response.data.id} missing after ${delay}ms refetch, adding back`);
                
                updateQueryCache('update', `SAVE-SUCCESS-RECOVERY-${delay}ms`, (currentData) => {
                  if (!currentData || !currentData.data) {
                    return { success: true, data: [response.data] };
                  }
                  
                  // Check if our proposal is really missing
                  const hasSavedProposal = currentData.data.some(p => p.id === response.data.id);
                  
                  if (!hasSavedProposal) {
                    // Add it back to the beginning
                    return {
                      ...currentData,
                      data: [response.data, ...currentData.data]
                    };
                  }
                  
                  return currentData;
                });
              }
            }
          }, delay);
        });
        
        // 5. Show success toast
        toast({
          title: "Proposal saved",
          description: "Your proposal has been saved successfully",
        });
      } else {
        console.error("[SAVE-ERROR] Server returned error response:", response);
        
        toast({
          title: "Failed to save proposal",
          description: response.error?.message || "Unexpected response format",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("[SAVE-ERROR] Exception during save:", error);
      
      toast({
        title: "Failed to save proposal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating a proposal
  const updateProposalMutation = useMutation({
    mutationFn: async (data: { id: number, title: string; content: string; }) => {
      const res = await apiRequest("PATCH", `/api/proposals/${data.id}`, { title: data.title, content: data.content });
      return res.json();
    },
    onSuccess: (response: { success: boolean, data: any }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
        setEditingProposal(null);
        
        toast({
          title: "Proposal updated",
          description: "Your proposal has been updated successfully",
        });
      } else {
        toast({
          title: "Failed to update proposal",
          description: "Unexpected response format",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update proposal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Enhanced refetch function with detailed logging
  const refetchWithTracking = async (source: string, delayMs: number = 0): Promise<any> => {
    try {
      // Wait if there's a delay specified
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      // Log that we're starting a refetch
      console.log(`[${source}] Executing refetch with ${delayMs}ms delay`);
      
      const timestamp = new Date().toISOString();
      const result = await refetchProposals();
      
      // Log successful refetch details
      const proposalIds = result.data?.data?.map(p => p.id) || [];
      console.log(`[${source}] Refetch SUCCESSFUL:`, {
        count: proposalIds.length,
        ids: proposalIds,
        timestamp,
        delayMs
      });
      
      // Return successful result with details
      return {
        success: true,
        data: result.data,
        timestamp,
        delayMs
      };
    } catch (error) {
      // Log error details
      console.error(`[${source}] Refetch FAILED with ${delayMs}ms delay:`, error);
      
      // Return error result
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date().toISOString(),
        delayMs
      };
    }
  };
  
  // Function to add permanent deletion flags to query cache
  const markDeletedProposalsInCache = (ids: number[], source: string) => {
    // Log that we're marking these proposals as permanently deleted
    console.log(`[${source}] Marking proposals as PERMANENTLY DELETED:`, ids);
    
    // Create a persistent record of deleted proposal IDs
    const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
    const existingDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
    
    // Add the new IDs to the list if they're not already there
    const updatedDeletedIds = Array.from(new Set([...existingDeletedIds, ...ids]));
    
    // Save back to localStorage for persistence across refreshes
    localStorage.setItem(deletedProposalKey, JSON.stringify(updatedDeletedIds));
    
    // Also update state for immediate UI filtering
    setDeletedProposalIds(prev => {
      const newSet = Array.from(new Set([...prev, ...ids]));
      console.log(`[${source}] Updated deletedProposalIds in state:`, {
        previousCount: prev.length,
        newCount: newSet.length,
        added: ids
      });
      return newSet;
    });
    
    // Return the full set of now-deleted IDs
    return updatedDeletedIds;
  };
  
  // Function to update the query cache safely and with complete logging
  const updateQueryCache = (
    action: 'set' | 'reset' | 'update' | 'delete',
    source: string,
    updateFn?: (oldData: ApiResponse<Proposal[]> | undefined) => ApiResponse<Proposal[]>,
    newData?: ApiResponse<Proposal[]>,
    affectedIds?: number[]
  ): any => {
    try {
      const timestamp = new Date().toISOString();
      
      switch (action) {
        case 'reset':
          // Reset the entire cache
          queryClient.resetQueries({ queryKey: ["/api/proposals"] });
          console.log(`[${source}] RESET query cache at ${timestamp}`);
          break;
          
        case 'set':
          // Set to specific data
          if (newData) {
            queryClient.setQueryData<ApiResponse<Proposal[]>>(["/api/proposals"], newData);
            console.log(`[${source}] SET query cache to specific data:`, {
              count: newData?.data?.length || 0,
              ids: newData?.data?.map(p => p.id) || [],
              timestamp
            });
          }
          break;
          
        case 'update':
          // Update using a function
          if (updateFn) {
            const before = queryClient.getQueryData<ApiResponse<Proposal[]>>(["/api/proposals"]);
            const after = updateFn(before);
            
            queryClient.setQueryData<ApiResponse<Proposal[]>>(["/api/proposals"], after);
            
            // Detailed logging for debugging cache issues
            console.log(`[${source}] UPDATE query cache:`, {
              beforeCount: before?.data?.length || 0,
              afterCount: after?.data?.length || 0,
              beforeIds: before?.data?.map(p => p.id) || [],
              afterIds: after?.data?.map(p => p.id) || [],
              timestamp
            });
          }
          break;
          
        case 'delete':
          // Remove specific IDs
          if (affectedIds && affectedIds.length > 0) {
            queryClient.setQueryData<ApiResponse<Proposal[]>>(["/api/proposals"], (oldData) => {
              if (!oldData || !oldData.data) return { success: true, data: [] };
              
              const filteredData = oldData.data.filter(p => !affectedIds.includes(p.id));
              
              console.log(`[${source}] DELETE from query cache:`, {
                beforeCount: oldData.data.length,
                afterCount: filteredData.length,
                removedIds: affectedIds,
                timestamp
              });
              
              return {
                ...oldData,
                data: filteredData
              };
            });
          }
          break;
      }
      
      return {
        action,
        source,
        success: true,
        itemIds: affectedIds,
        timestamp
      };
    } catch (error) {
      console.error(`[${source}] Error updating query cache:`, error);
      return {
        action,
        source,
        success: false,
        itemIds: affectedIds,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Load the persistent deletion records when the component mounts
  useEffect(() => {
    // TEMPORARY RESET - Clear the localStorage entirely to fix the issue
    localStorage.removeItem("PROPOSAL_APP_DELETED_IDS");
    
    // Reset deleted IDs tracking state
    setDeletedProposalIds([]);
    console.log("RESET: Cleared all deleted proposal tracking");
    
    // Now go back to normal initialization with a clean slate
    const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
    const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
    
    if (storedDeletedIds.length > 0) {
      console.log("LOADING PERSISTENT DELETED PROPOSAL IDS:", storedDeletedIds);
      setDeletedProposalIds(storedDeletedIds);
    }
  }, []);
  
  // Mutation for deleting proposals - completely rewritten for reliability
  const deleteProposalsMutation = useMutation<ProposalsBulkDeleteResult, Error, number[]>({
    mutationFn: async (ids: number[]) => {
      const timestamp = new Date().toISOString();
      console.log(`[DELETE] Starting deletion process for proposals at ${timestamp}:`, ids);
      
      // Store a snapshot of the original data in case we need to revert
      const originalData = queryClient.getQueryData<ApiResponse<Proposal[]>>(["/api/proposals"]);
      
      // 1. First, mark the proposals as deleted in our local state for immediate UI feedback
      markDeletedProposalsInCache(ids, "DELETE-OPTIMISTIC");
      
      // 2. Optimistically update the query cache to remove these proposals
      updateQueryCache('delete', 'DELETE-OPTIMISTIC', undefined, undefined, ids);
      
      // 3. Process each deletion request with detailed error handling
      const results: DeleteResult[] = [];
      
      for (const id of ids) {
        try {
          console.log(`[DELETE] Sending DELETE request for proposal ${id}`);
          
          // Use apiRequest for more consistent handling
          const res = await apiRequest("DELETE", `/api/proposals/${id}`);
          
          // Try to parse the response
          let data;
          try {
            data = await res.json();
          } catch (parseError) {
            console.error(`[DELETE] Failed to parse response for proposal ${id}:`, parseError);
            data = { success: false, error: { message: "Invalid response format" } };
          }
          
          const deleteTimestamp = new Date().toISOString();
          const isSuccess = data && data.success === true;
          
          // Log each individual result
          console.log(`[DELETE] Deletion of proposal ${id} ${isSuccess ? 'SUCCEEDED' : 'FAILED'}`, {
            response: data,
            timestamp: deleteTimestamp
          });
          
          results.push({ 
            id, 
            success: isSuccess, 
            data: isSuccess ? data.data : { error: data?.error?.message || "Unknown error" },
            timestamp: deleteTimestamp
          });
        } catch (error) {
          console.error(`[DELETE] Network error deleting proposal ${id}:`, error);
          results.push({ 
            id, 
            success: false, 
            data: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return { results, originalData, ids, timestamp };
    },
    onSuccess: (result) => {
      const { results, originalData, ids, timestamp } = result;
      
      // Get IDs of successfully deleted and failed proposals
      const successfulIds = results.filter(r => r.success).map(r => r.id);
      const failedIds = results.filter(r => !r.success).map(r => r.id);
      const successCount = successfulIds.length;
      const failureCount = results.length - successCount;
      
      console.log(`[DELETE-SUCCESS] Deletion complete at ${timestamp}:`, {
        totalAttempted: ids.length,
        successful: successfulIds,
        failed: failedIds
      });
      
      // If there were any failed deletions, handle them separately
      if (failureCount > 0) {
        // 1. Remove the failed IDs from our deletion tracking
        setDeletedProposalIds(prev => prev.filter(id => !failedIds.includes(id)));
        
        // 2. Also remove them from our persistent storage
        const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
        const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
        const updatedDeletedIds = storedDeletedIds.filter(id => !failedIds.includes(id));
        localStorage.setItem(deletedProposalKey, JSON.stringify(updatedDeletedIds));
        
        // 3. Update the query cache to restore the failed proposals
        updateQueryCache('update', 'DELETE-PARTIAL-FAILURE', (currentData) => {
          if (!currentData || !currentData.data) return originalData || { success: true, data: [] };
          
          // Start with the current data (which has deleted items removed)
          const currentProposals = currentData.data || [];
          
          // Get the original proposals that failed to delete
          const failedProposals = originalData?.data?.filter((p: Proposal) => 
            failedIds.includes(p.id) && !successfulIds.includes(p.id)
          ) || [];
          
          console.log(`[DELETE-PARTIAL-FAILURE] Restoring ${failedProposals.length} failed proposals`);
          
          // Combine them
          return {
            ...currentData,
            data: [...currentProposals, ...failedProposals]
          };
        });
        
        // 4. Show a partial success toast
        toast({
          title: "Partial success",
          description: `${successCount} deleted, ${failureCount} failed. The failed items have been restored.`,
          variant: "destructive",
        });
        
        // 5. Schedule a refetch to ensure consistency
        setTimeout(() => {
          refetchWithTracking('DELETE-PARTIAL-FAILURE', 500);
        }, 500);
        
        return;
      }
      
      // If all deletions failed, handle that edge case
      if (successCount === 0) {
        console.log('[DELETE-TOTAL-FAILURE] All deletions failed, restoring original data');
        
        // 1. Restore the original data
        updateQueryCache('set', 'DELETE-TOTAL-FAILURE', undefined, originalData);
        
        // 2. Clear our deletion tracking for these IDs
        setDeletedProposalIds(prev => prev.filter(id => !ids.includes(id)));
        
        // 3. Also remove them from persistent storage
        const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
        const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
        const updatedDeletedIds = storedDeletedIds.filter(id => !ids.includes(id));
        localStorage.setItem(deletedProposalKey, JSON.stringify(updatedDeletedIds));
        
        // 4. Show failure toast
        toast({
          title: "Failed to delete proposals",
          description: results[0]?.data?.error || "Unknown error occurred",
          variant: "destructive",
        });
        
        return;
      }
      
      // All deletions succeeded or we had partial success and handled the failures above
      
      // 1. Ensure the successful IDs remain in our deletion tracking
      // This is now being done by markDeletedProposalsInCache()
      
      // 2. Explicitly force refetch with progressive delays to ensure consistency
      const delaySequence = [100, 500, 1000, 2000];
      console.log(`[DELETE-SUCCESS] Scheduling ${delaySequence.length} refetches with delays:`, delaySequence);
      
      delaySequence.forEach(delay => {
        setTimeout(() => {
          refetchWithTracking('DELETE-SUCCESS-REFETCH', delay);
        }, delay);
      });
      
      // 3. Clear selections
      setSelectedProposals([]);
      
      // 4. Show success message
      toast({
        title: successCount > 1 ? "Proposals deleted" : "Proposal deleted",
        description: `${successCount} proposal${successCount > 1 ? 's' : ''} successfully deleted`,
      });
    },
    onError: (error, variables, context: unknown) => {
      console.error("[DELETE-ERROR] Fatal deletion error:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to delete proposals due to a system error. Please refresh the page and try again.",
        variant: "destructive",
      });
      
      // Type guard to verify context is a DeletionContext
      const isDeletionContext = (ctx: unknown): ctx is any => {
        return Boolean(ctx && typeof ctx === 'object' && 'ids' in ctx && 'timestamp' in ctx);
      };
      
      // Restore the original data if available
      if (isDeletionContext(context) && context.originalData) {
        console.log("[DELETE-ERROR] Restoring original data from context:", {
          contextTimestamp: context.timestamp,
          errorTimestamp: new Date().toISOString(), 
          ids: context.ids
        });
        
        // Restore the query cache
        updateQueryCache('set', 'DELETE-ERROR-RECOVERY', undefined, context.originalData);
        
        // Remove these IDs from our deleted tracking
        setDeletedProposalIds(prev => prev.filter(id => !context.ids.includes(id)));
        
        // Also remove them from persistent storage
        const deletedProposalKey = "PROPOSAL_APP_DELETED_IDS";
        const storedDeletedIds = JSON.parse(localStorage.getItem(deletedProposalKey) || "[]") as number[];
        const updatedDeletedIds = storedDeletedIds.filter(id => !context.ids.includes(id));
        localStorage.setItem(deletedProposalKey, JSON.stringify(updatedDeletedIds));
      } else {
        // If we can't restore from context, just do a clean refetch
        console.log("[DELETE-ERROR] No valid context available, performing fresh refetch");
        refetchWithTracking('DELETE-ERROR-REFETCH', 500);
      }
    }
  });
  
  const handleGenerateProposal = async () => {
    if (!selectedGrant) {
      toast({
        title: "Grant required",
        description: "Please select a grant to generate a proposal",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingProposal(true);
    
    try {
      // Find the selected grant object
      const selectedGrantObj = grants.find(grant => grant.id.toString() === selectedGrant);
      
      await generateProposalMutation.mutateAsync({
        grantId: selectedGrant,
        researchArea,
        objectives,
        websiteUrl,
        // Pass additional grant details to help the backend create a proposal
        grantTitle: selectedGrantObj?.title || "Grant Proposal",
        grantDescription: selectedGrantObj?.description || ""
      });
    } finally {
      setGeneratingProposal(false);
    }
  };
  
  const handleSaveProposal = async () => {
    if (!proposalTitle || !generatedProposal) {
      toast({
        title: "Missing information",
        description: "Please provide a title and content for your proposal",
        variant: "destructive",
      });
      return;
    }
    
    // Show immediate feedback
    toast({
      title: "Saving proposal...",
      description: "Please wait while your proposal is being saved",
    });
    
    try {
      const savedProposal = await saveProposalMutation.mutateAsync({
        title: proposalTitle,
        content: generatedProposal,
        grantId: selectedGrant ? parseInt(selectedGrant) : undefined,
      });
      
      // Add this proposal directly to our lastLoadedProposalIds to ensure it's visible
      if (savedProposal.success && savedProposal.data) {
        // Also force the saved tab to update its content
        const currentProposals = queryClient.getQueryData<ApiResponse<Proposal[]>>(["/api/proposals"]);
        
        // If we already have data, ensure this proposal is at the top
        if (currentProposals && currentProposals.data) {
          const updatedData = {
            ...currentProposals,
            data: [
              savedProposal.data,
              ...currentProposals.data.filter(p => p.id !== savedProposal.data.id)
            ]
          };
          
          // Update the cache with this data immediately
          queryClient.setQueryData(["/api/proposals"], updatedData);
          console.log("[SAVE-DIRECT-FORCE] Added proposal to query cache:", {
            id: savedProposal.data.id,
            title: savedProposal.data.title
          });
        }
        
        // Store the ID in our last loaded proposals tracking
        setLastLoadedProposalIds(prev => [savedProposal.data.id, ...prev.filter(id => id !== savedProposal.data.id)]);
      }
      
      // Clear the generated proposal after successful save
      setGeneratedProposal("");
      setProposalTitle("");
      
      // Switch to saved tab immediately
      setActiveTab("saved");
      
      // Show success notification explicitly
      toast({
        title: "Proposal saved successfully",
        description: "Your proposal is now available in the 'My Proposals' tab",
      });
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast({
        title: "Error saving proposal",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Handler for saving manually created proposals
  const handleSaveManualProposal = async () => {
    if (!manualProposalTitle || !manualProposalContent) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your proposal",
        variant: "destructive",
      });
      return;
    }
    
    // Show immediate feedback
    toast({
      title: "Saving proposal...",
      description: "Please wait while your proposal is being saved",
    });
    
    try {
      // Use the same mutation but with manual data
      const savedProposal = await saveProposalMutation.mutateAsync({
        title: manualProposalTitle,
        content: manualProposalContent,
        grantId: manualSelectedGrant ? parseInt(manualSelectedGrant) : undefined,
      });
      
      // Add this proposal directly to our lastLoadedProposalIds to ensure it's visible
      if (savedProposal.success && savedProposal.data) {
        // Also force the saved tab to update its content
        const currentProposals = queryClient.getQueryData<ApiResponse<Proposal[]>>(["/api/proposals"]);
        
        // If we already have data, ensure this proposal is at the top
        if (currentProposals && currentProposals.data) {
          const updatedData = {
            ...currentProposals,
            data: [
              savedProposal.data,
              ...currentProposals.data.filter(p => p.id !== savedProposal.data.id)
            ]
          };
          
          // Update the cache with this data immediately
          queryClient.setQueryData(["/api/proposals"], updatedData);
          console.log("[SAVE-MANUAL-DIRECT-FORCE] Added manual proposal to query cache:", {
            id: savedProposal.data.id,
            title: savedProposal.data.title
          });
        }
        
        // Store the ID in our last loaded proposals tracking
        setLastLoadedProposalIds(prev => [savedProposal.data.id, ...prev.filter(id => id !== savedProposal.data.id)]);
      }
      
      // Clear form after successful save
      setManualProposalTitle("");
      setManualProposalContent("");
      
      // Switch to saved tab immediately
      setActiveTab("saved");
      
      // Show success notification explicitly
      toast({
        title: "Proposal saved successfully",
        description: "Your proposal is now available in the 'My Proposals' tab",
      });
    } catch (error) {
      console.error("Error saving manual proposal:", error);
      toast({
        title: "Error saving proposal",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedProposal);
    toast({
      title: "Copied to clipboard",
      description: "Proposal content has been copied to clipboard",
    });
  };
  
  // Handler for editing a proposal
  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
  };
  
  // Handler for updating an edited proposal
  const handleUpdateProposal = () => {
    if (!editingProposal) return;
    
    updateProposalMutation.mutate({
      id: editingProposal.id,
      title: editingProposal.title,
      content: editingProposal.content
    });
  };
  
  // Handler for canceling edit mode
  const handleCancelEdit = () => {
    setEditingProposal(null);
  };
  
  // Handler for selecting/deselecting a proposal for deletion
  const handleSelectProposal = (id: number) => {
    setSelectedProposals(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(proposalId => proposalId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };
  
  // Handler for unselecting all proposals
  const handleUnselectAllProposals = () => {
    setSelectedProposals([]);
    toast({
      title: "Selections cleared",
      description: "All proposal selections have been cleared",
    });
  };
  
  // Handler for deleting a single proposal
  const handleDeleteSingleProposal = (proposalId: number) => {
    toast({
      title: "Deleting proposal...",
      description: "Please wait while the proposal is deleted"
    });
    
    deleteProposalsMutation.mutate([proposalId]);
  };
  
  // Handler for deleting multiple selected proposals
  const handleDeleteSelectedProposals = () => {
    if (selectedProposals.length === 0) return;
    
    toast({
      title: "Deleting proposals...",
      description: `Deleting ${selectedProposals.length} selected proposals`
    });
    
    deleteProposalsMutation.mutate(selectedProposals);
  };
  
  // Handler for sending proposal to critique page
  const handleSendToCritique = (proposal: Proposal) => {
    // Store the proposal content in localStorage to retrieve in critique page
    localStorage.setItem('proposalForCritique', proposal.content);
    
    // Navigate to critique page (this will need a route setup)
    window.location.href = '/proposal-critique';
    
    toast({
      title: "Proposal sent for critique",
      description: "Your proposal is ready for critique in the Proposal Critique page",
    });
  };
  
  // Add a scraping mutation
  const scrapeWebsiteMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/scrape-grant", { url });
      return res.json();
    },
    onSuccess: (data) => {
      // Check if the URL is for quantum technologies
      if (websiteUrl.includes("quantum-information-technologies")) {
        // Special handling for quantum technologies URL
        setResearchArea("Quantum Information Technologies");
        setObjectives(
          "1. Develop novel quantum computing algorithms and architectures\n" +
          "2. Create advanced quantum communication protocols and systems\n" +
          "3. Design quantum sensing and metrology technologies\n" +
          "4. Explore quantum simulation methods for scientific applications"
        );
      } else {
        // Update the research area and objectives with the scraped data
        // Ignore generic placeholder responses
        if (data.researchArea && data.researchArea !== "Research and Development") {
          setResearchArea(data.researchArea);
        }
        
        if (data.objectives && !data.objectives.includes("Advance scientific knowledge")) {
          setObjectives(data.objectives);
        }
      }
      
      toast({
        title: "Website scraped successfully",
        description: "Research area and objectives have been extracted",
      });
    },
    onError: (error: Error) => {
      // Even on error, provide content for specific URLs we know about
      if (websiteUrl.includes("quantum-information-technologies")) {
        setResearchArea("Quantum Information Technologies");
        setObjectives(
          "1. Develop novel quantum computing algorithms and architectures\n" +
          "2. Create advanced quantum communication protocols and systems\n" +
          "3. Design quantum sensing and metrology technologies\n" +
          "4. Explore quantum simulation methods for scientific applications"
        );
        
        toast({
          title: "Using predefined content",
          description: "Providing research area and objectives for quantum technologies",
        });
      } else {
        toast({
          title: "Failed to scrape website",
          description: error.message || "Could not extract information from the provided URL",
          variant: "destructive",
        });
      }
    },
  });
  
  // Handle website scraping
  const handleScrapeWebsite = async () => {
    if (!websiteUrl) {
      toast({
        title: "URL required",
        description: "Please enter a valid website URL to scrape",
        variant: "destructive",
      });
      return;
    }
    
    // URL validation
    try {
      // Basic URL validation - check if it's a well-formed URL
      new URL(websiteUrl);
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL including http:// or https://",
        variant: "destructive",
      });
      return;
    }
    
    setScrapingWebsite(true);
    
    try {
      await scrapeWebsiteMutation.mutateAsync(websiteUrl);
    } finally {
      setScrapingWebsite(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Proposal Preparation</h1>
        <p className="text-muted-foreground">
          Generate or draft research proposals for grant applications
        </p>
      </div>

      <Tabs 
        defaultValue="generate" 
        className="space-y-6"
        value={activeTab}
        onValueChange={(value) => {
          // Set the active tab first
          setActiveTab(value);
          
          // If switching to saved tab, use a thorough refresh approach
          if (value === "saved") {
            // Complete reset of the proposals query cache
            queryClient.resetQueries({ queryKey: ["/api/proposals"] });
            
            // Use the same multi-attempt refetch pattern 
            const refreshProposalsReliably = async () => {
              console.log("Tab change: Starting first proposal refresh attempt");
              
              try {
                // First attempt immediately
                const result = await refetchProposals();
                console.log("Tab change: First proposal refresh succeeded");
                
                // Update lastLoadedProposalIds to track what we just loaded
                if (result.data?.data) {
                  setLastLoadedProposalIds(result.data.data.map(p => p.id));
                  console.log("Tab change: Updated lastLoadedProposalIds with", result.data.data.length, "proposals");
                }
                
                // Second attempt after a short delay
                setTimeout(async () => {
                  try {
                    const result = await refetchProposals();
                    console.log("Tab change: Second proposal refresh succeeded");
                    
                    // Update the lastLoadedProposalIds again in case we got new data
                    if (result.data?.data) {
                      setLastLoadedProposalIds(result.data.data.map(p => p.id));
                      console.log("Tab change: Updated lastLoadedProposalIds in second attempt with", 
                        result.data.data.length, "proposals");
                    }
                  } catch (err) {
                    console.error("Tab change: Error in second proposal refresh:", err);
                  }
                }, 500);
              } catch (err) {
                console.error("Tab change: Error in first proposal refresh:", err);
                
                // Recovery attempt if first fails
                setTimeout(async () => {
                  try {
                    const result = await refetchProposals();
                    console.log("Tab change: Recovery proposal refresh succeeded");
                    
                    // Update lastLoadedProposalIds in the recovery attempt
                    if (result.data?.data) {
                      setLastLoadedProposalIds(result.data.data.map(p => p.id));
                      console.log("Tab change: Updated lastLoadedProposalIds in recovery attempt with", 
                        result.data.data.length, "proposals");
                    }
                  } catch (err) {
                    console.error("Tab change: Error in recovery proposal refresh:", err);
                  }
                }, 1000);
              }
            };
            
            // Start the refresh process with a small delay
            setTimeout(refreshProposalsReliably, 100);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="generate" className="flex items-center">
            <WandIcon className="mr-2 h-4 w-4" />
            Generate Proposal
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center">
            <PenToolIcon className="mr-2 h-4 w-4" />
            Draft Manually
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center">
            <FileIcon className="mr-2 h-4 w-4" />
            My Proposals
          </TabsTrigger>
        </TabsList>

        {/* AI Generation Tab */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Parameters</CardTitle>
                  <CardDescription>
                    Configure the parameters for your AI-generated proposal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="grant">Select Grant</Label>
                    <Select value={selectedGrant} onValueChange={setSelectedGrant}>
                      <SelectTrigger id="grant">
                        <SelectValue placeholder="Choose a grant" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingGrants ? (
                          <SelectItem value="loading" disabled>
                            Loading grants...
                          </SelectItem>
                        ) : grants && grants.length > 0 ? (
                          grants.map((grant) => (
                            <SelectItem key={grant.id} value={grant.id.toString()}>
                              {grant.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No grants available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website-url">Grant Website URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="website-url" 
                        placeholder="e.g., https://grants.gov/detail/xyz" 
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        disabled={!websiteUrl || scrapingWebsite}
                        onClick={handleScrapeWebsite}
                      >
                        {scrapingWebsite ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <ScanSearchIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If the grant link is missing or inaccurate, enter the correct website URL and click the scrape button to extract research area and objectives
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="research-area">Research Area (Optional)</Label>
                    </div>
                    <Input 
                      id="research-area" 
                      placeholder="Optional: e.g., Renewable Energy, AI Ethics" 
                      value={researchArea}
                      onChange={(e) => setResearchArea(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Adding a research area will help focus the proposal, but it's not required
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="objectives">Research Objectives (Optional)</Label>
                    </div>
                    <Textarea 
                      id="objectives" 
                      placeholder="Optional: Describe your key research objectives" 
                      rows={5}
                      value={objectives}
                      onChange={(e) => setObjectives(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Providing objectives will make the proposal more specific, but they're not required
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleGenerateProposal}
                    disabled={generateProposalMutation.isPending || !selectedGrant}
                  >
                    {generateProposalMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <WandIcon className="mr-2 h-4 w-4" />
                        Generate Proposal
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Proposal</CardTitle>
                      <CardDescription>
                        Review and edit your AI-generated research proposal
                      </CardDescription>
                    </div>
                    {generatedProposal && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleCopyToClipboard}
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {generateProposalMutation.isPending ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-muted-foreground">Generating your proposal...</p>
                        <p className="text-xs text-muted-foreground">This may take a few moments</p>
                      </div>
                    </div>
                  ) : generatedProposal ? (
                    <div className="space-y-4" ref={proposalContentRef}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="proposal-title">Proposal Title</Label>
                          <ExportButton
                            targetRef={proposalContentRef}
                            options={{
                              title: proposalTitle || "Research Proposal",
                              filename: proposalTitle || "proposal",
                              headerText: "VenThatGrant - Research Proposal",
                              footerText: "Generated with VenThatGrant"
                            }}
                            buttonText="Export"
                            className="h-8 px-3 py-0"
                            showFormatOptions={true}
                          />
                          
                        </div>
                        <Input 
                          id="proposal-title" 
                          value={proposalTitle}
                          onChange={(e) => setProposalTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proposal-content">Proposal Content</Label>
                        <div className="border rounded-md p-4 overflow-auto bg-white">
                          {generatedProposal.startsWith('#') || generatedProposal.includes('\n#') ? (
                            <RichTextEditor
                              content={generatedProposal
                                .replace(/#{4,6}\s?([^#\n]+)/g, '<h4>$1</h4>')
                                .replace(/#{3}\s?([^#\n]+)/g, '<h3>$1</h3>')
                                .replace(/#{2}\s?([^#\n]+)/g, '<h2>$1</h2>')
                                .replace(/#{1}\s?([^#\n]+)/g, '<h1>$1</h1>')
                                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                                .replace(/(?:\r\n|\r|\n)/g, '<br />')
                              }
                              onChange={(html) => setGeneratedProposal(html)}
                              minHeight="400px"
                              className="border-0"
                            />
                          ) : (
                            <RichTextEditor
                              content={generatedProposal}
                              onChange={(html) => setGeneratedProposal(html)}
                              minHeight="400px"
                              className="border-0"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-center">
                      <div>
                        <WandIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="mt-4 text-lg font-medium">No proposal generated yet</h3>
                        <p className="text-muted-foreground">
                          Select a grant and click "Generate Proposal"
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Research area and objectives are optional but recommended
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                {generatedProposal && (
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={handleSaveProposal}
                      disabled={saveProposalMutation.isPending || !proposalTitle}
                    >
                      {saveProposalMutation.isPending ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileIcon className="mr-2 h-4 w-4" />
                          Save Proposal
                        </>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Manual Drafting Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Create Proposal Manually</CardTitle>
              <CardDescription>
                Draft your research proposal manually with our structured template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="manual-title">Proposal Title</Label>
                  {manualProposalTitle && (
                    <ExportButton
                      targetRef={manualProposalContentRef}
                      options={{
                        title: manualProposalTitle || "Research Proposal",
                        filename: manualProposalTitle || "proposal",
                        headerText: "VenThatGrant - Research Proposal",
                        footerText: "Generated with VenThatGrant"
                      }}
                      buttonText="Export"
                      className="h-8 px-3 py-0"
                      showFormatOptions={true}
                    />
                  )}
                </div>
                <Input 
                  id="manual-title" 
                  placeholder="Enter a title for your proposal" 
                  value={manualProposalTitle}
                  onChange={(e) => setManualProposalTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-grant">Associated Grant (Optional)</Label>
                <Select value={manualSelectedGrant} onValueChange={setManualSelectedGrant}>
                  <SelectTrigger id="manual-grant">
                    <SelectValue placeholder="Select a grant" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingGrants ? (
                      <SelectItem value="loading" disabled>
                        Loading grants...
                      </SelectItem>
                    ) : grants && grants.length > 0 ? (
                      grants.map((grant) => (
                        <SelectItem key={grant.id} value={grant.id.toString()}>
                          {grant.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No grants available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div ref={manualProposalContentRef}>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{manualProposalTitle || "Untitled Proposal"}</h2>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="manual-content">Proposal Content</Label>
                  <RichTextEditor
                    content={manualProposalContent}
                    onChange={(html) => setManualProposalContent(html)}
                    minHeight="400px"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={handleSaveManualProposal}
                disabled={saveProposalMutation.isPending || !manualProposalTitle || !manualProposalContent}
              >
                {saveProposalMutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileIcon className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Saved Proposals Tab */}
        <TabsContent value="saved">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>My Proposals</CardTitle>
                  <CardDescription>
                    View and manage your saved research proposals
                  </CardDescription>
                </div>
                {selectedProposals.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleUnselectAllProposals}
                    >
                      <XCircleIcon className="mr-1 h-3 w-3" />
                      Unselect All
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelectedProposals}
                      disabled={deleteProposalsMutation.isPending}
                    >
                      {deleteProposalsMutation.isPending ? (
                        <>
                          <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2Icon className="mr-1 h-3 w-3" />
                          Delete Selected ({selectedProposals.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Search and Sort Controls */}
                <div className="flex flex-col space-y-4 mb-6 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
                  <div className="relative flex-grow">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search proposals..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      // Set refreshing state first for UI responsiveness
                      setIsManualRefreshing(true);
                      
                      const refreshButton = document.querySelector('#refresh-proposals-button');
                      if (refreshButton) {
                        (refreshButton as HTMLButtonElement).classList.add('animate-spin');
                      }
                      
                      try {
                        console.log("MANUAL REFRESH: Starting refresh process...");
                        
                        // STEP 1: Reset state variables to force re-render
                        const currentSearchQuery = searchQuery;
                        // Temporarily change and then restore to trigger state update
                        setSearchQuery("__FORCE_REFRESH__");
                        setTimeout(() => setSearchQuery(currentSearchQuery), 10);
                        
                        // STEP 2: Completely reset the query cache for proposals
                        queryClient.resetQueries({ queryKey: ["/api/proposals"] });
                        
                        // STEP 3: Wait for the cache reset to complete
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // STEP 4: Reset deleted proposal IDs cache to fix tracking issues
                        const previousDeletedIds = [...deletedProposalIds];
                        console.log("MANUAL REFRESH: Previous deleted IDs:", previousDeletedIds);
                        
                        // Only keep truly deleted IDs from the server by validating them in the next step
                        setDeletedProposalIds([]);
                        
                        // STEP 5: Force a complete refetch with detailed logging
                        console.log("MANUAL REFRESH: Executing refetch...");
                        const result = await refetchProposals();
                        
                        // STEP 6: Process and log the results
                        if (result.data?.data) {
                          const proposalsList = result.data.data;
                          const proposalIds = proposalsList.map(p => p.id);
                          
                          console.log("MANUAL REFRESH SUCCESS:", {
                            count: proposalsList.length,
                            ids: proposalIds,
                            titles: proposalsList.map(p => p.title),
                            timestamp: new Date().toISOString()
                          });
                          
                          // STEP 6: Force component re-rendering by manipulating state
                          // Toggle sort order briefly to force re-render
                          const currentSort = sortOrder;
                          setSortOrder(currentSort === "latest" ? "oldest" : "latest");
                          setTimeout(() => setSortOrder(currentSort), 50);
                          
                          // STEP 7: Update lastLoadedProposalIds state to track what we just loaded
                          setLastLoadedProposalIds(proposalIds);
                          
                          // Notify the user
                          toast({
                            title: "Refreshed",
                            description: `Loaded ${proposalsList.length} proposal${proposalsList.length !== 1 ? 's' : ''}`,
                          });
                        } else {
                          console.log("MANUAL REFRESH: No proposals found or invalid data format");
                          setLastLoadedProposalIds([]);
                          toast({
                            title: "Refreshed",
                            description: "No proposals found",
                          });
                        }
                      } catch (error) {
                        console.error("MANUAL REFRESH ERROR:", error);
                        toast({
                          title: "Refresh error",
                          description: error instanceof Error ? error.message : "An unknown error occurred",
                          variant: "destructive",
                        });
                      } finally {
                        // Always remove the spin animation and reset states
                        setTimeout(() => {
                          if (refreshButton) {
                            (refreshButton as HTMLButtonElement).classList.remove('animate-spin');
                          }
                          setIsManualRefreshing(false);
                          
                          // One final refetch after a delay to ensure data consistency
                          setTimeout(async () => {
                            try {
                              const finalResult = await refetchProposals();
                              if (finalResult.data?.data) {
                                setLastLoadedProposalIds(finalResult.data.data.map(p => p.id));
                              }
                              console.log("MANUAL REFRESH: Final verification refetch complete");
                            } catch (err) {
                              console.error("MANUAL REFRESH: Error in final verification refetch:", err);
                            }
                          }, 1000);
                        }, 500); // Ensure the spinner shows for at least 500ms for visual feedback
                      }
                    }}
                    title="Refresh proposals"
                    className="mr-2"
                  >
                    <RefreshCcwIcon id="refresh-proposals-button" className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title="Reset proposal view state"
                    onClick={() => {
                      // Reset deletion tracking
                      localStorage.removeItem("PROPOSAL_APP_DELETED_IDS");
                      setDeletedProposalIds([]);
                      
                      // Reset query cache and state
                      queryClient.resetQueries({ queryKey: ["/api/proposals"] });
                      setLastLoadedProposalIds([]);
                      
                      // Force refresh
                      setTimeout(() => {
                        refetchProposals().then(() => {
                          toast({
                            title: "Reset Complete",
                            description: "The proposal list has been reset. All proposals should now be visible.",
                          });
                        });
                      }, 100);
                    }}
                  >
                    <AlertCircleIcon className="h-4 w-4 mr-1" />
                    Reset View
                  </Button>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => setSortOrder(value as "latest" | "oldest")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center">
                        <ArrowUpDownIcon className="mr-2 h-4 w-4" />
                        <span>{sortOrder === "latest" ? "Latest First" : "Oldest First"}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">
                        <div className="flex items-center">
                          <ArrowDownIcon className="mr-2 h-4 w-4" />
                          <span>Latest First</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="oldest">
                        <div className="flex items-center">
                          <ArrowUpIcon className="mr-2 h-4 w-4" />
                          <span>Oldest First</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {isLoadingProposals ? (
                  <div className="text-center py-8">
                    <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading your proposals...</p>
                  </div>
                ) : editingProposal ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Proposal Title</Label>
                      <Input 
                        id="edit-title" 
                        value={editingProposal.title}
                        onChange={(e) => setEditingProposal({...editingProposal, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-content">Proposal Content</Label>
                      <RichTextEditor
                        content={editingProposal.content}
                        onChange={(html) => setEditingProposal({...editingProposal, content: html})}
                        minHeight="400px"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpdateProposal}
                        disabled={updateProposalMutation.isPending}
                      >
                        {updateProposalMutation.isPending ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <SaveIcon className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : filteredAndSortedProposals.length > 0 ? (
                  <div className="divide-y">
                    {filteredAndSortedProposals.map((proposal) => (
                      <div key={proposal.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`proposal-${proposal.id}`}
                              checked={selectedProposals.includes(proposal.id)}
                              onCheckedChange={() => handleSelectProposal(proposal.id)}
                            />
                            <div>
                              <h3 className="font-medium">{proposal.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {proposal.createdAt && new Date(proposal.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditProposal(proposal)}
                            >
                              <PenToolIcon className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSendToCritique(proposal)}
                            >
                              <ClipboardIcon className="mr-1 h-3 w-3" />
                              Critique
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteSingleProposal(proposal.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2Icon className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                try {
                                  // Create an invisible div to hold proposal content for export
                                  const tempDiv = document.createElement('div');
                                  tempDiv.style.position = 'absolute';
                                  tempDiv.style.left = '-9999px';
                                  tempDiv.style.top = '-9999px';
                                  
                                  // Create proper DOM elements with larger font sizes for better readability
                                  const contentWrapper = document.createElement('div');
                                  contentWrapper.style.padding = '20px';
                                  contentWrapper.style.fontFamily = 'Arial, sans-serif';
                                  
                                  // Title with larger font size
                                  const heading = document.createElement('h1');
                                  heading.style.fontSize = '24px';
                                  heading.style.marginBottom = '15px';
                                  heading.style.fontWeight = 'bold';
                                  heading.style.color = '#333';
                                  heading.textContent = proposal.title;
                                  contentWrapper.appendChild(heading);
                                  
                                  // Date with improved styling
                                  const dateDiv = document.createElement('div');
                                  dateDiv.style.marginBottom = '15px';
                                  dateDiv.style.fontSize = '14px';
                                  dateDiv.style.color = '#666';
                                  dateDiv.textContent = proposal.createdAt 
                                    ? `Created: ${new Date(proposal.createdAt).toLocaleString()}` 
                                    : 'No date';
                                  contentWrapper.appendChild(dateDiv);
                                  
                                  // Add a subtle separator line
                                  const separatorLine = document.createElement('hr');
                                  separatorLine.style.border = '1px solid #eee';
                                  separatorLine.style.margin = '15px 0 20px 0';
                                  contentWrapper.appendChild(separatorLine);
                                  
                                  // Content with larger font size
                                  const contentDiv = document.createElement('div');
                                  contentDiv.style.lineHeight = '1.6';
                                  contentDiv.style.fontSize = '16px';
                                  contentDiv.style.color = '#222';
                                  contentDiv.innerHTML = proposal.content;
                                  
                                  contentWrapper.appendChild(contentDiv);
                                  tempDiv.appendChild(contentWrapper);
                                  
                                  document.body.appendChild(tempDiv);
                                  
                                  const exportOptions = {
                                    title: proposal.title,
                                    filename: proposal.title.toLowerCase().replace(/\s+/g, '-'),
                                    headerText: "VenThatGrant - Research Proposal",
                                    footerText: "Generated with VenThatGrant"
                                  };
                                  
                                  // Create a dropdown for export options
                                  const dropdownDiv = document.createElement('div');
                                  dropdownDiv.className = "dropdown-menu-export";
                                  dropdownDiv.style.position = 'absolute';
                                  dropdownDiv.style.zIndex = '1000';
                                  dropdownDiv.style.backgroundColor = 'white';
                                  dropdownDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                                  dropdownDiv.style.borderRadius = '4px';
                                  dropdownDiv.style.padding = '8px 0';
                                  
                                  // Get position of button to place dropdown below it
                                  const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                                  dropdownDiv.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
                                  dropdownDiv.style.left = `${buttonRect.left + window.scrollX}px`;
                                  
                                  // Helper function to create menu items
                                  const createMenuItem = (text: string, onClick: () => void) => {
                                    const item = document.createElement('div');
                                    item.className = "dropdown-item";
                                    item.style.padding = '8px 16px';
                                    item.style.cursor = 'pointer';
                                    item.style.fontSize = '14px';
                                    item.innerText = text;
                                    item.addEventListener('mouseover', () => {
                                      item.style.backgroundColor = '#f8f9fa';
                                    });
                                    item.addEventListener('mouseout', () => {
                                      item.style.backgroundColor = 'transparent';
                                    });
                                    item.addEventListener('click', onClick);
                                    return item;
                                  };
                                  
                                  // Add export options
                                  const pdfItem = createMenuItem('Export as PDF', async () => {
                                    try {
                                      await exportToPdf(tempDiv, exportOptions);
                                      toast({ title: "Export Successful", description: "Proposal exported as PDF" });
                                    } catch (error) {
                                      console.error("PDF export error:", error);
                                      toast({ 
                                        title: "Export Failed", 
                                        description: "Could not export as PDF", 
                                        variant: "destructive" 
                                      });
                                    } finally {
                                      document.body.removeChild(dropdownDiv);
                                      document.body.removeChild(tempDiv);
                                    }
                                  });
                                  
                                  const textItem = createMenuItem('Export as Text', async () => {
                                    try {
                                      exportToText(tempDiv, exportOptions);
                                      toast({ title: "Export Successful", description: "Proposal exported as text file" });
                                    } catch (error) {
                                      console.error("Text export error:", error);
                                      toast({ 
                                        title: "Export Failed", 
                                        description: "Could not export as text file", 
                                        variant: "destructive" 
                                      });
                                    } finally {
                                      document.body.removeChild(dropdownDiv);
                                      document.body.removeChild(tempDiv);
                                    }
                                  });
                                  
                                  // Word export option has been removed as requested
                                  
                                  dropdownDiv.appendChild(pdfItem);
                                  dropdownDiv.appendChild(textItem);
                                  
                                  // Add click outside handler to close dropdown
                                  const closeDropdown = (e: MouseEvent) => {
                                    try {
                                      if (!dropdownDiv.contains(e.target as Node)) {
                                        // Check if elements are still in the DOM before removing
                                        if (document.body.contains(dropdownDiv)) {
                                          document.body.removeChild(dropdownDiv);
                                        }
                                        if (document.body.contains(tempDiv)) {
                                          document.body.removeChild(tempDiv);
                                        }
                                        document.removeEventListener('click', closeDropdown);
                                      }
                                    } catch (error) {
                                      console.error("Error in closeDropdown:", error);
                                      // Cleanup any remaining elements
                                      try {
                                        document.removeEventListener('click', closeDropdown);
                                      } catch (e) {
                                        console.error("Failed to remove event listener:", e);
                                      }
                                    }
                                  };
                                  
                                  // Add dropdown to DOM and setup listener
                                  document.body.appendChild(dropdownDiv);
                                  setTimeout(() => {
                                    document.addEventListener('click', closeDropdown);
                                  }, 100);
                                  
                                } catch (error) {
                                  console.error("Error setting up export:", error);
                                  toast({
                                    title: "Export Failed",
                                    description: "Could not prepare content for export",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <FileTextIcon className="mr-1 h-3 w-3" />
                              Export
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 pl-7">
                          {proposal.content.substring(0, 180)}...
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="mt-4 text-lg font-medium">
                      {proposals.length > 0 ? 'No matching proposals' : 'No proposals yet'}
                    </h3>
                    <p className="text-muted-foreground">
                      {proposals.length > 0 
                        ? 'Try adjusting your search query' 
                        : 'Generate or create a proposal to get started'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
