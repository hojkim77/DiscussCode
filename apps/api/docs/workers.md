# Background Jobs — Workers & Scheduler

API 서버 프로세스 내에서 BullMQ 워커가 함께 실행됩니다. `server.ts`의 `startWorkers()` + `initScheduler()` 호출로 시작됩니다.

---

## 큐 구조

```
packages/queue/
├── src/redis.ts       redisConnection (maxRetriesPerRequest: null — BullMQ 필수)
├── src/queues.ts      4개 Queue 인스턴스 export
└── src/scheduler.ts   initScheduler() — 반복 잡 등록 (upsertJobScheduler)
```

---

## 워커 목록

### 1. collect-trending

**큐**: `collect-trending` | **스케줄**: 매 1시간 | **동시성**: 1

GitHub Trending 페이지를 스크래핑하여 레포 정보를 수집하고 Talk을 자동 생성합니다.

**실행 흐름**:

```
scrapeGithubTrending("daily")   → 트렌딩 레포 목록 (최대 50개)
  │
  └── 각 레포에 대해 (순차, 200ms 간격):
        │
        ├── Redis 락 확인 (repo_sync_lock:<fullName>)
        │     이미 잠긴 경우 → 스킵 (같은 1h 사이클 내 중복 방지)
        │
        ├── [병렬] github.getRepo(fullName)    GitHub API 레포 메타
        │          github.getCommits(fullName, 7일 전)  최근 커밋 수
        │
        ├── repos 테이블 upsert (onConflict: github_id)
        │
        ├── repo_snapshots 테이블 insert (stars, forks 현재값)
        │
        ├── 7일 전 스냅샷 조회 → deltaStars7d, deltaForks7d 계산
        │
        ├── calcRepoHeatScore() → heat_score 업데이트
        │
        ├── talks 테이블에서 REPO Talk 조회
        │     없음 → insert (category=REPO, ref_id=repo.id)
        │     있음 → heat_score 업데이트
        │
        ├── summary_ai 없으면 → generate-summary 큐에 잡 추가
        │
        └── Redis 락 설정 (TTL: 50분)
```

**GitHub API 캐시**: `github.ts`는 모든 API 응답을 Redis에 캐싱합니다 (레포: 1h, 커밋: 1h, 이슈: 15min, README: 24h).

---

### 2. collect-issues

**큐**: `collect-issues` | **스케줄**: 매 6시간 | **동시성**: 1

`watched_repos` 테이블의 WatchList 레포(40개)에서 GitHub Issues를 수집합니다.

**필터 기준**:
- 댓글 50개 이상
- 생성일 6개월 이내
- PR 제외 (`pull_request` 필드 있으면 스킵)

**실행 흐름**:

```
watched_repos 조회 (is_active=true)
  │
  └── 각 레포에 대해 (순차, 300ms 간격):
        │
        ├── github.getIssues(fullName, sort="comments", perPage=50)
        │
        └── 각 이슈에 대해:
              │
              ├── 필터 적용 (PRs, 댓글 수, 날짜)
              │
              ├── calcIssueHeatScore() 계산
              │
              ├── issue_items 테이블 upsert
              │     (onConflict: repo_full_name, issue_number)
              │
              ├── talks 테이블에서 ISSUE Talk 조회
              │     없음 → insert (category=ISSUE, ref_id=issue.id)
              │     있음 → heat_score 업데이트
              │
              └── summary_ai 없으면 → generate-summary 큐에 잡 추가
```

`job.data.repoFullName`이 있으면 단일 레포만 처리 (수동 트리거용).

---

### 3. generate-summary

**큐**: `generate-summary` | **스케줄**: on-demand (collect 워커가 enqueue) | **동시성**: 3 | **리미터**: 10 req/min

Anthropic `claude-haiku-4-5-20251001`을 사용해 레포/이슈 요약을 생성합니다.

**type=repo 흐름**:
```
repos 테이블에서 레포 조회
  ├── summary_ai 이미 있으면 → 스킵
  ├── github.getReadme(fullName) → base64 디코딩 (최대 6000자)
  ├── description + README → generateSummary() 호출 (max 200 tokens)
  ├── repos.summary_ai 업데이트
  ├── repos.readme_sha 업데이트
  └── 해당 REPO Talk의 body_md도 동기화
```

**type=issue 흐름**:
```
issue_items 테이블에서 이슈 조회
  ├── summary_ai 이미 있으면 → 스킵
  ├── generateSummary(title, body_md) 호출
  ├── issue_items.summary_ai 업데이트
  └── 해당 ISSUE Talk의 body_md도 동기화
```

비용 제어: `limiter: { max: 10, duration: 60_000 }` — 분당 최대 10회 LLM 호출.

---

### 4. recalc-heat-score

**큐**: `recalc-heat-score` | **스케줄**: 매 30분 (talk 타입) | **동시성**: 1

Heat Score는 시간 감쇠(time decay) 기반이므로 주기적으로 재계산이 필요합니다.

**type=talk** (스케줄 잡):
```
talks 테이블 전체 조회 (is_deleted=false)
  └── 각 Talk: calcTalkHeatScore() → heat_score 업데이트
```

**type=repo**:
```
repos 테이블 전체 조회
  └── 각 Repo: 7일 전 스냅샷 조회 → delta 계산 → calcRepoHeatScore()
               repos.heat_score + 연결된 REPO Talk.heat_score 업데이트
```

**type=issue**:
```
issue_items 테이블 전체 조회
  └── 각 Issue: calcIssueHeatScore() → heat_score 업데이트
                issue_items.heat_score + 연결된 ISSUE Talk.heat_score 업데이트
```

`job.data.itemId`가 있으면 해당 단일 항목만 처리.

---

## Heat Score 공식

### Talk Heat Score

```
baseScore = (upvotes - downvotes) × 1.0
          + commentCount × 0.8
          + uniqueParticipants × 1.2

heatScore = baseScore × e^(-ln2/12 × ageInHours)
```

반감기 12시간. 12시간마다 점수가 절반으로 줄어듭니다.

### Repo Heat Score

```
heatScore = deltaStars7d × 2.0
          + deltaForks7d × 1.5
          + commitCount7d × 0.8
```

7일 간 증가분 기반 — 절대값이 아닌 모멘텀 측정.

### Issue Heat Score

```
labelScore = sum(LABEL_WEIGHTS[label])
  // rfc: 2.0, proposal: 1.5, discussion: 1.0, feature/enhancement: 0.8

heatScore = commentCount × 1.0
          + reactionPlus1 × 0.8
          + labelScore
```

---

## 스케줄 요약

| 잡 ID | 큐 | 주기 | 설명 |
|-------|-----|------|------|
| `trending-1h` | collect-trending | 1시간 | GitHub Trending 수집 |
| `issues-6h` | collect-issues | 6시간 | WatchList 이슈 수집 |
| `heat-talks-30m` | recalc-heat-score | 30분 | Talk heat score 재계산 |

`initScheduler()`는 `upsertJobScheduler`를 사용하므로 서버 재시작 시 중복 등록되지 않습니다.

---

## WatchList 레포 목록

`packages/db/migrations/002_watchlist_seed.sql`에 정의된 40개 레포입니다.

| 도메인 | 레포 |
|--------|------|
| AI/ML | langchain-ai/langchain, openai/openai-python, huggingface/transformers, pytorch/pytorch, ollama/ollama, microsoft/autogen |
| DevOps | kubernetes/kubernetes, docker/cli, hashicorp/terraform, prometheus/prometheus, grafana/grafana, argoproj/argo-cd |
| Web (FE) | vercel/next.js, facebook/react, vuejs/core, sveltejs/svelte, angular/angular, vitejs/vite |
| Web (BE) | fastify/fastify, expressjs/express, denoland/deno, oven-sh/bun, nodejs/node |
| Security | aquasecurity/trivy, opencontainers/runc |
| Mobile | flutter/flutter, facebook/react-native |
| Data | apache/spark, duckdb/duckdb |
| Tools | microsoft/vscode, neovim/neovim, tmux/tmux |
| Cloud | aws/aws-cdk, pulumi/pulumi |
