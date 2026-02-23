# Subnetly

[![CI](https://github.com/mannobeats/Subnetly/actions/workflows/ci.yml/badge.svg)](https://github.com/mannobeats/Subnetly/actions/workflows/ci.yml)
[![Release](https://github.com/mannobeats/Subnetly/actions/workflows/release.yml/badge.svg)](https://github.com/mannobeats/Subnetly/actions/workflows/release.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Self-hosted network and infrastructure operations platform for homelabs and small teams.

## GitHub About (repository description)

Use this as your GitHub repository description:

`Self-hosted network and infrastructure management platform with IPAM, topology, VLAN/WiFi planning, service monitoring, and multi-site support.`

## Features

- Device inventory with categories, status, and platform metadata
- IPAM with subnet/range planning, utilization, and overlap detection
- VLAN and WiFi planning with mapping controls
- Topology visualization with drag-and-drop layout persistence
- Service catalog with health checks and change tracking
- Multi-site isolation, backup/export, restore/import, and audit trail

## License

This project is licensed under **AGPL-3.0-only**. See `/LICENSE`.

## Quick Start (local dev)

### 1) Install

```bash
npm ci
cp .env.example .env
```

### 2) Configure `.env`

```env
DATABASE_URL="postgresql://subnetly:subnetly@localhost:5432/subnetly?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
SETUP_TOKEN=""
HEALTHCHECK_ALLOW_SELF_SIGNED="false"
```

### 3) Start PostgreSQL + app

```bash
docker compose -f docker-compose.yml up --build
```

Then open `http://localhost:3000`.

## Deploy with GHCR image

`compose.yml` in this repository pulls prebuilt public images from GHCR.

### 1) Download deploy files

```bash
curl -fsSL https://raw.githubusercontent.com/mannobeats/Subnetly/main/compose.yml -o compose.yml
curl -fsSL https://raw.githubusercontent.com/mannobeats/Subnetly/main/.env.example -o .env
```

### 2) Update `.env`

- Set a strong `BETTER_AUTH_SECRET`
- Set `BETTER_AUTH_URL` to your public URL
- Optionally set `SETUP_TOKEN`

### 3) Run

```bash
docker compose up -d
```

App: `http://localhost:3000`

## Release and image strategy

- `main` pushes:
  - run validation (lint, typecheck, build)
  - publish multi-arch container images to `ghcr.io/mannobeats/subnetly`
  - update `edge` pre-release automatically
- tag pushes (`v*`):
  - run validation
  - publish versioned images
  - create GitHub release notes automatically

## Published image tags

- `ghcr.io/mannobeats/subnetly:latest` (default branch)
- `ghcr.io/mannobeats/subnetly:main`
- `ghcr.io/mannobeats/subnetly:sha-<commit>`
- `ghcr.io/mannobeats/subnetly:vX.Y.Z` (on tags)

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run start`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:seed`

## Contributing and security

- Contribution guide: `/CONTRIBUTING.md`
- Security policy: `/SECURITY.md`
- Code of conduct: `/CODE_OF_CONDUCT.md`
