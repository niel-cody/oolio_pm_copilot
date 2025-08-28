import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats } from "@shared/jira-types";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your product management workflow</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search issues..." 
              className="h-9 w-64 pl-10"
              data-testid="input-search"
            />
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
          </div>
          <Button variant="outline" size="icon" data-testid="button-notifications">
            <i className="fas fa-bell text-muted-foreground text-sm"></i>
          </Button>
        </div>
      </header>

      <main className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="card-ideas-to-groom">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ideas to Groom</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-ideas-count">
                      {stats?.ideasToGroom ?? 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-1/10 flex items-center justify-center">
                  <i className="fas fa-lightbulb text-chart-1"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-epics-created">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Epics Created</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-epics-count">
                      {stats?.epicsCreated ?? 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <i className="fas fa-layer-group text-chart-2"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stories-created">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stories Created</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stories-count">
                      {stats?.storiesCreated ?? 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <i className="fas fa-file-alt text-chart-3"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-writebacks">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Write-Backs</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-writebacks-count">
                      {stats?.pendingWriteBacks ?? 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <i className="fas fa-sync-alt text-chart-4"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ideas Queue Card */}
          <Card data-testid="card-ideas-queue">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ideas Queue</CardTitle>
                <Link href="/ideas">
                  <Button variant="ghost" size="sm" data-testid="button-view-all-ideas">
                    View All <i className="fas fa-arrow-right ml-1"></i>
                  </Button>
                </Link>
              </div>
              <CardDescription>Recent ideas waiting for grooming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-8 text-center">
                <div className="space-y-2">
                  <i className="fas fa-lightbulb text-4xl text-muted-foreground/50"></i>
                  <p className="text-muted-foreground">No ideas found</p>
                  <p className="text-sm text-muted-foreground">Configure Jira settings to load ideas</p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" data-testid="button-configure-jira">Configure Jira</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card data-testid="card-recent-activity">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-8 text-center">
                <div className="space-y-2">
                  <i className="fas fa-clock text-4xl text-muted-foreground/50"></i>
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground">Start grooming ideas to see activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Section */}
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/ideas">
                <Button variant="outline" className="h-auto p-4 justify-start text-left w-full" data-testid="button-groom-ideas">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <i className="fas fa-lightbulb text-primary"></i>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Groom Ideas</p>
                      <p className="text-sm text-muted-foreground">Transform ideas into epics</p>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/writer">
                <Button variant="outline" className="h-auto p-4 justify-start text-left w-full" data-testid="button-create-epic">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                      <i className="fas fa-edit text-chart-2"></i>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Create Epic</p>
                      <p className="text-sm text-muted-foreground">Start a new epic</p>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/versions">
                <Button variant="outline" className="h-auto p-4 justify-start text-left w-full" data-testid="button-release-notes">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <i className="fas fa-code-branch text-chart-3"></i>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Release Notes</p>
                      <p className="text-sm text-muted-foreground">Generate for version</p>
                    </div>
                  </div>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start text-left w-full"
                onClick={() => toast({ title: "Sync to Jira", description: "Configure Jira settings first" })}
                data-testid="button-sync-jira"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <i className="fas fa-sync-alt text-chart-4"></i>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sync to Jira</p>
                    <p className="text-sm text-muted-foreground">Push pending changes</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Version Status and AI Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card data-testid="card-version-status">
            <CardHeader>
              <CardTitle>Current Version Status</CardTitle>
              <CardDescription>Progress on active versions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center py-8 text-center">
                <div className="space-y-2">
                  <i className="fas fa-code-branch text-4xl text-muted-foreground/50"></i>
                  <p className="text-muted-foreground">No active versions</p>
                  <p className="text-sm text-muted-foreground">Connect to Jira to view version progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-assistant">
            <CardHeader>
              <CardTitle>AI Grooming Assistant</CardTitle>
              <CardDescription>AI-powered idea transformation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30 border border-border">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <i className="fas fa-robot text-primary-foreground text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {import.meta.env.VITE_OPENAI_API_KEY ? 'AI Assistant Active' : 'AI Assistant Disabled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {import.meta.env.VITE_OPENAI_API_KEY ? 'OpenAI integration enabled' : 'OpenAI API key required'}
                  </p>
                </div>
                <div className={`h-2 w-2 rounded-full ${import.meta.env.VITE_OPENAI_API_KEY ? 'bg-chart-2' : 'bg-muted-foreground'}`}></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ideas processed this week</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Epics generated</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stories auto-drafted</span>
                  <span className="text-sm font-medium text-foreground">0</span>
                </div>
              </div>

              <Link href="/settings">
                <Button className="w-full" data-testid="button-configure-ai">
                  Configure AI Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
