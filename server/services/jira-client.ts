import { JiraIssue, JiraProject, JiraVersion, GroomedEpic, GroomedStory } from "@shared/jira-types";

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  private storyPointsFieldId: string | null;
  private storyPointsResolved: boolean;

  constructor() {
    if (!process.env.JIRA_BASE_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      throw new Error('Missing required Jira environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    }
    
    this.baseUrl = process.env.JIRA_BASE_URL;
    
    // Create credentials exactly as per Atlassian docs
    const credentials = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    this.authHeader = `Basic ${encodedCredentials}`;
    this.storyPointsFieldId = null;
    this.storyPointsResolved = false;
    
    // Minimal non-sensitive logging
    console.log('Jira Client initialized');
    console.log('- Base URL:', this.baseUrl);
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#rate-limiting
   * DATE_ACCESSED: 2025-08-29
   * API: Generic request wrapper for /rest/api/3/* endpoints
   * SCOPES: read:jira-work, write:jira-work (depending on method)
   * NOTES: Honors 429 with Retry-After, exponential backoff with jitter; logs request IDs if present.
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    
    const maxRetries = 4;
    let attempt = 0;
    while (true) {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      const reqId = response.headers.get('x-request-id') || response.headers.get('x-atlassian-request-id') || undefined;
      if (reqId) console.log(`Jira request id: ${reqId} (${endpoint})`);

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 0;
        const backoff = Math.min(16000, 1000 * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 250);
        const delayMs = Math.max(retryAfterMs, backoff + jitter);
        console.warn(`429 received. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delayMs));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Jira API error (${response.status}) for ${endpoint}: ${errorText}`);
        throw new Error(`Jira API error (${response.status}): ${errorText}`);
      }

      if (response.status === 204) {
        return undefined as unknown as any;
      }

      const result = await response.json();
      return result;
    }
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/search
   * SCOPES: read:jira-work
   */
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

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/search (via helper)
   * SCOPES: read:jira-work
   */
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

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/issue
   * SCOPES: write:jira-work
   */
  async createIssue(fields: Record<string, any>): Promise<JiraIssue> {
    const body = { fields };
    const result = await this.makeRequest('/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Fetch the created issue with full details
    return this.getIssue(result.key);
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
   * DATE_ACCESSED: 2025-08-29
   * API: GET /rest/api/3/issue/{issueIdOrKey}
   * SCOPES: read:jira-work
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.makeRequest(`/issue/${issueKey}`);
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/#api-rest-api-3-issuelink-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/issueLink
   * SCOPES: write:jira-work
   */
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

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
   * DATE_ACCESSED: 2025-08-29
   * API: GET /rest/api/3/project/search
   * SCOPES: read:jira-work
   * NOTES: Uses pagination (startAt, maxResults) and expand params. Fallbacks: GET /rest/api/3/project (deprecated), POST /rest/api/3/search (project via issues) if necessary.
   */
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

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-versions-get
   * DATE_ACCESSED: 2025-08-29
   * API: GET /rest/api/3/project/{projectIdOrKey}/versions
   * SCOPES: read:jira-work
   */
  async getVersions(projectKey: string): Promise<JiraVersion[]> {
    return this.makeRequest(`/project/${projectKey}/versions`);
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/issue
   * SCOPES: write:jira-work
   * NOTES: Request body follows docs; do not hard-code custom field IDs.
   */
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

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
   * DATE_ACCESSED: 2025-08-29
   * API: POST /rest/api/3/issue
   * SCOPES: write:jira-work
   * NOTES: Dynamically resolves Story Points custom field id via GET /rest/api/3/field.
   */
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
      const spId = await this.resolveStoryPointsFieldId();
      if (spId) {
        fields[spId] = groomed.storyPoints;
      }
    }

    if (groomed.parentEpicKey) {
      fields.parent = { key: groomed.parentEpicKey };
    }

    return this.createIssue(fields);
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
   * DATE_ACCESSED: 2025-08-29
   * API: GET /rest/api/3/field
   * SCOPES: read:jira-work
   * NOTES: Searches for Story Points field by name; caches result per instance.
   */
  private async resolveStoryPointsFieldId(): Promise<string | null> {
    if (this.storyPointsResolved) return this.storyPointsFieldId;
    try {
      const fields = await this.makeRequest('/field');
      const match = (Array.isArray(fields) ? fields : []).find((f: any) => {
        const name = (f.name || '').toString().toLowerCase();
        return name === 'story points' || name === 'story point estimate' || name.includes('story point');
      });
      this.storyPointsFieldId = (match && typeof match.id === 'string') ? match.id : null;
      this.storyPointsResolved = true;
      return this.storyPointsFieldId;
    } catch {
      this.storyPointsFieldId = null;
      this.storyPointsResolved = true;
      return null;
    }
  }

  /**
   * DOC: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-version-id-put
   * DATE_ACCESSED: 2025-08-29
   * API: PUT /rest/api/3/version/{id}
   * SCOPES: write:jira-work
   */
  async updateVersionDescription(projectKey: string, versionId: string, description: string): Promise<void> {
    const body = { description };
    await this.makeRequest(`/version/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}
