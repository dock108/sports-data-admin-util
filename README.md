# sports-data-admin

Standalone repo that hosts:
- FastAPI sports admin API (`api/`)
- Celery scraper worker (`scraper/`)
- Admin UI for ingestion + data browser (`web/`)
- Docker infra + schema + migration helpers

## Quickstart (no Docker required)
1) Apply schema: `psql "$DATABASE_URL" -f sql/000_sports_schema.sql`
2) API: `cd api && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000`
3) Scraper: `cd scraper && uv pip install --system -e . && celery -A bets_scraper.celery_app.app worker --loglevel=info --queues=bets-scraper`
4) Web: `cd web && pnpm install && pnpm dev --port 3000` (set `NEXT_PUBLIC_SPORTS_API_URL` to the API URL)

## Independence
- This repo is standalone and deploys on its own. There are no dependencies on any other codebase.

Docs: `docs/README.md`

