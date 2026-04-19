# GitHub Data Collection Pipeline

## Auth Strategy
- MVP: PAT (5,000 req/h)
- Production: GitHub App 설치 토큰 (15,000 req/h)

## Repo Collection (1h batch)

| Step | API | Notes |
|------|-----|-------|
| 1. Trending list | HTML scrape `github.com/trending` | Cheerio. 장애 시 Search API fallback |
| 2. Repo meta | `GET /repos/{owner}/{repo}` | stars, forks, lang, desc |
| 3. Commit activity | `GET /repos/{owner}/{repo}/commits?since=7d` | commit count |
| 4. Delta calc | RepoSnapshot 테이블 차분 | `delta = now - 1h_ago` |
| 5. README summary | `GET /repos/{owner}/{repo}/readme` + LLM | 콘텐츠 변경 시에만 |

**Fallback**: Search API `GET /search/repositories?q=pushed:>7d&sort=stars`

**예상 소비 (레포 50개 기준)**
- 레포 메타: 50 req/h
- 커밋 활동도: 50 req/h
- 합계: ~100 req/h (한도 15,000의 1% 미만)

## Issue Collection (6h batch)

```
WatchList 레포(~40개) 순회
→ GET /repos/{owner}/{repo}/issues?sort=comments&direction=desc&per_page=20
→ 이슈 선정 필터 적용
→ IssueItem upsert
→ 신규 이슈 → LLM 요약 + Talk 스레드 자동 생성
```

- 40 req / 6h 사이클 (극히 미미)
- Webhook 미사용

## Caching (Redis)
- 레포 메타: TTL 1h
- 이슈 목록: TTL 15m
- 중복 방지: github_id 기준 upsert

## Dedup
동일 레포·이슈 ID로 이미 Talk 스레드가 있으면 기존 스레드 업데이트 (중복 생성 금지)
