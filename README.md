# Sports Data Admin

> The central data platform for Scroll Down Sports — ingest, curate, and publish sports data.

## What Is This?

Sports Data Admin is the **source of truth** for all sports data consumed by downstream applications. It is **not user-facing** — it's an internal admin and data operations platform.

### Why It Exists

Consumer apps like [Scroll Down Sports](https://scrolldownsports.com) need reliable, normalized sports data. This platform:

- **Ingests** raw data from multiple sources (Sports Reference, The Odds API, X/Twitter)
- **Normalizes** formats into predictable schemas
- **Curates** data through admin review and quality filters
- **Publishes** clean data via API for downstream consumption

### Who Uses It

- **Data Operations** — Schedule scrape jobs, monitor ingestion, review data quality
- **Developers** — Query the API, integrate with consumer apps
- **No end users** — This is internal infrastructure only

## Core Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
│  Sports Reference (boxscores) │ The Odds API │ X/Twitter (social)   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         INGESTION LAYER                              │
│  Celery workers scrape, normalize, validate, and persist data       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         POSTGRES DATABASE                            │
│  games │ boxscores │ odds │ social │ plays │ thresholds             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN API (FastAPI)                          │
│  REST endpoints for data access, scrape scheduling, game detail     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────────┐
│   ADMIN UI (Next.js)    │            │   DOWNSTREAM CONSUMERS      │
│   Internal ops only     │            │   scroll-down-app (iOS)     │
│                         │            │   scroll-down-sports-ui     │
└─────────────────────────┘            └─────────────────────────────┘
```

## Downstream Consumers

This platform serves data to:

| App | Type | Relationship |
|-----|------|--------------|
| `scroll-down-app` | iOS app | Consumes game data, social posts, compact moments |
| `scroll-down-sports-ui` | Web app | Consumes game data, renders timelines |

**Contract:** The API implements `scroll-down-api-spec`. Schema changes require updating the spec first.

## Tech Stack

| Component | Technology |
|-----------|------------|
| API | Python, FastAPI, SQLAlchemy |
| Scraper | Python, Celery, Playwright |
| Database | PostgreSQL |
| Queue | Redis |
| Admin UI | Next.js, React, TypeScript |

## Quick Start

### Docker (Recommended)

```bash
cd infra
cp .env.example .env   # Edit credentials

# Start full stack
docker compose --profile dev up -d --build
```

**URLs:**
- Admin UI: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/healthz

### Local Development

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for detailed setup.

## Project Structure

```
sports-data-admin/
├── api/                 # FastAPI backend
│   ├── app/             # Application code
│   │   ├── routers/     # API endpoints
│   │   ├── services/    # Business logic
│   │   └── db_models.py # SQLAlchemy models
│   └── alembic/         # Database migrations
├── scraper/             # Celery workers
│   └── bets_scraper/    # Ingestion logic
├── web/                 # Admin UI (Next.js)
│   └── src/             # React components
├── sql/                 # Schema reference
├── infra/               # Docker configs
└── docs/                # Documentation
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Platform Overview](docs/PLATFORM_OVERVIEW.md) | Features and endpoints |
| [Local Development](docs/LOCAL_DEVELOPMENT.md) | Setup instructions |
| [Infrastructure](docs/INFRA.md) | Docker and deployment |
| [Database Integration](docs/DATABASE_INTEGRATION.md) | Querying data |
| [Operator Runbook](docs/OPERATOR_RUNBOOK.md) | Production operations |
| [Scoring & Scrapers](docs/SCORE_LOGIC_AND_SCRAPERS.md) | Ingestion details |
| [X Integration](docs/X_INTEGRATION.md) | Social media scraping |

Full index: [docs/INDEX.md](docs/INDEX.md)

## Key Principles

1. **Data correctness first** — Downstream apps depend on this data being accurate
2. **Predictable schemas** — No silent changes that break consumers
3. **Traceable processing** — Every transformation is logged and explainable
4. **Zero silent failures** — Errors surface, never get swallowed

## Contributing

See [AGENTS.md](AGENTS.md) for AI agent context and [docs/CODEX_TASK_RULES.md](docs/CODEX_TASK_RULES.md) for task formatting.

## License

Private repository — internal use only.
