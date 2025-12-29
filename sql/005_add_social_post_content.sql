-- Migration: Add content fields to game_social_posts for custom X embeds
-- Run with: psql "$DATABASE_URL" -f sql/005_add_social_post_content.sql

-- Add media and content columns
ALTER TABLE game_social_posts
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS tweet_text TEXT,
    ADD COLUMN IF NOT EXISTS source_handle TEXT,
    ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';

-- Add index on media_type for filtering
CREATE INDEX IF NOT EXISTS idx_social_posts_media_type ON game_social_posts(media_type);

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_social_posts' AND column_name = 'video_url'
    ) THEN
        RAISE NOTICE 'Content columns added to game_social_posts successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add content columns to game_social_posts';
    END IF;
END $$;

