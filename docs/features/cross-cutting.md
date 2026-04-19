# Cross-cutting Features

## Auth (MVP: YES)
- GitHub OAuth (primary), Google OAuth (secondary), 이메일 가입
- GitHub 연동 시 아바타·핸들 자동 매핑
- "Verified GitHub Dev" 배지

## Search (MVP: YES)
- 전문검색 (ElasticSearch/Meilisearch)
- 자동완성
- 필터: 카테고리, 기간, 태그, 프로그래밍 언어
- 마이페이지 내 활동 검색

## Moderation
- 자동: 스팸/혐오 분류기, 악성 코드 탐지
- 수동: 신고 → 모더레이터 검토 큐
- 가이드라인 위반 3회 → 24h → 7d → 영구 쓰기 제한

## i18n (MVP: YES)
- 기본: 영어/한국어
- v1.1+: 커뮤니티 번역 구조

## Non-functional Requirements
- 모바일 우선 반응형, PWA
- 다크모드 기본
- LCP < 2.5s, TTI < 3.5s
- 동시접속 10k 확장 가능 구조
- API 레이트 리밋: 익명 60 req/min, 로그인 300 req/min
- WCAG 2.1 AA (키보드 내비게이션, 스크린리더)

## Bookmark & Follow (MVP: YES)
- 북마크: Talk 단위
- 팔로우: 레포 / 태그 / 유저 단위
- 알림: 팔로우 대상 새 핫 토론, 내 글 답글, 멘션

## Real-time (v1.1+)
- WebSocket 기반 실시간 댓글
- MVP: "N new replies" 배너 (폴링 방식)
