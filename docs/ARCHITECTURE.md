# Architecture

## Overview

A multi-tenant SaaS platform. Each **Business** (tenant) has its own knowledge base, AI
configuration, conversations, and tickets — fully isolated by `businessId` on every
tenant-scoped table and enforced in every query (never trusting a client-supplied tenant ID;
it always comes from the JWT).

```
                                   ┌─────────────────────────┐
                                   │   Admin (business)      │
                                   │   React (Vite) console   │
                                   │   - KB upload/manage     │
                                   │   - AI config             │
                                   │   - Tickets/Escalations  │
                                   │   - Conversations/search │
                                   │   - Analytics             │
                                   └────────────┬─────────────┘
                                                │ JWT (Bearer)
                                                ▼
┌──────────────┐   embed <script>   ┌─────────────────────────────────────────┐
│  Customer's  │ ─────────────────► │            Express + TypeScript API       │
│  website     │                    │                                           │
│  (widget.js) │ ◄───────────────── │  /api/auth        register/login/reset   │
└──────────────┘   REST (widgetKey) │  /api/business    profile + embed key     │
                                     │  /api/knowledge-base  upload/list/reindex │
                                     │  /api/ai-config   personality/rules       │
                                     │  /api/chat/:key   PUBLIC - RAG pipeline   │
                                     │  /api/tickets     CRUD + status           │
                                     │  /api/conversations  search + handoff     │
                                     │  /api/analytics   dashboard/escalations   │
                                     └───────┬───────────────────┬───────────────┘
                                             │                   │
                     ┌───────────────────────┘                   └─────────────────────┐
                     ▼                                                                  ▼
         ┌───────────────────────┐                                       ┌──────────────────────────┐
         │  SQLite (single file) │                                       │  External AI providers    │
         │  Business / User      │                                       │  - Anthropic Claude:       │
         │  KnowledgeDocument    │                                       │    chat generation via     │
         │  DocumentChunk(embed) │                                       │    forced tool_use for      │
         │  Conversation/Message │                                       │    structured JSON replies  │
         │  Ticket/Escalation    │                                       │  - Embeddings: fastembed,  │
         └──────────┬────────────┘                                       │    on-device, no API key,   │
                    │ read all chunks for tenant,                        │    no cost, no network call │
                    │ rank in-app (cosine similarity)                    └──────────────────────────┘
                    ▼
         ┌───────────────────────┐
         │ lib/vectorSearch.ts    │
         │ in-process ranking,    │
         │ no SQL vector operator │
         └───────────────────────┘
```

## RAG pipeline (the core loop)

1. Widget sends `{ sessionId, message }` to `POST /api/chat/:widgetKey/message`.
2. Server resolves the tenant from `widgetKey`, loads/creates the `Conversation`, and loads the
   last 20 messages for short-term memory.
3. The user's message is embedded locally, on the backend's own CPU, via
   `fastembed` (`all-MiniLM-L6-v2`, 384 dims) - no API key, no per-request cost, and
   no external network call once the model is cached after its first download.
4. `searchSimilarChunks()` loads every embedded chunk **scoped to that business**
   (`WHERE businessId = ...`) and ranks them by cosine similarity in application code, since
   plain SQLite has no vector-search operator. This is the tenant-isolation boundary for
   retrieval, not just an app-layer filter — the query itself never sees another tenant's rows.
5. Claude is called with the retrieved chunks in the system prompt and `tool_choice` forced to
   a single `respond_to_customer` tool. This guarantees structured output every time (message,
   rich content type, escalation decision, ticket decision, follow-ups) instead of relying on
   prompted JSON that can drift or wrap itself in markdown fences.
6. The assistant message, escalation event (if any), and ticket (if any) are persisted in one
   pass, and the widget renders the rich content client-side.

## Why these choices

- **Claude via forced tool use, not prompted JSON** - eliminates a whole class of "the model
  wrapped its JSON in prose" parsing bugs, and keeps escalation/ticket logic auditable as
  structured fields rather than regex-sniffed from prose.
- **Local embeddings (`fastembed`) instead of a hosted embeddings API** - one fewer
  paid API and one fewer external dependency to configure; a support KB is small enough that a
  compact on-device model (`all-MiniLM-L6-v2`, 384 dims) is more than adequate for retrieval
  quality. `embedTexts()`/`embedQuery()` in `embedding.service.ts` are the only two functions
  that would need to change to swap in a hosted embeddings API later if higher-dimensional
  embeddings were ever needed.
- **SQLite over a hosted database** - zero infrastructure for a take-home reviewer to spin up:
  clone, `npm install`, `npm run prisma:migrate`, done. No enums or vector types natively, so
  enum-like fields are validated strings (`backend/src/types/enums.ts`) and embeddings are a
  JSON-stringified array compared with an in-app cosine-similarity function
  (`lib/vectorSearch.ts`) instead of a SQL vector operator. That function has a single,
  narrow responsibility, so swapping in pgvector/Qdrant later if a knowledge base outgrows
  in-memory ranking is a contained change behind the same signature, not a rewrite.
- **Inline indexing, not a queue** - acceptable for the file sizes a support KB realistically
  has. The indexing call is already isolated in `kbIndexer.service.ts` behind a single function
  call, so swapping it for a BullMQ/SQS-backed worker later is a small, contained change.
- **Shadow-DOM widget with zero build step** - a support widget embeds on someone else's site
  with unknown CSS; Shadow DOM guarantees style isolation both ways without needing a bundler
  or an iframe (iframes complicate cookie/session handling for no real benefit here).
- **JWT + RBAC (OWNER/ADMIN/AGENT)** - stateless auth is enough for this scope; roles are
  enforced with a small `requireRole()` middleware rather than a permissions table, since the
  role set is small and fixed for now.

## Scaling this beyond the take-home

- Move KB indexing to a queue (BullMQ + Redis, or SQS) so uploads return instantly regardless
  of file size, with a status column already in place (`PENDING → PROCESSING → INDEXED/FAILED`).
- Swap local disk storage (`lib/storage.ts`) for S3/GCS - the interface (`saveFile/readFile`)
  is already storage-agnostic.
- Add a `channel` dispatcher so WhatsApp/email can create `Conversation` rows the same way the
  widget does (the `channel` field already accepts `WHATSAPP`/`EMAIL` alongside `WIDGET`).
- If conversation/knowledge-base volume outgrows a single SQLite file (or multiple backend
  replicas are needed behind a load balancer), switch the Prisma `datasource provider` to
  `"postgresql"` and point `searchSimilarChunks()` at `pgvector`'s `<=>` operator instead of
  in-app ranking - every route and query is otherwise database-agnostic, so this is a scoped
  change to two files, not a rewrite.
