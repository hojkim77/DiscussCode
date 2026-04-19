import Fastify from "fastify";
import fp from "fastify-plugin";
import { initScheduler } from "@discusscode/queue";
import { authPlugin } from "./plugins/auth.js";
import { redisPlugin } from "./plugins/redis.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { authRoutes } from "./routes/auth.js";
import { talksRoutes } from "./routes/talks.js";
import { commentsRoutes } from "./routes/comments.js";
import { reactionsRoutes } from "./routes/reactions.js";
import { bookmarksRoutes } from "./routes/bookmarks.js";
import { followsRoutes } from "./routes/follows.js";
import { searchRoutes } from "./routes/search.js";
import { reposRoutes } from "./routes/repos.js";
import { issueRoutes } from "./routes/issues.js";
import { usersRoutes } from "./routes/users.js";
import { startWorkers } from "./workers/index.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

// ── Security & infrastructure plugins ────────────────────────────────────────
await app.register(import("@fastify/helmet"));
await app.register(import("@fastify/cors"), {
  origin: process.env.WEB_URL ?? "http://localhost:3000",
  credentials: true,
});

// Auth first so req.userId is set before rate-limit key generation
await app.register(fp(authPlugin));
await app.register(redisPlugin);

// Rate limiting: 60/min anon, 300/min authenticated
await app.register(import("@fastify/rate-limit"), {
  keyGenerator: (req) => req.userId ?? req.ip ?? "unknown",
  max: (req) => (req.userId ? 300 : 60),
  timeWindow: "1 minute",
  errorResponseBuilder: (_req, context) => ({
    ok: false,
    error: {
      code: "RATE_LIMITED",
      message: `Too many requests — retry after ${context.after}`,
    },
  }),
});

await app.register(fp(swaggerPlugin));

// ── Routes ────────────────────────────────────────────────────────────────────
await app.register(authRoutes,      { prefix: "/api/auth" });
await app.register(talksRoutes,     { prefix: "/api/talks" });
await app.register(commentsRoutes);                          // /api/talks/:id/comments + /api/comments/:id
await app.register(reactionsRoutes, { prefix: "/api/reactions" });
await app.register(bookmarksRoutes, { prefix: "/api/bookmarks" });
await app.register(followsRoutes,   { prefix: "/api/follows" });
await app.register(searchRoutes,    { prefix: "/api/search" });
await app.register(reposRoutes,     { prefix: "/api/repos" });
await app.register(issueRoutes,     { prefix: "/api/issues" });
await app.register(usersRoutes,     { prefix: "/api/users" });

app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

// ── Background jobs ───────────────────────────────────────────────────────────
startWorkers();
await initScheduler();

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`API ready on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
