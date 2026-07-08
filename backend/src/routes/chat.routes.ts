import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errorHandler";
import { embedQuery } from "../services/embedding.service";
import { searchSimilarChunks } from "../lib/vectorSearch";
import { generateAssistantReply, HistoryMessage } from "../services/ai.service";
import { fromJson, toJson } from "../lib/json";

export const chatRouter = Router();

async function getBusinessByWidgetKey(widgetKey: string) {
  const business = await prisma.business.findUnique({ where: { widgetKey }, include: { aiConfig: true } });
  if (!business || !business.aiConfig) throw new ApiError(404, "Unknown widget key");
  return business;
}

// Public bootstrap config for the widget (bot name, welcome message, suggested questions).
chatRouter.get("/:widgetKey/config", async (req, res) => {
  const business = await getBusinessByWidgetKey(req.params.widgetKey);
  res.json({
    botName: business.aiConfig!.botName,
    welcomeMessage: business.aiConfig!.welcomeMessage,
    businessName: business.name,
    suggestedQuestions: ["Track my order", "Pricing", "Refund policy", "Contact support"],
  });
});

chatRouter.get("/:widgetKey/history/:sessionId", async (req, res) => {
  const business = await getBusinessByWidgetKey(req.params.widgetKey);
  const conversation = await prisma.conversation.findFirst({
    where: { businessId: business.id, customerIdentifier: req.params.sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  res.json({
    conversation: conversation
      ? {
          ...conversation,
          messages: conversation.messages.map((m: (typeof conversation.messages)[number]) => ({
            ...m,
            richContent: fromJson(m.richContent, { type: "text" }),
            sources: fromJson(m.sources, []),
          })),
        }
      : null,
  });
});

const messageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

chatRouter.post("/:widgetKey/message", async (req, res) => {
  const business = await getBusinessByWidgetKey(req.params.widgetKey);
  const body = messageSchema.parse(req.body);

  let conversation = await prisma.conversation.findFirst({
    where: { businessId: business.id, customerIdentifier: body.sessionId },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        customerIdentifier: body.sessionId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        channel: "WIDGET",
      },
    });
  } else if (body.customerEmail || body.customerName) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { customerName: body.customerName ?? conversation.customerName, customerEmail: body.customerEmail ?? conversation.customerEmail },
    });
  }

  const priorMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20, // recent window keeps latency/cost predictable
  });
  const history: HistoryMessage[] = priorMessages.map((m: (typeof priorMessages)[number]) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: body.message },
  });

  const queryEmbedding = await embedQuery(body.message);
  const chunks = await searchSimilarChunks(business.id, queryEmbedding, 5);

  const decision = await generateAssistantReply(
    {
      botName: business.aiConfig!.botName,
      welcomeMessage: business.aiConfig!.welcomeMessage,
      personality: business.aiConfig!.personality,
      model: business.aiConfig!.model,
      escalationRules: fromJson<string[]>(business.aiConfig!.escalationRules, []),
    },
    history,
    body.message,
    chunks
  );

  const usedSourceDocs = chunks.filter((c) => decision.usedSources.includes(c.filename));

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: decision.message,
      richContent: toJson(decision.richContent),
      sources: toJson(usedSourceDocs.map((c) => ({ documentId: c.documentId, filename: c.filename }))),
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), escalated: conversation.escalated || decision.escalate },
  });

  if (decision.escalate) {
    await prisma.escalationEvent.create({
      data: {
        conversationId: conversation.id,
        reason: decision.escalationReason ?? "Flagged by AI",
        priority: decision.escalationPriority ?? "MEDIUM",
      },
    });
  }

  let ticket = null;
  if (decision.createTicket) {
    ticket = await prisma.ticket.create({
      data: {
        businessId: business.id,
        conversationId: conversation.id,
        customerName: body.customerName ?? conversation.customerName ?? "Unknown",
        customerEmail: body.customerEmail ?? conversation.customerEmail ?? "unknown@example.com",
        query: body.message,
        priority: decision.ticketPriority ?? decision.escalationPriority ?? "MEDIUM",
        status: "OPEN",
      },
    });
  }

  res.json({
    conversationId: conversation.id,
    message: {
      id: assistantMessage.id,
      role: "ASSISTANT",
      content: decision.message,
      richContent: decision.richContent,
      createdAt: assistantMessage.createdAt,
    },
    escalated: decision.escalate,
    ticket,
    suggestedFollowups: decision.suggestedFollowups,
  });
});
