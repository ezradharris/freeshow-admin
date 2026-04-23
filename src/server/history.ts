// src/server/history.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, shows, songSections, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth.server"

export const getHistory = createServerFn({ method: "GET" })
    .inputValidator(z.object({ limit: z.number().int().optional() }))
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
    .inputValidator(z.object({ songId: z.string() }))
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
    .inputValidator(z.object({ songId: z.string(), historyId: z.string() }))
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
    .inputValidator(z.object({ showId: z.string() }))
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
    .inputValidator(z.object({ showId: z.string(), historyId: z.string() }))
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
