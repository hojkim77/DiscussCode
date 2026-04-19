# Issue Talks — "이 이슈, 같이 파봅시다"

**MVP: YES**

## Source
운영자가 사전 등록한 WatchList 레포에서 조건 충족 이슈를 6h 배치 수집.
(GitHub Issues API는 레포를 미리 알아야 호출 가능 — WatchList 방식이 유일하게 현실적)

## WatchList (~40 repos, 초기 하드코딩)

| Domain | Repos |
|--------|-------|
| Web/Frontend | vercel/next.js, facebook/react, vuejs/core, vitejs/vite, sveltejs/svelte |
| Dev Tools | neovim/neovim, microsoft/vscode, astral-sh/uv, cli/cli |
| AI/ML | ollama/ollama, huggingface/transformers, langchain-ai/langchain |
| Infra/DevOps | kubernetes/kubernetes, docker/compose, hashicorp/terraform |
| Languages | rust-lang/rust, golang/go, python/cpython, nodejs/node |
| Mobile | flutter/flutter, facebook/react-native |
| Security | OWASP/CheatSheetSeries, aquasecurity/trivy |

v1.1+에서 어드민 UI로 관리 (MVP는 하드코딩).

## Issue Filter (모두 충족해야 thread 생성)
- 댓글 수 ≥ 50
- 라벨에 `discussion`, `RFC`, `proposal`, `feature`, `help wanted` 중 1개 이상
- 생성일로부터 180일 이내
- Pull Request 제외, 순수 이슈만

## Collection API
```
GET /repos/{owner}/{repo}/issues?sort=comments&direction=desc&per_page=20
```
- 40 repos × 1 req = 40 req / 6h 사이클 (한도 대비 극미)
- Webhook 미사용 (실시간성 불필요)

## Heat Score
```
Issue_Heat = (comment_count × 1.0)
           + (reaction_plus1 × 0.8)
           + label_weight(RFC=2.0, proposal=1.5, discussion=1.0, feature=0.8)
```

## Auto-generated Card Info
- 이슈 제목, 원본 레포, 도메인 배지, 라벨, 상태(open/closed)
- AI 요약 (신규 이슈에만 생성)
- 원본 GitHub 링크

## Thread Unit
이슈 1개 = 스레드 1개 (github_id 기준 upsert, 신규만 LLM 요약 + 스레드 생성)
