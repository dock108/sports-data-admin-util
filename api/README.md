# sports-data-admin API

FastAPI service exposing sports admin endpoints (scrape runs, games, teams, odds) extracted from dock108.

## Quickstart

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sports
export REDIS_URL=redis://localhost:6379/2
export CELERY_BROKER_URL=$REDIS_URL
uvicorn app.main:app --reload --port 8000
```

## Env vars
- `DATABASE_URL` (required) e.g. `postgresql+asyncpg://user:pass@host:5432/sports`
- `REDIS_URL` broker/backend for Celery (default queue `bets-scraper`)
- `CELERY_BROKER_URL` optional override for broker
- `CELERY_RESULT_BACKEND` optional override for backend

## Health
- `GET /healthz` returns `{status: "ok"}`
- Admin routes are under `/api/admin/sports/*`


