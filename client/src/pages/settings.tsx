import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertEpicTemplateSchema, insertStoryTemplateSchema, type EpicTemplate, type StoryTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const epicTemplateFormSchema = insertEpicTemplateSchema.omit({ userId: true, isDefault: true });
const storyTemplateFormSchema = insertStoryTemplateSchema.omit({ userId: true, isDefault: true });

type EpicTemplateFormData = z.infer<typeof epicTemplateFormSchema>;
type StoryTemplateFormData = z.infer<typeof storyTemplateFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: epicTemplates } = useQuery<EpicTemplate[]>({
    queryKey: ['/api/templates/epic'],
  });

  const { data: storyTemplates } = useQuery<StoryTemplate[]>({
    queryKey: ['/api/templates/story'],
  });

  // Forms

  const epicTemplateForm = useForm<EpicTemplateFormData>({
    resolver: zodResolver(epicTemplateFormSchema),
    defaultValues: {
      name: "",
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
    },
  });

  const storyTemplateForm = useForm<StoryTemplateFormData>({
    resolver: zodResolver(storyTemplateFormSchema),
    defaultValues: {
      name: "",
      template: `**User Story**  
As a {persona}, I want {capability} so that {outcome}.

**Acceptance Criteria**  
- Given {context}, when {action}, then {result}.
- Given {context2}, when {action2}, then {result2}.

**DoD**  
- Tests updated
- Docs updated
- Telemetry added`,
    },
  });

  // Mutations

  const createEpicTemplateMutation = useMutation({
    mutationFn: async (data: EpicTemplateFormData) => {
      const response = await apiRequest('POST', '/api/templates/epic', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Epic template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/epic'] });
      epicTemplateForm.reset();
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
    mutationFn: async (data: StoryTemplateFormData) => {
      const response = await apiRequest('POST', '/api/templates/story', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Story template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates/story'] });
      storyTemplateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const onEpicTemplateSubmit = (data: EpicTemplateFormData) => {
    createEpicTemplateMutation.mutate(data);
  };

  const onStoryTemplateSubmit = (data: StoryTemplateFormData) => {
    createStoryTemplateMutation.mutate(data);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure Jira integration and templates</p>
        </div>
      </header>

      <main className="p-8">
        <Tabs defaultValue="jira" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-settings">
            <TabsTrigger value="jira" data-testid="tab-jira">Jira Config</TabsTrigger>
            <TabsTrigger value="epic-templates" data-testid="tab-epic-templates">Epic Templates</TabsTrigger>
            <TabsTrigger value="story-templates" data-testid="tab-story-templates">Story Templates</TabsTrigger>
            <TabsTrigger value="ai" data-testid="tab-ai">AI Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="jira" className="space-y-6">
            <Card data-testid="card-jira-config">
              <CardHeader>
                <CardTitle>Jira Configuration</CardTitle>
                <CardDescription>
                  Jira configuration is managed through environment variables for security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30 border border-border">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <i className="fas fa-cog text-primary-foreground text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Environment Configuration</p>
                      <p className="text-xs text-muted-foreground">
                        Configuration is now managed via server environment variables
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <i className="fas fa-info-circle"></i>
                    <AlertDescription>
                      Set the following environment variables in your Replit Secrets or server:
                      <br />• JIRA_BASE_URL (e.g., https://your-domain.atlassian.net)
                      <br />• JIRA_EMAIL (your Atlassian email address)
                      <br />• JIRA_API_TOKEN (from Account Settings → Security → API tokens)
                      <br />• JIRA_IS_CLOUD=true (for Jira Cloud instances)
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-project-sync">
              <CardHeader>
                <CardTitle>Project Synchronization</CardTitle>
                <CardDescription>Sync your Jira projects to the local database for better performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30 border border-border">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <i className="fas fa-database text-primary-foreground text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Local Project Storage</p>
                      <p className="text-xs text-muted-foreground">
                        Store project information locally for faster loading and better performance
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sync your Jira projects to improve app performance and enable features like faster project selection, offline access, and better caching.
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/jira/projects');
                          const projects = await response.json();
                          console.log('Direct Jira projects:', projects);
                          alert(`Found ${projects.length} projects directly from Jira:\n${projects.map((p: any) => `${p.key}: ${p.name}`).slice(0, 5).join('\n')}`);
                        } catch (error) {
                          console.error('Jira test failed:', error);
                          alert('Failed to fetch projects from Jira. Check console for details.');
                        }
                      }}
                      variant="outline"
                      data-testid="button-test-jira"
                    >
                      <i className="fas fa-plug mr-2"></i>
                      Test Jira Connection
                    </Button>
                    
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/projects/sync', { method: 'POST' });
                          const data = await response.json();
                          console.log('Projects synced:', data);
                          alert(`${data.message || 'Projects synced successfully!'}\nJira returned: ${data.jiraProjectCount || 'unknown'} projects`);
                        } catch (error) {
                          console.error('Sync failed:', error);
                          alert('Failed to sync projects. Please check your Jira configuration.');
                        }
                      }}
                      data-testid="button-sync-projects"
                    >
                      <i className="fas fa-sync mr-2"></i>
                      Sync Projects
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/projects');
                          const projects = await response.json();
                          console.log('Stored projects:', projects);
                          alert(`Found ${projects.length} projects in local database${projects.length > 0 ? ':\n' + projects.map((p: any) => `${p.key}: ${p.name}`).slice(0, 5).join('\n') : ''}`);
                        } catch (error) {
                          console.error('Failed to fetch projects:', error);
                          alert('Failed to fetch stored projects');
                        }
                      }}
                      data-testid="button-view-stored-projects"
                    >
                      <i className="fas fa-eye mr-2"></i>
                      View Stored
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="epic-templates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Epic Template */}
              <Card data-testid="card-create-epic-template">
                <CardHeader>
                  <CardTitle>Create Epic Template</CardTitle>
                  <CardDescription>Define custom templates for epic creation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...epicTemplateForm}>
                    <form onSubmit={epicTemplateForm.handleSubmit(onEpicTemplateSubmit)} className="space-y-4">
                      <FormField
                        control={epicTemplateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="My Custom Epic Template" 
                                {...field}
                                data-testid="input-epic-template-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicTemplateForm.control}
                        name="template"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Epic template markdown..." 
                                className="min-h-[300px] font-mono text-sm"
                                {...field}
                                data-testid="textarea-epic-template"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit"
                        disabled={createEpicTemplateMutation.isPending}
                        data-testid="button-create-epic-template"
                      >
                        {createEpicTemplateMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Creating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plus mr-2"></i>
                            Create Template
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Existing Epic Templates */}
              <Card data-testid="card-epic-templates-list">
                <CardHeader>
                  <CardTitle>Existing Epic Templates</CardTitle>
                  <CardDescription>Manage your epic templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {epicTemplates?.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          <div className="flex items-center gap-2">
                            {template.isDefault === 1 && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <Button variant="ghost" size="sm" disabled>
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="story-templates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Story Template */}
              <Card data-testid="card-create-story-template">
                <CardHeader>
                  <CardTitle>Create Story Template</CardTitle>
                  <CardDescription>Define custom templates for story creation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...storyTemplateForm}>
                    <form onSubmit={storyTemplateForm.handleSubmit(onStoryTemplateSubmit)} className="space-y-4">
                      <FormField
                        control={storyTemplateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="My Custom Story Template" 
                                {...field}
                                data-testid="input-story-template-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={storyTemplateForm.control}
                        name="template"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Story template markdown..." 
                                className="min-h-[300px] font-mono text-sm"
                                {...field}
                                data-testid="textarea-story-template"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit"
                        disabled={createStoryTemplateMutation.isPending}
                        data-testid="button-create-story-template"
                      >
                        {createStoryTemplateMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Creating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plus mr-2"></i>
                            Create Template
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Existing Story Templates */}
              <Card data-testid="card-story-templates-list">
                <CardHeader>
                  <CardTitle>Existing Story Templates</CardTitle>
                  <CardDescription>Manage your story templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {storyTemplates?.map((template) => (
                      <div key={template.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          <div className="flex items-center gap-2">
                            {template.isDefault === 1 && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <Button variant="ghost" size="sm" disabled>
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card data-testid="card-ai-settings">
              <CardHeader>
                <CardTitle>AI Assistant Settings</CardTitle>
                <CardDescription>Configure OpenAI integration for idea grooming</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30 border border-border">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <i className="fas fa-robot text-primary-foreground text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      AI Assistant Status
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {import.meta.env.VITE_OPENAI_API_KEY ? (
                        "OpenAI integration is enabled and ready"
                      ) : (
                        "OpenAI API key required for AI features"
                      )}
                    </p>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${
                    import.meta.env.VITE_OPENAI_API_KEY ? 'bg-chart-2' : 'bg-muted-foreground'
                  }`}></div>
                </div>

                <Alert>
                  <i className="fas fa-info-circle"></i>
                  <AlertDescription>
                    The AI assistant uses OpenAI's GPT-5 model to help transform ideas into structured epics and stories. 
                    Configure the OPENAI_API_KEY environment variable to enable AI features.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">AI Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-layer-group text-chart-1"></i>
                        <h5 className="font-medium text-foreground">Epic Generation</h5>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Transform ideas into structured epics with problem statements, hypotheses, and acceptance criteria.
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-file-alt text-chart-2"></i>
                        <h5 className="font-medium text-foreground">Story Generation</h5>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Break down ideas into user stories with proper personas, capabilities, and acceptance criteria.
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-notes-medical text-chart-3"></i>
                        <h5 className="font-medium text-foreground">Release Notes</h5>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Generate professional release notes from version issues in both concise and detailed formats.
                      </p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-magic text-chart-4"></i>
                        <h5 className="font-medium text-foreground">Smart Templates</h5>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI-powered suggestions for improving epic and story templates based on best practices.
                      </p>
                    </div>
                  </div>
                </div>

                <Button variant="outline" disabled data-testid="button-configure-ai-model">
                  <i className="fas fa-cog mr-2"></i>
                  Advanced AI Settings (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
