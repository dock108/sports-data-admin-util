# Local Development

## Docker (Recommended)

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

## Local Services

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
