import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, contentHistory } from "@/database/schema"
import { eq, asc, desc } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth.server"
import { createSongInputSchema, updateSongInputSchema } from "./schemas"

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
    .inputValidator(z.object({ id: z.string() }))
    .handler(async ({ data }) => {
        await withAuth()
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
            .where(eq(songs.id, data.id))
        if (!song) throw new Error("Not found")
        const sections = await db
            .select()
            .from(songSections)
            .where(eq(songSections.songId, data.id))
            .orderBy(asc(songSections.sortOrder))
        return { ...song, sections }
    })

export const createSong = createServerFn({ method: "POST" })
    .inputValidator(createSongInputSchema)
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
            .returning({
                id: songs.id,
                title: songs.title,
                author: songs.author,
                copyright: songs.copyright,
                ccliNumber: songs.ccliNumber,
                createdAt: songs.createdAt,
                updatedAt: songs.updatedAt,
            })
        if (data.sections?.length) {
            await db
                .insert(songSections)
                .values(data.sections.map((s) => ({ ...s, songId: song.id })))
        }
        await db.insert(contentHistory).values({
            contentType: "song",
            contentId: song.id,
            snapshot: { ...song, sections: data.sections ?? [] },
            changedBy: session.user.id,
        })
        return song
    })

export const updateSong = createServerFn({ method: "POST" })
    .inputValidator(updateSongInputSchema)
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
            .returning({
                id: songs.id,
                title: songs.title,
                author: songs.author,
                copyright: songs.copyright,
                ccliNumber: songs.ccliNumber,
                createdAt: songs.createdAt,
                updatedAt: songs.updatedAt,
            })

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
            snapshot: { ...updated, sections },
            changedBy: session.user.id,
        })
        return { ...updated, sections }
    })

export const deleteSong = createServerFn({ method: "POST" })
    .inputValidator(z.object({ id: z.string() }))
    .handler(async ({ data }) => {
        await withAuth()
        const deleted = await db.delete(songs).where(eq(songs.id, data.id)).returning({ id: songs.id })
        if (!deleted.length) throw new Error("Not found")
        return { ok: true }
    })
