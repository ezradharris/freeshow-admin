import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { eq, and, desc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/songs/$id/history")({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const id = params.id
                    const entries = await db
                        .select({
                            id: contentHistory.id,
                            changedAt: contentHistory.changedAt,
                            changedByName: users.name,
                        })
                        .from(contentHistory)
                        .innerJoin(users, eq(contentHistory.changedBy, users.id))
                        .where(and(eq(contentHistory.contentType, "song"), eq(contentHistory.contentId, id)))
                        .orderBy(desc(contentHistory.changedAt))
                    return jsonResponse(entries)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            POST: async ({ request, params }) => {
                try {
                    const session = await requireSession(request)
                    const id = params.id
                    const body = await request.json() as { historyId: string }
                    const [entry] = await db
                        .select()
                        .from(contentHistory)
                        .where(eq(contentHistory.id, body.historyId))
                    if (!entry || entry.contentType !== "song" || entry.contentId !== id) {
                        return errorResponse("Not found", 404)
                    }
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
                        .where(eq(songs.id, id))
                    if (snap.sections) {
                        await db.delete(songSections).where(eq(songSections.songId, id))
                        if (snap.sections.length) {
                            await db.insert(songSections).values(
                                snap.sections.map(s => ({ ...s, songId: id }))
                            )
                        }
                    }
                    await db.insert(contentHistory).values({
                        contentType: "song",
                        contentId: id,
                        snapshot: entry.snapshot,
                        changedBy: session.user.id,
                    })
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
