# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Feature Specs
Full specs in `docs/features/` — read the relevant file when working on a feature.
Index + MVP scope checklist: [`docs/features/README.md`](docs/features/README.md)

## Commands

```bash
# Install all deps (run from root)
pnpm install

# Dev (all apps in parallel via Turborepo)
pnpm dev

# Dev individual apps
pnpm --filter @discusscode/web dev      # Next.js on :3000
pnpm --filter @discusscode/api dev      # Fastify on :4000

# Build
pnpm build
pnpm --filter @discusscode/api build

# Typecheck
pnpm typecheck

# Lint
pnpm lint

# Regenerate Supabase types (requires local Supabase running)
pnpm --filter @discusscode/db generate
```

## Architecture

**Monorepo** — pnpm workspaces + Turborepo.

```
apps/
  web/   — Next.js 15 App Router (SSR/ISR pages, proxies /api/* → Fastify)
  api/   — Fastify 5 API server (REST, auth middleware, BullMQ workers)
packages/
  shared/ — Shared TypeScript types (domain models, API wrappers, job payloads)
  db/     — Supabase client (service-role + anon), generated Database types
  queue/  — BullMQ queue definitions, Redis connection, scheduler bootstrap
```

### Request Flow

1. **Browser → Next.js**: Pages are SSR/ISR. `apps/web/src/lib/api.ts` wraps all API calls.
2. **Next.js → Fastify**: `next.config.ts` rewrites `/api/*` to `http://localhost:4000/api/*`.
3. **Fastify auth**: `src/plugins/auth.ts` validates Supabase JWT on every request, sets `req.userId`.
4. **Fastify routes**: return `ApiResponse<T>` (`{ ok: true, data }` | `{ ok: false, error }`).
5. **Redis cache**: routes cache hot responses via `app.cache` (IORedis decorated onto Fastify).

### Background Jobs (BullMQ)

Workers live in `apps/api/src/workers/` and are started alongside the API server via `startWorkers()` in `server.ts`. The scheduler is seeded via `initScheduler()` from `@discusscode/queue`.

| Worker | Queue | Schedule | What it does |
|--------|-------|----------|--------------|
| `collect-trending.worker.ts` | `collect-trending` | every 1h | Scrapes GitHub Trending + HN, upserts DB, enqueues summaries |
| `collect-issues.worker.ts` | `collect-issues` | every 6h | Fetches GitHub Issues API for tracked repos, upserts DB |
| `generate-summary.worker.ts` | `generate-summary` | on-demand | Calls `claude-haiku-4-5` to summarise a trending item or issue |
| `recalc-heat-score.worker.ts` | `recalc-heat-score` | after each collection | Time-decay formula: `score × e^(−0.1 × hours)` |

Scrapers (`apps/api/src/scrapers/`) use **Cheerio** for HTML parsing.

### Database

Tables: `trending_items`, `issues`, `discussions`. Schema is reflected in `packages/db/src/database.types.ts` (hand-maintained; regenerate with `pnpm --filter @discusscode/db generate` once Supabase local is running).

The `db` export uses the **service role key** (bypasses RLS) — only use in `apps/api`. The browser/Next.js side uses `@supabase/ssr` with the anon key for auth-scoped operations.

## Environment Variables

Copy `.env.example` → `.env` at the repo root, and also per-app (`apps/api/.env`, `apps/web/.env.local`). Required keys:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (default: `redis://localhost:6379`)
- `ANTHROPIC_API_KEY` (for LLM summaries — `claude-haiku-4-5-20251001`)
- `GITHUB_TOKEN` (optional — raises GitHub API rate limit for issue collection)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web only)

## Key Conventions

- All API responses use `ApiResponse<T>` from `@discusscode/shared` — always check `json.ok` before using `json.data`.
- Fastify plugins use `fastify-plugin` (fp) to share decorations across the instance.
- `@discusscode/db` exports must only be imported server-side (service role key).
- BullMQ requires `maxRetriesPerRequest: null` on the IORedis connection — set in `packages/queue/src/redis.ts`.
- Workspace imports use `workspace:*` protocol (pnpm) and TypeScript path aliases point directly to `src/index.ts` (no build step needed for internal packages during dev).
