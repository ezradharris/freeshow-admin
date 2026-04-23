# Chronicles

Admin panel for managing FreeShow presentations — songs, shows, projects, history, import/export.

## Stack

- **TanStack Start** — SSR + file-based routing + server functions
- **Better Auth** — authentication
- **Drizzle ORM** + PostgreSQL — database
- **CASL** — authorization
- **Tailwind CSS v4** — styling

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and fill in values.

Start the database:

```bash
docker compose up -d
```

Run migrations:

```bash
bun run db:push
```

Start dev server:

```bash
bun run dev
```

## Build

```bash
bun run build
```

## Test

```bash
bun test
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Sign-in |
| `/auth/*` | Auth views (sign-up, reset password, etc.) |
| `/dashboard` | Overview |
| `/songs` | Song library |
| `/shows` | Show library |
| `/projects` | Projects |
| `/import` | Import FreeShow files |
| `/export` | Export to FreeShow format |
| `/history` | Change history |
| `/settings` | App settings |
| `/s/:token` | Public song share |
