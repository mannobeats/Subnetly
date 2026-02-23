# Homelab IP Manager

A sleek, UniFi-inspired web application to manage your homelab IP addresses and device MAC addresses.

## Features
- **Dashboard:** At-a-glance stats of your network usage.
- **Device Management:** Add, edit, and delete devices (MAC, IP, Category).
- **Search & Filter:** Find devices quickly by Name, IP, or MAC.
- **Export:** Export your entire database to JSON for backups or migration.
- **SQLite Powered:** Completely local and self-hosted.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Startup the App
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Architecture
- **Framework:** Next.js 15 (App Router)
- **Database:** SQLite
- **ORM:** Prisma 7
- **UI:** Vanilla CSS with a focus on rich aesthetics.
