import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EpicTemplate, StoryTemplate } from "@shared/schema";

const epicFormSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  problem: z.string().min(1, "Problem statement is required"),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  scope: z.string().min(1, "Scope is required"),
  nonGoals: z.string().min(1, "Non-goals are required"),
  kpis: z.string().min(1, "KPIs are required"),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria is required"),
  labels: z.string().optional(),
});

const storyFormSchema = z.object({
  persona: z.string().min(1, "Persona is required"),
  capability: z.string().min(1, "Capability is required"),
  outcome: z.string().min(1, "Outcome is required"),
  description: z.string().min(1, "Description is required"),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria is required"),
  storyPoints: z.string().optional(),
  labels: z.string().optional(),
});

type EpicFormData = z.infer<typeof epicFormSchema>;
type StoryFormData = z.infer<typeof storyFormSchema>;

export default function Writer() {
  const [activeTab, setActiveTab] = useState("epic");
  
  const { data: epicTemplates } = useQuery<EpicTemplate[]>({
    queryKey: ['/api/templates/epic'],
  });

  const { data: storyTemplates } = useQuery<StoryTemplate[]>({
    queryKey: ['/api/templates/story'],
  });

  const epicForm = useForm<EpicFormData>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: {
      summary: "",
      problem: "",
      hypothesis: "",
      scope: "",
      nonGoals: "",
      kpis: "",
      acceptanceCriteria: "",
      labels: "",
    },
  });

  const storyForm = useForm<StoryFormData>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      persona: "",
      capability: "",
      outcome: "",
      description: "",
      acceptanceCriteria: "",
      storyPoints: "",
      labels: "",
    },
  });

  const onEpicSubmit = (data: EpicFormData) => {
    console.log("Epic data:", data);
    // TODO: Implement epic creation
  };

  const onStorySubmit = (data: StoryFormData) => {
    console.log("Story data:", data);
    // TODO: Implement story creation
  };

  const generateEpicPreview = (data: EpicFormData) => {
    return `# Problem
${data.problem}

# Hypothesis
${data.hypothesis}

# Scope
${data.scope}

# Non-Goals
${data.nonGoals}

# KPIs / Success
${data.kpis.split('\n').map(kpi => `- ${kpi.trim()}`).join('\n')}

# Acceptance Criteria
${data.acceptanceCriteria.split('\n').map(ac => `- ${ac.trim()}`).join('\n')}`;
  };

  const generateStoryPreview = (data: StoryFormData) => {
    const summary = `As a ${data.persona}, I want ${data.capability} so that ${data.outcome}`;
    return `**User Story**  
${summary}

**Description**
${data.description}

**Acceptance Criteria**  
${data.acceptanceCriteria.split('\n').map(ac => `- ${ac.trim()}`).join('\n')}

**Definition of Done**  
- Tests updated
- Docs updated
- Telemetry added`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">Epic & Story Writer</h1>
          <p className="text-sm text-muted-foreground">Create structured epics and stories for Jira</p>
        </div>
      </header>

      <main className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-writer">
            <TabsTrigger value="epic" data-testid="tab-epic">Epic Draft</TabsTrigger>
            <TabsTrigger value="story" data-testid="tab-story">Story Draft</TabsTrigger>
            <TabsTrigger value="bulk" data-testid="tab-bulk">Bulk Create</TabsTrigger>
          </TabsList>

          <TabsContent value="epic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Epic Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Epic</CardTitle>
                  <CardDescription>Define your epic with structured templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...epicForm}>
                    <form onSubmit={epicForm.handleSubmit(onEpicSubmit)} className="space-y-4">
                      <FormField
                        control={epicForm.control}
                        name="summary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Summary</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Epic title..." 
                                {...field} 
                                data-testid="input-epic-summary"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="problem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Problem Statement</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="What problem are we solving?" 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-problem"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="hypothesis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hypothesis</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="What do we believe will happen?" 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-hypothesis"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="scope"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scope</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="What is included in this epic?" 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-scope"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="nonGoals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Non-Goals</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="What are we explicitly NOT doing?" 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-nongoals"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="kpis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>KPIs & Success Metrics</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="One KPI per line..." 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-kpis"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="acceptanceCriteria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acceptance Criteria</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="One criterion per line..." 
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-epic-acceptance"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={epicForm.control}
                        name="labels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labels (optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="feature, ui, backend (comma-separated)" 
                                {...field}
                                data-testid="input-epic-labels"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" data-testid="button-create-epic">
                          Create Epic in Jira
                        </Button>
                        <Button type="button" variant="outline" data-testid="button-save-draft-epic">
                          Save Draft
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Epic Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How your epic will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {epicForm.watch("summary") || "Epic Summary"}
                      </h3>
                      {epicForm.watch("labels") && (
                        <div className="flex gap-1 mt-2">
                          {epicForm.watch("labels")?.split(',').map((label, i) => (
                            <Badge key={i} variant="outline">
                              {label.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-3 rounded">
                        {generateEpicPreview(epicForm.watch())}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="story" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Story Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create User Story</CardTitle>
                  <CardDescription>Structure your user story with proper format</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...storyForm}>
                    <form onSubmit={storyForm.handleSubmit(onStorySubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={storyForm.control}
                          name="persona"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Persona</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="user, admin, customer..." 
                                  {...field}
                                  data-testid="input-story-persona"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={storyForm.control}
                          name="capability"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capability</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="what they want to do..." 
                                  {...field}
                                  data-testid="input-story-capability"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={storyForm.control}
                          name="outcome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Outcome</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="so that..." 
                                  {...field}
                                  data-testid="input-story-outcome"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="p-3 bg-muted rounded text-sm">
                        <strong>Generated Story:</strong> As a {storyForm.watch("persona") || "[persona]"}, 
                        I want {storyForm.watch("capability") || "[capability]"} so that {storyForm.watch("outcome") || "[outcome]"}.
                      </div>

                      <FormField
                        control={storyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detailed description of the story..." 
                                className="min-h-[100px]"
                                {...field}
                                data-testid="textarea-story-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={storyForm.control}
                        name="acceptanceCriteria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acceptance Criteria</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Given [context], when [action], then [result]..." 
                                className="min-h-[120px]"
                                {...field}
                                data-testid="textarea-story-acceptance"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={storyForm.control}
                          name="storyPoints"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Story Points (optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1, 2, 3, 5, 8..." 
                                  {...field}
                                  data-testid="input-story-points"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={storyForm.control}
                          name="labels"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Labels (optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ui, api, bug (comma-separated)" 
                                  {...field}
                                  data-testid="input-story-labels"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" data-testid="button-create-story">
                          Create Story in Jira
                        </Button>
                        <Button type="button" variant="outline" data-testid="button-save-draft-story">
                          Save Draft
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Story Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How your story will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        As a {storyForm.watch("persona") || "[persona]"}, 
                        I want {storyForm.watch("capability") || "[capability]"} 
                        so that {storyForm.watch("outcome") || "[outcome]"}
                      </h3>
                      <div className="flex gap-2 mt-2">
                        {storyForm.watch("storyPoints") && (
                          <Badge variant="secondary">
                            {storyForm.watch("storyPoints")} points
                          </Badge>
                        )}
                        {storyForm.watch("labels") && (
                          storyForm.watch("labels")?.split(',').map((label, i) => (
                            <Badge key={i} variant="outline">
                              {label.trim()}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-3 rounded">
                        {generateStoryPreview(storyForm.watch())}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Create</CardTitle>
                <CardDescription>Create multiple stories at once</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <i className="fas fa-layer-group text-6xl text-muted-foreground/30 mb-4"></i>
                <h3 className="text-lg font-medium text-foreground mb-2">Bulk Creation</h3>
                <p className="text-muted-foreground mb-6">
                  Create multiple epics and stories from a structured input format.
                </p>
                <Button disabled data-testid="button-bulk-create">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
