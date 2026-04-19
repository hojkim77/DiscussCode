import type { FastifyPluginAsync } from "fastify";

export const trendingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_req, reply) => reply.send({ ok: true, data: [] }));
};
