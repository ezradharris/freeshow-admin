import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { shows, contentHistory } from "@/database/schema"
import { eq } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/shows/$id")({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const id = params.id
                    const [show] = await db.select().from(shows).where(eq(shows.id, id))
                    if (!show) return errorResponse("Not found", 404)
                    return jsonResponse(show)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            PUT: async ({ request, params }) => {
                try {
                    const session = await requireSession(request)
                    const id = params.id
                    const body = await request.json() as { name?: string; rawJson?: unknown }
                    const [existing] = await db.select().from(shows).where(eq(shows.id, id))
                    if (!existing) return errorResponse("Not found", 404)

                    const updateData: Partial<typeof shows.$inferInsert> = {}
                    if (body.name !== undefined) updateData.name = body.name
                    if (body.rawJson !== undefined) updateData.rawJson = body.rawJson as Record<string, unknown>
                    updateData.updatedAt = new Date()

                    const [updated] = await db
                        .update(shows)
                        .set(updateData)
                        .where(eq(shows.id, id))
                        .returning()

                    await db.insert(contentHistory).values({
                        contentType: "show",
                        contentId: id,
                        snapshot: structuredClone(updated),
                        changedBy: session.user.id,
                    })

                    return jsonResponse(updated)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            DELETE: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const deleted = await db.delete(shows).where(eq(shows.id, params.id)).returning({ id: shows.id })
                    if (!deleted.length) return errorResponse("Not found", 404)
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
