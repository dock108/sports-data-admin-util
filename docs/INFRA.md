# Infrastructure

Docker configuration for the sports-data-admin stack.

## Quick Start

```bash
cd infra
cp .env.example .env  # Edit as needed

# Full stack with dev profile
docker compose --profile dev up -d --build
```

## Docker Profiles

Services use profiles to control which containers start:

| Profile | Use Case |
|---------|----------|
| dev | Local development (all services) |
| staging | Staging environment |
| prod | Production deployment |

```bash
# Start with specific profile
docker compose --profile dev up -d

# Or set environment variable
export COMPOSE_PROFILES=dev
docker compose up -d
```

## Files

| File | Description |
|------|-------------|
| docker-compose.yml | Full stack with postgres, redis, api, scraper, web |
| docker-compose.local.yml | Connect to existing localhost postgres/redis |
| api.Dockerfile | FastAPI service |
| scraper.Dockerfile | Celery worker with Playwright |
| web.Dockerfile | Next.js admin UI |
| nginx/admin.conf | Admin-only Nginx config |
| .env.example | Environment template |

## URLs

| Service | URL |
|---------|-----|
| Web Admin | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Database Configuration

The stack can connect to either:

### 1. Docker Postgres (Fresh Database)
Default when using Docker postgres container.

### 2. Host Postgres (Existing Database)
The default configuration connects to `host.docker.internal:5432`, allowing the Docker containers to access a Postgres instance running on your host machine.

Set these in `.env`:
```bash
POSTGRES_DB=dock108
POSTGRES_USER=dock108
POSTGRES_PASSWORD=yourpassword
```

## Commands

```bash
# Start all services
docker compose --profile dev up -d --build

# View logs
docker compose --profile dev logs -f api

# Restart a service
docker compose --profile dev restart api

# Rebuild single service
docker compose --profile dev up -d --build scraper

# Stop all
docker compose --profile dev down

# Stop and delete volumes
docker compose --profile dev down -v
```

## Migrations

Migrations run automatically on API startup when `RUN_MIGRATIONS=true`.

To disable auto-migrations:
```bash
RUN_MIGRATIONS=false
```

Manual migration:
```bash
docker exec sports-api alembic upgrade head
```

## Health Checks

All services have health checks:

| Service | Check |
|---------|-------|
| postgres | `pg_isready` |
| redis | `redis-cli ping` |
| api | HTTP GET `/healthz` |
| web | HTTP GET `/` |
| scraper | Celery ping |

## Environment Variables

See `.env.example` for all available variables.

Key variables:

| Variable | Description |
|----------|-------------|
| POSTGRES_DB | Database name |
| POSTGRES_USER | Database user |
| POSTGRES_PASSWORD | Database password |
| REDIS_PASSWORD | Redis password (optional) |
| X_AUTH_TOKEN | X/Twitter auth cookie |
| X_CT0 | X/Twitter CSRF cookie |
| ODDS_API_KEY | The Odds API key |
| RUN_MIGRATIONS | Auto-run Alembic on startup |

See the [root README](../README.md) for setup details and the [docs index](INDEX.md) for more guides.
