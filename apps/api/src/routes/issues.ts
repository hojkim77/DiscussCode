import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import { toCamel } from "../utils/camel.js";

export const issueRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: {
      page?: number;
      repo?: string;
      label?: string;
      state?: "open" | "closed";
    };
  }>("/", async (req, reply) => {
    const { page = 1, repo, label, state } = req.query;
    const pageSize = 20;

    let query = db
      .from("issue_items")
      .select("*", { count: "exact" })
      .order("heat_score", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (repo) query = query.eq("repo_full_name", repo);
    if (state) query = query.eq("state", state);
    if (label) query = query.contains("labels", [label]);

    const { data, count, error } = await query;
    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    return reply.send({
      ok: true,
      data: { items: toCamel(data), total: count ?? 0, page, pageSize, hasNext: (count ?? 0) > page * pageSize },
    });
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { data, error } = await db
      .from("issue_items")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data)
      return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Issue not found" } });

    return reply.send({ ok: true, data: toCamel(data) });
  });
};
