import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import type { TalkCategory } from "@discusscode/shared";
import { toCamel } from "../utils/camel.js";

type SearchQuery = {
  q: string;
  category?: TalkCategory;
  tags?: string[];
  language?: string;
  period?: "24h" | "7d" | "30d" | "all";
  page?: number;
};

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: SearchQuery }>("/", async (req, reply) => {
    const { q, category, tags, language, period = "all", page = 1 } = req.query;
    const pageSize = 20;

    if (!q?.trim())
      return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Query is required" } });

    // Use Postgres FTS via Supabase
    let query = db
      .from("talks")
      .select(
        `id, category, title, tags, heat_score, comment_count, created_at,
         author:users!author_id(id, handle, avatar)`,
        { count: "exact" }
      )
      .eq("is_deleted", false)
      .textSearch("search_vector", q, { type: "websearch", config: "english" })
      .order("heat_score", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) query = query.eq("category", category);
    if (tags?.length) query = query.overlaps("tags", tags);

    if (period !== "all") {
      const since = new Date();
      if (period === "24h") since.setHours(since.getHours() - 24);
      else if (period === "7d") since.setDate(since.getDate() - 7);
      else if (period === "30d") since.setDate(since.getDate() - 30);
      query = query.gte("created_at", since.toISOString());
    }

    const { data, count, error } = await query;

    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    return reply.send({
      ok: true,
      data: {
        items: toCamel(data),
        total: count ?? 0,
        page,
        pageSize,
        hasNext: (count ?? 0) > page * pageSize,
        query: q,
      },
    });
  });

  // Autocomplete (title prefix search using trigram)
  app.get<{ Querystring: { q: string; category?: TalkCategory } }>(
    "/autocomplete",
    async (req, reply) => {
      const { q, category } = req.query;
      if (!q || q.length < 2)
        return reply.send({ ok: true, data: [] });

      let query = db
        .from("talks")
        .select("id, title, category, tags")
        .eq("is_deleted", false)
        .ilike("title", `%${q}%`)
        .limit(8);

      if (category) query = query.eq("category", category);

      const { data, error } = await query;
      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.send({ ok: true, data: toCamel(data) });
    }
  );
};
