import { Grant, User } from "@shared/schema";
import { getAiProvider } from "./aiService";

// Type definitions for the keyword highlighting functionality
export interface KeywordHighlight {
  word: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'funding' | 'eligibility' | 'deadline' | 'requirements' | 'outcome';
  explanation: string;
}

export interface HighlightedGrant extends Grant {
  highlights: KeywordHighlight[];
}

/**
 * Extracts and highlights important keywords from a grant description
 * 
 * @param grantDescription The text of the grant to analyze
 * @param userContext Additional user context like org type, project area to improve relevance
 * @returns An array of highlighted keywords with relevance scores and explanations
 */
export async function extractKeywords(
  grantDescription: string,
  userContext?: {
    organizationType?: string;
    projectArea?: string;
    projectKeywords?: string[];
  },
  user?: User
): Promise<KeywordHighlight[]> {
  try {
    // Get the appropriate AI provider based on user preference
    const aiProvider = getAiProvider(user);
    
    try {
      // Extract keywords using the provider
      const extractedKeywords = await aiProvider.extractKeywords(grantDescription);
      
      // Convert the extracted keywords to our KeywordHighlight format
      const highlights: KeywordHighlight[] = extractedKeywords.map(item => {
        // Determine category based on keyword and explanation
        const category = determineCategory(item.keyword, item.explanation);
        
        // Determine relevance based on explanation
        const relevance = determineRelevance(item.explanation);
        
        return {
          word: item.keyword,
          relevance,
          category,
          explanation: item.explanation
        };
      });
      
      return highlights;
    } catch (error) {
      console.error("Error using AI provider for keyword extraction:", error);
      return [];
    }
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}

// Helper function to determine the category of a keyword
function determineCategory(
  keyword: string, 
  explanation: string
): 'funding' | 'eligibility' | 'deadline' | 'requirements' | 'outcome' {
  const lowerKeyword = keyword.toLowerCase();
  const lowerExplanation = explanation.toLowerCase();
  
  if (
    lowerKeyword.includes('fund') || 
    lowerKeyword.includes('budget') || 
    lowerKeyword.includes('grant') || 
    lowerKeyword.includes('amount') || 
    lowerExplanation.includes('funding') || 
    lowerExplanation.includes('financial')
  ) {
    return 'funding';
  }
  
  if (
    lowerKeyword.includes('deadline') || 
    lowerKeyword.includes('due date') || 
    lowerKeyword.includes('submission') || 
    lowerExplanation.includes('deadline') || 
    lowerExplanation.includes('time frame')
  ) {
    return 'deadline';
  }
  
  if (
    lowerKeyword.includes('eligible') || 
    lowerKeyword.includes('qualification') || 
    lowerExplanation.includes('eligible') || 
    lowerExplanation.includes('qualify')
  ) {
    return 'eligibility';
  }
  
  if (
    lowerKeyword.includes('impact') || 
    lowerKeyword.includes('result') || 
    lowerKeyword.includes('outcome') || 
    lowerExplanation.includes('result') || 
    lowerExplanation.includes('outcome')
  ) {
    return 'outcome';
  }
  
  // Default to requirements
  return 'requirements';
}

// Helper function to determine the relevance of a keyword
function determineRelevance(explanation: string): 'high' | 'medium' | 'low' {
  const lowerExplanation = explanation.toLowerCase();
  
  if (
    lowerExplanation.includes('critical') || 
    lowerExplanation.includes('essential') || 
    lowerExplanation.includes('key requirement') || 
    lowerExplanation.includes('mandatory') || 
    lowerExplanation.includes('primary')
  ) {
    return 'high';
  }
  
  if (
    lowerExplanation.includes('helpful') || 
    lowerExplanation.includes('beneficial') || 
    lowerExplanation.includes('advantage') || 
    lowerExplanation.includes('recommended')
  ) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Calculates the relevance score of a grant based on user profile and project
 * 
 * @param grant The grant to evaluate
 * @param userProfile User profile data with org type, interests, etc.
 * @param projectDetails Details about the user's project
 * @returns A score from 0-100 indicating how well the grant matches the user
 */
export async function calculateGrantRelevance(
  grant: Grant,
  userProfile: {
    organizationType: string;
    fieldOfWork: string;
    previousGrants?: string[];
  },
  projectDetails: {
    title: string;
    description: string;
    keywords: string[];
    budget?: number;
    timeline?: string;
  },
  user?: User
): Promise<number> {
  try {
    // Get the appropriate AI provider based on user preference
    const aiProvider = getAiProvider(user);
    
    // Create a simple description for the AI provider
    const grantText = `Grant Title: ${grant.title}
Organization: ${grant.organization}
Description: ${grant.description}
Amount: ${grant.amount || 'Not specified'}
Category: ${grant.category || 'Not specified'}
Deadline: ${grant.deadline || 'Not specified'}`;

    // Create a simple context about the user and project
    const contextText = `Organization Type: ${userProfile.organizationType}
Field of Work: ${userProfile.fieldOfWork}
Project Title: ${projectDetails.title}
Project Description: ${projectDetails.description}
Project Keywords: ${projectDetails.keywords.join(', ')}
Budget: ${projectDetails.budget || 'Not specified'}
Timeline: ${projectDetails.timeline || 'Not specified'}`;

    try {
      // Use our keyword extraction since we don't have a specialized
      // scoring function in our AI providers
      const keywords = await aiProvider.extractKeywords(`${grantText}\n\n${contextText}`);
      
      // Calculate a score based on the keywords
      let score = 50; // Start with a neutral score
      
      // Analyze the keywords and explanations to determine relevance
      for (const { keyword, explanation } of keywords) {
        // Check keyword matches
        const keywordLower = keyword.toLowerCase();
        
        // Check for positive signals
        if (explanation.toLowerCase().includes('perfect match') || 
            explanation.toLowerCase().includes('excellent fit') ||
            explanation.toLowerCase().includes('highly relevant')) {
          score += 10;
        } else if (explanation.toLowerCase().includes('good match') ||
                  explanation.toLowerCase().includes('relevant')) {
          score += 5;
        }
        
        // Check for negative signals
        if (explanation.toLowerCase().includes('not relevant') ||
            explanation.toLowerCase().includes('poor match') ||
            explanation.toLowerCase().includes('mismatch')) {
          score -= 10;
        }
        
        // Check keywords against project details
        const projectKeywordsMatch = projectDetails.keywords.some(k => 
          keywordLower.includes(k.toLowerCase()) || k.toLowerCase().includes(keywordLower)
        );
        
        if (projectKeywordsMatch) {
          score += 5;
        }
        
        // Field alignment
        if (keywordLower.includes(userProfile.fieldOfWork.toLowerCase()) ||
            userProfile.fieldOfWork.toLowerCase().includes(keywordLower)) {
          score += 5;
        }
      }
      
      // Ensure score is within range
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error("Error using AI provider for relevance calculation:", error);
      return 50; // Default score
    }
  } catch (error) {
    console.error("Error calculating grant relevance:", error);
    return 0;
  }
}

/**
 * Performs batch processing of grants to highlight keywords and calculate relevance
 * 
 * @param grants Array of grants to process
 * @param userProfile User profile data
 * @param projectDetails Project details
 * @param user The user making the request (for model preference)
 * @returns Array of grants with highlights and relevance scores
 */
export async function processGrantsBatch(
  grants: Grant[], 
  userProfile: any, 
  projectDetails: any,
  user?: User
): Promise<(HighlightedGrant & { relevanceScore: number })[]> {
  const results = await Promise.all(
    grants.map(async (grant) => {
      // Process in parallel for better performance
      const [highlights, relevanceScore] = await Promise.all([
        extractKeywords(grant.description, {
          organizationType: userProfile.organizationType,
          projectArea: userProfile.fieldOfWork,
          projectKeywords: projectDetails.keywords
        }, user),
        calculateGrantRelevance(grant, userProfile, projectDetails, user)
      ]);
      
      return {
        ...grant,
        highlights,
        relevanceScore
      };
    })
  );
  
  // Sort by relevance score (most relevant first)
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}