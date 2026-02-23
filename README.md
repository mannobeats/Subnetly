# Subnetly

[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Self-hosted network and infrastructure management platform for homelabs and small teams.

## Project Goal

Subnetly gives you one place to operate infrastructure:

- devices and inventory,
- IPAM (subnets, ranges, allocations),
- VLAN and WiFi planning,
- service catalog + health checks,
- topology visualization,
- multi-site organization and auditing.

## Features

- Device management (category, status, platform, metadata)
- IPAM with subnet/range planning and utilization visibility
- VLAN + WiFi modeling and mapping
- Topology with drag/drop layout persistence
- Service monitoring and status history
- Backup/export and restore/import
- Multi-site isolation with changelog tracking

## Quick Setup (No `.env` required)

### 1) Create `compose.yml`

Copy and paste this file:

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
      # Change host port on the left side only.
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://subnetly:subnetly@db:5432/subnetly?schema=public"
      NODE_ENV: production

      # REQUIRED: replace with a strong random secret.
      BETTER_AUTH_SECRET: "replace-with-a-long-random-secret"

      # Optional: allow self-signed certs for service health checks.
      HEALTHCHECK_ALLOW_SELF_SIGNED: "false"

volumes:
  subnetly-db:
```

### 2) Start

```bash
docker compose up -d
```

### 3) Open

- `http://localhost:3000`
- If you changed host port, use that port.

## First Run

On first startup, Subnetly shows **Initial Setup**.

- Create owner name/email/password.

## Local Development

```bash
npm ci
npm run db:push
npm run dev
```

## Contributing

Contributions are welcome.

- Read `/CONTRIBUTING.md`
- Open issues for bugs and feature requests
- Submit pull requests with clear validation

## Security

- See `/SECURITY.md` for vulnerability reporting

## License

AGPL-3.0-only. See `/LICENSE`.
