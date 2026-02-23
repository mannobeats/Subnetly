# Subnetly

Subnetly is a self-hosted network and infrastructure operations platform for homelabs and small teams.

It combines:
- device inventory,
- IP address management (IPAM),
- VLAN and WiFi planning,
- service catalog + health checks,
- topology visualization,
- changelog auditing,
- backup/export + restore/import,
- multi-site workspace isolation.

## Core Features

- **Dashboard**
  - live counts for devices, subnets, VLANs, WiFi, services
  - subnet utilization and recent changes
  - service health snapshots

- **Device Management**
  - CRUD for devices with category/status/platform metadata
  - automatic IPAM link when a device IP matches a subnet

- **IPAM**
  - subnet CRUD
  - IP range management (DHCP/reserved/infrastructure/general)
  - overlap detection and utilization tracking
  - visual grid/list/summary planning views

- **VLAN + WiFi**
  - VLAN CRUD with role tagging
  - WiFi SSID management with security mode, band, PMF, TX power, guest/isolation controls
  - VLAN/subnet mapping for wireless networks

- **Services + Monitoring**
  - service catalog linked to devices
  - optional periodic URL health checks with uptime stats
  - status change logging

- **Topology**
  - graph view of devices, cable links, and subnet grouping
  - draggable layouts with persisted positions

- **Ops & Governance**
  - changelog trail for create/update/delete actions
  - full-site JSON backup export/import
  - per-site settings and multi-site switching

## Tech Stack

- **Framework:** Next.js (App Router)
- **Runtime:** React + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** better-auth (email/password)
- **Styling/UI:** Tailwind CSS + component primitives

## Getting Started (Local)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create/update `.env` with at least:

You can start from `example.env`:

```bash
cp example.env .env
```

```env
DATABASE_URL="postgresql://subnetly:subnetly@localhost:5432/subnetly?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Production-only setup protection (recommended in all environments)
SETUP_TOKEN="replace-with-a-random-one-time-setup-token"

# Optional: allow self-signed TLS for service health checks
HEALTHCHECK_ALLOW_SELF_SIGNED="false"
```

### 3) Prepare database

```bash
npm run db:push
```

### 4) Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

On first run (empty database), Subnetly shows an **Initial Setup** screen where you create the owner account (name, email, password).

If `SETUP_TOKEN` is configured, you must enter it during initial setup.

## Docker (Optional)

If using Docker Compose (PostgreSQL 18):

```bash
docker compose up --build
```

The app runs on `http://localhost:3000` and PostgreSQL 18 on `localhost:5432`.

## Data Safety Notes

- Backup import **replaces all data in the currently active site**.
- Use export before import or destructive operations.
- For production usage, set strong secrets and a setup token.
- All API mutations are scoped to the authenticated active site; never send `siteId` from clients for ownership control.

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — prisma generate + Next build
- `npm run start` — run production server
- `npm run lint` — run ESLint
- `npm run typecheck` — run strict TypeScript checks
- `npm run db:push` — sync Prisma schema to DB
- `npm run db:migrate` — run Prisma migrations (dev)
- `npm run db:seed` — run seed script
