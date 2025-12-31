# sports-data-admin

Standalone sports data platform with scraping, API, and admin UI for NBA, NCAAB, NFL, NHL, MLB, and NCAAF.

## Stack

| Component | Technology | Port |
|-----------|------------|------|
| **API** | FastAPI + SQLAlchemy | 8000 |
| **Scraper** | Celery + Playwright | — |
| **Web UI** | Next.js | 3000 |
| **Database** | PostgreSQL 16 | 5432 |
| **Queue** | Redis | 6379 |

## Quick Start (Docker)

```bash
cd infra
cp .env.example .env   # Edit credentials as needed

# Start everything
docker compose up -d --build

# First run: apply schema
docker exec -i sports-postgres psql -U dock108 -d dock108 < ../sql/000_sports_schema.sql
docker exec -i sports-postgres psql -U dock108 -d dock108 < ../sql/001_game_social_posts.sql
docker exec -i sports-postgres psql -U dock108 -d dock108 < ../sql/002_team_x_handles.sql
docker exec -i sports-postgres psql -U dock108 -d dock108 < ../sql/003_seed_nba_x_handles.sql
```

**URLs:**
- Admin UI: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/healthz

## Quick Start (Local Development)

```bash
# 1. Database schema
psql "$DATABASE_URL" -f sql/000_sports_schema.sql

# 2. API
cd api
pip install -r requirements.txt
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/sports"
export REDIS_URL="redis://localhost:6379/2"
uvicorn main:app --reload --port 8000

# 3. Scraper (new terminal)
cd scraper
uv pip install --system -e .
celery -A bets_scraper.celery_app.app worker --loglevel=info --queues=bets-scraper

# 4. Web UI (new terminal)
cd web
pnpm install
NEXT_PUBLIC_SPORTS_API_URL=http://localhost:8000 pnpm dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (async: `postgresql+asyncpg://`) |
| `REDIS_URL` | Yes | Redis for Celery queue |
| `ODDS_API_KEY` | No | The Odds API key for live odds |
| `X_AUTH_TOKEN` | No | X auth cookie for social scraping |
| `X_CT0` | No | X csrf cookie for social scraping |
| `NEXT_PUBLIC_SPORTS_API_URL` | Yes (web) | API base URL for frontend |

## Project Structure

```
sports-data-admin/
├── api/                 # FastAPI service
│   ├── app/
│   │   ├── routers/     # API endpoints
│   │   ├── db_models.py # SQLAlchemy ORM models
│   │   └── db.py        # Database connection
│   └── main.py
├── scraper/             # Celery workers
│   └── bets_scraper/
│       ├── scrapers/    # Sport-specific scrapers
│       ├── social/      # X/Twitter scraper
│       ├── odds/        # Odds API client
│       └── services/    # Run manager
├── web/                 # Next.js admin UI
│   └── src/
│       ├── app/admin/   # Admin pages
│       ├── components/  # React components
│       └── lib/api/     # API client
├── sql/                 # Database schema & migrations
├── infra/               # Docker configuration
└── docs/                # Additional documentation
```

## Documentation

See [docs/INDEX.md](docs/INDEX.md) for platform details, infrastructure docs, integration guides, and runbooks.

## License

Private — Dock108
