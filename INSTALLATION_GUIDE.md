# Installation Guide for Net32 Team

Quick setup guide for adding the Jira MCP connector to your Claude instance.

## Prerequisites

- Node.js 18+ installed (`node --version`)
- Claude Code desktop app or Claude.ai web access
- Jira API token (from https://id.atlassian.com/manage-profile/security/api-tokens)

## Step 1: Get Your Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name like "Claude MCP"
4. Copy the token (shown only once)
5. Keep it safe — don't commit to git or share in Slack

## Step 2: Install the Connector

### From npm (Recommended for org installations):
```bash
npm install @net32/jira-mcp
```

### From Source:
```bash
git clone <repo-url> jira-mcp-connector
cd jira-mcp-connector
npm install
npm run build
```

Record the full path to `dist/index.js` — you'll need it next.

## Step 3: Configure Claude Code

### macOS/Linux:
```bash
# Open your Claude settings
nano ~/.claude/settings.json
```

### Windows:
```
%APPDATA%\Claude\settings.json
```

### Add this block (replace paths and credentials):

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/full/path/to/jira-mcp-connector/dist/index.js"],
      "env": {
        "JIRA_HOST": "net32inc.atlassian.net",
        "JIRA_USERNAME": "your-email@net32.com",
        "JIRA_API_TOKEN": "paste_your_token_here"
      }
    }
  }
}
```

### For npm install location:
If you installed via npm, use the path where npm stores packages:
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["$(npm root -g)/@net32/jira-mcp/dist/index.js"],
      "env": {
        "JIRA_HOST": "net32inc.atlassian.net",
        "JIRA_USERNAME": "your-email@net32.com",
        "JIRA_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Step 4: Restart Claude Code

Fully close and reopen Claude Code. The Jira connector will load on startup.

## Step 5: Test It

In a Claude conversation, try:
```
Get SPR-2275
```

Claude should fetch the issue details. If it works, you're all set!

## Troubleshooting

### "Jira API error (401)"
- **Check:** Your email and API token are correct
- **Fix:** Regenerate the token at https://id.atlassian.com/manage-profile/security/api-tokens

### "Jira API error (404)"
- **Check:** The issue key exists (e.g., SPR-1234)
- **Fix:** Verify you have access to that project

### Claude doesn't recognize the connector
- **Check:** Restart Claude Code completely
- **Check:** Verify the path to `dist/index.js` is correct (use absolute paths, not ~)
- **Fix:** Run `node /path/to/dist/index.js` manually to see if it starts

### "command not found: node"
- **Check:** Node.js is installed (`node --version`)
- **Fix:** Add Node to your PATH or use the full path `/usr/local/bin/node`

## Keeping It Updated

If you installed from npm:
```bash
npm update @net32/jira-mcp
```

If you cloned from source:
```bash
cd jira-mcp-connector
git pull
npm install
npm run build
```

## Need Help?

- Check the main README.md for tool documentation
- Review examples: see "Usage Examples" in README.md
- Ask in #engineering Slack channel

## Security Notes

- **Never commit your API token** to git
- **Never share your token** in Slack or email
- **Rotate tokens regularly** (create new, delete old)
- Store `.env` files in `.gitignore` if you use them

---

That's it! You can now ask Claude about Jira issues directly.
