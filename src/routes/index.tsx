import { createFileRoute, Link } from "@tanstack/react-router"
import { Music, MonitorPlay, FolderOpen, Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/database/db"
import { songs, shows, contentHistory } from "@/database/schema"
import { users } from "@/../auth-schema"
import { desc, eq } from "drizzle-orm"

export const Route = createFileRoute("/")({
    loader: async () => {
        const [allSongs, allShows, historyEntries] = await Promise.all([
            db.select({ id: songs.id, title: songs.title, author: songs.author, ccliNumber: songs.ccliNumber, createdAt: songs.createdAt, updatedAt: songs.updatedAt })
                .from(songs).orderBy(desc(songs.updatedAt)),
            db.select({ id: shows.id, name: shows.name, type: shows.type, createdAt: shows.createdAt, updatedAt: shows.updatedAt })
                .from(shows).orderBy(desc(shows.updatedAt)),
            db.select({
                id: contentHistory.id,
                contentType: contentHistory.contentType,
                contentId: contentHistory.contentId,
                changedByName: users.name,
                changedAt: contentHistory.changedAt,
            })
            .from(contentHistory)
            .innerJoin(users, eq(contentHistory.changedBy, users.id))
            .orderBy(desc(contentHistory.changedAt))
            .limit(10),
        ])
        return {
            songs: allSongs,
            shows: allShows,
            history: historyEntries,
        }
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

    const songMap = new Map(songs.map(s => [s.id, s.title]))
    const showMap = new Map(shows.map(s => [s.id, s.name]))

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
                    <Link to="/import">
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
                        {history.map((entry) => {
                            const contentName = entry.contentType === "song"
                                ? (songMap.get(entry.contentId) ?? "Unknown Song")
                                : (showMap.get(entry.contentId) ?? "Unknown Show")
                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground capitalize">{entry.contentType}</span>
                                        <span className="font-medium">{contentName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <span>{entry.changedByName}</span>
                                        <span>{new Date(entry.changedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
