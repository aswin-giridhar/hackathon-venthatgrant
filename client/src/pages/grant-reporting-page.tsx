import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  FileTextIcon, 
  ClipboardIcon, 
  Loader2 as Loader2Icon, 
  FileIcon,
  Wand as WandIcon,
  TrashIcon,
  DownloadIcon,
  ChevronDownIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Proposal, Report } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";

export default function GrantReportingPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProposal, setSelectedProposal] = useState<string>("");
  const [reportType, setReportType] = useState<string>("progress");
  const [progress, setProgress] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [reportTitle, setReportTitle] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("");
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<string>("generate");
  // Track deleted reports to prevent them from reappearing
  const [deletedReportIds, setDeletedReportIds] = useState<number[]>([]);
  
  // Create a ref for PDF export
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  // Get user's proposals
  const { 
    data: proposalsResponse, 
    isLoading: isLoadingProposals 
  } = useQuery<{ success: boolean, data: Proposal[] }>({
    queryKey: ["/api/proposals"],
    // Remove callbacks to fix TypeScript errors with TanStack Query v5
  });
  
  // Extract proposals from the response
  const proposals = proposalsResponse?.data;
  
  // Get user's reports
  const { 
    data: reportsResponse, 
    isLoading: isLoadingReports,
    refetch: refetchReports 
  } = useQuery<{ success: boolean, data: Report[] }>({
    queryKey: ["/api/reports"],
    staleTime: Infinity, // Prevent automatic refetching
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true, // We do want to fetch when the component mounts
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });
  
  // Log report data when it changes (using useEffect instead of onSuccess callback)
  useEffect(() => {
    if (reportsResponse && reportsResponse.data) {
      console.log("QUERY: Loaded reports (useQuery):", reportsResponse);
      console.log("QUERY: Number of reports loaded:", reportsResponse.data.length);
      if (reportsResponse.data.length > 0) {
        console.log("QUERY: Report IDs:", reportsResponse.data.map((r: Report) => r.id).join(', '));
      }
    }
  }, [reportsResponse]);
  
  // Extract reports from the response and filter out deleted reports with proper typing
  const reports = reportsResponse?.data ? 
    reportsResponse.data.filter((report: Report) => !deletedReportIds.includes(report.id)) 
    : undefined;
    
  // Log filtered reports
  useEffect(() => {
    if (reports) {
      console.log("FILTERED: Total reports after deletion filter:", reports.length);
      console.log("FILTERED: Currently tracking deleted IDs:", deletedReportIds);
    }
  }, [reports, deletedReportIds]);
  
  // Mutation for generating a report
  const generateReportMutation = useMutation({
    mutationFn: async (data: { 
      proposalId: string; 
      reportType: string; 
      projectProgress: string;
      challengesMitigations: string;
      modelName?: string;
    }) => {
      const res = await apiRequest("POST", "/api/generate-report", data);
      return res.json();
    },
    onSuccess: (response: { success: boolean, data: Report }) => {
      const reportData = response.data;
      console.log("Generated report data:", reportData);
      
      // Only set the report content and title in the form, don't save it yet
      // The report will only be saved when the user clicks "Save Report"
      setGeneratedReport(reportData.content);
      setReportTitle(reportData.title);
      
      toast({
        title: "Report generated",
        description: "Your grant report has been successfully generated. Click 'Save Report' to save it.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for saving a report
  const saveReportMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      content: string; 
      proposalId?: number;
      reportType?: string;
      projectProgress?: string;
      challengesMitigations?: string;
      modelName?: string;
    }) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return res.json();
    },
    onSuccess: (response: { success: boolean, data: any }) => {
      console.log("SAVE: Report saved response:", response);
      
      // Remove the saved report ID from our deleted IDs if it was previously deleted
      if (response.data?.id && deletedReportIds.includes(response.data.id)) {
        setDeletedReportIds(prev => {
          const newIds = prev.filter(id => id !== response.data.id);
          console.log("SAVE: Removing report ID from deletion tracking:", response.data.id);
          return newIds;
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      
      toast({
        title: "Report saved",
        description: "Your report has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateReport = async () => {
    if (!selectedProposal) {
      toast({
        title: "Proposal required",
        description: "Please select a proposal to generate a report",
        variant: "destructive",
      });
      return;
    }
    
    if (!reportType) {
      toast({
        title: "Report type required",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Use the user's preferred model or default to llama-3.3-70b
      const modelName = user?.preferredLlmModel || 'llama-3.3-70b';
      setSelectedModelName(modelName);
      
      await generateReportMutation.mutateAsync({
        proposalId: selectedProposal,
        reportType,
        projectProgress: progress,
        challengesMitigations: challenges,
        modelName
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };
  
  const handleSaveReport = () => {
    if (!reportTitle || !generatedReport) {
      toast({
        title: "Missing information",
        description: "Please provide a title and content for your report",
        variant: "destructive",
      });
      return;
    }
    
    saveReportMutation.mutate({
      title: reportTitle,
      content: generatedReport,
      proposalId: selectedProposal ? parseInt(selectedProposal) : undefined,
      reportType: reportType,
      projectProgress: progress,
      challengesMitigations: challenges,
      modelName: selectedModelName
    });
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedReport);
    toast({
      title: "Copied to clipboard",
      description: "Report content has been copied to clipboard",
    });
  };
  
  // Mutation for deleting a report
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest("DELETE", `/api/reports/${reportId}`);
      return res.json();
    },
    onSuccess: (data, reportId) => {
      console.log("DELETE: Successfully deleted report with ID:", reportId);
      
      // Add this ID to our tracking array to ensure it doesn't reappear
      setDeletedReportIds(prev => {
        const newIds = [...prev, reportId];
        console.log("DELETE: Updated deletedReportIds:", newIds);
        return newIds;
      });
      
      // First, get the current reports from the cache
      const currentReportsResponse = queryClient.getQueryData(["/api/reports"]) as { success: boolean, data: Report[] } | undefined;
      
      if (currentReportsResponse && currentReportsResponse.data) {
        // Create a new array without the deleted report
        const updatedReports = currentReportsResponse.data.filter(
          (report: Report) => report.id !== reportId
        );
        
        console.log("DELETE: Reports after filtering:", updatedReports.length);
        
        // Update the query cache with our filtered data
        queryClient.setQueryData(["/api/reports"], {
          success: true,
          data: updatedReports
        });
        
        // Important! We must cancel any pending query invalidations that might restore 
        // the deleted report in the cache
        queryClient.cancelQueries({ queryKey: ["/api/reports"] });
      }
      
      toast({
        title: "Report deleted",
        description: "The report has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle viewing a report
  const handleViewReport = (report: Report) => {
    setViewingReport(report);
    setReportTitle(report.title);
    setGeneratedReport(report.content);
    setActiveTab("generate");
    
    // Set other fields if available
    if (report.reportType) setReportType(report.reportType);
    if (report.projectProgress) setProgress(report.projectProgress);
    if (report.challengesMitigations) setChallenges(report.challengesMitigations);
    if (report.proposalId) setSelectedProposal(report.proposalId.toString());
    if (report.modelName) setSelectedModelName(report.modelName);
  };
  
  // Export report as text file
  const handleExportAsText = (report: Report) => {
    const element = document.createElement("a");
    const file = new Blob([report.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Text file exported",
      description: "Your report has been exported as a text file"
    });
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Grant Reporting</h1>
        <p className="text-muted-foreground">
          Generate and manage reports for your funded grant projects
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate" className="flex items-center">
            <WandIcon className="mr-2 h-4 w-4" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center">
            <FileIcon className="mr-2 h-4 w-4" />
            My Reports
          </TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Report Parameters</CardTitle>
                  <CardDescription>
                    Configure the parameters for your AI-generated report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="proposal">Select Project/Proposal</Label>
                    <Select value={selectedProposal} onValueChange={setSelectedProposal}>
                      <SelectTrigger id="proposal">
                        <SelectValue placeholder="Choose a proposal" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingProposals ? (
                          <SelectItem value="loading" disabled>
                            Loading proposals...
                          </SelectItem>
                        ) : proposals && proposals.length > 0 ? (
                          proposals.map((proposal: Proposal) => (
                            <SelectItem key={proposal.id} value={proposal.id.toString()}>
                              {proposal.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No proposals available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger id="report-type">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="progress">Progress Report</SelectItem>
                        <SelectItem value="interim">Interim Report</SelectItem>
                        <SelectItem value="final">Final Report</SelectItem>
                        <SelectItem value="financial">Financial Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="progress">Project Progress</Label>
                    <Textarea 
                      id="progress" 
                      placeholder="Describe your project progress and key achievements" 
                      rows={4}
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="challenges">Challenges & Mitigations</Label>
                    <Textarea 
                      id="challenges" 
                      placeholder="Describe any challenges faced and how they were addressed" 
                      rows={4}
                      value={challenges}
                      onChange={(e) => setChallenges(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleGenerateReport}
                    disabled={generateReportMutation.isPending || !selectedProposal || !reportType}
                  >
                    {generateReportMutation.isPending ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileTextIcon className="mr-2 h-4 w-4" />
                        Generate Report
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
                      <CardTitle>Generated Report</CardTitle>
                      <CardDescription>
                        Review and edit your AI-generated grant report
                      </CardDescription>
                    </div>
                    {generatedReport && (
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
                  {generateReportMutation.isPending ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-muted-foreground">Generating your report...</p>
                        <p className="text-xs text-muted-foreground">This may take a few moments</p>
                      </div>
                    </div>
                  ) : generatedReport ? (
                    <div className="space-y-4" ref={reportContentRef}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="report-title">Report Title</Label>
                          <PdfExportButton
                            targetRef={reportContentRef}
                            options={{
                              title: reportTitle || "Grant Report",
                              filename: `${reportTitle || "grant-report"}.pdf`,
                              headerText: "VenThatGrant - Grant Report",
                              footerText: "Generated with VenThatGrant"
                            }}
                            buttonText="Export to PDF"
                            className="h-8 px-2 py-0"
                          >
                            <span className="flex items-center">
                              <DownloadIcon className="mr-1 h-3 w-3" />
                              Export PDF
                            </span>
                          </PdfExportButton>
                        </div>
                        <Input 
                          id="report-title" 
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="report-content">Report Content</Label>
                        <Textarea 
                          id="report-content" 
                          className="h-96 font-mono text-sm"
                          value={generatedReport}
                          onChange={(e) => setGeneratedReport(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-center">
                      <div>
                        <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="mt-4 text-lg font-medium">No report generated yet</h3>
                        <p className="text-muted-foreground">
                          Fill in the parameters and click "Generate Report"
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                {generatedReport && (
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={handleSaveReport}
                      disabled={saveReportMutation.isPending || !reportTitle}
                    >
                      {saveReportMutation.isPending ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Report"
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Saved Reports Tab */}
        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
              <CardDescription>
                View and manage your saved grant reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="text-center py-8">
                  <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading your reports...</p>
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="divide-y">
                  {reports.map((report: Report) => (
                    <div key={report.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{report.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {report.createdAt && new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewReport(report)}
                          >
                            View
                          </Button>
                          
                          <div className="flex gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  title="Export Report"
                                >
                                  <DownloadIcon className="h-4 w-4 mr-1" />
                                  <ChevronDownIcon className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Export as PDF
                                  const pdfDoc = new jsPDF();
                                  
                                  // Add title
                                  pdfDoc.setFontSize(18);
                                  pdfDoc.text(report.title, 14, 20);
                                  
                                  // Add date
                                  if (report.createdAt) {
                                    pdfDoc.setFontSize(12);
                                    pdfDoc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, 14, 30);
                                  }
                                  
                                  // Add content with line wrapping
                                  pdfDoc.setFontSize(11);
                                  const textLines = pdfDoc.splitTextToSize(report.content, 180);
                                  pdfDoc.text(textLines, 14, 40);
                                  
                                  // Add footer
                                  const pageCount = pdfDoc.getNumberOfPages();
                                  for (let i = 1; i <= pageCount; i++) {
                                    pdfDoc.setPage(i);
                                    pdfDoc.setFontSize(8);
                                    pdfDoc.text('Generated with VenThatGrant', 14, pdfDoc.internal.pageSize.height - 10);
                                  }
                                  
                                  // Save PDF
                                  pdfDoc.save(`${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
                                  
                                  toast({
                                    title: "PDF Exported",
                                    description: "Your report has been exported as a PDF"
                                  });
                                }}>
                                  <FileIcon className="mr-2 h-4 w-4" />
                                  <span>Export as PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportAsText(report)}>
                                  <FileTextIcon className="mr-2 h-4 w-4" />
                                  <span>Export as Text</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  title="Delete report"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this report? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => {
                                      // Track this ID in our deleted reports list immediately
                                      setDeletedReportIds(prev => {
                                        const newIds = [...prev, report.id];
                                        console.log("DELETE BUTTON: Added report ID to deletion tracking:", report.id);
                                        console.log("DELETE BUTTON: Updated deletedReportIds:", newIds);
                                        return newIds;
                                      });
                                      
                                      // Fire the delete mutation to remove from database
                                      deleteReportMutation.mutate(report.id);
                                      
                                      // Also remove from the UI right away by updating the query cache
                                      const currentData = queryClient.getQueryData(["/api/reports"]) as any;
                                      if (currentData && currentData.data) {
                                        const updatedData = {
                                          ...currentData,
                                          data: currentData.data.filter((r: any) => r.id !== report.id)
                                        };
                                        console.log("DELETE BUTTON: Updating query cache, removing report:", report.id);
                                        // Update the query cache
                                        queryClient.setQueryData(["/api/reports"], updatedData);
                                        
                                        // Cancel any pending refetches that might restore deleted reports
                                        queryClient.cancelQueries({ queryKey: ["/api/reports"] });
                                      }
                                    }}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {report.content.substring(0, 180)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No reports yet</h3>
                  <p className="text-muted-foreground">
                    Generate a report to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Templates Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Report Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-6">
              <div className="h-12 w-12 flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              </div>
              <h3 className="font-medium">Progress Report</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Updates on project milestones, activities, and achievements.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-6">
              <div className="h-12 w-12 flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400 rounded-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hourglass"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
              </div>
              <h3 className="font-medium">Interim Report</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Mid-project evaluation with preliminary results and next steps.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-6">
              <div className="h-12 w-12 flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400 rounded-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h3 className="font-medium">Final Report</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Comprehensive summary of outcomes, impact, and future implications.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-6">
              <div className="h-12 w-12 flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400 rounded-lg mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-piggy-bank"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h0"/></svg>
              </div>
              <h3 className="font-medium">Financial Report</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Detailed breakdown of expenses, budget usage, and financial planning.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
