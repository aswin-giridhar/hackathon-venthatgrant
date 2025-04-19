import { useState, useEffect } from "react";
import { MainLayout } from "@/components/ui/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { BellIcon, KeyIcon, UserIcon, ImageIcon, UploadIcon, BrainIcon, BadgeInfoIcon, WalletIcon, ExternalLinkIcon, ListChecksIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<string | null>(null);
  const [preferredLlmModel, setPreferredLlmModel] = useState<string>('venice');
  
  // Initialize model preference from user data
  useEffect(() => {
    if (user?.preferredLlmModel) {
      setPreferredLlmModel(user.preferredLlmModel);
    }
  }, [user]);

  // Sample profile picture URLs - in a real app, these would be stored in a database
  const profilePictureOptions = [
    { value: "https://i.pravatar.cc/300?img=1", label: "Avatar 1" },
    { value: "https://i.pravatar.cc/300?img=2", label: "Avatar 2" },
    { value: "https://i.pravatar.cc/300?img=3", label: "Avatar 3" },
    { value: "https://i.pravatar.cc/300?img=4", label: "Avatar 4" },
    { value: "https://i.pravatar.cc/300?img=5", label: "Avatar 5" },
    { value: "https://i.pravatar.cc/300?img=6", label: "Avatar 6" },
    { value: "https://i.pravatar.cc/300?img=7", label: "Avatar 7" },
    { value: "https://i.pravatar.cc/300?img=8", label: "Avatar 8" },
  ];

  // For demo, use a consistent profile picture based on user id
  const currentProfilePicture = user?.profilePicture || 
    (user && user.id ? profilePictureOptions[user.id % profilePictureOptions.length].value : profilePictureOptions[0].value);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    
    // If there's a full name, use the first letter of the first name
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    
    // Otherwise use first letter of username or the first two letters if available
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 1); // Just the first letter
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);
    
    try {
      const updateData = {
        fullName: formData.get('fullName') as string,
        organization: formData.get('organization') as string,
        profilePicture: selectedProfilePicture || currentProfilePicture
      };
      
      // Log the data being sent to the API
      console.log("Updating profile with:", updateData);
      
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        credentials: 'include' // Important for sending cookies with the request
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully.",
        });
        
        // Refresh the page to show updated profile info
        // In a production app, you'd use react-query's queryClient.invalidateQueries('/api/user')
        // to refresh the user data without a full page reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    }, 1000);
  };
  
  const handleAiModelUpdate = async () => {
    setLoading(true);
    
    try {      
      await apiRequest("PATCH", "/api/user", {
        preferredLlmModel: preferredLlmModel
      });
      
      toast({
        title: "Settings updated",
        description: "Your Venice AI settings have been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Settings update error:", error);
      toast({
        title: "Error updating settings",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
          <TabsTrigger value="educhain">EDUChain</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="mr-2 h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-8 mb-6">
                  <div className="flex flex-col items-center">
                    <Label className="mb-2">Profile Picture</Label>
                    <Avatar className="h-24 w-24">
                      {(selectedProfilePicture || currentProfilePicture) ? (
                        <AvatarImage 
                          src={selectedProfilePicture || currentProfilePicture} 
                          alt={user?.username || "User"} 
                        />
                      ) : null}
                      <AvatarFallback className="text-2xl">
                        {getInitials(user?.fullName || user?.username)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="profilePicture">Choose a Profile Picture</Label>
                    <Select 
                      onValueChange={(value) => setSelectedProfilePicture(value)}
                      defaultValue={currentProfilePicture}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile picture" />
                      </SelectTrigger>
                      <SelectContent>
                        {profilePictureOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select from our gallery of profile pictures
                    </p>
                    
                    {/* This would be used in a real app to upload custom images */}
                    <div className="pt-4">
                      <Label htmlFor="customPicture">Or Upload Your Own</Label>
                      <div className="flex gap-3 mt-2">
                        <Input 
                          id="customPicture" 
                          type="file" 
                          className="w-full"
                          disabled
                        />
                        <Button variant="outline" type="button" disabled>
                          <UploadIcon className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coming soon: Upload your own custom profile picture (Maximum size: 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="Enter your username" 
                      defaultValue={user?.username || ""}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Username cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      placeholder="Enter your full name" 
                      defaultValue={user?.fullName || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email" 
                      defaultValue={user?.email || ""}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input 
                      id="organization" 
                      placeholder="Enter your organization" 
                      defaultValue={user?.organization || ""}
                    />
                  </div>

                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <KeyIcon className="mr-2 h-5 w-5" />
                Password
              </CardTitle>
              <CardDescription>
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Enter your current password" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Enter your new password" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Confirm your new password" 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with an additional security layer
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button variant="outline">Configure 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BellIcon className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive grant opportunity notifications via email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Grant deadlines</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about upcoming grant deadlines
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Proposal progress</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your proposal's status
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing emails</p>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional emails and special offers
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex justify-end mt-4">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BrainIcon className="mr-2 h-5 w-5" />
                Venice.AI Configuration
              </CardTitle>
              <CardDescription>
                Configure your Venice.AI API key for grant writing, proposal critique, reporting, and coaching features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">About Venice.AI</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Venice.AI powers all our AI features, including proposal preparation, 
                    proposal critique, grant reporting, and AI coaching with specialized expertise.
                  </p>
                  
                  <div className="flex items-start space-x-3 border rounded-lg p-4 border-primary">
                    <div className="space-y-2 flex-1">
                      <Label className="text-base font-medium">Venice.AI</Label>
                      <p className="text-sm text-muted-foreground">
                        Venice was founded on the principle that civilization is best served by powerful machine 
                        intelligence when it respects the sovereignty of those who use it. Therefore, it must be 
                        private by default, it must permit free and open thought, and it must be based on the world's 
                        leading open-source technologies. Here, your conversations and creations belong to you alone, 
                        not to corporations, not to governments, and not to us. In this, Venice stands alone among its peers.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg border border-muted flex items-start space-x-3">
                  <BadgeInfoIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Venice.AI Integration</p>
                    <p className="text-muted-foreground">
                      This application uses Venice.AI for all AI-powered features. Our platform is already 
                      configured with Venice.AI's services, so you can immediately take advantage of all our 
                      grant writing and proposal generation features without any additional setup.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium">Venice AI Model Selection</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which Venice AI model to use for different tasks in the application. Each model has different strengths.
                  </p>
                  
                  <div className="space-y-4">
                    <RadioGroup
                      value={preferredLlmModel}
                      onValueChange={setPreferredLlmModel}
                    >
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="venice" id="venice" className="mt-1" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="venice" className="font-medium">Venice Default (Automatic Selection)</Label>
                          <p className="text-sm text-muted-foreground">
                            Venice will automatically select the most appropriate model for each task 
                            (recommended for most users)
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="llama-3.3-70b" id="llama-3.3-70b" className="mt-1" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="llama-3.3-70b" className="font-medium">Llama 3.3 70B (Balanced)</Label>
                          <p className="text-sm text-muted-foreground">
                            A versatile model with strong function calling support, good for most tasks
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="llama-3.1-405b" id="llama-3.1-405b" className="mt-1" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="llama-3.1-405b" className="font-medium">Llama 3.1 405B (Most Intelligent)</Label>
                          <p className="text-sm text-muted-foreground">
                            Highest capability model for the most comprehensive proposals and reports, but may be slower
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="deepseek-r1-671b" id="deepseek-r1-671b" className="mt-1" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="deepseek-r1-671b" className="font-medium">DeepSeek R1 671B (Reasoning Focused)</Label>
                          <p className="text-sm text-muted-foreground">
                            Advanced reasoning capabilities, especially good for proposal critique and complex reasoning tasks
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="llama-3.2-3b" id="llama-3.2-3b" className="mt-1" />
                        <div className="grid gap-1.5">
                          <Label htmlFor="llama-3.2-3b" className="font-medium">Llama 3.2 3B (Fast)</Label>
                          <p className="text-sm text-muted-foreground">
                            Faster response times with good accuracy, best when speed is a priority
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleAiModelUpdate}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="educhain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <WalletIcon className="mr-2 h-5 w-5" />
                EDUChain Wallet Configuration
              </CardTitle>
              <CardDescription>
                Setup your wallet for EDU Chain to interact with Open Campus ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Setting Up RPC Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Before claiming test tokens, you need to configure the test network for EDU Chain in your wallet. 
                    Using MetaMask as an example:
                  </p>
                  
                  <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                    <p className="text-sm">
                      Open your wallet and click <span className="font-medium">Select a network → Add a custom network</span>. 
                      Enter the following RPC details:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Network Name</Label>
                        <div className="flex">
                          <Input 
                            value="Open Campus Codex" 
                            readOnly
                            className="bg-background"
                          />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText("Open Campus Codex");
                              toast({
                                title: "Copied to clipboard",
                                description: "Network name copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>RPC URL</Label>
                        <div className="flex">
                          <Input 
                            value="https://rpc.open-campus-codex.gelato.digital"
                            readOnly
                            className="bg-background"
                          />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText("https://rpc.open-campus-codex.gelato.digital");
                              toast({
                                title: "Copied to clipboard",
                                description: "RPC URL copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Chain ID</Label>
                        <div className="flex">
                          <Input 
                            value="656476"
                            readOnly
                            className="bg-background"
                          />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText("656476");
                              toast({
                                title: "Copied to clipboard",
                                description: "Chain ID copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Native Currency Symbol</Label>
                        <div className="flex">
                          <Input 
                            value="EDU"
                            readOnly
                            className="bg-background"
                          />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText("EDU");
                              toast({
                                title: "Copied to clipboard",
                                description: "Currency symbol copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Block Explorer URL</Label>
                        <div className="flex">
                          <Input 
                            value="https://opencampus-codex.blockscout.com/"
                            readOnly
                            className="bg-background"
                          />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText("https://opencampus-codex.blockscout.com/");
                              toast({
                                title: "Copied to clipboard",
                                description: "Explorer URL copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      After setting up the network, your wallet balance should show 0 EDU tokens.
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Claiming Test Tokens</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Follow these steps to claim test tokens for the EDU Chain testnet:
                  </p>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                        <div>
                          <p className="font-medium">Create or Log into dRPC Account</p>
                          <p className="text-sm text-muted-foreground">
                            Register and log in to dRPC at the faucet link below. This is quick and free.
                          </p>
                          <div className="mt-2">
                            <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open("https://drpc.org/faucet/open-campus-codex", "_blank")}>
                              <ExternalLinkIcon className="h-4 w-4" />
                              Visit dRPC Faucet
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                        <div>
                          <p className="font-medium">Connect Your Wallet to EDU Chain Testnet</p>
                          <p className="text-sm text-muted-foreground">
                            Configure your wallet for the EDU Chain test network. After connecting, you'll see a prompt to complete an off-chain signature to confirm your account. This process doesn't consume any gas.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                        <div>
                          <p className="font-medium">Use Proof-of-Work to Start Minting</p>
                          <p className="text-sm text-muted-foreground">
                            To prevent abuse, the faucet uses a lightweight Proof-of-Work mechanism for verification. This isn't real mining but a simple security step to validate requests.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                        <div>
                          <p className="font-medium">Claim Tokens with Gitcoin Passport</p>
                          <p className="text-sm text-muted-foreground">
                            If you have a Gitcoin account with a verified score, you can also claim test tokens through this method.
                          </p>
                          <div className="mt-2">
                            <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open("https://www.hackquest.io/learn/142e7446-5ed5-812f-9251-edcb031ef53e/142e7446-5ed5-817d-bd46-de4c6a71d944", "_blank")}>
                              <ExternalLinkIcon className="h-4 w-4" />
                              Learn More About Gitcoin Claiming
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">$EDU Token Contract Addresses</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The $EDU token is available on multiple chains. Here are the official contract addresses:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>BNB Chain (BEP-20)</Label>
                      <div className="flex">
                        <Input 
                          value="0xBdEAe1cA48894A1759A8374D63925f21f2Ee2639"
                          readOnly
                          className="bg-background font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          className="ml-2" 
                          onClick={() => {
                            navigator.clipboard.writeText("0xBdEAe1cA48894A1759A8374D63925f21f2Ee2639");
                            toast({
                              title: "Copied to clipboard",
                              description: "BNB Chain contract address copied",
                            });
                          }}
                        >
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          className="ml-2" 
                          onClick={() => window.open("https://bscscan.com/token/0xBdEAe1cA48894A1759A8374D63925f21f2Ee2639", "_blank")}
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ethereum (ERC-20)</Label>
                      <div className="flex">
                        <Input 
                          value="0xf8173a39c56a554837c4c7f104153a005d284d11"
                          readOnly
                          className="bg-background font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          className="ml-2" 
                          onClick={() => {
                            navigator.clipboard.writeText("0xf8173a39c56a554837c4c7f104153a005d284d11");
                            toast({
                              title: "Copied to clipboard",
                              description: "Ethereum contract address copied",
                            });
                          }}
                        >
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          className="ml-2" 
                          onClick={() => window.open("https://etherscan.io/address/0xf8173a39c56a554837c4c7f104153a005d284d11", "_blank")}
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open("https://userdocs.opencampus.xyz/tokens/usdedu/key-information/contract-address", "_blank")}>
                        <ExternalLinkIcon className="h-4 w-4" />
                        More information on $EDU token contracts
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Token Bridge</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    $EDU can be bridged between BNB Chain (BEP-20) & Ethereum (ERC-20) via Stargate.
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open("https://stargate.finance/transfer", "_blank")}>
                      <ExternalLinkIcon className="h-4 w-4" />
                      Bridge $EDU tokens with Stargate
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">About EDUChain and OCID</h3>
                  <p className="text-sm text-muted-foreground">
                    OCID (Open Campus ID) is a digital identity system based on Soulbound Token technology. It offers learners a decentralized digital identity represented as non-transferable NFTs. OCID emphasizes privacy and data security, enabling users to manage their learning achievements, professional qualifications, and project outcomes while deciding how and when to share this information.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open("https://id.opencampus.xyz/auth", "_blank")}>
                      <ExternalLinkIcon className="h-4 w-4" />
                      Apply for your OCID
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}