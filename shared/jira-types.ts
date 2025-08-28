export type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { id: string; name: string };
    project: { id: string; key: string; name: string };
    fixVersions?: { id: string; name: string }[];
    labels?: string[];
    components?: { id: string; name: string }[];
    status?: { id: string; name: string };
    parent?: { key: string; id: string };
    customfield_epicLink?: string; // epic link field key varies
    priority?: { id: string; name: string };
    assignee?: { displayName: string; emailAddress: string };
    reporter?: { displayName: string; emailAddress: string };
    created?: string;
    updated?: string;
  };
};

export type GroomedEpic = {
  summary: string;
  description: string; // markdown
  labels?: string[];
  components?: string[];
  kpis?: string[];
  acceptanceCriteria: string[];
  problem?: string;
  hypothesis?: string;
  scope?: string;
  nonGoals?: string;
};

export type GroomedStory = {
  summary: string; // "As a … I want … so that …"
  description: string; // markdown
  acceptanceCriteria: string[]; // "Given/When/Then…"
  storyPoints?: number;
  labels?: string[];
  components?: string[];
  parentEpicKey?: string;
  persona?: string;
  capability?: string;
  outcome?: string;
};

export type JiraProject = {
  id: string;
  key: string;
  name: string;
};

export type JiraVersion = {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  projectId: string;
};

export type ReleaseNotesStyle = "concise" | "detailed";

export type ReleaseNotesData = {
  markdown: string;
  text: string;
};

export type GroomingRequest = {
  ideaText: string;
  ideaSummary: string;
  type: "epic" | "story";
};

export type DashboardStats = {
  ideasToGroom: number;
  epicsCreated: number;
  storiesCreated: number;
  pendingWriteBacks: number;
};
