import { createFileRoute } from "@tanstack/react-router"
import JSZip from "jszip"
import { db } from "@/database/db"
import { songs, songSections, shows } from "@/database/schema"
import { asc, inArray } from "drizzle-orm"
import { requireSession, errorResponse } from "@/lib/api-helpers"
import { serializeSong } from "@/lib/freeshow"
import type { InferSelectModel } from "drizzle-orm"
import type { songs as songsTable, songSections as songSectionsTable, shows as showsTable } from "@/database/schema"

type SongRow = InferSelectModel<typeof songsTable>
type SectionRow = InferSelectModel<typeof songSectionsTable>
type ShowRow = InferSelectModel<typeof showsTable>

export const Route = createFileRoute("/api/export")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    await requireSession(request)
                    const body = await request.json() as { items: Array<{ type: string; id: string }> }

                    if (!body.items || body.items.length === 0) return errorResponse("No items selected", 400)

                    const MAX_EXPORT_ITEMS = 100
                    const items = (body.items ?? []).slice(0, MAX_EXPORT_ITEMS)

                    const songIds = items.filter(i => i.type === "song").map(i => i.id)
                    const showIds = items.filter(i => i.type === "show").map(i => i.id)

                    // Batch fetch
                    const [allSongs, allSections, allShows] = await Promise.all([
                        songIds.length ? db.select().from(songs).where(inArray(songs.id, songIds)) : Promise.resolve([] as SongRow[]),
                        songIds.length ? db.select().from(songSections).where(inArray(songSections.songId, songIds)).orderBy(asc(songSections.sortOrder)) : Promise.resolve([] as SectionRow[]),
                        showIds.length ? db.select().from(shows).where(inArray(shows.id, showIds)) : Promise.resolve([] as ShowRow[]),
                    ])

                    const songMap = new Map(allSongs.map(s => [s.id, s]))
                    const sectionsBySongId = new Map<string, SectionRow[]>()
                    for (const sec of allSections) {
                        if (!sectionsBySongId.has(sec.songId)) sectionsBySongId.set(sec.songId, [])
                        sectionsBySongId.get(sec.songId)!.push(sec)
                    }

                    type ExportFile = { name: string; content: string }
                    const files: ExportFile[] = []

                    // Build files
                    for (const item of items) {
                        if (item.type === "song") {
                            const song = songMap.get(item.id)
                            if (!song) continue
                            const sections = sectionsBySongId.get(item.id) ?? []
                            const freeshowJson = serializeSong({ ...song, sections })
                            files.push({ name: `${song.title}.show`, content: JSON.stringify(freeshowJson, null, 2) })
                        } else {
                            const show = allShows.find(s => s.id === item.id)
                            if (!show) continue
                            files.push({ name: `${show.name}.show`, content: JSON.stringify(show.rawJson, null, 2) })
                        }
                    }

                    if (files.length === 0) return errorResponse("No valid items found", 404)

                    if (files.length === 1) {
                        const encodedName = encodeURIComponent(files[0].name)
                        return new Response(files[0].content, {
                            headers: {
                                "Content-Type": "application/json",
                                "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
                            }
                        })
                    }

                    const zip = new JSZip()
                    for (const f of files) {
                        zip.file(f.name, f.content)
                    }
                    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })
                    return new Response(zipBuffer, {
                        headers: {
                            "Content-Type": "application/zip",
                            "Content-Disposition": `attachment; filename="freeshow-export.zip"`,
                        }
                    })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
