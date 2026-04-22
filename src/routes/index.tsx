import { createFileRoute, Link } from "@tanstack/react-router"
import { Music, MonitorPlay, FolderOpen, Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
    loader: async () => {
        const [songsRes, showsRes, historyRes] = await Promise.all([
            fetch("/api/songs/"),
            fetch("/api/shows/"),
            fetch("/api/history?limit=10"),
        ])
        const songsData = await songsRes.json()
        const showsData = await showsRes.json()
        const historyData = await historyRes.json()
        const songs = Array.isArray(songsData) ? (songsData as Array<{ id: string; title: string }>) : []
        const shows = Array.isArray(showsData) ? (showsData as Array<{ id: string; name: string; type: string }>) : []
        const history = Array.isArray(historyData)
            ? (historyData as Array<{
                  id: string
                  contentType: string
                  contentName: string
                  changedByName: string
                  changedAt: string
              }>)
            : []
        return { songs, shows, history }
    },
    component: IndexPage,
})

function StatCard({
    label,
    value,
    icon: Icon,
    href,
}: {
    label: string
    value: number
    icon: React.ElementType
    href: string
}) {
    return (
        <Link to={href} className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{value}</div>
        </Link>
    )
}

function IndexPage() {
    const { songs, shows, history } = Route.useLoaderData()
    const projects = shows.filter((s: { id: string; name: string; type: string }) => s.type === "project")
    const onlyShows = shows.filter((s: { id: string; name: string; type: string }) => s.type === "show")

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Songs" value={songs.length} icon={Music} href="/songs" />
                <StatCard label="Shows" value={onlyShows.length} icon={MonitorPlay} href="/shows" />
                <StatCard label="Projects" value={projects.length} icon={FolderOpen} href="/projects" />
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
                <Button asChild>
                    <Link to="/api/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link to="/songs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Song
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link to="/shows/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Show
                    </Link>
                </Button>
            </div>

            {/* Recent activity */}
            <div>
                <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
                {history.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No changes yet. Import some FreeShow files to get started.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {history.map((entry: { id: string; contentType: string; contentName: string; changedByName: string; changedAt: string }) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between rounded-lg border p-3 text-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground capitalize">{entry.contentType}</span>
                                    <span className="font-medium">{entry.contentName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>{entry.changedByName}</span>
                                    <span>{new Date(entry.changedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
