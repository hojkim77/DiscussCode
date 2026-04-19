import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Redis as IORedis } from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    cache: IORedis;
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  redis.on("error", (err) => app.log.error("[redis:plugin] " + err.message));
  app.decorate("cache", redis);
  app.addHook("onClose", async () => redis.quit());
};

export { redisPlugin };
export default fp(redisPlugin, { name: "redis" });
