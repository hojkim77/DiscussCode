import * as cheerio from "cheerio";
import { github } from "../services/github.js";

export type TrendingEntry = {
  owner: string;
  name: string;
  fullName: string;
};

export async function scrapeGithubTrending(
  since: "daily" | "weekly" | "monthly" = "daily"
): Promise<TrendingEntry[]> {
  try {
    return await scrapeHtml(since);
  } catch (err) {
    console.warn("[trending-scraper] HTML parse failed, falling back to Search API:", err);
    return await searchApiFallback();
  }
}

async function scrapeHtml(since: string): Promise<TrendingEntry[]> {
  const res = await fetch(`https://github.com/trending?since=${since}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DiscussCode/1.0; +https://discusscode.dev)",
      Accept: "text/html",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const entries: TrendingEntry[] = [];

  $("article.Box-row").each((_, el) => {
    const href = $(el).find("h2 a").attr("href")?.trim();
    if (!href) return;

    const parts = href.replace(/^\//, "").split("/");
    if (parts.length < 2) return;

    const [owner, name] = parts;
    entries.push({ owner, name, fullName: `${owner}/${name}` });
  });

  if (entries.length === 0) throw new Error("Parsed 0 repos — structure may have changed");
  return entries;
}

async function searchApiFallback(): Promise<TrendingEntry[]> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const result = await github.searchRepos(`pushed:>${since} stars:>500`);

  return (result.items ?? []).slice(0, 50).map((r) => ({
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
  }));
}
