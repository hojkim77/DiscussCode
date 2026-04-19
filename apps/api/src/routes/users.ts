import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import { toCamel } from "../utils/camel.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/users/:handle — public profile
  app.get<{ Params: { handle: string } }>("/:handle", async (req, reply) => {
    const { data: user, error } = await db
      .from("users")
      .select("id, handle, avatar, bio, reputation, is_verified_dev, is_public, created_at")
      .eq("handle", req.params.handle)
      .single();

    if (error || !user)
      return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "User not found" } });

    if (!user.is_public && user.id !== req.userId)
      return reply.status(403).send({ ok: false, error: { code: "PRIVATE", message: "Profile is private" } });

    // Stats
    const [talksRes, commentsRes] = await Promise.all([
      db.from("talks").select("id", { count: "exact" }).eq("author_id", user.id).eq("is_deleted", false),
      db.from("comments").select("id", { count: "exact" }).eq("author_id", user.id).eq("is_deleted", false),
    ]);

    return reply.send({
      ok: true,
      data: {
        ...(toCamel(user) as object),
        stats: {
          talkCount: talksRes.count ?? 0,
          commentCount: commentsRes.count ?? 0,
        },
      },
    });
  });

  // GET /api/users/:handle/talks
  app.get<{ Params: { handle: string }; Querystring: { page?: number } }>(
    "/:handle/talks",
    async (req, reply) => {
      const { data: user } = await db.from("users").select("id, is_public").eq("handle", req.params.handle).single();
      if (!user) return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "User not found" } });
      if (!user.is_public && user.id !== req.userId)
        return reply.status(403).send({ ok: false, error: { code: "PRIVATE", message: "Profile is private" } });

      const { page = 1 } = req.query;
      const pageSize = 20;

      const { data, count } = await db
        .from("talks")
        .select("id, category, title, tags, heat_score, comment_count, created_at", { count: "exact" })
        .eq("author_id", user.id)
        .eq("is_deleted", false)
        .eq("category", "OPEN")
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      return reply.send({
        ok: true,
        data: { items: toCamel(data ?? []), total: count ?? 0, page, pageSize, hasNext: (count ?? 0) > page * pageSize },
      });
    }
  );
};
