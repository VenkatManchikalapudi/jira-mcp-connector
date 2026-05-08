import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
class JiraClient {
    constructor(config) {
        this.config = config;
        // Validate config
        if (!config.host || !config.username || !config.apiToken) {
            throw new Error("Missing required Jira config: host, username, and apiToken");
        }
    }
    getAuthHeader() {
        const credentials = `${this.config.username}:${this.config.apiToken}`;
        return `Basic ${Buffer.from(credentials).toString("base64")}`;
    }
    async fetchJira(endpoint, method = "GET", body) {
        const url = `https://${this.config.host}/rest/api/3${endpoint}`;
        const headers = {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        const options = {
            method,
            headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Jira API error (${response.status}): ${error}`);
        }
        return response.json();
    }
    async getIssue(issueKey) {
        return this.fetchJira(`/issue/${issueKey}`);
    }
    async searchIssues(jql, maxResults = 20) {
        const params = new URLSearchParams({
            jql,
            maxResults: maxResults.toString(),
        });
        return this.fetchJira(`/search?${params.toString()}`);
    }
    async createIssue(project, issueType, summary, description, fields) {
        const body = {
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
    async addComment(issueKey, comment) {
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
    async transitionIssue(issueKey, transitionId, comment) {
        const body = {
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
    async updateIssue(issueKey, fields) {
        const body = { fields };
        await this.fetchJira(`/issue/${issueKey}`, "PUT", body);
    }
    async getTransitions(issueKey) {
        return this.fetchJira(`/issue/${issueKey}/transitions`);
    }
}
const tools = [
    {
        name: "get_issue",
        description: "Fetch a Jira issue by its key (e.g., SPR-1234). Returns issue details including title, description, status, assignee, and more.",
        inputSchema: {
            type: "object",
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
        description: "Search Jira issues using JQL (Jira Query Language). Examples: 'project = SPR AND status = Open', 'assignee = currentUser() AND due <= now()'",
        inputSchema: {
            type: "object",
            properties: {
                jql: {
                    type: "string",
                    description: "JQL query string (e.g., 'project = SPR AND assignee = currentUser()')",
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
        description: "Create a new Jira issue in a project. Returns the newly created issue key.",
        inputSchema: {
            type: "object",
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
        description: "Add a comment to a Jira issue. Use this to provide updates, responses, or resolutions.",
        inputSchema: {
            type: "object",
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
        description: "Get available workflow transitions for an issue. Returns a list of possible statuses you can move the issue to.",
        inputSchema: {
            type: "object",
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
        description: "Move an issue to a new status. First call get_transitions to see available transitions.",
        inputSchema: {
            type: "object",
            properties: {
                issue_key: {
                    type: "string",
                    description: "The issue key (e.g., SPR-1234)",
                },
                transition_id: {
                    type: "string",
                    description: "The transition ID from get_transitions (e.g., '11' for 'In Progress')",
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
        description: "Update issue fields like priority, labels, or custom fields.",
        inputSchema: {
            type: "object",
            properties: {
                issue_key: {
                    type: "string",
                    description: "The issue key (e.g., SPR-1234)",
                },
                fields: {
                    type: "object",
                    description: "Fields to update (e.g., {\"priority\": {\"name\": \"High\"}, \"labels\": [\"urgent\"]})",
                },
            },
            required: ["issue_key", "fields"],
        },
    },
];
async function main() {
    const jiraHost = process.env.JIRA_HOST;
    const jiraUsername = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;
    if (!jiraHost || !jiraUsername || !jiraToken) {
        console.error("Error: Missing required environment variables:");
        console.error("  - JIRA_HOST (e.g., net32inc.atlassian.net)");
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
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools,
        };
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const input = request.params.arguments;
        try {
            let result;
            switch (request.params.name) {
                case "get_issue": {
                    const issueKey = input.issue_key;
                    result = await jiraClient.getIssue(issueKey);
                    break;
                }
                case "search_issues": {
                    const jql = input.jql;
                    const maxResults = input.max_results || 20;
                    result = await jiraClient.searchIssues(jql, maxResults);
                    break;
                }
                case "create_issue": {
                    const project = input.project;
                    const issueType = input.issue_type;
                    const summary = input.summary;
                    const description = input.description;
                    result = await jiraClient.createIssue(project, issueType, summary, description);
                    break;
                }
                case "add_comment": {
                    const issueKey = input.issue_key;
                    const comment = input.comment;
                    result = await jiraClient.addComment(issueKey, comment);
                    break;
                }
                case "get_transitions": {
                    const issueKey = input.issue_key;
                    result = await jiraClient.getTransitions(issueKey);
                    break;
                }
                case "transition_issue": {
                    const issueKey = input.issue_key;
                    const transitionId = input.transition_id;
                    const comment = input.comment;
                    await jiraClient.transitionIssue(issueKey, transitionId, comment);
                    result = {
                        success: true,
                        message: `Issue ${issueKey} transitioned successfully`,
                    };
                    break;
                }
                case "update_issue": {
                    const issueKey = input.issue_key;
                    const fields = input.fields;
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
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                content: [
                    {
                        type: "text",
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
//# sourceMappingURL=index.js.map