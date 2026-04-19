import { Redis as IORedis } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Shared IORedis connection for BullMQ (maxRetriesPerRequest must be null for BullMQ)
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
