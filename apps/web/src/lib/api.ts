import type { ApiResponse, PaginatedResult, Repo, IssueItem, Talk, TalkCategory, SortOption } from "@discusscode/shared";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Evaluated at request time so runtime env vars (Vercel) are always read fresh
  const apiBase =
    typeof window === "undefined"
      ? `${process.env.API_URL ?? "http://localhost:4000"}/api`
      : (process.env.NEXT_PUBLIC_API_URL ?? "/api");

  const res = await fetch(`${apiBase}${path}`, {
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
  talks: {
    list: (params?: { category?: TalkCategory; sort?: SortOption; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Talk>>(`/talks${qs ? `?${qs}` : ""}`);
    },
  },
  discussions: {
    list: (params?: { page?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<PaginatedResult<Talk>>(`/talks${qs ? `?${qs}` : ""}`);
    },
    create: (body: { title: string; body: string; tags: string[] }, token: string) =>
      apiFetch<Talk>("/discussions", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
