# Infrastructure

## Quick Start

### Option A: Full Stack (Fresh Database)

Spins up postgres, redis, api, scraper, and web in Docker:

```bash
cd infra

# Copy env file (edit values if needed)
cp ../.env .env

# Start everything
docker-compose up --build

# First time only: initialize schema
docker exec -i sports-postgres psql -U dock108 -d dock108 < ../sql/000_sports_schema.sql
```

### Option B: Connect to Existing Database (Recommended)

If you already have postgres/redis running locally with data:

```bash
cd infra

# Copy env file
cp ../.env .env

# Start only the app services (connects to host postgres/redis)
docker-compose -f docker-compose.local.yml up --build
```

**Requires:** Postgres and Redis already running on localhost.

---

## URLs

| Service | URL |
|---------|-----|
| API | http://localhost:8000/healthz |
| Web Admin | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |

---

## Commands

```bash
# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api

# Stop everything
docker-compose down

# Stop and remove volumes (destroys data!)
docker-compose down -v

# Rebuild a single service
docker-compose build api
docker-compose up -d api
```

---

## Environment Variables

Create `.env` in the `infra/` directory (or copy from root):

```bash
cp ../.env .env
```

Key variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — Database credentials
- `REDIS_PASSWORD` — Redis auth (optional)
- `ODDS_API_KEY` — For fetching betting odds

---

## Production Notes

- Set strong passwords in `.env`
- Firewall ports 5432/6379 (only API on 8000 and web on 3000 should be exposed)
- Mount volumes to persistent storage
- Consider putting behind nginx/traefik with TLS
