import { cache } from "./cache.js";

const GH_BASE = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DiscussCode/1.0",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

async function ghFetch<T>(path: string, ttlSeconds: number): Promise<T> {
  const cacheKey = `gh:${path}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached) as T;

  const res = await fetch(`${GH_BASE}${path}`, { headers: ghHeaders() });

  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);

  const data = (await res.json()) as T;
  await cache.setex(cacheKey, ttlSeconds, JSON.stringify(data));
  return data;
}

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`GitHub 404: ${path}`);
    this.name = "NotFoundError";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GHRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string } | null;
  topics: string[];
};

export type GHIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
  comments: number;
  reactions: { "+1": number; total_count: number };
  pull_request?: unknown;                          // present = it's a PR, skip
  created_at: string;
  updated_at: string;
};

export type GHReadme = {
  sha: string;
  content: string;                                 // base64
  encoding: string;
};

export type GHCommit = { sha: string };

export type GHSearchResult = { items: GHRepo[]; total_count: number };

// ─── API methods ──────────────────────────────────────────────────────────────

export const github = {
  getRepo: (fullName: string) =>
    ghFetch<GHRepo>(`/repos/${fullName}`, 3600),

  getCommits: (fullName: string, since: string) =>
    ghFetch<GHCommit[]>(
      `/repos/${fullName}/commits?since=${since}&per_page=100`,
      3600
    ),

  getIssues: (
    fullName: string,
    sort: "comments" | "updated" = "comments",
    perPage = 20
  ) =>
    ghFetch<GHIssue[]>(
      `/repos/${fullName}/issues?sort=${sort}&direction=desc&per_page=${perPage}&state=open`,
      900
    ),

  getReadme: (fullName: string) =>
    ghFetch<GHReadme>(`/repos/${fullName}/readme`, 86400),

  searchRepos: (query: string) =>
    ghFetch<GHSearchResult>(
      `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=50`,
      3600
    ),
};
