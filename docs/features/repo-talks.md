# Repo Talks — "이 레포, 왜 뜨고 있을까?"

**MVP: YES**

## Source
- Primary: `github.com/trending` HTML scrape (Cheerio)
- Fallback: GitHub Search API `GET /search/repositories?q=pushed:>7d&sort=stars` (parser 장애 시)

## Thread Unit
레포 1개 = 토론 스레드 1개 (중복 방지: github_id 기준 upsert)

## Auto-generated Card Info
- 레포명, 오너, 언어, ⭐ 현재값, 🍴 현재값
- 최근 7일 스타 증가 (RepoSnapshot 차분)
- README 요약 (AI, 콘텐츠 변경 시에만 재실행)
- 주요 기여자

## Heat Score
```
Repo_Heat = (delta_stars_7d × 2.0)
          + (delta_forks_7d × 1.5)
          + (commit_count_7d × 0.8)
```
- delta_stars/forks: RepoSnapshot 테이블 차분값
- 1h 주기 배치 recalc

## Collection Pipeline
1. Trending HTML 스크랩 → 레포 목록 취득
2. `GET /repos/{owner}/{repo}` — stars, forks, language, description
3. `GET /repos/{owner}/{repo}/commits?since=7d` — 커밋 수
4. RepoSnapshot에 현재 stars/forks 저장 → 이전 값과 차분 계산
5. README 변경 시 LLM 요약 생성

자세한 API 전략 → [github-pipeline.md](github-pipeline.md)
