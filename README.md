# Jira MCP Connector

A Model Context Protocol (MCP) server that enables Claude to read, search, create, and manage Jira issues directly from Claude Code and Claude.ai.

## Features

- **Get Issue** — Fetch issue details by key (SPR-1234)
- **Search Issues** — Search using JQL (Jira Query Language)
- **Create Issues** — Create new tickets programmatically
- **Add Comments** — Post comments to issues
- **Manage Workflows** — View transitions and move issues to new statuses
- **Update Fields** — Update priority, labels, assignees, and custom fields

## Installation

### Option 1: Install from npm (Organization Package Registry)

```bash
npm install -g git+https://bitbucket.org/net-32/jira-mcp-connector.git
```

### Option 2: Build from Source

1. **Clone/download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript:**
   ```bash
   npm run build
   ```

### Configure Claude to Use This Connector

The connector runs as a standalone server and must be configured in Claude's MCP settings.

#### For Claude Code (Desktop/CLI):

1. **Open your Claude Code settings:**
   ```bash
   # Open the settings file
   open ~/.claude/settings.json
   # or on Linux:
   cat ~/.claude/settings.json
   ```

2. **Add the Jira connector to your mcpServers configuration:**
   ```json
   {
     "mcpServers": {
       "jira": {
         "command": "jira-mcp",
         "env": {
           "JIRA_HOST": "net32inc.atlassian.net",
           "JIRA_EMAIL": "your-email@net32.com",
           "JIRA_API_TOKEN": "your_api_token_here"
         }
       }
     }
   }
   ```

   **On macOS with homebrew install of Claude Code:**
   ```json
   {
     "mcpServers": {
       "jira": {
         "command": "jira-mcp",
         "env": {
           "JIRA_HOST": "net32inc.atlassian.net",
           "JIRA_EMAIL": "your-email@net32.com",
           "JIRA_API_TOKEN": "your_api_token_here"
         }
       }
     }
   }
   ```

3. **Restart Claude Code** — The connector will be loaded on next session.

#### For Claude.ai Web App:

1. Go to **Settings → Model Context Protocol**
2. Click **Add Connection**
3. Select **Jira** (or paste this configuration):
   ```json
   {
     "name": "jira",
     "command": "jira-mcp",
     "env": {
       "JIRA_HOST": "net32inc.atlassian.net",
       "JIRA_EMAIL": "your-email@net32.com",
       "JIRA_API_TOKEN": "your_api_token_here"
     }
   }
   ```

### Generate a Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy the token (you'll only see it once)
4. Paste into your configuration

**Note:** Never commit tokens to git. Use environment files or secure vaults.

## Usage Examples

### In Claude Code or Claude.ai:

**Get an issue:**
```
Read SPR-2275 to understand the current status
```
Claude will use the `get_issue` tool to fetch the ticket.

**Search for open bugs:**
```
Find all open bugs in the SPR project assigned to me
```
Claude will use `search_issues` with JQL: `project = SPR AND type = Bug AND assignee = currentUser() AND status != Done`

**Create a ticket:**
```
Create a task "Update documentation for Jira integration" in the SPR project
```
Claude will call `create_issue` with the appropriate fields.

**Add a comment:**
```
Comment on SPR-2275: "This has been resolved in PR #1279"
```
Claude will add the comment using `add_comment`.

**Move issue to Done:**
```
Transition SPR-2275 to Done with a comment "Merged and deployed"
```
Claude will fetch transitions and move the issue.

## JQL Query Examples

Common Jira Query Language (JQL) patterns:

```
# Issues assigned to you
assignee = currentUser()

# Open bugs in SPR project
project = SPR AND type = Bug AND status IN (Open, "In Progress")

# Issues updated in the last 7 days
updated >= -7d

# Issues with a specific label
labels in (urgent, security)

# Issues created by you
creator = currentUser()

# Issues due soon
due <= now() + 7d

# High priority items
priority >= High

# Sprint board issues
sprint = "Sprint 45" AND status != Done
```

See Jira's [Advanced Searching documentation](https://www.atlassian.com/software/jira/guides/expand-jira/jira-query-language) for more.

## Tools Reference

### `get_issue`
Fetch a single issue by key.

**Input:**
- `issue_key` (string, required): The issue key (e.g., SPR-1234)

**Returns:** Full issue object with all fields, comments, history, and metadata.

### `search_issues`
Search for issues using JQL.

**Input:**
- `jql` (string, required): JQL query string
- `max_results` (number, optional): Max results to return (default 20, max 100)

**Returns:** List of matching issues with summary, status, assignee, etc.

### `create_issue`
Create a new issue.

**Input:**
- `project` (string, required): Project key (e.g., SPR)
- `issue_type` (string, required): Issue type (Bug, Task, Story, Subtask, etc.)
- `summary` (string, required): Issue title
- `description` (string, optional): Issue description

**Returns:** Newly created issue with assigned key.

### `add_comment`
Add a comment to an issue.

**Input:**
- `issue_key` (string, required): Issue key (e.g., SPR-1234)
- `comment` (string, required): Comment text

**Returns:** Comment object with author, timestamp, etc.

### `get_transitions`
Get available workflow transitions for an issue.

**Input:**
- `issue_key` (string, required): Issue key (e.g., SPR-1234)

**Returns:** List of available transitions with IDs and names.

### `transition_issue`
Move an issue to a new status.

**Input:**
- `issue_key` (string, required): Issue key (e.g., SPR-1234)
- `transition_id` (string, required): Transition ID from `get_transitions`
- `comment` (string, optional): Comment to add when transitioning

**Returns:** Success confirmation.

### `update_issue`
Update issue fields.

**Input:**
- `issue_key` (string, required): Issue key (e.g., SPR-1234)
- `fields` (object, required): Fields to update (e.g., `{"priority": {"name": "High"}}`)

**Returns:** Success confirmation.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Jira instance hostname | `net32inc.atlassian.net` |
| `JIRA_EMAIL` | Email or username | `your-email@net32.com` |
| `JIRA_API_TOKEN` | API token for authentication | (generate at id.atlassian.com) |

## Troubleshooting

### "Missing required environment variables"
- Ensure all three env vars are set in your Claude settings
- Check that your API token hasn't expired (recreate at id.atlassian.com if needed)

### "Jira API error (401)"
- Verify your email and API token are correct
- Check that the token was generated for the same Atlassian account

### "Jira API error (404)"
- Verify the issue key exists (e.g., SPR-1234)
- Confirm you have access to that project

### Claude doesn't see the connector
- Restart Claude completely
- Check that the file path to `dist/index.js` is correct
- Verify `node` is in your PATH: `which node`

## Development

### Run in development mode:
```bash
npm run dev
```

### Run tests:
```bash
npm test
```

### Build for distribution:
```bash
npm run build
```

## Publishing

To publish this connector to your organization's npm registry:

1. **Configure npm for your registry:**
   ```bash
   npm config set registry https://your-org-npm-registry.com
   ```

2. **Publish:**
   ```bash
   npm publish
   ```

Or use a tool like Artifactory, npm Enterprise, or GitHub Packages for internal distribution.

## License

MIT
