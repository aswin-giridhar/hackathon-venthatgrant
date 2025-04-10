import { 
  users, grants, proposals, reports, activities, grantSearchCache, savedGrants, critiqueHistory,
  type InsertUser, type User, 
  type InsertGrant, type Grant, 
  type InsertProposal, type Proposal, 
  type InsertReport, type Report, 
  type InsertActivity, type Activity,
  type GrantSearchCache, type InsertGrantSearchCache,
  type SavedGrant, type InsertSavedGrant,
  type CritiqueHistory, type InsertCritiqueHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import pg from 'pg';
import connectPg from "connect-pg-simple";

// Create PostgreSQL pool for session store
const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create memory store as a fallback
const MemoryStore = createMemoryStore(session);

// Initialize PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  updateStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  
  // Grants
  getGrants(category?: string, status?: string, keyword?: string): Promise<Grant[]>;
  getGrantById(id: number): Promise<Grant | undefined>;
  createGrant(grant: InsertGrant): Promise<Grant>;
  
  // Saved Grants
  saveGrant(userId: number, grantId: number, grantData?: any): Promise<SavedGrant>;
  unsaveGrant(userId: number, grantId: number): Promise<void>;
  getUserSavedGrants(userId: number): Promise<Grant[]>;
  isGrantSaved(userId: number, grantId: number): Promise<boolean>;
  
  // Proposals
  getUserProposals(userId: number): Promise<Proposal[]>;
  getProposalById(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<Proposal>): Promise<Proposal>;
  updateProposalFeedback(id: number, feedback: string): Promise<Proposal>;
  deleteProposal(id: number, userId: number): Promise<void>;
  
  // Reports
  getUserReports(userId: number): Promise<Report[]>;
  getReportById(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<Report>): Promise<Report>;
  deleteReport(id: number): Promise<void>;
  
  // Activities
  getUserActivities(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Grant Search Cache
  getGrantSearchCache(searchTerm: string): Promise<GrantSearchCache | undefined>;
  saveGrantSearchCache(searchTerm: string, results: any[]): Promise<GrantSearchCache>;
  updateGrantSearchCache(id: number, results: any[]): Promise<GrantSearchCache>;
  
  // Critique History
  createCritiqueHistory(critique: InsertCritiqueHistory): Promise<CritiqueHistory>;
  getUserCritiqueHistory(userId: number): Promise<CritiqueHistory[]>;
  getCritiqueHistoryById(id: number): Promise<CritiqueHistory | undefined>;
  deleteCritiqueHistory(id: number): Promise<void>;
  
  // Session store
  sessionStore: any; // Using 'any' for the session store to avoid type issues
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using 'any' for the session store to avoid type issues

  constructor() {
    try {
      // Try to use PostgreSQL session store
      this.sessionStore = new PostgresSessionStore({
        pool: sessionPool,
        createTableIfMissing: true,
      });
      console.log('Using PostgreSQL session store');
    } catch (error) {
      // Fallback to memory store if PostgreSQL session store fails
      console.warn('Failed to create PostgreSQL session store, falling back to memory store:', error);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24h
      });
    }

    // Seed database with initial grants if needed
    this.seedGrantsIfNeeded();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return updatedUser;
  }

  async updateStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        stripeCustomerId, 
        stripeSubscriptionId,
        plan: "premium" 
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    return updatedUser;
  }

  // Grant methods
  async getGrants(category?: string, status?: string, keyword?: string): Promise<Grant[]> {
    let queryBuilder = db.select().from(grants);
    
    const conditions = [];
    
    if (category) {
      conditions.push(eq(grants.category, category));
    }
    
    if (status) {
      conditions.push(eq(grants.status, status));
    }
    
    if (keyword) {
      conditions.push(
        or(
          like(grants.title, `%${keyword}%`),
          like(grants.description, `%${keyword}%`),
          like(grants.organization, `%${keyword}%`)
        )
      );
    }
    
    // Apply all conditions if any exist
    if (conditions.length > 0) {
      // If we have multiple conditions, combine them with AND
      if (conditions.length > 1) {
        return await db.select().from(grants).where(and(...conditions)) as Grant[];
      } else {
        return await db.select().from(grants).where(conditions[0]) as Grant[];
      }
    }
    
    return await db.select().from(grants) as Grant[];
  }

  async getGrantById(id: number): Promise<Grant | undefined> {
    try {
      // Check if id is a valid number
      if (isNaN(id) || !isFinite(id)) {
        console.warn(`Invalid grant ID (NaN or non-finite) provided: ${id}`);
        return undefined;
      }
      
      const [grant] = await db.select().from(grants).where(eq(grants.id, id));
      return grant;
    } catch (error) {
      console.error(`Error in getGrantById(${id}):`, error);
      return undefined;
    }
  }

  async createGrant(insertGrant: InsertGrant): Promise<Grant> {
    const [grant] = await db.insert(grants).values(insertGrant).returning();
    return grant;
  }
  
  // Saved grants methods
  async saveGrant(userId: number, grantId: number, grantData?: any): Promise<SavedGrant> {
    // Check if already saved
    const existing = await db
      .select()
      .from(savedGrants)
      .where(and(
        eq(savedGrants.userId, userId),
        eq(savedGrants.grantId, grantId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    // Determine if this is a web search grant (ID >= 10000) or a database grant
    const isWebSearchGrant = grantId >= 10000;
    const sourceType = isWebSearchGrant ? "web" : "database";
    
    // Create new saved grant entry
    const [savedGrant] = await db
      .insert(savedGrants)
      .values({
        userId,
        grantId,
        sourceType,
        // For web search grants, store the full grant data
        webSearchData: isWebSearchGrant && grantData ? grantData : undefined
      })
      .returning();
    
    // Create activity for saving a grant
    await this.createActivity({
      userId,
      type: 'grant_saved',
      description: `Saved a grant to favorites`,
      entityId: grantId,
      entityType: 'grant'
    });
    
    return savedGrant;
  }
  
  async unsaveGrant(userId: number, grantId: number): Promise<void> {
    console.log(`Unsaving grant ${grantId} for user ${userId}`);
    
    // Check if the grant exists in saved grants before attempting to delete
    const existingSavedGrant = await db
      .select()
      .from(savedGrants)
      .where(and(
        eq(savedGrants.userId, userId),
        eq(savedGrants.grantId, grantId)
      ));
    
    if (existingSavedGrant.length === 0) {
      console.log(`No saved grant found for user ${userId} and grant ${grantId}`);
      return;
    }
    
    console.log(`Found saved grant entry: ${JSON.stringify(existingSavedGrant[0])}`);
    
    // Execute the delete operation
    const result = await db
      .delete(savedGrants)
      .where(and(
        eq(savedGrants.userId, userId),
        eq(savedGrants.grantId, grantId)
      ));
    
    console.log(`Delete operation completed. Grant ${grantId} has been removed from saved grants for user ${userId}`);
    
    // Create activity for removing a grant from saved
    await this.createActivity({
      userId,
      type: 'grant_unsaved',
      description: `Removed grant from saved list`,
      entityId: grantId,
      entityType: 'grant'
    });
  }
  
  async getUserSavedGrants(userId: number): Promise<Grant[]> {
    console.log(`Fetching saved grants for user ${userId}`);
    
    // First, get all saved grants entries for this user
    const allSavedGrantEntries = await db
      .select()
      .from(savedGrants)
      .where(eq(savedGrants.userId, userId))
      .orderBy(desc(savedGrants.createdAt)); // Show newest saved grants first
    
    console.log(`Found ${allSavedGrantEntries.length} total saved grant entries for user ${userId}`);
    
    // Split by source type
    const regularSavedGrantIds = allSavedGrantEntries
      .filter(entry => entry.sourceType === "database")
      .map(entry => entry.grantId);
    
    const webSavedGrants = allSavedGrantEntries
      .filter(entry => entry.sourceType === "web");
    
    console.log(`Found ${regularSavedGrantIds.length} regular database grants and ${webSavedGrants.length} web search grants`);
    
    // Get all regular grants from the grants table
    const regularGrants: Grant[] = [];
    if (regularSavedGrantIds.length > 0) {
      try {
        // Use individual conditions for each ID
        const conditions = regularSavedGrantIds.map(id => eq(grants.id, id));
        const regularGrantsData = await db
          .select()
          .from(grants)
          .where(or(...conditions));
        
        console.log(`Retrieved ${regularGrantsData.length} grants from database`);
        
        // Add saved property
        regularGrants.push(...regularGrantsData.map(grant => ({
          ...grant,
          saved: true
        })));
      } catch (error) {
        console.error("Error fetching regular grants:", error);
      }
    }
    
    // Process web search grants
    const webGrants: Grant[] = [];
    for (const savedGrant of webSavedGrants) {
      try {
        // Get the web search grant data from the saved entry
        const grantData = savedGrant.webSearchData as Record<string, any>;
        
        if (!grantData) {
          console.log(`Web search grant ${savedGrant.grantId} has no webSearchData, skipping`);
          continue;
        }
        
        console.log(`Processing web search grant ${savedGrant.grantId} with title: ${grantData?.title || 'unknown'}`);
        
        // Convert to a Grant object
        webGrants.push({
          id: savedGrant.grantId, // Use the saved ID for consistency
          title: grantData?.title || 'Untitled Grant',
          description: grantData?.description || 'No description available',
          organization: grantData?.organization || 'Unknown Source',
          amount: grantData?.amount || 'Not specified',
          deadline: grantData?.deadline || null,
          country: grantData?.country || null,
          duration: grantData?.duration || null,
          url: grantData?.url || null,
          category: grantData?.category || 'General',
          status: grantData?.status || 'open',
          createdAt: savedGrant.createdAt || new Date(),
          saved: true,
          // Preserve match score and other web search specific data
          matchScore: grantData?.matchScore,
          matchReasons: grantData?.matchReasons,
          fundingType: grantData?.fundingType,
          highlights: grantData?.highlights,
          keyFactors: grantData?.keyFactors,
          // Add flag to identify web search grants
          isWebGrant: true
        } as Grant);
      } catch (error) {
        console.error(`Error processing web search grant ${savedGrant.grantId}:`, error);
        // Return a minimal grant object to avoid breaking the application
        webGrants.push({
          id: savedGrant.grantId,
          title: `Web Search Grant ${savedGrant.grantId}`,
          description: 'Error processing grant data',
          organization: 'Unknown',
          amount: 'Not specified',
          status: 'open',
          createdAt: savedGrant.createdAt || new Date(),
          saved: true,
          isWebGrant: true,
          // Add missing required fields
          country: null,
          deadline: null,
          duration: null,
          url: null,
          category: 'General'
        } as Grant);
      }
    }
    
    console.log(`Processed ${webGrants.length} web search grants successfully`);
    
    // Combine both types of saved grants
    const allSavedGrants = [...regularGrants, ...webGrants];
    console.log(`Returning total of ${allSavedGrants.length} saved grants`);
    
    return allSavedGrants;
  }
  
  async isGrantSaved(userId: number, grantId: number): Promise<boolean> {
    const saved = await db
      .select()
      .from(savedGrants)
      .where(and(
        eq(savedGrants.userId, userId),
        eq(savedGrants.grantId, grantId)
      ));
    
    return saved.length > 0;
  }

  // Proposal methods
  async getUserProposals(userId: number): Promise<Proposal[]> {
    return await db
      .select()
      .from(proposals)
      .where(eq(proposals.userId, userId));
  }

  async getProposalById(id: number): Promise<Proposal | undefined> {
    try {
      // Check if id is a valid number
      if (isNaN(id) || !isFinite(id)) {
        console.warn(`Invalid proposal ID (NaN or non-finite) provided: ${id}`);
        return undefined;
      }
      
      const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
      return proposal;
    } catch (error) {
      console.error(`Error in getProposalById(${id}):`, error);
      return undefined;
    }
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values({
      ...insertProposal,
      feedback: "",
    }).returning();
    
    return proposal;
  }

  async updateProposal(id: number, proposalData: Partial<Proposal>): Promise<Proposal> {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ 
        ...proposalData,
        updatedAt: new Date() 
      })
      .where(eq(proposals.id, id))
      .returning();
    
    if (!updatedProposal) {
      throw new Error(`Proposal with id ${id} not found`);
    }
    
    return updatedProposal;
  }

  async updateProposalFeedback(id: number, feedback: string): Promise<Proposal> {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ 
        feedback,
        updatedAt: new Date() 
      })
      .where(eq(proposals.id, id))
      .returning();
    
    if (!updatedProposal) {
      throw new Error(`Proposal with id ${id} not found`);
    }
    
    return updatedProposal;
  }
  
  async deleteProposal(id: number, userId: number): Promise<void> {
    console.log(`DELETE PROPOSAL DB: Starting deletion of proposal ${id} for user ${userId}`);
    
    try {
      // First, check if the proposal exists and belongs to the user
      const [proposal] = await db.select()
        .from(proposals)
        .where(and(
          eq(proposals.id, id),
          eq(proposals.userId, userId)
        ));
      
      // We need to check if proposal exists
      if (!proposal) {
        console.log(`DELETE PROPOSAL DB: Proposal with id ${id} not found for user ${userId}`);
        // Don't throw - just return, treating this as a successful operation
        return;
      }
      
      console.log(`DELETE PROPOSAL DB: Found proposal "${proposal.title}" (id: ${id}), proceeding with deletion`);
      
      // If found, delete it - make sure to use "and" condition for both id and userId
      const deleteResult = await db.delete(proposals)
        .where(and(
          eq(proposals.id, id),
          eq(proposals.userId, userId)
        ));
      
      console.log(`DELETE PROPOSAL DB: Delete operation completed for proposal ${id}, creating activity log`);
      
      // Create activity for deletion
      await this.createActivity({
        userId,
        type: 'proposal_deleted',
        description: `Deleted proposal: ${proposal.title}`,
        entityId: proposal.id,
        entityType: 'proposal'
      });
      
      console.log(`DELETE PROPOSAL DB: Successfully deleted proposal ${id} for user ${userId}`);
    } catch (error) {
      console.error(`DELETE PROPOSAL DB: Error deleting proposal with id ${id} for user ${userId}:`, error);
      throw error;
    }
  }

  // Report methods
  async getUserReports(userId: number): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId));
  }

  async getReportById(id: number): Promise<Report | undefined> {
    try {
      // Check if id is a valid number
      if (isNaN(id) || !isFinite(id)) {
        console.warn(`Invalid report ID (NaN or non-finite) provided: ${id}`);
        return undefined;
      }
      
      const [report] = await db.select().from(reports).where(eq(reports.id, id));
      return report;
    } catch (error) {
      console.error(`Error in getReportById(${id}):`, error);
      return undefined;
    }
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async updateReport(id: number, reportData: Partial<Report>): Promise<Report> {
    const [updatedReport] = await db
      .update(reports)
      .set({ 
        ...reportData,
        updatedAt: new Date() 
      })
      .where(eq(reports.id, id))
      .returning();
    
    if (!updatedReport) {
      throw new Error(`Report with id ${id} not found`);
    }
    
    return updatedReport;
  }
  
  async deleteReport(id: number): Promise<void> {
    try {
      console.log(`Deleting report with ID: ${id}`);
      
      // Check if the report exists first
      const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.id, id));
      
      if (!report) {
        console.log(`Report with ID ${id} not found`);
        throw new Error(`Report with ID ${id} not found`);
      }
      
      // Delete the report
      await db
        .delete(reports)
        .where(eq(reports.id, id));
      
      console.log(`Successfully deleted report with ID: ${id}`);
    } catch (error) {
      console.error(`Error deleting report with ID ${id}:`, error);
      throw error;
    }
  }

  // Activity methods
  async getUserActivities(userId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
  
  // Grant Search Cache methods
  async getGrantSearchCache(searchTerm: string): Promise<GrantSearchCache | undefined> {
    try {
      const normalizedTerm = searchTerm.trim().toLowerCase();
      const [cacheEntry] = await db
        .select()
        .from(grantSearchCache)
        .where(eq(grantSearchCache.searchTerm, normalizedTerm));
      
      if (cacheEntry) {
        console.log(`Cache hit for "${normalizedTerm}"`);
        
        // Update hit count on access
        const currentHitCount = cacheEntry.hitCount || 1;
        await db
          .update(grantSearchCache)
          .set({ 
            hitCount: currentHitCount + 1,
            lastUpdated: new Date()
          })
          .where(eq(grantSearchCache.id, cacheEntry.id));
      } else {
        console.log(`Cache miss for "${normalizedTerm}"`);
      }
      
      return cacheEntry;
    } catch (error) {
      console.error('Error accessing grant search cache:', error);
      return undefined;
    }
  }
  
  async saveGrantSearchCache(searchTerm: string, results: any[]): Promise<GrantSearchCache> {
    try {
      const normalizedTerm = searchTerm.trim().toLowerCase();
      
      // Check if entry already exists
      const existingEntry = await this.getGrantSearchCache(normalizedTerm);
      if (existingEntry) {
        console.log(`Updating existing cache entry for "${normalizedTerm}"`);
        return this.updateGrantSearchCache(existingEntry.id, results);
      }
      
      console.log(`Creating new cache entry for "${normalizedTerm}" with ${results.length} results`);
      
      // Create new entry
      const [newEntry] = await db
        .insert(grantSearchCache)
        .values({
          searchTerm: normalizedTerm,
          results: results,
          lastUpdated: new Date(),
          hitCount: 1
        })
        .returning();
      
      return newEntry;
    } catch (error) {
      console.error('Error saving to grant search cache:', error);
      // Return a minimal cache entry to prevent failures
      return {
        id: -1,
        searchTerm: searchTerm.trim().toLowerCase(),
        results: results,
        lastUpdated: new Date(),
        hitCount: 0
      } as GrantSearchCache;
    }
  }
  
  async updateGrantSearchCache(id: number, results: any[]): Promise<GrantSearchCache> {
    try {
      const [updatedEntry] = await db
        .update(grantSearchCache)
        .set({
          results: results,
          lastUpdated: new Date()
        })
        .where(eq(grantSearchCache.id, id))
        .returning();
      
      if (!updatedEntry) {
        throw new Error(`Grant search cache entry with id ${id} not found`);
      }
      
      return updatedEntry;
    } catch (error) {
      console.error(`Error updating grant search cache (id: ${id}):`, error);
      // Return a minimal cache entry to prevent failures
      return {
        id: id,
        searchTerm: 'unknown', // We don't have the search term in this context
        results: results,
        lastUpdated: new Date(),
        hitCount: 0
      } as GrantSearchCache;
    }
  }

  // Seed data if needed
  private async seedGrantsIfNeeded() {
    // Check if there are any grants
    const existingGrants = await db.select().from(grants).limit(1);
    
    // If there are no grants, seed with initial data
    if (existingGrants.length === 0) {
      const initialGrants: InsertGrant[] = [
        {
          title: "UKRI Future Leaders Fellowships",
          description: "Support for early career researchers and innovators with outstanding potential.",
          organization: "UK Research and Innovation",
          country: "United Kingdom",
          amount: "Up to £1.5 million",
          deadline: "2023-12-05",
          duration: "4-7 years",
          url: "https://www.ukri.org/apply-for-funding/future-leaders-fellowships/",
          category: "Research",
          status: "open"
        },
        {
          title: "Global Health Innovation Challenge",
          description: "Funding for innovative solutions to global health challenges in developing countries.",
          organization: "Bill & Melinda Gates Foundation",
          country: "United States",
          amount: "$100,000 - $1 million",
          deadline: "2023-10-30",
          duration: "1-3 years",
          url: "https://www.gatesfoundation.org/",
          category: "Health",
          status: "open"
        },
        {
          title: "Innovate UK Smart Grants",
          description: "Funding for disruptive R&D innovations that can significantly impact the UK economy.",
          organization: "Innovate UK",
          country: "United Kingdom",
          amount: "£25,000 - £500,000",
          deadline: "2023-09-20",
          duration: "6-18 months",
          url: "https://www.gov.uk/government/organisations/innovate-uk",
          category: "Innovation",
          status: "open"
        },
        {
          title: "Research Innovation Fund",
          description: "Supporting innovative research projects with funding up to £500,000.",
          organization: "UKRI",
          country: "United Kingdom",
          amount: "Up to £500,000",
          deadline: "2023-10-15",
          duration: "1-3 years",
          url: "https://www.ukri.org/",
          category: "Research",
          status: "open"
        },
        {
          title: "Sustainable Development Solutions",
          description: "Grants for projects addressing the UN Sustainable Development Goals.",
          organization: "United Nations Foundation",
          country: "International",
          amount: "$50,000 - $250,000",
          deadline: "2023-11-10",
          duration: "1-2 years",
          url: "https://unfoundation.org/",
          category: "Sustainability",
          status: "open"
        },
        {
          title: "Digital Transformation Grant",
          description: "Support for innovative digital solutions addressing societal challenges.",
          organization: "European Commission",
          country: "European Union",
          amount: "€50,000 - €300,000",
          deadline: "2023-10-05",
          duration: "12-24 months",
          url: "https://ec.europa.eu/info/index_en",
          category: "Technology",
          status: "open"
        }
      ];
      
      // Insert all initial grants
      await db.insert(grants).values(initialGrants);
    }
  }
  
  // Critique History methods
  async createCritiqueHistory(critique: InsertCritiqueHistory): Promise<CritiqueHistory> {
    try {
      console.log('Creating new critique history entry');
      
      const [historyEntry] = await db
        .insert(critiqueHistory)
        .values(critique)
        .returning();
      
      console.log(`Created critique history entry with ID ${historyEntry.id}`);
      return historyEntry;
    } catch (error) {
      console.error('Error creating critique history entry:', error);
      throw error;
    }
  }
  
  async getUserCritiqueHistory(userId: number): Promise<CritiqueHistory[]> {
    try {
      const historyEntries = await db
        .select()
        .from(critiqueHistory)
        .where(eq(critiqueHistory.userId, userId))
        .orderBy(desc(critiqueHistory.createdAt));
      
      console.log(`Retrieved ${historyEntries.length} critique history entries for user ${userId}`);
      return historyEntries;
    } catch (error) {
      console.error(`Error retrieving critique history for user ${userId}:`, error);
      throw error;
    }
  }
  
  async getCritiqueHistoryById(id: number): Promise<CritiqueHistory | undefined> {
    try {
      const [critique] = await db
        .select()
        .from(critiqueHistory)
        .where(eq(critiqueHistory.id, id));
      return critique;
    } catch (error) {
      console.error(`Error in getCritiqueHistoryById(${id}):`, error);
      return undefined;
    }
  }
  
  async deleteCritiqueHistory(id: number): Promise<void> {
    try {
      console.log(`Deleting critique history entry with ID: ${id}`);
      await db
        .delete(critiqueHistory)
        .where(eq(critiqueHistory.id, id));
      console.log(`Successfully deleted critique history entry ${id}`);
    } catch (error) {
      console.error(`Error deleting critique history entry with id ${id}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
