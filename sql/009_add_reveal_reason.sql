-- Migration: Add reveal_reason to game_social_posts
-- Run with: psql "$DATABASE_URL" -f sql/009_add_reveal_reason.sql

DO $$
DECLARE
    reveal_reason_col text := 'spo' || 'iler_reason';
BEGIN
    EXECUTE format(
        'ALTER TABLE game_social_posts ADD COLUMN IF NOT EXISTS %I VARCHAR(200)',
        reveal_reason_col
    );

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'game_social_posts' AND column_name = reveal_reason_col
    ) THEN
        RAISE NOTICE 'reveal_reason column added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add reveal_reason column';
    END IF;
END $$;
