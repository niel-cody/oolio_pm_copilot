import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { JiraClient } from "./services/jira-client";
import { OpenAIService } from "./services/openai-service";
import { z } from "zod";
import { insertEpicTemplateSchema, insertStoryTemplateSchema, insertGroomingSessionSchema } from "@shared/schema";
import { GroomingRequest, DashboardStats } from "@shared/jira-types";

// Mock user ID for development (in production, use proper auth)
const MOCK_USER_ID = "mock-user-123";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Jira search endpoint
  app.post("/api/jira/search", async (req, res) => {
    try {
      const { jql, fields } = req.body;
      
      if (!jql || typeof jql !== 'string') {
        return res.status(400).json({ message: "JQL query is required" });
      }

      const client = new JiraClient();
      const issues = await client.searchIssues(jql, fields);
      
      res.json(issues);
    } catch (error) {
      console.error("Jira search error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get ideas to groom
  app.get("/api/jira/ideas", async (req, res) => {
    try {
      const { projectKey } = req.query;
      
      if (!projectKey || typeof projectKey !== 'string') {
        return res.status(400).json({ message: "Project key is required" });
      }

      const client = new JiraClient();
      const ideas = await client.getIdeasToGroom(projectKey);
      
      res.json(ideas);
    } catch (error) {
      console.error("Get ideas error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Create issue in Jira
  app.post("/api/jira/create-issue", async (req, res) => {
    try {
      const { fields } = req.body;
      
      if (!fields || typeof fields !== 'object') {
        return res.status(400).json({ message: "Issue fields are required" });
      }

      const client = new JiraClient();
      const issue = await client.createIssue(fields);
      
      res.json(issue);
    } catch (error) {
      console.error("Create issue error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Link issues in Jira
  app.post("/api/jira/link-issue", async (req, res) => {
    try {
      const { inwardKey, outwardKey, typeName } = req.body;
      
      if (!inwardKey || !outwardKey) {
        return res.status(400).json({ message: "Both issue keys are required" });
      }

      const client = new JiraClient();
      await client.linkIssues(inwardKey, outwardKey, typeName || 'Blocks');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Link issue error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get version issues
  app.post("/api/jira/version-issues", async (req, res) => {
    try {
      const { projectKey, versionName, jqlExtras } = req.body;
      
      if (!projectKey || !versionName) {
        return res.status(400).json({ message: "Project key and version name are required" });
      }

      const client = new JiraClient();
      const issues = await client.getVersionIssues(projectKey, versionName, jqlExtras);
      
      res.json(issues);
    } catch (error) {
      console.error("Get version issues error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get projects (direct from Jira)
  app.get("/api/jira/projects", async (req, res) => {
    try {
      const client = new JiraClient();
      const projects = await client.getProjects();
      
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get synced projects from database
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects(MOCK_USER_ID);
      res.json(projects);
    } catch (error) {
      console.error("Get synced projects error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Sync projects from Jira to database
  app.post("/api/projects/sync", async (req, res) => {
    try {
      const client = new JiraClient();
      const jiraProjects = await client.getProjects();
      
      // Sync projects to database
      const syncedProjects = await storage.syncProjects(MOCK_USER_ID, jiraProjects);
      
      res.json({ 
        message: `Synced ${syncedProjects.length} projects successfully`,
        projects: syncedProjects
      });
    } catch (error) {
      console.error("Sync projects error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get versions for project
  app.get("/api/jira/versions/:projectKey", async (req, res) => {
    try {
      const { projectKey } = req.params;

      const client = new JiraClient();
      const versions = await client.getVersions(projectKey);
      
      res.json(versions);
    } catch (error) {
      console.error("Get versions error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // AI Grooming endpoints (only if OpenAI key is available)
  if (process.env.OPENAI_API_KEY) {
    app.post("/api/groom/epic", async (req, res) => {
      try {
        const request: GroomingRequest = req.body;
        
        if (!request.ideaText || !request.ideaSummary) {
          return res.status(400).json({ message: "Idea text and summary are required" });
        }

        const openai = new OpenAIService(process.env.OPENAI_API_KEY);
        const groomedEpic = await openai.groomToEpic(request);
        
        res.json(groomedEpic);
      } catch (error) {
        console.error("Groom epic error:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    app.post("/api/groom/story", async (req, res) => {
      try {
        const request: GroomingRequest = req.body;
        
        if (!request.ideaText || !request.ideaSummary) {
          return res.status(400).json({ message: "Idea text and summary are required" });
        }

        const openai = new OpenAIService(process.env.OPENAI_API_KEY);
        const groomedStories = await openai.groomToStories(request);
        
        res.json(groomedStories);
      } catch (error) {
        console.error("Groom stories error:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  }

  // Release notes generation
  app.post("/api/release-notes", async (req, res) => {
    try {
      const { issues, style, includeSections } = req.body;
      
      if (!issues || !Array.isArray(issues)) {
        return res.status(400).json({ message: "Issues array is required" });
      }

      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAIService(process.env.OPENAI_API_KEY);
        const releaseNotes = await openai.generateReleaseNotes(issues, style || 'detailed');
        res.json(releaseNotes);
      } else {
        // Fallback to basic template generation without AI
        const markdown = generateBasicReleaseNotes(issues, style || 'detailed');
        res.json({
          markdown,
          text: markdown.replace(/[#*`_-]/g, '').replace(/\n+/g, ' ').trim()
        });
      }
    } catch (error) {
      console.error("Generate release notes error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Initialize default templates (development only)
  app.post("/api/initialize-defaults", async (req, res) => {
    try {
      const defaultUserId = "default-user";
      
      // Check if defaults already exist
      const existingEpicTemplates = await storage.getEpicTemplates(defaultUserId);
      const existingStoryTemplates = await storage.getStoryTemplates(defaultUserId);
      
      if (existingEpicTemplates.length === 0) {
        await storage.createEpicTemplate({
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
        });
      }
      
      if (existingStoryTemplates.length === 0) {
        await storage.createStoryTemplate({
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
        });
      }
      
      res.json({ message: "Default templates initialized successfully" });
    } catch (error) {
      console.error("Initialize defaults error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Check if Jira env vars are configured
      if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
        return res.json({
          ideasToGroom: 0,
          epicsCreated: 0,
          storiesCreated: 0,
          pendingWriteBacks: 0
        } as DashboardStats);
      }

      // In a real implementation, these would be actual queries to Jira
      // For now, return empty stats since we can't make real API calls without a configured project
      const stats: DashboardStats = {
        ideasToGroom: 0,
        epicsCreated: 0,
        storiesCreated: 0,
        pendingWriteBacks: await (await storage.getGroomingSessions(MOCK_USER_ID)).filter(s => s.status === 'pending').length
      };

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  // Template endpoints
  app.get("/api/templates/epic", async (req, res) => {
    try {
      const templates = await storage.getEpicTemplates(MOCK_USER_ID);
      res.json(templates);
    } catch (error) {
      console.error("Get epic templates error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/templates/epic", async (req, res) => {
    try {
      const validatedData = insertEpicTemplateSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID
      });

      const template = await storage.createEpicTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Create epic template error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/templates/story", async (req, res) => {
    try {
      const templates = await storage.getStoryTemplates(MOCK_USER_ID);
      res.json(templates);
    } catch (error) {
      console.error("Get story templates error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/templates/story", async (req, res) => {
    try {
      const validatedData = insertStoryTemplateSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID
      });

      const template = await storage.createStoryTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Create story template error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Grooming sessions endpoints
  app.get("/api/grooming-sessions", async (req, res) => {
    try {
      const sessions = await storage.getGroomingSessions(MOCK_USER_ID);
      res.json(sessions);
    } catch (error) {
      console.error("Get grooming sessions error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/grooming-sessions", async (req, res) => {
    try {
      const validatedData = insertGroomingSessionSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID
      });

      const session = await storage.createGroomingSession(validatedData);
      res.json(session);
    } catch (error) {
      console.error("Create grooming session error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function for basic release notes when OpenAI is not available
function generateBasicReleaseNotes(issues: any[], style: string): string {
  if (style === 'concise') {
    return `Release includes ${issues.length} items: ${issues.map(i => i.fields.issuetype.name).join(', ')} improvements and fixes.`;
  }

  const epics = issues.filter(i => i.fields.issuetype.name === 'Epic');
  const stories = issues.filter(i => i.fields.issuetype.name === 'Story');
  const bugs = issues.filter(i => i.fields.issuetype.name === 'Bug');

  return `# Release Notes

## 📦 What
This release includes ${issues.length} items across multiple areas.

## 🚀 Highlights
${epics.length > 0 ? `- ${epics.length} new epics completed` : ''}
${stories.length > 0 ? `- ${stories.length} user stories delivered` : ''}

## 🐞 Fixes
${bugs.length > 0 ? bugs.map(b => `- ${b.fields.summary}`).join('\n') : '- No bugs fixed in this release'}

## ⚠️ Known Limitations
- Please review the individual issues for specific limitations

## 🔭 What's Next
- Continued work on upcoming features and improvements`;
}
