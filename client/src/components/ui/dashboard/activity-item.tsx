import { Activity } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { FileIcon, FileTextIcon, SearchIcon, BookmarkIcon, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  // Map activity types to icons and colors
  const getActivityIcon = (): { icon: LucideIcon; color: string; bgColor: string } => {
    switch (activity.type) {
      case "proposal_generation":
      case "proposal_creation":
        return { 
          icon: FileIcon, 
          color: "text-primary", 
          bgColor: "bg-primary-50 dark:bg-primary-900/30" 
        };
      case "proposal_critique":
        return { 
          icon: SearchIcon, 
          color: "text-blue-500", 
          bgColor: "bg-blue-50 dark:bg-blue-900/30" 
        };
      case "report_creation":
      case "report_generation":
        return { 
          icon: FileTextIcon, 
          color: "text-amber-500", 
          bgColor: "bg-amber-50 dark:bg-amber-900/30" 
        };
      case "grant_saved":
        return { 
          icon: BookmarkIcon, 
          color: "text-green-500", 
          bgColor: "bg-green-50 dark:bg-green-900/30" 
        };
      default:
        return { 
          icon: FileIcon, 
          color: "text-gray-500", 
          bgColor: "bg-gray-50 dark:bg-gray-800" 
        };
    }
  };

  const { icon: Icon, color, bgColor } = getActivityIcon();
  
  // Determine route based on entity type
  const getEntityRoute = () => {
    if (!activity.entityId || !activity.entityType) return "#";
    
    switch (activity.entityType) {
      case "proposal":
        return `/proposal-preparation/${activity.entityId}`;
      case "grant":
        return `/grant-finder/${activity.entityId}`;
      case "report":
        return `/grant-reporting/${activity.entityId}`;
      default:
        return "#";
    }
  };

  return (
    <div className="p-4 hover:bg-secondary/10 rounded-md">
      <div className="flex items-start">
        <div className="relative mt-1">
          <div className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium">{activity.type.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</p>
          <p className="text-sm text-muted-foreground">{activity.description}</p>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              {activity.createdAt && formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </p>
            {activity.entityId && activity.entityType && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={getEntityRoute()}>View details</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
