import { createFileRoute } from "@tanstack/react-router"
import JSZip from "jszip"
import { db } from "@/database/db"
import { songs, songSections, shows } from "@/database/schema"
import { eq, asc } from "drizzle-orm"
import { requireSession, errorResponse } from "@/lib/api-helpers"
import { serializeSong } from "@/lib/freeshow"

export const Route = createFileRoute("/api/export")({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    await requireSession(request)
                    const body = await request.json() as { items: Array<{ type: string; id: string }> }

                    if (body.items.length === 0) return errorResponse("No items selected", 400)

                    type ExportFile = { name: string; content: string }
                    const files: ExportFile[] = []

                    for (const item of body.items) {
                        if (item.type === "song") {
                            const [song] = await db.select().from(songs).where(eq(songs.id, item.id))
                            if (!song) continue
                            const sections = await db
                                .select()
                                .from(songSections)
                                .where(eq(songSections.songId, item.id))
                                .orderBy(asc(songSections.sortOrder))
                            const freeshowJson = serializeSong({ ...song, sections })
                            files.push({ name: `${song.title}.show`, content: JSON.stringify(freeshowJson, null, 2) })
                        } else {
                            const [show] = await db.select().from(shows).where(eq(shows.id, item.id))
                            if (!show) continue
                            files.push({ name: `${show.name}.show`, content: JSON.stringify(show.rawJson, null, 2) })
                        }
                    }

                    if (files.length === 0) return errorResponse("No valid items found", 404)

                    if (files.length === 1) {
                        return new Response(files[0].content, {
                            headers: {
                                "Content-Type": "application/json",
                                "Content-Disposition": `attachment; filename="${files[0].name}"`,
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
