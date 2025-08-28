import { 
  type User, 
  type InsertUser, 
  type JiraConfig, 
  type InsertJiraConfig,
  type EpicTemplate,
  type InsertEpicTemplate,
  type StoryTemplate,
  type InsertStoryTemplate,
  type GroomingSession,
  type InsertGroomingSession
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Jira Config
  getJiraConfig(userId: string): Promise<JiraConfig | undefined>;
  createJiraConfig(config: InsertJiraConfig): Promise<JiraConfig>;
  updateJiraConfig(userId: string, config: Partial<InsertJiraConfig>): Promise<JiraConfig | undefined>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private jiraConfigs: Map<string, JiraConfig>;
  private epicTemplates: Map<string, EpicTemplate>;
  private storyTemplates: Map<string, StoryTemplate>;
  private groomingSessions: Map<string, GroomingSession>;

  constructor() {
    this.users = new Map();
    this.jiraConfigs = new Map();
    this.epicTemplates = new Map();
    this.storyTemplates = new Map();
    this.groomingSessions = new Map();

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

  // Jira Config methods
  async getJiraConfig(userId: string): Promise<JiraConfig | undefined> {
    return Array.from(this.jiraConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createJiraConfig(config: InsertJiraConfig): Promise<JiraConfig> {
    const id = randomUUID();
    const jiraConfig: JiraConfig = { 
      ...config, 
      id, 
      isCloud: config.isCloud ?? 1,
      createdAt: new Date() 
    };
    this.jiraConfigs.set(id, jiraConfig);
    return jiraConfig;
  }

  async updateJiraConfig(userId: string, config: Partial<InsertJiraConfig>): Promise<JiraConfig | undefined> {
    const existing = await this.getJiraConfig(userId);
    if (!existing) return undefined;
    
    const updated: JiraConfig = { ...existing, ...config };
    this.jiraConfigs.set(existing.id, updated);
    return updated;
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
}

export const storage = new MemStorage();
