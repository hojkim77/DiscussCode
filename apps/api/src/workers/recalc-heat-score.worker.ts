import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "@discusscode/queue";
import { db } from "@discusscode/db";
import type { RecalcHeatScorePayload } from "@discusscode/shared";
import { calcTalkHeatScore, calcRepoHeatScore, calcIssueHeatScore } from "../services/heat.js";

export function createRecalcHeatScoreWorker() {
  return new Worker<RecalcHeatScorePayload>(
    QUEUE_NAMES.RECALC_HEAT_SCORE,
    async (job) => {
      const { type, itemId } = job.data;

      if (type === "talk") {
        const query = db
          .from("talks")
          .select("id, upvotes, downvotes, comment_count, unique_participants, created_at, category, ref_id");

        const { data: talks } = itemId ? await query.eq("id", itemId) : await query.eq("is_deleted", false);

        for (const talk of talks ?? []) {
          const heat = calcTalkHeatScore({
            upvotes: talk.upvotes,
            downvotes: talk.downvotes,
            commentCount: talk.comment_count,
            uniqueParticipants: talk.unique_participants,
            createdAt: talk.created_at,
          });
          await db.from("talks").update({ heat_score: heat }).eq("id", talk.id);
        }

        job.log(`Recalculated talk heat scores for ${talks?.length ?? 0} talks`);
        return;
      }

      if (type === "repo") {
        const query = db.from("repos").select("id, stars, forks");
        const { data: repos } = itemId ? await query.eq("id", itemId) : await query;
        const seven_days_ago = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

        for (const repo of repos ?? []) {
          // Get oldest snapshot from ~7d ago
          const { data: oldSnap } = await db
            .from("repo_snapshots")
            .select("stars, forks")
            .eq("repo_id", repo.id)
            .lte("recorded_at", seven_days_ago)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .single();

          // Count commits in last 7d — use snapshot count as proxy if no fresh data
          const deltaStars = oldSnap ? Math.max(0, repo.stars - oldSnap.stars) : 0;
          const deltaForks = oldSnap ? Math.max(0, repo.forks - oldSnap.forks) : 0;

          const heat = calcRepoHeatScore({
            deltaStars7d: deltaStars,
            deltaForks7d: deltaForks,
            commitCount7d: 0, // updated by collect-trending worker on each sync
          });

          await db.from("repos").update({ heat_score: heat }).eq("id", repo.id);

          // Sync to Talk
          await db
            .from("talks")
            .update({ heat_score: heat })
            .eq("category", "REPO")
            .eq("ref_id", repo.id);
        }

        job.log(`Recalculated repo heat scores for ${repos?.length ?? 0} repos`);
        return;
      }

      if (type === "issue") {
        const query = db.from("issue_items").select("id, comment_count, reaction_plus1, labels");
        const { data: issues } = itemId ? await query.eq("id", itemId) : await query;

        for (const issue of issues ?? []) {
          const heat = calcIssueHeatScore({
            commentCount: issue.comment_count,
            reactionPlus1: issue.reaction_plus1,
            labels: issue.labels,
          });

          await db.from("issue_items").update({ heat_score: heat }).eq("id", issue.id);

          await db
            .from("talks")
            .update({ heat_score: heat })
            .eq("category", "ISSUE")
            .eq("ref_id", issue.id);
        }

        job.log(`Recalculated issue heat scores for ${issues?.length ?? 0} issues`);
      }
    },
    { connection: redisConnection, concurrency: 1 }
  );
}
