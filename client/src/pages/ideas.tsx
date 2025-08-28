import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JiraIssue, JiraProject } from "@shared/jira-types";
import IdeaDetailSheet from "@/components/idea-detail-sheet";

export default function Ideas() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<JiraIssue | null>(null);

  const { data: projects, isLoading: projectsLoading } = useQuery<JiraProject[]>({
    queryKey: ['/api/jira/projects'],
    enabled: false, // Only load when Jira is configured
  });

  const { data: ideas, isLoading: ideasLoading, error: ideasError } = useQuery<JiraIssue[]>({
    queryKey: ['/api/jira/ideas', selectedProject],
    enabled: !!selectedProject,
  });

  const filteredIdeas = ideas?.filter(idea => 
    idea.fields.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.fields.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">Ideas Queue</h1>
          <p className="text-sm text-muted-foreground">Transform ideas into structured epics and stories</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48" data-testid="select-project">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {projectsLoading ? (
                <div className="p-2">Loading projects...</div>
              ) : projects?.length ? (
                projects.map((project) => (
                  <SelectItem key={project.key} value={project.key}>
                    {project.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-muted-foreground">No projects available</div>
              )}
            </SelectContent>
          </Select>
          <Input 
            type="text" 
            placeholder="Search ideas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
            data-testid="input-search-ideas"
          />
        </div>
      </header>

      <main className="p-8">
        {!selectedProject ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Select a Project</CardTitle>
              <CardDescription>Choose a Jira project to view and groom ideas</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {projectsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-48 mx-auto" />
                  <p className="text-muted-foreground">Loading projects...</p>
                </div>
              ) : !projects?.length ? (
                <div className="space-y-4">
                  <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground/50"></i>
                  <div>
                    <p className="text-muted-foreground">No projects available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Make sure your Jira configuration is correct and you have access to projects.
                    </p>
                    <Button className="mt-4" onClick={() => window.location.href = '/settings'}>
                      Configure Jira Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Select a project from the dropdown above to start</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            {ideasError && (
              <Card className="mb-6 border-destructive">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-destructive"></i>
                    <p className="text-sm text-destructive">
                      Failed to load ideas. Please check your Jira configuration.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedProject} Ideas
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {ideasLoading ? 'Loading...' : `${filteredIdeas.length} ideas found`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!filteredIdeas.length} data-testid="button-bulk-groom">
                    <i className="fas fa-layer-group mr-2"></i>
                    Bulk Generate Epics
                  </Button>
                  <Button disabled={!filteredIdeas.length} data-testid="button-bulk-stories">
                    <i className="fas fa-file-alt mr-2"></i>
                    Bulk Generate Stories
                  </Button>
                </div>
              </div>
            </div>

            {ideasLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-8 w-8" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-1/2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredIdeas.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <i className="fas fa-lightbulb text-6xl text-muted-foreground/30 mb-4"></i>
                  <h3 className="text-lg font-medium text-foreground mb-2">No ideas found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No ideas match your search criteria.' : 'No ideas available for grooming in this project.'}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredIdeas.map((idea) => (
                  <Card 
                    key={idea.key} 
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedIdea(idea)}
                    data-testid={`card-idea-${idea.key}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-8 w-8 rounded-md bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-lightbulb text-chart-1 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {idea.key}: {idea.fields.summary}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {idea.fields.description || 'No description available'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {idea.fields.issuetype.name}
                            </Badge>
                            {idea.fields.labels?.map((label) => (
                              <Badge key={label} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedIdea && (
        <IdeaDetailSheet 
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => !open && setSelectedIdea(null)}
        />
      )}
    </div>
  );
}
