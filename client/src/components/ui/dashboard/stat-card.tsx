import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  change?: {
    value: string | number;
    trend: "up" | "down" | "neutral";
  };
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  change, 
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10"
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md ${iconBgColor} p-3`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold">
                {value}
              </p>
              {change && (
                <p 
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change.trend === "up" 
                      ? "text-green-600" 
                      : change.trend === "down" 
                        ? "text-red-600" 
                        : "text-muted-foreground"
                  }`}
                >
                  {change.trend === "up" && <span className="text-lg mr-0.5">↑</span>}
                  {change.trend === "down" && <span className="text-lg mr-0.5">↓</span>}
                  <span>{change.value}</span>
                </p>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
