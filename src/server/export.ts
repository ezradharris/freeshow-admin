// src/server/export.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, shows } from "@/database/schema"
import { inArray, asc } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth"
import { serializeSong } from "@/lib/freeshow"

type SongRow = typeof songs.$inferSelect
type SectionRow = typeof songSections.$inferSelect
type ShowRow = typeof shows.$inferSelect

export const getExportData = createServerFn({ method: "POST" })
    .inputValidator(z.object({
        items: z.array(z.object({ type: z.string(), id: z.string() })),
    }))
    .handler(async ({ data }) => {
        await withAuth()
        const items = data.items.slice(0, 100)
        const songIds = items.filter((i) => i.type === "song").map((i) => i.id)
        const showIds = items.filter((i) => i.type === "show" || i.type === "project").map((i) => i.id)

        const [allSongs, allSections, allShows] = await Promise.all([
            songIds.length ? db.select().from(songs).where(inArray(songs.id, songIds)) : Promise.resolve([] as SongRow[]),
            songIds.length
                ? db.select().from(songSections).where(inArray(songSections.songId, songIds)).orderBy(asc(songSections.sortOrder))
                : Promise.resolve([] as SectionRow[]),
            showIds.length ? db.select().from(shows).where(inArray(shows.id, showIds)) : Promise.resolve([] as ShowRow[]),
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
