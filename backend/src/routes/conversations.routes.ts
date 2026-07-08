import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { fromJson, toJson } from "../lib/json";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

// List + search conversations. `q` matches customer name/email or message content.
conversationsRouter.get("/", async (req, res) => {
  const { q, escalated, channel } = req.query as { q?: string; escalated?: string; channel?: string };

  const conversations = await prisma.conversation.findMany({
    where: {
      businessId: req.auth!.businessId,
      ...(escalated ? { escalated: escalated === "true" } : {}),
      ...(channel ? { channel: channel as any } : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q } },
              { customerEmail: { contains: q } },
              { messages: { some: { content: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      tickets: { select: { id: true, status: true, priority: true } },
    },
  });

  res.json({ conversations });
});

conversationsRouter.get("/:id", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, businessId: req.auth!.businessId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      tickets: true,
      escalation: true,
    },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  res.json({
    conversation: {
      ...conversation,
      messages: conversation.messages.map((m: (typeof conversation.messages)[number]) => ({
        ...m,
        richContent: fromJson(m.richContent, { type: "text" }),
        sources: fromJson(m.sources, []),
      })),
    },
  });
});

// Admin sends a message directly into a conversation (human handoff).
conversationsRouter.post("/:id/reply", async (req, res) => {
  const { message } = req.body as { message: string };
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, businessId: req.auth!.businessId },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const created = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: message,
      richContent: toJson({ type: "text" }),
    },
  });
  res.status(201).json({ message: { ...created, richContent: { type: "text" } } });
});
