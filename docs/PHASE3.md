# Beta Phase 3 — Social Layer (NBA + NHL)

## Architecture Overview

The social ingestion pipeline lives in the scraper service and runs as part of the existing 15-minute scheduler. It collects official NBA/NHL team posts from X, attaches them to games by time window, and stores the posts in `game_social_posts` for later narrative blending.

Key components:
- **Account Registry**: `team_social_accounts` stores `(platform, handle, team_id, league_id)` for official team accounts. This registry is queryable via `/api/social/accounts` and seeded from existing `sports_teams.x_handle` values for NBA/NHL teams.
- **Social Collector**: `XPostCollector` orchestrates polling, caching, reveal classification, and persistence. Collection strategies include the X API v2 or Playwright scraping.
- **Caching & Rate Limits**: `social_account_polls` stores per-account window fetch metadata to avoid re-fetching the same time window. In-memory platform limits prevent exceeding quotas and back off on HTTP 429 responses.

## Spoiler Philosophy

Spoiler handling is conservative by default:
- Every post is treated as reveal-risk unless it explicitly matches safe patterns (lineups, injury updates, “we’re underway,” etc.).
- Outcome language, score patterns, recap phrases, and celebratory emojis stay reveal-risk.
- Post-game posts remain attached but are always flagged as reveal-risk.

This ensures the social layer never leaks outcomes before the narrative system decides how to surface the content.

## Rate-Limit Strategy

The ingestion layer enforces multiple safeguards:
- **Per-platform quotas**: An in-memory limiter caps requests per 15-minute window and backs off on HTTP 429 responses.
- **Per-team polling interval**: `social_account_polls` tracks the most recent poll per handle to avoid excessive polling.
- **Window-level cache**: Each `(platform, handle, window_start, window_end)` combination is cached with TTL to prevent re-fetching identical windows.

These controls keep ingestion safe and scheduler-friendly while respecting external API limits.
