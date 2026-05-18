# Jira MCP Connector

A Model Context Protocol (MCP) server that enables Claude to read, search, create, and manage Jira issues directly from Claude.

## Features

- **Get Issue** — Fetch issue details by key (e.g. PROJ-1234)
- **Search Issues** — Search using JQL (Jira Query Language)
- **Create Issues** — Create new tickets programmatically
- **Add Comments** — Post comments to issues
- **Manage Workflows** — View transitions and move issues to new statuses
- **Update Fields** — Update priority, labels, assignees, and custom fields

## Quick Install for Non-Technical Users

If you're using Claude Desktop, you can have Claude install this for you. Open Claude Desktop and paste the following prompt — fill in your details before sending:

```
I want to install the Jira MCP connector so I can look up and manage 
Jira tickets directly from Claude.

Please help me:
1. Check if Node.js is installed — if not, install it from https://nodejs.org
2. Clone https://github.com/VenkatManchikalapudi/jira-mcp-connector.git and run: npm install -g ./jira-mcp-connector
3. Find my Claude Desktop config file (~/Library/Application Support/Claude/claude_desktop_config.json) and add the MCP server config block with my credentials
4. Restart Claude Desktop and confirm the Jira connector is working by fetching a ticket

My details:
- Jira host: [your-org.atlassian.net]
- Jira email: [your-email@your-org.com]
- Jira API token: [paste your token here — get one at https://id.atlassian.com/manage-profile/security/api-tokens]
```

Once Claude completes the steps, fully quit and reopen Claude Desktop. Then ask it `Get PROJ-XXXX` to confirm it's working.

---

## Installation

### Prerequisites

- **Node.js 18+** — check with `node --version`, install from https://nodejs.org if needed

### Step 1 — Get a Jira API token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**, give it a name (e.g. "Claude MCP"), copy the value

### Step 2 — Install the connector

```bash
# SSH (recommended — no password prompt)
git clone git@github.com:VenkatManchikalapudi/jira-mcp-connector.git

# HTTPS
git clone https://github.com/VenkatManchikalapudi/jira-mcp-connector.git
```
```bash
npm install -g ./jira-mcp-connector
```

### Step 3 — Configure Claude

The config block to add is the same for all setups — the only difference is which file you edit:

```json
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp",
      "env": {
        "JIRA_HOST": "your-org.atlassian.net",
        "JIRA_EMAIL": "your-email@your-org.com",
        "JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

Replace the values with your Jira host, email, and API token.

**Claude Desktop (macOS)**
Open this file (create it if it doesn't exist):
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Claude Code**
Try `~/.claude/settings.json` first; if Claude doesn't pick it up, use `~/.claude.json` instead.

> **Note:** If you use mise or nvm, `jira-mcp` may not be on Claude's PATH. Run `which jira-mcp` after install and use the full path as the `command` value.

### Step 4 — Restart Claude

Fully quit and reopen Claude, then try `Get PROJ-XXXX` to confirm it's working.

## Usage Examples

**Get an issue:**
```
Read PROJ-1234 to understand the current status
```

**Search for open bugs:**
```
Find all open bugs assigned to me
```

**Create a ticket:**
```
Create a task "Update API documentation" in the PROJ project
```

**Add a comment:**
```
Comment on PROJ-1234: "This has been resolved in PR #42"
```

**Move issue to Done:**
```
Transition PROJ-1234 to Done with a comment "Merged and deployed"
```

## JQL Query Examples

```
# Issues assigned to you
assignee = currentUser()

# Open bugs in a project
project = PROJ AND type = Bug AND status IN (Open, "In Progress")

# Issues updated in the last 7 days
updated >= -7d

# Issues with a specific label
labels in (urgent, security)

# High priority items
priority >= High

# Sprint board issues
sprint in openSprints() AND status != Done
```

See Jira's [Advanced Searching documentation](https://www.atlassian.com/software/jira/guides/expand-jira/jira-query-language) for more.

## Tools Reference

### Issues

#### `get_issue`
Fetch a single issue by key.
- `issue_key` (string, required): e.g. `PROJ-1234`

#### `search_issues`
Search for issues using JQL.
- `jql` (string, required): JQL query string
- `max_results` (number, optional): default 20, max 100

#### `create_issue`
Create a new issue.
- `project` (string, required): e.g. `PROJ`
- `issue_type` (string, required): Bug, Task, Story, Subtask, etc.
- `summary` (string, required)
- `description` (string, optional)

#### `batch_create_issues`
Create multiple issues at once.
- `issues` (array, required): each item needs `project`, `issue_type`, `summary`, and optional `description`

#### `delete_issue`
Delete an issue permanently.
- `issue_key` (string, required)

#### `update_issue`
Update issue fields like priority, labels, or custom fields.
- `issue_key` (string, required)
- `fields` (object, required): e.g. `{"priority": {"name": "High"}}`

### Comments & Worklogs

#### `add_comment`
Add a comment to an issue.
- `issue_key` (string, required)
- `comment` (string, required)

#### `edit_comment`
Edit an existing comment.
- `issue_key` (string, required)
- `comment_id` (string, required)
- `comment` (string, required)

#### `add_worklog`
Log time spent on an issue.
- `issue_key` (string, required)
- `time_spent` (string, required): e.g. `2h`, `30m`, `1h 30m`
- `comment` (string, optional)

### Workflow

#### `get_transitions`
Get available workflow transitions for an issue.
- `issue_key` (string, required)

#### `transition_issue`
Move an issue to a new status.
- `issue_key` (string, required)
- `transition_id` (string, required): from `get_transitions`
- `comment` (string, optional)

### Issue Links

#### `get_link_types`
Get all available link types (e.g. blocks, relates to, duplicates).

#### `create_issue_link`
Link two issues together.
- `link_type` (string, required): from `get_link_types`
- `inward_issue` (string, required): e.g. `PROJ-1234`
- `outward_issue` (string, required): e.g. `PROJ-5678`
- `comment` (string, optional)

### Projects & Boards

#### `get_all_projects`
Get all Jira projects accessible to the current user.

#### `get_agile_boards`
Get agile boards, optionally filtered by project.
- `project_key` (string, optional)

#### `get_board_sprints`
Get sprints for a board.
- `board_id` (number, required): from `get_agile_boards`
- `state` (string, optional): `active`, `future`, or `closed`

#### `get_sprint_issues`
Get all issues in a sprint.
- `sprint_id` (number, required): from `get_board_sprints`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Jira instance hostname | `your-org.atlassian.net` |
| `JIRA_EMAIL` | Your Atlassian account email | `your-email@your-org.com` |
| `JIRA_API_TOKEN` | API token for authentication | (generate at id.atlassian.com) |

## Troubleshooting

### "Missing required environment variables"
Ensure all three env vars are set in your config file and Claude has been fully restarted.

### "Jira API error (401)"
Verify your email and API token are correct. Regenerate the token at https://id.atlassian.com/manage-profile/security/api-tokens if needed.

### "Jira API error (404)"
Verify the issue key exists and you have access to that project.

### Connector not loading in Claude
- **Claude Desktop:** check `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Code:** try both `~/.claude/settings.json` and `~/.claude.json`
- Run `which jira-mcp` to confirm the binary is on your PATH; if using mise or nvm use the full path as the `command` value
- Verify `node` is available: `which node`
- Restart Claude completely after editing the config

## Development

```bash
npm install       # install dependencies
npm run build     # compile and bundle with esbuild
npm run dev       # run in dev mode (ts-node)
npm test          # run tests
```

## Author

Built by [Venkat Manchikalapudi](https://github.com/VenkatManchikalapudi)

## License

MIT
