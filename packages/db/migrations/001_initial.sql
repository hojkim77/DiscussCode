-- DiscussCode MVP Schema
-- Run this in the Supabase SQL editor (Settings > SQL Editor)

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- similarity search
CREATE EXTENSION IF NOT EXISTS "unaccent";        -- accent-insensitive FTS

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle        TEXT UNIQUE NOT NULL,
  email         TEXT,
  github_id     BIGINT UNIQUE,
  github_handle TEXT,
  google_id     TEXT UNIQUE,
  avatar        TEXT,
  bio           TEXT,
  reputation    INT NOT NULL DEFAULT 0,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified_dev BOOLEAN NOT NULL DEFAULT FALSE,  -- GitHub OAuth 연동 시 true
  write_banned_until TIMESTAMPTZ,                  -- 모더레이션
  violation_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Repos ───────────────────────────────────────────────────────────────────
CREATE TABLE public.repos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id       BIGINT UNIQUE NOT NULL,
  owner           TEXT NOT NULL,
  name            TEXT NOT NULL,
  full_name       TEXT UNIQUE NOT NULL,           -- "{owner}/{name}"
  description     TEXT,
  language        TEXT,
  stars           INT NOT NULL DEFAULT 0,
  forks           INT NOT NULL DEFAULT 0,
  license         TEXT,
  topics          TEXT[] NOT NULL DEFAULT '{}',
  open_issues     INT NOT NULL DEFAULT 0,
  heat_score      FLOAT NOT NULL DEFAULT 0,
  summary_ai      TEXT,
  readme_sha      TEXT,                            -- SHA used for last summary generation
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Repo Snapshots (1h 주기, delta 계산용) ──────────────────────────────────
CREATE TABLE public.repo_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     UUID NOT NULL REFERENCES public.repos(id) ON DELETE CASCADE,
  stars       INT NOT NULL,
  forks       INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX repo_snapshots_repo_recorded_idx ON public.repo_snapshots (repo_id, recorded_at DESC);

-- ─── Watched Repos (Issue Talks용 감시 목록) ─────────────────────────────────
CREATE TABLE public.watched_repos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner     TEXT NOT NULL,
  name      TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  domain    TEXT,                                  -- AI/DevOps/Web/Security/Mobile/Data
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Issue Items ─────────────────────────────────────────────────────────────
CREATE TABLE public.issue_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id        BIGINT NOT NULL,
  repo_id          UUID REFERENCES public.repos(id),
  watched_repo_id  UUID REFERENCES public.watched_repos(id),
  repo_full_name   TEXT NOT NULL,
  issue_number     INT NOT NULL,
  title            TEXT NOT NULL,
  body_md          TEXT,
  labels           TEXT[] NOT NULL DEFAULT '{}',
  state            TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  comment_count    INT NOT NULL DEFAULT 0,
  reaction_plus1   INT NOT NULL DEFAULT 0,
  heat_score       FLOAT NOT NULL DEFAULT 0,
  summary_ai       TEXT,
  github_url       TEXT NOT NULL,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_full_name, issue_number)
);
CREATE INDEX issue_items_repo_idx ON public.issue_items (repo_full_name);
CREATE INDEX issue_items_heat_idx ON public.issue_items (heat_score DESC);

-- ─── Talks ───────────────────────────────────────────────────────────────────
CREATE TABLE public.talks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category            TEXT NOT NULL CHECK (category IN ('REPO', 'ISSUE', 'OPEN', 'TREND')),
  ref_id              UUID,                        -- repo.id or issue_item.id
  author_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  body_md             TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  talk_type           TEXT,                        -- OPEN only: Discussion/Question/Show & Tell/Meme
  heat_score          FLOAT NOT NULL DEFAULT 0,
  upvotes             INT NOT NULL DEFAULT 0,
  downvotes           INT NOT NULL DEFAULT 0,
  comment_count       INT NOT NULL DEFAULT 0,
  unique_participants INT NOT NULL DEFAULT 0,
  view_count          INT NOT NULL DEFAULT 0,
  is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  search_vector       tsvector,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX talks_category_heat_idx ON public.talks (category, heat_score DESC);
CREATE INDEX talks_created_idx ON public.talks (created_at DESC);
CREATE INDEX talks_tags_idx ON public.talks USING GIN (tags);
CREATE INDEX talks_search_idx ON public.talks USING GIN (search_vector);
CREATE UNIQUE INDEX talks_repo_ref_idx ON public.talks (ref_id) WHERE category = 'REPO';
CREATE UNIQUE INDEX talks_issue_ref_idx ON public.talks (ref_id) WHERE category = 'ISSUE';

-- ─── Comments ────────────────────────────────────────────────────────────────
CREATE TABLE public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id    UUID NOT NULL REFERENCES public.talks(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body_md    TEXT NOT NULL,
  upvotes    INT NOT NULL DEFAULT 0,
  downvotes  INT NOT NULL DEFAULT 0,
  depth      INT NOT NULL DEFAULT 0,              -- 0 = root, max 4 in UI
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX comments_talk_created_idx ON public.comments (talk_id, created_at);
CREATE INDEX comments_parent_idx ON public.comments (parent_id);

-- ─── Reactions ───────────────────────────────────────────────────────────────
CREATE TABLE public.reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('talk', 'comment')),
  target_id   UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_type, target_id, user_id, emoji)
);
CREATE INDEX reactions_target_idx ON public.reactions (target_type, target_id);

-- ─── Bookmarks ───────────────────────────────────────────────────────────────
CREATE TABLE public.bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  talk_id    UUID NOT NULL REFERENCES public.talks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, talk_id)
);
CREATE INDEX bookmarks_user_idx ON public.bookmarks (user_id);

-- ─── Follows ─────────────────────────────────────────────────────────────────
CREATE TABLE public.follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('REPO', 'TAG', 'USER')),
  target_id   TEXT NOT NULL,                      -- repo full_name, tag string, or user_id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX follows_user_idx ON public.follows (user_id);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('reply', 'mention', 'hot_talk', 'follow')),
  payload    JSONB NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- ─── Drafts ──────────────────────────────────────────────────────────────────
CREATE TABLE public.drafts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT,
  body_md    TEXT,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  talk_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX drafts_user_idx ON public.drafts (user_id);

-- ─── Vote ledger (upvote/downvote 중복 방지) ─────────────────────────────────
CREATE TABLE public.votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('talk', 'comment')),
  target_id   UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value       SMALLINT NOT NULL CHECK (value IN (1, -1)),  -- 1=up, -1=down
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_type, target_id, user_id)
);
CREATE INDEX votes_target_idx ON public.votes (target_type, target_id);

-- ─── Full-Text Search Vector ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.talks_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body_md, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER talks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.talks
  FOR EACH ROW EXECUTE FUNCTION public.talks_search_vector_update();

-- ─── User auto-create on OAuth signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _handle TEXT;
BEGIN
  _handle := COALESCE(
    NEW.raw_user_meta_data->>'user_name',     -- GitHub
    NEW.raw_user_meta_data->>'name',           -- Google
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );

  -- deduplicate handle if taken
  WHILE EXISTS (SELECT 1 FROM public.users WHERE handle = _handle) LOOP
    _handle := _handle || '_' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO public.users (id, handle, email, github_id, github_handle, avatar, is_verified_dev)
  VALUES (
    NEW.id,
    _handle,
    NEW.email,
    (NEW.raw_user_meta_data->>'provider_id')::BIGINT,
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.app_metadata->>'provider' = 'github'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── updated_at auto-update ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER repos_updated_at BEFORE UPDATE ON public.repos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER issue_items_updated_at BEFORE UPDATE ON public.issue_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER talks_updated_at BEFORE UPDATE ON public.talks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER drafts_updated_at BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watched_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- public read
CREATE POLICY "public_read_users"    ON public.users    FOR SELECT USING (is_public = TRUE);
CREATE POLICY "read_own_user"        ON public.users    FOR SELECT USING (id = auth.uid());
CREATE POLICY "update_own_user"      ON public.users    FOR UPDATE USING (id = auth.uid());
CREATE POLICY "public_read_repos"    ON public.repos    FOR SELECT USING (TRUE);
CREATE POLICY "public_read_watched"  ON public.watched_repos FOR SELECT USING (TRUE);
CREATE POLICY "public_read_issues"   ON public.issue_items FOR SELECT USING (TRUE);
CREATE POLICY "public_read_talks"    ON public.talks    FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "public_read_comments" ON public.comments FOR SELECT USING (TRUE);
CREATE POLICY "public_read_reactions"ON public.reactions FOR SELECT USING (TRUE);
CREATE POLICY "public_read_follows"  ON public.follows  FOR SELECT USING (TRUE);

-- authenticated write
CREATE POLICY "auth_insert_talks"    ON public.talks    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_own_talk" ON public.talks    FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "auth_delete_own_talk" ON public.talks    FOR DELETE USING (author_id = auth.uid());
CREATE POLICY "auth_insert_comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_own_comment" ON public.comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "auth_delete_own_comment" ON public.comments FOR DELETE USING (author_id = auth.uid());

-- own-only tables
CREATE POLICY "own_bookmarks"      ON public.bookmarks     USING (user_id = auth.uid());
CREATE POLICY "own_follows"        ON public.follows        USING (user_id = auth.uid());
CREATE POLICY "own_notifications"  ON public.notifications  USING (user_id = auth.uid());
CREATE POLICY "own_drafts"         ON public.drafts         USING (user_id = auth.uid());
CREATE POLICY "auth_reactions"     ON public.reactions      USING (user_id = auth.uid());
CREATE POLICY "auth_votes"         ON public.votes          USING (user_id = auth.uid());
CREATE POLICY "read_votes"         ON public.votes          FOR SELECT USING (TRUE);
CREATE POLICY "read_reactions_all" ON public.reactions      FOR SELECT USING (TRUE);
