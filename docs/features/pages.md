# Page & UI Specs

## Routes
```
/              메인 페이지
/repos         Repo Talks 리스트
/repos/:id     개별 레포 토론 스레드
/issues        Issue Talks 리스트
/issues/:id    개별 이슈 토론 스레드
/open          Open Talks 리스트
/open/:id      개별 자유 토론 스레드
/trends        Trend Talks 리스트 (v1.1+)
/trends/:id    개별 트렌드 스레드 (v1.1+)
/me            마이페이지
```

---

## Main Page (`/`)

### Sections
| Section | Content | Sort |
|---------|---------|------|
| Hero | 서비스 소개, 검색바, 인기 태그 칩 | — |
| 🔥 Repo Talks | 상위 6개 카드 + 더보기 | Heat Score 내림차순 |
| 💬 Issue Talks | 상위 6개 카드 + 더보기 | 댓글 급증순 |
| 🗣 Open Talks | 상위 6개 카드 + 더보기 | 최근 24h 참여도순 |
| 🚀 Trend Talks | 상위 3개 카드 + 더보기 | 큐레이션 고정 (v1.1+) |

### Card Common Elements
- 제목 (2줄 ellipsis)
- 카테고리 배지 (🔥/💬/🗣/🚀)
- 댓글 수, 참여자 수, 마지막 활동 시간
- 핫 스코어 뱃지 (🔥1~🔥5)
- 호버 시 AI 요약 툴팁

### Interactions
- 카드 클릭 → 상세 스레드
- "더보기" → 카테고리 리스트 페이지
- 비로그인 → "로그인하고 참여하기" CTA

---

## List Pages (`/repos`, `/issues`, `/open`, `/trends`)

### Common
- 정렬: Hot / New / Top(24h·7d·30d·All) / Most Commented
- 검색: 제목 + 본문 + 태그 전문검색
- 무한 스크롤 (기본)

### Filters by Category
- **Repos**: 언어, 라이선스, 스타 범위
- **Issues**: 라벨, 상태(open/closed), 원본 레포
- **Open**: 태그, `#question` only, 미답변 only
- **Trends**: 분야(AI/DevOps/Web/Security/Mobile/Data)

---

## Detail Page (Thread)

### Top Area (공통)
- 카테고리 배지 + 제목 + 태그
- Heat Score 뱃지
- 원본 소스 링크 (Repo/Issue only)
- AI 요약 박스 (3줄, 접기/펼치기)
- 생성일, 참여자 수, 댓글 수, 조회수

### Body Area (카테고리별)
- **Repo**: 레포 카드 (설명, 스타/포크 그래프, 최근 커밋 5개, README 요약, 기여자 아바타)
- **Issue**: 이슈 본문 임베드 (GitHub 원본 포매팅), 라벨, 원작성자, 반응 이모지
- **Open**: 유저 본문 (마크다운 렌더)
- **Trend**: 에디터 요약 + 관련 레포/이슈/기사 카드

### Comment Area
- 중첩 최대 4뎁스
- 마크다운, 코드블록, 이미지/GIF
- 👍/👎 투표, 이모지 반응
- 정렬: Best / New / Top / Controversial
- 베스트 댓글 고정
- `@username` 멘션
- 코드 리뷰 모드 (Issue only, **v1.1+**)
- 새 댓글 "N new replies" 배너

### Sidebar (Desktop)
- 참여자 목록 (상위 10명)
- 관련 토론 추천
- 북마크 / 공유 / 신고
- 팔로우 (레포·태그·작성자)

---

## MyPage (`/me`)

### Tabs
- **My Talks**: 내가 작성한 Open Talks
- **My Comments**: 내 댓글 (스레드 링크)
- **Bookmarks**: 북마크 스레드 (카테고리별 필터)
- **Following**: 팔로우한 레포/태그/유저
- **Drafts**: 임시 저장

### Profile
- 아바타, 닉네임, 자기소개, GitHub 핸들
- 통계: 글 수, 댓글 수, 받은 추천, Reputation

### Notifications
- 내 글·댓글 답글, 멘션
- 팔로우 대상 새 핫 토론
- 이메일/인앱 개별 설정

### Settings
- 계정: 이메일, 비밀번호, OAuth (GitHub/Google)
- 언어·타임존·다크모드
- 데이터 내보내기(GDPR), 계정 삭제
