# API Routes Reference

Base URL: `http://localhost:4000`

인증이 필요한 엔드포인트는 `Authorization: Bearer <supabase-access-token>` 헤더가 필요합니다.

---

## 헬스 체크

```
GET /health
```

응답: `{ status: "ok", ts: "2026-04-18T..." }`

---

## Auth — `/api/auth`

### `GET /api/auth/me`
현재 로그인된 유저의 프로필 반환.

**인증 필요**

응답 `data`:
```ts
{
  id, handle, email, github_handle, avatar, bio,
  reputation, is_public, is_verified_dev, created_at
}
```

---

### `PATCH /api/auth/me`
프로필 수정.

**인증 필요**

Body:
```ts
{ handle?: string; bio?: string; isPublic?: boolean }
```

- `handle` 변경 시 중복 검사 수행 → 중복이면 `409 HANDLE_TAKEN`

---

### `GET /api/auth/notifications`
내 알림 목록.

**인증 필요** | Query: `page?`, `unreadOnly?: boolean`

응답 `data`: `{ items, total, page, pageSize, hasNext }`

---

### `POST /api/auth/notifications/read`
알림을 읽음 처리.

**인증 필요**

Body: `{ ids?: string[] }` — 생략 시 전체 읽음 처리

---

### `GET /api/auth/drafts`
내 임시저장 목록.

**인증 필요**

---

### `POST /api/auth/drafts`
임시저장 생성.

**인증 필요**

Body: `{ title?, bodyMd?, tags?, talkType? }`

---

### `DELETE /api/auth/drafts/:id`
임시저장 삭제.

**인증 필요**

---

## Talks — `/api/talks`

Talk은 플랫폼의 핵심 단위입니다. `REPO`, `ISSUE`, `OPEN`, `TREND` 4가지 카테고리가 있습니다.

### `GET /api/talks`
Talk 목록 (페이지네이션).

Query:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `category` | `REPO\|ISSUE\|OPEN\|TREND` | — | 카테고리 필터 |
| `sort` | `hot\|new\|top\|commented` | `hot` | 정렬 기준 |
| `period` | `24h\|7d\|30d\|all` | `all` | 기간 필터 (sort=top/commented일 때만 적용) |
| `tags` | `string[]` | — | 태그 AND 필터 |
| `language` | `string` | — | REPO 카테고리: 레포 언어 필터 |
| `repo` | `string` | — | ISSUE 카테고리: `owner/name` 형식 |
| `domain` | `string` | — | TREND 카테고리: 태그 필터 |
| `page` | `number` | `1` | |
| `pageSize` | `number` | `20` | |

응답 `data`:
```ts
{
  items: Talk[],   // repo/issue/userVote/isBookmarked 포함
  total: number,
  page: number,
  pageSize: number,
  hasNext: boolean
}
```

**language/repo/domain 필터 동작**: 메인 쿼리 실행 전 refs 테이블에서 id 목록을 선조회하여 WHERE 절에 포함합니다. 매칭 결과가 없으면 즉시 빈 배열 반환.

---

### `GET /api/talks/:id`
Talk 상세 조회. 조회 시 `view_count` +1 (fire-and-forget).

응답 `data`: Talk + 인증 유저의 `userVote`, `isBookmarked`

---

### `POST /api/talks`
`OPEN` 카테고리 Talk 생성.

**인증 필요** | 쓰기 차단 계정 거부

Body:
```ts
{ title: string; bodyMd?: string; tags?: string[]; talkType?: string }
```

- `title` 최대 200자
- `tags` 최대 5개

응답: `201 { ok: true, data: Talk }`

---

### `PATCH /api/talks/:id`
Talk 수정.

**인증 필요** | 작성자 본인만 | `OPEN` 카테고리만 | 생성 후 24시간 이내만

Body: `{ title?, bodyMd?, tags? }`

---

### `DELETE /api/talks/:id`
Talk 삭제 (soft delete — `is_deleted: true`).

**인증 필요** | 작성자 본인만 | `OPEN` 카테고리만

---

### `POST /api/talks/:id/vote`
Talk 투표. 같은 값으로 재투표 시 취소(토글).

**인증 필요**

Body: `{ value: 1 | -1 }`

투표 변경/취소 시 `upvotes`/`downvotes` 컬럼에 delta 방식으로 반영.

---

## Comments — prefix 없음

### `GET /api/talks/:talkId/comments`
Talk의 댓글 목록 (트리 구조 반환).

Query: `sort?: "best" | "new" | "top"` (기본: `best`)

응답 `data`: 댓글 트리 (각 댓글에 `replies[]` 포함) + `userVote`, `reactions`

---

### `POST /api/talks/:talkId/comments`
댓글 작성.

**인증 필요** | 쓰기 차단 계정 거부

Body: `{ bodyMd: string; parentId?: string }`

- `parentId` 있으면 대댓글, `depth = parent.depth + 1`
- 작성 후 talk_author, parent_author, @mention 대상에게 알림 발송

---

### `PATCH /api/comments/:id`
댓글 수정.

**인증 필요** | 작성자 본인만

Body: `{ bodyMd: string }`

---

### `DELETE /api/comments/:id`
댓글 삭제 (soft delete — `body_md: "[deleted]"`, `is_deleted: true`).

**인증 필요** | 작성자 본인만

---

### `POST /api/comments/:id/vote`
댓글 투표. Talk 투표와 동일한 delta 방식.

**인증 필요**

Body: `{ value: 1 | -1 }`

---

## Reactions — `/api/reactions`

### `POST /api/reactions`
리액션 추가/취소 (토글).

**인증 필요**

Body:
```ts
{ targetType: "talk" | "comment"; targetId: string; emoji: string }
```

허용 이모지: `👍 👎 ❤️ 🚀 😄 🎉 🤔 👀`

응답: `{ added: boolean }`

---

### `GET /api/reactions`
대상의 리액션 집계.

Query: `targetType: "talk" | "comment"`, `targetId: string`

응답 `data`:
```ts
Array<{ emoji: string; count: number; userReacted: boolean }>
```

---

## Bookmarks — `/api/bookmarks`

### `POST /api/bookmarks/:talkId`
북마크 추가/취소 (토글).

**인증 필요**

응답: `{ bookmarked: boolean }`

---

### `GET /api/bookmarks`
내 북마크 목록.

**인증 필요** | Query: `page?`, `category?`

응답 `data`: `{ items, total, page, pageSize, hasNext }`

> `category` 필터는 포스트 쿼리로 처리됩니다 (Supabase JS의 embedded 필터 제약).

---

## Follows — `/api/follows`

### `POST /api/follows`
팔로우/언팔로우 (토글).

**인증 필요**

Body: `{ targetType: "REPO" | "TAG" | "USER"; targetId: string }`

응답: `{ following: boolean }`

---

### `GET /api/follows`
내 팔로우 목록.

**인증 필요** | Query: `type?: "REPO" | "TAG" | "USER"`

---

### `GET /api/follows/status`
특정 대상을 팔로우 중인지 확인.

Query: `targetType`, `targetId`

응답: `{ following: boolean }` (미인증 시 `false` 반환)

---

## Search — `/api/search`

### `GET /api/search`
Talk 전문 검색 (Postgres FTS — `tsvector`).

Query:
| 파라미터 | 설명 |
|---------|------|
| `q` | 검색어 (필수, websearch 문법 지원) |
| `category` | 카테고리 필터 |
| `tags` | 태그 필터 |
| `period` | `24h \| 7d \| 30d \| all` |
| `page` | |

---

### `GET /api/search/autocomplete`
제목 자동완성 (ILIKE `%q%`).

Query: `q` (2자 이상), `category?`

응답: 최대 8개 `{ id, title, category, tags }`

---

## Repos — `/api/repos`

### `GET /api/repos`
레포 목록 (`heat_score` 내림차순).

Query: `page?`, `language?`

---

### `GET /api/repos/:id`
레포 상세 + 최근 7일치 스냅샷 (1h 간격, 최대 168개).

응답 `data`: `{ ...repo, snapshots: [{ stars, forks, recorded_at }] }`

---

## Issues — `/api/issues`

### `GET /api/issues`
이슈 목록 (`heat_score` 내림차순).

Query: `page?`, `repo?` (owner/name), `label?`, `state?: "open" | "closed"`

---

### `GET /api/issues/:id`
이슈 상세.

---

## Users — `/api/users`

### `GET /api/users/:handle`
공개 프로필 조회.

- `is_public: false` 인 경우 본인 외 `403 PRIVATE`
- 응답에 `stats: { talkCount, commentCount }` 포함

---

### `GET /api/users/:handle/talks`
유저가 작성한 `OPEN` 카테고리 Talk 목록.

Query: `page?`

- `is_public: false`인 프로필은 본인 외 `403 PRIVATE`
