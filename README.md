# AI Customer Support Assistant Platform

A multi-tenant SaaS platform that lets any business train an AI support assistant on its own
documents, embed it as a chat widget, and manage the conversations/tickets/escalations it
generates from an admin console.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system diagram and design rationale.

## Stack

| Layer       | Choice                                                                 |
|-------------|-------------------------------------------------------------------------|
| Frontend    | React 18 + TypeScript + Vite + React Router + Tailwind CSS               |
| Backend     | Node.js + Express + TypeScript + Prisma                                 |
| Database    | SQLite - a single file, nothing to install or run separately             |
| Vector search | In-app cosine similarity over embeddings (see `lib/vectorSearch.ts`)  |
| Chat model  | Anthropic Claude (`claude-sonnet-5`), forced tool-use for structured replies |
| Embeddings  | Local, on-device via `fastembed` (`all-MiniLM-L6-v2`) — no API key, no cost |
| Widget      | Vanilla JS + Shadow DOM, zero build step, embeds via one `<script>` tag  |
| Auth        | JWT + role-based access (OWNER / ADMIN / AGENT)                         |

## Project layout

```
backend/        Express API, Prisma schema (SQLite), RAG pipeline
frontend/       React (Vite) admin console + the widget.js file it serves from /public
docs/           Architecture doc + sample knowledge-base documents for the demo
docker-compose.yml   backend + frontend, for local dev (no separate DB container needed)
```

## Running it locally

No database server to install — SQLite is just a file the backend creates for you.

### Option A - Run natively (recommended while developing)

**Prerequisites:** Node 20+.

```bash
# 1. Backend
cd backend
cp .env.example .env      # fill in ANTHROPIC_API_KEY (embeddings run locally, no key needed)
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # creates backend/dev.db
npm run seed                          # creates a demo business + admin login
npm run dev                           # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev                           # http://localhost:3000
```

### Option B - Docker Compose

```bash
cp backend/.env.example .env   # fill in ANTHROPIC_API_KEY (embeddings run locally, no key needed)
docker compose up --build
docker compose exec backend npm run prisma:deploy
docker compose exec backend npm run seed
```
Frontend: http://localhost:3000 · API: http://localhost:4000. The SQLite file and uploaded
documents persist in named Docker volumes across restarts.

### After setup

Log in at http://localhost:3000/login with:
- **Email:** `admin@demo-acme.com`
- **Password:** `Demo@12345`

Then upload the files in `docs/sample-kb/` from the Knowledge Base page, and grab the embed
snippet from the AI Configuration page to test the widget — open `docs/test-widget-host.html`
in a browser and paste your snippet in place of the placeholder.

> **First upload will be slower:** the first time you index a document, `fastembed`
> downloads the embedding model (~35MB, from `storage.googleapis.com`) and caches it locally
> under `node_modules/fastembed/`. After that first download, embedding runs fully offline
> with no network call and no per-request cost. If indexing fails with a download/archive
> error, it almost always means something on your network (firewall, VPN, corporate proxy) is
> blocking `storage.googleapis.com` — try a different network, or let me know and I can point
> the model download at a mirror.

> **Note on this sandbox:** this codebase was written and type-checked in an environment whose
> network access is restricted to a small allowlist (npm/PyPI/GitHub, not Prisma's engine CDN
> or `storage.googleapis.com`), so `prisma generate` and the embedding model's first download
> couldn't be fully executed here. Both will run normally with your regular internet access —
> this is a sandbox limitation, not a bug in the code. `tsc -b` and `vite build` both pass
> cleanly for the frontend, and `tsc --noEmit` passes for the backend aside from the one
> Prisma-client-generation-dependent type.

## Deploying

- **Frontend → Vercel or Netlify:** import the `frontend/` directory as the project root
  (build command `npm run build`, output directory `dist`), set `VITE_API_URL` to your
  deployed backend URL as a build-time env var.
- **Backend → Railway or Render:** deploy the `backend/` directory as-is. Since SQLite is a
  file, attach a small persistent volume/disk (Railway: "Volumes"; Render: "Disks") mounted
  at, say, `/app/data`, and set `DATABASE_URL=file:/app/data/dev.db`. Also set `JWT_SECRET`,
  `ANTHROPIC_API_KEY`, `FRONTEND_URL` (your Vercel URL), and
  `PUBLIC_API_URL` (this service's own public URL — the widget calls it directly from
  customer sites, so it must be reachable publicly; CORS is already open by default).
- Run `npm run prisma:deploy` once against the production volume before first boot (the
  Dockerfile's `CMD` already does this automatically on every container start).
- **Scaling note:** SQLite is one file, so it's naturally single-writer/single-instance. That's
  the right tradeoff for a take-home or an early-stage single-tenant-per-deploy setup; if this
  needs to run multiple backend replicas behind a load balancer, swap `DATABASE_URL` for a
  hosted Postgres and change the Prisma `datasource provider` to `"postgresql"` — the schema
  and every query are otherwise database-agnostic, so that's a small, contained change.

## Key design decisions (short version)

- **Structured AI output via forced Claude tool-use**, not prompted JSON — see
  `backend/src/services/ai.service.ts`. This is what makes rich content (lists/tables/cards/links)
  and escalation/ticket decisions reliable instead of regex-parsed from prose.
- **Tenant isolation** is enforced at the query layer everywhere (`businessId` always comes from
  the JWT, never the request body), including inside the vector search itself.
- **SQLite + in-app cosine similarity instead of a vector database** — keeps local setup to
  "clone and run," with zero infrastructure to install. `searchSimilarChunks()` in
  `lib/vectorSearch.ts` is an isolated, single-purpose function, so swapping in pgvector/Qdrant
  later if a knowledge base outgrows in-memory search is a contained change, not a rewrite.
- **Storage and indexing are behind small, swappable interfaces** (`lib/storage.ts`,
  `services/kbIndexer.service.ts`) so moving to S3 and a background queue later doesn't touch
  the routes that call them.

Full rationale in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
