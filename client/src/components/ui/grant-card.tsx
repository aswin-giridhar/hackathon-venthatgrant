import { Grant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  CalendarIcon, 
  MapPinIcon, 
  AwardIcon, 
  ClockIcon, 
  BookmarkIcon, 
  SparklesIcon, 
  ZapIcon,
  LightbulbIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

// Define interfaces for the AI-enhanced grant features
export interface KeywordHighlight {
  word: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'funding' | 'eligibility' | 'deadline' | 'requirements' | 'outcome';
  explanation: string;
}

export interface MatchFactor {
  factor: string;
  weight: number;
  score: number;
}

export interface EnhancedGrant extends Grant {
  highlights?: KeywordHighlight[];
  matchScore?: number;
  matchReasons?: string[];
  keyFactors?: MatchFactor[];
  saved?: boolean;
}

interface GrantCardProps {
  grant: EnhancedGrant;
  onSave?: (grantId: number) => void;
  // Optional prop to control what page the card is shown on
  pageContext?: 'grant-finder' | 'saved-grants' | 'other';
}

export function GrantCard({ grant, onSave, pageContext = 'other' }: GrantCardProps) {
  // Use the saved property from the grant directly
  // No local state to ensure UI is consistent with data
  
  // Add logging to help debug saved status
  console.log(`GrantCard: Rendering grant ${grant.id}`, {
    grantTitle: grant.title,
    savedStatus: grant.saved,
    pageContext: pageContext,
  });
  
  const handleSave = () => {
    console.log(`GrantCard: Save button clicked for grant ${grant.id}`, {
      currentSavedStatus: grant.saved,
      pageContext: pageContext
    });
    
    if (onSave) {
      // Pass the ID to the handler
      onSave(grant.id);
    }
  };
  
  const getStatusBadge = () => {
    const now = new Date();
    const deadlineDate = grant.deadline ? new Date(grant.deadline) : null;
    
    if (!deadlineDate) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    const daysToDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToDeadline < 0) {
      return <Badge variant="destructive">Closed</Badge>;
    } else if (daysToDeadline < 14) {
      return <Badge variant="destructive">Closing Soon</Badge>;
    } else if (grant.createdAt && (new Date().getTime() - new Date(grant.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000)) {
      return <Badge variant="default">New</Badge>;
    } else {
      return <Badge variant="secondary">Open</Badge>;
    }
  };
  
  // Helper function to get match score badge color
  const getMatchScoreBadgeColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-500";
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-emerald-100 text-emerald-800";
    if (score >= 40) return "bg-blue-100 text-blue-800";
    if (score >= 20) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-500";
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            {getStatusBadge()}
            
            {/* AI match score badge if available */}
            {grant.matchScore !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`${getMatchScoreBadgeColor(grant.matchScore)} flex items-center`}
                    >
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      {grant.matchScore}% Match
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium mb-1">Match Factors:</p>
                      <ul className="text-xs">
                        {grant.matchReasons?.map((reason, idx) => (
                          <li key={idx} className="flex items-start mb-1">
                            <ZapIcon className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {grant.createdAt && (
            <span className="text-sm text-muted-foreground">
              Posted {formatDistanceToNow(new Date(grant.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{grant.title}</h3>
        
        {/* Display highlights if available */}
        {grant.highlights && grant.highlights.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{grant.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {grant.highlights.slice(0, 3).map((highlight, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`
                          ${highlight.relevance === 'high' ? 'bg-primary/10 text-primary border-primary/40' :
                            highlight.relevance === 'medium' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'}
                        `}
                      >
                        <LightbulbIcon className="h-3 w-3 mr-1" />
                        {highlight.word}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">{highlight.explanation}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {grant.highlights.length > 3 && (
                <Badge variant="outline" className="bg-gray-50">
                  +{grant.highlights.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{grant.description}</p>
        )}
        
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mr-3">
            {grant.organization.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-medium">{grant.organization}</p>
            {grant.country && (
              <p className="text-xs text-muted-foreground flex items-center">
                <MapPinIcon className="h-3 w-3 mr-1" />
                {grant.country}
              </p>
            )}
          </div>
        </div>
        
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="font-medium text-muted-foreground flex items-center">
              <AwardIcon className="h-4 w-4 mr-2" /> Award Amount:
            </div>
            <div className="font-semibold">
              {grant.amount ? (
                typeof grant.amount === 'string' && grant.amount.trim() !== '' 
                  ? grant.amount
                  : 'Not specified'
              ) : 'Not specified'}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <div className="font-medium text-muted-foreground flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" /> Duration:
            </div>
            <div className="font-semibold">
              {grant.duration ? (
                typeof grant.duration === 'string' && grant.duration.trim() !== '' 
                  ? grant.duration
                  : 'Not specified'
              ) : 'Not specified'}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm mb-4">
            <div className="font-medium text-muted-foreground flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" /> Deadline:
            </div>
            <div className="font-semibold text-destructive">
              {grant.deadline ? (
                (() => {
                  try {
                    // Try to parse and format the date
                    const date = new Date(grant.deadline);
                    // Check if it's a valid date
                    return !isNaN(date.getTime()) 
                      ? date.toLocaleDateString() 
                      : typeof grant.deadline === 'string' && grant.deadline.trim() !== ''
                        ? grant.deadline
                        : 'Not specified';
                  } catch (e) {
                    // If parsing fails, just show the raw value if it's not empty
                    return typeof grant.deadline === 'string' && grant.deadline.trim() !== ''
                      ? grant.deadline
                      : 'Not specified';
                  }
                })()
              ) : 'Not specified'}
            </div>
          </div>
          
          <div className="flex justify-between pt-2">
            <Button 
              variant={grant.saved && pageContext === 'saved-grants' ? "destructive" : "outline"}
              size="sm"
              onClick={handleSave}
              className={grant.saved && pageContext !== 'grant-finder' ? "text-destructive-foreground" : ""}
            >
              {/* Logic for button text:
                  1. In saved-grants page, always show "Remove"
                  2. In grant-finder page, show "Save" if not saved, "Saved" if saved
                  3. In other pages, follow the original logic */}
              {pageContext === 'saved-grants' ? (
                <>
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Remove
                </>
              ) : pageContext === 'grant-finder' ? (
                <>
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  {grant.saved ? 'Saved' : 'Save'}
                </>
              ) : (
                // Default behavior for other pages
                <>
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  {grant.saved ? 'Remove' : 'Save'}
                </>
              )}
            </Button>
            
            {grant.url && typeof grant.url === 'string' && grant.url.trim() !== '' ? (
              <Button 
                size="sm" 
                onClick={() => window.open(grant.url as string, '_blank', 'noopener,noreferrer')}
              >
                View Details
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href={`/grant-finder/${grant.id}`}>View Details</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
