# Database Integration Guide

This document explains how external services can connect to and extract data from the sports-data-admin database.

## Overview

The sports-data-admin system provides sports data (games, boxscores, odds, teams) via:

1. **Direct database access** — Connect directly to PostgreSQL for read-heavy analytics workloads
2. **REST API** — Use the FastAPI endpoints for CRUD operations and real-time data
3. **Shared SQLAlchemy models** — Import models directly for Python services in the same environment

---

## Database Schema

The database uses PostgreSQL 16+ with the following core tables:

| Table | Description |
|-------|-------------|
| `sports_leagues` | League definitions (NBA, NFL, NCAAB, NCAAF, MLB, NHL) |
| `sports_teams` | Teams with league associations and external mappings |
| `sports_games` | Individual games with scores, dates, and metadata |
| `sports_team_boxscores` | Team-level stats stored as JSONB |
| `sports_player_boxscores` | Player-level stats stored as JSONB |
| `sports_game_odds` | Odds data from various books (spreads, totals, moneylines) |
| `sports_scrape_runs` | Audit log of data ingestion jobs |

### Entity Relationships

```
sports_leagues
    └── sports_teams (league_id → id)
    └── sports_games (league_id → id)
         ├── sports_team_boxscores (game_id → id)
         ├── sports_player_boxscores (game_id → id)
         └── sports_game_odds (game_id → id)
```

### Key Columns

**sports_games**
- `source_game_key` — Unique external identifier from source (e.g., Sports Reference URL slug)
- `external_ids` — JSONB map of provider IDs (`{"espn": "401234567", "covers": "..."}`)
- `status` — One of: `scheduled`, `completed`, `postponed`, `canceled`

**sports_team_boxscores / sports_player_boxscores**
- `raw_stats_json` — Flexible JSONB column containing all stats (keys vary by sport)

**sports_game_odds**
- `market_type` — One of: `spread`, `total`, `moneyline`
- `is_closing_line` — Whether this is the final line before game start

---

## Connection Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:5432/sports` |
| `REDIS_URL` | Redis for Celery (optional) | `redis://localhost:6379/2` |

> **Note:** The scraper uses **synchronous** psycopg (`postgresql+psycopg://...`), while the API uses **async** asyncpg (`postgresql+asyncpg://...`). Adjust the driver portion of the URL for your use case.

### Docker Compose (Local Development)

When running the full stack via `docker-compose`, use these internal hostnames:

```yaml
# For async services (FastAPI)
DATABASE_URL: postgresql+asyncpg://sports:sports@postgres:5432/sports

# For sync services (Celery workers, scripts)
DATABASE_URL: postgresql+psycopg://sports:sports@postgres:5432/sports
```

### Production / Remote Access

For external services connecting to a remote database:

```bash
# Standard PostgreSQL URL (replace with your credentials)
DATABASE_URL="postgresql://sports_readonly:password@your-host.example.com:5432/sports"
```

---

## Python Integration

### Option 1: Direct SQLAlchemy Connection (Recommended for Analytics)

For read-heavy workloads, connect directly using SQLAlchemy:

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Synchronous connection
DATABASE_URL = "postgresql+psycopg://user:pass@host:5432/sports"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

with Session() as session:
    # Raw SQL query
    result = session.execute(text("""
        SELECT g.id, g.game_date, g.home_score, g.away_score,
               ht.name as home_team, at.name as away_team,
               l.code as league
        FROM sports_games g
        JOIN sports_teams ht ON g.home_team_id = ht.id
        JOIN sports_teams at ON g.away_team_id = at.id
        JOIN sports_leagues l ON g.league_id = l.id
        WHERE l.code = 'NBA'
          AND g.season = 2024
          AND g.status = 'completed'
        ORDER BY g.game_date DESC
        LIMIT 100
    """))
    games = result.fetchall()
```

### Option 2: Async SQLAlchemy (For FastAPI / Async Services)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:pass@host:5432/sports"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def fetch_games():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT * FROM sports_games LIMIT 10"))
        return result.fetchall()
```

### Option 3: Import Shared ORM Models

If your service runs in the same environment and can import from this repo:

```python
import sys
sys.path.insert(0, "/path/to/sports-data-admin/api")

from app.db_models import SportsGame, SportsTeam, SportsLeague, SportsTeamBoxscore
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

engine = create_engine("postgresql+psycopg://user:pass@host:5432/sports")
Session = sessionmaker(bind=engine)

with Session() as session:
    # Query using ORM models
    stmt = (
        select(SportsGame)
        .join(SportsLeague)
        .where(SportsLeague.code == "NCAAB")
        .where(SportsGame.season == 2024)
        .limit(50)
    )
    games = session.execute(stmt).scalars().all()
    
    for game in games:
        print(f"{game.home_team.name} vs {game.away_team.name}: {game.home_score}-{game.away_score}")
```

### Pandas Integration

For data science / analytics workflows:

```python
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("postgresql+psycopg://user:pass@host:5432/sports")

# Load games with boxscores
query = """
    SELECT 
        g.id as game_id,
        g.game_date,
        g.season,
        l.code as league,
        ht.name as home_team,
        at.name as away_team,
        g.home_score,
        g.away_score,
        tb.raw_stats_json as home_stats
    FROM sports_games g
    JOIN sports_leagues l ON g.league_id = l.id
    JOIN sports_teams ht ON g.home_team_id = ht.id
    JOIN sports_teams at ON g.away_team_id = at.id
    LEFT JOIN sports_team_boxscores tb ON tb.game_id = g.id AND tb.is_home = true
    WHERE l.code = 'NBA'
      AND g.season = 2024
      AND g.status = 'completed'
"""

df = pd.read_sql(query, engine)

# Expand JSONB stats into columns
if 'home_stats' in df.columns:
    stats_df = df['home_stats'].apply(pd.Series)
    df = pd.concat([df.drop('home_stats', axis=1), stats_df], axis=1)
```

---

## REST API Integration

The API runs on port `8000` by default and provides JSON endpoints.

### Base URL

```
# Local development
http://localhost:8000

# Docker Compose
http://sports-api:8000  (internal)
http://localhost:8000   (external)

# Production
https://your-api-domain.com
```

### TypeScript / JavaScript

Using fetch or the provided API client:

```typescript
const API_BASE = process.env.SPORTS_API_URL || "http://localhost:8000";

// List games with filters
async function listGames(options: {
  leagues?: string[];
  season?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options.leagues) {
    options.leagues.forEach((lg) => params.append("league", lg));
  }
  if (options.season) params.append("season", String(options.season));
  if (options.limit) params.append("limit", String(options.limit));

  const response = await fetch(`${API_BASE}/api/admin/sports/games?${params}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Get game details with boxscores and odds
async function getGameDetail(gameId: number) {
  const response = await fetch(`${API_BASE}/api/admin/sports/games/${gameId}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Example usage
const games = await listGames({ leagues: ["NBA", "NCAAB"], season: 2024, limit: 100 });
const detail = await getGameDetail(games.games[0].id);
```

### API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/sports/games` | List games with filters |
| GET | `/api/admin/sports/games/{id}` | Game detail with boxscores, player stats, odds |
| GET | `/api/admin/sports/teams` | List teams |
| GET | `/api/admin/sports/teams/{id}` | Team detail with recent games |
| GET | `/api/admin/sports/scraper/runs` | List scrape job history |
| POST | `/api/admin/sports/scraper/runs` | Create new scrape job |
| GET | `/healthz` | Health check |

### Query Parameters for `/games`

| Parameter | Type | Description |
|-----------|------|-------------|
| `league` | string[] | Filter by league codes (e.g., `league=NBA&league=NFL`) |
| `season` | int | Filter by season year |
| `team` | string | Search by team name/abbreviation |
| `startDate` | date | Filter games on or after this date |
| `endDate` | date | Filter games on or before this date |
| `missingBoxscore` | bool | Only games without team boxscores |
| `missingPlayerStats` | bool | Only games without player stats |
| `missingOdds` | bool | Only games without odds data |
| `limit` | int | Max results (default 50, max 200) |
| `offset` | int | Pagination offset |

---

## Common SQL Queries

### Games with Complete Data

```sql
-- Games with boxscores and odds
SELECT g.*, l.code as league
FROM sports_games g
JOIN sports_leagues l ON g.league_id = l.id
WHERE g.id IN (
    SELECT DISTINCT game_id FROM sports_team_boxscores
)
AND g.id IN (
    SELECT DISTINCT game_id FROM sports_game_odds
)
AND g.status = 'completed'
ORDER BY g.game_date DESC;
```

### Extract Boxscore Stats

```sql
-- Extract specific stats from JSONB
SELECT 
    g.game_date,
    t.name as team,
    tb.is_home,
    tb.raw_stats_json->>'pts' as points,
    tb.raw_stats_json->>'fg_pct' as fg_pct,
    tb.raw_stats_json->>'trb' as rebounds,
    tb.raw_stats_json->>'ast' as assists,
    tb.raw_stats_json->>'tov' as turnovers
FROM sports_team_boxscores tb
JOIN sports_games g ON tb.game_id = g.id
JOIN sports_teams t ON tb.team_id = t.id
JOIN sports_leagues l ON g.league_id = l.id
WHERE l.code = 'NBA'
  AND g.season = 2024
ORDER BY g.game_date DESC;
```

### Closing Lines by Game

```sql
-- Get closing spreads and totals
SELECT 
    g.id as game_id,
    g.game_date,
    ht.name as home_team,
    at.name as away_team,
    MAX(CASE WHEN o.market_type = 'spread' AND o.side = 'home' THEN o.line END) as home_spread,
    MAX(CASE WHEN o.market_type = 'total' AND o.side = 'over' THEN o.line END) as total
FROM sports_games g
JOIN sports_teams ht ON g.home_team_id = ht.id
JOIN sports_teams at ON g.away_team_id = at.id
JOIN sports_game_odds o ON o.game_id = g.id
WHERE o.is_closing_line = true
  AND g.season = 2024
GROUP BY g.id, g.game_date, ht.name, at.name
ORDER BY g.game_date DESC;
```

### Player Stats for a Team

```sql
-- Player boxscores for Lakers games
SELECT 
    g.game_date,
    pb.player_name,
    pb.raw_stats_json->>'pts' as points,
    pb.raw_stats_json->>'mp' as minutes,
    pb.raw_stats_json->>'trb' as rebounds,
    pb.raw_stats_json->>'ast' as assists
FROM sports_player_boxscores pb
JOIN sports_games g ON pb.game_id = g.id
JOIN sports_teams t ON pb.team_id = t.id
WHERE t.name ILIKE '%lakers%'
  AND g.season = 2024
ORDER BY g.game_date DESC, pb.player_name;
```

### Data Coverage by League/Season

```sql
-- Count games with various data types
SELECT 
    l.code as league,
    g.season,
    COUNT(*) as total_games,
    COUNT(DISTINCT tb.game_id) as with_boxscores,
    COUNT(DISTINCT pb.game_id) as with_player_stats,
    COUNT(DISTINCT o.game_id) as with_odds
FROM sports_games g
JOIN sports_leagues l ON g.league_id = l.id
LEFT JOIN sports_team_boxscores tb ON tb.game_id = g.id
LEFT JOIN sports_player_boxscores pb ON pb.game_id = g.id
LEFT JOIN sports_game_odds o ON o.game_id = g.id
WHERE g.status = 'completed'
GROUP BY l.code, g.season
ORDER BY l.code, g.season DESC;
```

---

## Dependencies

### Python (Direct Database Access)

```txt
# For synchronous access
sqlalchemy>=2.0.0
psycopg[binary]>=3.2.0

# For async access
sqlalchemy>=2.0.0
asyncpg>=0.29.0

# Optional: for pandas integration
pandas>=2.0.0
```

### Python (Shared Models)

If importing ORM models from this repo:

```txt
sqlalchemy>=2.0.0
pydantic>=2.9.0
pydantic-settings>=2.6.0
```

---

## Security Considerations

1. **Read-Only Access**: For analytics workloads, create a read-only PostgreSQL user:

   ```sql
   CREATE USER sports_readonly WITH PASSWORD 'your-password';
   GRANT CONNECT ON DATABASE sports TO sports_readonly;
   GRANT USAGE ON SCHEMA public TO sports_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO sports_readonly;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sports_readonly;
   ```

2. **Network Security**: The API has no authentication by default. Use VPN, firewall rules, or add auth middleware for production.

3. **Connection Pooling**: For high-volume analytics, consider using PgBouncer or SQLAlchemy's pool settings.

---

## Schema Bootstrap

To initialize a fresh database:

```bash
# Apply schema
psql "$DATABASE_URL" -f sql/000_sports_schema.sql
```

This creates all tables and seeds the `sports_leagues` table with standard leagues (NBA, NFL, NCAAB, NCAAF, MLB, NHL).

---

## Troubleshooting

### "asyncpg" vs "psycopg" errors

- Use `postgresql+asyncpg://` for async code (FastAPI, asyncio)
- Use `postgresql+psycopg://` for sync code (Celery, scripts, pandas)

### Missing JSONB stats

Stats are stored in `raw_stats_json` columns. Keys vary by sport:
- **NBA**: `pts`, `fg`, `fg_pct`, `trb`, `ast`, `stl`, `blk`, `tov`, `mp`
- **NFL**: `pass_yds`, `rush_yds`, `rec_yds`, `td`, `int`
- **NHL**: `goals`, `assists`, `shots`, `saves`, `pim`

### Slow queries

Add indexes for your common query patterns. The schema includes indexes on:
- `(league_id, season, game_date)` on `sports_games`
- `(game_id)` on all child tables

For additional filtering, consider:

```sql
CREATE INDEX idx_games_status ON sports_games(status);
CREATE INDEX idx_odds_market ON sports_game_odds(market_type, is_closing_line);
```

---

## Support

- Schema source: `sql/000_sports_schema.sql`
- ORM models: `api/app/db_models.py`
- API source: `api/app/routers/sports.py`
- Docker setup: `infra/docker-compose.yml`

