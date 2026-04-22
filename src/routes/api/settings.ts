import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { settings } from "@/database/schema"
import { requireSession, jsonResponse, errorResponse } from "@/lib/api-helpers"

export const Route = createFileRoute("/api/settings")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                try {
                    await requireSession(request)
                    const allSettings = await db.select().from(settings)
                    const result = Object.fromEntries(allSettings.map(s => [s.key, s.value]))
                    return jsonResponse(result)
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
            PATCH: async ({ request }) => {
                try {
                    const session = await requireSession(request)
                    const body = await request.json() as Record<string, unknown>
                    const VALID_SETTINGS_KEYS = new Set(["max_line_chars", "warn_line_chars", "auto_line_break", "line_break_strategy"])
                    const invalidKeys = Object.keys(body).filter(k => !VALID_SETTINGS_KEYS.has(k))
                    if (invalidKeys.length > 0) return errorResponse(`Invalid settings keys: ${invalidKeys.join(", ")}`, 400)
                    for (const [key, value] of Object.entries(body)) {
                        await db.insert(settings).values({ key, value, updatedBy: session.user.id })
                            .onConflictDoUpdate({
                                target: settings.key,
                                set: { value, updatedAt: new Date(), updatedBy: session.user.id }
                            })
                    }
                    return jsonResponse({ ok: true })
                } catch (e) {
                    if (e instanceof Response) return e
                    return errorResponse("Internal server error", 500)
                }
            },
        }
    }
})
