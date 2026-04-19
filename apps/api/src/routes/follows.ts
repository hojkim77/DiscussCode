import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import type { FollowTargetType } from "@discusscode/shared";
import { toCamel } from "../utils/camel.js";

export const followsRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/follows — follow or unfollow
  app.post<{ Body: { targetType: FollowTargetType; targetId: string } }>(
    "/",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { targetType, targetId } = req.body as { targetType: FollowTargetType; targetId: string };

      if (!["REPO", "TAG", "USER"].includes(targetType))
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Invalid target type" } });

      const { data: existing } = await db
        .from("follows")
        .select("id")
        .eq("user_id", req.userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .single();

      if (existing) {
        await db.from("follows").delete().eq("id", existing.id);
        return reply.send({ ok: true, data: { following: false } });
      } else {
        await db.from("follows").insert({
          user_id: req.userId,
          target_type: targetType,
          target_id: targetId,
        });
        return reply.send({ ok: true, data: { following: true } });
      }
    }
  );

  // GET /api/follows — list my follows
  app.get<{ Querystring: { type?: FollowTargetType } }>(
    "/",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      let query = db
        .from("follows")
        .select("*")
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false });

      if (req.query.type) query = query.eq("target_type", req.query.type);

      const { data, error } = await query;
      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.send({ ok: true, data: toCamel(data) });
    }
  );

  // GET /api/follows/status?targetType=&targetId= — check if following
  app.get<{ Querystring: { targetType: FollowTargetType; targetId: string } }>(
    "/status",
    async (req, reply) => {
      if (!req.userId) return reply.send({ ok: true, data: { following: false } });

      const { targetType, targetId } = req.query;
      const { data } = await db
        .from("follows")
        .select("id")
        .eq("user_id", req.userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .single();

      return reply.send({ ok: true, data: { following: !!data } });
    }
  );
};
