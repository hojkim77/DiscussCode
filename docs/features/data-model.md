# Data Model

## Tables

```
User
  id, handle, email, github_id, avatar, bio, reputation, created_at

Repo                              ← Repo Talks 원천
  id, github_id, owner, name, lang, stars, forks, heat_score,
  summary_ai, last_synced_at

RepoSnapshot                      ← star/fork delta 계산용 (1h 주기 저장)
  id, repo_id, stars, forks, recorded_at

WatchedRepo                       ← Issue Talks용 감시 레포 목록
  id, owner, name, domain, is_active, added_at

IssueItem                         ← Issue Talks 원천
  id, github_id, repo_id, title, body_md, labels, state,
  comment_count, reaction_plus1, heat_score, summary_ai, last_synced_at

Talk                              ← 모든 카테고리의 토론 스레드
  id, category(REPO|ISSUE|OPEN|TREND), ref_id, author_id?,
  title, body_md?, tags[], heat_score, created_at

Comment
  id, talk_id, parent_id?, author_id, body_md, upvotes, downvotes, created_at

Reaction
  id, target_type, target_id, user_id, emoji

Bookmark
  id, user_id, talk_id

Follow
  id, user_id, target_type(REPO|TAG|USER), target_id

Notification
  id, user_id, type, payload, read_at
```

## Key Notes
- `Talk.ref_id` → Repo/Issue의 경우 Repo.id 또는 IssueItem.id 참조
- `Talk.author_id` → Open/Trend Talks는 필수, Repo/Issue는 null (시스템 생성)
- `RepoSnapshot`은 delta 계산에만 사용, 별도 cleanup 정책 필요 (예: 7일치만 보관)
- `WatchedRepo`는 MVP에서 하드코딩 seed, v1.1+에서 어드민 UI로 관리
