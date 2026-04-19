import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";
import type {
  CollectTrendingPayload,
  CollectIssuesPayload,
  GenerateSummaryPayload,
  RecalcHeatScorePayload,
} from "@discusscode/shared";

export const QUEUE_NAMES = {
  COLLECT_TRENDING: "collect-trending",
  COLLECT_ISSUES: "collect-issues",
  GENERATE_SUMMARY: "generate-summary",
  RECALC_HEAT_SCORE: "recalc-heat-score",
} as const;

export const collectTrendingQueue = new Queue<CollectTrendingPayload>(
  QUEUE_NAMES.COLLECT_TRENDING,
  { connection: redisConnection }
);

export const collectIssuesQueue = new Queue<CollectIssuesPayload>(
  QUEUE_NAMES.COLLECT_ISSUES,
  { connection: redisConnection }
);

export const generateSummaryQueue = new Queue<GenerateSummaryPayload>(
  QUEUE_NAMES.GENERATE_SUMMARY,
  { connection: redisConnection }
);

export const recalcHeatScoreQueue = new Queue<RecalcHeatScorePayload>(
  QUEUE_NAMES.RECALC_HEAT_SCORE,
  { connection: redisConnection }
);
