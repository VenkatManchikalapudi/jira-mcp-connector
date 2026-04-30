# Jira MCP — Quick Reference

## Common Tasks in Claude

### Read an issue
```
Show me SPR-2275
```

### Find my assigned issues
```
Search for issues assigned to me that aren't done yet
```

### Find bugs in a project
```
Find all open bugs in the SPR project
```

### Find overdue tasks
```
Show me tasks due in the next 7 days
```

### Create a ticket
```
Create a bug report "Login form fails on Firefox" in SPR
```

### Add a comment
```
Comment on SPR-2275: "Fixed in PR #1279, ready for testing"
```

### Move to Done
```
Transition SPR-2275 to Done
```

### Update priority
```
Make SPR-2275 High priority
```

## JQL Quick Patterns

```
# My tasks
assignee = currentUser()

# Team's open work
project = SPR AND status != Done AND assignee is not EMPTY

# This sprint
sprint = "Current Sprint" AND type != Subtask

# Urgent bugs
priority = Highest AND type = Bug AND status != Done

# Created by me
creator = currentUser()

# Needs review
status = "In Review"
```

## Tools Available

| Tool | What It Does |
|------|--------------|
| `get_issue` | Fetch details for one issue |
| `search_issues` | Find multiple issues with JQL |
| `create_issue` | Make a new ticket |
| `add_comment` | Post a comment |
| `get_transitions` | See available status changes |
| `transition_issue` | Move to new status |
| `update_issue` | Change fields (priority, etc.) |

## Keyboard Shortcuts

In Claude Code, press `/` to see all available tools and commands.

## Help

- Full docs: See README.md
- Setup help: See INSTALLATION_GUIDE.md
- Jira syntax: https://support.atlassian.com/jira-software-cloud/articles/advanced-searching/
