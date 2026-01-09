-- Seed team_social_accounts from existing x_handle values (NBA + NHL)
-- Run with: psql "$DATABASE_URL" -f sql/008_seed_team_social_accounts.sql

INSERT INTO team_social_accounts (team_id, league_id, platform, handle, is_active)
SELECT t.id, t.league_id, 'x', t.x_handle, TRUE
FROM sports_teams t
JOIN sports_leagues l ON l.id = t.league_id
WHERE l.code IN ('NBA', 'NHL')
  AND t.x_handle IS NOT NULL
ON CONFLICT (team_id, platform) DO UPDATE
SET handle = EXCLUDED.handle,
    league_id = EXCLUDED.league_id,
    is_active = TRUE,
    updated_at = now();
