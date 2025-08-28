import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { 
  jiraApi, 
  groomingApi, 
  releaseNotesApi, 
  dashboardApi, 
  configApi, 
  templateApi, 
  utils 
} from "@/lib/api";
import { 
  JiraIssue, 
  JiraProject, 
  JiraVersion, 
  GroomedEpic, 
  GroomedStory, 
  GroomingRequest,
  DashboardStats 
} from "@shared/jira-types";
import { JiraConfig, EpicTemplate, StoryTemplate } from "@shared/schema";

// Jira Configuration Hook
export function useJiraConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    error
  } = useQuery<Partial<JiraConfig>>({
    queryKey: ['/api/config/jira'],
    retry: false,
  });

  const saveConfigMutation = useMutation({
    mutationFn: configApi.saveJiraConfig,
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Jira configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/config/jira'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jira/projects'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: jiraApi.getProjects,
    onSuccess: (projects) => {
      toast({
        title: "Connection Successful",
        description: `Connected successfully. Found ${projects.length} projects.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    config,
    isLoading,
    error,
    isConfigured: !!config?.baseUrl && !!config?.email,
    saveConfig: saveConfigMutation.mutate,
    testConnection: testConnectionMutation.mutate,
    isSaving: saveConfigMutation.isPending,
    isTesting: testConnectionMutation.isPending,
  };
}

// Jira Projects Hook
export function useJiraProjects() {
  const { config } = useJiraConfig();

  return useQuery<JiraProject[]>({
    queryKey: ['/api/jira/projects'],
    queryFn: jiraApi.getProjects,
    enabled: !!config?.baseUrl,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Jira Versions Hook
export function useJiraVersions(projectKey?: string) {
  const { config } = useJiraConfig();

  return useQuery<JiraVersion[]>({
    queryKey: ['/api/jira/versions', projectKey],
    queryFn: () => jiraApi.getVersions(projectKey!),
    enabled: !!config?.baseUrl && !!projectKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Ideas Hook
export function useIdeas(projectKey?: string) {
  const { config } = useJiraConfig();

  return useQuery<JiraIssue[]>({
    queryKey: ['/api/jira/ideas', projectKey],
    queryFn: () => jiraApi.getIdeas(projectKey!),
    enabled: !!config?.baseUrl && !!projectKey,
    refetchOnWindowFocus: false,
  });
}

// Version Issues Hook
export function useVersionIssues(projectKey?: string, versionName?: string, additionalFilters?: string) {
  const { config } = useJiraConfig();

  return useQuery<JiraIssue[]>({
    queryKey: ['/api/jira/version-issues', projectKey, versionName, additionalFilters],
    queryFn: () => jiraApi.getVersionIssues(projectKey!, versionName!, additionalFilters),
    enabled: !!config?.baseUrl && !!projectKey && !!versionName,
    refetchOnWindowFocus: false,
  });
}

// AI Grooming Hooks
export function useAIGrooming() {
  const { toast } = useToast();

  const groomToEpicMutation = useMutation({
    mutationFn: groomingApi.groomToEpic,
    onSuccess: () => {
      toast({
        title: "Epic Generated",
        description: "AI has successfully transformed the idea into an epic.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Grooming Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const groomToStoriesMutation = useMutation({
    mutationFn: groomingApi.groomToStories,
    onSuccess: (stories) => {
      toast({
        title: "Stories Generated",
        description: `AI has generated ${stories.length} stories from the idea.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Grooming Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    groomToEpic: groomToEpicMutation.mutate,
    groomToStories: groomToStoriesMutation.mutate,
    isGroomingEpic: groomToEpicMutation.isPending,
    isGroomingStories: groomToStoriesMutation.isPending,
    groomedEpic: groomToEpicMutation.data,
    groomedStories: groomToStoriesMutation.data,
  };
}

// Issue Creation Hook
export function useIssueCreation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createIssueMutation = useMutation({
    mutationFn: jiraApi.createIssue,
    onSuccess: (issue) => {
      toast({
        title: "Issue Created",
        description: `${issue.fields.issuetype.name} ${issue.key} has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jira/ideas'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEpicFromGroomedMutation = useMutation({
    mutationFn: ({ groomed, projectKey }: { groomed: GroomedEpic; projectKey: string }) =>
      jiraApi.createEpicFromGroomed(groomed, projectKey),
    onSuccess: (issue) => {
      toast({
        title: "Epic Created",
        description: `Epic ${issue.key} has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStoryFromGroomedMutation = useMutation({
    mutationFn: ({ groomed, projectKey }: { groomed: GroomedStory; projectKey: string }) =>
      jiraApi.createStoryFromGroomed(groomed, projectKey),
    onSuccess: (issue) => {
      toast({
        title: "Story Created",
        description: `Story ${issue.key} has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createIssue: createIssueMutation.mutate,
    createEpicFromGroomed: createEpicFromGroomedMutation.mutate,
    createStoryFromGroomed: createStoryFromGroomedMutation.mutate,
    isCreatingIssue: createIssueMutation.isPending,
    isCreatingEpic: createEpicFromGroomedMutation.isPending,
    isCreatingStory: createStoryFromGroomedMutation.isPending,
  };
}

// Release Notes Hook
export function useReleaseNotes() {
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: ({ issues, style, includeSections }: {
      issues: JiraIssue[];
      style: "concise" | "detailed";
      includeSections?: string[];
    }) => releaseNotesApi.generate(issues, style, includeSections),
    onSuccess: (data, variables) => {
      toast({
        title: "Release Notes Generated",
        description: `${variables.style} format release notes have been generated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    const success = await utils.copyToClipboard(text);
    if (success) {
      toast({
        title: "Copied to Clipboard",
        description: "Release notes have been copied to clipboard.",
      });
    } else {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    generatedNotes: generateMutation.data,
    copyToClipboard,
  };
}

// Dashboard Hook
export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

// Templates Hook
export function useTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: epicTemplates, isLoading: isLoadingEpicTemplates } = useQuery<EpicTemplate[]>({
    queryKey: ['/api/templates/epic'],
    queryFn: templateApi.getEpicTemplates,
  });

  const { data: storyTemplates, isLoading: isLoadingStoryTemplates } = useQuery<StoryTemplate[]>({
    queryKey: ['/api/templates/story'],
    queryFn: templateApi.getStoryTemplates,
  });

  const createEpicTemplateMutation = useMutation({
    mutationFn: templateApi.createEpicTemplate,
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Epic template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/epic'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStoryTemplateMutation = useMutation({
    mutationFn: templateApi.createStoryTemplate,
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Story template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/story'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    epicTemplates,
    storyTemplates,
    isLoadingEpicTemplates,
    isLoadingStoryTemplates,
    createEpicTemplate: createEpicTemplateMutation.mutate,
    createStoryTemplate: createStoryTemplateMutation.mutate,
    isCreatingEpicTemplate: createEpicTemplateMutation.isPending,
    isCreatingStoryTemplate: createStoryTemplateMutation.isPending,
  };
}

// Utility Hooks
export function useJiraUtils() {
  return {
    formatIssueKey: utils.formatIssueKey,
    exportToCSV: utils.exportToCSV,
    copyToClipboard: utils.copyToClipboard,
    buildJQL: utils.buildJQL,
  };
}
