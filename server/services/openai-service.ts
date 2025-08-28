import OpenAI from "openai";
import { GroomedEpic, GroomedStory, GroomingRequest } from "@shared/jira-types";

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async groomToEpic(request: GroomingRequest): Promise<GroomedEpic> {
    const prompt = `You are a product management expert. Transform this idea into a well-structured epic using the following format. Respond with JSON only.

Idea Summary: ${request.ideaSummary}
Idea Description: ${request.ideaText}

Please provide a JSON response with this exact structure:
{
  "summary": "Epic title (should be concise and actionable)",
  "description": "Detailed description in markdown format",
  "problem": "What problem are we solving?",
  "hypothesis": "What do we believe will happen?",
  "scope": "What is included in this epic?",
  "nonGoals": "What are we explicitly NOT doing?",
  "kpis": ["KPI 1", "KPI 2", "KPI 3"],
  "acceptanceCriteria": ["AC 1", "AC 2", "AC 3"],
  "labels": ["label1", "label2"],
  "components": ["component1", "component2"]
}`;

    try {
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert product manager who transforms ideas into well-structured epics. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content) as GroomedEpic;
    } catch (error) {
      console.error("Error grooming idea to epic:", error);
      throw new Error(`Failed to groom idea to epic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async groomToStories(request: GroomingRequest): Promise<GroomedStory[]> {
    const prompt = `You are a product management expert. Break down this idea into 2-4 user stories with proper acceptance criteria. Respond with JSON only.

Idea Summary: ${request.ideaSummary}
Idea Description: ${request.ideaText}

Please provide a JSON response with this exact structure:
{
  "stories": [
    {
      "summary": "As a [persona], I want [capability] so that [outcome]",
      "description": "Detailed story description in markdown",
      "persona": "user type",
      "capability": "what they want to do",
      "outcome": "why they want to do it",
      "acceptanceCriteria": [
        "Given [context], when [action], then [result]",
        "Given [context2], when [action2], then [result2]"
      ],
      "storyPoints": 3,
      "labels": ["label1", "label2"],
      "components": ["component1"]
    }
  ]
}`;

    try {
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert product manager who breaks down ideas into user stories. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const result = JSON.parse(content);
      return result.stories as GroomedStory[];
    } catch (error) {
      console.error("Error grooming idea to stories:", error);
      throw new Error(`Failed to groom idea to stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateReleaseNotes(issues: any[], style: "concise" | "detailed"): Promise<{ markdown: string; text: string }> {
    const issuesSummary = issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      type: issue.fields.issuetype.name,
      status: issue.fields.status?.name
    }));

    const template = style === "detailed" ? `
📦 What
{what}

🎯 Why
{why}

🚀 Highlights
{highlights_list}

🐞 Fixes
{fixes_list}

⚠️ Known Limitations
{limits_list}

🔭 What's Next
{next_list}
` : `
Brief summary of key changes and improvements in this release (≤280 characters).
`;

    const prompt = `Generate release notes for these Jira issues using the ${style} format. Issues: ${JSON.stringify(issuesSummary)}

${style === "detailed" ? "Use the detailed template with all sections." : "Create a concise summary under 280 characters."}

Respond with JSON in this format:
{
  "markdown": "formatted markdown content",
  "text": "plain text version"
}`;

    try {
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system", 
            content: "You are a technical writer who creates clear, professional release notes. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Error generating release notes:", error);
      throw new Error(`Failed to generate release notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
