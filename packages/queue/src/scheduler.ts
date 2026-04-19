import { collectTrendingQueue, collectIssuesQueue, recalcHeatScoreQueue } from "./queues.js";

// Called once at API server startup — idempotent (upsertJobScheduler)
export async function initScheduler() {
  // Trending repos: every 1 hour
  await collectTrendingQueue.upsertJobScheduler(
    "trending-1h",
    { every: 60 * 60 * 1000 },
    { name: "collect-trending", data: {} }
  );

  // Issues from WatchList: every 6 hours
  await collectIssuesQueue.upsertJobScheduler(
    "issues-6h",
    { every: 6 * 60 * 60 * 1000 },
    { name: "collect-issues", data: {} }
  );

  // Heat score recalc for talks: every 30 minutes (decay changes continuously)
  await recalcHeatScoreQueue.upsertJobScheduler(
    "heat-talks-30m",
    { every: 30 * 60 * 1000 },
    { name: "recalc-heat-talks", data: { type: "talk" } }
  );
}
