// src/routes/_authenticated/dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSongs } from "@/server/songs"
import { getShows } from "@/server/shows"
import { getDashboardHistory } from "@/server/history"

type ShowItem = {
    id: string
    name: string
    type: "show" | "project"
    createdAt: Date
    updatedAt: Date
}

type SongItem = {
    id: string
    title: string
    author: string | null
    ccliNumber: string | null
    createdAt: Date
    updatedAt: Date
}

type HistoryEntry = {
    id: string
    contentType: string
    contentId: string
    contentName: string | null
    changedByName: string | null
    changedAt: Date | string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute("/_authenticated/dashboard")({
    loader: async () => {
        const [allSongs, allShows, history] = await Promise.all([
            getSongs(),
            getShows({ data: {} }),
            getDashboardHistory(),
        ])
        return { songs: allSongs, shows: allShows, history }
    },
    component: DashboardPage,
})

function DashboardPage() {
    const { songs, shows, history } = Route.useLoaderData() as {
        songs: SongItem[]
        shows: ShowItem[]
        history: HistoryEntry[]
    }
    const projects = shows.filter((s) => s.type === "project")
    const onlyShows = shows.filter((s) => s.type === "show")

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        <Link to="/songs" className="hover:text-primary transition-colors">
                            {songs.length} {songs.length === 1 ? "song" : "songs"}
                        </Link>
                        <span className="mx-1.5 opacity-40">·</span>
                        <Link to="/shows" className="hover:text-primary transition-colors">
                            {onlyShows.length} {onlyShows.length === 1 ? "show" : "shows"}
                        </Link>
                        <span className="mx-1.5 opacity-40">·</span>
                        <Link to="/projects" className="hover:text-primary transition-colors">
                            {projects.length} {projects.length === 1 ? "project" : "projects"}
                        </Link>
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button asChild>
                        <Link to="/import">
                            <Upload className="h-4 w-4" />
                            Import
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to="/songs/new">
                            <Plus className="h-4 w-4" />
                            New song
                        </Link>
                    </Button>
                </div>
            </div>

            <div>
                <h2 className="text-base font-semibold mb-3">Recent changes</h2>
                {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Nothing yet. Import some FreeShow files to get started.
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {history.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between py-3 text-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0 w-10">
                                        {entry.contentType}
                                    </span>
                                    <span className="font-medium truncate">{entry.contentName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-muted-foreground shrink-0 ml-4">
                                    <span className="hidden sm:block">{entry.changedByName}</span>
                                    <span className="text-xs tabular-nums">
                                        {new Date(String(entry.changedAt)).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
