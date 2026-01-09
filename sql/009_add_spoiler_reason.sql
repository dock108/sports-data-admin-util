-- Migration: Add spoiler_reason to game_social_posts
-- Run with: psql "$DATABASE_URL" -f sql/009_add_spoiler_reason.sql

ALTER TABLE game_social_posts
    ADD COLUMN IF NOT EXISTS spoiler_reason VARCHAR(200);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'game_social_posts' AND column_name = 'spoiler_reason'
    ) THEN
        RAISE NOTICE 'spoiler_reason column added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add spoiler_reason column';
    END IF;
END $$;
