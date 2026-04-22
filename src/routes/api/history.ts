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
                    const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10)
                    const rawOffset = parseInt(url.searchParams.get("offset") ?? "0", 10)
                    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50
                    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0

                    type HistoryEntry = {
                        id: string
                        contentType: string
                        contentId: string
                        contentName: string | null
                        changedByName: string
                        changedAt: Date
                    }

                    if (!typeFilter) {
                        // Combined history uses application-level merge; offset applies to merged results
                        const songLimit = Math.min(limit + offset + 200, 200) // fetch enough to cover the page
                        const showLimit = Math.min(limit + offset + 200, 200)

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

                        const [songEntries, showEntries] = await Promise.all([
                            songQuery.limit(songLimit),
                            showQuery.limit(showLimit),
                        ])

                        const merged = [...songEntries, ...showEntries]
                            .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                            .slice(offset, offset + limit)

                        return jsonResponse(merged)
                    }

                    let result: HistoryEntry[] = []

                    if (typeFilter === "song") {
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

                        const songEntries = await songQuery.limit(limit).offset(offset)
                        result.push(...songEntries)
                    }

                    if (typeFilter === "show") {
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

                        const showEntries = await showQuery.limit(limit).offset(offset)
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
