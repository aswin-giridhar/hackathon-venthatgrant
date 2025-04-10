import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { LucideIcon, CalendarIcon, LightbulbIcon, FileChartColumn } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionText: string;
  actionLink: string;
  type: "grant" | "deadline" | "report";
}

export function RecommendationCard({
  title,
  description,
  icon: Icon,
  actionText,
  actionLink,
  type,
}: RecommendationCardProps) {
  const getBgColor = () => {
    switch (type) {
      case "grant":
        return "bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800";
      case "deadline":
        return "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800";
      case "report":
        return "bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "grant":
        return "text-primary";
      case "deadline":
        return "text-blue-500";
      case "report":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  const getActionColor = () => {
    switch (type) {
      case "grant":
        return "text-primary hover:text-primary/90 dark:text-primary-400";
      case "deadline":
        return "text-blue-600 hover:text-blue-500 dark:text-blue-400";
      case "report":
        return "text-purple-600 hover:text-purple-500 dark:text-purple-400";
      default:
        return "text-gray-600 hover:text-gray-500 dark:text-gray-400";
    }
  };

  return (
    <Card className={cn("border", getBgColor())}>
      <CardContent className="p-4">
        <div className="flex items-center mb-2">
          <Icon className={cn("mr-2 h-5 w-5", getIconColor())} />
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link href={actionLink} className={cn("mt-2 inline-flex items-center text-xs font-medium", getActionColor())}>
          {actionText} <span className="ml-1">→</span>
        </Link>
      </CardContent>
    </Card>
  );
}

export function MatchingGrantsCard({ count, category }: { count: number; category: string }) {
  // Use a Button component with manual navigation instead of a Link
  const handleClick = () => {
    // Use window.location for guaranteed navigation
    window.location.href = "/grant-finder";
  };

  return (
    <Card className="bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 border">
      <CardContent className="p-4">
        <div className="flex items-center mb-2">
          <LightbulbIcon className="mr-2 h-5 w-5 text-primary" />
          <h4 className="text-sm font-medium">Matching Grants Found</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          We found {count} new grants matching your research profile in {category}.
        </p>
        <button 
          onClick={handleClick}
          className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:text-primary/90 dark:text-primary-400"
        >
          View matches <span className="ml-1">→</span>
        </button>
      </CardContent>
    </Card>
  );
}

export function UpcomingDeadlineCard({ grantName, daysLeft }: { grantName: string; daysLeft: number }) {
  return (
    <RecommendationCard
      title="Upcoming Deadline"
      description={`The "${grantName}" deadline is in ${daysLeft} days. Complete your application soon.`}
      icon={CalendarIcon}
      actionText="Continue draft"
      actionLink="/proposal-preparation"
      type="deadline"
    />
  );
}

export function ReportDueCard({ reportName, daysLeft }: { reportName: string; daysLeft: number }) {
  return (
    <RecommendationCard
      title="Reporting Due"
      description={`Your quarterly report for the "${reportName}" is due in ${daysLeft} days.`}
      icon={FileChartColumn}
      actionText="Generate report"
      actionLink="/grant-reporting"
      type="report"
    />
  );
}
