# Sports Data Admin

Central data platform for Scroll Down Sports. It ingests, normalizes, and serves sports data to internal consumers (admin UI and downstream apps).

## Run Locally

### Docker (recommended)

```bash
cd infra
cp .env.example .env

docker compose --profile dev up -d --build
```

**URLs**
- Admin UI: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/healthz

### Local development (manual)

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Deployment Basics

Infrastructure and deployment references live in [docs/INFRA.md](docs/INFRA.md). The `infra/` directory contains Docker and compose assets used for local and deploy environments.

Production deployments should use the repository-root `docker-compose.prod.yml` as the source of truth for the Hetzner + Cloudflare stack.

## Production Deployment

### Overview

Production runs on a Hetzner VM using Docker Compose. Cloudflare fronts inbound traffic to the VM. Deployments are orchestrated through GitHub Actions, which build and publish container images and then update services on the server.

### Deploy Flow (Step-by-Step)

1. **Trigger**: A deploy runs on merge to `main` or a manual GitHub Actions workflow dispatch from `main`.
2. **CI/CD build**: GitHub Actions builds the API, admin UI, and scraper images and pushes them to GHCR with `latest` and commit-sha tags.
3. **Server update**: The deploy job connects to the Hetzner VM over SSH, loads the production compose configuration, pulls the updated images, and restarts only the changed services via `docker compose up -d <service>`.

### Environment Variables

Production secrets live only on the server in a `.env` file located alongside `docker-compose.prod.yml`. The compose file loads this via `env_file`, so nothing is committed to the repo. See `infra/.env.example` for the full list of expected keys.

Required variable categories include:

- **Database/Redis**: Postgres credentials, Redis password, and service connection URLs (`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`).
- **App/runtime config**: `ENVIRONMENT=production`, `ALLOWED_CORS_ORIGINS`, and related runtime toggles.
- **External APIs**: Odds API and X/Twitter scraping credentials for the worker.
- **Frontend URLs**: `NEXT_PUBLIC_SPORTS_API_URL` (and related internal API URLs if applicable).

Do not check secrets into git. Keep production values only in the server `.env`.

### Rollback Strategy

Rollbacks are performed by pinning a service to a previous GHCR image tag (typically the commit-sha tag created by CI/CD), then restarting the service:

1. Update the service image tag in the server’s compose config to the desired SHA (or image digest).
2. Run `docker compose pull <service>` to fetch the older image.
3. Run `docker compose up -d <service>` to restart with the pinned version.

Note: database migrations are not rolled back automatically. If a deploy includes a schema change, you must manually revert the migration before running the older application image.

### Operational Notes & Guardrails

- **Do not** edit production secrets or compose files on the VM without committing the change to the repo (except for the server-only `.env`).
- **Migrations**: run explicitly using the `migrate` service before or after app restarts; do not rely on startup migrations in production.
- **Deploy failures**: start with GitHub Actions logs and then check container logs on the VM (`docker compose logs <service>`).

### Assumptions

This deployment model assumes a single Hetzner VM running Docker Compose with Cloudflare in front and GitHub Actions performing SSH-based deploys. It should be revisited if production moves to multi-host orchestration, a different image registry, or a non-SSH deployment mechanism.

## Documentation

Start with the docs index: [docs/INDEX.md](docs/INDEX.md).

Key guides:
- [Platform Overview](docs/PLATFORM_OVERVIEW.md)
- [API](docs/API.md)
- [Database Integration](docs/DATABASE_INTEGRATION.md)
- [Operator Runbook](docs/OPERATOR_RUNBOOK.md)
- [Scoring & Scrapers](docs/SCORE_LOGIC_AND_SCRAPERS.md)
- [X Integration](docs/X_INTEGRATION.md)

## Contributing

See [AGENTS.md](AGENTS.md) and [docs/CODEX_TASK_RULES.md](docs/CODEX_TASK_RULES.md).
