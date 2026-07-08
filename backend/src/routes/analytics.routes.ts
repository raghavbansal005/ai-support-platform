import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { sortByPriorityDesc } from "../lib/priority";
import { fromJson } from "../lib/json";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// Top-level dashboard summary cards.
analyticsRouter.get("/dashboard", async (req, res) => {
  const businessId = req.auth!.businessId;

  const [totalConversations, openTickets, resolvedTickets, escalatedConversations, totalConversationsForRate] =
    await Promise.all([
      prisma.conversation.count({ where: { businessId } }),
      prisma.ticket.count({ where: { businessId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.ticket.count({ where: { businessId, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.conversation.count({ where: { businessId, escalated: true } }),
      prisma.conversation.count({ where: { businessId } }),
    ]);

  const aiResolutionRate =
    totalConversationsForRate === 0
      ? 0
      : Math.round(((totalConversationsForRate - escalatedConversations) / totalConversationsForRate) * 1000) / 10;

  res.json({
    totalConversations,
    openTickets,
    resolvedTickets,
    escalatedTickets: escalatedConversations,
    aiResolutionRate, // percentage, e.g. 82.4
  });
});

// Escalation dashboard: breakdown by priority + recent list.
analyticsRouter.get("/escalations", async (req, res) => {
  const businessId = req.auth!.businessId;

  const grouped = await prisma.ticket.groupBy({
    by: ["priority"],
    where: { businessId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    _count: { _all: true },
  });

  const counts = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  for (const g of grouped) counts[g.priority] = g._count._all;

  const recent = await prisma.ticket.findMany({
    where: { businessId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ counts, recent: sortByPriorityDesc(recent) });
});

// Full analytics dashboard: chat metrics + knowledge base metrics.
analyticsRouter.get("/", async (req, res) => {
  const businessId = req.auth!.businessId;

  const totalConversations = await prisma.conversation.count({ where: { businessId } });
  const escalatedCount = await prisma.conversation.count({ where: { businessId, escalated: true } });
  const escalationRate = totalConversations === 0 ? 0 : Math.round((escalatedCount / totalConversations) * 1000) / 10;

  const resolvedTicketCount = await prisma.ticket.count({ where: { businessId, status: { in: ["RESOLVED", "CLOSED"] } } });
  const totalTicketCount = await prisma.ticket.count({ where: { businessId } });
  const resolutionRate = totalTicketCount === 0 ? 100 : Math.round((resolvedTicketCount / totalTicketCount) * 1000) / 10;

  // Avg response time: gap between each USER message and the next ASSISTANT message in the
  // same conversation. Computed in-app (rather than a DB-specific raw query) so it works the
  // same on SQLite as it would on any other database.
  const recentMessages = await prisma.message.findMany({
    where: { conversation: { businessId } },
    select: { conversationId: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });

  const byConversation = new Map<string, { role: string; createdAt: Date }[]>();
  for (const m of recentMessages) {
    const list = byConversation.get(m.conversationId) ?? [];
    list.push(m);
    byConversation.set(m.conversationId, list);
  }

  const diffs: number[] = [];
  for (const messages of byConversation.values()) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== "USER") continue;
      const nextAssistant = messages.slice(i + 1).find((m) => m.role === "ASSISTANT");
      if (nextAssistant) {
        diffs.push(nextAssistant.createdAt.getTime() - messages[i].createdAt.getTime());
      }
    }
  }
  const avgResponseTimeMs = diffs.length ? Math.round(diffs.reduce((sum, d) => sum + d, 0) / diffs.length) : 0;

  // Knowledge base metrics computed from message.sources jsonb.
  const assistantMessages = await prisma.message.findMany({
    where: { conversation: { businessId }, role: "ASSISTANT" },
    select: { sources: true, content: true },
    take: 5000,
    orderBy: { createdAt: "desc" },
  });

  const referenceCounts = new Map<string, number>();
  const unanswered: string[] = [];
  for (const m of assistantMessages) {
    const sources = fromJson<{ documentId: string; filename: string }[]>(m.sources, []);
    if (sources.length === 0) {
      if (unanswered.length < 20) unanswered.push(m.content.slice(0, 200));
    } else {
      for (const s of sources) {
        referenceCounts.set(s.filename, (referenceCounts.get(s.filename) ?? 0) + 1);
      }
    }
  }
  const mostReferencedDocuments = [...referenceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([filename, count]) => ({ filename, count }));

  res.json({
    chatMetrics: {
      totalConversations,
      avgResponseTimeMs,
      resolutionRate,
      escalationRate,
    },
    knowledgeBaseMetrics: {
      mostReferencedDocuments,
      failedQueries: unanswered.length,
      unansweredQuestions: unanswered,
    },
  });
});
