import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/database/db"
import { songs, songSections, songShares } from "@/database/schema"
import { eq, asc } from "drizzle-orm"

type SongSection = { type: string; label: string; content: string; sortOrder: number }
type SongData = { id: string; title: string; author: string | null; copyright: string | null; ccliNumber: string | null; sections: SongSection[] }

export const Route = createFileRoute("/s/$token")({
    loader: async ({ params }) => {
        const shareRows = await db.select().from(songShares).where(eq(songShares.token, params.token)).limit(1)
        if (!shareRows.length) return { song: null, error: "notfound" as const }
        const share = shareRows[0]
        if (share.expiresAt && share.expiresAt < new Date()) return { song: null, error: "expired" as const }
        const [songRows, sectionRows] = await Promise.all([
            db.select().from(songs).where(eq(songs.id, share.songId)).limit(1),
            db.select().from(songSections).where(eq(songSections.songId, share.songId)).orderBy(asc(songSections.sortOrder)),
        ])
        if (!songRows.length) return { song: null, error: "notfound" as const }
        return { song: { ...songRows[0], sections: sectionRows } as SongData, error: null }
    },
    component: PublicSongPage,
})

function PublicSongPage() {
    const { song, error } = Route.useLoaderData()

    if (error === "expired") {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">Link Expired</h1>
                    <p className="text-muted-foreground text-sm">This share link has expired.</p>
                </div>
            </div>
        )
    }

    if (error || !song) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">Song Not Found</h1>
                    <p className="text-muted-foreground text-sm">This link is no longer valid.</p>
                </div>
            </div>
        )
    }

    const sortedSections = [...song.sections].sort((a, b) => a.sortOrder - b.sortOrder)

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b px-6 py-6 text-center">
                <h1 className="text-2xl font-bold leading-tight">{song.title}</h1>
                {song.author && <p className="mt-1 text-muted-foreground">{song.author}</p>}
                {(song.copyright || song.ccliNumber) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {song.copyright}{song.ccliNumber && ` · CCLI #${song.ccliNumber}`}
                    </p>
                )}
            </div>

            {/* Sections */}
            <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
                {sortedSections.map((section, i) => (
                    <div key={i} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {section.label}
                        </p>
                        <div className="space-y-1">
                            {section.content.split("\n").map((line, j) => (
                                <p key={j} className={`text-lg leading-relaxed ${line === "" ? "h-4" : ""}`}>
                                    {line || " "}
                                </p>
                            ))}
                        </div>
                    </div>
                ))}

                {sortedSections.length === 0 && (
                    <p className="text-center text-muted-foreground">No lyrics available.</p>
                )}
            </div>
        </div>
    )
}
