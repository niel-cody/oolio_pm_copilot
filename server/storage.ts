import { 
  type User, 
  type InsertUser, 
 
  type EpicTemplate,
  type InsertEpicTemplate,
  type StoryTemplate,
  type InsertStoryTemplate,
  type GroomingSession,
  type InsertGroomingSession,
  type Project,
  type InsertProject,
  users,
  epicTemplates,
  storyTemplates,
  groomingSessions,
  projects
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;


  // Templates
  getEpicTemplates(userId: string): Promise<EpicTemplate[]>;
  createEpicTemplate(template: InsertEpicTemplate): Promise<EpicTemplate>;
  updateEpicTemplate(id: string, template: Partial<InsertEpicTemplate>): Promise<EpicTemplate | undefined>;
  deleteEpicTemplate(id: string): Promise<boolean>;

  getStoryTemplates(userId: string): Promise<StoryTemplate[]>;
  createStoryTemplate(template: InsertStoryTemplate): Promise<StoryTemplate>;
  updateStoryTemplate(id: string, template: Partial<InsertStoryTemplate>): Promise<StoryTemplate | undefined>;
  deleteStoryTemplate(id: string): Promise<boolean>;

  // Grooming Sessions
  getGroomingSessions(userId: string): Promise<GroomingSession[]>;
  createGroomingSession(session: InsertGroomingSession): Promise<GroomingSession>;
  updateGroomingSession(id: string, session: Partial<InsertGroomingSession>): Promise<GroomingSession | undefined>;
  deleteGroomingSession(id: string): Promise<boolean>;

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  syncProjects(userId: string, jiraProjects: any[]): Promise<Project[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private epicTemplates: Map<string, EpicTemplate>;
  private storyTemplates: Map<string, StoryTemplate>;
  private groomingSessions: Map<string, GroomingSession>;
  private projects: Map<string, Project>;

  constructor() {
    this.users = new Map();
    this.epicTemplates = new Map();
    this.storyTemplates = new Map();
    this.groomingSessions = new Map();
    this.projects = new Map();

    // Initialize with default templates
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultUserId = "default-user";
    
    // Default Epic Template
    const defaultEpicTemplate: EpicTemplate = {
      id: randomUUID(),
      userId: defaultUserId,
      name: "Standard Epic",
      template: `# Problem
{problem}

# Hypothesis
{hypothesis}

# Scope
{scope}

# Non-Goals
{non_goals}

# KPIs / Success
- {kpi_1}
- {kpi_2}

# Acceptance Criteria
- {ac_1}
- {ac_2}`,
      isDefault: 1,
      createdAt: new Date(),
    };

    // Default Story Template
    const defaultStoryTemplate: StoryTemplate = {
      id: randomUUID(),
      userId: defaultUserId,
      name: "Standard Story",
      template: `**User Story**  
As a {persona}, I want {capability} so that {outcome}.

**Acceptance Criteria**  
- Given {context}, when {action}, then {result}.
- Given {context2}, when {action2}, then {result2}.

**DoD**  
- Tests updated
- Docs updated
- Telemetry added`,
      isDefault: 1,
      createdAt: new Date(),
    };

    this.epicTemplates.set(defaultEpicTemplate.id, defaultEpicTemplate);
    this.storyTemplates.set(defaultStoryTemplate.id, defaultStoryTemplate);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }


  // Epic Template methods
  async getEpicTemplates(userId: string): Promise<EpicTemplate[]> {
    return Array.from(this.epicTemplates.values()).filter(
      (template) => template.userId === userId || template.isDefault === 1,
    );
  }

  async createEpicTemplate(template: InsertEpicTemplate): Promise<EpicTemplate> {
    const id = randomUUID();
    const epicTemplate: EpicTemplate = { 
      ...template, 
      id, 
      isDefault: template.isDefault ?? 0,
      createdAt: new Date() 
    };
    this.epicTemplates.set(id, epicTemplate);
    return epicTemplate;
  }

  async updateEpicTemplate(id: string, template: Partial<InsertEpicTemplate>): Promise<EpicTemplate | undefined> {
    const existing = this.epicTemplates.get(id);
    if (!existing) return undefined;
    
    const updated: EpicTemplate = { ...existing, ...template };
    this.epicTemplates.set(id, updated);
    return updated;
  }

  async deleteEpicTemplate(id: string): Promise<boolean> {
    return this.epicTemplates.delete(id);
  }

  // Story Template methods
  async getStoryTemplates(userId: string): Promise<StoryTemplate[]> {
    return Array.from(this.storyTemplates.values()).filter(
      (template) => template.userId === userId || template.isDefault === 1,
    );
  }

  async createStoryTemplate(template: InsertStoryTemplate): Promise<StoryTemplate> {
    const id = randomUUID();
    const storyTemplate: StoryTemplate = { 
      ...template, 
      id, 
      isDefault: template.isDefault ?? 0,
      createdAt: new Date() 
    };
    this.storyTemplates.set(id, storyTemplate);
    return storyTemplate;
  }

  async updateStoryTemplate(id: string, template: Partial<InsertStoryTemplate>): Promise<StoryTemplate | undefined> {
    const existing = this.storyTemplates.get(id);
    if (!existing) return undefined;
    
    const updated: StoryTemplate = { ...existing, ...template };
    this.storyTemplates.set(id, updated);
    return updated;
  }

  async deleteStoryTemplate(id: string): Promise<boolean> {
    return this.storyTemplates.delete(id);
  }

  // Grooming Session methods
  async getGroomingSessions(userId: string): Promise<GroomingSession[]> {
    return Array.from(this.groomingSessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  async createGroomingSession(session: InsertGroomingSession): Promise<GroomingSession> {
    const id = randomUUID();
    const groomingSession: GroomingSession = { 
      ...session, 
      id, 
      status: session.status ?? "draft",
      groomedData: session.groomedData ?? null,
      createdAt: new Date(),
      syncedAt: null
    };
    this.groomingSessions.set(id, groomingSession);
    return groomingSession;
  }

  async updateGroomingSession(id: string, session: Partial<InsertGroomingSession>): Promise<GroomingSession | undefined> {
    const existing = this.groomingSessions.get(id);
    if (!existing) return undefined;
    
    const updated: GroomingSession = { ...existing, ...session };
    this.groomingSessions.set(id, updated);
    return updated;
  }

  async deleteGroomingSession(id: string): Promise<boolean> {
    return this.groomingSessions.delete(id);
  }

  // Project methods
  async getProjects(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId,
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const newProject: Project = { 
      ...project, 
      id, 
      createdAt: new Date(),
      syncedAt: new Date()
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    
    const updated: Project = { ...existing, ...project, syncedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async syncProjects(userId: string, jiraProjects: any[]): Promise<Project[]> {
    const existingProjects = await this.getProjects(userId);
    const existingProjectsByKey = new Map(existingProjects.map(p => [p.key, p]));
    const syncedProjects: Project[] = [];

    for (const jiraProject of jiraProjects) {
      const projectData: InsertProject = {
        userId,
        jiraProjectId: jiraProject.id,
        key: jiraProject.key,
        name: jiraProject.name,
        description: jiraProject.description ?? null,
        leadDisplayName: jiraProject.lead?.displayName ?? null,
        projectTypeKey: jiraProject.projectTypeKey ?? null,
        avatarUrls: jiraProject.avatarUrls ?? null,
        issueTypes: jiraProject.issueTypes ?? null,
      };

      const existingProject = existingProjectsByKey.get(jiraProject.key);
      
      if (existingProject) {
        // Update existing project
        const updated = await this.updateProject(existingProject.id, projectData);
        if (updated) syncedProjects.push(updated);
      } else {
        // Create new project
        const created = await this.createProject(projectData);
        syncedProjects.push(created);
      }
    }

    return syncedProjects;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }


  // Epic Template methods
  async getEpicTemplates(userId: string): Promise<EpicTemplate[]> {
    return await db
      .select()
      .from(epicTemplates)
      .where(eq(epicTemplates.userId, userId));
  }

  async createEpicTemplate(template: InsertEpicTemplate): Promise<EpicTemplate> {
    const [epicTemplate] = await db
      .insert(epicTemplates)
      .values(template)
      .returning();
    return epicTemplate;
  }

  async updateEpicTemplate(id: string, template: Partial<InsertEpicTemplate>): Promise<EpicTemplate | undefined> {
    const [updated] = await db
      .update(epicTemplates)
      .set(template)
      .where(eq(epicTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEpicTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(epicTemplates)
      .where(eq(epicTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Story Template methods
  async getStoryTemplates(userId: string): Promise<StoryTemplate[]> {
    return await db
      .select()
      .from(storyTemplates)
      .where(eq(storyTemplates.userId, userId));
  }

  async createStoryTemplate(template: InsertStoryTemplate): Promise<StoryTemplate> {
    const [storyTemplate] = await db
      .insert(storyTemplates)
      .values(template)
      .returning();
    return storyTemplate;
  }

  async updateStoryTemplate(id: string, template: Partial<InsertStoryTemplate>): Promise<StoryTemplate | undefined> {
    const [updated] = await db
      .update(storyTemplates)
      .set(template)
      .where(eq(storyTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStoryTemplate(id: string): Promise<boolean> {
    const result = await db
      .delete(storyTemplates)
      .where(eq(storyTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Grooming Session methods
  async getGroomingSessions(userId: string): Promise<GroomingSession[]> {
    return await db
      .select()
      .from(groomingSessions)
      .where(eq(groomingSessions.userId, userId));
  }

  async createGroomingSession(session: InsertGroomingSession): Promise<GroomingSession> {
    const [groomingSession] = await db
      .insert(groomingSessions)
      .values(session)
      .returning();
    return groomingSession;
  }

  async updateGroomingSession(id: string, session: Partial<InsertGroomingSession>): Promise<GroomingSession | undefined> {
    const [updated] = await db
      .update(groomingSessions)
      .set(session)
      .where(eq(groomingSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGroomingSession(id: string): Promise<boolean> {
    const result = await db
      .delete(groomingSessions)
      .where(eq(groomingSessions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Project methods
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, syncedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async syncProjects(userId: string, jiraProjects: any[]): Promise<Project[]> {
    const existingProjects = await this.getProjects(userId);
    const existingProjectsByKey = new Map(existingProjects.map(p => [p.key, p]));
    const syncedProjects: Project[] = [];

    for (const jiraProject of jiraProjects) {
      const projectData: InsertProject = {
        userId,
        jiraProjectId: jiraProject.id,
        key: jiraProject.key,
        name: jiraProject.name,
        description: jiraProject.description ?? null,
        leadDisplayName: jiraProject.lead?.displayName ?? null,
        projectTypeKey: jiraProject.projectTypeKey ?? null,
        avatarUrls: jiraProject.avatarUrls ?? null,
        issueTypes: jiraProject.issueTypes ?? null,
      };

      const existingProject = existingProjectsByKey.get(jiraProject.key);
      
      if (existingProject) {
        // Update existing project
        const updated = await this.updateProject(existingProject.id, projectData);
        if (updated) syncedProjects.push(updated);
      } else {
        // Create new project
        const created = await this.createProject(projectData);
        syncedProjects.push(created);
      }
    }

    return syncedProjects;
  }
}

export const storage = new DatabaseStorage();
