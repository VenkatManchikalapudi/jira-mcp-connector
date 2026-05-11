# Jira MCP Connector

A Model Context Protocol (MCP) server that enables Claude to read, search, create, and manage Jira issues directly from Claude Code.

## Features

- **Get Issue** — Fetch issue details by key (e.g. SPR-1234)
- **Search Issues** — Search using JQL (Jira Query Language)
- **Create Issues** — Create new tickets programmatically
- **Add Comments** — Post comments to issues
- **Manage Workflows** — View transitions and move issues to new statuses
- **Update Fields** — Update priority, labels, assignees, and custom fields

## Installation

**1. Clone and install:**
```bash
git clone https://bitbucket.org/net-32/jira-mcp-connector.git
npm install -g ./jira-mcp-connector
```

**2. Add to `~/.claude/settings.json`:**
```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp",
      "env": {
        "JIRA_HOST": "net32inc.atlassian.net",
        "JIRA_EMAIL": "your-email@net32.com",
        "JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

- **JIRA_EMAIL** — your Net32 Atlassian email (e.g. `alexa@net32.com`)
- **JIRA_API_TOKEN** — create one at https://id.atlassian.com/manage-profile/security/api-tokens → **Create API token**, give it a name, copy the value

**3. Restart Claude** — then try `Get SPR-XXXX` to confirm it's working.

## Usage Examples

**Get an issue:**
```
Read SPR-2275 to understand the current status
```

**Search for open bugs:**
```
Find all open bugs in the SPR project assigned to me
```

**Create a ticket:**
```
Create a task "Update documentation for Jira integration" in the SPR project
```

**Add a comment:**
```
Comment on SPR-2275: "This has been resolved in PR #1279"
```

**Move issue to Done:**
```
Transition SPR-2275 to Done with a comment "Merged and deployed"
```

## JQL Query Examples

```
# Issues assigned to you
assignee = currentUser()

# Open bugs in SPR project
project = SPR AND type = Bug AND status IN (Open, "In Progress")

# Issues updated in the last 7 days
updated >= -7d

# Issues with a specific label
labels in (urgent, security)

# High priority items
priority >= High

# Sprint board issues
sprint = "Sprint 45" AND status != Done
```

See Jira's [Advanced Searching documentation](https://www.atlassian.com/software/jira/guides/expand-jira/jira-query-language) for more.

## Tools Reference

### `get_issue`
Fetch a single issue by key.

- `issue_key` (string, required): e.g. `SPR-1234`

### `search_issues`
Search for issues using JQL.

- `jql` (string, required): JQL query string
- `max_results` (number, optional): default 20, max 100

### `create_issue`
Create a new issue.

- `project` (string, required): e.g. `SPR`
- `issue_type` (string, required): Bug, Task, Story, Subtask, etc.
- `summary` (string, required): Issue title
- `description` (string, optional)

### `add_comment`
Add a comment to an issue.

- `issue_key` (string, required)
- `comment` (string, required)

### `get_transitions`
Get available workflow transitions for an issue.

- `issue_key` (string, required)

### `transition_issue`
Move an issue to a new status.

- `issue_key` (string, required)
- `transition_id` (string, required): from `get_transitions`
- `comment` (string, optional)

### `update_issue`
Update issue fields.

- `issue_key` (string, required)
- `fields` (object, required): e.g. `{"priority": {"name": "High"}}`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Jira instance hostname | `net32inc.atlassian.net` |
| `JIRA_EMAIL` | Your Atlassian account email | `your-email@net32.com` |
| `JIRA_API_TOKEN` | API token for authentication | (generate at id.atlassian.com) |

## Troubleshooting

### "Missing required environment variables"
Ensure all three env vars are set in `~/.claude/settings.json` and Claude has been restarted.

### "Jira API error (401)"
Verify your email and API token are correct. Regenerate the token at https://id.atlassian.com/manage-profile/security/api-tokens if needed.

### "Jira API error (404)"
Verify the issue key exists and you have access to that project.

### Connector not loading in Claude
- Run `which jira-mcp` to confirm the binary is on your PATH
- Verify `node` is available: `which node`
- Restart Claude completely after editing `settings.json`

## Development

```bash
npm install       # install dependencies
npm run build     # compile TypeScript
npm run dev       # run in dev mode (ts-node)
npm test          # run tests
```

## License

MIT
