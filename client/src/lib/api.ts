import { apiRequest } from "./queryClient";
import { 
  JiraIssue, 
  JiraProject, 
  JiraVersion, 
  GroomedEpic, 
  GroomedStory, 
  GroomingRequest, 
  ReleaseNotesData,
  DashboardStats 
} from "@shared/jira-types";
import { JiraConfig, EpicTemplate, StoryTemplate, GroomingSession } from "@shared/schema";

// Jira API
export const jiraApi = {
  // Search and fetch operations
  searchIssues: async (jql: string, fields?: string[]): Promise<JiraIssue[]> => {
    const response = await apiRequest('POST', '/api/jira/search', { jql, fields });
    return response.json();
  },

  getIdeas: async (projectKey: string): Promise<JiraIssue[]> => {
    const response = await apiRequest('GET', `/api/jira/ideas?projectKey=${projectKey}`);
    return response.json();
  },

  getVersionIssues: async (projectKey: string, versionName: string, jqlExtras?: string): Promise<JiraIssue[]> => {
    const response = await apiRequest('POST', '/api/jira/version-issues', {
      projectKey,
      versionName,
      jqlExtras
    });
    return response.json();
  },

  getProjects: async (): Promise<JiraProject[]> => {
    const response = await apiRequest('GET', '/api/jira/projects');
    return response.json();
  },

  getVersions: async (projectKey: string): Promise<JiraVersion[]> => {
    const response = await apiRequest('GET', `/api/jira/versions/${projectKey}`);
    return response.json();
  },

  // Issue creation and linking
  createIssue: async (fields: Record<string, any>): Promise<JiraIssue> => {
    const response = await apiRequest('POST', '/api/jira/create-issue', { fields });
    return response.json();
  },

  linkIssues: async (inwardKey: string, outwardKey: string, typeName?: string): Promise<void> => {
    await apiRequest('POST', '/api/jira/link-issue', {
      inwardKey,
      outwardKey,
      typeName: typeName || 'Blocks'
    });
  },

  // Epic and Story creation helpers
  createEpicFromGroomed: async (groomed: GroomedEpic, projectKey: string): Promise<JiraIssue> => {
    const fields: Record<string, any> = {
      project: { key: projectKey },
      issuetype: { name: 'Epic' },
      summary: groomed.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: groomed.description }],
          },
        ],
      },
      labels: groomed.labels || [],
    };

    if (groomed.components?.length) {
      fields.components = groomed.components.map(name => ({ name }));
    }

    return jiraApi.createIssue(fields);
  },

  createStoryFromGroomed: async (groomed: GroomedStory, projectKey: string): Promise<JiraIssue> => {
    const fields: Record<string, any> = {
      project: { key: projectKey },
      issuetype: { name: 'Story' },
      summary: groomed.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: groomed.description }],
          },
        ],
      },
      labels: groomed.labels || [],
    };

    if (groomed.components?.length) {
      fields.components = groomed.components.map(name => ({ name }));
    }

    if (groomed.storyPoints) {
      fields.customfield_10016 = groomed.storyPoints; // Story Points field - may vary
    }

    if (groomed.parentEpicKey) {
      fields.parent = { key: groomed.parentEpicKey };
    }

    return jiraApi.createIssue(fields);
  },
};

// AI Grooming API
export const groomingApi = {
  groomToEpic: async (request: GroomingRequest): Promise<GroomedEpic> => {
    const response = await apiRequest('POST', '/api/groom/epic', request);
    return response.json();
  },

  groomToStories: async (request: GroomingRequest): Promise<GroomedStory[]> => {
    const response = await apiRequest('POST', '/api/groom/story', request);
    return response.json();
  },
};

// Release Notes API
export const releaseNotesApi = {
  generate: async (
    issues: JiraIssue[], 
    style: "concise" | "detailed" = "detailed",
    includeSections?: string[]
  ): Promise<ReleaseNotesData> => {
    const response = await apiRequest('POST', '/api/release-notes', {
      issues,
      style,
      includeSections
    });
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiRequest('GET', '/api/dashboard/stats');
    return response.json();
  },
};

// Configuration API
export const configApi = {
  // Jira Configuration
  getJiraConfig: async (): Promise<Partial<JiraConfig>> => {
    const response = await apiRequest('GET', '/api/config/jira');
    return response.json();
  },

  saveJiraConfig: async (config: Omit<JiraConfig, 'id' | 'userId' | 'createdAt'>): Promise<Partial<JiraConfig>> => {
    const response = await apiRequest('POST', '/api/config/jira', config);
    return response.json();
  },
};

// Template API
export const templateApi = {
  // Epic Templates
  getEpicTemplates: async (): Promise<EpicTemplate[]> => {
    const response = await apiRequest('GET', '/api/templates/epic');
    return response.json();
  },

  createEpicTemplate: async (template: Omit<EpicTemplate, 'id' | 'userId' | 'createdAt' | 'isDefault'>): Promise<EpicTemplate> => {
    const response = await apiRequest('POST', '/api/templates/epic', template);
    return response.json();
  },

  // Story Templates
  getStoryTemplates: async (): Promise<StoryTemplate[]> => {
    const response = await apiRequest('GET', '/api/templates/story');
    return response.json();
  },

  createStoryTemplate: async (template: Omit<StoryTemplate, 'id' | 'userId' | 'createdAt' | 'isDefault'>): Promise<StoryTemplate> => {
    const response = await apiRequest('POST', '/api/templates/story', template);
    return response.json();
  },
};

// Grooming Sessions API
export const sessionsApi = {
  getSessions: async (): Promise<GroomingSession[]> => {
    const response = await apiRequest('GET', '/api/grooming-sessions');
    return response.json();
  },

  createSession: async (session: Omit<GroomingSession, 'id' | 'userId' | 'createdAt' | 'syncedAt'>): Promise<GroomingSession> => {
    const response = await apiRequest('POST', '/api/grooming-sessions', session);
    return response.json();
  },
};

// Utility functions
export const utils = {
  // Copy text to clipboard
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  },

  // Export data as CSV
  exportToCSV: (data: any[], filename: string, headers: string[]): void => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(',') + '\n' +
      data.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Format Jira issue key for display
  formatIssueKey: (key: string): string => {
    return key.toUpperCase();
  },

  // Generate JQL queries
  buildJQL: {
    ideasToGroom: (projectKey: string): string => {
      return `project = "${projectKey}" AND issuetype in (Idea, Task, Story) AND statusCategory = "To Do" ORDER BY created DESC`;
    },

    versionIssues: (projectKey: string, versionName: string, additionalFilters?: string): string => {
      let jql = `project = "${projectKey}" AND fixVersion = "${versionName}"`;
      if (additionalFilters) {
        jql += ` AND ${additionalFilters}`;
      }
      jql += ' ORDER BY priority DESC, updated DESC';
      return jql;
    },

    epicsByWeek: (projectKey: string, weeks: number = 1): string => {
      return `project = "${projectKey}" AND issuetype = Epic AND updated >= -${weeks * 7}d ORDER BY updated DESC`;
    },
  },
};
