import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "@discusscode/queue";
import { db } from "@discusscode/db";
import type { CollectTrendingPayload } from "@discusscode/shared";
import { github } from "../services/github.js";
import { cache } from "../services/cache.js";
import { calcRepoHeatScore } from "../services/heat.js";
import { scrapeGithubTrending } from "../scrapers/github-trending.js";

const MAX_REPOS = 50;
const SYNC_LOCK_TTL = 50 * 60; // 50 min — prevents duplicate within same 1h cycle

export function createCollectTrendingWorker() {
  return new Worker<CollectTrendingPayload>(
    QUEUE_NAMES.COLLECT_TRENDING,
    async (job) => {
      job.log("Starting trending collection");

      const entries = await scrapeGithubTrending("daily");
      job.log(`Scraped ${entries.length} trending repos`);

      let synced = 0;
      const seven_days_ago = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      for (const entry of entries.slice(0, MAX_REPOS)) {
        const lockKey = `repo_sync_lock:${entry.fullName}`;
        const locked = await cache.get(lockKey);
        if (locked) continue;

        try {
          // 1. Fetch repo meta + commits in parallel
          const [ghRepo, commits] = await Promise.all([
            github.getRepo(entry.fullName),
            github.getCommits(entry.fullName, seven_days_ago),
          ]);

          const commitCount7d = commits.length;

          // 2. Upsert repos table
          const { data: repo, error: repoErr } = await db
            .from("repos")
            .upsert(
              {
                github_id: ghRepo.id,
                owner: ghRepo.owner.login,
                name: ghRepo.name,
                full_name: ghRepo.full_name,
                description: ghRepo.description ?? undefined,
                language: ghRepo.language ?? undefined,
                stars: ghRepo.stargazers_count,
                forks: ghRepo.forks_count,
                license: ghRepo.license?.spdx_id ?? undefined,
                topics: ghRepo.topics ?? [],
                open_issues: ghRepo.open_issues_count,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "github_id" }
            )
            .select("id, readme_sha, summary_ai")
            .single();

          if (repoErr || !repo) {
            job.log(`Failed to upsert repo ${entry.fullName}: ${repoErr?.message}`);
            continue;
          }

          // 3. Insert snapshot
          await db.from("repo_snapshots").insert({
            repo_id: repo.id,
            stars: ghRepo.stargazers_count,
            forks: ghRepo.forks_count,
          });

          // 4. Get 7d-old snapshot for delta
          const { data: oldSnapshot } = await db
            .from("repo_snapshots")
            .select("stars, forks")
            .eq("repo_id", repo.id)
            .lte("recorded_at", new Date(Date.now() - 6.5 * 24 * 3600 * 1000).toISOString())
            .order("recorded_at", { ascending: false })
            .limit(1)
            .single();

          const deltaStars7d = oldSnapshot
            ? ghRepo.stargazers_count - oldSnapshot.stars
            : 0;
          const deltaForks7d = oldSnapshot
            ? ghRepo.forks_count - oldSnapshot.forks
            : 0;

          // 5. Calculate + update heat score
          const heatScore = calcRepoHeatScore({
            deltaStars7d: Math.max(0, deltaStars7d),
            deltaForks7d: Math.max(0, deltaForks7d),
            commitCount7d,
          });

          await db.from("repos").update({ heat_score: heatScore }).eq("id", repo.id);

          // 6. Find or create Repo Talk
          const { data: existingTalk } = await db
            .from("talks")
            .select("id, heat_score")
            .eq("category", "REPO")
            .eq("ref_id", repo.id)
            .single();

          if (!existingTalk) {
            await db.from("talks").insert({
              category: "REPO",
              ref_id: repo.id,
              title: `${ghRepo.full_name}: ${ghRepo.description ?? ""}`.slice(0, 200).trim(),
              tags: [
                ...(ghRepo.language ? [ghRepo.language.toLowerCase()] : []),
                ...(ghRepo.topics ?? []).slice(0, 4),
              ],
              heat_score: heatScore,
            });
          } else {
            await db.from("talks").update({ heat_score: heatScore }).eq("id", existingTalk.id);
          }

          // 8. Lock to prevent re-sync this cycle
          await cache.setex(lockKey, SYNC_LOCK_TTL, "1");
          synced++;

          // Throttle: 200ms between GitHub API calls
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          job.log(`Error syncing ${entry.fullName}: ${(err as Error).message}`);
        }
      }

      job.log(`Trending collection complete. Synced ${synced}/${entries.length} repos.`);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );
}
