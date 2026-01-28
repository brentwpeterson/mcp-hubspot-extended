#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Get HubSpot access token from environment
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API_BASE = "https://api.hubapi.com";

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error("Error: HUBSPOT_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

// Helper function for HubSpot API requests
async function hubspotRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HubSpot API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses (like 204 No Content)
  const text = await response.text();
  if (!text) {
    return { success: true };
  }

  return JSON.parse(text);
}

// Define available tools
const tools: Tool[] = [
  {
    name: "hubspot_list_marketing_emails",
    description: "List marketing emails from HubSpot. Returns email campaigns with their IDs, names, subjects, and status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of emails to return (default: 20, max: 100)",
          default: 20,
        },
        after: {
          type: "string",
          description: "Pagination cursor for next page of results",
        },
        createdAfter: {
          type: "string",
          description: "ISO8601 date to filter emails created after this date",
        },
        createdBefore: {
          type: "string",
          description: "ISO8601 date to filter emails created before this date",
        },
        updatedAfter: {
          type: "string",
          description: "ISO8601 date to filter emails updated after this date",
        },
        updatedBefore: {
          type: "string",
          description: "ISO8601 date to filter emails updated before this date",
        },
      },
    },
  },
  {
    name: "hubspot_get_marketing_email",
    description: "Get details of a specific marketing email by ID. Returns full email content including HTML body, subject, and metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the marketing email to retrieve",
        },
      },
      required: ["emailId"],
    },
  },
  {
    name: "hubspot_create_marketing_email",
    description: "Create a new marketing email in HubSpot. Requires name, subject, and content.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Internal name for the email (not shown to recipients)",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        senderName: {
          type: "string",
          description: "Name shown as the sender",
        },
        senderEmail: {
          type: "string",
          description: "Email address shown as the sender",
        },
        replyTo: {
          type: "string",
          description: "Reply-to email address",
        },
        htmlContent: {
          type: "string",
          description: "HTML content of the email body",
        },
        templatePath: {
          type: "string",
          description: "Path to HubSpot template (e.g., '@hubspot/email/dnd/welcome.html')",
        },
      },
      required: ["name", "subject"],
    },
  },
  {
    name: "hubspot_update_marketing_email",
    description: "Update an existing marketing email. Only include fields you want to change.",
    inputSchema: {
      type: "object" as const,
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the marketing email to update",
        },
        name: {
          type: "string",
          description: "Internal name for the email",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        senderName: {
          type: "string",
          description: "Name shown as the sender",
        },
        senderEmail: {
          type: "string",
          description: "Email address shown as the sender",
        },
        replyTo: {
          type: "string",
          description: "Reply-to email address",
        },
        htmlContent: {
          type: "string",
          description: "HTML content of the email body",
        },
      },
      required: ["emailId"],
    },
  },
  {
    name: "hubspot_clone_marketing_email",
    description: "Clone an existing marketing email to create a new one based on it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the marketing email to clone",
        },
        newName: {
          type: "string",
          description: "Name for the cloned email",
        },
      },
      required: ["emailId", "newName"],
    },
  },
  {
    name: "hubspot_delete_marketing_email",
    description: "Delete a marketing email. This action cannot be undone.",
    inputSchema: {
      type: "object" as const,
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the marketing email to delete",
        },
      },
      required: ["emailId"],
    },
  },
  {
    name: "hubspot_get_marketing_email_statistics",
    description: "Get performance statistics for a marketing email (opens, clicks, bounces, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the marketing email to get statistics for",
        },
      },
      required: ["emailId"],
    },
  },
  // Sequences tools
  {
    name: "hubspot_list_sequences",
    description: "List all sales sequences in your HubSpot account. Requires Sales Hub Professional or Enterprise.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of sequences to return (default: 20)",
          default: 20,
        },
        after: {
          type: "string",
          description: "Pagination cursor for next page of results",
        },
        userId: {
          type: "string",
          description: "HubSpot owner ID (required for sequences API). Get this from the Owners API or your HubSpot user settings.",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "hubspot_get_sequence",
    description: "Get details of a specific sequence including its steps and settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sequenceId: {
          type: "string",
          description: "The ID of the sequence to retrieve",
        },
        userId: {
          type: "string",
          description: "HubSpot owner ID (required for sequences API)",
        },
      },
      required: ["sequenceId", "userId"],
    },
  },
  {
    name: "hubspot_enroll_in_sequence",
    description: "Enroll a contact in a sales sequence. Limit of 1000 enrollments per portal inbox per day.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sequenceId: {
          type: "string",
          description: "The ID of the sequence to enroll the contact in",
        },
        contactId: {
          type: "string",
          description: "The ID of the contact to enroll",
        },
        senderEmail: {
          type: "string",
          description: "The email address to send from (must be a connected inbox in HubSpot)",
        },
        userId: {
          type: "string",
          description: "HubSpot owner ID (required for sequences API)",
        },
      },
      required: ["sequenceId", "contactId", "senderEmail", "userId"],
    },
  },
  {
    name: "hubspot_get_sequence_enrollment",
    description: "Check if a contact is currently enrolled in any sequences.",
    inputSchema: {
      type: "object" as const,
      properties: {
        contactId: {
          type: "string",
          description: "The ID of the contact to check enrollment status for",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "hubspot_unenroll_from_sequence",
    description: "Unenroll a contact from a sequence they are currently enrolled in.",
    inputSchema: {
      type: "object" as const,
      properties: {
        enrollmentId: {
          type: "string",
          description: "The enrollment ID (get this from hubspot_get_sequence_enrollment)",
        },
      },
      required: ["enrollmentId"],
    },
  },
  // Workflow enrollment tools
  {
    name: "hubspot_enroll_in_workflow",
    description: "Enroll a contact in a workflow. Only works with contact-based workflows.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: {
          type: "string",
          description: "The ID of the workflow to enroll the contact in",
        },
        contactId: {
          type: "string",
          description: "The ID of the contact to enroll",
        },
      },
      required: ["workflowId", "contactId"],
    },
  },
  {
    name: "hubspot_unenroll_from_workflow",
    description: "Unenroll a contact from a workflow they are currently enrolled in.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflowId: {
          type: "string",
          description: "The ID of the workflow to unenroll the contact from",
        },
        contactId: {
          type: "string",
          description: "The ID of the contact to unenroll",
        },
      },
      required: ["workflowId", "contactId"],
    },
  },
];

// Tool handlers
async function listMarketingEmails(args: {
  limit?: number;
  after?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}): Promise<unknown> {
  const params = new URLSearchParams();

  if (args.limit) params.append("limit", String(Math.min(args.limit, 100)));
  if (args.after) params.append("after", args.after);
  if (args.createdAfter) params.append("createdAfter", args.createdAfter);
  if (args.createdBefore) params.append("createdBefore", args.createdBefore);
  if (args.updatedAfter) params.append("updatedAfter", args.updatedAfter);
  if (args.updatedBefore) params.append("updatedBefore", args.updatedBefore);

  const queryString = params.toString();
  const endpoint = `/marketing/v3/emails${queryString ? `?${queryString}` : ""}`;

  return hubspotRequest(endpoint);
}

async function getMarketingEmail(emailId: string): Promise<unknown> {
  return hubspotRequest(`/marketing/v3/emails/${emailId}`);
}

async function createMarketingEmail(args: {
  name: string;
  subject: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  htmlContent?: string;
  templatePath?: string;
}): Promise<unknown> {
  const payload: Record<string, unknown> = {
    name: args.name,
    subject: args.subject,
  };

  if (args.senderName) payload.fromName = args.senderName;
  if (args.senderEmail) payload.from = args.senderEmail;
  if (args.replyTo) payload.replyTo = args.replyTo;
  if (args.templatePath) payload.templatePath = args.templatePath;

  // Handle HTML content - HubSpot expects it in a specific structure
  if (args.htmlContent) {
    payload.content = {
      widgets: {
        hs_email_body: {
          body: {
            html: args.htmlContent,
          },
        },
      },
    };
  }

  return hubspotRequest("/marketing/v3/emails", "POST", payload);
}

async function updateMarketingEmail(args: {
  emailId: string;
  name?: string;
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  htmlContent?: string;
}): Promise<unknown> {
  const payload: Record<string, unknown> = {};

  if (args.name) payload.name = args.name;
  if (args.subject) payload.subject = args.subject;
  if (args.senderName) payload.fromName = args.senderName;
  if (args.senderEmail) payload.from = args.senderEmail;
  if (args.replyTo) payload.replyTo = args.replyTo;

  if (args.htmlContent) {
    payload.content = {
      widgets: {
        hs_email_body: {
          body: {
            html: args.htmlContent,
          },
        },
      },
    };
  }

  return hubspotRequest(`/marketing/v3/emails/${args.emailId}`, "PATCH", payload);
}

async function cloneMarketingEmail(emailId: string, newName: string): Promise<unknown> {
  // First get the original email
  const original = await getMarketingEmail(emailId) as Record<string, unknown>;

  // Create a clone with the new name
  const clonePayload = {
    name: newName,
    subject: original.subject,
    fromName: original.fromName,
    from: original.from,
    replyTo: original.replyTo,
    content: original.content,
    templatePath: original.templatePath,
  };

  return hubspotRequest("/marketing/v3/emails", "POST", clonePayload);
}

async function deleteMarketingEmail(emailId: string): Promise<unknown> {
  return hubspotRequest(`/marketing/v3/emails/${emailId}`, "DELETE");
}

async function getMarketingEmailStatistics(emailId: string): Promise<unknown> {
  return hubspotRequest(`/marketing/v3/emails/${emailId}/statistics`);
}

// Sequences handlers
async function listSequences(args: {
  limit?: number;
  after?: string;
  userId: string;
}): Promise<unknown> {
  const params = new URLSearchParams();
  params.append("userId", args.userId);
  if (args.limit) params.append("limit", String(args.limit));
  if (args.after) params.append("after", args.after);

  return hubspotRequest(`/automation/v4/sequences?${params.toString()}`);
}

async function getSequence(sequenceId: string, userId: string): Promise<unknown> {
  const params = new URLSearchParams();
  params.append("userId", userId);

  return hubspotRequest(`/automation/v4/sequences/${sequenceId}?${params.toString()}`);
}

async function enrollInSequence(args: {
  sequenceId: string;
  contactId: string;
  senderEmail: string;
  userId: string;
}): Promise<unknown> {
  const params = new URLSearchParams();
  params.append("userId", args.userId);

  const payload = {
    sequenceId: args.sequenceId,
    contactId: args.contactId,
    senderEmail: args.senderEmail,
  };

  return hubspotRequest(`/automation/v4/sequences/enrollments?${params.toString()}`, "POST", payload);
}

async function getSequenceEnrollment(contactId: string): Promise<unknown> {
  return hubspotRequest(`/automation/v4/sequences/enrollments/contact/${contactId}`);
}

async function unenrollFromSequence(enrollmentId: string): Promise<unknown> {
  return hubspotRequest(`/automation/v4/sequences/enrollments/${enrollmentId}`, "DELETE");
}

// Workflow handlers
async function enrollInWorkflow(workflowId: string, contactId: string): Promise<unknown> {
  // Use v3 endpoint for enrollment
  return hubspotRequest(
    `/automation/v3/workflows/${workflowId}/enrollments/contacts/${contactId}`,
    "POST"
  );
}

async function unenrollFromWorkflow(workflowId: string, contactId: string): Promise<unknown> {
  return hubspotRequest(
    `/automation/v3/workflows/${workflowId}/enrollments/contacts/${contactId}`,
    "DELETE"
  );
}

// Create and configure the MCP server
const server = new Server(
  {
    name: "hubspot-extended",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "hubspot_list_marketing_emails":
        result = await listMarketingEmails(args as Parameters<typeof listMarketingEmails>[0]);
        break;

      case "hubspot_get_marketing_email":
        result = await getMarketingEmail((args as { emailId: string }).emailId);
        break;

      case "hubspot_create_marketing_email":
        result = await createMarketingEmail(args as Parameters<typeof createMarketingEmail>[0]);
        break;

      case "hubspot_update_marketing_email":
        result = await updateMarketingEmail(args as Parameters<typeof updateMarketingEmail>[0]);
        break;

      case "hubspot_clone_marketing_email":
        result = await cloneMarketingEmail(
          (args as { emailId: string; newName: string }).emailId,
          (args as { emailId: string; newName: string }).newName
        );
        break;

      case "hubspot_delete_marketing_email":
        result = await deleteMarketingEmail((args as { emailId: string }).emailId);
        break;

      case "hubspot_get_marketing_email_statistics":
        result = await getMarketingEmailStatistics((args as { emailId: string }).emailId);
        break;

      // Sequences
      case "hubspot_list_sequences":
        result = await listSequences(args as Parameters<typeof listSequences>[0]);
        break;

      case "hubspot_get_sequence":
        result = await getSequence(
          (args as { sequenceId: string; userId: string }).sequenceId,
          (args as { sequenceId: string; userId: string }).userId
        );
        break;

      case "hubspot_enroll_in_sequence":
        result = await enrollInSequence(args as Parameters<typeof enrollInSequence>[0]);
        break;

      case "hubspot_get_sequence_enrollment":
        result = await getSequenceEnrollment((args as { contactId: string }).contactId);
        break;

      case "hubspot_unenroll_from_sequence":
        result = await unenrollFromSequence((args as { enrollmentId: string }).enrollmentId);
        break;

      // Workflows
      case "hubspot_enroll_in_workflow":
        result = await enrollInWorkflow(
          (args as { workflowId: string; contactId: string }).workflowId,
          (args as { workflowId: string; contactId: string }).contactId
        );
        break;

      case "hubspot_unenroll_from_workflow":
        result = await unenrollFromWorkflow(
          (args as { workflowId: string; contactId: string }).workflowId,
          (args as { workflowId: string; contactId: string }).contactId
        );
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HubSpot Extended MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
