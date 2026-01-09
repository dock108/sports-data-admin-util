# Beta Phase 4 — Game Snapshots API

## Purpose
Beta Phase 4 introduces a single, read-only API surface for the iOS app to consume
games, play-by-play timelines, recaps, and social context. The app reads from this
surface only and does not compose data from multiple sources.

## Reveal-Level Philosophy
All app responses use explicit reveal levels:

- `pre`: score-hidden context
- `post`: score-visible context

The API always labels reveal state, and the app never infers it. Pre-level responses
avoid final scores and outcome language. Post-level responses may include final scores
and outcome language.

## Endpoint Contracts

### `GET /games?range=`
Supported range values:
- `last2`: previous 48 hours
- `current`: today + live games
- `next24`: next 24 hours

Response shape:
```json
{
  "range": "current",
  "games": [
    {
      "id": 123,
      "league": "NBA",
      "status": "live",
      "start_time": "2026-01-15T02:00:00Z",
      "home_team": {"id": 1, "name": "Warriors", "abbreviation": "GSW"},
      "away_team": {"id": 2, "name": "Lakers", "abbreviation": "LAL"},
      "has_pbp": true,
      "has_social": false,
      "last_updated_at": "2026-01-15T03:00:00Z"
    }
  ]
}
```

### `GET /games/{id}/pbp`
Returns ordered play-by-play events grouped by period.

Response shape:
```json
{
  "periods": [
    {
      "period": 1,
      "events": [
        {"index": 1, "clock": "12:00", "description": "Tipoff", "play_type": "tip"}
      ]
    }
  ]
}
```

If no play-by-play is available, `periods` is an empty array.

### `GET /games/{id}/social`
Returns associated social posts ordered by `posted_at`.

Response shape:
```json
{
  "posts": [
    {
      "id": 99,
      "team": {"id": 1, "name": "Warriors", "abbreviation": "GSW"},
      "content": "Game day.",
      "posted_at": "2026-01-15T02:00:00Z",
      "reveal_level": "pre"
    }
  ]
}
```

### `GET /games/{id}/recap?reveal=`
`reveal` accepts `pre` or `post` (default `pre`).

Response shape:
```json
{
  "game_id": 123,
  "reveal": "pre",
  "available": true,
  "summary": "The game featured momentum swings and key stretches.",
  "reason": null
}
```

If play-by-play is missing, `available` is `false` and `reason` is `"pbp_missing"`.

## App Consumption Expectations
- The app calls `GET /games` to drive game lists.
- The app uses `GET /games/{id}/pbp` for timelines.
- The app uses `GET /games/{id}/recap` for summaries, honoring reveal levels.
- The app uses `GET /games/{id}/social` for social context, respecting `reveal_level`.

## Validation Rules
- Invalid range values return HTTP 400.
- Invalid reveal values return HTTP 400.
- Unknown game IDs return HTTP 404.
