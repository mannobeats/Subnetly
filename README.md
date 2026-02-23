# Subnetly

[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Self-hosted network and infrastructure management platform for homelabs and small teams.

## Project Goal

Subnetly helps you manage core infrastructure in one place:

- devices and inventory,
- IPAM (subnets, ranges, allocations),
- VLAN and WiFi planning,
- service catalog and health checks,
- topology visualization,
- multi-site workspaces and auditing.

The goal is simple deployment, clear operations, and practical day-to-day visibility.

## Features

- Device management (category, status, platform, metadata)
- IPAM with subnet/range planning and utilization visibility
- VLAN and WiFi modeling with mapping support
- Topology view with drag/drop layout persistence
- Service catalog with health checks and status tracking
- Backup/export and restore/import
- Multi-site isolation with changelog auditing

## Quick Setup

### 1) Requirements

- Docker + Docker Compose

### 2) Create `.env`

```env
APP_PORT="3000"
DATABASE_URL="postgresql://subnetly:subnetly@db:5432/subnetly?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL=""
BETTER_AUTH_TRUSTED_ORIGINS=""
INITIAL_SETUP_TOKEN=""
HEALTHCHECK_ALLOW_SELF_SIGNED="false"
```

### 3) Create `compose.yml`

```yaml
services:
  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: subnetly
      POSTGRES_PASSWORD: subnetly
      POSTGRES_DB: subnetly
    volumes:
      - subnetly-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U subnetly -d subnetly"]
      interval: 10s
      timeout: 5s
      retries: 10

  app:
    image: ghcr.io/mannobeats/subnetly:latest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: "${DATABASE_URL:-postgresql://subnetly:subnetly@db:5432/subnetly?schema=public}"
      NODE_ENV: production
      BETTER_AUTH_SECRET: "${BETTER_AUTH_SECRET:?set-in-.env}"
      BETTER_AUTH_URL: "${BETTER_AUTH_URL:-}"
      BETTER_AUTH_TRUSTED_ORIGINS: "${BETTER_AUTH_TRUSTED_ORIGINS:-}"
      INITIAL_SETUP_TOKEN: "${INITIAL_SETUP_TOKEN:-}"
      HEALTHCHECK_ALLOW_SELF_SIGNED: "${HEALTHCHECK_ALLOW_SELF_SIGNED:-false}"

volumes:
  subnetly-db:
```

### 4) Start

```bash
docker compose up -d
```

Open:

```text
http://localhost:APP_PORT
```

Replace `APP_PORT` with your configured value (default `3000`).

## First Run

On first startup, Subnetly shows **Initial Setup** to create the owner account.

- If `INITIAL_SETUP_TOKEN` is empty, no token is required.
- If `INITIAL_SETUP_TOKEN` is set, that token must be entered during first setup.

## Cloudflare Tunnel / Reverse Proxy

For public domain access, set:

- `BETTER_AUTH_URL=https://your-domain.example`
- Optional: `BETTER_AUTH_TRUSTED_ORIGINS` for additional origins, comma-separated

Example:

```env
BETTER_AUTH_URL="https://subnetly.example.com"
BETTER_AUTH_TRUSTED_ORIGINS="https://subnetly.example.com,https://subnetly.internal.example"
```

Tunnel route basics:

- Hostname: your public domain/subdomain
- Path: empty (route all paths)
- Service type: HTTP
- Service URL: your host IP + `APP_PORT` (example `http://10.0.10.50:3008`)

If you see `NXDOMAIN`, fix DNS/hostname mapping in Cloudflare first.

## Local Development

```bash
npm ci
cp .env.example .env
npm run db:push
npm run dev
```

## Contributing

Contributions are welcome.

- Read `/CONTRIBUTING.md`
- Open issues for bugs or feature requests
- Submit pull requests with clear scope and validation

## Security

Report vulnerabilities through:

- `/SECURITY.md`

## License

AGPL-3.0-only. See `/LICENSE`.
