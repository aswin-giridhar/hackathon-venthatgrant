import { MainLayout } from "@/components/ui/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  UserIcon, 
  MailIcon, 
  BuildingIcon, 
  SettingsIcon,
  ActivityIcon,
  FileTextIcon,
  CalendarIcon,
  AtSignIcon
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  if (!user) return null;
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    
    // If there's a full name, use the first letter of the first name
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    
    // Otherwise use first letter of username
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 1); // Just the first letter
  };
  
  // Sample profile picture URLs - in a real app, these would come from the user's profile
  const profilePictures = [
    "https://i.pravatar.cc/300?img=1",
    "https://i.pravatar.cc/300?img=2",
    "https://i.pravatar.cc/300?img=3",
    "https://i.pravatar.cc/300?img=4",
    "https://i.pravatar.cc/300?img=5"
  ];
  
  // For demo, use a consistent profile picture based on user id
  const profilePicture = user?.profilePicture || 
    (user && user.id ? profilePictures[user.id % profilePictures.length] : profilePictures[0]);
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          View and manage your profile information
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                {profilePicture ? (
                  <AvatarImage src={profilePicture} alt={user.username} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {getInitials(user.fullName || user.username)}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">{user.fullName || user.username}</CardTitle>
            <div className="flex items-center justify-center mt-1 text-muted-foreground">
              <AtSignIcon className="h-4 w-4 mr-1" />
              <span>{user.username}</span>
            </div>
            <CardDescription className="mt-1">{user.email}</CardDescription>
            <div className="mt-2">
              <Badge variant="secondary" className="mt-2">
                {user.plan === "premium" ? "Premium Plan" : "Free Plan"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {user.organization && (
                <div className="flex items-center text-sm">
                  <BuildingIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span>{user.organization}</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setLocation("/settings")}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Activity Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Your recent activity and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileTextIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">0</h3>
                  <p className="text-sm text-muted-foreground">Active Proposals</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ActivityIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">0</h3>
                  <p className="text-sm text-muted-foreground">Grant Reports</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {new Date().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Active</h3>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}