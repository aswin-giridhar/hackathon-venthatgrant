import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HomeIcon,
  SearchIcon,
  FileEditIcon,
  FileSearchIcon,
  FileTextIcon,
  UserCogIcon,
  HeadphonesIcon,
  BarChart3Icon,
  BrainCircuitIcon,
  CreditCardIcon,
  CreditCard,
  Loader2Icon,
  BookmarkIcon
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onLinkClick?: () => void;
}

export function Sidebar({ className, isMobile = false, onLinkClick }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Get real usage data
  const { data: usageData, isLoading: isLoadingUsage } = useQuery<{
    success: boolean;
    data: {
      aiProposalsUsed: number;
      aiProposalsLimit: number;
      aiProposalsRemaining: number;
      percentUsed: number;
    }
  }>({
    queryKey: ["/api/usage"],
    enabled: !!user,
  });

  type NavItem = {
    title: string;
    href: string;
    icon: React.ReactNode;
  };
  
  type NavSection = {
    section: string;
    items: NavItem[];
  };
  
  const navItems: (NavItem | NavSection)[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3Icon className="mr-3 h-5 w-5" />,
    },
    {
      section: "Grant Management",
      items: [
        {
          title: "Grant Finder",
          href: "/grant-finder",
          icon: <SearchIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Saved Grants",
          href: "/saved-grants",
          icon: <BookmarkIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Proposal Preparation",
          href: "/proposal-preparation",
          icon: <FileEditIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Proposal Critique",
          href: "/proposal-critique",
          icon: <FileSearchIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Grant Reporting",
          href: "/grant-reporting",
          icon: <FileTextIcon className="mr-3 h-5 w-5" />,
        }
        // AI Coaching page hidden temporarily
      ],
    },
    {
      section: "Account",
      items: [
        {
          title: "Settings",
          href: "/settings",
          icon: <UserCogIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Billing",
          href: "/billing",
          icon: <CreditCardIcon className="mr-3 h-5 w-5" />,
        },
        {
          title: "Support",
          href: "/support",
          icon: <HeadphonesIcon className="mr-3 h-5 w-5" />,
        },
      ],
    },
  ];

  return (
    <div className={cn("h-full flex flex-col border-r bg-background", className)}>
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md bg-gradient-to-r from-primary to-emerald-500 flex items-center justify-center text-white font-bold text-lg mr-3">
            V
          </div>
          <span className="text-xl font-semibold">VenThatGrant</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <nav className="flex flex-col gap-1 py-2">
          {navItems.map((item, i) => {
            // Check if this is a section type item
            if ('section' in item) {
              // It's a NavSection
              return (
                <div key={i} className="pt-4 pb-2">
                  <div className="px-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {item.section}
                    </h3>
                  </div>
                  
                  {item.items.map((subItem, j) => (
                    <div
                      key={j}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer",
                        location === subItem.href
                          ? "bg-secondary text-secondary-foreground"
                          : "text-foreground/70 hover:text-foreground hover:bg-accent"
                      )}
                      onClick={() => {
                        if (onLinkClick) onLinkClick();
                        setLocation(subItem.href);
                      }}
                    >
                      {subItem.icon}
                      <span>{subItem.title}</span>
                    </div>
                  ))}
                </div>
              );
            } else {
              // Type assertion to NavItem
              const navItem = item as NavItem;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center px-4 py-2.5 text-sm font-medium rounded-md cursor-pointer",
                    location === navItem.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground/70 hover:text-foreground hover:bg-accent"
                  )}
                  onClick={() => {
                    if (onLinkClick) onLinkClick();
                    setLocation(navItem.href);
                  }}
                >
                  {navItem.icon}
                  <span>{navItem.title}</span>
                </div>
              );
            }
          })}
        </nav>
      </ScrollArea>
      
      {user && (
        <div className="p-4 border-t">
          <div className="bg-secondary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {user.plan === "premium" ? "Premium plan" : "Free plan"}
            </p>
            
            {isLoadingUsage ? (
              <div className="py-2 flex items-center justify-center">
                <Loader2Icon className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Progress 
                  value={usageData?.success ? usageData.data.percentUsed : 0} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {user.plan === "premium" 
                    ? "Unlimited proposals" 
                    : usageData?.success
                      ? `${usageData.data.aiProposalsRemaining}/${usageData.data.aiProposalsLimit} AI proposals remaining`
                      : "Loading usage data..."}
                </p>
              </>
            )}
            
            {user.plan !== "premium" && (
              <Button
                size="sm"
                className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                asChild
              >
                <Link href="/billing"><CreditCard className="mr-2 h-4 w-4" />Upgrade Plan</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
