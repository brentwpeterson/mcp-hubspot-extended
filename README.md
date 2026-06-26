# HubSpot Extended MCP Server

A Model Context Protocol (MCP) server that extends HubSpot functionality for Claude Code, adding marketing emails, sequences, and workflow enrollment capabilities.

## Why This Exists

This server is being grown into a **standalone, multi-tenant** HubSpot MCP that Content Cucumber owns — so it can serve CC plus every client portal, and so we are not dependent on HubSpot's own server. As of v0.3.0 it ports the official server's **core CRM tools** (search, read, create, update, properties, associations, schemas, workflows) alongside the marketing/sequence/workflow add-ons it already had:

- **Core CRM** (new in v0.3.0): search, list, batch read, create, update, batch create/update objects; list/get/create/update properties; schemas; list/get-definition/batch-create associations; list/get workflows; account details
- Marketing email management (list, create, update, clone, delete)
- Email statistics and performance data
- Sales sequences (list, view, enroll contacts)
- Workflow enrollment (enroll/unenroll contacts)

Once core-CRM parity is fully exercised and multi-tenant client routing lands, the official `@hubspot/mcp-server` entry can be retired (see backlog `6a3ec7413fd534dd5e72ba75`).

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

## Multi-Tenant Routing (v0.5.0)

One server, many client portals. Tokens come from two sources, merged:

1. `HUBSPOT_ACCESS_TOKEN` — becomes the **default client** (`HUBSPOT_DEFAULT_CLIENT`, defaults to `cc`)
2. `HUBSPOT_TOKENS_FILE` — path to a **chmod-600 JSON file** mapping client slugs to tokens:

```json
{
  "cc": "pat-na1-...",
  "acme": "pat-na1-...",
  "globex": "pat-na1-..."
}
```

Every tool accepts an optional `client` slug. Resolution is **strict**:

- `client` omitted → the default client (`cc`).
- `client` is a known slug → that portal's token.
- `client` is an **unknown** slug → **hard error**. The server never silently falls back to another portal — a wrong-portal write must fail loudly, not land quietly on the wrong client.

Backward compatible: with only `HUBSPOT_ACCESS_TOKEN` set (no tokens file), the server behaves exactly as a single-portal server for client `cc`.

To add a client: create/extend the chmod-600 JSON file with the new slug→token, and set `HUBSPOT_TOKENS_FILE` in the server's `.mcp.json` env block (do **not** hardcode tokens in `.mcp.json`).

## Available Tools

### Core CRM (v0.3.0)

| Tool | Description |
|------|-------------|
| `hubspot_search_objects` | Search any object type with filter groups, sorts, properties |
| `hubspot_list_objects` | List records of an object type |
| `hubspot_batch_read_objects` | Read multiple records by id (or unique property) |
| `hubspot_create_object` | Create a single record |
| `hubspot_update_object` | Update a single record by id |
| `hubspot_batch_create_objects` | Create multiple records |
| `hubspot_batch_update_objects` | Update multiple records |
| `hubspot_list_properties` | List property definitions for an object type |
| `hubspot_get_property` | Get one property definition |
| `hubspot_create_property` | Create a property |
| `hubspot_update_property` | Update a property |
| `hubspot_get_schemas` | List CRM object schemas (incl. custom objects) |
| `hubspot_list_associations` | List records associated with a record |
| `hubspot_get_association_definitions` | List association labels between two object types |
| `hubspot_batch_create_associations` | Create multiple associations |
| `hubspot_list_workflows` | List automation workflows |
| `hubspot_get_workflow` | Get one workflow |
| `hubspot_get_account_details` | Connected portal info (id, time zone, currency) |

> Engagements (tasks, notes, calls, emails, meetings) are CRM objects — use the object tools with the matching `objectType` instead of dedicated engagement tools.
>
> **Not yet ported:** `get_link` / `generate_feedback_link` (HubSpot-MCP UI deep-link conveniences). `get_user_details` is approximated by `hubspot_get_account_details`.

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
| CRM Objects | Read + write | Read + write (v0.3.0) |
| Properties / Schemas / Associations | Yes | Yes (v0.3.0) |
| Workflows | List, Get | List, Get, Enroll, Unenroll |
| Marketing Emails | - | Full CRUD |
| Sequences | - | List, Get, Enroll |
| Multi-tenant (many portals) | No (single portal) | Planned |

Goal: once parity is fully exercised and multi-tenant routing lands, this server replaces the official one entirely.

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

### v0.5.0
- Multi-tenant token routing: `{clientSlug: token}` from a chmod-600 `HUBSPOT_TOKENS_FILE`, plus the legacy `HUBSPOT_ACCESS_TOKEN` as the default client. Per-request token context via `AsyncLocalStorage` (concurrency-safe).
- Every tool accepts an optional `client` slug. Unknown slug = hard error; no silent fallback to another portal (so a wrong-portal write fails loudly).
- Backward compatible: single-token setups are unchanged (default client `cc`).

### v0.4.0
- Added `hubspot_get_user_details` (token info + resolved owner + account info, mirroring the official tool; uses the private-app token-info endpoint since OAuth introspection returns null for `pat-` tokens) and `hubspot_create_engagement` (NOTE/TASK/etc. with associations, same input shape as the official tool)
- Verified write parity against the live CC portal (created + deleted a NOTE engagement; user-details resolves ownerId 378618219)
- **This server is now the sole HubSpot MCP.** All workspace consumers (skills, commands, brent-start routine steps 4 & 9.96) were re-pointed from `mcp__hubspot__*` to `mcp__hubspot-extended__*`, and the official `@hubspot/mcp-server` entry was removed from `.mcp.json`

### v0.3.0
- Ported core CRM tools from the official server: search/list/batch-read/create/update/batch-create/batch-update objects, list/get/create/update properties, schemas, list/get-definition/batch-create associations, list/get workflows, account details
- Verified read-path parity against the live CC portal (past-due-tasks search returns the same count, 38, as the official server)
- Step toward retiring `@hubspot/mcp-server` (backlog `6a3ec7413fd534dd5e72ba75`)

### v0.2.0
- Added sequences tools (list, get, enroll, unenroll)
- Added workflow enrollment tools

### v0.1.0
- Initial release with marketing email tools

## License

MIT
