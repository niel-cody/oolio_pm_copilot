import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { JiraIssue, GroomedEpic, GroomedStory } from "@shared/jira-types";
import { apiRequest } from "@/lib/queryClient";

interface IdeaDetailSheetProps {
  idea: JiraIssue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IdeaDetailSheet({ idea, open, onOpenChange }: IdeaDetailSheetProps) {
  const [isGrooming, setIsGrooming] = useState(false);
  const [groomedEpic, setGroomedEpic] = useState<GroomedEpic | null>(null);
  const [groomedStories, setGroomedStories] = useState<GroomedStory[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const groomToEpicMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/groom/epic', {
        ideaText: idea.fields.description || '',
        ideaSummary: idea.fields.summary,
        type: 'epic'
      });
      return response.json();
    },
    onSuccess: (data: GroomedEpic) => {
      setGroomedEpic(data);
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
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/groom/story', {
        ideaText: idea.fields.description || '',
        ideaSummary: idea.fields.summary,
        type: 'story'
      });
      return response.json();
    },
    onSuccess: (data: GroomedStory[]) => {
      setGroomedStories(data);
      toast({
        title: "Stories Generated",
        description: `AI has generated ${data.length} stories from the idea.`,
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

  const createEpicMutation = useMutation({
    mutationFn: async (epicData: GroomedEpic) => {
      const response = await apiRequest('POST', '/api/jira/create-issue', {
        fields: {
          project: { key: idea.fields.project.key },
          issuetype: { name: 'Epic' },
          summary: epicData.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: epicData.description }],
              },
            ],
          },
          labels: epicData.labels || [],
        }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Epic Created",
        description: "Epic has been successfully created in Jira.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasAI = !!import.meta.env.VITE_OPENAI_API_KEY;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]" data-testid="sheet-idea-detail">
        <SheetHeader>
          <SheetTitle data-testid="text-idea-title">
            {idea.key}: {idea.fields.summary}
          </SheetTitle>
          <SheetDescription>
            {idea.fields.issuetype.name} • Created {new Date(idea.fields.created || '').toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto h-[calc(100vh-120px)]">
          {/* Idea Details */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Description</h3>
            <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
              {idea.fields.description || 'No description available.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Labels</h3>
              <div className="space-y-2">
                {idea.fields.labels?.map((label) => (
                  <Badge key={label} variant="outline">{label}</Badge>
                )) || <span className="text-sm text-muted-foreground">No labels</span>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Reporter</h3>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {idea.fields.reporter?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm text-foreground">
                  {idea.fields.reporter?.displayName || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Grooming Section */}
          {hasAI && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <i className="fas fa-robot text-primary"></i>
                  <h3 className="text-sm font-medium text-foreground">AI Grooming Assistant</h3>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-between"
                    variant="outline"
                    onClick={() => groomToEpicMutation.mutate()}
                    disabled={groomToEpicMutation.isPending}
                    data-testid="button-generate-epic"
                  >
                    <div className="text-left">
                      <p className="font-medium">Generate Epic</p>
                      <p className="text-xs text-muted-foreground">Transform into structured epic with templates</p>
                    </div>
                    {groomToEpicMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-arrow-right"></i>
                    )}
                  </Button>
                  
                  <Button 
                    className="w-full justify-between"
                    variant="outline"
                    onClick={() => groomToStoriesMutation.mutate()}
                    disabled={groomToStoriesMutation.isPending}
                    data-testid="button-generate-stories"
                  >
                    <div className="text-left">
                      <p className="font-medium">Generate Stories</p>
                      <p className="text-xs text-muted-foreground">Break down into user stories with acceptance criteria</p>
                    </div>
                    {groomToStoriesMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-arrow-right"></i>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Groomed Epic Display */}
          {groomedEpic && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Generated Epic</h3>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{groomedEpic.summary}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{groomedEpic.description}</p>
                  </div>
                  
                  {groomedEpic.problem && (
                    <div>
                      <h5 className="text-sm font-medium text-foreground">Problem</h5>
                      <p className="text-sm text-muted-foreground">{groomedEpic.problem}</p>
                    </div>
                  )}

                  {groomedEpic.acceptanceCriteria.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-foreground">Acceptance Criteria</h5>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {groomedEpic.acceptanceCriteria.map((criteria, i) => (
                          <li key={i}>{criteria}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button 
                    onClick={() => createEpicMutation.mutate(groomedEpic)}
                    disabled={createEpicMutation.isPending}
                    className="w-full"
                    data-testid="button-create-epic-in-jira"
                  >
                    {createEpicMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Creating Epic...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus mr-2"></i>
                        Create Epic in Jira
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Groomed Stories Display */}
          {groomedStories.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Generated Stories</h3>
                <div className="space-y-4">
                  {groomedStories.map((story, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium text-foreground">{story.summary}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{story.description}</p>
                      
                      {story.acceptanceCriteria.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-sm font-medium text-foreground">Acceptance Criteria</h5>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {story.acceptanceCriteria.map((criteria, i) => (
                              <li key={i}>{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {story.storyPoints && (
                        <div className="mt-2">
                          <Badge variant="outline">{story.storyPoints} points</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    className="w-full"
                    disabled
                    data-testid="button-create-stories-in-jira"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Create Stories in Jira (Coming Soon)
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Manual Actions */}
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Manual Actions</h3>
            <div className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Manual Epic Creation",
                    description: "Navigate to Epic & Story Writer to create manually.",
                  });
                  onOpenChange(false);
                }}
                data-testid="button-manual-create-epic"
              >
                Create Epic from Idea
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Manual Story Creation", 
                    description: "Navigate to Epic & Story Writer to create manually.",
                  });
                  onOpenChange(false);
                }}
                data-testid="button-manual-mark-story"
              >
                Mark as Story
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
