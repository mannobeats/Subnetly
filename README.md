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

```env
DATABASE_URL="postgresql://subnetly:subnetly@localhost:5432/subnetly?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Optional first-run admin bootstrap
ADMIN_EMAIL="admin@subnetly.local"
ADMIN_PASSWORD="admin123"
ADMIN_NAME="Administrator"
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

On first run (empty database), Subnetly can auto-create an admin account using `ADMIN_*` variables.

## Docker (Optional)

If using Docker Compose:

```bash
docker compose up --build
```

The app runs on `http://localhost:3000` and PostgreSQL on `localhost:5432`.

## Data Safety Notes

- Backup import **replaces all data in the currently active site**.
- Use export before import or destructive operations.
- For production usage, set strong secrets and non-default admin credentials.

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — prisma generate + Next build
- `npm run start` — run production server
- `npm run lint` — run ESLint
- `npm run db:push` — sync Prisma schema to DB
- `npm run db:migrate` — run Prisma migrations (dev)
- `npm run db:seed` — run seed script
