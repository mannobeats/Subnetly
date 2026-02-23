# Contributing

## Development setup

1. Fork and clone the repository.
2. Copy `.env.example` to `.env`.
3. Install dependencies with `npm ci`.
4. Start services with `docker compose -f docker-compose.yml up -d db` or your own PostgreSQL.
5. Run `npm run db:push` and `npm run dev`.

## Before opening a pull request

- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run build`
- Keep changes scoped and include migration notes when schema changes.

## Commit and PR guidelines

- Use clear commit messages describing behavior changes.
- Link related issues in PR description.
- Include screenshots for UI updates.
- Mention security implications for auth, permissions, or data handling changes.
