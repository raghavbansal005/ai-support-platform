import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import type { SimilarChunk } from "../lib/vectorSearch";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

export interface AIConfigLike {
  botName: string;
  welcomeMessage: string;
  personality: string;
  model: string;
  escalationRules: string[];
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RichContent {
  type: "text" | "list" | "table" | "card" | "links";
  // list
  items?: string[];
  // table
  headers?: string[];
  rows?: string[][];
  // card
  title?: string;
  description?: string;
  // links
  links?: { label: string; url: string }[];
}

export interface AssistantDecision {
  message: string;
  richContent: RichContent;
  escalate: boolean;
  escalationReason: string | null;
  escalationPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  createTicket: boolean;
  ticketPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  suggestedFollowups: string[];
  usedSources: string[]; // document filenames actually relied on
}

const RESPONSE_TOOL = {
  name: "respond_to_customer",
  description:
    "Send a structured reply to the customer and report any escalation/ticket decisions. Always call this tool exactly once.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Plain-text version of the reply, always populated even when richContent is used.",
      },
      richContent: {
        type: "object",
        description: "Optional structured rendering. Use 'text' for plain replies.",
        properties: {
          type: { type: "string", enum: ["text", "list", "table", "card", "links"] },
          items: { type: "array", items: { type: "string" } },
          headers: { type: "array", items: { type: "string" } },
          rows: { type: "array", items: { type: "array", items: { type: "string" } } },
          title: { type: "string" },
          description: { type: "string" },
          links: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, url: { type: "string" } },
              required: ["label", "url"],
            },
          },
        },
        required: ["type"],
      },
      escalate: { type: "boolean", description: "True if this conversation should be flagged for human review." },
      escalationReason: { type: ["string", "null"] },
      escalationPriority: { type: ["string", "null"], enum: ["LOW", "MEDIUM", "HIGH", "URGENT", null] },
      createTicket: {
        type: "boolean",
        description: "True if the AI could not resolve the issue and a support ticket should be created.",
      },
      ticketPriority: { type: ["string", "null"], enum: ["LOW", "MEDIUM", "HIGH", "URGENT", null] },
      suggestedFollowups: {
        type: "array",
        items: { type: "string" },
        description: "0-4 short follow-up questions the customer might ask next.",
      },
      usedSources: {
        type: "array",
        items: { type: "string" },
        description: "Filenames of knowledge-base documents actually used to ground this answer, if any.",
      },
    },
    required: ["message", "richContent", "escalate", "createTicket", "suggestedFollowups", "usedSources"],
  },
} as const;

function buildSystemPrompt(config: AIConfigLike, chunks: SimilarChunk[]): string {
  const knowledge = chunks.length
    ? chunks
        .map((c, i) => `[Source ${i + 1}: ${c.filename}]\n${c.content}`)
        .join("\n\n---\n\n")
    : "(No relevant knowledge-base content was retrieved for this query.)";

  return `You are ${config.botName}, an AI customer support assistant. Personality: ${config.personality}.

Ground every factual answer in the knowledge base excerpts below. If the excerpts don't contain the answer, say you don't have that information rather than guessing, and consider setting createTicket=true.

Escalate (escalate=true) when the customer's message matches any of these rules: ${config.escalationRules.join(", ")}. Also escalate for anything involving anger, threats, legal action, safety, or an explicit request for a human.

When escalate=true, also set createTicket=true so a human can follow up, unless a ticket already clearly exists for this exact issue in the conversation.

Prefer richContent.type = "list" for steps/options, "table" for comparisons/structured data, "card" for a single highlighted item (e.g. an order or a plan), "links" when pointing to URLs, and "text" for plain prose. Keep the plain-text "message" field populated always, as a readable fallback of the same content.

Knowledge base excerpts:
${knowledge}`;
}

export async function generateAssistantReply(
  config: AIConfigLike,
  history: HistoryMessage[],
  userMessage: string,
  chunks: SimilarChunk[]
): Promise<AssistantDecision> {
  const system = buildSystemPrompt(config, chunks);

  const response = await anthropic.messages.create({
    model: config.model || env.anthropicModel,
    max_tokens: 1024,
    system,
    messages: [...history, { role: "user", content: userMessage }],
    tools: [RESPONSE_TOOL as any],
    tool_choice: { type: "tool", name: "respond_to_customer" },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    // Fallback: shouldn't happen with forced tool_choice, but guard anyway.
    const text = response.content.find((b) => b.type === "text");
    return {
      message: text && "text" in text ? text.text : "I'm sorry, something went wrong. A team member will follow up.",
      richContent: { type: "text" },
      escalate: true,
      escalationReason: "AI response format error",
      escalationPriority: "MEDIUM",
      createTicket: true,
      ticketPriority: "MEDIUM",
      suggestedFollowups: [],
      usedSources: [],
    };
  }

  const input = toolUse.input as any;
  return {
    message: input.message,
    richContent: input.richContent ?? { type: "text" },
    escalate: !!input.escalate,
    escalationReason: input.escalationReason ?? null,
    escalationPriority: input.escalationPriority ?? null,
    createTicket: !!input.createTicket,
    ticketPriority: input.ticketPriority ?? null,
    suggestedFollowups: input.suggestedFollowups ?? [],
    usedSources: input.usedSources ?? [],
  };
}
