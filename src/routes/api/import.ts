import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, shows, contentHistory } from "@/database/schema"
import { eq } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"
import { parseFreeshowFile, detectContentType, parseSong } from "@/lib/freeshow"

export const Route = createFileRoute("/api/import")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const session = await requireSession(request)
                    const formData = await request.formData()
                    const results: Array<{ name: string; type: string; status: "imported" | "duplicate"; id?: string }> = []

                    for (const [, file] of formData.entries()) {
                        if (!(file instanceof File)) continue
                        const text = await file.text()
                        let parsed: unknown
                        try {
                            parsed = JSON.parse(text)
                        } catch {
                            results.push({ name: file.name, type: "unknown", status: "imported" })
                            continue
                        }

                        let show: ReturnType<typeof parseFreeshowFile>
                        try {
                            show = parseFreeshowFile(parsed)
                        } catch {
                            results.push({ name: file.name, type: "unknown", status: "imported" })
                            continue
                        }

                        const contentType = detectContentType(show)

                        if (contentType === "song") {
                            const songData = parseSong(show)
                            const existing = await db
                                .select({ id: songs.id })
                                .from(songs)
                                .where(eq(songs.title, songData.title))
                                .limit(1)
                            if (existing.length) {
                                results.push({ name: songData.title, type: "song", status: "duplicate", id: existing[0].id })
                                continue
                            }
                            const [song] = await db.insert(songs).values({
                                title: songData.title,
                                author: songData.author,
                                copyright: songData.copyright,
                                ccliNumber: songData.ccliNumber,
                                rawImport: songData.rawImport as Record<string, unknown>,
                            }).returning()
                            if (songData.sections.length) {
                                await db.insert(songSections).values(
                                    songData.sections.map(s => ({ ...s, songId: song.id }))
                                )
                            }
                            await db.insert(contentHistory).values({
                                contentType: "song",
                                contentId: song.id,
                                snapshot: JSON.parse(JSON.stringify({ ...song, sections: songData.sections })),
                                changedBy: session.user.id,
                            })
                            results.push({ name: songData.title, type: "song", status: "imported", id: song.id })
                        } else {
                            const showName = show.name ?? file.name
                            const existing = await db
                                .select({ id: shows.id })
                                .from(shows)
                                .where(eq(shows.name, showName))
                                .limit(1)
                            if (existing.length) {
                                results.push({ name: showName, type: "show", status: "duplicate", id: existing[0].id })
                                continue
                            }
                            const showType = (show as { category?: string }).category === "project" ? "project" : "show"
                            const [savedShow] = await db.insert(shows).values({
                                name: showName,
                                type: showType,
                                rawJson: show as unknown as Record<string, unknown>,
                            }).returning()
                            await db.insert(contentHistory).values({
                                contentType: "show",
                                contentId: savedShow.id,
                                snapshot: JSON.parse(JSON.stringify(savedShow)),
                                changedBy: session.user.id,
                            })
                            results.push({ name: showName, type: showType, status: "imported", id: savedShow.id })
                        }
                    }

                    return jsonResponse({ results })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
