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

## Deploying (free tier: Vercel + Render)

This deploys with zero cost using Render's free web service and Vercel's free Hobby tier. The
one tradeoff: Render's free tier has no persistent disk, so the SQLite file resets whenever the
backend restarts or spins down from inactivity (free instances sleep after ~15 min idle). The
backend's `CMD` already re-runs migrations and re-seeds the demo login on every boot, so it
always comes back working — you'll just need to re-upload the sample KB docs if it's been idle
a while before someone views it. See the note at the end of this section for the paid,
persistent alternative.

### 1. Deploy the backend to Render

1. Go to https://dashboard.render.com → **New +** → **Web Service** → connect your GitHub repo.
2. **Root Directory:** `backend`. Render will detect the `Dockerfile` automatically.
3. **Instance Type:** Free.
4. Pick a service name (e.g. `your-name-support-api`) — this fixes your public URL as
   `https://your-name-support-api.onrender.com`, so you can fill in the URL-dependent env vars
   below before the first deploy even finishes.
5. Add environment variables:
DATABASE_URL=file:./dev.db
JWT_SECRET=<any long random string>
ANTHROPIC_API_KEY=<your key>
ANTHROPIC_MODEL=claude-sonnet-5
EMBEDDING_MODEL=all-MiniLM-L6-v2
PUBLIC_API_URL=https://your-name-support-api.onrender.com
FRONTEND_URL=https://your-name-support.vercel.app
   (You won't know the exact Vercel URL until step 2 — it's fine to guess it now based on your
   project name and fix it after, since Render redeploys automatically whenever you change an
   env var.)
6. Click **Create Web Service** and wait for the first deploy to finish (a few minutes — it's
   also downloading the local embedding model on first boot).

### 2. Deploy the frontend to Vercel

1. Go to https://vercel.com/new → import the same GitHub repo.
2. **Root Directory:** `frontend`. Vercel auto-detects Vite (build command `npm run build`,
   output directory `dist`) — no changes needed there.
3. Add environment variable: `VITE_API_URL=https://your-name-support-api.onrender.com` (your
   real Render URL from step 1).
4. Click **Deploy**.

### 3. Connect the two

If the Vercel URL Vercel actually gave you differs from what you guessed in step 1.5, go back to
the Render service → **Environment** → update `FRONTEND_URL` to the real Vercel URL, and save
(Render redeploys automatically).

### 4. Verify

Visit your Vercel URL, log in with the seeded demo login (`admin@demo-acme.com` /
`Demo@12345`), upload the sample KB docs, copy the embed snippet, and test it in
`docs/test-widget-host.html` pointed at your live URLs instead of localhost.

### If you want real persistence later (costs money)

Upgrade the Render service to a paid **Starter** instance, attach a **Disk** (Render dashboard →
your service → Disks) mounted at `/app/data`, set `DATABASE_URL=file:/app/data/dev.db`, and
remove the `&& npm run seed` step from the Dockerfile's `CMD` so it stops overwriting real data
on every restart.

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
