import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

interface JiraConfig {
  host: string;
  username: string;
  apiToken: string;
}

interface ToolInput {
  [key: string]: unknown;
}

class JiraClient {
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
    if (!config.host || !config.username || !config.apiToken) {
      throw new Error(
        "Missing required Jira config: host, username, and apiToken"
      );
    }
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.apiToken}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  private async fetchJira(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
    baseUrl: string = "/rest/api/3"
  ): Promise<Record<string, unknown>> {
    const url = `https://${this.config.host}${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    if (response.status === 204) return { success: true };
    return response.json() as Promise<Record<string, unknown>>;
  }

  private async fetchAgile(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.fetchJira(endpoint, method, body, "/rest/agile/1.0");
  }

  // --- Existing tools ---

  async getIssue(issueKey: string): Promise<Record<string, unknown>> {
    return this.fetchJira(`/issue/${issueKey}`);
  }

  async searchIssues(jql: string, maxResults: number = 20): Promise<Record<string, unknown>> {
    const params = new URLSearchParams({ jql, maxResults: maxResults.toString() });
    return this.fetchJira(`/search/jql?${params.toString()}`);
  }

  async createIssue(
    project: string,
    issueType: string,
    summary: string,
    description?: string,
    fields?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      fields: {
        project: { key: project },
        issuetype: { name: issueType },
        summary,
        ...fields,
      },
    };

    if (description) {
      body.fields = {
        ...(body.fields as Record<string, unknown>),
        description: {
          version: 1,
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
        },
      };
    }

    return this.fetchJira("/issue", "POST", body);
  }

  async addComment(issueKey: string, comment: string): Promise<Record<string, unknown>> {
    const body = {
      body: {
        version: 1,
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
      },
    };
    return this.fetchJira(`/issue/${issueKey}/comment`, "POST", body);
  }

  async transitionIssue(issueKey: string, transitionId: string, comment?: string): Promise<void> {
    const body: Record<string, unknown> = { transition: { id: transitionId } };
    if (comment) {
      body.update = {
        comment: [{
          add: {
            body: {
              version: 1,
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
            },
          },
        }],
      };
    }
    await this.fetchJira(`/issue/${issueKey}/transitions`, "POST", body);
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.fetchJira(`/issue/${issueKey}`, "PUT", { fields });
  }

  async getTransitions(issueKey: string): Promise<Record<string, unknown>> {
    return this.fetchJira(`/issue/${issueKey}/transitions`);
  }

  // --- New high-value tools ---

  async deleteIssue(issueKey: string): Promise<Record<string, unknown>> {
    return this.fetchJira(`/issue/${issueKey}`, "DELETE");
  }

  async batchCreateIssues(issues: Array<Record<string, unknown>>): Promise<Record<string, unknown>> {
    return this.fetchJira("/issue/bulk", "POST", { issueUpdates: issues });
  }

  async editComment(issueKey: string, commentId: string, comment: string): Promise<Record<string, unknown>> {
    const body = {
      body: {
        version: 1,
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
      },
    };
    return this.fetchJira(`/issue/${issueKey}/comment/${commentId}`, "PUT", body);
  }

  async addWorklog(issueKey: string, timeSpent: string, comment?: string): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { timeSpent };
    if (comment) {
      body.comment = {
        version: 1,
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
      };
    }
    return this.fetchJira(`/issue/${issueKey}/worklog`, "POST", body);
  }

  async getLinkTypes(): Promise<Record<string, unknown>> {
    return this.fetchJira("/issueLinkType");
  }

  async createIssueLink(
    linkType: string,
    inwardIssue: string,
    outwardIssue: string,
    comment?: string
  ): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    };
    if (comment) {
      body.comment = {
        body: {
          version: 1,
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
        },
      };
    }
    return this.fetchJira("/issueLink", "POST", body);
  }

  async getAllProjects(): Promise<Record<string, unknown>> {
    return this.fetchJira("/project?expand=description");
  }

  async getAgileBoards(projectKey?: string): Promise<Record<string, unknown>> {
    const params = projectKey ? `?projectKeyOrId=${projectKey}` : "";
    return this.fetchAgile(`/board${params}`);
  }

  async getBoardSprints(boardId: number, state?: string): Promise<Record<string, unknown>> {
    const params = state ? `?state=${state}` : "";
    return this.fetchAgile(`/board/${boardId}/sprint${params}`);
  }

  async getSprintIssues(sprintId: number): Promise<Record<string, unknown>> {
    return this.fetchAgile(`/sprint/${sprintId}/issue`);
  }
}

const tools = [
  {
    name: "get_issue",
    description: "Fetch a Jira issue by its key (e.g., PROJ-1234). Returns issue details including title, description, status, assignee, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The Jira issue key (e.g., PROJ-1234)" },
      },
      required: ["issue_key"],
    },
  },
  {
    name: "search_issues",
    description: "Search Jira issues using JQL (Jira Query Language). Examples: 'project = PROJ AND status = Open', 'assignee = currentUser() AND due <= now()'",
    inputSchema: {
      type: "object" as const,
      properties: {
        jql: { type: "string", description: "JQL query string" },
        max_results: { type: "number", description: "Maximum results to return (default: 20, max: 100)", default: 20 },
      },
      required: ["jql"],
    },
  },
  {
    name: "create_issue",
    description: "Create a new Jira issue. Returns the newly created issue key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project: { type: "string", description: "Project key (e.g., PROJ)" },
        issue_type: { type: "string", description: "Issue type (e.g., Bug, Task, Story, Subtask)" },
        summary: { type: "string", description: "Issue title/summary" },
        description: { type: "string", description: "Issue description (optional)" },
      },
      required: ["project", "issue_type", "summary"],
    },
  },
  {
    name: "batch_create_issues",
    description: "Create multiple Jira issues at once. Each issue requires project, issue_type, and summary.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issues: {
          type: "array",
          description: "Array of issues to create",
          items: {
            type: "object",
            properties: {
              project: { type: "string", description: "Project key" },
              issue_type: { type: "string", description: "Issue type" },
              summary: { type: "string", description: "Issue summary" },
              description: { type: "string", description: "Issue description (optional)" },
            },
            required: ["project", "issue_type", "summary"],
          },
        },
      },
      required: ["issues"],
    },
  },
  {
    name: "delete_issue",
    description: "Delete a Jira issue permanently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key to delete (e.g., PROJ-1234)" },
      },
      required: ["issue_key"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
        comment: { type: "string", description: "The comment text" },
      },
      required: ["issue_key", "comment"],
    },
  },
  {
    name: "edit_comment",
    description: "Edit an existing comment on a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
        comment_id: { type: "string", description: "The ID of the comment to edit" },
        comment: { type: "string", description: "The updated comment text" },
      },
      required: ["issue_key", "comment_id", "comment"],
    },
  },
  {
    name: "add_worklog",
    description: "Log time spent on a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
        time_spent: { type: "string", description: "Time spent (e.g., '2h', '30m', '1h 30m')" },
        comment: { type: "string", description: "Optional worklog comment" },
      },
      required: ["issue_key", "time_spent"],
    },
  },
  {
    name: "get_transitions",
    description: "Get available workflow transitions for an issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
      },
      required: ["issue_key"],
    },
  },
  {
    name: "transition_issue",
    description: "Move an issue to a new status. First call get_transitions to see available transitions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
        transition_id: { type: "string", description: "The transition ID from get_transitions" },
        comment: { type: "string", description: "Optional comment to add when transitioning" },
      },
      required: ["issue_key", "transition_id"],
    },
  },
  {
    name: "update_issue",
    description: "Update issue fields like priority, labels, or custom fields.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: { type: "string", description: "The issue key (e.g., PROJ-1234)" },
        fields: { type: "object", description: "Fields to update (e.g., {\"priority\": {\"name\": \"High\"}})" },
      },
      required: ["issue_key", "fields"],
    },
  },
  {
    name: "get_link_types",
    description: "Get all available issue link types (e.g., 'blocks', 'relates to', 'duplicates').",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_issue_link",
    description: "Link two Jira issues together. Use get_link_types to see available link types.",
    inputSchema: {
      type: "object" as const,
      properties: {
        link_type: { type: "string", description: "Link type name (e.g., 'blocks', 'relates to')" },
        inward_issue: { type: "string", description: "The inward issue key (e.g., PROJ-1234)" },
        outward_issue: { type: "string", description: "The outward issue key (e.g., PROJ-5678)" },
        comment: { type: "string", description: "Optional comment" },
      },
      required: ["link_type", "inward_issue", "outward_issue"],
    },
  },
  {
    name: "get_all_projects",
    description: "Get all Jira projects accessible to the current user.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_agile_boards",
    description: "Get agile boards, optionally filtered by project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_key: { type: "string", description: "Optional project key to filter boards" },
      },
      required: [],
    },
  },
  {
    name: "get_board_sprints",
    description: "Get sprints for a board, optionally filtered by state.",
    inputSchema: {
      type: "object" as const,
      properties: {
        board_id: { type: "number", description: "The board ID from get_agile_boards" },
        state: { type: "string", description: "Sprint state: active, future, or closed" },
      },
      required: ["board_id"],
    },
  },
  {
    name: "get_sprint_issues",
    description: "Get all issues in a specific sprint.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprint_id: { type: "number", description: "The sprint ID from get_board_sprints" },
      },
      required: ["sprint_id"],
    },
  },
];

async function main() {
  const jiraHost = process.env.JIRA_HOST;
  const jiraUsername = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraHost || !jiraUsername || !jiraToken) {
    console.error("Error: Missing required environment variables:");
    console.error("  - JIRA_HOST (e.g., your-org.atlassian.net)");
    console.error("  - JIRA_EMAIL (e.g., your@email.com)");
    console.error("  - JIRA_API_TOKEN (from https://id.atlassian.com/manage-profile/security/api-tokens)");
    process.exit(1);
  }

  const jiraClient = new JiraClient({
    host: jiraHost,
    username: jiraUsername,
    apiToken: jiraToken,
  });

  const server = new Server({
    name: "jira-mcp",
    version: "1.0.0",
  }, {
    capabilities: { tools: {} },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = request.params.arguments as ToolInput;

    try {
      let result: unknown;

      switch (request.params.name) {
        case "get_issue":
          result = await jiraClient.getIssue(input.issue_key as string);
          break;
        case "search_issues":
          result = await jiraClient.searchIssues(input.jql as string, (input.max_results as number) || 20);
          break;
        case "create_issue":
          result = await jiraClient.createIssue(
            input.project as string,
            input.issue_type as string,
            input.summary as string,
            input.description as string | undefined
          );
          break;
        case "batch_create_issues": {
          const issues = (input.issues as Array<Record<string, unknown>>).map((i) => ({
            fields: {
              project: { key: i.project },
              issuetype: { name: i.issue_type },
              summary: i.summary,
              ...(i.description ? {
                description: {
                  version: 1, type: "doc",
                  content: [{ type: "paragraph", content: [{ type: "text", text: i.description }] }],
                },
              } : {}),
            },
          }));
          result = await jiraClient.batchCreateIssues(issues);
          break;
        }
        case "delete_issue":
          await jiraClient.deleteIssue(input.issue_key as string);
          result = { success: true, message: `Issue ${input.issue_key} deleted` };
          break;
        case "add_comment":
          result = await jiraClient.addComment(input.issue_key as string, input.comment as string);
          break;
        case "edit_comment":
          result = await jiraClient.editComment(
            input.issue_key as string,
            input.comment_id as string,
            input.comment as string
          );
          break;
        case "add_worklog":
          result = await jiraClient.addWorklog(
            input.issue_key as string,
            input.time_spent as string,
            input.comment as string | undefined
          );
          break;
        case "get_transitions":
          result = await jiraClient.getTransitions(input.issue_key as string);
          break;
        case "transition_issue":
          await jiraClient.transitionIssue(
            input.issue_key as string,
            input.transition_id as string,
            input.comment as string | undefined
          );
          result = { success: true, message: `Issue ${input.issue_key} transitioned successfully` };
          break;
        case "update_issue":
          await jiraClient.updateIssue(input.issue_key as string, input.fields as Record<string, unknown>);
          result = { success: true, message: `Issue ${input.issue_key} updated successfully` };
          break;
        case "get_link_types":
          result = await jiraClient.getLinkTypes();
          break;
        case "create_issue_link":
          result = await jiraClient.createIssueLink(
            input.link_type as string,
            input.inward_issue as string,
            input.outward_issue as string,
            input.comment as string | undefined
          );
          break;
        case "get_all_projects":
          result = await jiraClient.getAllProjects();
          break;
        case "get_agile_boards":
          result = await jiraClient.getAgileBoards(input.project_key as string | undefined);
          break;
        case "get_board_sprints":
          result = await jiraClient.getBoardSprints(input.board_id as number, input.state as string | undefined);
          break;
        case "get_sprint_issues":
          result = await jiraClient.getSprintIssues(input.sprint_id as number);
          break;
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Jira MCP server connected and running...");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
