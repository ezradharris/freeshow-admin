// src/server/shows.ts
import { createServerFn } from "@tanstack/react-start"
import { db } from "@/database/db"
import { shows, contentHistory } from "@/database/schema"
import { eq, desc } from "drizzle-orm"
import { z } from "zod"
import { withAuth } from "./auth.server"
import { createShowInputSchema, updateShowInputSchema } from "./schemas"

export const getShows = createServerFn({ method: "GET" })
    .inputValidator(z.object({ type: z.enum(["show", "project"]).optional() }))
    .handler(async ({ data }) => {
        await withAuth()
        const query = db
            .select({
                id: shows.id,
                name: shows.name,
                type: shows.type,
                createdAt: shows.createdAt,
                updatedAt: shows.updatedAt,
            })
            .from(shows)
            .orderBy(desc(shows.updatedAt))
        if (data.type) {
            return query.where(eq(shows.type, data.type))
        }
        return query
    })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getShow = createServerFn({ method: "GET" })
    .inputValidator(z.object({ id: z.string() }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .handler(async ({ data }): Promise<any> => {
        await withAuth()
        const [show] = await db.select().from(shows).where(eq(shows.id, data.id))
        if (!show) throw new Error("Not found")
        return show
    })

export const createShow = createServerFn({ method: "POST" })
    .inputValidator(createShowInputSchema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .handler(async ({ data }): Promise<any> => {
        const { session } = await withAuth()
        if (!data.name?.trim()) throw new Error("name is required")
        const [show] = await db
            .insert(shows)
            .values({
                name: data.name,
                type: data.type,
                rawJson: data.rawJson as Record<string, unknown>,
            })
            .returning()
        await db.insert(contentHistory).values({
            contentType: "show",
            contentId: show.id,
            snapshot: show as unknown as Record<string, unknown>,
            changedBy: session.user.id,
        })
        return show
    })

export const updateShow = createServerFn({ method: "POST" })
    .inputValidator(updateShowInputSchema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .handler(async ({ data }): Promise<any> => {
        const { session } = await withAuth()
        const [existing] = await db.select().from(shows).where(eq(shows.id, data.id))
        if (!existing) throw new Error("Not found")

        const updateData: Partial<typeof shows.$inferInsert> = { updatedAt: new Date() }
        if (data.name !== undefined) updateData.name = data.name
        if (data.rawJson !== undefined) updateData.rawJson = data.rawJson as Record<string, unknown>

        const [updated] = await db
            .update(shows)
            .set(updateData)
            .where(eq(shows.id, data.id))
            .returning()

        await db.insert(contentHistory).values({
            contentType: "show",
            contentId: data.id,
            snapshot: updated as unknown as Record<string, unknown>,
            changedBy: session.user.id,
        })
        return updated
    })

export const deleteShow = createServerFn({ method: "POST" })
    .inputValidator(z.object({ id: z.string() }))
    .handler(async ({ data }) => {
        await withAuth()
        const deleted = await db.delete(shows).where(eq(shows.id, data.id)).returning({ id: shows.id })
        if (!deleted.length) throw new Error("Not found")
        return { ok: true }
    })
