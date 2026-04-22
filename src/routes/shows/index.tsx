import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

type Show = {
    id: string
    name: string
    type: string
    updatedAt: string
}

export const Route = createFileRoute("/shows/")({
    loader: async () => {
        const res = await fetch("/api/shows/")
        const data = await res.json()
        const all = Array.isArray(data) ? (data as Show[]) : []
        return { shows: all.filter(s => s.type === "show") }
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
                <h1 className="text-2xl font-bold">Shows</h1>
                <Button asChild>
                    <Link to="/shows/new">+ New Show</Link>
                </Button>
            </div>

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {shows.length === 0
                        ? "No shows yet. Create your first show!"
                        : "No shows match your search."}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((show: Show) => (
                        <Link
                            key={show.id}
                            to="/shows/$id"
                            params={{ id: show.id }}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent transition-colors"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate">{show.name}</p>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4">
                                {new Date(show.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
