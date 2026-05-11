#!/bin/bash

set -e

IMAGE="jira-mcp-test"

echo "Building Docker image..."
docker build -t "$IMAGE" .

echo "Testing server starts..."
OUTPUT=$(docker run --rm \
  -e JIRA_HOST="net32inc.atlassian.net" \
  -e JIRA_EMAIL="test@net32.com" \
  -e JIRA_API_TOKEN="dummy" \
  "$IMAGE" 2>&1 | head -1)

if echo "$OUTPUT" | grep -q "connected and running"; then
  echo "PASS: $OUTPUT"
else
  echo "FAIL: $OUTPUT"
  exit 1
fi
