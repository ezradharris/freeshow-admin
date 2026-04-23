// src/server/settings.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { settings } from "@/database/schema"
import { withAuth } from "./auth.server"
import { updateSettingsInputSchema } from "./schemas"

const VALID_KEYS = new Set(["max_line_chars", "warn_line_chars", "auto_line_break", "line_break_strategy"])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSettings = createServerFn({ method: "GET" }).handler(async (): Promise<any> => {
    await withAuth()
    const rows = await db.select().from(settings)
    return Object.fromEntries(rows.map((s) => [s.key, s.value]))
})

export const updateSettings = createServerFn({ method: "POST" })
    .inputValidator(updateSettingsInputSchema)
    .handler(async ({ data }) => {
        const { session } = await withAuth()
        const invalidKeys = Object.keys(data).filter((k) => !VALID_KEYS.has(k))
        if (invalidKeys.length > 0) throw new Error(`Invalid keys: ${invalidKeys.join(", ")}`)
        for (const [key, value] of Object.entries(data)) {
            await db
                .insert(settings)
                .values({ key, value, updatedBy: session.user.id })
                .onConflictDoUpdate({
                    target: settings.key,
                    set: { value, updatedAt: new Date(), updatedBy: session.user.id },
                })
        }
        return { ok: true }
    })
