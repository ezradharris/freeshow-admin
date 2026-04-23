# Server Functions, CASL & Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all direct `db` calls and REST API routes with typed TanStack Start server functions, add CASL auth middleware, restructure routing with a `_authenticated` layout, and create a landing/login page at `/`.

**Architecture:** Server functions live in `src/server/` (one file per domain). A shared `withAuth()` helper checks the Better Auth session and builds a CASL ability. All protected routes nest under a `_authenticated` pathless layout route that enforces auth in `beforeLoad`. Dashboard moves to `/dashboard`; `/` becomes the landing/login page.

**Tech Stack:** TanStack Start (`createServerFn`), Better Auth, Drizzle ORM, `@casl/ability`, `@daveyplate/better-auth-ui`

---

## File Map

**Create:**
- `src/lib/ability.ts` — CASL ability factory
- `src/server/auth.ts` — `withAuth()`, `getSessionFn`
- `src/server/songs.ts` — song CRUD server functions
- `src/server/shows.ts` — show CRUD server functions
- `src/server/settings.ts` — settings server functions
- `src/server/history.ts` — history server functions
- `src/server/shares.ts` — share server functions
- `src/routes/_authenticated.tsx` — protected layout route
- `src/routes/_authenticated/dashboard.tsx` — moves from `routes/index.tsx`
- `src/routes/_authenticated/songs/index.tsx` — moves from `routes/songs/index.tsx`
- `src/routes/_authenticated/songs/$id.tsx` — moves from `routes/songs/$id.tsx`
- `src/routes/_authenticated/songs/new.tsx` — moves from `routes/songs/new.tsx`
- `src/routes/_authenticated/shows/index.tsx` — moves from `routes/shows/index.tsx`
- `src/routes/_authenticated/shows/$id.tsx` — moves from `routes/shows/$id.tsx`
- `src/routes/_authenticated/shows/new.tsx` — moves from `routes/shows/new.tsx`
- `src/routes/_authenticated/projects/index.tsx` — moves from `routes/projects/index.tsx`
- `src/routes/_authenticated/projects/$id.tsx` — moves from `routes/projects/$id.tsx`
- `src/routes/_authenticated/projects/new.tsx` — moves from `routes/projects/new.tsx`
- `src/routes/_authenticated/settings.tsx` — moves from `routes/settings.tsx`
- `src/routes/_authenticated/history.tsx` — moves from `routes/history.tsx`
- `src/routes/_authenticated/export.tsx` — moves from `routes/export.tsx`
- `src/routes/_authenticated/import.tsx` — moves from `routes/import.tsx`
- `src/routes/_authenticated/account/$path.tsx` — moves from `routes/account/$path.tsx`
- `src/lib/ability.test.ts` — unit tests for ability

**Modify:**
- `src/routes/index.tsx` — becomes landing/login page
- `src/routes/__root.tsx` — remove NavSidebar (moves to `_authenticated` layout)
- `src/components/nav-sidebar.tsx` — update Dashboard link to `/dashboard`
- `src/components/song-editor/history-sidebar.tsx` — replace `fetch` with server fn
- `src/components/show-history-sidebar.tsx` — replace `fetch` with server fn
- `src/components/song-editor/share-panel.tsx` — replace `fetch` with server fn

**Delete:**
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
- (old route files after moving to `_authenticated/`)

---

### Task 1: Install @casl/ability

**Files:**
- Modify: `package.json` (via bun add)

- [ ] **Step 1: Install the package**

```bash
cd .worktrees/freeshow-admin && bun add @casl/ability
```

Expected: package installs, `bun.lock` updated.

- [ ] **Step 2: Verify import works**

```bash
cd .worktrees/freeshow-admin && bun run --eval "import('@casl/ability').then(m => console.log(Object.keys(m)))"
```

Expected: list of exports printed, no error.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat: add @casl/ability"
```

---

### Task 2: Create src/lib/ability.ts + unit test

**Files:**
- Create: `src/lib/ability.ts`
- Create: `src/lib/ability.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ability.ts` with just the exports (so the test file can import):

```ts
// src/lib/ability.ts
import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability"

type Actions = "manage" | "create" | "read" | "update" | "delete"
type Subjects = "all" | "Song" | "Show" | "Settings" | "History" | "Share"

export type AppAbility = MongoAbility<[Actions, Subjects]>

export function defineAbilityFor(user: { id: string } | null): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
    if (user) can("manage", "all")
    return build()
}
```

- [ ] **Step 2: Write tests**

Create `src/lib/ability.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { defineAbilityFor } from "./ability"

describe("defineAbilityFor", () => {
    it("grants all permissions when user is present", () => {
        const ability = defineAbilityFor({ id: "user-1" })
        expect(ability.can("manage", "Song")).toBe(true)
        expect(ability.can("create", "Show")).toBe(true)
        expect(ability.can("delete", "Settings")).toBe(true)
    })

    it("denies all permissions when user is null", () => {
        const ability = defineAbilityFor(null)
        expect(ability.can("read", "Song")).toBe(false)
        expect(ability.can("manage", "all")).toBe(false)
    })
})
```

- [ ] **Step 3: Run tests**

```bash
cd .worktrees/freeshow-admin && bun test src/lib/ability.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ability.ts src/lib/ability.test.ts
git commit -m "feat: add CASL ability definition"
```

---

### Task 3: Create src/server/auth.ts

**Files:**
- Create: `src/server/auth.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/auth.ts
import { createServerFn } from "@tanstack/react-start"
import { getWebRequest } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { defineAbilityFor } from "@/lib/ability"

export async function withAuth() {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error("Unauthorized")
    const ability = defineAbilityFor(session.user)
    return { session, ability }
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
    const request = getWebRequest()
    return auth.api.getSession({ headers: request.headers })
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd .worktrees/freeshow-admin && bun run tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors related to `src/server/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/auth.ts
git commit -m "feat: add withAuth helper and getSessionFn server function"
```

---

### Task 4: Create src/server/songs.ts

**Files:**
- Create: `src/server/songs.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/songs.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, contentHistory } from "@/database/schema"
import { eq, asc, desc } from "drizzle-orm"
import { withAuth } from "./auth"

export const getSongs = createServerFn({ method: "GET" }).handler(async () => {
    await withAuth()
    return db
        .select({
            id: songs.id,
            title: songs.title,
            author: songs.author,
            ccliNumber: songs.ccliNumber,
            createdAt: songs.createdAt,
            updatedAt: songs.updatedAt,
        })
        .from(songs)
        .orderBy(desc(songs.updatedAt))
})

export const getSong = createServerFn({ method: "GET" })
    .validator((input: { id: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const [song] = await db.select().from(songs).where(eq(songs.id, data.id))
        if (!song) throw new Error("Not found")
        const sections = await db
            .select()
            .from(songSections)
            .where(eq(songSections.songId, data.id))
            .orderBy(asc(songSections.sortOrder))
        return { ...song, sections }
    })

export const createSong = createServerFn({ method: "POST" })
    .validator(
        (input: {
            title: string
            author?: string | null
            copyright?: string | null
            ccliNumber?: string | null
            sections?: Array<{ type: string; label: string; content: string; sortOrder: number }>
        }) => input,
    )
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        if (!data.title?.trim()) throw new Error("title is required")
        const [song] = await db
            .insert(songs)
            .values({
                title: data.title,
                author: data.author ?? null,
                copyright: data.copyright ?? null,
                ccliNumber: data.ccliNumber ?? null,
            })
            .returning()
        if (data.sections?.length) {
            await db
                .insert(songSections)
                .values(data.sections.map((s) => ({ ...s, songId: song.id })))
        }
        await db.insert(contentHistory).values({
            contentType: "song",
            contentId: song.id,
            snapshot: structuredClone({ ...song, sections: data.sections ?? [] }),
            changedBy: session.user.id,
        })
        return song
    })

export const updateSong = createServerFn({ method: "POST" })
    .validator(
        (input: {
            id: string
            title?: string
            author?: string | null
            copyright?: string | null
            ccliNumber?: string | null
            sections?: Array<{ type: string; label: string; content: string; sortOrder: number }>
        }) => input,
    )
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const [existing] = await db.select().from(songs).where(eq(songs.id, data.id))
        if (!existing) throw new Error("Not found")
        if (data.title !== undefined && !data.title?.trim()) throw new Error("title cannot be empty")

        const updateData: Partial<typeof songs.$inferInsert> = { updatedAt: new Date() }
        if (data.title !== undefined) updateData.title = data.title
        if (data.author !== undefined) updateData.author = data.author ?? null
        if (data.copyright !== undefined) updateData.copyright = data.copyright ?? null
        if (data.ccliNumber !== undefined) updateData.ccliNumber = data.ccliNumber ?? null

        const [updated] = await db
            .update(songs)
            .set(updateData)
            .where(eq(songs.id, data.id))
            .returning()

        let sections: Array<{ type: string; label: string; content: string; sortOrder: number; id: string; songId: string }> = []
        if (data.sections !== undefined) {
            await db.delete(songSections).where(eq(songSections.songId, data.id))
            if (data.sections.length) {
                sections = await db
                    .insert(songSections)
                    .values(data.sections.map((s) => ({ ...s, songId: data.id })))
                    .returning()
            }
        } else {
            sections = await db
                .select()
                .from(songSections)
                .where(eq(songSections.songId, data.id))
                .orderBy(asc(songSections.sortOrder))
        }

        await db.insert(contentHistory).values({
            contentType: "song",
            contentId: data.id,
            snapshot: structuredClone({ ...updated, sections }),
            changedBy: session.user.id,
        })
        return { ...updated, sections }
    })

export const deleteSong = createServerFn({ method: "POST" })
    .validator((input: { id: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const deleted = await db.delete(songs).where(eq(songs.id, data.id)).returning({ id: songs.id })
        if (!deleted.length) throw new Error("Not found")
        return { ok: true }
    })
```

- [ ] **Step 2: Check TypeScript**

```bash
cd .worktrees/freeshow-admin && bun run tsc --noEmit 2>&1 | grep "server/songs"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/server/songs.ts
git commit -m "feat: add song server functions"
```

---

### Task 5: Create src/server/shows.ts

**Files:**
- Create: `src/server/shows.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/shows.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { shows, contentHistory } from "@/database/schema"
import { eq, desc } from "drizzle-orm"
import { withAuth } from "./auth"

export const getShows = createServerFn({ method: "GET" })
    .validator((input: { type?: "show" | "project" }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const query = db
            .select({
                id: shows.id,
                name: shows.name,
                type: shows.type,
                createdAt: shows.createdAt,
                updatedAt: shows.updatedAt,
            })
            .from(shows)
            .orderBy(desc(shows.updatedAt))
        if (data.type) {
            return query.where(eq(shows.type, data.type))
        }
        return query
    })

export const getShow = createServerFn({ method: "GET" })
    .validator((input: { id: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const [show] = await db.select().from(shows).where(eq(shows.id, data.id))
        if (!show) throw new Error("Not found")
        return show
    })

export const createShow = createServerFn({ method: "POST" })
    .validator((input: { name: string; type: "show" | "project"; rawJson: unknown }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        if (!data.name?.trim()) throw new Error("name is required")
        const [show] = await db
            .insert(shows)
            .values({
                name: data.name,
                type: data.type,
                rawJson: data.rawJson as Record<string, unknown>,
            })
            .returning()
        await db.insert(contentHistory).values({
            contentType: "show",
            contentId: show.id,
            snapshot: structuredClone(show),
            changedBy: session.user.id,
        })
        return show
    })

export const updateShow = createServerFn({ method: "POST" })
    .validator((input: { id: string; name?: string; rawJson?: unknown }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const [existing] = await db.select().from(shows).where(eq(shows.id, data.id))
        if (!existing) throw new Error("Not found")

        const updateData: Partial<typeof shows.$inferInsert> = { updatedAt: new Date() }
        if (data.name !== undefined) updateData.name = data.name
        if (data.rawJson !== undefined) updateData.rawJson = data.rawJson as Record<string, unknown>

        const [updated] = await db
            .update(shows)
            .set(updateData)
            .where(eq(shows.id, data.id))
            .returning()

        await db.insert(contentHistory).values({
            contentType: "show",
            contentId: data.id,
            snapshot: structuredClone(updated),
            changedBy: session.user.id,
        })
        return updated
    })

export const deleteShow = createServerFn({ method: "POST" })
    .validator((input: { id: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const deleted = await db.delete(shows).where(eq(shows.id, data.id)).returning({ id: shows.id })
        if (!deleted.length) throw new Error("Not found")
        return { ok: true }
    })
```

- [ ] **Step 2: Commit**

```bash
git add src/server/shows.ts
git commit -m "feat: add show server functions"
```

---

### Task 6: Create src/server/settings.ts

**Files:**
- Create: `src/server/settings.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/settings.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { settings } from "@/database/schema"
import { withAuth } from "./auth"

const VALID_KEYS = new Set(["max_line_chars", "warn_line_chars", "auto_line_break", "line_break_strategy"])

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
    await withAuth()
    const rows = await db.select().from(settings)
    return Object.fromEntries(rows.map((s) => [s.key, s.value]))
})

export const updateSettings = createServerFn({ method: "POST" })
    .validator((input: Record<string, unknown>) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const invalidKeys = Object.keys(data).filter((k) => !VALID_KEYS.has(k))
        if (invalidKeys.length > 0) throw new Error(`Invalid keys: ${invalidKeys.join(", ")}`)
        for (const [key, value] of Object.entries(data)) {
            await db
                .insert(settings)
                .values({ key, value, updatedBy: session.user.id })
                .onConflictDoUpdate({
                    target: settings.key,
                    set: { value, updatedAt: new Date(), updatedBy: session.user.id },
                })
        }
        return { ok: true }
    })
```

- [ ] **Step 2: Commit**

```bash
git add src/server/settings.ts
git commit -m "feat: add settings server functions"
```

---

### Task 7: Create src/server/history.ts

**Files:**
- Create: `src/server/history.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/history.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, shows, songSections, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { eq, and, desc } from "drizzle-orm"
import { withAuth } from "./auth"

export const getHistory = createServerFn({ method: "GET" })
    .validator((input: { limit?: number }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const limit = data.limit ?? 200

        const [songHistory, showHistory] = await Promise.all([
            db
                .select({
                    id: contentHistory.id,
                    contentType: contentHistory.contentType,
                    contentId: contentHistory.contentId,
                    contentName: songs.title,
                    changedByName: users.name,
                    changedAt: contentHistory.changedAt,
                })
                .from(contentHistory)
                .innerJoin(songs, eq(contentHistory.contentId, songs.id))
                .innerJoin(users, eq(contentHistory.changedBy, users.id))
                .where(eq(contentHistory.contentType, "song"))
                .orderBy(desc(contentHistory.changedAt))
                .limit(limit),
            db
                .select({
                    id: contentHistory.id,
                    contentType: contentHistory.contentType,
                    contentId: contentHistory.contentId,
                    contentName: shows.name,
                    changedByName: users.name,
                    changedAt: contentHistory.changedAt,
                })
                .from(contentHistory)
                .innerJoin(shows, eq(contentHistory.contentId, shows.id))
                .innerJoin(users, eq(contentHistory.changedBy, users.id))
                .where(eq(contentHistory.contentType, "show"))
                .orderBy(desc(contentHistory.changedAt))
                .limit(limit),
        ])

        return [...songHistory, ...showHistory]
            .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
            .slice(0, limit)
    })

export const getDashboardHistory = createServerFn({ method: "GET" }).handler(async () => {
    await withAuth()
    const [songHistory, showHistory] = await Promise.all([
        db
            .select({
                id: contentHistory.id,
                contentType: contentHistory.contentType,
                contentId: contentHistory.contentId,
                contentName: songs.title,
                changedByName: users.name,
                changedAt: contentHistory.changedAt,
            })
            .from(contentHistory)
            .innerJoin(songs, eq(contentHistory.contentId, songs.id))
            .innerJoin(users, eq(contentHistory.changedBy, users.id))
            .where(eq(contentHistory.contentType, "song"))
            .orderBy(desc(contentHistory.changedAt))
            .limit(10),
        db
            .select({
                id: contentHistory.id,
                contentType: contentHistory.contentType,
                contentId: contentHistory.contentId,
                contentName: shows.name,
                changedByName: users.name,
                changedAt: contentHistory.changedAt,
            })
            .from(contentHistory)
            .innerJoin(shows, eq(contentHistory.contentId, shows.id))
            .innerJoin(users, eq(contentHistory.changedBy, users.id))
            .where(eq(contentHistory.contentType, "show"))
            .orderBy(desc(contentHistory.changedAt))
            .limit(10),
    ])
    return [...songHistory, ...showHistory]
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        .slice(0, 10)
})

export const getSongHistory = createServerFn({ method: "GET" })
    .validator((input: { songId: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        return db
            .select({
                id: contentHistory.id,
                changedAt: contentHistory.changedAt,
                changedByName: users.name,
            })
            .from(contentHistory)
            .innerJoin(users, eq(contentHistory.changedBy, users.id))
            .where(and(eq(contentHistory.contentType, "song"), eq(contentHistory.contentId, data.songId)))
            .orderBy(desc(contentHistory.changedAt))
    })

export const restoreSongHistory = createServerFn({ method: "POST" })
    .validator((input: { songId: string; historyId: string }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const [entry] = await db.select().from(contentHistory).where(eq(contentHistory.id, data.historyId))
        if (!entry || entry.contentType !== "song" || entry.contentId !== data.songId) throw new Error("Not found")
        const snap = entry.snapshot as {
            title: string
            author?: string
            copyright?: string
            ccliNumber?: string
            sections?: Array<{ type: string; label: string; content: string; sortOrder: number }>
        }
        await db
            .update(songs)
            .set({
                title: snap.title,
                author: snap.author ?? null,
                copyright: snap.copyright ?? null,
                ccliNumber: snap.ccliNumber ?? null,
                updatedAt: new Date(),
            })
            .where(eq(songs.id, data.songId))
        if (snap.sections) {
            await db.delete(songSections).where(eq(songSections.songId, data.songId))
            if (snap.sections.length) {
                await db.insert(songSections).values(snap.sections.map((s) => ({ ...s, songId: data.songId })))
            }
        }
        await db.insert(contentHistory).values({
            contentType: "song",
            contentId: data.songId,
            snapshot: entry.snapshot,
            changedBy: session.user.id,
        })
        return { ok: true }
    })

export const getShowHistory = createServerFn({ method: "GET" })
    .validator((input: { showId: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        return db
            .select({
                id: contentHistory.id,
                changedAt: contentHistory.changedAt,
                changedByName: users.name,
            })
            .from(contentHistory)
            .innerJoin(users, eq(contentHistory.changedBy, users.id))
            .where(and(eq(contentHistory.contentType, "show"), eq(contentHistory.contentId, data.showId)))
            .orderBy(desc(contentHistory.changedAt))
    })

export const restoreShowHistory = createServerFn({ method: "POST" })
    .validator((input: { showId: string; historyId: string }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const [entry] = await db.select().from(contentHistory).where(eq(contentHistory.id, data.historyId))
        if (!entry || entry.contentType !== "show" || entry.contentId !== data.showId) throw new Error("Not found")
        const snap = entry.snapshot as { name?: string; rawJson?: unknown }
        const updateData: Partial<typeof shows.$inferInsert> = { updatedAt: new Date() }
        if (snap.name !== undefined) updateData.name = snap.name
        if (snap.rawJson !== undefined) updateData.rawJson = snap.rawJson as Record<string, unknown>
        await db.update(shows).set(updateData).where(eq(shows.id, data.showId))
        await db.insert(contentHistory).values({
            contentType: "show",
            contentId: data.showId,
            snapshot: entry.snapshot,
            changedBy: session.user.id,
        })
        return { ok: true }
    })
```

- [ ] **Step 2: Commit**

```bash
git add src/server/history.ts
git commit -m "feat: add history server functions"
```

---

### Task 8: Create src/server/shares.ts

**Files:**
- Create: `src/server/shares.ts`

- [ ] **Step 1: Create the file**

```ts
// src/server/shares.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, songShares } from "@/database/schema"
import { eq, and, asc } from "drizzle-orm"
import { withAuth } from "./auth"

export const createShare = createServerFn({ method: "POST" })
    .validator((input: { songId: string; expiresAt?: string }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const token = crypto.randomUUID()
        let expiresAt: Date | null = null
        if (data.expiresAt) {
            expiresAt = new Date(data.expiresAt)
            if (isNaN(expiresAt.getTime())) throw new Error("Invalid expiresAt date")
            if (expiresAt <= new Date()) throw new Error("expiresAt must be in the future")
        }
        const [share] = await db
            .insert(songShares)
            .values({ songId: data.songId, token, expiresAt, createdBy: session.user.id })
            .returning()
        return { token: share.token, shareUrl: `/s/${share.token}` }
    })

export const deleteShare = createServerFn({ method: "POST" })
    .validator((input: { songId: string; token: string }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const deleted = await db
            .delete(songShares)
            .where(and(eq(songShares.token, data.token), eq(songShares.songId, data.songId)))
            .returning({ id: songShares.id })
        if (!deleted.length) throw new Error("Share not found")
        return { ok: true }
    })

// No auth — public access by design
export const getSongByShareToken = createServerFn({ method: "GET" })
    .validator((input: { token: string }) => input)
    .handler(async ({ data }) => {
        const [share] = await db
            .select()
            .from(songShares)
            .where(eq(songShares.token, data.token))
            .limit(1)
        if (!share) return { song: null, error: "notfound" as const }
        if (share.expiresAt && share.expiresAt < new Date()) return { song: null, error: "expired" as const }
        const [song] = await db.select().from(songs).where(eq(songs.id, share.songId))
        if (!song) return { song: null, error: "notfound" as const }
        const sections = await db
            .select()
            .from(songSections)
            .where(eq(songSections.songId, share.songId))
            .orderBy(asc(songSections.sortOrder))
        return { song: { ...song, sections }, error: null }
    })
```

- [ ] **Step 2: Commit**

```bash
git add src/server/shares.ts
git commit -m "feat: add share server functions"
```

---

### Task 9: Create src/server/export.ts and src/server/import.ts

**Files:**
- Create: `src/server/export.ts`
- Create: `src/server/import.ts`

Note: Export/import use binary data (zip) and file uploads. Export server function returns raw data; client builds the zip. Import server function receives file contents as JSON array.

- [ ] **Step 1: Install jszip (needed client-side)**

```bash
cd .worktrees/freeshow-admin && bun add jszip && bun add -d @types/jszip
```

- [ ] **Step 2: Create src/server/export.ts**

```ts
// src/server/export.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, shows } from "@/database/schema"
import { inArray, asc } from "drizzle-orm"
import { withAuth } from "./auth"
import { serializeSong } from "@/lib/freeshow"

export const getExportData = createServerFn({ method: "POST" })
    .validator((input: { items: Array<{ type: string; id: string }> }) => input)
    .handler(async ({ data }) => {
        await withAuth()
        const items = data.items.slice(0, 100)
        const songIds = items.filter((i) => i.type === "song").map((i) => i.id)
        const showIds = items.filter((i) => i.type === "show" || i.type === "project").map((i) => i.id)

        const [allSongs, allSections, allShows] = await Promise.all([
            songIds.length ? db.select().from(songs).where(inArray(songs.id, songIds)) : Promise.resolve([]),
            songIds.length
                ? db.select().from(songSections).where(inArray(songSections.songId, songIds)).orderBy(asc(songSections.sortOrder))
                : Promise.resolve([]),
            showIds.length ? db.select().from(shows).where(inArray(shows.id, showIds)) : Promise.resolve([]),
        ])

        const sectionsBySongId = new Map<string, typeof allSections>()
        for (const sec of allSections) {
            if (!sectionsBySongId.has(sec.songId)) sectionsBySongId.set(sec.songId, [])
            sectionsBySongId.get(sec.songId)!.push(sec)
        }

        const exportFiles: Array<{ name: string; content: string }> = []
        for (const item of items) {
            if (item.type === "song") {
                const song = allSongs.find((s) => s.id === item.id)
                if (!song) continue
                const sections = sectionsBySongId.get(item.id) ?? []
                exportFiles.push({
                    name: `${song.title}.show`,
                    content: JSON.stringify(serializeSong({ ...song, sections }), null, 2),
                })
            } else {
                const show = allShows.find((s) => s.id === item.id)
                if (!show) continue
                exportFiles.push({ name: `${show.name}.show`, content: JSON.stringify(show.rawJson, null, 2) })
            }
        }
        return exportFiles
    })
```

- [ ] **Step 3: Create src/server/import.ts**

```ts
// src/server/import.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, shows, contentHistory } from "@/database/schema"
import { eq } from "drizzle-orm"
import { withAuth } from "./auth"
import { parseFreeshowFile, detectContentType, parseSong } from "@/lib/freeshow"

type ImportFileInput = { filename: string; content: unknown }
type ImportResult = { name: string; type: string; status: "imported" | "duplicate" | "error"; id?: string; reason?: string }

export const importFiles = createServerFn({ method: "POST" })
    .validator((input: { files: ImportFileInput[] }) => input)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const results: ImportResult[] = []
        const files = data.files.slice(0, 50)

        for (const file of files) {
            let show: ReturnType<typeof parseFreeshowFile>
            try {
                show = parseFreeshowFile(file.content)
            } catch {
                results.push({ name: file.filename, type: "unknown", status: "error", reason: "Invalid FreeShow file" })
                continue
            }

            const contentType = detectContentType(show)

            if (contentType === "song") {
                const songData = parseSong(show)
                const existing = await db.select({ id: songs.id }).from(songs).where(eq(songs.title, songData.title)).limit(1)
                if (existing.length) {
                    results.push({ name: songData.title, type: "song", status: "duplicate", id: existing[0].id })
                    continue
                }
                const [song] = await db
                    .insert(songs)
                    .values({
                        title: songData.title,
                        author: songData.author,
                        copyright: songData.copyright,
                        ccliNumber: songData.ccliNumber,
                        rawImport: songData.rawImport as Record<string, unknown>,
                    })
                    .returning()
                if (songData.sections.length) {
                    await db.insert(songSections).values(songData.sections.map((s) => ({ ...s, songId: song.id })))
                }
                await db.insert(contentHistory).values({
                    contentType: "song",
                    contentId: song.id,
                    snapshot: structuredClone({ ...song, sections: songData.sections }),
                    changedBy: session.user.id,
                })
                results.push({ name: songData.title, type: "song", status: "imported", id: song.id })
            } else {
                const showName = show.name ?? file.filename
                const existing = await db.select({ id: shows.id }).from(shows).where(eq(shows.name, showName)).limit(1)
                if (existing.length) {
                    results.push({ name: showName, type: "show", status: "duplicate", id: existing[0].id })
                    continue
                }
                const showType = (show as { category?: string }).category === "project" ? "project" : "show"
                const [savedShow] = await db
                    .insert(shows)
                    .values({ name: showName, type: showType, rawJson: show as unknown as Record<string, unknown> })
                    .returning()
                await db.insert(contentHistory).values({
                    contentType: "show",
                    contentId: savedShow.id,
                    snapshot: structuredClone(savedShow),
                    changedBy: session.user.id,
                })
                results.push({ name: showName, type: showType, status: "imported", id: savedShow.id })
            }
        }
        return { results }
    })
```

- [ ] **Step 4: Commit**

```bash
git add src/server/export.ts src/server/import.ts
git commit -m "feat: add export and import server functions"
```

---

### Task 10: Create _authenticated layout route and restructure __root.tsx

**Files:**
- Create: `src/routes/_authenticated.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Create the _authenticated layout**

```tsx
// src/routes/_authenticated.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { NavSidebar } from "@/components/nav-sidebar"
import { getSessionFn } from "@/server/auth"

export const Route = createFileRoute("/_authenticated")({
    beforeLoad: async () => {
        const session = await getSessionFn()
        if (!session) throw redirect({ to: "/" })
        return { session }
    },
    component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
    return (
        <>
            <NavSidebar />
            <main className="md:pl-60 min-h-screen pb-16 md:pb-0">
                <Outlet />
            </main>
        </>
    )
}
```

- [ ] **Step 2: Strip NavSidebar and layout logic from __root.tsx**

Read the current `src/routes/__root.tsx` first. Then replace `RootDocument`:

```tsx
function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body className="min-h-screen bg-background">
                <Providers>
                    {children}
                </Providers>
                <TanStackDevtools
                    config={{ position: "bottom-right" }}
                    plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
                />
                <Scripts />
            </body>
        </html>
    )
}
```

Remove the `NavSidebar` import, `useRouterState` import, `isPublicShare`, and `isAuthRoute` variables. Keep the font links in `head()`.

- [ ] **Step 3: Run dev to verify routeTree regenerates**

```bash
cd .worktrees/freeshow-admin && bun dev &
sleep 5 && grep "_authenticated" src/routeTree.gen.ts | head -5
kill %1
```

Expected: `_authenticated` appears in `routeTree.gen.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_authenticated.tsx src/routes/__root.tsx
git commit -m "feat: add _authenticated layout route, strip NavSidebar from root"
```

---

### Task 11: Move dashboard route to _authenticated/dashboard

**Files:**
- Create: `src/routes/_authenticated/dashboard.tsx`
- The old `src/routes/index.tsx` will become the landing page (Task 15), so don't delete it yet — overwrite it.

- [ ] **Step 1: Create _authenticated/dashboard.tsx**

```bash
mkdir -p .worktrees/freeshow-admin/src/routes/_authenticated
```

Copy the current dashboard content from `src/routes/index.tsx` and update the `createFileRoute` path and loader:

```tsx
// src/routes/_authenticated/dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSongs } from "@/server/songs"
import { getShows } from "@/server/shows"
import { getDashboardHistory } from "@/server/history"

export const Route = createFileRoute("/_authenticated/dashboard")({
    loader: async () => {
        const [allSongs, allShows, history] = await Promise.all([
            getSongs(),
            getShows({ data: {} }),
            getDashboardHistory(),
        ])
        return { songs: allSongs, shows: allShows, history }
    },
    component: DashboardPage,
})

function DashboardPage() {
    const { songs, shows, history } = Route.useLoaderData()
    const projects = shows.filter((s) => s.type === "project")
    const onlyShows = shows.filter((s) => s.type === "show")
    const songMap = new Map(songs.map((s) => [s.id, s.title]))
    const showMap = new Map(shows.map((s) => [s.id, s.name]))

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        <Link to="/songs" className="hover:text-primary transition-colors">
                            {songs.length} {songs.length === 1 ? "song" : "songs"}
                        </Link>
                        <span className="mx-1.5 opacity-40">·</span>
                        <Link to="/shows" className="hover:text-primary transition-colors">
                            {onlyShows.length} {onlyShows.length === 1 ? "show" : "shows"}
                        </Link>
                        <span className="mx-1.5 opacity-40">·</span>
                        <Link to="/projects" className="hover:text-primary transition-colors">
                            {projects.length} {projects.length === 1 ? "project" : "projects"}
                        </Link>
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button asChild>
                        <Link to="/import">
                            <Upload className="h-4 w-4" />
                            Import
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to="/songs/new">
                            <Plus className="h-4 w-4" />
                            New song
                        </Link>
                    </Button>
                </div>
            </div>

            <div>
                <h2 className="text-base font-semibold mb-3">Recent changes</h2>
                {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Nothing yet. Import some FreeShow files to get started.
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {history.map((entry) => {
                            const contentName =
                                entry.contentType === "song"
                                    ? (songMap.get(entry.contentId) ?? "Unknown song")
                                    : (showMap.get(entry.contentId) ?? "Unknown show")
                            return (
                                <div key={entry.id} className="flex items-center justify-between py-3 text-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0 w-10">
                                            {entry.contentType}
                                        </span>
                                        <span className="font-medium truncate">{contentName}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-muted-foreground shrink-0 ml-4">
                                        <span className="hidden sm:block">{entry.changedByName}</span>
                                        <span className="text-xs tabular-nums">
                                            {new Date(entry.changedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/_authenticated/dashboard.tsx
git commit -m "feat: add dashboard route under _authenticated layout"
```

---

### Task 12: Move songs routes to _authenticated/songs/

**Files:**
- Create: `src/routes/_authenticated/songs/index.tsx`
- Create: `src/routes/_authenticated/songs/$id.tsx`
- Create: `src/routes/_authenticated/songs/new.tsx`

- [ ] **Step 1: Create _authenticated/songs/index.tsx**

```bash
mkdir -p .worktrees/freeshow-admin/src/routes/_authenticated/songs
```

```tsx
// src/routes/_authenticated/songs/index.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getSongs } from "@/server/songs"

type Song = { id: string; title: string; author: string | null; ccliNumber: string | null; updatedAt: Date }

export const Route = createFileRoute("/_authenticated/songs/")({
    loader: async () => {
        const songs = await getSongs()
        return { songs }
    },
    component: SongsPage,
})

function SongsPage() {
    const { songs } = Route.useLoaderData() as { songs: Song[] }
    const [search, setSearch] = useState("")
    const filtered = songs.filter((s) => {
        const q = search.toLowerCase()
        return s.title.toLowerCase().includes(q) || (s.author?.toLowerCase().includes(q) ?? false)
    })

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Song Library</h1>
                <Button asChild>
                    <Link to="/songs/new">+ New Song</Link>
                </Button>
            </div>
            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or author…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {songs.length === 0 ? "No songs yet. Create your first song!" : "No songs match your search."}
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((song) => (
                        <Link
                            key={song.id}
                            to="/songs/$id"
                            params={{ id: song.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate group-hover:text-primary transition-colors">{song.title}</p>
                                {song.author && <p className="text-sm text-muted-foreground truncate">{song.author}</p>}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(song.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Create _authenticated/songs/$id.tsx**

Read `src/routes/songs/$id.tsx` for the full component. Create `src/routes/_authenticated/songs/$id.tsx` with these changes:
- `createFileRoute("/_authenticated/songs/$id")`
- Replace loader `db` calls with: `return getSong({ data: { id: params.id } })`
- Also load settings: add `getSettings()` to loader
- Replace `handleSave` fetch with: `await updateSong({ data: { id: song.id, title: ..., author: ..., copyright: ..., ccliNumber: ..., sections: ... } })`

```tsx
// src/routes/_authenticated/songs/$id.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MetadataPanel } from "@/components/song-editor/metadata-panel"
import { SectionList } from "@/components/song-editor/section-list"
import { HistorySidebar } from "@/components/song-editor/history-sidebar"
import { SharePanel } from "@/components/song-editor/share-panel"
import type { SongSection, Settings } from "@/components/song-editor/section-item"
import { getSong, updateSong } from "@/server/songs"
import { getSettings } from "@/server/settings"
import { toast } from "sonner"

type SongData = {
    id: string; title: string; author: string | null
    copyright: string | null; ccliNumber: string | null; sections: SongSection[]
}

export const Route = createFileRoute("/_authenticated/songs/$id")({
    loader: async ({ params }) => {
        const [song, settings] = await Promise.all([
            getSong({ data: { id: params.id } }),
            getSettings(),
        ])
        return { song: song as SongData, settings: settings as Settings }
    },
    component: SongEditorPage,
})

function SongEditorPage() {
    const { song: initialSong, settings } = Route.useLoaderData()
    const [song, setSong] = useState<SongData>(initialSong)
    const [saving, setSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showShare, setShowShare] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            await updateSong({
                data: {
                    id: song.id,
                    title: song.title,
                    author: song.author,
                    copyright: song.copyright,
                    ccliNumber: song.ccliNumber,
                    sections: song.sections.map((s: SongSection, i: number) => ({ ...s, sortOrder: i })),
                },
            })
            toast.success("Saved")
        } catch {
            toast.error("Failed to save")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/songs">← Songs</Link>
                    </Button>
                    <h1 className="text-xl font-bold">{song.title || "Untitled"}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>History</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowShare(!showShare)}>Share</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MetadataPanel song={song} onChange={(patch) => setSong((s) => ({ ...s, ...patch }))} />
                    <SectionList
                        sections={song.sections}
                        onChange={(sections) => setSong((s) => ({ ...s, sections }))}
                        settings={settings}
                    />
                </div>
                <div className="space-y-4">
                    {showHistory && <HistorySidebar songId={song.id} onRestore={() => window.location.reload()} />}
                    {showShare && <SharePanel songId={song.id} />}
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Create _authenticated/songs/new.tsx**

```tsx
// src/routes/_authenticated/songs/new.tsx
import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MetadataPanel } from "@/components/song-editor/metadata-panel"
import { SectionList } from "@/components/song-editor/section-list"
import type { SongSection, Settings } from "@/components/song-editor/section-item"
import { createSong } from "@/server/songs"
import { getSettings } from "@/server/settings"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/songs/new")({
    loader: async () => {
        const settings = await getSettings()
        return { settings: settings as Settings }
    },
    component: NewSongPage,
})

function NewSongPage() {
    const { settings } = Route.useLoaderData()
    const navigate = useNavigate()
    const [song, setSong] = useState({
        title: "", author: "", copyright: "", ccliNumber: "", sections: [] as SongSection[],
    })
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        if (!song.title.trim()) { toast.error("Title is required"); return }
        setSaving(true)
        try {
            const created = await createSong({
                data: {
                    title: song.title,
                    author: song.author || null,
                    copyright: song.copyright || null,
                    ccliNumber: song.ccliNumber || null,
                    sections: song.sections.map((s, i) => ({ ...s, sortOrder: i })),
                },
            })
            await navigate({ to: "/songs/$id", params: { id: created.id } })
        } catch {
            toast.error("Failed to create song")
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild><Link to="/songs">← Songs</Link></Button>
                    <h1 className="text-xl font-bold">New Song</h1>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Creating…" : "Create"}
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MetadataPanel
                        song={{ id: "", ...song, sections: song.sections }}
                        onChange={(patch) => setSong((s) => ({ ...s, ...patch }))}
                    />
                    <SectionList
                        sections={song.sections}
                        onChange={(sections) => setSong((s) => ({ ...s, sections }))}
                        settings={settings}
                    />
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/_authenticated/songs/
git commit -m "feat: move songs routes to _authenticated, use server functions"
```

---

### Task 13: Move shows and projects routes to _authenticated/

**Files:**
- Create: `src/routes/_authenticated/shows/index.tsx`
- Create: `src/routes/_authenticated/shows/$id.tsx`
- Create: `src/routes/_authenticated/shows/new.tsx`
- Create: `src/routes/_authenticated/projects/index.tsx`
- Create: `src/routes/_authenticated/projects/$id.tsx`
- Create: `src/routes/_authenticated/projects/new.tsx`

- [ ] **Step 1: Create shows/index.tsx**

```bash
mkdir -p .worktrees/freeshow-admin/src/routes/_authenticated/shows
```

```tsx
// src/routes/_authenticated/shows/index.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getShows } from "@/server/shows"

type Show = { id: string; name: string; type: string; updatedAt: Date }

export const Route = createFileRoute("/_authenticated/shows/")({
    loader: async () => {
        const shows = await getShows({ data: { type: "show" } })
        return { shows }
    },
    component: ShowsPage,
})

function ShowsPage() {
    const { shows } = Route.useLoaderData() as { shows: Show[] }
    const [search, setSearch] = useState("")
    const filtered = shows.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Shows</h1>
                <Button asChild><Link to="/shows/new">+ New Show</Link></Button>
            </div>
            <div className="mb-4">
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {filtered.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground text-sm">
                    {shows.length === 0 ? "No shows yet." : "Nothing matches that search."}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((show) => (
                        <Link key={show.id} to="/shows/$id" params={{ id: show.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">{show.name}</p>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(show.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Create shows/$id.tsx**

```tsx
// src/routes/_authenticated/shows/$id.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/monaco-editor"
import { ShowHistorySidebar } from "@/components/show-history-sidebar"
import { getShow, updateShow } from "@/server/shows"
import { toast } from "sonner"

type ShowRecord = { id: string; name: string; type: string; rawJson: unknown; updatedAt: Date }

export const Route = createFileRoute("/_authenticated/shows/$id")({
    loader: async ({ params }) => {
        const show = await getShow({ data: { id: params.id } })
        return { show: show as ShowRecord }
    },
    component: ShowEditorPage,
})

function ShowEditorPage() {
    const { show: initialShow } = Route.useLoaderData()
    const [show] = useState<ShowRecord>(initialShow)
    const [rawJsonString, setRawJsonString] = useState(JSON.stringify(initialShow.rawJson, null, 2))
    const [saving, setSaving] = useState(false)
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)

    async function handleSave() {
        let parsedJson: unknown
        try { parsedJson = JSON.parse(rawJsonString); setJsonError(null) }
        catch { setJsonError("Invalid JSON — please fix before saving"); return }
        setSaving(true)
        try {
            await updateShow({ data: { id: show.id, name: show.name, rawJson: parsedJson } })
            toast.success("Saved")
        } catch { toast.error("Failed to save") }
        finally { setSaving(false) }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild><Link to="/shows">← Shows</Link></Button>
                    <h1 className="text-xl font-bold">{show.name}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>History</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {jsonError && <p className="text-destructive text-sm mb-2">{jsonError}</p>}
                    <MonacoEditor value={rawJsonString} onChange={setRawJsonString} height="60vh" />
                </div>
                <div>{showHistory && <ShowHistorySidebar showId={show.id} onRestore={() => window.location.reload()} />}</div>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Create shows/new.tsx**

```tsx
// src/routes/_authenticated/shows/new.tsx
import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { createShow } from "@/server/shows"
import { newShowTemplate } from "@/lib/freeshow"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/shows/new")({
    component: NewShowPage,
})

function NewShowPage() {
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [saving, setSaving] = useState(false)

    async function handleCreate() {
        if (!name.trim()) { toast.error("Name is required"); return }
        setSaving(true)
        try {
            const show = await createShow({ data: { name: name.trim(), type: "show", rawJson: newShowTemplate(name.trim()) } })
            await navigate({ to: "/shows/$id", params: { id: show.id } })
        } catch { toast.error("Failed to create show"); setSaving(false) }
    }

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" asChild><Link to="/shows">← Shows</Link></Button>
                <h1 className="text-xl font-bold">New Show</h1>
            </div>
            <div className="space-y-4">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Show name"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                    {saving ? "Creating…" : "Create Show"}
                </Button>
            </div>
        </div>
    )
}
```

- [ ] **Step 4: Create projects routes**

```bash
mkdir -p .worktrees/freeshow-admin/src/routes/_authenticated/projects
```

Create `src/routes/_authenticated/projects/index.tsx` — same as shows/index.tsx but filters `type: "project"`, uses `/projects` paths, and links to `/projects/new` and `/projects/$id`. Update `createFileRoute("/_authenticated/projects/")`.

Create `src/routes/_authenticated/projects/$id.tsx` — same as shows/$id.tsx but `createFileRoute("/_authenticated/projects/$id")` and back link to `/projects`.

Create `src/routes/_authenticated/projects/new.tsx` — same as shows/new.tsx but uses `newProjectTemplate`, `type: "project"`, navigates to `/projects/$id`, and `createFileRoute("/_authenticated/projects/new")`.

The full code for projects/index.tsx:

```tsx
// src/routes/_authenticated/projects/index.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getShows } from "@/server/shows"

type Project = { id: string; name: string; type: string; updatedAt: Date }

export const Route = createFileRoute("/_authenticated/projects/")({
    loader: async () => {
        const projects = await getShows({ data: { type: "project" } })
        return { projects }
    },
    component: ProjectsPage,
})

function ProjectsPage() {
    const { projects } = Route.useLoaderData() as { projects: Project[] }
    const [search, setSearch] = useState("")
    const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                <Button asChild><Link to="/projects/new">+ New project</Link></Button>
            </div>
            <div className="mb-4">
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {filtered.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground text-sm">
                    {projects.length === 0 ? "No projects yet." : "Nothing matches that search."}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((project) => (
                        <Link key={project.id} to="/projects/$id" params={{ id: project.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(project.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
```

For projects/$id.tsx — identical to shows/$id.tsx except:
- `createFileRoute("/_authenticated/projects/$id")`
- Back link: `<Link to="/projects">← Projects</Link>`

For projects/new.tsx — identical to shows/new.tsx except:
- `createFileRoute("/_authenticated/projects/new")`
- `type: "project"` in createShow call
- Use `newProjectTemplate` instead of `newShowTemplate`
- `navigate({ to: "/projects/$id", params: { id: show.id } })`
- Back link: `<Link to="/projects">← Projects</Link>`

- [ ] **Step 5: Commit**

```bash
git add src/routes/_authenticated/shows/ src/routes/_authenticated/projects/
git commit -m "feat: move shows and projects routes to _authenticated, use server functions"
```

---

### Task 14: Move remaining routes to _authenticated/

**Files:**
- Create: `src/routes/_authenticated/settings.tsx`
- Create: `src/routes/_authenticated/history.tsx`
- Create: `src/routes/_authenticated/export.tsx`
- Create: `src/routes/_authenticated/import.tsx`
- Create: `src/routes/_authenticated/account/$path.tsx`

- [ ] **Step 1: Create settings.tsx**

```tsx
// src/routes/_authenticated/settings.tsx
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getSettings, updateSettings } from "@/server/settings"
import { toast } from "sonner"

type Settings = {
    max_line_chars: number; warn_line_chars: number
    auto_line_break: boolean; line_break_strategy: "word" | "char"
}

export const Route = createFileRoute("/_authenticated/settings")({
    loader: async () => {
        const data = await getSettings()
        return { settings: data as Partial<Settings> }
    },
    component: SettingsPage,
})

function SettingsPage() {
    const { settings: initial } = Route.useLoaderData()
    const [values, setValues] = useState<Settings>({
        max_line_chars: (initial.max_line_chars as number) ?? 50,
        warn_line_chars: (initial.warn_line_chars as number) ?? 40,
        auto_line_break: (initial.auto_line_break as boolean) ?? false,
        line_break_strategy: (initial.line_break_strategy as "word" | "char") ?? "word",
    })
    const [saving, setSaving] = useState(false)
    const warnError = values.warn_line_chars >= values.max_line_chars ? "Warn limit must be less than max limit" : null

    async function handleSave() {
        if (warnError) return
        setSaving(true)
        try {
            await updateSettings({ data: values as unknown as Record<string, unknown> })
            toast.success("Settings saved")
        } catch { toast.error("Failed to save settings") }
        finally { setSaving(false) }
    }

    return (
        <div className="container mx-auto p-6 max-w-lg space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Max line characters</label>
                    <input type="number" value={values.max_line_chars}
                        onChange={(e) => setValues((v) => ({ ...v, max_line_chars: Number(e.target.value) }))}
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <label className="text-sm font-medium">Warn line characters</label>
                    {warnError && <p className="text-xs text-destructive mt-0.5">{warnError}</p>}
                    <input type="number" value={values.warn_line_chars}
                        onChange={(e) => setValues((v) => ({ ...v, warn_line_chars: Number(e.target.value) }))}
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex items-center gap-3">
                    <input type="checkbox" id="auto_line_break" checked={values.auto_line_break}
                        onChange={(e) => setValues((v) => ({ ...v, auto_line_break: e.target.checked }))} />
                    <label htmlFor="auto_line_break" className="text-sm font-medium">Auto line break</label>
                </div>
                <div>
                    <label className="text-sm font-medium">Line break strategy</label>
                    <select value={values.line_break_strategy}
                        onChange={(e) => setValues((v) => ({ ...v, line_break_strategy: e.target.value as "word" | "char" }))}
                        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="word">Word</option>
                        <option value="char">Character</option>
                    </select>
                </div>
            </div>
            <Button onClick={handleSave} disabled={saving || !!warnError}>
                {saving ? "Saving…" : "Save settings"}
            </Button>
        </div>
    )
}
```

- [ ] **Step 2: Create history.tsx**

Copy `src/routes/history.tsx` to `src/routes/_authenticated/history.tsx`. Change:
- `createFileRoute("/_authenticated/history")`
- Replace loader `db` calls with `await getHistory({ data: { limit: 200 } })`
- Replace `handleRestore` fetch calls with:

```tsx
// inside handleRestore, replace the fetch block:
async function handleRestore() {
    if (!selectedEntry) return
    setRestoring(true)
    try {
        if (selectedEntry.contentType === "song") {
            await restoreSongHistory({ data: { songId: selectedEntry.contentId, historyId: selectedEntry.id } })
        } else {
            await restoreShowHistory({ data: { showId: selectedEntry.contentId, historyId: selectedEntry.id } })
        }
        toast.success("Restored successfully")
        setSelectedEntry(null)
    } catch {
        toast.error("Restore failed")
    } finally {
        setRestoring(false)
    }
}
```

Add imports: `import { getHistory, restoreSongHistory, restoreShowHistory } from "@/server/history"`
Remove imports: `db`, `songs`, `shows`, `contentHistory`, `users`, `desc`, `eq`

- [ ] **Step 3: Create export.tsx**

Copy `src/routes/export.tsx` to `src/routes/_authenticated/export.tsx`. Change:
- `createFileRoute("/_authenticated/export")`
- Replace loader `db` calls with:
  ```tsx
  loader: async () => {
      const [allSongs, allShows] = await Promise.all([
          getSongs(),
          getShows({ data: {} }),
      ])
      return {
          songs: allSongs as Song[],
          shows: allShows.filter((s) => s.type === "show") as ShowItem[],
          projects: allShows.filter((s) => s.type === "project") as ShowItem[],
      }
  },
  ```
- Replace `handleExport` fetch with server function + client-side zip:

```tsx
async function handleExport() {
    if (!selected.size) return
    setExporting(true)
    try {
        const items = Array.from(selected).map((k) => {
            const [type, ...rest] = k.split(":")
            return { type, id: rest.join(":") }
        })
        const files = await getExportData({ data: { items } })
        if (!files.length) { toast.error("No valid items found"); return }
        if (files.length === 1) {
            const blob = new Blob([files[0].content], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = files[0].name; a.click()
            URL.revokeObjectURL(url)
        } else {
            const JSZip = (await import("jszip")).default
            const zip = new JSZip()
            for (const f of files) zip.file(f.name, f.content)
            const blob = await zip.generateAsync({ type: "blob" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url; a.download = "freeshow-export.zip"; a.click()
            URL.revokeObjectURL(url)
        }
    } catch { toast.error("Export failed") }
    finally { setExporting(false) }
}
```

Add imports: `import { getSongs } from "@/server/songs"`, `import { getShows } from "@/server/shows"`, `import { getExportData } from "@/server/export"`
Remove imports: `db`, `songsTable`, `showsTable`, `asc`

- [ ] **Step 4: Create import.tsx**

Copy `src/routes/import.tsx` to `src/routes/_authenticated/import.tsx`. Change:
- `createFileRoute("/_authenticated/import")`
- Replace `handleUpload` fetch with:

```tsx
async function handleUpload() {
    if (!files.length) return
    setUploading(true)
    try {
        const fileContents = await Promise.all(
            files.map(async (f) => {
                const text = await f.text()
                let content: unknown
                try { content = JSON.parse(text) }
                catch { content = null }
                return { filename: f.name, content }
            })
        )
        const { results } = await importFiles({ data: { files: fileContents } })
        setResults(results)
        setFiles([])
    } catch { toast.error("Import failed") }
    finally { setUploading(false) }
}
```

Add imports: `import { importFiles } from "@/server/import"`, `import { toast } from "sonner"`

- [ ] **Step 5: Create account/$path.tsx**

```bash
mkdir -p .worktrees/freeshow-admin/src/routes/_authenticated/account
```

```tsx
// src/routes/_authenticated/account/$path.tsx
import { AccountView } from "@daveyplate/better-auth-ui"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/account/$path")({
    component: RouteComponent,
})

function RouteComponent() {
    const { path } = Route.useParams()
    return (
        <main className="container mx-auto p-4 md:p-6">
            <AccountView
                classNames={{ sidebar: { base: "sticky top-20" } }}
                path={path}
            />
        </main>
    )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/_authenticated/settings.tsx src/routes/_authenticated/history.tsx \
    src/routes/_authenticated/export.tsx src/routes/_authenticated/import.tsx \
    src/routes/_authenticated/account/
git commit -m "feat: move remaining routes to _authenticated, use server functions"
```

---

### Task 15: Create landing page at / and update NavSidebar

**Files:**
- Modify: `src/routes/index.tsx` — landing/login page
- Modify: `src/components/nav-sidebar.tsx` — Dashboard link to /dashboard
- Modify: `src/routes/s/$token.tsx` — replace loader db calls with getShareByToken server fn

- [ ] **Step 1: Update s/$token.tsx to use server function**

Read `src/routes/s/$token.tsx`. Replace loader:

```tsx
loader: async ({ params }) => {
    return getSongByShareToken({ data: { token: params.token } })
},
```

Add import: `import { getSongByShareToken } from "@/server/shares"`
Remove imports: `db`, `songs`, `songSections`, `songShares`, `eq`, `asc`

- [ ] **Step 2: Update index.tsx to be the landing page**

Overwrite `src/routes/index.tsx`:

```tsx
// src/routes/index.tsx
import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthView } from "@daveyplate/better-auth-ui"
import { getSessionFn } from "@/server/auth"

export const Route = createFileRoute("/")({
    beforeLoad: async () => {
        const session = await getSessionFn()
        if (session) throw redirect({ to: "/dashboard" })
    },
    component: LandingPage,
})

function LandingPage() {
    return (
        <div className="min-h-screen flex">
            {/* Hero image — left panel, hidden on mobile */}
            <div
                className="hidden lg:flex flex-1 items-center justify-center bg-muted relative overflow-hidden"
                aria-hidden="true"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                <div className="relative z-10 text-center space-y-4 p-12">
                    <p className="font-display text-5xl font-bold tracking-tight text-primary">FreeShow</p>
                    <p className="text-muted-foreground text-lg">Song & show management for your worship team</p>
                </div>
            </div>

            {/* Login panel — right */}
            <div className="flex flex-1 flex-col items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-6">
                    <div className="text-center lg:hidden">
                        <p className="font-display text-2xl font-bold tracking-tight text-primary">FreeShow Admin</p>
                    </div>
                    <AuthView path="sign-in" />
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Update NavSidebar**

In `src/components/nav-sidebar.tsx`, change the Dashboard nav item:

```ts
// Change:
{ to: "/", label: "Dashboard", icon: LayoutDashboard },
// To:
{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
```

Also update the `isActive` function:

```ts
// Change:
function isActive(pathname: string, to: string) {
    if (to === "/") return pathname === "/"
    return pathname.startsWith(to)
}
// To:
function isActive(pathname: string, to: string) {
    return pathname === to || (to !== "/dashboard" && pathname.startsWith(to))
}
```

Remove the `isPublicShare` check (NavSidebar no longer renders on public/landing pages since it's inside the `_authenticated` layout):

```tsx
// Remove this block:
if (pathname.startsWith("/s/")) return null
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx src/components/nav-sidebar.tsx src/routes/s/\$token.tsx
git commit -m "feat: landing page at /, dashboard at /dashboard, fix nav sidebar"
```

---

### Task 16: Update components to use server functions

**Files:**
- Modify: `src/components/song-editor/history-sidebar.tsx`
- Modify: `src/components/show-history-sidebar.tsx`
- Modify: `src/components/song-editor/share-panel.tsx`

- [ ] **Step 1: Update HistorySidebar**

In `src/components/song-editor/history-sidebar.tsx`, replace `fetch` calls with server functions.

Replace the `useEffect` fetch:
```tsx
useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSongHistory({ data: { songId } })
        .then((data) => {
            if (!cancelled) { setEntries(data as HistoryEntry[]); setLoading(false) }
        })
        .catch(() => {
            if (!cancelled) { setError("Failed to load history"); setLoading(false) }
        })
    return () => { cancelled = true }
}, [songId])
```

Replace `handleRestore`:
```tsx
async function handleRestore(historyId: string) {
    setRestoringId(historyId)
    try {
        await restoreSongHistory({ data: { songId, historyId } })
        onRestore()
    } catch {
        setError("Restore failed")
    } finally {
        setRestoringId(null)
    }
}
```

Add imports at top:
```tsx
import { getSongHistory, restoreSongHistory } from "@/server/history"
```

- [ ] **Step 2: Update ShowHistorySidebar**

Same pattern. In `src/components/show-history-sidebar.tsx`:

Replace useEffect fetch:
```tsx
useEffect(() => {
    let cancelled = false
    setLoading(true)
    getShowHistory({ data: { showId } })
        .then((data) => {
            if (!cancelled) { setEntries(data as HistoryEntry[]); setLoading(false) }
        })
        .catch(() => {
            if (!cancelled) { setError("Failed to load history"); setLoading(false) }
        })
    return () => { cancelled = true }
}, [showId])
```

Replace `handleRestore`:
```tsx
async function handleRestore(historyId: string) {
    setRestoringId(historyId)
    try {
        await restoreShowHistory({ data: { showId, historyId } })
        onRestore()
    } catch {
        setError("Restore failed — network error")
    } finally {
        setRestoringId(null)
    }
}
```

Add imports:
```tsx
import { getShowHistory, restoreShowHistory } from "@/server/history"
```

- [ ] **Step 3: Update SharePanel**

In `src/components/song-editor/share-panel.tsx`, replace `createShare` fetch:

```tsx
import { createShare } from "@/server/shares"

async function createShareLink() {
    setCreating(true)
    setError(null)
    try {
        const { shareUrl } = await createShare({ data: { songId } })
        setShareUrl(window.location.origin + shareUrl)
    } catch {
        setError("Failed to create share link")
    } finally {
        setCreating(false)
    }
}
```

Update button onClick to call `createShareLink` instead of `createShare`.

- [ ] **Step 4: Commit**

```bash
git add src/components/song-editor/history-sidebar.tsx \
    src/components/show-history-sidebar.tsx \
    src/components/song-editor/share-panel.tsx
git commit -m "feat: update components to use server functions"
```

---

### Task 17: Delete old route files and REST API routes

**Files:** All old route files and API routes listed in the spec.

- [ ] **Step 1: Delete old page route files (now moved)**

```bash
cd .worktrees/freeshow-admin && rm -f \
    src/routes/songs/index.tsx \
    src/routes/songs/\$id.tsx \
    src/routes/songs/new.tsx \
    src/routes/shows/index.tsx \
    src/routes/shows/\$id.tsx \
    src/routes/shows/new.tsx \
    src/routes/projects/index.tsx \
    src/routes/projects/\$id.tsx \
    src/routes/projects/new.tsx \
    src/routes/settings.tsx \
    src/routes/history.tsx \
    src/routes/export.tsx \
    src/routes/import.tsx \
    src/routes/account/\$path.tsx
```

Remove now-empty directories:
```bash
rmdir src/routes/songs src/routes/shows src/routes/projects src/routes/account 2>/dev/null || true
```

- [ ] **Step 2: Delete REST API routes**

```bash
cd .worktrees/freeshow-admin && rm -f \
    src/routes/api/songs/index.ts \
    src/routes/api/songs/\$id.ts \
    src/routes/api/songs/\$id/history.ts \
    src/routes/api/songs/\$id/share.ts \
    src/routes/api/shows/index.ts \
    src/routes/api/shows/\$id.ts \
    src/routes/api/shows/\$id/history.ts \
    src/routes/api/settings.ts \
    src/routes/api/export.ts \
    src/routes/api/import.ts \
    src/routes/api/history.ts \
    src/routes/api/public/songs/\$token.ts
```

Remove empty API directories:
```bash
rmdir src/routes/api/songs/\$id src/routes/api/songs \
    src/routes/api/shows/\$id src/routes/api/shows \
    src/routes/api/public/songs src/routes/api/public \
    src/routes/api/history 2>/dev/null || true
```

- [ ] **Step 3: Delete api-helpers.ts**

```bash
rm src/routes/api/settings.ts 2>/dev/null; rm src/lib/api-helpers.ts
```

- [ ] **Step 4: Commit deletions**

```bash
git add -A
git commit -m "chore: delete old REST API routes, api-helpers, and moved page routes"
```

---

### Task 18: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd .worktrees/freeshow-admin && bun run tsc --noEmit 2>&1
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 2: Run tests**

```bash
cd .worktrees/freeshow-admin && bun test
```

Expected: all tests pass.

- [ ] **Step 3: Start dev server and verify**

```bash
cd .worktrees/freeshow-admin && bun dev
```

Check in browser:
- `/` shows landing page with login box; authenticated users redirect to `/dashboard`
- `/dashboard` shows the dashboard (requires auth, redirects to `/` if not)
- `/songs`, `/shows`, `/projects` all load correctly
- `/history` restore function works
- Song editor save works
- History sidebar loads and restore works
- Share panel creates share links
- Import/export work

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete server function migration, CASL middleware, landing page"
```
