import { JiraIssue, JiraProject, JiraVersion, GroomedEpic, GroomedStory } from "@shared/jira-types";

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      throw new Error('Missing required Jira environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }
    
    this.baseUrl = process.env.JIRA_BASE_URL;
    const token = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    
    console.log(`Making Jira API request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira API error (${response.status}): ${errorText}`);
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`API response for ${endpoint}:`, JSON.stringify(result, null, 2).substring(0, 500));
    return result;
  }

  async searchIssues(jql: string, fields?: string[]): Promise<JiraIssue[]> {
    const body = {
      jql,
      fields: fields || [
        'summary',
        'description',
        'issuetype',
        'project',
        'fixVersions',
        'labels',
        'components',
        'status',
        'parent',
        'priority',
        'assignee',
        'reporter',
        'created',
        'updated'
      ],
      maxResults: 100,
    };

    const result = await this.makeRequest('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result.issues || [];
  }

  async getIdeasToGroom(projectKey: string): Promise<JiraIssue[]> {
    const jql = `project = "${projectKey}" AND issuetype in (Idea, Task, Story) AND statusCategory = "To Do" ORDER BY created DESC`;
    return this.searchIssues(jql);
  }

  async getVersionIssues(projectKey: string, versionName: string, additionalJql?: string): Promise<JiraIssue[]> {
    let jql = `project = "${projectKey}" AND fixVersion = "${versionName}"`;
    if (additionalJql) {
      jql += ` AND ${additionalJql}`;
    }
    jql += ' ORDER BY priority DESC, updated DESC';
    
    return this.searchIssues(jql);
  }

  async createIssue(fields: Record<string, any>): Promise<JiraIssue> {
    const body = { fields };
    const result = await this.makeRequest('/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Fetch the created issue with full details
    return this.getIssue(result.key);
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.makeRequest(`/issue/${issueKey}`);
  }

  async linkIssues(inwardKey: string, outwardKey: string, linkType: string = 'Blocks'): Promise<void> {
    const body = {
      type: { name: linkType },
      inwardIssue: { key: inwardKey },
      outwardIssue: { key: outwardKey },
    };

    await this.makeRequest('/issueLink', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getProjects(): Promise<JiraProject[]> {
    // Try multiple approaches to get projects
    try {
      // Try 1: Basic endpoint with expand parameter
      console.log('Trying basic /project endpoint with expand...');
      const basicProjects = await this.makeRequest('/project?expand=description,lead,url,projectKeys');
      console.log('Basic endpoint with expand returned:', basicProjects?.length || 0, 'projects');
      
      if (basicProjects && basicProjects.length > 0) {
        return basicProjects;
      }
      
      // Try 2: Search endpoint with explicit parameters
      console.log('Trying /project/search with all statuses...');
      const searchResult = await this.makeRequest('/project/search?maxResults=100&orderBy=name&action=view&status=live&status=archived&status=deleted');
      console.log('Search with statuses returned:', searchResult);
      
      if (searchResult?.values && searchResult.values.length > 0) {
        return searchResult.values;
      }
      
      // Try 3: Search endpoint with minimal parameters
      console.log('Trying /project/search with minimal params...');
      const minimalSearch = await this.makeRequest('/project/search?maxResults=100');
      console.log('Minimal search returned:', minimalSearch);
      
      if (minimalSearch?.values && minimalSearch.values.length > 0) {
        return minimalSearch.values;
      }
      
      // Try 4: Check current user to see basic access
      console.log('Checking current user info...');
      const userInfo = await this.makeRequest('/myself');
      console.log('User info:', JSON.stringify(userInfo, null, 2).substring(0, 300));
      
      // Try 5: Check permissions for browsing projects specifically
      console.log('Checking project browse permissions...');
      const projectPermissions = await this.makeRequest('/mypermissions?permissions=BROWSE_PROJECTS');
      console.log('Project permissions:', JSON.stringify(projectPermissions, null, 2));
      
      // Try 6: Try the recent projects endpoint (might have different permissions)
      console.log('Trying recent projects endpoint...');
      const recentProjects = await this.makeRequest('/project/recent');
      console.log('Recent projects returned:', recentProjects);
      
      if (recentProjects && recentProjects.length > 0) {
        return recentProjects;
      }
      
      // Try 7: Search for projects using a different approach - via issue search to find project keys
      console.log('Trying to find projects via issue search...');
      const issueSearch = await this.makeRequest('/search?jql=ORDER BY created DESC&maxResults=10&fields=project');
      console.log('Issue search for projects:', issueSearch);
      
      // Extract unique projects from issues
      const projectsFromIssues = [];
      if (issueSearch?.issues) {
        const seenProjects = new Set();
        for (const issue of issueSearch.issues) {
          if (issue.fields?.project && !seenProjects.has(issue.fields.project.key)) {
            seenProjects.add(issue.fields.project.key);
            projectsFromIssues.push(issue.fields.project);
          }
        }
        console.log('Projects found via issue search:', projectsFromIssues.length);
        if (projectsFromIssues.length > 0) {
          return projectsFromIssues;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  }

  async getVersions(projectKey: string): Promise<JiraVersion[]> {
    return this.makeRequest(`/project/${projectKey}/version`);
  }

  async createEpicFromGroomed(groomed: GroomedEpic, projectKey: string, issueTypeId: string): Promise<JiraIssue> {
    const fields: Record<string, any> = {
      project: { key: projectKey },
      issuetype: { id: issueTypeId },
      summary: groomed.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: groomed.description,
              },
            ],
          },
        ],
      },
      labels: groomed.labels || [],
    };

    if (groomed.components?.length) {
      fields.components = groomed.components.map(name => ({ name }));
    }

    return this.createIssue(fields);
  }

  async createStoryFromGroomed(groomed: GroomedStory, projectKey: string, issueTypeId: string): Promise<JiraIssue> {
    const fields: Record<string, any> = {
      project: { key: projectKey },
      issuetype: { id: issueTypeId },
      summary: groomed.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: groomed.description,
              },
            ],
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

    return this.createIssue(fields);
  }

  async updateVersionDescription(projectKey: string, versionId: string, description: string): Promise<void> {
    const body = { description };
    await this.makeRequest(`/version/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}
