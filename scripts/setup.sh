#!/bin/bash

set -e

echo "🔧 Jira MCP Connector Setup"
echo "============================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"

# Check if already in the connector directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the jira-mcp-connector directory"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Build complete!"

# Show path
DIST_PATH=$(pwd)/dist/index.js
echo ""
echo "📍 Add this to your ~/.claude/settings.json:"
echo ""
echo '{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["'"$DIST_PATH"'"],
      "env": {
        "JIRA_HOST": "net32inc.atlassian.net",
        "JIRA_USERNAME": "your-email@net32.com",
        "JIRA_API_TOKEN": "your_api_token_here"
      }
    }
  }
}'

echo ""
echo "🔑 Get your API token:"
echo "   1. Visit: https://id.atlassian.com/manage-profile/security/api-tokens"
echo "   2. Click 'Create API token'"
echo "   3. Copy the token and paste it in settings.json"
echo ""
echo "✨ Then restart Claude Code and you're ready!"
