import { Grant, User } from "@shared/schema";
import { storage } from "../storage";
import { getAiProvider } from "./aiService";

export interface MatchCriteria {
  organizationType?: string;
  projectDescription?: string;
  fundingRange?: {
    min: number;
    max: number;
  };
  keywords?: string[];
  location?: string;
  timeline?: string;
}

export interface MatchResult {
  grantId: number;
  score: number;
  matchReasons: string[];
  keyFactors: {
    factor: string;
    weight: number;
    score: number;
  }[];
}

interface UserProfile {
  organizationType: string;
  fieldOfWork: string;
  interests: string[];
  location?: string;
  previousGrants?: {
    title: string;
    fundingAmount: string;
    outcome: string;
  }[];
}

/**
 * Generates a default user profile based on user data
 * @param user User from the database
 * @returns A basic user profile for matching
 */
export function generateUserProfile(user: User): UserProfile {
  return {
    organizationType: user.organization || 'Unknown',
    fieldOfWork: 'General',
    interests: ['Research', 'Development', 'Innovation'],
    location: 'United Kingdom',
    previousGrants: []
  };
}

/**
 * Extracts and generates project details from proposal data
 * @param proposalDescription Description of a user's proposal
 * @returns Structured project details for matching
 */
export async function generateProjectDetails(proposalDescription: string, user?: User) {
  try {
    // Get the appropriate AI provider based on user preference
    const aiProvider = getAiProvider(user);
    
    // Extract keywords using the provider to help us understand the project
    try {
      const prompt = `
        Extract project details from the proposal description:
        
        ${proposalDescription || "A general research project in the UK."}
        
        Format your response as a JSON object with these fields:
        - title: A concise title for the project
        - keywords: An array of 5-10 relevant keywords 
        - estimatedBudget: An estimated budget range (numeric value in GBP)
        - timeline: A brief description of the project timeline
        - domain: The primary domain/field of the project
      `;
      
      const keywords = await aiProvider.extractKeywords(prompt);
      
      // Build a project details object from the keywords
      const projectDetails: any = {
        title: "Untitled Project",
        keywords: [],
        estimatedBudget: 0,
        timeline: "unknown",
        domain: "general"
      };
      
      // Extract information from the keywords
      for (const { keyword, explanation } of keywords) {
        // Check if this keyword is likely a project title
        if (keyword.length > 10 && explanation.toLowerCase().includes('title')) {
          projectDetails.title = keyword;
        }
        
        // Add to keywords list if it looks like a keyword
        if (keyword.length < 20 && !explanation.toLowerCase().includes('title')) {
          projectDetails.keywords.push(keyword);
        }
        
        // Extract budget information
        if (explanation.toLowerCase().includes('budget') || 
            explanation.toLowerCase().includes('funding') ||
            explanation.toLowerCase().includes('cost')) {
          const budgetMatch = keyword.match(/\d[\d,]*(\.\d+)?/);
          if (budgetMatch) {
            projectDetails.estimatedBudget = parseInt(budgetMatch[0].replace(/,/g, ''));
          }
        }
        
        // Extract timeline information
        if (explanation.toLowerCase().includes('timeline') || 
            explanation.toLowerCase().includes('duration') ||
            explanation.toLowerCase().includes('period')) {
          projectDetails.timeline = keyword;
        }
        
        // Extract domain information
        if (explanation.toLowerCase().includes('domain') || 
            explanation.toLowerCase().includes('field') ||
            explanation.toLowerCase().includes('area')) {
          projectDetails.domain = keyword;
        }
      }
      
      // Ensure we have at least some keywords
      if (projectDetails.keywords.length === 0) {
        projectDetails.keywords = ["research", "development"];
      }
      
      return projectDetails;
    } catch (error) {
      console.error("Error extracting project details with AI provider:", error);
      return {
        title: "Untitled Project",
        keywords: ["general"],
        budget: 0,
        timeline: "unknown",
        domain: "general research"
      };
    }
  } catch (error) {
    console.error("Error generating project details:", error);
    return {
      title: "Untitled Project",
      keywords: ["general"],
      budget: 0,
      timeline: "unknown",
      domain: "general"
    };
  }
}

/**
 * Performs real-time matching of grants for a user based on their profile and criteria
 * @param userId User ID to match grants for
 * @param criteria Optional matching criteria to refine results
 * @param limit Maximum number of matches to return
 * @returns Array of matched grants with scores and explanations
 */
export async function findMatchingGrants(
  userId: number,
  criteria?: MatchCriteria,
  limit: number = 5,
  userObj?: User
): Promise<MatchResult[]> {
  try {
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Get all available grants
    const allGrants = await storage.getGrants();
    if (!allGrants.length) return [];
    
    // Generate user profile for matching
    const userProfile = generateUserProfile(user);
    
    // Generate project details from criteria if available
    const projectDetails = criteria?.projectDescription 
      ? await generateProjectDetails(criteria.projectDescription, userObj || user)
      : {
          title: "Untitled Project",
          keywords: criteria?.keywords || ["research", "development"],
          budget: criteria?.fundingRange?.max || 100000,
          timeline: criteria?.timeline || "1 year",
          domain: "general research"
        };
    
    // Filter grants based on basic criteria first (if specified)
    let filteredGrants = allGrants;
    
    if (criteria?.fundingRange) {
      const minFunding = criteria.fundingRange.min;
      const maxFunding = criteria.fundingRange.max;
      
      filteredGrants = filteredGrants.filter(grant => {
        // Extract numeric amount from funding string
        const fundingStr = grant.amount || "0";
        const numericAmount = parseInt(fundingStr.replace(/[^0-9]/g, "")) || 0;
        
        return numericAmount >= minFunding && numericAmount <= maxFunding;
      });
    }
    
    // Get the AI provider based on user preference
    const aiProvider = getAiProvider(userObj || user);
    
    // For each grant, calculate a match score using the preferred AI provider
    const matchPromises = filteredGrants.slice(0, Math.min(20, filteredGrants.length)).map(async grant => {
      try {
        // Create a prompt to evaluate the grant match
        const prompt = `
          Evaluate how well this grant fits the user's profile and project.
          
          Grant Information:
          ${JSON.stringify({
            id: grant.id,
            title: grant.title,
            description: grant.description,
            amount: grant.amount,
            category: grant.category,
            organization: grant.organization,
            deadline: grant.deadline
          })}
          
          User Profile:
          ${JSON.stringify(userProfile)}
          
          Project Details:
          ${JSON.stringify(projectDetails)}
          
          Additional Criteria:
          ${JSON.stringify(criteria || {})}
          
          Analyze both and provide:
          1. A match score from 0-100
          2. 2-3 specific reasons why this grant matches (or doesn't match) the user
          3. Key matching factors with weights and individual scores
          
          Format your response as a JSON object with these properties:
          {
            "score": number, 
            "matchReasons": string[],
            "keyFactors": [
              { "factor": string, "weight": number, "score": number }
            ]
          }
        `;
        
        // Extract keywords, but parse the results as a JSON response for grant matching
        const keywords = await aiProvider.extractKeywords(prompt);
        
        // Convert the keywords output to a grant match result
        let score = 50; // Default score
        const matchReasons: string[] = [];
        const keyFactors: {factor: string, weight: number, score: number}[] = [];
        
        for (const { keyword, explanation } of keywords) {
          // Look for score information
          if (keyword.toLowerCase().includes('score') || explanation.toLowerCase().includes('score')) {
            const scoreMatch = explanation.match(/\b(\d{1,3})\b/);
            if (scoreMatch && !isNaN(parseInt(scoreMatch[1]))) {
              score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
            }
          }
          
          // Look for matching reasons
          if (explanation.toLowerCase().includes('reason') || 
              explanation.toLowerCase().includes('match') ||
              explanation.toLowerCase().includes('fit')) {
            matchReasons.push(keyword);
          }
          
          // Look for key factors
          if (explanation.toLowerCase().includes('factor') || 
              explanation.toLowerCase().includes('weight') ||
              explanation.toLowerCase().includes('aspect')) {
            const weightMatch = explanation.match(/weight\D*(\d+)/i);
            const scoreMatch = explanation.match(/score\D*(\d+)/i);
            
            keyFactors.push({
              factor: keyword,
              weight: weightMatch ? parseInt(weightMatch[1]) : 1,
              score: scoreMatch ? parseInt(scoreMatch[1]) : score
            });
          }
        }
        
        // Make sure we have at least some match reasons
        if (matchReasons.length === 0) {
          // Use the first few keywords as match reasons
          keywords.slice(0, Math.min(3, keywords.length)).forEach(k => {
            matchReasons.push(k.keyword);
          });
        }
        
        // Make sure we have at least some key factors
        if (keyFactors.length === 0) {
          keyFactors.push({
            factor: "Overall Relevance",
            weight: 1,
            score: score
          });
          
          // Add some basic factors based on the grant
          if (grant.category) {
            keyFactors.push({
              factor: `Category: ${grant.category}`,
              weight: 0.8,
              score: score
            });
          }
          
          if (grant.amount) {
            keyFactors.push({
              factor: `Funding Amount: ${grant.amount}`,
              weight: 0.7,
              score: score
            });
          }
        }
        
        return {
          grantId: grant.id,
          score,
          matchReasons: matchReasons.slice(0, 3), // Limit to 3 reasons
          keyFactors: keyFactors.slice(0, 5)      // Limit to 5 factors
        };
      } catch (error) {
        console.error(`Error matching grant ${grant.id}:`, error);
        return {
          grantId: grant.id,
          score: 0,
          matchReasons: ["Error during matching"],
          keyFactors: []
        };
      }
    });
    
    // Wait for all match calculations to complete
    const matchResults = await Promise.all(matchPromises);
    
    // Sort by match score (highest first) and limit results
    return matchResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error("Error finding matching grants:", error);
    return [];
  }
}

/**
 * Returns grants with real-time match scores for the user
 * @param userId User ID to match grants for
 * @param filters Optional filters to apply to grants before matching
 * @returns Grants with match scores and explanations
 */
export async function getGrantsWithMatchScores(
  userId: number,
  filters?: {
    category?: string;
    status?: string;
    keyword?: string;
  },
  userObj?: User
): Promise<(Grant & { matchScore: number, matchReasons: string[] })[]> {
  try {
    // Get filtered grants based on user's filters
    const grants = await storage.getGrants(
      filters?.category,
      filters?.status,
      filters?.keyword
    );
    
    if (!grants.length) return [];
    
    // Get user data
    const user = await storage.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Generate user profile
    const userProfile = generateUserProfile(user);
    
    // Get the AI provider based on user preference
    const aiProvider = getAiProvider(userObj || user);
    
    // Calculate match scores for each grant using the preferred AI provider
    const matchedGrants = await Promise.all(
      grants.map(async grant => {
        try {
          // Create a prompt for simplified grant matching
          const prompt = `
            Calculate how well this grant matches this user profile.
            Provide a match score from 0-100 and list 2-3 reasons for your assessment.
            
            Grant: ${JSON.stringify({
              title: grant.title,
              description: grant.description.substring(0, 300), // Truncate for efficiency
              amount: grant.amount,
              category: grant.category,
              organization: grant.organization
            })}
            
            User: ${JSON.stringify(userProfile)}
          `;
          
          // Get keywords that represent the matching factors
          const keywords = await aiProvider.extractKeywords(prompt);
          
          // Process the results to find score and reasons
          let matchScore = 50; // Default score
          const matchReasons: string[] = [];
          
          for (const { keyword, explanation } of keywords) {
            // Look for score information
            if (keyword.toLowerCase().includes('score') || explanation.toLowerCase().includes('score')) {
              const scoreMatch = explanation.match(/\b(\d{1,3})\b/);
              if (scoreMatch && !isNaN(parseInt(scoreMatch[1]))) {
                matchScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
              }
            }
            
            // Look for reasons
            if (explanation.toLowerCase().includes('reason') || 
                explanation.toLowerCase().includes('match') ||
                explanation.toLowerCase().includes('factor')) {
              matchReasons.push(keyword);
            }
          }
          
          // If we didn't extract any reasons, use the first few keywords
          if (matchReasons.length === 0) {
            keywords.slice(0, Math.min(3, keywords.length)).forEach(k => {
              matchReasons.push(k.keyword);
            });
          }
          
          return {
            ...grant,
            matchScore,
            matchReasons: matchReasons.slice(0, 3) // Limit to 3 reasons
          };
        } catch (error) {
          console.error(`Error matching grant ${grant.id}:`, error);
          return {
            ...grant,
            matchScore: 0,
            matchReasons: ["Error calculating match"]
          };
        }
      })
    );
    
    // Sort by match score (highest first)
    return matchedGrants.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error("Error getting grants with match scores:", error);
    return [];
  }
}