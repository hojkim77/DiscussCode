import { api } from "@/lib/api";
import { TalkCard, TalkCardProps } from "@/components/ui/talk-card";
import { DiscussionItem, DiscussionItemProps } from "@/components/ui/discussion-item";
import type { Talk } from "@discusscode/shared";

function toRepoCard(talk: Talk): TalkCardProps {
  return {
    icon: "folder_open",
    identifier: talk.repo?.fullName ?? talk.refId ?? "",
    badge: talk.tags[0] ?? "Discussion",
    title: talk.title,
    excerpt: talk.bodyMd?.slice(0, 120) ?? "",
    stats: [
      { icon: "chat_bubble", value: String(talk.commentCount) },
      { icon: "visibility", value: talk.viewCount > 999 ? `${(talk.viewCount / 1000).toFixed(1)}k` : String(talk.viewCount) },
    ],
  };
}

function toIssueCard(talk: Talk): TalkCardProps {
  const isClosed = talk.issue?.state === "closed";
  return {
    icon: isClosed ? "check_circle" : "bug_report",
    iconClassName: isClosed ? "text-secondary" : "text-error",
    identifier: talk.issue ? `#${talk.issue.issueNumber}` : (talk.refId ?? ""),
    badge: talk.issue?.labels[0] ?? talk.tags[0] ?? "Issue",
    title: talk.title,
    excerpt: talk.bodyMd?.slice(0, 120) ?? "",
    stats: [
      { icon: "chat_bubble", value: String(talk.commentCount) },
      { icon: isClosed ? "check_circle" : "pending", value: isClosed ? "Solved" : "Open" },
    ],
  };
}

function toDiscussionItem(talk: Talk): DiscussionItemProps {
  return {
    icon: "forum",
    title: talk.title,
    subtitle: talk.tags[0] ?? "",
  };
}

export default async function Home() {
  const [repoResult, issueResult, openResult] = await Promise.allSettled([
    api.talks.list({ category: "REPO", sort: "hot", pageSize: 2 }),
    api.talks.list({ category: "ISSUE", sort: "hot", pageSize: 2 }),
    api.talks.list({ category: "OPEN", sort: "hot", pageSize: 3 }),
  ]);

  const apiError =
    repoResult.status === "rejected" ? String(repoResult.reason) : null;

  const repoTalks: TalkCardProps[] =
    repoResult.status === "fulfilled" ? repoResult.value.items.map(toRepoCard) : [];
  const issueTalks: TalkCardProps[] =
    issueResult.status === "fulfilled" ? issueResult.value.items.map(toIssueCard) : [];
  const openDiscussions: DiscussionItemProps[] =
    openResult.status === "fulfilled" ? openResult.value.items.map(toDiscussionItem) : [];

  return (
    <>
      {apiError && (
        <pre className="bg-red-900 text-white text-xs p-4 mb-6 rounded overflow-auto">
          {`API_URL: ${process.env.API_URL ?? "(not set)"}\nError: ${apiError}`}
        </pre>
      )}
      <section className="mb-20 max-w-4xl">
        <h1 className="text-[3.5rem] font-extrabold tracking-tight text-on-surface leading-tight mb-6">
          코드를 넘어선
          <br />
          깊이 있는 대화
        </h1>
        <p className="text-[1.125rem] text-on-surface-variant leading-relaxed max-w-2xl">
          Repository 단위의 아키텍처 토론부터 개별 Issue의 기술적 해결책까지.
          개발자들의 경험과 인사이트가 모이는 공간입니다.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        <div className="flex flex-col gap-6">
          <div className="mb-4">
            <h2 className="text-[2rem] font-bold text-on-surface tracking-tight mb-2">
              Repo Talks
            </h2>
            <p className="text-on-surface-variant text-base">
              리포지토리 구조, 아키텍처, 기술 스택에 대한 토론
            </p>
          </div>
          {repoTalks.map((talk) => (
            <TalkCard key={talk.identifier} {...talk} />
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="mb-4">
            <h2 className="text-[2rem] font-bold text-on-surface tracking-tight mb-2">
              Issue Talks
            </h2>
            <p className="text-on-surface-variant text-base">
              특정 버그 해결, 기능 구현, 코드 리뷰 관련 논의
            </p>
          </div>
          {issueTalks.map((talk) => (
            <TalkCard key={talk.identifier} {...talk} />
          ))}
        </div>
      </section>

      {openDiscussions.length > 0 && (
        <section className="pt-10 border-t border-surface-container-low">
          <h3 className="text-lg font-medium text-on-surface-variant mb-6">
            Open Discussions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {openDiscussions.map((item) => (
              <DiscussionItem key={item.title} {...item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
