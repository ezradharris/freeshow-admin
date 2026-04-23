import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getShows } from "@/server/shows"

type Show = {
    id: string
    name: string
    type: string
    updatedAt: Date
}

export const Route = createFileRoute("/_authenticated/shows/")({
    loader: async () => {
        const shows = await getShows({ data: { type: "show" } })
        return { shows }
    },
    component: ShowsPage,
})

function ShowsPage() {
    const { shows } = Route.useLoaderData()
    const [search, setSearch] = useState("")

    const filtered = shows.filter((s: Show) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Shows</h1>
                <Button asChild>
                    <Link to="/shows/new">+ New show</Link>
                </Button>
            </div>

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {filtered.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground text-sm">
                    {shows.length === 0
                        ? "No shows yet. Create one or import from FreeShow."
                        : "Nothing matches that search."}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((show: Show) => (
                        <Link
                            key={show.id}
                            to="/shows/$id"
                            params={{ id: show.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group"
                        >
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                                {show.name}
                            </p>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(show.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
