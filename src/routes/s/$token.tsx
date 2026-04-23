import { createFileRoute } from "@tanstack/react-router"
import { getSongByShareToken } from "@/server/shares"

export const Route = createFileRoute("/s/$token")({
    loader: async ({ params }) => {
        return getSongByShareToken({ data: { token: params.token } })
    },
    component: PublicSongPage,
})

function PublicSongPage() {
    const { song, error } = Route.useLoaderData()

    if (error === "expired") {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-center">
                <div>
                    <h1 className="text-xl font-bold">Link expired</h1>
                    <p className="text-muted-foreground text-sm mt-1">This share link is no longer active.</p>
                </div>
            </div>
        )
    }

    if (error || !song) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-center">
                <div>
                    <h1 className="text-xl font-bold">Song not found</h1>
                    <p className="text-muted-foreground text-sm mt-1">This link is no longer valid.</p>
                </div>
            </div>
        )
    }

    const sortedSections = [...song.sections].sort((a, b) => a.sortOrder - b.sortOrder)

    return (
        <div className="min-h-screen bg-background">
            <div className="px-6 py-10 text-center max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold leading-tight">{song.title}</h1>
                {song.author && (
                    <p className="mt-2 text-muted-foreground">{song.author}</p>
                )}
                {(song.copyright || song.ccliNumber) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {song.copyright}
                        {song.ccliNumber && ` · CCLI #${song.ccliNumber}`}
                    </p>
                )}
            </div>

            <div className="mx-auto max-w-xl px-6 pb-16 space-y-10">
                {sortedSections.map((section, i) => (
                    <div key={i}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                            {section.label}
                        </p>
                        <div>
                            {section.content.split("\n").map((line, j) => (
                                <p
                                    key={j}
                                    className={`leading-relaxed text-lg ${line === "" ? "h-5" : ""}`}
                                >
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
