import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { songs, songSections, shows, settings, contentHistory, songShares } from "@/database/schema"

// Songs
export const selectSongSchema = createSelectSchema(songs)
export const insertSongSchema = createInsertSchema(songs)
export const selectSongSectionSchema = createSelectSchema(songSections)
export const insertSongSectionSchema = createInsertSchema(songSections)

// Song section input (for mutations — no songId, no id)
export const songSectionInputSchema = z.object({
    type: z.string(),
    label: z.string(),
    content: z.string(),
    sortOrder: z.number().int(),
})

// Shows — rawJson is jsonb, override with explicit type
export const selectShowSchema = createSelectSchema(shows)
export const insertShowSchema = createInsertSchema(shows).extend({
    rawJson: z.record(z.string(), z.unknown()),
})

// Settings — value is jsonb, override with explicit type
export const selectSettingSchema = createSelectSchema(settings)
export const insertSettingSchema = createInsertSchema(settings).extend({
    value: z.record(z.string(), z.unknown()),
})

// History
export const selectHistorySchema = createSelectSchema(contentHistory)

// Shares
export const selectShareSchema = createSelectSchema(songShares)
export const insertShareSchema = createInsertSchema(songShares)

// Input schemas for mutations
export const createSongInputSchema = insertSongSchema
    .pick({ title: true, author: true, copyright: true, ccliNumber: true })
    .extend({ sections: z.array(songSectionInputSchema).optional() })

export const updateSongInputSchema = insertSongSchema
    .pick({ title: true, author: true, copyright: true, ccliNumber: true })
    .partial()
    .extend({
        id: z.string(),
        sections: z.array(songSectionInputSchema).optional(),
    })

export const createShowInputSchema = insertShowSchema
    .pick({ name: true, type: true, rawJson: true })

export const updateShowInputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    rawJson: z.unknown().optional(),
})

export const updateSettingsInputSchema = z.record(z.string(), z.unknown())

export const createShareInputSchema = z.object({
    songId: z.string(),
    expiresAt: z.string().optional(),
})
