import type { ApiResponse, PaginatedResult, TrendingItem, Issue, Discussion } from "@discusscode/shared";

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
      return apiFetch<PaginatedResult<TrendingItem>>(`/trending${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<TrendingItem>(`/trending/${id}`),
  },
  issues: {
    list: (params?: { page?: number; repo?: string; state?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Issue>>(`/issues${qs ? `?${qs}` : ""}`);
    },
  },
  discussions: {
    list: (params?: { page?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Discussion>>(`/discussions${qs ? `?${qs}` : ""}`);
    },
    create: (body: { title: string; body: string; tags: string[] }, token: string) =>
      apiFetch<Discussion>("/discussions", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
