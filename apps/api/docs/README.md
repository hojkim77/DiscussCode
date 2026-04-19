# DiscussCode API — Backend Documentation

Fastify 5 REST API server. Runs on port **4000** by default.

## Docs Index

| 파일 | 내용 |
|------|------|
| [architecture.md](./architecture.md) | 컴포넌트 구조 및 요청 흐름 |
| [routes.md](./routes.md) | 전체 API 엔드포인트 레퍼런스 |
| [workers.md](./workers.md) | 백그라운드 잡 및 스케줄러 |

---

## 빠른 시작

### 1. 환경변수 설정

```bash
cp apps/api/.env.example apps/api/.env
```

필수 값 (`apps/api/.env`):

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...           # 선택 — GitHub API rate limit 상향
PORT=4000
NODE_ENV=development
WEB_URL=http://localhost:3000  # CORS origin
```

> `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용. 클라이언트에 절대 노출 금지.

### 2. 의존성 설치

```bash
# 레포 루트에서
pnpm install
```

### 3. DB 마이그레이션 적용

Supabase 대시보드 또는 CLI에서 아래 SQL을 순서대로 실행:

```
packages/db/migrations/001_initial.sql   # 전체 스키마 + RLS + 트리거
packages/db/migrations/002_watchlist_seed.sql  # WatchList 40개 레포 시드
```

### 4. 로컬 Redis 실행

```bash
redis-server
# 또는 Docker
docker run -p 6379:6379 redis:alpine
```

### 5. API 서버 실행

```bash
# 개발 (tsx watch — 핫 리로드)
pnpm --filter @discusscode/api dev

# 빌드 후 실행
pnpm --filter @discusscode/api build
pnpm --filter @discusscode/api start
```

서버가 뜨면 백그라운드 워커와 스케줄러도 같은 프로세스 안에서 함께 시작됩니다.

### 6. 동작 확인

```bash
curl http://localhost:4000/health
# {"status":"ok","ts":"2026-04-18T..."}

# Swagger UI
open http://localhost:4000/docs
```

---

## 타입 체크 / 린트

```bash
pnpm --filter @discusscode/api typecheck
pnpm --filter @discusscode/api lint
```

---

## 프로젝트 구조

```
apps/api/src/
├── server.ts              # 서버 진입점 — 플러그인·라우트·워커 등록
├── plugins/
│   ├── auth.ts            # Supabase JWT 검증 → req.userId
│   ├── redis.ts           # IORedis 인스턴스 → app.cache
│   └── swagger.ts         # Swagger/OpenAPI 설정
├── routes/
│   ├── auth.ts            # /api/auth/*  (프로필, 알림, 드래프트)
│   ├── talks.ts           # /api/talks/*
│   ├── comments.ts        # /api/talks/:id/comments + /api/comments/:id
│   ├── reactions.ts       # /api/reactions
│   ├── bookmarks.ts       # /api/bookmarks
│   ├── follows.ts         # /api/follows
│   ├── search.ts          # /api/search
│   ├── repos.ts           # /api/repos
│   ├── issues.ts          # /api/issues
│   └── users.ts           # /api/users
├── workers/
│   ├── index.ts           # startWorkers() — 모든 워커 등록
│   ├── collect-trending.worker.ts
│   ├── collect-issues.worker.ts
│   ├── generate-summary.worker.ts
│   └── recalc-heat-score.worker.ts
├── services/
│   ├── cache.ts           # 범용 Redis 캐시 클라이언트
│   ├── github.ts          # GitHub REST API + Redis 캐시
│   ├── heat.ts            # Heat Score 계산 공식
│   └── llm.ts             # Anthropic claude-haiku-4-5 요약 생성
└── scrapers/
    ├── github-trending.ts # github.com/trending HTML 스크래핑
    └── hackernews.ts      # HN API
```
