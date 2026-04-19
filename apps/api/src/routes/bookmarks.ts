import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import { toCamel } from "../utils/camel.js";

export const bookmarksRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/bookmarks/:talkId — toggle
  app.post<{ Params: { talkId: string } }>("/:talkId", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

    const { data: existing } = await db
      .from("bookmarks")
      .select("id")
      .eq("user_id", req.userId)
      .eq("talk_id", req.params.talkId)
      .single();

    if (existing) {
      await db.from("bookmarks").delete().eq("id", existing.id);
      return reply.send({ ok: true, data: { bookmarked: false } });
    } else {
      await db.from("bookmarks").insert({ user_id: req.userId, talk_id: req.params.talkId });
      return reply.send({ ok: true, data: { bookmarked: true } });
    }
  });

  // GET /api/bookmarks?page=&category=
  app.get<{ Querystring: { page?: number; category?: string } }>(
    "/",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { page = 1, category } = req.query;
      const pageSize = 20;

      let query = db
        .from("bookmarks")
        .select(
          `id, created_at, talk:talks!talk_id(id, category, title, tags, heat_score, comment_count, created_at)`,
          { count: "exact" }
        )
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Can't filter on joined column with Supabase client – filter post-query for MVP
      const { data, count, error } = await query;

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      const filtered = category
        ? (data ?? []).filter((b) => (b.talk as { category?: string })?.category === category)
        : data ?? [];

      return reply.send({
        ok: true,
        data: {
          items: toCamel(filtered),
          total: count ?? 0,
          page,
          pageSize,
          hasNext: (count ?? 0) > page * pageSize,
        },
      });
    }
  );
};
