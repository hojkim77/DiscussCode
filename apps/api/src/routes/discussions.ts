import type { FastifyPluginAsync } from "fastify";

export const discussionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_req, reply) => reply.send({ ok: true, data: [] }));
  app.post("/", async (_req, reply) => reply.status(201).send({ ok: true, data: null }));
};
