# Heat Score Algorithms

## Talk Heat Score (토론 스레드 공통)
```
Heat = (upvotes - downvotes) × 1.0
     + (comments × 0.8)
     + (unique_participants × 1.2)
     + decay(age_in_hours)
```
- decay: Reddit 스타일 시간 감쇠, 12시간 반감기

## Repo Heat Score (Repo Talks)
```
Repo_Heat = (delta_stars_7d × 2.0)
          + (delta_forks_7d × 1.5)
          + (commit_count_7d × 0.8)
```
- delta_stars/forks: RepoSnapshot 차분값 (1h 스냅샷)
- recalc 주기: 1h (Repo 수집 배치와 동일)

## Issue Heat Score (Issue Talks)
```
Issue_Heat = (comment_count × 1.0)
           + (reaction_plus1 × 0.8)
           + label_weight
```
label_weight: RFC=2.0, proposal=1.5, discussion=1.0, feature=0.8

- 수집 시점 댓글 수·리액션 그대로 사용 (별도 폴링 없음)
- recalc 주기: 6h (Issue 수집 배치와 동일)

## Hot Badge
🔥1~🔥5 기준: Heat Score 상위 분위수로 구간 분류 (정확한 임계값은 초기 데이터 보고 조정)
