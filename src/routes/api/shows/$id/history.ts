import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { shows, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { eq, and, desc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/shows/$id/history")({
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
                        .where(and(eq(contentHistory.contentType, "show"), eq(contentHistory.contentId, id)))
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
                    if (!entry || entry.contentType !== "show" || entry.contentId !== id) {
                        return errorResponse("Not found", 404)
                    }
                    const snap = entry.snapshot as {
                        name?: string
                        rawJson?: unknown
                    }
                    const updateData: Partial<typeof shows.$inferInsert> = { updatedAt: new Date() }
                    if (snap.name !== undefined) updateData.name = snap.name
                    if (snap.rawJson !== undefined) updateData.rawJson = snap.rawJson as unknown as Record<string, unknown>

                    await db.update(shows).set(updateData).where(eq(shows.id, id))

                    await db.insert(contentHistory).values({
                        contentType: "show",
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
