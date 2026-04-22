import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { shows, contentHistory } from "@/database/schema"
import { desc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/shows/")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                try {
                    await requireSession(request)
                    const allShows = await db
                        .select({
                            id: shows.id,
                            name: shows.name,
                            type: shows.type,
                            createdAt: shows.createdAt,
                            updatedAt: shows.updatedAt,
                        })
                        .from(shows)
                        .orderBy(desc(shows.updatedAt))
                    return jsonResponse(allShows)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            POST: async ({ request }) => {
                try {
                    const session = await requireSession(request)
                    const body = await request.json() as { name: string; type: string; rawJson: unknown }
                    const [show] = await db.insert(shows).values({
                        name: body.name,
                        type: body.type,
                        rawJson: body.rawJson as Record<string, unknown>,
                    }).returning()
                    await db.insert(contentHistory).values({
                        contentType: "show",
                        contentId: show.id,
                        snapshot: JSON.parse(JSON.stringify(show)),
                        changedBy: session.user.id,
                    })
                    return jsonResponse(show, 201)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
