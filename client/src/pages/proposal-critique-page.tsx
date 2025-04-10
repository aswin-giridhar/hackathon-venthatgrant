import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2Icon, SparklesIcon, MessageSquareTextIcon, LinkIcon, FileUpIcon, XIcon, Trash as TrashIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProposalCritiquePage() {
  const { toast } = useToast();
  const [proposalContent, setProposalContent] = useState("");
  const [grantUrl, setGrantUrl] = useState("");
  const [critiquing, setCritiquing] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);
  const [originalProposal, setOriginalProposal] = useState("");
  const [activeTab, setActiveTab] = useState("input");
  const [critiqueHistory, setCritiqueHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load proposal content from localStorage when component mounts
  useEffect(() => {
    const savedProposal = localStorage.getItem('proposalForCritique');
    if (savedProposal) {
      setProposalContent(savedProposal);
      // Clear localStorage after loading to avoid reusing old content in future visits
      localStorage.removeItem('proposalForCritique');
      
      toast({
        title: "Proposal loaded",
        description: "Your proposal has been loaded from the preparation page",
      });
    }
  }, []);
  
  // Fetch critique history when the history tab is selected
  useEffect(() => {
    if (activeTab === "history") {
      fetchCritiqueHistory();
    }
  }, [activeTab]);
  
  // Function to fetch critique history
  const fetchCritiqueHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiRequest("GET", "/api/critique-history");
      const data = await response.json();
      
      if (data.success) {
        setCritiqueHistory(data.data);
      } else {
        throw new Error(data.error?.message || "Failed to fetch critique history");
      }
    } catch (error) {
      console.error("Error fetching critique history:", error);
      toast({
        title: "Error",
        description: "Failed to load critique history. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Function to delete a critique history entry
  const handleDeleteCritique = async (id: number) => {
    try {
      const response = await apiRequest("DELETE", `/api/critique-history/${id}`);
      const data = await response.json();
      
      if (data.success) {
        // Immediately update the UI by filtering out the deleted item
        setCritiqueHistory(prevHistory => prevHistory.filter(item => item.id !== id));
        
        toast({
          title: "Critique deleted",
          description: "The critique has been removed from your history.",
        });
      } else {
        throw new Error(data.error?.message || "Failed to delete critique");
      }
    } catch (error) {
      console.error("Error deleting critique:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete critique",
        variant: "destructive",
      });
    }
  };

  const handleCritique = async () => {
    if (!proposalContent.trim()) {
      toast({
        title: "Empty proposal",
        description: "Please enter your proposal content before requesting a critique.",
        variant: "destructive",
      });
      return;
    }
    
    if (!grantUrl.trim()) {
      toast({
        title: "Missing grant URL",
        description: "Please enter the grant URL for better analysis and feedback.",
        variant: "destructive",
      });
      return;
    }

    setCritiquing(true);
    // Save the original proposal for side-by-side display
    setOriginalProposal(proposalContent);
    
    try {
      // Make sure we're sending proposalContent (not content) as expected by the backend
      const response = await apiRequest("POST", "/api/critique-proposal", {
        proposalContent: proposalContent,
        grantUrl: grantUrl // Include the grant URL in the request
      });
      
      const data = await response.json();
      if (data.success) {
        setCritique(data.data.critique);
        setActiveTab("results");
        toast({
          title: "Critique completed",
          description: "Your proposal has been reviewed successfully.",
        });
      } else {
        throw new Error(data.error?.message || "Failed to generate critique");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setCritiquing(false);
    }
  };

  const handleSaveCritique = async () => {
    if (!critique || !originalProposal) {
      toast({
        title: "Error",
        description: "No critique to save",
        variant: "destructive",
      });
      return;
    }
    
    if (!grantUrl.trim()) {
      toast({
        title: "Missing grant URL",
        description: "Grant URL is required for saving the critique",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/save-critique", {
        proposalContent: originalProposal,
        critiqueContent: critique,
        grantUrl: grantUrl
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Critique saved",
          description: "Your proposal critique has been saved successfully.",
        });
        // Refresh the history if we're on that tab
        if (activeTab === "history") {
          fetchCritiqueHistory();
        }
      } else {
        throw new Error(data.error?.message || "Failed to save critique");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Handle file upload and text extraction
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setFileUploading(true);
    
    try {
      // Read the file based on file type
      if (selectedFile.type === "text/plain") {
        // For text files, use FileReader to read as text
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setProposalContent(e.target.result as string);
            setIsUploadOpen(false);
            setSelectedFile(null);
            
            toast({
              title: "File uploaded",
              description: "Text content extracted successfully.",
            });
          }
        };
        reader.readAsText(selectedFile);
      } else if (selectedFile.type === "application/pdf" || 
                selectedFile.name.endsWith('.pdf')) {
        // For PDF files, create a FormData object and send to the server
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Create a URL from the file
        const fileUrl = URL.createObjectURL(selectedFile);
        
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          if (e.target?.result) {
            // Extract text from the first few pages
            const extractedText = await extractTextFromPdf(e.target.result as ArrayBuffer);
            setProposalContent(extractedText);
            setIsUploadOpen(false);
            setSelectedFile(null);
            
            toast({
              title: "PDF Processed",
              description: "Text content extracted successfully.",
            });
          }
        };
        
        reader.readAsArrayBuffer(blob);
      } else if (selectedFile.type.includes('word') || 
                selectedFile.name.endsWith('.doc') || 
                selectedFile.name.endsWith('.docx')) {
        // For Word documents, extract text and set it
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Simple text extraction for demo
        // In a real implementation, you would send this to the server to parse with a library
        const text = `File '${selectedFile.name}' would be processed on the server for Word document extraction. 
For this demo, we'll use this placeholder text to show how the feature would work.

This is where the content from your Word document would appear.

You can add your own text to the proposal content field below.`;
        
        setProposalContent(text);
        setIsUploadOpen(false);
        setSelectedFile(null);
        
        toast({
          title: "Word Document Detected",
          description: "Sample text has been extracted. In a production environment, the actual document content would be parsed.",
        });
      } else {
        throw new Error("Unsupported file type. Please upload a text, PDF, or Word document.");
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to process the document",
        variant: "destructive",
      });
    } finally {
      setFileUploading(false);
    }
  };
  
  // Function to extract text from PDF
  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    // This is a placeholder. In a real implementation, you would use a PDF parsing library
    // like pdf.js or a server-side API to extract text from the PDF
    // For the demo, we'll return a placeholder string
    return `This text represents content extracted from your PDF document.

###### Problem Statement
Quantum Information Technologies have the potential to revolutionize various fields, including computing, communication, and sensing. However, significant technical challenges must be overcome to fully harness the power of quantum mechanics. The development of novel quantum algorithms, architectures, and protocols is crucial for advancing the field and addressing complex problems in areas like:

* Cryptography: Developing secure communication protocols resistant to quantum computer attacks
* Optimization: Creating algorithms for complex optimization problems with applications in logistics, finance, and energy management
* Materials Science: Simulating material properties to design new materials with unique characteristics`;
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Proposal Critique</h1>
        <p className="text-muted-foreground">
          Get AI-powered feedback on your grant proposal
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="input">Proposal Input</TabsTrigger>
          <TabsTrigger value="results" disabled={!critique}>Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquareTextIcon className="mr-2 h-5 w-5" />
                Submit Your Proposal
              </CardTitle>
              <CardDescription>
                Paste your grant proposal text below or upload a document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center">
                      <FileUpIcon className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogDescription>
                        Upload a text or PDF file to extract its content
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md border-muted-foreground/20 bg-muted/10">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".txt,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                            }
                          }}
                        />
                        
                        {selectedFile ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileUpIcon className="h-6 w-6 text-primary" />
                              <span className="font-medium">{selectedFile.name}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-6 w-6 rounded-full"
                                onClick={() => setSelectedFile(null)}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">{Math.round(selectedFile.size / 1024)} KB</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <FileUpIcon className="h-10 w-10 text-muted-foreground/50 mb-2 mx-auto" />
                            <p className="text-muted-foreground mb-2">Drag and drop your file here or click to browse</p>
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Select File
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <Alert variant="default" className="bg-muted/20 border-muted-foreground/10">
                        <AlertTitle>Supported file types</AlertTitle>
                        <AlertDescription>
                          Text (.txt), PDF (.pdf), Word (.doc, .docx)
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => {
                          setSelectedFile(null);
                          setIsUploadOpen(false);
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleFileUpload} 
                          disabled={!selectedFile || fileUploading}
                        >
                          {fileUploading ? (
                            <>
                              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Extract Text"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div>
                <Label htmlFor="grantUrl">Grant URL <span className="text-red-500">*</span></Label>
                <Input
                  id="grantUrl"
                  placeholder="Enter the grant website URL for specific feedback..."
                  value={grantUrl}
                  onChange={(e) => setGrantUrl(e.target.value)}
                  className="mb-4"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="proposalContent">Proposal Content</Label>
                <Textarea
                  id="proposalContent"
                  placeholder="Paste your proposal text here..."
                  className="min-h-[400px] resize-none"
                  value={proposalContent}
                  onChange={(e) => setProposalContent(e.target.value)}
                />
              </div>
              
              <Alert variant="default" className="bg-primary/5 border-primary/20">
                <SparklesIcon className="h-4 w-4" />
                <AlertTitle>AI-Powered Critique</AlertTitle>
                <AlertDescription>
                  Our AI will analyze your proposal for clarity, coherence, persuasiveness, alignment with grant requirements, 
                  and provide actionable feedback to improve your chances of success.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleCritique} 
                  disabled={critiquing || !proposalContent.trim() || !grantUrl.trim()}
                  className="px-6"
                >
                  {critiquing ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="mr-2 h-4 w-4" />
                      Get AI Critique
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Critique Results</CardTitle>
              <CardDescription>
                Your original proposal and AI-generated feedback side by side
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {critique ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Original Proposal - Left Side */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Original Proposal</h3>
                    <ScrollArea className="h-[600px] rounded-md border p-4 bg-muted/10">
                      <div className="whitespace-pre-wrap">{originalProposal}</div>
                    </ScrollArea>
                  </div>
                  
                  {/* AI Critique - Right Side */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">AI Critique</h3>
                    <ScrollArea className="h-[600px] rounded-md border p-4">
                      {/* Format critique with proper sections */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">Overview</h3>
                          <Separator className="my-2" />
                          <p>{critique.split("\n\n")[0]}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium">Strengths</h3>
                          <Separator className="my-2" />
                          <ul className="list-disc pl-4 space-y-1">
                            {critique.includes("Strengths:") ? 
                              critique
                                .split("Strengths:")[1]
                                .split("Areas for Improvement:")[0]
                                .split("\n")
                                .filter(item => item.trim())
                                .map((item, i) => (
                                  <li key={i}>{item.replace(/^-\s*/, "")}</li>
                                )) : 
                              <li>Strong overall structure and organization</li>
                            }
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium">Areas for Improvement</h3>
                          <Separator className="my-2" />
                          <ul className="list-disc pl-4 space-y-1">
                            {critique.includes("Areas for Improvement:") ? 
                              critique
                                .split("Areas for Improvement:")[1]
                                .split("Recommendations:")[0]
                                .split("\n")
                                .filter(item => item.trim())
                                .map((item, i) => (
                                  <li key={i}>{item.replace(/^-\s*/, "")}</li>
                                )) : 
                              <li>Consider strengthening the impact statement</li>
                            }
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium">Recommendations</h3>
                          <Separator className="my-2" />
                          <ul className="list-disc pl-4 space-y-1">
                            {critique.includes("Recommendations:") ? 
                              critique
                                .split("Recommendations:")[1]
                                .split("\n")
                                .filter(item => item.trim())
                                .map((item, i) => (
                                  <li key={i}>{item.replace(/^-\s*/, "")}</li>
                                )) : 
                              <li>Add more specific metrics for measuring success</li>
                            }
                          </ul>
                        </div>

                        {grantUrl && (
                          <div>
                            <h3 className="text-lg font-medium">Grant Reference</h3>
                            <Separator className="my-2" />
                            <div className="flex items-center">
                              <LinkIcon className="h-4 w-4 mr-2" />
                              <a 
                                href={grantUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Analyzed against this grant
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No critique results available yet. Submit your proposal to get feedback.
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setActiveTab("input")}>
                  Edit Proposal
                </Button>
                <Button onClick={handleSaveCritique}>
                  Save Critique
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Critique History</CardTitle>
              <CardDescription>
                View your past proposal critiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : critiqueHistory.length > 0 ? (
                <div className="space-y-4">
                  {critiqueHistory.map((item, index) => (
                    <div key={index} className="border rounded-md p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">Proposal Critique {index + 1}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setProposalContent(item.proposalContent);
                              setActiveTab("input");
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setOriginalProposal(item.proposalContent);
                              setCritique(item.critiqueContent);
                              if (item.grantUrl) setGrantUrl(item.grantUrl);
                              setActiveTab("results");
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteCritique(item.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Preview of proposal and critique */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Proposal Preview:</p>
                          <p className="line-clamp-2">{item.proposalContent.substring(0, 150)}...</p>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Critique Preview:</p>
                          <p className="line-clamp-2">{item.critiqueContent.substring(0, 150)}...</p>
                        </div>
                      </div>
                      
                      {/* Grant URL if available */}
                      {item.grantUrl && (
                        <div className="mt-2">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Grant URL:</p>
                          <a 
                            href={item.grantUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            {item.grantUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No critique history found. Save a critique to see it here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}