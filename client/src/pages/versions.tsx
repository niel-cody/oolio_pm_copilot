import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { JiraIssue, JiraProject, JiraVersion, ReleaseNotesData } from "@shared/jira-types";
import { apiRequest } from "@/lib/queryClient";

export default function Versions() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [additionalFilters, setAdditionalFilters] = useState("");
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseNotesStyle, setReleaseNotesStyle] = useState<"concise" | "detailed">("detailed");
  const [generatedNotes, setGeneratedNotes] = useState<ReleaseNotesData | null>(null);
  const { toast } = useToast();

  const { data: projects, isLoading: projectsLoading } = useQuery<JiraProject[]>({
    queryKey: ['/api/jira/projects'],
    enabled: false, // Only load when Jira is configured
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<JiraVersion[]>({
    queryKey: ['/api/jira/versions', selectedProject],
    enabled: !!selectedProject,
  });

  const { data: versionIssues, isLoading: issuesLoading, error: issuesError } = useQuery<JiraIssue[]>({
    queryKey: ['/api/jira/version-issues', selectedProject, selectedVersion, additionalFilters],
    enabled: !!selectedProject && !!selectedVersion,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/jira/version-issues', {
        projectKey: selectedProject,
        versionName: selectedVersion,
        jqlExtras: additionalFilters || undefined,
      });
      return response.json();
    },
  });

  const generateReleaseNotesMutation = useMutation({
    mutationFn: async () => {
      if (!versionIssues?.length) {
        throw new Error("No issues found for release notes generation");
      }

      const response = await apiRequest('POST', '/api/release-notes', {
        issues: versionIssues,
        style: releaseNotesStyle,
        includeSections: releaseNotesStyle === "detailed" ? ["what", "why", "highlights", "fixes", "limitations", "next"] : undefined,
      });
      return response.json();
    },
    onSuccess: (data: ReleaseNotesData) => {
      setGeneratedNotes(data);
      toast({
        title: "Release Notes Generated",
        description: `${releaseNotesStyle} format release notes have been generated.`,
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
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Release notes have been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const groupedIssues = versionIssues?.reduce((acc, issue) => {
    const type = issue.fields.issuetype.name;
    if (!acc[type]) acc[type] = [];
    acc[type].push(issue);
    return acc;
  }, {} as Record<string, JiraIssue[]>) || {};

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">Version Explorer</h1>
          <p className="text-sm text-muted-foreground">Search issues by version and generate release notes</p>
        </div>
      </header>

      <main className="p-8 space-y-8">
        {/* Filters Section */}
        <Card data-testid="card-filters">
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Select project and version to explore issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger data-testid="select-project">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsLoading ? (
                      <div className="p-2">Loading projects...</div>
                    ) : projects?.length ? (
                      projects.map((project) => (
                        <SelectItem key={project.key} value={project.key}>
                          {project.name} ({project.key})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-muted-foreground">No projects available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Version</label>
                <Select value={selectedVersion} onValueChange={setSelectedVersion} disabled={!selectedProject}>
                  <SelectTrigger data-testid="select-version">
                    <SelectValue placeholder="Select version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {versionsLoading ? (
                      <div className="p-2">Loading versions...</div>
                    ) : versions?.length ? (
                      versions.map((version) => (
                        <SelectItem key={version.id} value={version.name}>
                          {version.name} {version.released ? "(Released)" : "(Unreleased)"}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-muted-foreground">No versions available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Additional Filters</label>
                <Input
                  placeholder="e.g., component = Frontend"
                  value={additionalFilters}
                  onChange={(e) => setAdditionalFilters(e.target.value)}
                  data-testid="input-additional-filters"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={!versionIssues?.length} 
                    data-testid="button-generate-release-notes"
                  >
                    <i className="fas fa-file-alt mr-2"></i>
                    Generate Release Notes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Release Notes - {selectedVersion}</DialogTitle>
                    <DialogDescription>
                      Generated from {versionIssues?.length} issues in {selectedProject}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Format:</label>
                      <Tabs value={releaseNotesStyle} onValueChange={(value) => setReleaseNotesStyle(value as "concise" | "detailed")}>
                        <TabsList>
                          <TabsTrigger value="concise" data-testid="tab-concise">Concise</TabsTrigger>
                          <TabsTrigger value="detailed" data-testid="tab-detailed">Detailed</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Button 
                        onClick={() => generateReleaseNotesMutation.mutate()}
                        disabled={generateReleaseNotesMutation.isPending}
                        data-testid="button-generate-notes"
                      >
                        {generateReleaseNotesMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Generating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-magic mr-2"></i>
                            Generate
                          </>
                        )}
                      </Button>
                    </div>

                    {generatedNotes && (
                      <div className="space-y-4">
                        <div className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 border-b">
                            <h4 className="font-medium">Generated Release Notes</h4>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => copyToClipboard(generatedNotes.markdown)}
                                data-testid="button-copy-markdown"
                              >
                                <i className="fas fa-copy mr-2"></i>
                                Copy Markdown
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => copyToClipboard(generatedNotes.text)}
                                data-testid="button-copy-text"
                              >
                                <i className="fas fa-copy mr-2"></i>
                                Copy Text
                              </Button>
                            </div>
                          </div>
                          <Textarea 
                            value={generatedNotes.markdown}
                            readOnly
                            className="min-h-[300px] font-mono text-sm"
                            data-testid="textarea-release-notes"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline"
                disabled={!versionIssues?.length}
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," + 
                    "Key,Summary,Type,Status,Assignee\n" +
                    versionIssues?.map(issue => 
                      `${issue.key},"${issue.fields.summary}",${issue.fields.issuetype.name},${issue.fields.status?.name || 'N/A'},${issue.fields.assignee?.displayName || 'Unassigned'}`
                    ).join('\n') || '';
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `${selectedProject}-${selectedVersion}-issues.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                data-testid="button-export-csv"
              >
                <i className="fas fa-download mr-2"></i>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {!selectedProject || !selectedVersion ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-code-branch text-6xl text-muted-foreground/30 mb-4"></i>
              <h3 className="text-lg font-medium text-foreground mb-2">Select Project and Version</h3>
              <p className="text-muted-foreground">
                Choose a project and version to explore issues and generate release notes.
              </p>
            </CardContent>
          </Card>
        ) : issuesError ? (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-destructive"></i>
                <p className="text-sm text-destructive">
                  Failed to load version issues. Please check your filters and Jira configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card data-testid="card-total-issues">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                      {issuesLoading ? (
                        <Skeleton className="h-6 w-12 mt-1" />
                      ) : (
                        <p className="text-xl font-bold text-foreground">{versionIssues?.length || 0}</p>
                      )}
                    </div>
                    <i className="fas fa-list text-chart-1"></i>
                  </div>
                </CardContent>
              </Card>

              {Object.entries(groupedIssues).slice(0, 3).map(([type, issues]) => (
                <Card key={type} data-testid={`card-${type.toLowerCase()}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{type}s</p>
                        <p className="text-xl font-bold text-foreground">{issues.length}</p>
                      </div>
                      <i className={`fas ${type === 'Epic' ? 'fa-layer-group' : type === 'Bug' ? 'fa-bug' : 'fa-file-alt'} text-chart-2`}></i>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Issues Table */}
            <Card data-testid="card-issues-table">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Issues in {selectedVersion}</CardTitle>
                    <CardDescription>
                      {issuesLoading ? 'Loading...' : `${versionIssues?.length || 0} issues found`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {Object.keys(groupedIssues).map((type) => (
                      <Badge key={type} variant="outline">
                        {type}: {groupedIssues[type].length}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : versionIssues?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versionIssues.map((issue) => (
                        <TableRow key={issue.key} data-testid={`row-issue-${issue.key}`}>
                          <TableCell className="font-medium">{issue.key}</TableCell>
                          <TableCell className="max-w-md truncate">{issue.fields.summary}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{issue.fields.issuetype.name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{issue.fields.status?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{issue.fields.assignee?.displayName || 'Unassigned'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-search text-4xl text-muted-foreground/50 mb-4"></i>
                    <h3 className="text-lg font-medium text-foreground mb-2">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      No issues found for the selected version and filters.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
