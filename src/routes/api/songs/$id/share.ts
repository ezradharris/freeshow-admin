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
                    const [share] = await db.insert(songShares).values({
                        songId: id,
                        token,
                        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
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
                    const body = await request.json() as { token: string }
                    await db.delete(songShares).where(
                        and(eq(songShares.token, body.token), eq(songShares.songId, id))
                    )
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
