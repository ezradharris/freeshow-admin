export * from "@/../auth-schema"

import { sql } from "drizzle-orm"
import { check, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "@/../auth-schema"

export const songs = pgTable("songs", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    author: text("author"),
    copyright: text("copyright"),
    ccliNumber: text("ccli_number"),
    rawImport: jsonb("raw_import"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const songSections = pgTable(
    "song_sections",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        songId: text("song_id")
            .notNull()
            .references(() => songs.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        label: text("label").notNull(),
        content: text("content").notNull(),
        sortOrder: integer("sort_order").notNull(),
    },
    (t) => [index("song_sections_song_id_idx").on(t.songId)],
)

export const shows = pgTable("shows", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    type: text("type").notNull(),
    rawJson: jsonb("raw_json").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const contentHistory = pgTable(
    "content_history",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        contentType: text("content_type").notNull(),
        contentId: text("content_id").notNull(),
        snapshot: jsonb("snapshot").notNull(),
        changedBy: text("changed_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        changedAt: timestamp("changed_at").notNull().defaultNow(),
    },
    (t) => [
        check("content_history_content_type_check", sql`${t.contentType} IN ('song', 'show')`),
        index("content_history_content_idx").on(t.contentType, t.contentId),
        index("content_history_changed_by_idx").on(t.changedBy),
    ],
)

export const songShares = pgTable(
    "song_shares",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        songId: text("song_id")
            .notNull()
            .references(() => songs.id, { onDelete: "cascade" }),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at", { withTimezone: true }),
        createdBy: text("created_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("song_shares_song_id_idx").on(t.songId),
        index("song_shares_created_by_idx").on(t.createdBy),
    ],
)

export const settings = pgTable("settings", {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "restrict" }),
})
