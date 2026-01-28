# HubSpot Extended MCP Server

A Model Context Protocol (MCP) server that extends HubSpot functionality for Claude Code, adding marketing emails, sequences, and workflow enrollment capabilities.

## Why This Exists

The official HubSpot MCP server (`@hubspot/mcp-server`) provides read-only access to CRM objects. This extended server adds:

- Marketing email management (list, create, update, clone, delete)
- Email statistics and performance data
- Sales sequences (list, view, enroll contacts)
- Workflow enrollment (enroll/unenroll contacts)

## Prerequisites

- Node.js 20 or higher
- HubSpot account with:
  - Marketing Hub Pro (for marketing emails)
  - Sales Hub Pro (for sequences)
- HubSpot Private App with appropriate scopes

## Setup

### 1. Create a HubSpot Private App

1. Go to **Settings > Integrations > Private Apps** in HubSpot
2. Click **Create a private app**
3. Name it (e.g., "Claude Code MCP")
4. Under **Scopes**, enable:
   - `content` (for marketing emails)
   - `marketing-email` (for email operations)
   - `automation` (for sequences and workflows)
   - `sales-email-read` (for sequences)
5. Click **Create app** and copy the access token

### 2. Install and Build

```bash
cd /Users/brent/scripts/CB-Workspace/mcp-servers/hubspot-extended
npm install
npm run build
```

### 3. Configure Claude Code

Add to your Claude Code MCP configuration (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "hubspot-extended": {
      "command": "node",
      "args": ["/Users/brent/scripts/CB-Workspace/mcp-servers/hubspot-extended/dist/index.js"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "your-private-app-token"
      }
    }
  }
}
```

Restart Claude Code to load the server.

## Available Tools

### Marketing Emails

| Tool | Description |
|------|-------------|
| `hubspot_list_marketing_emails` | List marketing emails with filtering options |
| `hubspot_get_marketing_email` | Get full details of a specific email |
| `hubspot_create_marketing_email` | Create a new marketing email |
| `hubspot_update_marketing_email` | Update an existing email |
| `hubspot_clone_marketing_email` | Clone an email to create a new one |
| `hubspot_delete_marketing_email` | Delete a marketing email |
| `hubspot_get_marketing_email_statistics` | Get email performance stats |

### Sequences

| Tool | Description |
|------|-------------|
| `hubspot_list_sequences` | List all sales sequences |
| `hubspot_get_sequence` | Get details of a specific sequence |
| `hubspot_enroll_in_sequence` | Enroll a contact in a sequence |
| `hubspot_get_sequence_enrollment` | Check if contact is enrolled in sequences |
| `hubspot_unenroll_from_sequence` | Unenroll a contact from a sequence |

### Workflows

| Tool | Description |
|------|-------------|
| `hubspot_enroll_in_workflow` | Enroll a contact in a workflow |
| `hubspot_unenroll_from_workflow` | Unenroll a contact from a workflow |

## Usage Examples

### Marketing Emails

```
List my marketing emails from the last week
```

```
Create a new marketing email named "January Newsletter" with subject "Your January Update"
```

### Sequences

```
List all my sales sequences
```

```
Enroll contact 12345 in sequence 67890 using my email address
```

### Workflows

```
Enroll contact 12345 in workflow 99999
```

## Important Notes

### Sequences Require User ID

The sequences API requires a `userId` parameter (HubSpot owner ID). You can get this from:
- The HubSpot Owners API: `GET /crm/v3/owners`
- Your HubSpot user settings

### Workflow Enrollment Limitations

- Only works with contact-based workflows
- Newer v4 workflows may have different IDs than shown in the UI
- The official HubSpot MCP can list/get workflows; this server adds enrollment

## Required Scopes

| Scope | Purpose |
|-------|---------|
| `content` | Access to marketing content |
| `marketing-email` | Full marketing email operations |
| `automation` | Sequences and workflows |
| `sales-email-read` | Reading sequence data |

## Limitations

- **Sales Templates**: HubSpot does not provide API access to sales email templates (Conversations > Templates). This is a HubSpot limitation.
- **Sequence Templates**: Cannot modify sequence email templates via API.
- **Publishing Emails**: Requires Marketing Hub Enterprise or transactional email add-on.

## Relationship to Official HubSpot MCP

This server is **complementary** to the official `@hubspot/mcp-server`. You can run both:

| Feature | Official MCP | This Server |
|---------|-------------|-------------|
| CRM Objects | Read-only | - |
| Workflows | List, Get | Enroll, Unenroll |
| Marketing Emails | - | Full CRUD |
| Sequences | - | List, Get, Enroll |

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Start the server directly
npm start
```

## Changelog

### v0.2.0
- Added sequences tools (list, get, enroll, unenroll)
- Added workflow enrollment tools

### v0.1.0
- Initial release with marketing email tools

## License

MIT
