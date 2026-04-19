import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Redis as IORedis } from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    cache: IORedis;
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
  app.decorate("cache", redis);
  app.addHook("onClose", async () => redis.quit());
};

export { redisPlugin };
export default fp(redisPlugin, { name: "redis" });
