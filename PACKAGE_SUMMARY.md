# Jira MCP Connector — Package Summary

## What's Included

A complete, production-ready MCP server for Jira, ready to distribute to your organization.

```
jira-mcp-connector/
├── src/
│   └── index.ts                 # Main MCP server with all Jira tools
├── dist/                        # Compiled JavaScript (created by npm run build)
│   └── index.js
├── scripts/
│   └── setup.sh                 # One-command setup for team members
├── .github/
│   └── workflows/
│       └── publish.yml          # Automated npm publishing on version tags
├── package.json                 # Dependencies and build scripts
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Full documentation
├── INSTALLATION_GUIDE.md        # Step-by-step setup for Net32 team
├── QUICK_REFERENCE.md           # Quick lookup for common tasks
├── env.example                  # Environment variable template
└── .gitignore                   # Don't commit tokens or node_modules
```

## Features

✅ **7 Tools:**
- `get_issue` — Fetch issue by key
- `search_issues` — Search with JQL
- `create_issue` — Create new tickets
- `add_comment` — Post comments
- `get_transitions` — View status options
- `transition_issue` — Move to new status
- `update_issue` — Update fields

✅ **Security:**
- API token validation
- Credential isolation (stored in Claude settings, not repo)
- Full error handling
- No hardcoded credentials

✅ **Documentation:**
- Comprehensive README with examples
- Step-by-step installation guide for your team
- Quick reference card
- JQL query examples

✅ **Distribution-Ready:**
- npm package structure (`@net32/jira-mcp`)
- GitHub Actions workflow for automated publishing
- Setup script for one-click installation

## How to Distribute to Your Organization

### Option 1: Internal npm Registry (Recommended)

1. **Build:**
   ```bash
   npm run build
   ```

2. **Update version in `package.json`:**
   ```json
   "version": "1.0.0"
   ```

3. **Publish to your registry:**
   ```bash
   npm publish --registry https://your-npm-registry.com
   ```

   Or use Artifactory, npm Enterprise, GitHub Packages, etc.

4. **Team installs with:**
   ```bash
   npm install @net32/jira-mcp
   ```

### Option 2: GitHub Releases

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial Jira MCP connector"
   git remote add origin https://github.com/net32/jira-mcp-connector
   git push -u origin main
   ```

2. **Create a tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **GitHub Actions will auto-publish** to npm (if NPM_TOKEN secret is set)

4. **Team clones and builds:**
   ```bash
   git clone https://github.com/net32/jira-mcp-connector
   cd jira-mcp-connector
   ./scripts/setup.sh
   ```

### Option 3: Direct Source Distribution

1. **Share the repo** (GitHub, Bitbucket, etc.)

2. **Team runs setup script:**
   ```bash
   git clone <repo>
   cd jira-mcp-connector
   bash scripts/setup.sh
   ```

## First-Time Setup (For Team Members)

```bash
# 1. Install or clone
npm install @net32/jira-mcp
# OR: git clone <repo> && cd jira-mcp-connector && ./scripts/setup.sh

# 2. Add to Claude settings (~/.claude/settings.json)
# See INSTALLATION_GUIDE.md for details

# 3. Restart Claude Code

# 4. Test
# In Claude: "Get SPR-2275"
```

## Next Steps

1. **Choose distribution method:**
   - ✅ Recommended: Use internal npm registry
   - Alternative: GitHub releases with GitHub Actions automation
   - Alternative: Direct source distribution via git

2. **Customize as needed:**
   - Add more tools (getProject, getBoard, etc.)
   - Add custom fields specific to your Jira setup
   - Add batch operations (create multiple issues)

3. **Share with team:**
   - Link to INSTALLATION_GUIDE.md
   - Point to QUICK_REFERENCE.md for examples
   - Share in #engineering Slack channel

4. **Keep updated:**
   - Fix bugs and add features as needed
   - Bump version and republish
   - Team runs `npm update @net32/jira-mcp`

## Example: Publishing to npm

```bash
# Update version in package.json
nano package.json

# Build
npm run build

# Test locally
npm pack

# Publish
npm publish --registry https://your-npm-registry.com

# Or use GitHub Actions (if repo is on GitHub):
git tag v1.1.0
git push origin v1.1.0
# GitHub Actions automatically publishes!
```

## Example: Customizing for Your Organization

### Add a custom tool (e.g., get_project):

In `src/index.ts`, add to the JiraClient class:
```typescript
async getProject(projectKey: string): Promise<Record<string, unknown>> {
  return this.fetchJira(`/project/${projectKey}`);
}
```

Then add to the server tools array:
```typescript
{
  name: "get_project",
  description: "Get project details including team, repository, and settings",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_key: {
        type: "string",
        description: "The project key (e.g., SPR)"
      }
    },
    required: ["project_key"]
  }
}
```

Rebuild and republish:
```bash
npm run build
npm publish --registry https://your-npm-registry.com
```

## Security Checklist

- [ ] Never commit `.env` files with real tokens
- [ ] Use `.gitignore` to exclude sensitive files
- [ ] Educate team to rotate API tokens regularly
- [ ] Document that tokens should be stored in Claude settings, not shared
- [ ] Consider token scoping (read-only vs full access)
- [ ] Monitor usage if publishing to public registry

## File Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server + all Jira tools |
| `package.json` | Dependencies and npm metadata |
| `tsconfig.json` | TypeScript build config |
| `README.md` | Full documentation for users |
| `INSTALLATION_GUIDE.md` | Setup walkthrough for team |
| `QUICK_REFERENCE.md` | Quick lookup card |
| `scripts/setup.sh` | One-command installer |
| `.github/workflows/publish.yml` | Auto-publish to npm on tag |

---

Your custom Jira MCP connector is ready to ship! 🚀
