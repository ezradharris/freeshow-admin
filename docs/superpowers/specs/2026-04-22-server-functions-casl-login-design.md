# Server Functions, CASL Middleware & Login Page Redesign

**Date:** 2026-04-22
**Branch:** freeshow-admin

## Goals

1. Replace all direct `db` calls in loaders and REST API routes with typed TanStack Start server functions
2. Add CASL authorization middleware (currently: authenticated = full access, extensible later)
3. Separate landing/login page from the dashboard

---

## Architecture

### Server Function Layer (`src/server/`)

All DB access moves into domain-scoped server function files. REST routes under `src/routes/api/` are deleted entirely.

```
src/
  server/
    auth.ts        ← withAuth() — session check + CASL ability
    songs.ts       ← getSongs, getSong, createSong, updateSong, deleteSong
    shows.ts       ← getShows, getShow, createShow, updateShow, deleteShow
    settings.ts    ← getSettings, updateSettings
    history.ts     ← getHistory, getSongHistory, getShowHistory
    shares.ts      ← createShare, getShareByToken
```

Each server function follows this pattern:

```ts
export const getSong = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await withAuth()
    return db.select().from(songs).where(eq(songs.id, data.id))
  })
```

Route loaders call server functions directly:

```ts
loader: async ({ params }) => getSong({ data: { id: params.id } })
```

Mutations call server functions from component event handlers (no more `fetch('/api/...')`):

```ts
async function handleSave() {
  await updateSong({ data: { id: song.id, ...fields } })
}
```

`src/lib/api-helpers.ts` is deleted — `requireSession`, `jsonResponse`, `errorResponse` are no longer needed.

---

## CASL Setup (`src/lib/ability.ts`)

```ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability"

export type AppAbility = ReturnType<typeof defineAbilityFor>

export function defineAbilityFor(user: { id: string } | null) {
  const { can, build } = new AbilityBuilder(createMongoAbility)
  if (user) can("manage", "all")
  return build()
}
```

`withAuth()` in `src/server/auth.ts`:

```ts
import { getHeaders } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { defineAbilityFor } from "@/lib/ability"

export async function withAuth() {
  const session = await auth.api.getSession({ headers: getHeaders() })
  if (!session) throw new Error("Unauthorized")
  const ability = defineAbilityFor(session.user)
  return { session, ability }
}
```

Every server function calls `withAuth()` at the top. Returns `{ session, ability }` for functions that need user context (e.g. recording `changedBy`). Future role expansion: add `can(...)` rules in `defineAbilityFor` based on `user.role` — server functions call `ability.cannot("update", "Song")` to gate specific operations.

---

## Login Page & Routing

### Route changes

| Before | After |
|--------|-------|
| `/` — dashboard | `/dashboard` — dashboard |
| `/auth/$path` — all auth views | `/auth/$path` — register, reset, etc. |
| *(none)* | `/` — landing/login page |

### Landing page layout (`src/routes/index.tsx`)

Simple two-panel layout — hero image left, login card right (stacks vertically on mobile). Uses `<AuthView path="sign-in" />` from `@daveyplate/better-auth-ui`. No custom login form.

The root layout (`__root.tsx`) renders `<Header>` only for authenticated routes — achieved by nesting all protected routes under a layout route that includes the header, leaving `/` outside that layout.

### Auth redirect logic

Shared session server function in `src/server/auth.ts`:

```ts
export const getSession = createServerFn({ method: "GET" })
  .handler(async () => {
    return auth.api.getSession({ headers: getHeaders() })
  })
```

Used in `beforeLoad`:

- **`/` (landing):** if session exists → redirect to `/dashboard`
- **`/dashboard` and all protected routes:** if no session → redirect to `/`

### Route tree structure

```
__root.tsx                    ← shell only (no header)
  index.tsx                   ← /  (landing + login, no header)
  _authenticated.tsx          ← layout: checks session, renders <Header>
    _authenticated/dashboard  ← /dashboard
    _authenticated/songs      ← /songs/...
    _authenticated/shows      ← /shows/...
    _authenticated/settings   ← /settings
    _authenticated/...
  auth/$path.tsx              ← /auth/$path (no header needed)
```

---

## Files Deleted

- `src/routes/api/songs/index.ts`
- `src/routes/api/songs/$id.ts`
- `src/routes/api/songs/$id/history.ts`
- `src/routes/api/songs/$id/share.ts`
- `src/routes/api/shows/index.ts`
- `src/routes/api/shows/$id.ts`
- `src/routes/api/shows/$id/history.ts`
- `src/routes/api/settings.ts`
- `src/routes/api/export.ts`
- `src/routes/api/import.ts`
- `src/routes/api/history.ts`
- `src/routes/api/public/songs/$token.ts`
- `src/lib/api-helpers.ts`

---

## Files Added

- `src/lib/ability.ts` — CASL ability definition
- `src/server/auth.ts` — `withAuth()`, `getSession` server fn
- `src/server/songs.ts` — song CRUD server functions
- `src/server/shows.ts` — show CRUD server functions
- `src/server/settings.ts` — settings server functions
- `src/server/history.ts` — history server functions
- `src/server/shares.ts` — share server functions (note: `getShareByToken` skips `withAuth()` — public access by design)
- `src/routes/_authenticated.tsx` — protected layout route

## Files Modified

- `src/routes/index.tsx` — landing/login page
- `src/routes/__root.tsx` — remove header from shell
- `src/routes/songs/*.tsx` — loaders use server fns, mutations use server fns
- `src/routes/shows/*.tsx` — same
- `src/routes/settings.tsx` — same
- `src/routes/history.tsx` — same
- `src/routes/projects/*.tsx` — same
- `src/routeTree.gen.ts` — regenerated by TanStack Router

---

## Dependencies Added

- `@casl/ability`
