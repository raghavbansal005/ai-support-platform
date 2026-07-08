import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { fromJson, toJson } from "../lib/json";

export const aiConfigRouter = Router();
aiConfigRouter.use(requireAuth);

function serialize(config: any) {
  return { ...config, escalationRules: fromJson<string[]>(config.escalationRules, []) };
}

aiConfigRouter.get("/", async (req, res) => {
  const config = await prisma.aIConfig.findUnique({ where: { businessId: req.auth!.businessId } });
  res.json({ config: config ? serialize(config) : null });
});

const updateSchema = z.object({
  botName: z.string().min(1).max(60).optional(),
  welcomeMessage: z.string().min(1).max(500).optional(),
  personality: z.enum(["Professional", "Friendly", "Technical"]).optional(),
  model: z.string().optional(),
  escalationRules: z.array(z.string()).optional(),
});

aiConfigRouter.put("/", async (req, res) => {
  const body = updateSchema.parse(req.body);
  const config = await prisma.aIConfig.update({
    where: { businessId: req.auth!.businessId },
    data: { ...body, escalationRules: body.escalationRules ? toJson(body.escalationRules) : undefined },
  });
  res.json({ config: serialize(config) });
});
