import { createFileRoute } from "@tanstack/react-router"

type SongSection = { type: string; label: string; content: string; sortOrder: number }
type SongData = { id: string; title: string; author: string | null; copyright: string | null; ccliNumber: string | null; sections: SongSection[] }

export const Route = createFileRoute("/s/$token")({
    loader: async ({ params }) => {
        const res = await fetch(`/api/public/songs/${params.token}`)
        if (res.status === 403) return { error: "expired" as const, song: null }
        if (res.status === 404) return { error: "notfound" as const, song: null }
        if (!res.ok) return { error: "error" as const, song: null }
        const song = await res.json() as SongData
        return { song, error: null }
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
