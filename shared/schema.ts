import { pgTable, text, serial, timestamp, boolean, integer, foreignKey, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  organization: text("organization"),
  profilePicture: text("profile_picture"),
  isAdmin: boolean("is_admin").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").default("free"),
  planExpiresAt: timestamp("plan_expires_at"),
  preferredLlmModel: text("preferred_llm_model").default("venice"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true,
    fullName: true,
    organization: true,
    profilePicture: true,
    preferredLlmModel: true,
  });

// Grants model
export const grants = pgTable("grants", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  organization: text("organization").notNull(),
  country: text("country"),
  amount: text("amount"),
  deadline: text("deadline"),
  duration: text("duration"),
  url: text("url"),
  category: text("category"),
  status: text("status").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SavedGrants model - junction table for users and their saved grants
export const savedGrants = pgTable("saved_grants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantId: integer("grant_id").notNull(), // Removed foreign key constraint to support web search grants
  sourceType: text("source_type").default("database"), // Tracks if it's a database grant or web search grant
  webSearchData: jsonb("web_search_data"), // Stores full grant data for web search grants
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGrantSchema = createInsertSchema(grants)
  .pick({
    title: true,
    description: true,
    organization: true,
    country: true,
    amount: true,
    deadline: true,
    duration: true,
    url: true,
    category: true,
    status: true,
  });

// Proposals model
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  grantId: integer("grant_id").references(() => grants.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  feedback: text("feedback"),
  metadata: text("metadata"), // Added for storing web search grant data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposals)
  .pick({
    userId: true,
    grantId: true,
    title: true,
    content: true,
    status: true,
    metadata: true, // Added metadata field for web search grant details
  });

// Reports model
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  proposalId: integer("proposal_id").references(() => proposals.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  reportType: text("report_type").notNull(), // e.g., "progress", "final", "quarterly"
  projectProgress: text("project_progress"), // User's description of project progress
  challengesMitigations: text("challenges_mitigations"), // User's description of challenges and mitigations
  modelName: text("model_name"), // AI model used to generate the report
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports)
  .pick({
    userId: true,
    proposalId: true,
    title: true,
    content: true,
    status: true,
    reportType: true,
    projectProgress: true,
    challengesMitigations: true,
    modelName: true,
  });

// Activities model
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),  // e.g., 'proposal_generation', 'grant_saved', 'report_created'
  description: text("description").notNull(),
  entityId: integer("entity_id"),  // ID of the related entity (proposal, grant, etc.)
  entityType: text("entity_type"),  // Type of the related entity ('proposal', 'grant', etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities)
  .pick({
    userId: true,
    type: true,
    description: true,
    entityId: true,
    entityType: true,
  });

// Create insert schema for saved grants
export const insertSavedGrantSchema = createInsertSchema(savedGrants)
  .pick({
    userId: true,
    grantId: true,
    sourceType: true,
    webSearchData: true,
  });
  
// Define relations after all tables are created to avoid circular dependencies
export const usersRelations = relations(users, ({ many }) => ({
  proposals: many(proposals),
  reports: many(reports),
  activities: many(activities),
  savedGrants: many(savedGrants),
}));

export const grantsRelations = relations(grants, ({ many }) => ({
  proposals: many(proposals),
  savedBy: many(savedGrants),
}));

export const savedGrantsRelations = relations(savedGrants, ({ one }) => ({
  user: one(users, {
    fields: [savedGrants.userId],
    references: [users.id],
  }),
  // Make the grant relation nullable to support web search grants
  // that might not exist in the grants table
  grant: one(grants, {
    fields: [savedGrants.grantId],
    references: [grants.id],
  }),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  user: one(users, {
    fields: [proposals.userId],
    references: [users.id],
  }),
  grant: one(grants, {
    fields: [proposals.grantId],
    references: [grants.id],
  }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  proposal: one(proposals, {
    fields: [reports.proposalId],
    references: [proposals.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// Grant search cache to store previous search results
export const grantSearchCache = pgTable("grant_search_cache", {
  id: serial("id").primaryKey(),
  searchTerm: text("search_term").notNull().unique(), // The search term used
  results: jsonb("results").notNull(), // The grant search results as JSON
  lastUpdated: timestamp("last_updated").defaultNow(), // When the cache was last updated
  hitCount: integer("hit_count").default(1) // Number of times this search has been used
});

// Critique history to store past critiques for users
export const critiqueHistory = pgTable("critique_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  proposalContent: text("proposal_content").notNull(),
  critiqueContent: text("critique_content").notNull(),
  grantUrl: text("grant_url"),
  modelName: text("model_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertGrantSearchCacheSchema = createInsertSchema(grantSearchCache)
  .pick({
    searchTerm: true,
    results: true,
  });
  
export const insertCritiqueHistorySchema = createInsertSchema(critiqueHistory);
  // No omit needed as it's handled automatically by createInsertSchema

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Grant = typeof grants.$inferSelect;
export type InsertGrant = z.infer<typeof insertGrantSchema>;

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type SavedGrant = typeof savedGrants.$inferSelect;
export type InsertSavedGrant = z.infer<typeof insertSavedGrantSchema>;

export type GrantSearchCache = typeof grantSearchCache.$inferSelect;
export type InsertGrantSearchCache = z.infer<typeof insertGrantSearchCacheSchema>;

export type CritiqueHistory = typeof critiqueHistory.$inferSelect;
export type InsertCritiqueHistory = z.infer<typeof insertCritiqueHistorySchema>;
