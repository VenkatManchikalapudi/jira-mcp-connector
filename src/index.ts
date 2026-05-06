import {
  Server,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/server/index.js";
import {
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
    // Validate config
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
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `https://${this.config.host}/rest/api/3${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Jira API error (${response.status}): ${error}`
      );
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async getIssue(issueKey: string): Promise<Record<string, unknown>> {
    return this.fetchJira(`/issue/${issueKey}`);
  }

  async searchIssues(
    jql: string,
    maxResults: number = 20
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams({
      jql,
      maxResults: maxResults.toString(),
    });
    return this.fetchJira(`/search?${params.toString()}`);
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
        ...body.fields,
        description: {
          version: 1,
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description }],
            },
          ],
        },
      };
    }

    return this.fetchJira("/issue", "POST", body);
  }

  async addComment(
    issueKey: string,
    comment: string
  ): Promise<Record<string, unknown>> {
    const body = {
      body: {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: comment }],
          },
        ],
      },
    };
    return this.fetchJira(`/issue/${issueKey}/comment`, "POST", body);
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string
  ): Promise<void> {
    const body: Record<string, unknown> = {
      transition: { id: transitionId },
    };

    if (comment) {
      body.update = {
        comment: [
          {
            add: {
              body: {
                version: 1,
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: comment }],
                  },
                ],
              },
            },
          },
        ],
      };
    }

    await this.fetchJira(`/issue/${issueKey}/transitions`, "POST", body);
  }

  async updateIssue(
    issueKey: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    const body = { fields };
    await this.fetchJira(`/issue/${issueKey}`, "PUT", body);
  }

  async getTransitions(issueKey: string): Promise<Record<string, unknown>> {
    return this.fetchJira(`/issue/${issueKey}/transitions`);
  }
}

const tools = [
  {
    name: "get_issue",
    description:
      "Fetch a Jira issue by its key (e.g., SPR-1234). Returns issue details including title, description, status, assignee, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: {
          type: "string",
          description: "The Jira issue key (e.g., SPR-1234)",
        },
      },
      required: ["issue_key"],
    },
  },
  {
    name: "search_issues",
    description:
      "Search Jira issues using JQL (Jira Query Language). Examples: 'project = SPR AND status = Open', 'assignee = currentUser() AND due <= now()'",
    inputSchema: {
      type: "object" as const,
      properties: {
        jql: {
          type: "string",
          description:
            "JQL query string (e.g., 'project = SPR AND assignee = currentUser()')",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default: 20, max: 100)",
          default: 20,
        },
      },
      required: ["jql"],
    },
  },
  {
    name: "create_issue",
    description:
      "Create a new Jira issue in a project. Returns the newly created issue key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project: {
          type: "string",
          description: "Project key (e.g., SPR)",
        },
        issue_type: {
          type: "string",
          description: "Issue type (e.g., Bug, Task, Story, Subtask)",
        },
        summary: {
          type: "string",
          description: "Issue title/summary",
        },
        description: {
          type: "string",
          description: "Issue description (optional)",
        },
      },
      required: ["project", "issue_type", "summary"],
    },
  },
  {
    name: "add_comment",
    description:
      "Add a comment to a Jira issue. Use this to provide updates, responses, or resolutions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: {
          type: "string",
          description: "The issue key to comment on (e.g., SPR-1234)",
        },
        comment: {
          type: "string",
          description: "The comment text",
        },
      },
      required: ["issue_key", "comment"],
    },
  },
  {
    name: "get_transitions",
    description:
      "Get available workflow transitions for an issue. Returns a list of possible statuses you can move the issue to.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: {
          type: "string",
          description: "The issue key (e.g., SPR-1234)",
        },
      },
      required: ["issue_key"],
    },
  },
  {
    name: "transition_issue",
    description:
      "Move an issue to a new status. First call get_transitions to see available transitions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: {
          type: "string",
          description: "The issue key (e.g., SPR-1234)",
        },
        transition_id: {
          type: "string",
          description:
            "The transition ID from get_transitions (e.g., '11' for 'In Progress')",
        },
        comment: {
          type: "string",
          description: "Optional comment to add when transitioning",
        },
      },
      required: ["issue_key", "transition_id"],
    },
  },
  {
    name: "update_issue",
    description:
      "Update issue fields like priority, labels, or custom fields.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issue_key: {
          type: "string",
          description: "The issue key (e.g., SPR-1234)",
        },
        fields: {
          type: "object",
          description:
            "Fields to update (e.g., {\"priority\": {\"name\": \"High\"}, \"labels\": [\"urgent\"]})",
        },
      },
      required: ["issue_key", "fields"],
    },
  },
];

async function main() {
  const jiraHost = process.env.JIRA_HOST;
  const jiraUsername = process.env.JIRA_USERNAME;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraHost || !jiraUsername || !jiraToken) {
    console.error(
      "Error: Missing required environment variables:"
    );
    console.error("  - JIRA_HOST (e.g., net32inc.atlassian.net)");
    console.error("  - JIRA_USERNAME (e.g., your@email.com)");
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
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input = request.params.arguments as ToolInput;

    try {
      let result: unknown;

      switch (request.params.name) {
        case "get_issue": {
          const issueKey = input.issue_key as string;
          result = await jiraClient.getIssue(issueKey);
          break;
        }
        case "search_issues": {
          const jql = input.jql as string;
          const maxResults = (input.max_results as number) || 20;
          result = await jiraClient.searchIssues(jql, maxResults);
          break;
        }
        case "create_issue": {
          const project = input.project as string;
          const issueType = input.issue_type as string;
          const summary = input.summary as string;
          const description = input.description as string | undefined;
          result = await jiraClient.createIssue(
            project,
            issueType,
            summary,
            description
          );
          break;
        }
        case "add_comment": {
          const issueKey = input.issue_key as string;
          const comment = input.comment as string;
          result = await jiraClient.addComment(issueKey, comment);
          break;
        }
        case "get_transitions": {
          const issueKey = input.issue_key as string;
          result = await jiraClient.getTransitions(issueKey);
          break;
        }
        case "transition_issue": {
          const issueKey = input.issue_key as string;
          const transitionId = input.transition_id as string;
          const comment = input.comment as string | undefined;
          await jiraClient.transitionIssue(issueKey, transitionId, comment);
          result = {
            success: true,
            message: `Issue ${issueKey} transitioned successfully`,
          };
          break;
        }
        case "update_issue": {
          const issueKey = input.issue_key as string;
          const fields = input.fields as Record<string, unknown>;
          await jiraClient.updateIssue(issueKey, fields);
          result = {
            success: true,
            message: `Issue ${issueKey} updated successfully`,
          };
          break;
        }
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${errorMessage}`,
          },
        ],
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
