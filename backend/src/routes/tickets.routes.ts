import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { sortByPriorityDesc } from "../lib/priority";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (req, res) => {
  const { status, priority } = req.query as { status?: string; priority?: string };
  const tickets = await prisma.ticket.findMany({
    where: {
      businessId: req.auth!.businessId,
      ...(status ? { status: status as any } : {}),
      ...(priority ? { priority: priority as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  // "priority" is a plain string column (no native enum in SQLite), so severity ordering is
  // applied in app code rather than relying on alphabetical DB sort order.
  res.json({ tickets: sortByPriorityDesc(tickets) });
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

ticketsRouter.patch("/:id", async (req, res) => {
  const body = updateSchema.parse(req.body);
  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const updated = await prisma.ticket.update({ where: { id: ticket.id }, data: body });
  res.json({ ticket: updated });
});

// Manual ticket creation (e.g. from an admin fielding an email/phone request directly).
const createSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  query: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

ticketsRouter.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const ticket = await prisma.ticket.create({ data: { ...body, businessId: req.auth!.businessId } });
  res.status(201).json({ ticket });
});
