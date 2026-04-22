import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { db } from "@/database/db"
import { songs } from "@/database/schema"
import { desc } from "drizzle-orm"

type Song = {
    id: string
    title: string
    author: string | null
    ccliNumber: string | null
    updatedAt: Date
}

export const Route = createFileRoute("/songs/")({
    loader: async () => {
        const allSongs = await db
            .select({ id: songs.id, title: songs.title, author: songs.author, ccliNumber: songs.ccliNumber, createdAt: songs.createdAt, updatedAt: songs.updatedAt })
            .from(songs)
            .orderBy(desc(songs.updatedAt))
        return { songs: allSongs }
    },
    component: SongsPage,
})

function SongsPage() {
    const { songs } = Route.useLoaderData() as { songs: Song[] }
    const [search, setSearch] = useState("")

    const filtered = songs.filter((s: Song) => {
        const q = search.toLowerCase()
        return (
            s.title.toLowerCase().includes(q) ||
            (s.author?.toLowerCase().includes(q) ?? false)
        )
    })

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Song Library</h1>
                <Button asChild>
                    <Link to="/songs/new">+ New Song</Link>
                </Button>
            </div>

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by title or author…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {songs.length === 0
                        ? "No songs yet. Create your first song!"
                        : "No songs match your search."}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((song: Song) => (
                        <Link
                            key={song.id}
                            to="/songs/$id"
                            params={{ id: song.id }}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent transition-colors"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate">{song.title}</p>
                                {song.author && (
                                    <p className="text-sm text-muted-foreground truncate">{song.author}</p>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4">
                                {new Date(song.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
