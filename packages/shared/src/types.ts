// ─── Enums ────────────────────────────────────────────────────────────────────

export type TalkCategory = "REPO" | "ISSUE" | "OPEN" | "TREND";
export type TalkType = "Discussion" | "Question" | "Show & Tell" | "Meme";
export type SortOption = "hot" | "new" | "top" | "commented";
export type TimePeriod = "24h" | "7d" | "30d" | "all";
export type FollowTargetType = "REPO" | "TAG" | "USER";
export type NotificationType = "reply" | "mention" | "hot_talk" | "follow";
export type VoteValue = 1 | -1;

// ─── Domain Models ────────────────────────────────────────────────────────────

export type User = {
  id: string;
  handle: string;
  email?: string;
  githubHandle?: string;
  avatar?: string;
  bio?: string;
  reputation: number;
  isPublic: boolean;
  isVerifiedDev: boolean;
  createdAt: string;
};

export type Repo = {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  license?: string;
  topics: string[];
  openIssues: number;
  heatScore: number;
  summaryAi?: string;
  lastSyncedAt?: string;
};

export type RepoSnapshot = {
  id: string;
  repoId: string;
  stars: number;
  forks: number;
  recordedAt: string;
};

export type IssueItem = {
  id: string;
  githubId: number;
  repoFullName: string;
  issueNumber: number;
  title: string;
  bodyMd?: string;
  labels: string[];
  state: "open" | "closed";
  commentCount: number;
  reactionPlus1: number;
  heatScore: number;
  summaryAi?: string;
  githubUrl: string;
  lastSyncedAt?: string;
};

export type Talk = {
  id: string;
  category: TalkCategory;
  refId?: string;
  authorId?: string;
  title: string;
  bodyMd?: string;
  tags: string[];
  talkType?: TalkType;
  heatScore: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  uniqueParticipants: number;
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  author?: Pick<User, "id" | "handle" | "avatar" | "isVerifiedDev">;
  repo?: Repo;
  issue?: IssueItem;
  userVote?: VoteValue | null;
  isBookmarked?: boolean;
};

export type Comment = {
  id: string;
  talkId: string;
  parentId?: string;
  authorId: string;
  bodyMd: string;
  upvotes: number;
  downvotes: number;
  depth: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  author?: Pick<User, "id" | "handle" | "avatar" | "isVerifiedDev">;
  userVote?: VoteValue | null;
  reactions?: ReactionSummary[];
  replies?: Comment[];
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export type Bookmark = {
  id: string;
  userId: string;
  talkId: string;
  createdAt: string;
};

export type Follow = {
  id: string;
  userId: string;
  targetType: FollowTargetType;
  targetId: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
};

export type Draft = {
  id: string;
  userId: string;
  title?: string;
  bodyMd?: string;
  tags: string[];
  talkType?: TalkType;
  createdAt: string;
  updatedAt: string;
};

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

// ─── BullMQ Job Payloads ──────────────────────────────────────────────────────

export type CollectTrendingPayload = {
  source?: "github" | "hackernews";
  limit?: number;
};

export type CollectIssuesPayload = {
  repoFullName?: string;  // if omitted: run all WatchList repos
};

export type GenerateSummaryPayload = {
  type: "repo" | "issue" | "talk";
  itemId: string;
};

export type RecalcHeatScorePayload = {
  type: "repo" | "issue" | "talk";
  itemId?: string;        // if omitted: recalc all
};
