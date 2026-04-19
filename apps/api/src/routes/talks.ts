import type { FastifyPluginAsync } from "fastify";
import { db } from "@discusscode/db";
import type { Database } from "@discusscode/db";
import type { TalkCategory, SortOption, TimePeriod } from "@discusscode/shared";
import { cache } from "../services/cache.js";
import { toCamel } from "../utils/camel.js";

type ListQuery = {
  category?: TalkCategory;
  sort?: SortOption;
  period?: TimePeriod;
  tags?: string[];
  language?: string;
  repo?: string;
  domain?: string;
  page?: number;
  pageSize?: number;
};

type CreateBody = {
  title: string;
  bodyMd?: string;
  tags?: string[];
  talkType?: string;
};

export const talksRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/talks ──────────────────────────────────────────────────────────
  app.get<{ Querystring: ListQuery }>("/", async (req, reply) => {
    const {
      category,
      sort = "hot",
      period = "all",
      tags,
      language,
      repo,
      domain,
      page = 1,
      pageSize = 20,
    } = req.query;

    // Sort column mapping
    const sortColumn =
      sort === "hot" ? "heat_score"
      : sort === "new" ? "created_at"
      : sort === "commented" ? "comment_count"
      : "upvotes";

    // Pre-fetch ref IDs for language/repo filters (run in parallel before main query)
    const [repoRefIds, issueRefIds] = await Promise.all([
      language
        ? db.from("repos").select("id").ilike("language", language)
            .then(({ data: d }) => (d ?? []).map((r) => r.id))
        : null,
      repo
        ? db.from("issue_items").select("id").eq("repo_full_name", repo)
            .then(({ data: d }) => (d ?? []).map((i) => i.id))
        : null,
    ]);

    // Early exit when language/repo filter yields no matching refs
    if (repoRefIds?.length === 0)
      return reply.send({ ok: true, data: { items: [], total: 0, page, pageSize, hasNext: false } });
    if (issueRefIds?.length === 0)
      return reply.send({ ok: true, data: { items: [], total: 0, page, pageSize, hasNext: false } });

    let query = db
      .from("talks")
      .select(
        `id, category, ref_id, author_id, title, body_md, tags, talk_type,
         heat_score, upvotes, downvotes, comment_count, unique_participants,
         view_count, is_pinned, created_at, updated_at,
         author:users!author_id(id, handle, avatar, is_verified_dev)`,
        { count: "exact" }
      )
      .eq("is_deleted", false)
      .order(sortColumn, { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) query = query.eq("category", category);
    if (tags?.length) query = query.overlaps("tags", tags);

    // Push language/repo/domain filters into the WHERE clause before pagination
    if (repoRefIds) query = query.eq("category", "REPO").in("ref_id", repoRefIds);
    if (issueRefIds) query = query.eq("category", "ISSUE").in("ref_id", issueRefIds);
    if (domain) query = query.eq("category", "TREND").contains("tags", [domain]);

    // Period filter (only meaningful for top/commented)
    if (period !== "all" && (sort === "top" || sort === "commented")) {
      const since = new Date();
      if (period === "24h") since.setHours(since.getHours() - 24);
      else if (period === "7d") since.setDate(since.getDate() - 7);
      else if (period === "30d") since.setDate(since.getDate() - 30);
      query = query.gte("created_at", since.toISOString());
    }

    const { data, count, error } = await query;
    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    const enriched = await enrichTalks(data ?? [], req.userId);

    return reply.send({
      ok: true,
      data: { items: enriched, total: count ?? 0, page, pageSize, hasNext: (count ?? 0) > page * pageSize },
    });
  });

  // ── GET /api/talks/:id ──────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { data, error } = await db
      .from("talks")
      .select(
        `*, author:users!author_id(id, handle, avatar, is_verified_dev, bio, reputation)`
      )
      .eq("id", req.params.id)
      .eq("is_deleted", false)
      .single();

    if (error || !data)
      return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Talk not found" } });

    // Increment view count (fire and forget)
    db.from("talks").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", data.id);

    const [enriched] = await enrichTalks([data], req.userId);
    return reply.send({ ok: true, data: enriched });
  });

  // ── POST /api/talks — create OPEN talk ──────────────────────────────────────
  app.post<{ Body: CreateBody }>("/", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

    const { title, bodyMd, tags = [], talkType } = req.body as CreateBody;

    if (!title?.trim())
      return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Title is required" } });
    if (title.length > 200)
      return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Title max 200 chars" } });
    if (tags.length > 5)
      return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Max 5 tags" } });

    // Moderation: check write ban
    const { data: user } = await db.from("users").select("write_banned_until").eq("id", req.userId).single();
    if (user?.write_banned_until && new Date(user.write_banned_until) > new Date())
      return reply.status(403).send({ ok: false, error: { code: "WRITE_BANNED", message: "Account temporarily banned from writing" } });

    const { data, error } = await db
      .from("talks")
      .insert({
        category: "OPEN",
        author_id: req.userId,
        title: title.trim(),
        body_md: bodyMd,
        tags,
        talk_type: talkType,
      })
      .select()
      .single();

    if (error)
      return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

    return reply.status(201).send({ ok: true, data });
  });

  // ── PATCH /api/talks/:id ────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: Partial<CreateBody> }>(
    "/:id",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { data: existing } = await db
        .from("talks")
        .select("author_id, category, created_at")
        .eq("id", req.params.id)
        .single();

      if (!existing)
        return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Talk not found" } });
      if (existing.author_id !== req.userId)
        return reply.status(403).send({ ok: false, error: { code: "FORBIDDEN", message: "Not your talk" } });
      if (existing.category !== "OPEN")
        return reply.status(403).send({ ok: false, error: { code: "FORBIDDEN", message: "Can only edit OPEN talks" } });

      // 24h edit window
      const age = Date.now() - new Date(existing.created_at).getTime();
      if (age > 24 * 3600 * 1000)
        return reply.status(403).send({ ok: false, error: { code: "EDIT_WINDOW_CLOSED", message: "Edit window closed after 24h" } });

      const { title, bodyMd, tags } = req.body as Partial<CreateBody>;
      type TalksUpdate = Database["public"]["Tables"]["talks"]["Update"];
      const updates: TalksUpdate = {};
      if (title !== undefined) updates.title = title;
      if (bodyMd !== undefined) updates.body_md = bodyMd;
      if (tags !== undefined) updates.tags = tags;

      const { data, error } = await db
        .from("talks")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error)
        return reply.status(500).send({ ok: false, error: { code: "DB_ERROR", message: error.message } });

      return reply.send({ ok: true, data });
    }
  );

  // ── DELETE /api/talks/:id ───────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    if (!req.userId)
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

    const { data: existing } = await db
      .from("talks")
      .select("author_id, category")
      .eq("id", req.params.id)
      .single();

    if (!existing)
      return reply.status(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Talk not found" } });
    if (existing.author_id !== req.userId || existing.category !== "OPEN")
      return reply.status(403).send({ ok: false, error: { code: "FORBIDDEN", message: "Not permitted" } });

    await db.from("talks").update({ is_deleted: true }).eq("id", req.params.id);
    return reply.send({ ok: true, data: null });
  });

  // ── POST /api/talks/:id/vote ────────────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: { value: 1 | -1 } }>(
    "/:id/vote",
    async (req, reply) => {
      if (!req.userId)
        return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });

      const { value } = req.body as { value: 1 | -1 };
      if (value !== 1 && value !== -1)
        return reply.status(400).send({ ok: false, error: { code: "VALIDATION", message: "Value must be 1 or -1" } });

      const { data: existing } = await db
        .from("votes")
        .select("id, value")
        .eq("target_type", "talk")
        .eq("target_id", req.params.id)
        .eq("user_id", req.userId)
        .single();

      if (existing) {
        if (existing.value === value) {
          // Remove vote (toggle off)
          await db.from("votes").delete().eq("id", existing.id);
          await adjustVotes("talks", req.params.id, -value as 1 | -1);
        } else {
          // Change vote direction
          await db.from("votes").update({ value }).eq("id", existing.id);
          await adjustVotes("talks", req.params.id, (value * 2) as 2 | -2);
        }
      } else {
        await db.from("votes").insert({ target_type: "talk", target_id: req.params.id, user_id: req.userId, value });
        await adjustVotes("talks", req.params.id, value);
      }

      return reply.send({ ok: true, data: null });
    }
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function enrichTalks(talks: unknown[], userId: string | null) {
  if (!talks.length) return [];

  const rows = talks as Array<Record<string, unknown>>;

  const repoRefIds = rows.filter((t) => t.category === "REPO" && t.ref_id).map((t) => t.ref_id as string);
  const issueRefIds = rows.filter((t) => t.category === "ISSUE" && t.ref_id).map((t) => t.ref_id as string);

  const [reposResult, issuesResult] = await Promise.all([
    repoRefIds.length
      ? db.from("repos").select("*").in("id", repoRefIds)
      : { data: [] },
    issueRefIds.length
      ? db.from("issue_items").select("*").in("id", issueRefIds)
      : { data: [] },
  ]);

  const repoMap = new Map((reposResult.data ?? []).map((r) => [r.id, r]));
  const issueMap = new Map((issuesResult.data ?? []).map((i) => [i.id, i]));

  let voteMap = new Map<string, number>();
  let bookmarkSet = new Set<string>();

  if (userId) {
    const talkIds = rows.map((t) => t.id as string);
    const [votesResult, bookmarksResult] = await Promise.all([
      db.from("votes").select("target_id, value").eq("target_type", "talk").eq("user_id", userId).in("target_id", talkIds),
      db.from("bookmarks").select("talk_id").eq("user_id", userId).in("talk_id", talkIds),
    ]);
    voteMap = new Map((votesResult.data ?? []).map((v) => [v.target_id, v.value]));
    bookmarkSet = new Set((bookmarksResult.data ?? []).map((b) => b.talk_id));
  }

  return rows.map((t) => ({
    ...(toCamel(t) as object),
    repo: t.category === "REPO" && t.ref_id ? toCamel(repoMap.get(t.ref_id as string)) : undefined,
    issue: t.category === "ISSUE" && t.ref_id ? toCamel(issueMap.get(t.ref_id as string)) : undefined,
    userVote: voteMap.get(t.id as string) ?? null,
    isBookmarked: bookmarkSet.has(t.id as string),
  }));
}

export async function adjustVotes(
  table: "talks" | "comments",
  id: string,
  delta: number
) {
  if (delta === 0) return;
  const isUp = delta > 0;
  const { data: current } = await db
    .from(table)
    .select("upvotes, downvotes")
    .eq("id", id)
    .single();
  if (!current) return;
  const row = current as { upvotes: number; downvotes: number };
  const update = isUp
    ? { upvotes: Math.max(0, row.upvotes + Math.abs(delta)) }
    : { downvotes: Math.max(0, row.downvotes + Math.abs(delta)) };
  await db.from(table).update(update).eq("id", id);
}
