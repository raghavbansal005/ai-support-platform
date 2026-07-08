import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { kbRouter } from "./routes/kb.routes";
import { aiConfigRouter } from "./routes/aiConfig.routes";
import { chatRouter } from "./routes/chat.routes";
import { ticketsRouter } from "./routes/tickets.routes";
import { conversationsRouter } from "./routes/conversations.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { businessRouter } from "./routes/business.routes";

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // widget is embedded cross-origin on customer sites
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Admin-facing API (JWT auth)
app.use("/api/auth", authRouter);
app.use("/api/business", businessRouter);
app.use("/api/knowledge-base", kbRouter);
app.use("/api/ai-config", aiConfigRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/analytics", analyticsRouter);

// Public widget-facing API (keyed by widgetKey, no JWT)
app.use("/api/chat", chatRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Support Platform API listening on :${env.port}`);
});
