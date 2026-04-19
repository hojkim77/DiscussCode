import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";

export const reactionsRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/reactions — add or remove reaction (toggle)
  app.post<{ Body: { targetType: "talk" | "comment"; targetId: string; emoji: string } }>(
    "/",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { targetType, targetId, emoji } = req.body as { targetType: "talk" | "comment"; targetId: string; emoji: string };

      if (!["talk", "comment"].includes(targetType))
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Invalid target type" } });

      const ALLOWED_EMOJIS = ["👍", "👎", "❤️", "🚀", "😄", "🎉", "🤔", "👀"];
      if (!ALLOWED_EMOJIS.includes(emoji))
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Emoji not allowed" } });

      const { data: existing } = await db
        .from("reactions")
        .select("id")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("user_id", req.userId)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        await db.from("reactions").delete().eq("id", existing.id);
        return reply.send({ ok: true, data: { added: false } });
      } else {
        await db.from("reactions").insert({
          target_type: targetType,
          target_id: targetId,
          user_id: req.userId,
          emoji,
        });
        return reply.send({ ok: true, data: { added: true } });
      }
    }
  );

  // GET /api/reactions?targetType=...&targetId=...
  app.get<{ Querystring: { targetType: "talk" | "comment"; targetId: string } }>(
    "/",
    async (req, reply) => {
      const { targetType, targetId } = req.query;

      const { data, error } = await db
        .from("reactions")
        .select("emoji, user_id")
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      // Aggregate by emoji
      const summary = new Map<string, { count: number; userReacted: boolean }>();
      for (const r of data ?? []) {
        const existing = summary.get(r.emoji) ?? { count: 0, userReacted: false };
        existing.count++;
        if (r.user_id === req.userId) existing.userReacted = true;
        summary.set(r.emoji, existing);
      }

      return reply.send({
        ok: true,
        data: Array.from(summary.entries()).map(([emoji, s]) => ({ emoji, ...s })),
      });
    }
  );
};
