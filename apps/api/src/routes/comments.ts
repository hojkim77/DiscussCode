import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import { generateNotifications } from "./notifications.js";
import { adjustVotes } from "./talks.js";

export const commentsRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/talks/:talkId/comments ────────────────────────────────────────
  app.get<{ Params: { talkId: string }; Querystring: { sort?: string } }>(
    "/talks/:talkId/comments",
    async (req, reply) => {
      const { sort = "best" } = req.query;

      const sortCol =
        sort === "new" ? "created_at" :
        sort === "top" ? "upvotes" : "upvotes"; // best ≈ top for MVP

      const { data, error } = await db
        .from("comments")
        .select(
          `id, parent_id, author_id, body_md, upvotes, downvotes, depth,
           is_deleted, created_at, updated_at,
           author:users!author_id(id, handle, avatar, is_verified_dev)`
        )
        .eq("talk_id", req.params.talkId)
        .order(sortCol, { ascending: sort === "new" ? false : false })
        .order("created_at", { ascending: true });

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      // Build tree (flat → nested up to 4 levels)
      const comments = await attachVotesAndReactions(data ?? [], req.userId);
      const tree = buildCommentTree(comments);

      return reply.send({ ok: true, data: tree });
    }
  );

  // ── POST /api/talks/:talkId/comments ───────────────────────────────────────
  app.post<{ Params: { talkId: string }; Body: { bodyMd: string; parentId?: string } }>(
    "/talks/:talkId/comments",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { bodyMd, parentId } = req.body as { bodyMd: string; parentId?: string };
      if (!bodyMd?.trim())
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Body is required" } });

      // Write ban check
      const { data: user } = await db.from("users").select("write_banned_until").eq("id", req.userId).single();
      if (user?.write_banned_until && new Date(user.write_banned_until) > new Date())
        return reply.status(403).send({ ok: false, error: { code: "WRITE_BANNED", message: "Banned from writing" } });

      // Calculate depth
      let depth = 0;
      if (parentId) {
        const { data: parent } = await db.from("comments").select("depth").eq("id", parentId).single();
        if (parent) depth = parent.depth + 1;
      }

      const { data: comment, error } = await db
        .from("comments")
        .insert({
          talk_id: req.params.talkId,
          parent_id: parentId ?? null,
          author_id: req.userId,
          body_md: bodyMd.trim(),
          depth,
        })
        .select()
        .single();

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      // Update talk comment_count + unique_participants (fire and forget)
      updateTalkStats(req.params.talkId);

      // Fire notifications (reply + mentions)
      await generateNotifications({
        type: "reply",
        talkId: req.params.talkId,
        commentId: comment.id,
        authorId: req.userId,
        bodyMd,
        parentId,
      });

      return reply.status(201).send({ ok: true, data: comment });
    }
  );

  // ── PATCH /api/comments/:id ─────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { bodyMd: string } }>(
    "/comments/:id",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { bodyMd } = req.body as { bodyMd: string };
      if (!bodyMd?.trim())
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Body is required" } });

      const { data, error } = await db
        .from("comments")
        .update({ body_md: bodyMd.trim() })
        .eq("id", req.params.id)
        .eq("author_id", req.userId)
        .select()
        .single();

      if (error || !data)
        return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Comment not found or not yours" } });

      return reply.send({ ok: true, data });
    }
  );

  // ── DELETE /api/comments/:id ────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>("/comments/:id", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

    await db
      .from("comments")
      .update({ is_deleted: true, body_md: "[deleted]" })
      .eq("id", req.params.id)
      .eq("author_id", req.userId);

    return reply.send({ ok: true, data: null });
  });

  // ── POST /api/comments/:id/vote ─────────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: { value: 1 | -1 } }>(
    "/comments/:id/vote",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { value } = req.body as { value: 1 | -1 };
      if (value !== 1 && value !== -1)
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Value must be 1 or -1" } });

      const { data: existing } = await db
        .from("votes")
        .select("id, value")
        .eq("target_type", "comment")
        .eq("target_id", req.params.id)
        .eq("user_id", req.userId)
        .single();

      if (existing) {
        if (existing.value === value) {
          await db.from("votes").delete().eq("id", existing.id);
          await adjustVotes("comments", req.params.id, -value as 1 | -1);
        } else {
          await db.from("votes").update({ value }).eq("id", existing.id);
          await adjustVotes("comments", req.params.id, (value * 2) as 2 | -2);
        }
      } else {
        await db.from("votes").insert({
          target_type: "comment",
          target_id: req.params.id,
          user_id: req.userId,
          value,
        });
        await adjustVotes("comments", req.params.id, value);
      }

      return reply.send({ ok: true, data: null });
    }
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FlatComment = Record<string, unknown> & {
  id: string;
  parent_id: string | null;
  depth: number;
};

function buildCommentTree(comments: FlatComment[]): unknown[] {
  const map = new Map<string, FlatComment & { replies: unknown[] }>();
  const roots: unknown[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of map.values()) {
    if (!c.parent_id) {
      roots.push(c);
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        (parent.replies as unknown[]).push(c);
      } else {
        roots.push(c); // orphan → treat as root
      }
    }
  }

  return roots;
}

async function attachVotesAndReactions(
  comments: unknown[],
  userId: string | null
): Promise<FlatComment[]> {
  if (!comments.length) return [];

  const ids = (comments as FlatComment[]).map((c) => c.id);

  const [votesRes, reactionsRes] = await Promise.all([
    userId
      ? db.from("votes").select("target_id, value").eq("target_type", "comment").eq("user_id", userId).in("target_id", ids)
      : { data: [] },
    db.from("reactions").select("target_id, emoji").eq("target_type", "comment").in("target_id", ids),
  ]);

  const voteMap = new Map((votesRes.data ?? []).map((v) => [v.target_id, v.value]));

  // Aggregate reactions per comment
  const reactionMap = new Map<string, Map<string, number>>();
  for (const r of reactionsRes.data ?? []) {
    if (!reactionMap.has(r.target_id)) reactionMap.set(r.target_id, new Map());
    const m = reactionMap.get(r.target_id)!;
    m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
  }

  return (comments as FlatComment[]).map((c) => ({
    ...c,
    userVote: voteMap.get(c.id) ?? null,
    reactions: Array.from(reactionMap.get(c.id)?.entries() ?? []).map(([emoji, count]) => ({
      emoji,
      count,
      userReacted: false, // simplified for MVP
    })),
  }));
}

async function updateTalkStats(talkId: string) {
  const { data, count } = await db
    .from("comments")
    .select("author_id", { count: "exact" })
    .eq("talk_id", talkId)
    .eq("is_deleted", false);

  const uniqueParticipants = new Set((data ?? []).map((c) => c.author_id)).size;
  await db.from("talks").update({ comment_count: count ?? 0, unique_participants: uniqueParticipants }).eq("id", talkId);
}
