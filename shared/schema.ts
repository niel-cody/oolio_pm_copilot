import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const jiraConfigs = pgTable("jira_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  baseUrl: text("base_url").notNull(),
  email: text("email").notNull(),
  apiToken: text("api_token").notNull(),
  isCloud: integer("is_cloud").default(1), // 1 for true, 0 for false
  createdAt: timestamp("created_at").defaultNow(),
});

export const epicTemplates = pgTable("epic_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storyTemplates = pgTable("story_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groomingSessions = pgTable("grooming_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ideaKey: text("idea_key").notNull(),
  groomedData: jsonb("groomed_data"),
  status: text("status").notNull().default("draft"), // draft, pending, synced
  createdAt: timestamp("created_at").defaultNow(),
  syncedAt: timestamp("synced_at"),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  jiraProjectId: text("jira_project_id").notNull(), // Jira's internal project ID
  key: text("key").notNull(), // Project key like "PROJ"
  name: text("name").notNull(),
  description: text("description"),
  leadDisplayName: text("lead_display_name"),
  projectTypeKey: text("project_type_key"), // software, business, etc.
  avatarUrls: jsonb("avatar_urls"), // Store avatar URLs as JSON
  issueTypes: jsonb("issue_types"), // Store available issue types as JSON
  createdAt: timestamp("created_at").defaultNow(),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertJiraConfigSchema = createInsertSchema(jiraConfigs).omit({
  id: true,
  createdAt: true,
});

export const insertEpicTemplateSchema = createInsertSchema(epicTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertStoryTemplateSchema = createInsertSchema(storyTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertGroomingSessionSchema = createInsertSchema(groomingSessions).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertJiraConfig = z.infer<typeof insertJiraConfigSchema>;
export type JiraConfig = typeof jiraConfigs.$inferSelect;
export type InsertEpicTemplate = z.infer<typeof insertEpicTemplateSchema>;
export type EpicTemplate = typeof epicTemplates.$inferSelect;
export type InsertStoryTemplate = z.infer<typeof insertStoryTemplateSchema>;
export type StoryTemplate = typeof storyTemplates.$inferSelect;
export type InsertGroomingSession = z.infer<typeof insertGroomingSessionSchema>;
export type GroomingSession = typeof groomingSessions.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
