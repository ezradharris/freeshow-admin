import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, songShares } from "@/database/schema"
import { eq, asc } from "drizzle-orm"
import { jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/public/songs/$token")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                try {
                    const share = await db
                        .select()
                        .from(songShares)
                        .where(eq(songShares.token, params.token))
                        .limit(1)
                    if (!share.length) return errorResponse("Not found", 404)
                    const s = share[0]
                    if (s.expiresAt && s.expiresAt < new Date()) return errorResponse("Link expired", 403)
                    const [song] = await db.select().from(songs).where(eq(songs.id, s.songId))
                    if (!song) return errorResponse("Not found", 404)
                    const sections = await db
                        .select()
                        .from(songSections)
                        .where(eq(songSections.songId, s.songId))
                        .orderBy(asc(songSections.sortOrder))
                    return jsonResponse({ ...song, sections })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            }
        }
    }
})
