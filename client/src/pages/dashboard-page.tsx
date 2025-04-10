import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/dashboard/stat-card";
import { ActivityItem } from "@/components/ui/dashboard/activity-item";
import { GrantCard } from "@/components/ui/grant-card";
import { 
  SearchIcon, 
  FileEditIcon, 
  FileTextIcon, 
  ListChecksIcon
} from "lucide-react";
import { Activity, Grant, CritiqueHistory, Report, Proposal } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  stats: {
    grantMatches: number;
    activeProposals: number;
    successRate: number;
    totalReports: number;
    savedGrants?: number;
    critiquesCount?: number;
  };
  recentActivities: Activity[];
  recommendedGrants: Grant[];
  upcomingDeadlines: Grant[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard, error: dashboardError } = useQuery<{ success: boolean, data: DashboardData }>({
    queryKey: ["/api/dashboard"],
  });

  // Fetch saved grants
  const { data: savedGrantsResponse } = useQuery<{ success: boolean, data: Grant[] }>({
    queryKey: ["/api/grants/saved"],
  });
  
  // Fetch all proposals
  const { data: proposalsResponse } = useQuery<{ success: boolean, data: Proposal[] }>({
    queryKey: ["/api/proposals"],
  });
  
  // Fetch critique history
  const { data: critiqueHistoryResponse } = useQuery<{ success: boolean, data: CritiqueHistory[] }>({
    queryKey: ["/api/critique-history"],
  });
  
  // Fetch reports
  const { data: reportsResponse } = useQuery<{ success: boolean, data: Report[] }>({
    queryKey: ["/api/reports"],
  });

  useEffect(() => {
    if (dashboardError) {
      toast({
        title: "Error fetching dashboard data",
        description: dashboardError.message,
        variant: "destructive",
      });
    }
  }, [dashboardError, toast]);

  // Extract real counts from queries
  const savedGrantsCount = savedGrantsResponse?.data?.length || 0;
  const proposalsCount = proposalsResponse?.data?.length || 0;
  const critiquesCount = critiqueHistoryResponse?.data?.length || 0;
  const reportsCount = reportsResponse?.data?.length || 0;
  
  // Get dashboard data
  const data = dashboardData?.data;

  return (
    <MainLayout>
      {/* Welcome message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.fullName || user?.username}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your grant activities and recommendations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Saved Grants"
          value={savedGrantsCount}
          icon={SearchIcon}
          description="From web search & database"
          iconColor="text-green-500"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Your Proposals"
          value={proposalsCount}
          icon={FileEditIcon}
          description="Prepared with AI assistance"
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Proposal Critiques"
          value={critiquesCount}
          icon={ListChecksIcon}
          description="AI-powered feedback"
          iconColor="text-purple-500"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          title="Grant Reports"
          value={reportsCount}
          icon={FileTextIcon}
          description="Progress & final reports"
          iconColor="text-amber-500"
          iconBgColor="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoadingDashboard ? (
                <div className="p-6 text-center text-muted-foreground">Loading activities...</div>
              ) : data?.recentActivities && data.recentActivities.length > 0 ? (
                data.recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">No recent activities found</div>
              )}
            </div>
            <div className="p-4 bg-muted/50 text-center">
              <Link href="/activities" className="text-sm font-medium text-primary hover:text-primary/90">
                View all activity
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Grants */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Saved Grants</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/grant-finder">
              <SearchIcon className="mr-2 h-4 w-4" />
              Find More Grants
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedGrantsResponse?.data && savedGrantsResponse.data.length > 0 ? (
            savedGrantsResponse.data.slice(0, 3).map((grant) => (
              <GrantCard key={grant.id} grant={grant} />
            ))
          ) : (
            <div className="col-span-full p-12 text-center text-muted-foreground">
              No saved grants found
              <div className="mt-4">
                <Button asChild>
                  <Link href="/grant-finder">
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Search Grants
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl overflow-hidden">
        <div className="px-6 py-12 sm:p-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Ready to create your next winning proposal?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Use our AI-powered tools to generate a research proposal that matches grant requirements and increases your chances of success.
            </p>
            <div className="mt-8">
              <Button asChild variant="secondary" size="lg">
                <Link href="/proposal-preparation">
                  Start Creating
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
