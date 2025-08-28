import { JiraIssue, JiraProject, JiraVersion, GroomedEpic, GroomedStory } from "@shared/jira-types";

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      throw new Error('Missing required Jira environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }
    
    this.baseUrl = process.env.JIRA_BASE_URL;
    
    // Create credentials exactly as per Atlassian docs
    const credentials = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    this.authHeader = `Basic ${encodedCredentials}`;
    
    // Debug logging (without exposing credentials)
    console.log('Jira Client initialized:');
    console.log('- Base URL:', this.baseUrl);
    console.log('- Email:', process.env.JIRA_EMAIL);
    console.log('- API Token length:', process.env.JIRA_API_TOKEN?.length);
    console.log('- API Token starts with:', process.env.JIRA_API_TOKEN?.substring(0, 10) + '...');
    console.log('- API Token ends with:', '...' + process.env.JIRA_API_TOKEN?.substring(-10));
    console.log('- Credentials format check:', credentials.split(':').length === 2 ? 'OK' : 'Invalid');
    console.log('- Auth header length:', this.authHeader.length);
    console.log('- Auth header starts with:', this.authHeader.substring(0, 20) + '...');
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
    try {
      // First, validate credentials
      console.log('=== Testing Jira Authentication ===');
      try {
        const authTest = await this.makeRequest('/myself');
        console.log('✅ Authentication successful! User:', authTest.displayName);
      } catch (authError) {
        console.error('❌ Authentication failed:', authError);
        throw new Error(`Authentication failed: ${authError}`);
      }

      console.log('=== Fetching projects via /project/search with pagination ===');
      const expandParams = [
        'lead',
        'issueTypes',
        'description',
        'avatarUrls',
        'projectTypeKey',
        'insight'
      ].join(',');

      const pageSize = 100;
      let startAt = 0;
      let total = Infinity;
      const allProjects: JiraProject[] = [];

      while (startAt < total) {
        const searchResult = await this.makeRequest(
          `/project/search?maxResults=${pageSize}&startAt=${startAt}&expand=${encodeURIComponent(expandParams)}`
        );

        const values = Array.isArray(searchResult?.values) ? searchResult.values : [];
        total = typeof searchResult?.total === 'number' ? searchResult.total : values.length;
        console.log(`Fetched ${values.length} projects (startAt=${startAt})`);
        allProjects.push(...values);

        if (!searchResult || values.length === 0) break;
        startAt += pageSize;
      }

      if (allProjects.length > 0) {
        console.log(`Total projects fetched via search: ${allProjects.length}`);
        return allProjects;
      }

      // Fallback to deprecated endpoint if search returned nothing (some tenants restrict search)
      console.warn('No projects from /project/search, falling back to deprecated /project endpoint...');
      const basicProjects = await this.makeRequest(`/project?expand=${encodeURIComponent(expandParams)}`);
      if (Array.isArray(basicProjects) && basicProjects.length > 0) {
        return basicProjects;
      }

      // Final fallback: infer visible projects from recent issues
      console.log('Fallback: deriving projects via issue search…');
      const issueResult = await this.makeRequest('/search?jql=order by created desc&maxResults=50&fields=project');
      if (issueResult?.issues) {
        const projectsByKey = new Map<string, any>();
        issueResult.issues.forEach((issue: any) => {
          const project = issue?.fields?.project;
          if (project?.key && !projectsByKey.has(project.key)) {
            projectsByKey.set(project.key, project);
          }
        });
        return Array.from(projectsByKey.values());
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
