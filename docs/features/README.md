# Feature Specs Index

## MVP (v1.0) Scope — What to build now

- [o] GitHub OAuth login
- [ ] Repo Talks: Trending scrape + Heat Score + auto thread creation
- [ ] Issue Talks: WatchList(~40 repos) 6h batch + filter + auto thread creation
- [ ] `RepoSnapshot` table (1h star/fork snapshots for delta calc)
- [ ] Open Talks: write + comment
- [ ] Main / List / Detail / MyPage basic structure
- [ ] Search, Bookmark, Follow (user/tag)
- [ ] Dark mode, EN/KO i18n

## v1.1+ (do not build yet)
- WatchList admin UI, community repo suggestions
- Trend Talks curation tools
- Real-time comments (WebSocket)
- Badge/reputation system
- Code review mode
- Mobile app, public API

---

## File Map

| File | When to read |
|------|-------------|
| [repo-talks.md](repo-talks.md) | Working on Repo Talks scraping, cards, threads |
| [issue-talks.md](issue-talks.md) | Working on Issue Talks collection, filters |
| [open-talks.md](open-talks.md) | Working on Open Talks write/comment UI |
| [trend-talks.md](trend-talks.md) | Trend Talks (v1.1+, skip for MVP) |
| [pages.md](pages.md) | UI layout, card components, page structure |
| [data-model.md](data-model.md) | DB schema reference |
| [github-pipeline.md](github-pipeline.md) | GitHub API strategy, rate limits, caching |
| [ranking.md](ranking.md) | Heat Score formulas |
| [cross-cutting.md](cross-cutting.md) | Auth, search, moderation, NFR, i18n |
