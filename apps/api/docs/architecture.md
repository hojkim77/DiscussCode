# Architecture — 컴포넌트 구조 및 요청 흐름

## 전체 구성도

```
Browser
  │  (SSR pages + /api/* fetch)
  ▼
Next.js (port 3000)
  │  next.config.ts: rewrites /api/* → http://localhost:4000/api/*
  ▼
Fastify API (port 4000)
  ├── plugins  (auth → redis → rate-limit → swagger)
  ├── routes   (10개 라우트 그룹)
  └── workers  (BullMQ — 같은 프로세스)
        │
        ├── Redis (BullMQ 큐)          ← packages/queue
        ├── Redis (범용 캐시)           ← services/cache.ts
        ├── Supabase (Postgres + RLS)  ← packages/db
        └── GitHub API / Anthropic API
```

---

## Fastify 플러그인 등록 순서

순서가 중요합니다. `server.ts`에서 아래 순서로 등록됩니다:

```
1. @fastify/helmet        보안 헤더
2. @fastify/cors          CORS (WEB_URL origin)
3. authPlugin             onRequest hook → req.userId 세팅
4. redisPlugin            app.cache (IORedis) 데코레이터
5. @fastify/rate-limit    req.userId 기반 키 생성 (auth 다음에 등록해야 함)
6. swaggerPlugin          /docs UI
```

**auth가 rate-limit보다 먼저 등록되어야 하는 이유**: rate-limit의 `keyGenerator`가 `req.userId`를 읽어서 인증 유저(300/min) vs 익명(60/min)으로 구분하기 때문입니다. auth 플러그인은 `onRequest` hook을 사용하므로, 같은 훅 단계에서 rate-limit보다 먼저 실행됩니다.

---

## 인증 흐름

```
Client Request
  │  Authorization: Bearer <supabase-access-token>
  ▼
authPlugin (onRequest)
  │
  ├── Redis 캐시 조회 (key: jwt:<token 마지막 16자>)
  │     hit  → req.userId = cached_id  (DB 왕복 없음)
  │     miss ↓
  │
  └── supabase.auth.getUser(token)
        성공 → req.userId = user.id
               Redis setex 300초 캐시
        실패 → req.userId = null (401 처리는 각 라우트에서)
```

토큰 캐시 TTL은 5분 (Supabase access token의 1시간보다 짧게 설정).

---

## Redis 연결 구분

API 서버 내에서 Redis 연결이 **2개** 사용됩니다. 용도가 다르기 때문에 분리되어 있습니다.

| 인스턴스 | 위치 | 용도 | 옵션 |
|---------|------|------|------|
| `cache` | `services/cache.ts` | JWT 캐시, GitHub API 캐시, 범용 캐시 | `lazyConnect: true` |
| `redisConnection` | `packages/queue/src/redis.ts` | BullMQ 전용 | `maxRetriesPerRequest: null` (BullMQ 필수) |

BullMQ는 내부적으로 blocking Redis 명령(BRPOP 등)을 사용하기 때문에 `maxRetriesPerRequest: null`이 반드시 필요합니다. 이 옵션을 범용 캐시 연결에 사용하면 일반 요청이 무한 재시도 상태에 빠질 수 있어 분리합니다.

---

## 데이터베이스 접근 방식

```
apps/api  ──imports──▶  packages/db
                              │
                              ├── db (service role key — RLS 우회)
                              └── Database types (수동 관리)
```

- **서버 사이드** (`apps/api`): `db` (service role) 사용 → RLS 우회, 모든 행 접근 가능
- **클라이언트 사이드** (`apps/web`): `@supabase/ssr` + anon key → RLS 적용

`packages/db`는 빌드 단계 없이 TypeScript 소스에서 직접 임포트됩니다 (`workspace:*` + tsconfig path alias).

---

## Talk 카테고리 구조

`talks` 테이블은 4종류의 콘텐츠를 하나의 테이블로 통합합니다:

| category | ref_id | 생성 주체 | 설명 |
|----------|--------|---------|------|
| `REPO` | `repos.id` | collect-trending 워커 | GitHub 트렌딩 레포 토론 |
| `ISSUE` | `issue_items.id` | collect-issues 워커 | WatchList 이슈 토론 |
| `OPEN` | `null` | 유저 직접 작성 | 자유 토론 |
| `TREND` | `null` | collect-trending 워커 | HN/트렌딩 토픽 |

`REPO`/`ISSUE` 카테고리의 Talk은 워커가 자동 생성하며, `enrichTalks()` 함수로 ref 데이터가 응답에 포함됩니다.

---

## enrichTalks — Talk 응답 보강

`GET /api/talks` 및 `GET /api/talks/:id` 응답 시, 아래 4가지가 병렬로 조회되어 Talk 객체에 추가됩니다:

```
talks 목록
  │
  ├── category=REPO인 ref_id들 → repos 테이블 조회
  ├── category=ISSUE인 ref_id들 → issue_items 테이블 조회
  ├── userId 있으면 → votes 테이블 조회 (userVote: 1 | -1 | null)
  └── userId 있으면 → bookmarks 테이블 조회 (isBookmarked: boolean)
```

응답 Talk 객체에 추가되는 필드: `repo`, `issue`, `userVote`, `isBookmarked`

---

## language / repo / domain 필터 처리

`GET /api/talks` 의 `language`, `repo`, `domain` 파라미터는 refs 테이블 데이터 기반 필터입니다. 페이지네이션 정확도를 위해 **메인 쿼리 실행 전** 두 단계로 처리됩니다:

```
1. [병렬] language → repos 테이블에서 language ILIKE 매칭 → repo id 목록
         repo     → issue_items 테이블에서 repo_full_name 매칭 → issue id 목록

2. 메인 talks 쿼리에 ref_id IN (...) 조건 추가 후 .range() 적용
   domain은 category='TREND' AND tags @> [domain]으로 직접 추가
```

---

## API 응답 형식

모든 엔드포인트는 `ApiResponse<T>` 형태를 반환합니다:

```typescript
// 성공
{ ok: true, data: T }

// 실패
{ ok: false, error: { code: string, message: string } }
```

에러 코드 목록:

| code | HTTP | 의미 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 로그인 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION` | 400 | 입력값 오류 |
| `WRITE_BANNED` | 403 | 쓰기 차단된 계정 |
| `EDIT_WINDOW_CLOSED` | 403 | 24h 편집 창 만료 |
| `HANDLE_TAKEN` | 409 | 핸들 중복 |
| `RATE_LIMITED` | 429 | 요청 초과 |
| `DB_ERROR` | 500 | DB 오류 |

---

## Rate Limiting

| 대상 | 한도 | 키 |
|------|------|----|
| 익명 유저 | 60 req/min | IP |
| 인증 유저 | 300 req/min | userId |

한도 초과 시: `429 { ok: false, error: { code: "RATE_LIMITED", message: "...retry after Xs" } }`

---

## Supabase 타입 주의사항

`packages/db/src/database.types.ts`는 **수동 관리** 파일입니다. `@supabase/postgrest-js` v2 는 `GenericTable`의 모든 테이블에 `Relationships: GenericRelationship[]` 필드가 있어야 타입이 정상 동작합니다. 없으면 쿼리 반환 타입이 `never`가 됩니다.

스키마 변경 시 이 파일을 직접 수정하거나, Supabase 로컬 환경에서 `pnpm --filter @discusscode/db generate`로 재생성합니다.
