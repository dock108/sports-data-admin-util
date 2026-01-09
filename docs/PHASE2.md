# Beta Phase 2 — Live Feeds & Play-by-Play

## Overview
Phase 2 layers live data feeds on top of the existing ingestion pipeline so the iOS timeline can trust
play-by-play updates without replacing the current scrapers.

## League Feed Strategy (Locked)
| League | Schedule & Metadata | Live PBP | Post-game |
| --- | --- | --- | --- |
| NBA | Odds API / existing sources | NBA live feed (`cdn.nba.com`) | Sports-Reference allowed |
| NHL | NHL live schedule feed | NHL live feed (`statsapi.web.nhl.com`) | Sports-Reference allowed |
| NCAAB | Existing sources | Best-effort only (skip if unavailable) | Sports-Reference allowed |

## Play-by-Play Source Rules
- **Live PBP** uses league-specific feeds and appends new events only.
- **Sports-Reference** remains post-game only for validation/backfill.
- **Odds API** is never used for PBP.

## Status Synchronization
- If PBP events arrive, the game is marked **live** (never regresses).
- Final signals from live feeds mark games **final** and set `end_time` once.
- Status updates are idempotent and avoid regressions.

## NHL Schema Notes
- NHL events use **period numbers** (stored in the shared `quarter` field).
- `game_clock` stores remaining time; absolute timestamps are preserved in `raw_data.event_time`.
- `play_type` captures NHL event enums (e.g., `GOAL`, `PENALTY`, `STOP`).

## NHL Social Handles
- Official X/Twitter handles are seeded for NHL teams and validated via network checks.
- No post ingestion happens until Phase 3.
