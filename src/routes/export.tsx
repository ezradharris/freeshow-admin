import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

type Song = {
    id: string
    title: string
}

type ShowItem = {
    id: string
    name: string
    type: string
}

export const Route = createFileRoute("/export")({
    loader: async () => {
        const [songsRes, showsRes] = await Promise.all([
            fetch("/api/songs/"),
            fetch("/api/shows/"),
        ])
        const songs = (await songsRes.json()) as Song[]
        const allShows = (await showsRes.json()) as ShowItem[]
        return {
            songs: Array.isArray(songs) ? songs : [],
            shows: Array.isArray(allShows) ? allShows.filter(s => s.type === "show") : [],
            projects: Array.isArray(allShows) ? allShows.filter(s => s.type === "project") : [],
        }
    },
    component: ExportPage,
})

function ExportPage() {
    const { songs, shows, projects } = Route.useLoaderData()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [exporting, setExporting] = useState(false)

    function toggleItem(type: string, id: string) {
        const key = `${type}:${id}`
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    async function handleExport() {
        if (!selected.size) return
        setExporting(true)
        try {
            const items = Array.from(selected).map(k => {
                const [type, ...rest] = k.split(":")
                return { type, id: rest.join(":") }
            })
            const res = await fetch("/api/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            })
            if (!res.ok) {
                alert("Export failed")
                return
            }

            const blob = await res.blob()
            const contentDisposition = res.headers.get("Content-Disposition") ?? ""
            const filenameMatch = contentDisposition.match(
                /filename\*?=(?:UTF-8'')?([^;]+)/i,
            )
            const filename = filenameMatch
                ? decodeURIComponent(filenameMatch[1].replace(/"/g, ""))
                : "freeshow-export.zip"
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = filename
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setExporting(false)
        }
    }

    const sections = [
        {
            label: "Songs",
            type: "song",
            items: songs.map(s => ({ id: s.id, name: s.title })),
        },
        {
            label: "Shows",
            type: "show",
            items: shows.map(s => ({ id: s.id, name: s.name })),
        },
        {
            label: "Projects",
            type: "project",
            items: projects.map(s => ({ id: s.id, name: s.name })),
        },
    ]

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Export FreeShow Files</h1>
                <Button onClick={handleExport} disabled={exporting || !selected.size}>
                    {exporting
                        ? "Exporting..."
                        : `Export ${selected.size} item${selected.size === 1 ? "" : "s"}`}
                </Button>
            </div>

            {sections.map(
                section =>
                    section.items.length > 0 && (
                        <div key={section.type} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">
                                    {section.label} ({section.items.length})
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const allKeys = section.items.map(
                                            i => `${section.type}:${i.id}`,
                                        )
                                        const allSelected = allKeys.every(k => selected.has(k))
                                        setSelected(prev => {
                                            const next = new Set(prev)
                                            if (allSelected) allKeys.forEach(k => next.delete(k))
                                            else allKeys.forEach(k => next.add(k))
                                            return next
                                        })
                                    }}
                                >
                                    {section.items.every(i =>
                                        selected.has(`${section.type}:${i.id}`),
                                    )
                                        ? "Deselect All"
                                        : "Select All"}
                                </Button>
                            </div>
                            {section.items.map(item => (
                                <label
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(`${section.type}:${item.id}`)}
                                        onChange={() => toggleItem(section.type, item.id)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{item.name}</span>
                                </label>
                            ))}
                        </div>
                    ),
            )}

            {sections.every(s => s.items.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-8">
                    No content available to export.
                </p>
            )}
        </div>
    )
}
