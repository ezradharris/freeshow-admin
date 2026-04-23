// src/server/import.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { songs, songSections, shows, contentHistory } from "@/database/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth"
import { parseFreeshowFile, detectContentType, parseSong } from "@/lib/freeshow"

const importFileSchema = z.object({
    filename: z.string(),
    content: z.unknown(),
})

export const importFiles = createServerFn({ method: "POST" })
    .inputValidator(z.object({ files: z.array(importFileSchema) }))
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const results: Array<{ name: string; type: string; status: "imported" | "duplicate" | "error"; id?: string; reason?: string }> = []
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
                    snapshot: { ...song, sections: songData.sections } as unknown as Record<string, unknown>,
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
                    snapshot: savedShow as unknown as Record<string, unknown>,
                    changedBy: session.user.id,
                })
                results.push({ name: showName, type: showType, status: "imported", id: savedShow.id })
            }
        }
        return { results }
    })
