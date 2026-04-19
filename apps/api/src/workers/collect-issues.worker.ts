import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES, generateSummaryQueue } from "@discusscode/queue";
import { db } from "@discusscode/db";
import type { CollectIssuesPayload } from "@discusscode/shared";
import { github } from "../services/github.js";
import { calcIssueHeatScore } from "../services/heat.js";

// Issue selection filter (spec §4.2)
const FILTER_MIN_COMMENTS = 50;
const FILTER_MONTHS = 6;

export function createCollectIssuesWorker() {
  return new Worker<CollectIssuesPayload>(
    QUEUE_NAMES.COLLECT_ISSUES,
    async (job) => {
      job.log("Starting issue collection");

      // Get active WatchList repos
      let watchedRepos: Array<{ id: string; full_name: string; owner: string; name: string }> = [];

      if (job.data.repoFullName) {
        watchedRepos = [{ id: "", full_name: job.data.repoFullName, owner: "", name: "" }];
      } else {
        const { data, error } = await db
          .from("watched_repos")
          .select("id, full_name, owner, name")
          .eq("is_active", true);

        if (error || !data) {
          job.log(`Failed to load WatchList: ${error?.message}`);
          return;
        }
        watchedRepos = data;
      }

      job.log(`Processing ${watchedRepos.length} repos`);
      const cutoff = new Date(Date.now() - FILTER_MONTHS * 30 * 24 * 3600 * 1000).toISOString();
      let collected = 0;

      for (const watched of watchedRepos) {
        try {
          const issues = await github.getIssues(watched.full_name, "comments", 50);

          for (const issue of issues) {
            // Skip PRs
            if (issue.pull_request) continue;

            // Filter: min comments, within 6 months
            if (issue.comments < FILTER_MIN_COMMENTS) continue;
            if (issue.created_at < cutoff) continue;

            const labels = issue.labels.map((l) => l.name);
            const heatScore = calcIssueHeatScore({
              commentCount: issue.comments,
              reactionPlus1: issue.reactions?.["+1"] ?? 0,
              labels,
            });

            const { data: upserted, error: upsertErr } = await db
              .from("issue_items")
              .upsert(
                {
                  github_id: issue.id,
                  watched_repo_id: watched.id || null,
                  repo_full_name: watched.full_name,
                  issue_number: issue.number,
                  title: issue.title,
                  body_md: issue.body ?? null,
                  labels,
                  state: issue.state,
                  comment_count: issue.comments,
                  reaction_plus1: issue.reactions?.["+1"] ?? 0,
                  heat_score: heatScore,
                  github_url: issue.html_url,
                  last_synced_at: new Date().toISOString(),
                },
                { onConflict: "repo_full_name,issue_number" }
              )
              .select("id, summary_ai")
              .single();

            if (upsertErr || !upserted) continue;

            // Create Issue Talk if it doesn't exist
            const { data: existingTalk } = await db
              .from("talks")
              .select("id")
              .eq("category", "ISSUE")
              .eq("ref_id", upserted.id)
              .single();

            if (!existingTalk) {
              await db.from("talks").insert({
                category: "ISSUE",
                ref_id: upserted.id,
                title: issue.title,
                tags: labels.slice(0, 5),
                heat_score: heatScore,
              });
            } else {
              await db.from("talks").update({ heat_score: heatScore }).eq("id", existingTalk.id);
            }

            // Queue summary for new items
            if (!upserted.summary_ai) {
              await generateSummaryQueue.add("generate-issue-summary", {
                type: "issue",
                itemId: upserted.id,
              });
            }

            collected++;
          }

          // Throttle
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          job.log(`Error collecting ${watched.full_name}: ${(err as Error).message}`);
        }
      }

      job.log(`Issue collection complete. Collected/updated ${collected} issues.`);
    },
    { connection: redisConnection, concurrency: 1 }
  );
}
