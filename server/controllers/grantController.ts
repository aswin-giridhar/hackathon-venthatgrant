import { fetchGrantsFromAllSources, fetchGrantsFromSource, grantSources } from '../services/grantSources';
import { storage } from '../storage';
import { Request, Response } from 'express';
import { InsertGrant } from '@shared/schema';
import * as keywordHighlightService from '../services/keywordHighlightService';
import * as grantMatchingService from '../services/grantMatchingService';

// Last sync time tracking
let lastSyncTime: Date | null = null;
const SYNC_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Check if we need to sync grants from external sources
function needsSync(): boolean {
  if (!lastSyncTime) return true;
  
  const now = new Date();
  const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
  return timeSinceLastSync > SYNC_INTERVAL_MS;
}

// Get all grants, potentially syncing from external sources
export async function getAllGrants(req: Request, res: Response) {
  try {
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const source = req.query.source as string | undefined;
    const forceSync = req.query.forceSync === 'true';
    
    // If we need to sync or a sync is forced
    if ((needsSync() || forceSync) && (!source || source === 'all')) {
      await syncAllGrants();
    } else if (source && source !== 'all' && forceSync) {
      await syncGrantsFromSource(source);
    }
    
    // Get grants from storage, possibly filtered
    let grants = await storage.getGrants(category, status, keyword);
    
    // If a source filter is applied, filter by organization
    if (source && source !== 'all') {
      const sourceName = grantSources.find(s => 
        s.name.toLowerCase().includes(source.toLowerCase())
      )?.name || source;
      
      grants = grants.filter(grant => 
        grant.organization.toLowerCase().includes(sourceName.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      data: grants
    });
  } catch (error: any) {
    console.error('Error in getAllGrants:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to retrieve grants",
        code: "GRANTS_RETRIEVAL_ERROR"
      }
    });
  }
}

// Get a single grant by ID
export async function getGrantById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const grant = await storage.getGrantById(id);
    
    if (!grant) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Grant not found",
          code: "RESOURCE_NOT_FOUND"
        }
      });
    }
    
    res.json({
      success: true,
      data: grant
    });
  } catch (error: any) {
    console.error('Error in getGrantById:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to retrieve grant",
        code: "GRANT_RETRIEVAL_ERROR"
      }
    });
  }
}

// Create a new grant (admin only)
export async function createGrant(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Authentication required. Please log in to access this resource.",
        code: "AUTHENTICATION_REQUIRED"
      }
    });
  }
  
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: "Access denied. Admin role required.",
        code: "ACCESS_DENIED"
      }
    });
  }
  
  try {
    const data = req.body as InsertGrant;
    const grant = await storage.createGrant(data);
    res.status(201).json({
      success: true,
      data: grant
    });
  } catch (error: any) {
    console.error('Error in createGrant:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || "Failed to create grant",
        code: "GRANT_CREATION_ERROR"
      }
    });
  }
}

// Sync all grants from external sources
export async function syncAllGrants() {
  try {
    console.log('Starting sync of all grants from external sources...');
    const externalGrants = await fetchGrantsFromAllSources();
    
    console.log(`Fetched ${externalGrants.length} grants from all external sources`);
    
    // Store each grant
    let newGrantsCount = 0;
    for (const grant of externalGrants) {
      // Check if grant already exists based on title and organization
      const existingGrants = await storage.getGrants();
      const exists = existingGrants.some(g => 
        g.title === grant.title && 
        g.organization === grant.organization
      );
      
      // If it doesn't exist, create it
      if (!exists) {
        await storage.createGrant(grant);
        newGrantsCount++;
      }
    }
    
    console.log(`Added ${newGrantsCount} new grants`);
    lastSyncTime = new Date();
    return newGrantsCount;
  } catch (error) {
    console.error('Error syncing all grants:', error);
    throw error;
  }
}

// Sync grants from a specific source
export async function syncGrantsFromSource(source: string) {
  try {
    console.log(`Starting sync of grants from source: ${source}`);
    const externalGrants = await fetchGrantsFromSource(source);
    
    console.log(`Fetched ${externalGrants.length} grants from ${source}`);
    
    // Store each grant
    let newGrantsCount = 0;
    for (const grant of externalGrants) {
      // Check if grant already exists based on title and organization
      const existingGrants = await storage.getGrants();
      const exists = existingGrants.some(g => 
        g.title === grant.title && 
        g.organization === grant.organization
      );
      
      // If it doesn't exist, create it
      if (!exists) {
        await storage.createGrant(grant);
        newGrantsCount++;
      }
    }
    
    console.log(`Added ${newGrantsCount} new grants from ${source}`);
    return newGrantsCount;
  } catch (error) {
    console.error(`Error syncing grants from ${source}:`, error);
    throw error;
  }
}

// Get available grant sources
export function getGrantSources(req: Request, res: Response) {
  try {
    const sources = grantSources.map(source => source.name);
    res.json({
      success: true,
      data: sources
    });
  } catch (error: any) {
    console.error('Error in getGrantSources:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to retrieve grant sources",
        code: "GRANT_SOURCES_RETRIEVAL_ERROR"
      }
    });
  }
}

// Get grants with highlights for important keywords
export async function getGrantsWithHighlights(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED"
      }
    });
  }

  try {
    const grantId = req.query.grantId ? parseInt(req.query.grantId as string) : undefined;
    const userContext = {
      organizationType: req.user?.organization || undefined,
      projectArea: req.query.projectArea as string | undefined,
      projectKeywords: req.query.keywords ? (req.query.keywords as string).split(',') : undefined
    };

    // If a specific grant is requested
    if (grantId) {
      const grant = await storage.getGrantById(grantId);
      if (!grant) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Grant not found",
            code: "RESOURCE_NOT_FOUND"
          }
        });
      }

      // Extract keywords from the grant description using user-preferred AI model
      const highlights = await keywordHighlightService.extractKeywords(
        grant.description,
        userContext,
        req.user
      );

      res.json({
        success: true,
        data: {
          ...grant,
          highlights
        }
      });
    } else {
      // If no specific grant is requested, get all grants and highlight the first few
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined; 
      const keyword = req.query.keyword as string | undefined;
      
      let grants = await storage.getGrants(category, status, keyword);
      
      // Limit to first 5 grants for performance
      const grantsToProcess = grants.slice(0, 5);
      
      // Process grants in parallel
      const processedGrants = await Promise.all(
        grantsToProcess.map(async (grant) => {
          const highlights = await keywordHighlightService.extractKeywords(
            grant.description,
            userContext,
            req.user
          );
          
          return {
            ...grant,
            highlights
          };
        })
      );
      
      res.json({
        success: true,
        data: processedGrants
      });
    }
  } catch (error: any) {
    console.error('Error in getGrantsWithHighlights:', error);
    res.status(500).json({
      success: false, 
      error: {
        message: error.message || "Failed to highlight grant keywords",
        code: "GRANT_HIGHLIGHT_ERROR"
      }
    });
  }
}

// Get grants with AI matching based on user profile and project
export async function getMatchingGrants(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED"
      }
    });
  }

  try {
    const userId = req.user!.id;
    
    // Prepare matching criteria from request
    const criteria: grantMatchingService.MatchCriteria = {
      organizationType: req.user?.organization || undefined,
      projectDescription: req.query.projectDescription as string | undefined,
      keywords: req.query.keywords ? (req.query.keywords as string).split(',') : undefined,
      location: req.query.location as string | undefined
    };
    
    // Add funding range if provided
    if (req.query.minFunding && req.query.maxFunding) {
      criteria.fundingRange = {
        min: parseInt(req.query.minFunding as string) || 0,
        max: parseInt(req.query.maxFunding as string) || 1000000
      };
    }
    
    // Get limit parameter with default
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    
    // Find matching grants
    const matchingGrants = await grantMatchingService.findMatchingGrants(
      userId,
      criteria,
      limit
    );
    
    res.json({
      success: true,
      data: matchingGrants
    });
  } catch (error: any) {
    console.error('Error in getMatchingGrants:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to find matching grants",
        code: "GRANT_MATCHING_ERROR"
      }
    });
  }
}

// Get a single grant with highlights and match score
export async function getEnhancedGrantById(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Authentication required",
        code: "AUTHENTICATION_REQUIRED"
      }
    });
  }

  try {
    const grantId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Get the grant
    const grant = await storage.getGrantById(grantId);
    if (!grant) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Grant not found",
          code: "RESOURCE_NOT_FOUND"
        }
      });
    }
    
    // Process grant with keyword highlights and matching score in parallel
    const [highlights, matchResults] = await Promise.all([
      keywordHighlightService.extractKeywords(
        grant.description, 
        {
          organizationType: req.user?.organization || undefined
        }, 
        req.user
      ),
      grantMatchingService.findMatchingGrants(
        userId, 
        {}, 
        1, 
        req.user
      )
    ]);
    
    // Find the match score for this specific grant
    const matchResult = matchResults.find(m => m.grantId === grantId);
    
    res.json({
      success: true,
      data: {
        ...grant,
        highlights,
        matchScore: matchResult?.score || 0,
        matchReasons: matchResult?.matchReasons || [],
        keyFactors: matchResult?.keyFactors || []
      }
    });
  } catch (error: any) {
    console.error('Error in getEnhancedGrantById:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || "Failed to retrieve enhanced grant",
        code: "ENHANCED_GRANT_RETRIEVAL_ERROR"
      }
    });
  }
}