-- Migration: Add team social account registry + social poll cache + post metadata
-- Run with: psql "$DATABASE_URL" -f sql/007_social_accounts_registry.sql

BEGIN;

ALTER TABLE game_social_posts
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20) NOT NULL DEFAULT 'x',
    ADD COLUMN IF NOT EXISTS external_post_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tweet_text TEXT,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS source_handle VARCHAR(100),
    ADD COLUMN IF NOT EXISTS media_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS spoiler_risk BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_social_posts_media_type ON game_social_posts(media_type);
CREATE INDEX IF NOT EXISTS idx_social_posts_external_id ON game_social_posts(external_post_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_posts_platform_external_id ON game_social_posts(platform, external_post_id);

CREATE TABLE IF NOT EXISTS team_social_accounts (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
    league_id INTEGER NOT NULL REFERENCES sports_leagues(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    handle VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (platform, handle),
    UNIQUE (team_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_team_social_accounts_league ON team_social_accounts(league_id);
CREATE INDEX IF NOT EXISTS idx_team_social_accounts_team ON team_social_accounts(team_id);

CREATE TABLE IF NOT EXISTS social_account_polls (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    handle VARCHAR(100) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL,
    posts_found INTEGER NOT NULL DEFAULT 0,
    rate_limited_until TIMESTAMPTZ,
    error_detail TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (platform, handle, window_start, window_end)
);
CREATE INDEX IF NOT EXISTS idx_social_account_polls_handle_window ON social_account_polls(handle, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_social_account_polls_platform ON social_account_polls(platform);

COMMIT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'team_social_accounts'
    ) THEN
        RAISE NOTICE 'team_social_accounts registry created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create team_social_accounts registry';
    END IF;
END $$;
