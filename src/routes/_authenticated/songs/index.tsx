// src/routes/_authenticated/songs/index.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getSongs } from "@/server/songs"

type Song = { id: string; title: string; author: string | null; ccliNumber: string | null; updatedAt: Date }

export const Route = createFileRoute("/_authenticated/songs/")({
    loader: async () => {
        const songs = await getSongs()
        return { songs }
    },
    component: SongsPage,
})

function SongsPage() {
    const { songs } = Route.useLoaderData() as { songs: Song[] }
    const [search, setSearch] = useState("")
    const filtered = songs.filter((s) => {
        const q = search.toLowerCase()
        return s.title.toLowerCase().includes(q) || (s.author?.toLowerCase().includes(q) ?? false)
    })

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Song Library</h1>
                <Button asChild>
                    <Link to="/songs/new">+ New song</Link>
                </Button>
            </div>
            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or author…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>
            {filtered.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground text-sm">
                    {songs.length === 0 ? "No songs yet. Create your first song!" : "No songs match your search."}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((song) => (
                        <Link
                            key={song.id}
                            to="/songs/$id"
                            params={{ id: song.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate group-hover:text-primary transition-colors">{song.title}</p>
                                {song.author && <p className="text-sm text-muted-foreground truncate">{song.author}</p>}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(song.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
