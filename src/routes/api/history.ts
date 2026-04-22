import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, shows, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { eq, and, desc } from "drizzle-orm"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/history")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                try {
                    await requireSession(request)
                    const url = new URL(request.url)
                    const typeFilter = url.searchParams.get("type")
                    const userFilter = url.searchParams.get("user")
                    const limit = parseInt(url.searchParams.get("limit") ?? "50")
                    const offset = parseInt(url.searchParams.get("offset") ?? "0")

                    type HistoryEntry = {
                        id: string
                        contentType: string
                        contentId: string
                        contentName: string | null
                        changedByName: string
                        changedAt: Date
                    }

                    let result: HistoryEntry[] = []

                    if (!typeFilter || typeFilter === "song") {
                        let songQuery = db
                            .select({
                                id: contentHistory.id,
                                contentType: contentHistory.contentType,
                                contentId: contentHistory.contentId,
                                contentName: songs.title,
                                changedByName: users.name,
                                changedAt: contentHistory.changedAt,
                            })
                            .from(contentHistory)
                            .innerJoin(songs, eq(contentHistory.contentId, songs.id))
                            .innerJoin(users, eq(contentHistory.changedBy, users.id))
                            .where(eq(contentHistory.contentType, "song"))
                            .orderBy(desc(contentHistory.changedAt))
                            .$dynamic()

                        if (userFilter) {
                            songQuery = songQuery.where(and(eq(contentHistory.contentType, "song"), eq(contentHistory.changedBy, userFilter)))
                        }

                        const songEntries = await songQuery
                            .limit(!typeFilter ? Math.ceil(limit / 2) : limit)
                            .offset(!typeFilter ? Math.ceil(offset / 2) : offset)

                        result.push(...songEntries)
                    }

                    if (!typeFilter || typeFilter === "show") {
                        let showQuery = db
                            .select({
                                id: contentHistory.id,
                                contentType: contentHistory.contentType,
                                contentId: contentHistory.contentId,
                                contentName: shows.name,
                                changedByName: users.name,
                                changedAt: contentHistory.changedAt,
                            })
                            .from(contentHistory)
                            .innerJoin(shows, eq(contentHistory.contentId, shows.id))
                            .innerJoin(users, eq(contentHistory.changedBy, users.id))
                            .where(eq(contentHistory.contentType, "show"))
                            .orderBy(desc(contentHistory.changedAt))
                            .$dynamic()

                        if (userFilter) {
                            showQuery = showQuery.where(and(eq(contentHistory.contentType, "show"), eq(contentHistory.changedBy, userFilter)))
                        }

                        const showEntries = await showQuery
                            .limit(!typeFilter ? Math.ceil(limit / 2) : limit)
                            .offset(!typeFilter ? Math.ceil(offset / 2) : offset)

                        result.push(...showEntries)
                    }

                    // Sort merged results by changedAt descending
                    result.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())

                    return jsonResponse(result)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
