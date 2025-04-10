import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/ui/layout/main-layout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  BookmarkIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Grant } from "@shared/schema";
import { GrantCard, EnhancedGrant } from "@/components/ui/grant-card";

export default function SavedGrantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Define the exact structure of the response
  interface SavedGrantsResponse {
    data: Grant[];
  }
  
  // State for tracking saved grants and UI-only changes
  const [savedGrantIds, setSavedGrantIds] = useState<number[]>([]);
  const [hiddenGrantIds, setHiddenGrantIds] = useState<number[]>([]);
  
  // Query for saved grants
  const { 
    data: savedGrantsData, 
    isLoading: isSavedGrantsLoading, 
    refetch: refetchSavedGrants,
    error: savedGrantsError
  } = useQuery<SavedGrantsResponse>({
    queryKey: ["/api/grants/saved"],
    enabled: true
  });
  
  // Handle errors
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
  
  // Sync state with query results
  useEffect(() => {
    if (savedGrantsData?.data && Array.isArray(savedGrantsData.data)) {
      console.log('Saved grants data refreshed, updating local state');
      const grantIds = savedGrantsData.data.map((grant) => grant.id);
      setSavedGrantIds(grantIds);
      
      // Clear any hidden grants when we get new data
      setHiddenGrantIds([]);
    }
  }, [savedGrantsData]);
  
  // Mutation for unsaving grants
  const unsaveMutation = useMutation({
    mutationFn: async (grantId: number) => {
      console.log(`API: Removing grant ${grantId} from saved grants`);
      const response = await apiRequest('DELETE', `/api/grants/${grantId}/save`);
      return response.json();
    },
    
    onMutate: async (grantId) => {
      console.log(`Begin optimistic update: Unsaving grant ${grantId}`);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/grants/saved"] });
      
      // Take a snapshot of the current state
      const previousData = queryClient.getQueryData<SavedGrantsResponse>(["/api/grants/saved"]);
      
      // Update the cache optimistically
      if (previousData?.data) {
        const updatedData = {
          ...previousData,
          data: previousData.data.filter(grant => grant.id !== grantId)
        };
        queryClient.setQueryData<SavedGrantsResponse>(["/api/grants/saved"], updatedData);
      }
      
      // Return the previous data for rollback if needed
      return { previousData };
    },
    
    onError: (error, grantId, context) => {
      console.error(`Failed to unsave grant ${grantId}:`, error);
      
      // Revert to the previous state
      if (context?.previousData) {
        queryClient.setQueryData<SavedGrantsResponse>(["/api/grants/saved"], context.previousData);
      }
      
      toast({
        title: "Failed to remove grant",
        description: "The grant could not be removed. Please try again.",
        variant: "destructive",
      });
      
      // Remove from hidden grants since we failed
      setHiddenGrantIds(prev => prev.filter(id => id !== grantId));
    },
    
    onSuccess: (data, grantId) => {
      console.log(`Success: Grant ${grantId} removed from saved grants`);
      
      // Double-check our UI is updated properly
      if (savedGrantsData?.data) {
        const updatedGrants = {
          ...savedGrantsData,
          data: savedGrantsData.data.filter(grant => grant.id !== grantId)
        };
        
        // Ensure the removed grant is not shown
        queryClient.setQueryData<SavedGrantsResponse>(["/api/grants/saved"], updatedGrants);
      }
      
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ 
        queryKey: ["/api/grants/saved"],
        // Don't refetch immediately as we already optimistically updated
        refetchType: "none" 
      });
    }
  });
  
  // Handler for remove button clicks
  const handleRemoveGrant = (grantId: number) => {
    console.log(`User action: Remove grant ${grantId}`);
    
    // Immediately hide the grant for better UX
    setHiddenGrantIds(prev => [...prev, grantId]);
    
    // Show feedback to user
    toast({
      title: "Grant removed",
      description: "The grant has been removed from your saved list"
    });
    
    // Create a modified version of the data that excludes the removed grant
    if (savedGrantsData?.data) {
      // Update the Query Cache directly for immediate UI change
      const updatedGrants = {
        ...savedGrantsData,
        data: savedGrantsData.data.filter(grant => grant.id !== grantId)
      };
      
      // Set the updated data in the query cache to update UI
      queryClient.setQueryData<SavedGrantsResponse>(["/api/grants/saved"], updatedGrants);
    }
    
    // Call the API to actually remove it
    unsaveMutation.mutate(grantId);
  };
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Saved Grants</h1>
        <p className="text-muted-foreground mb-4">
          Manage your saved grants collection
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Loading state */}
        {isSavedGrantsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h3 className="mt-4 text-lg font-medium">Loading saved grants...</h3>
          </div>
        ) : savedGrantsData?.data && Array.isArray(savedGrantsData.data) && savedGrantsData.data.length > 0 ? (
          <div className="space-y-4">
            {/* Header with refresh button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Saved Grants</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Force a complete refetch from the server
                  queryClient.removeQueries({ queryKey: ["/api/grants/saved"] });
                  refetchSavedGrants();
                  // Clear any local state to ensure we show the freshest data
                  setHiddenGrantIds([]);
                }}
                className="h-8"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {/* Grant cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedGrantsData.data
                // Filter out grants that we've locally marked as hidden
                .filter(grant => !hiddenGrantIds.includes(grant.id))
                .map((grant) => {
                  // Create an enhanced grant with default values for display
                  const enhancedSavedGrant: EnhancedGrant = {
                    ...grant,
                    saved: true,
                    matchScore: 100,
                    matchReasons: ["Manually saved by user"],
                    keyFactors: [{
                      factor: "User Selection", 
                      weight: 1, 
                      score: 100
                    }],
                    highlights: []
                  };
                  
                  return (
                    <GrantCard 
                      key={grant.id} 
                      grant={enhancedSavedGrant}
                      onSave={handleRemoveGrant}
                      pageContext="saved-grants"
                    />
                  );
              })}
            </div>
          </div>
        ) : (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookmarkIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No saved grants</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                You don't have any saved grants yet. Use the Grant Finder to discover and save grants for later reference.
              </p>
              <Button asChild className="mt-2">
                <Link href="/grant-finder">Go to Grant Finder</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}