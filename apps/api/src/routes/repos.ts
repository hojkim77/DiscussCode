import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";

export const reposRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/repos — list repos (with optional language filter)
  app.get<{ Querystring: { page?: number; language?: string } }>(
    "/",
    async (req, reply) => {
      const { page = 1, language } = req.query;
      const pageSize = 20;

      let query = db
        .from("repos")
        .select("*", { count: "exact" })
        .order("heat_score", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (language) query = query.ilike("language", language);

      const { data, count, error } = await query;
      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.send({
        ok: true,
        data: { items: data, total: count ?? 0, page, pageSize, hasNext: (count ?? 0) > page * pageSize },
      });
    }
  );

  // GET /api/repos/:id
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { data, error } = await db
      .from("repos")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data)
      return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Repo not found" } });

    // Get recent snapshots for star/fork chart
    const { data: snapshots } = await db
      .from("repo_snapshots")
      .select("stars, forks, recorded_at")
      .eq("repo_id", req.params.id)
      .order("recorded_at", { ascending: false })
      .limit(168); // last 7 days @ 1h intervals

    return reply.send({ ok: true, data: { ...data, snapshots: snapshots ?? [] } });
  });
};
