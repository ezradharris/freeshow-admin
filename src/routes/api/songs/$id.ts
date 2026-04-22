import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, contentHistory } from "@/database/schema"
import { eq, asc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/songs/$id")({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const id = params.id
                    const [song] = await db.select().from(songs).where(eq(songs.id, id))
                    if (!song) return errorResponse("Not found", 404)
                    const sections = await db
                        .select()
                        .from(songSections)
                        .where(eq(songSections.songId, id))
                        .orderBy(asc(songSections.sortOrder))
                    return jsonResponse({ ...song, sections })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            PUT: async ({ request, params }) => {
                try {
                    const session = await requireSession(request)
                    const id = params.id
                    const body = await request.json() as {
                        title?: string
                        author?: string
                        copyright?: string
                        ccliNumber?: string
                        sections?: Array<{ type: string; label: string; content: string; sortOrder: number }>
                    }
                    const [existing] = await db.select().from(songs).where(eq(songs.id, id))
                    if (!existing) return errorResponse("Not found", 404)

                    const updateData: Partial<typeof songs.$inferInsert> = {}
                    if (body.title !== undefined) updateData.title = body.title
                    if (body.author !== undefined) updateData.author = body.author ?? null
                    if (body.copyright !== undefined) updateData.copyright = body.copyright ?? null
                    if (body.ccliNumber !== undefined) updateData.ccliNumber = body.ccliNumber ?? null
                    updateData.updatedAt = new Date()

                    const [updated] = await db
                        .update(songs)
                        .set(updateData)
                        .where(eq(songs.id, id))
                        .returning()

                    let sections: Array<{ type: string; label: string; content: string; sortOrder: number; id: string; songId: string }> = []
                    if (body.sections !== undefined) {
                        await db.delete(songSections).where(eq(songSections.songId, id))
                        if (body.sections.length) {
                            sections = await db.insert(songSections).values(
                                body.sections.map(s => ({ ...s, songId: id }))
                            ).returning()
                        }
                    } else {
                        sections = await db
                            .select()
                            .from(songSections)
                            .where(eq(songSections.songId, id))
                            .orderBy(asc(songSections.sortOrder))
                    }

                    await db.insert(contentHistory).values({
                        contentType: "song",
                        contentId: id,
                        snapshot: JSON.parse(JSON.stringify({ ...updated, sections })),
                        changedBy: session.user.id,
                    })

                    return jsonResponse({ ...updated, sections })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            DELETE: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const id = params.id
                    await db.delete(songs).where(eq(songs.id, id))
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
