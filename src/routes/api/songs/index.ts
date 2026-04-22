import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, contentHistory } from "@/database/schema"
import { desc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/songs/")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                try {
                    await requireSession(request)
                    const allSongs = await db
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
                    return jsonResponse(allSongs)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            POST: async ({ request }) => {
                try {
                    const session = await requireSession(request)
                    const body = await request.json() as {
                        title: string
                        author?: string
                        copyright?: string
                        ccliNumber?: string
                        sections?: Array<{ type: string; label: string; content: string; sortOrder: number }>
                    }
                    const [song] = await db.insert(songs).values({
                        title: body.title,
                        author: body.author ?? null,
                        copyright: body.copyright ?? null,
                        ccliNumber: body.ccliNumber ?? null,
                    }).returning()
                    if (body.sections?.length) {
                        await db.insert(songSections).values(
                            body.sections.map(s => ({ ...s, songId: song.id }))
                        )
                    }
                    await db.insert(contentHistory).values({
                        contentType: "song",
                        contentId: song.id,
                        snapshot: JSON.parse(JSON.stringify({ ...song, sections: body.sections ?? [] })),
                        changedBy: session.user.id,
                    })
                    return jsonResponse(song, 201)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
