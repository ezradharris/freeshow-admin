// src/server/shares.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, songShares } from "@/database/schema"
import { eq, and, asc } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth"
import { createShareInputSchema } from "./schemas"

export const createShare = createServerFn({ method: "POST" })
    .inputValidator(createShareInputSchema)
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
    .inputValidator(z.object({ songId: z.string(), token: z.string() }))
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
    .inputValidator(z.object({ token: z.string() }))
    .handler(async ({ data }) => {
        const [share] = await db
            .select()
            .from(songShares)
            .where(eq(songShares.token, data.token))
            .limit(1)
        if (!share) return { song: null, error: "notfound" as const }
        if (share.expiresAt && share.expiresAt < new Date()) return { song: null, error: "expired" as const }
        const [song] = await db
            .select({
                id: songs.id,
                title: songs.title,
                author: songs.author,
                copyright: songs.copyright,
                ccliNumber: songs.ccliNumber,
                createdAt: songs.createdAt,
                updatedAt: songs.updatedAt,
            })
            .from(songs)
            .where(eq(songs.id, share.songId))
        if (!song) return { song: null, error: "notfound" as const }
        const sections = await db
            .select()
            .from(songSections)
            .where(eq(songSections.songId, share.songId))
            .orderBy(asc(songSections.sortOrder))
        return { song: { ...song, sections }, error: null }
    })
