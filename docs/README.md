# sports-data-admin

Standalone sports scraper + REST API + admin UI. Fully independent.

## Documentation

- [Database Integration Guide](./DATABASE_INTEGRATION.md) — How to connect to and extract data from the database for external services

## Layout
- `api/` FastAPI service exposing sports admin endpoints.
- `scraper/` Celery worker (boxscores + odds).
- `web/` Next.js admin UI (Sports Data Ingestion + Data Browser).
- `infra/` Dockerfiles and `docker-compose.yml`.
- `sql/` Schema bootstrap (`000_sports_schema.sql`).
- `scripts/` Migration helper (`migrate_sports_data.sh`).

## Quickstart (manual)
1) Apply schema: `psql "$DATABASE_URL" -f sql/000_sports_schema.sql`
2) API: `cd api && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000`
3) Scraper: `cd scraper && uv pip install --system -e . && celery -A bets_scraper.celery_app.app worker --loglevel=info --queues=bets-scraper`
4) Web: `cd web && pnpm install && pnpm dev --port 3000` (set `NEXT_PUBLIC_SPORTS_API_URL` to the API URL)

## Manual setup
1) Apply schema: `psql "$DATABASE_URL" -f sql/000_sports_schema.sql`
2) API: `cd api && pip install -r requirements.txt && uvicorn app.main:app --reload`
3) Scraper: `cd scraper && uv pip install --system -e . && celery -A bets_scraper.celery_app.app worker --loglevel=info --queues=bets-scraper`
4) Web: `cd web && pnpm install && pnpm dev --port 3000`

## Migration
- Use `scripts/migrate_sports_data.sh` with `SRC_DB` (source Postgres) and `DEST_DB` (this repo’s Postgres) URLs.
- Validate row counts for `sports_*` tables after restore.

## Configuration
- API env: `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL` (default redis), `CELERY_RESULT_BACKEND`.
- Scraper env: `DATABASE_URL` (sync), `REDIS_URL`/`REDIS_HOST`/`REDIS_DB`, `ODDS_API_KEY` optional.
- Web env: `NEXT_PUBLIC_SPORTS_API_URL` pointing at the API.

## Notes
- No auth: intended for single-tenant/LAN/VPN use.

