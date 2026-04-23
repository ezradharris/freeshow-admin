import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { getShows } from "@/server/shows"

type Project = {
    id: string
    name: string
    type: string
    updatedAt: Date
}

export const Route = createFileRoute("/_authenticated/projects/")({
    loader: async () => {
        const projects = await getShows({ data: { type: "project" } })
        return { projects }
    },
    component: ProjectsPage,
})

function ProjectsPage() {
    const { projects } = Route.useLoaderData()
    const [search, setSearch] = useState("")

    const filtered = projects.filter((p: Project) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                <Button asChild>
                    <Link to="/projects/new">+ New project</Link>
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
                    {projects.length === 0
                        ? "No projects yet. Create one or import from FreeShow."
                        : "Nothing matches that search."}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {filtered.map((project: Project) => (
                        <Link
                            key={project.id}
                            to="/projects/$id"
                            params={{ id: project.id }}
                            className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 transition-colors rounded-sm group"
                        >
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                                {project.name}
                            </p>
                            <div className="text-xs text-muted-foreground shrink-0 ml-4 tabular-nums">
                                {new Date(project.updatedAt).toLocaleDateString()}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
