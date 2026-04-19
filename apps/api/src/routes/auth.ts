import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import type { Database } from "@discusscode/db";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/auth/me — return current user profile (or 401)
  app.get("/me", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

    const { data, error } = await db
      .from("users")
      .select("id, handle, email, github_handle, avatar, bio, reputation, is_public, is_verified_dev, created_at")
      .eq("id", req.userId)
      .single();

    if (error || !data)
      return reply.status(404).send({ ok: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });

    return reply.send({ ok: true, data });
  });

  // PATCH /api/auth/me — update own profile
  app.patch<{
    Body: { handle?: string; bio?: string; isPublic?: boolean };
  }>("/me", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

    const { handle, bio, isPublic } = req.body as { handle?: string; bio?: string; isPublic?: boolean };
    type UsersUpdate = Database["public"]["Tables"]["users"]["Update"];
    const updates: UsersUpdate = {};
    if (handle !== undefined) updates.handle = handle;
    if (bio !== undefined) updates.bio = bio;
    if (isPublic !== undefined) updates.is_public = isPublic;

    if (Object.keys(updates).length === 0)
      return reply.status(400).send({ ok: false, error: { code: "NO_CHANGES", message: "No fields to update" } });

    // Check handle uniqueness
    if (handle) {
      const { data: existing } = await db
        .from("users")
        .select("id")
        .eq("handle", handle)
        .neq("id", req.userId)
        .single();
      if (existing)
        return reply.status(409).send({ ok: false, error: { code: "HANDLE_TAKEN", message: "Handle already taken" } });
    }

    const { data, error } = await db
      .from("users")
      .update(updates)
      .eq("id", req.userId)
      .select()
      .single();

    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    return reply.send({ ok: true, data });
  });

  // GET /api/auth/notifications
  app.get<{ Querystring: { page?: number; unreadOnly?: boolean } }>(
    "/notifications",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

      const { page = 1, unreadOnly } = req.query;
      const pageSize = 20;

      let query = db
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (unreadOnly) query = query.is("read_at", null);

      const { data, count, error } = await query;
      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.send({
        ok: true,
        data: { items: data, total: count ?? 0, page, pageSize, hasNext: (count ?? 0) > page * pageSize },
      });
    }
  );

  // POST /api/auth/notifications/read — mark as read
  app.post<{ Body: { ids?: string[] } }>("/notifications/read", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

    const { ids } = req.body as { ids?: string[] };
    let query = db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", req.userId)
      .is("read_at", null);

    if (ids?.length) query = query.in("id", ids);

    await query;
    return reply.send({ ok: true, data: null });
  });

  // GET /api/auth/drafts
  app.get("/drafts", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

    const { data, error } = await db
      .from("drafts")
      .select("*")
      .eq("user_id", req.userId)
      .order("updated_at", { ascending: false });

    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    return reply.send({ ok: true, data });
  });

  // POST /api/auth/drafts
  app.post<{ Body: { title?: string; bodyMd?: string; tags?: string[]; talkType?: string } }>(
    "/drafts",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

      const { title, bodyMd, tags = [], talkType } = req.body as { title?: string; bodyMd?: string; tags?: string[]; talkType?: string };
      const { data, error } = await db
        .from("drafts")
        .insert({ user_id: req.userId, title, body_md: bodyMd, tags, talk_type: talkType })
        .select()
        .single();

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.status(201).send({ ok: true, data });
    }
  );

  // DELETE /api/auth/drafts/:id
  app.delete<{ Params: { id: string } }>("/drafts/:id", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

    await db.from("drafts").delete().eq("id", req.params.id).eq("user_id", req.userId);
    return reply.send({ ok: true, data: null });
  });
};
