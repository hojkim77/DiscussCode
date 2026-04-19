import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "@discusscode/queue";
import { db } from "@discusscode/db";
import type { GenerateSummaryPayload } from "@discusscode/shared";
import { generateSummary, decodeReadme } from "../services/llm.js";
import { github } from "../services/github.js";

export function createGenerateSummaryWorker() {
  return new Worker<GenerateSummaryPayload>(
    QUEUE_NAMES.GENERATE_SUMMARY,
    async (job) => {
      const { type, itemId } = job.data;

      if (type === "repo") {
        const { data: repo, error } = await db
          .from("repos")
          .select("id, full_name, description, summary_ai, readme_sha")
          .eq("id", itemId)
          .single();

        if (error || !repo) {
          job.log(`Repo ${itemId} not found`);
          return;
        }
        if (repo.summary_ai) {
          job.log(`Repo ${itemId} already has a summary — skipping`);
          return;
        }

        // Fetch README for richer context
        let readmeText: string | null = null;
        try {
          const readme = await github.getReadme(repo.full_name);
          readmeText = await decodeReadme(readme.content);

          // Update readme_sha so we know which version we summarised
          await db.from("repos").update({ readme_sha: readme.sha }).eq("id", itemId);
        } catch {
          // README may not exist — fall back to description only
        }

        const body = [repo.description, readmeText].filter(Boolean).join("\n\n");
        const summary = await generateSummary(repo.full_name, body);

        await db.from("repos").update({ summary_ai: summary }).eq("id", itemId);

        // Also update the Repo Talk title/body
        await db
          .from("talks")
          .update({ body_md: summary })
          .eq("category", "REPO")
          .eq("ref_id", itemId);

        job.log(`Generated summary for repo ${repo.full_name}`);
        return;
      }

      if (type === "issue") {
        const { data: issue, error } = await db
          .from("issue_items")
          .select("id, title, body_md, summary_ai")
          .eq("id", itemId)
          .single();

        if (error || !issue) {
          job.log(`Issue ${itemId} not found`);
          return;
        }
        if (issue.summary_ai) {
          job.log(`Issue ${itemId} already has a summary — skipping`);
          return;
        }

        const summary = await generateSummary(issue.title, issue.body_md ?? null);
        await db.from("issue_items").update({ summary_ai: summary }).eq("id", itemId);

        // Reflect in the Issue Talk
        await db
          .from("talks")
          .update({ body_md: summary })
          .eq("category", "ISSUE")
          .eq("ref_id", itemId);

        job.log(`Generated summary for issue ${itemId}`);
        return;
      }

      job.log(`Unknown summary type: ${type}`);
    },
    {
      connection: redisConnection,
      concurrency: 3,       // LLM calls can run in parallel
      limiter: { max: 10, duration: 60_000 }, // max 10 LLM calls/min (cost guard)
    }
  );
}
