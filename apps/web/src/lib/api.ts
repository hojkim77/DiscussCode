import type { ApiResponse, PaginatedResult, Repo, IssueItem, Talk } from "@discusscode/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export const api = {
  trending: {
    list: (params?: { page?: number; source?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Repo>>(`/trending${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<Repo>(`/trending/${id}`),
  },
  issues: {
    list: (params?: { page?: number; repo?: string; state?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<IssueItem>>(`/issues${qs ? `?${qs}` : ""}`);
    },
  },
  discussions: {
    list: (params?: { page?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Talk>>(`/discussions${qs ? `?${qs}` : ""}`);
    },
    create: (body: { title: string; body: string; tags: string[] }, token: string) =>
      apiFetch<Talk>("/discussions", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
