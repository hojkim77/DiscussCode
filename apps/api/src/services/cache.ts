import { Redis as IORedis } from "ioredis";

// General-purpose cache client (non-BullMQ — no maxRetriesPerRequest: null)
export const cache = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  { lazyConnect: true }
);

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached) as T;
  const value = await fn();
  await cache.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}
