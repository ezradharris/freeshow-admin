import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songShares } from "@/database/schema"
import { eq, and } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/songs/$id/share")({
    server: {
        handlers: {
            POST: async ({ request, params }) => {
                try {
                    const session = await requireSession(request)
                    const id = params.id
                    const body = await request.json() as { expiresAt?: string }
                    const token = crypto.randomUUID()
                    let expiresAt: Date | null = null
                    if (body.expiresAt) {
                        expiresAt = new Date(body.expiresAt)
                        if (isNaN(expiresAt.getTime())) return errorResponse("Invalid expiresAt date", 400)
                        if (expiresAt <= new Date()) return errorResponse("expiresAt must be in the future", 400)
                    }
                    const [share] = await db.insert(songShares).values({
                        songId: id,
                        token,
                        expiresAt,
                        createdBy: session.user.id,
                    }).returning()
                    return jsonResponse({ token: share.token, shareUrl: `/s/${share.token}` }, 201)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            DELETE: async ({ request, params }) => {
                try {
                    await requireSession(request)
                    const id = params.id
                    const body = await request.json() as { token?: string }
                    if (!body.token) return errorResponse("token is required", 400)
                    const deleted = await db.delete(songShares)
                        .where(and(eq(songShares.token, body.token), eq(songShares.songId, id)))
                        .returning({ id: songShares.id })
                    if (!deleted.length) return errorResponse("Share not found", 404)
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
