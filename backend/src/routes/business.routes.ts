import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";
import { fromJson } from "../lib/json";

export const businessRouter = Router();
businessRouter.use(requireAuth);

businessRouter.get("/me", async (req, res) => {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: req.auth!.businessId },
    include: { aiConfig: true },
  });
  res.json({
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      widgetKey: business.widgetKey,
    },
    aiConfig: business.aiConfig
      ? { ...business.aiConfig, escalationRules: fromJson<string[]>(business.aiConfig.escalationRules, []) }
      : null,
    embedSnippet: `<script src="${env.frontendUrl}/widget.js" data-widget-key="${business.widgetKey}" data-api-url="${env.publicApiUrl}" async></script>`,
  });
});
