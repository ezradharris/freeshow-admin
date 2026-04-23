import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getSongs } from "@/server/songs"
import { getShows } from "@/server/shows"
import { getExportData } from "@/server/export"

type Song = {
    id: string
    title: string
}

type ShowItem = {
    id: string
    name: string
    type: string
}

export const Route = createFileRoute("/_authenticated/export" )({
    loader: async () => {
        const [allSongs, allShows] = await Promise.all([
            getSongs(),
            getShows({ data: {} }),
        ])
        return {
            songs: allSongs as Song[],
            shows: allShows.filter((s) => s.type === "show") as ShowItem[],
            projects: allShows.filter((s) => s.type === "project") as ShowItem[],
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
            const items = Array.from(selected).map((k) => {
                const [type, ...rest] = k.split(":")
                return { type, id: rest.join(":") }
            })
            const files = await getExportData({ data: { items } })
            if (!files.length) { toast.error("No valid items found"); return }
            if (files.length === 1) {
                const blob = new Blob([files[0].content], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url; a.download = files[0].name; a.click()
                URL.revokeObjectURL(url)
            } else {
                const JSZip = (await import("jszip")).default
                const zip = new JSZip()
                for (const f of files) zip.file(f.name, f.content)
                const blob = await zip.generateAsync({ type: "blob" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url; a.download = "chronicles-export.zip"; a.click()
                URL.revokeObjectURL(url)
            }
        } catch {
            toast.error("Export failed")
        } finally {
            setExporting(false)
        }
    }

    const sections: Array<{ label: string; type: string; items: Array<{ id: string; name: string }> }> = [
        {
            label: "Songs",
            type: "song",
            items: songs.map((s: Song) => ({ id: s.id, name: s.title })),
        },
        {
            label: "Shows",
            type: "show",
            items: shows.map((s: ShowItem) => ({ id: s.id, name: s.name })),
        },
        {
            label: "Projects",
            type: "project",
            items: projects.map((s: ShowItem) => ({ id: s.id, name: s.name })),
        },
    ]

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Export</h1>
                <Button onClick={handleExport} disabled={exporting || !selected.size}>
                    {exporting
                        ? "Exporting…"
                        : selected.size > 0
                          ? `Export ${selected.size} item${selected.size === 1 ? "" : "s"}`
                          : "Export"}
                </Button>
            </div>

            {sections.map(
                section =>
                    section.items.length > 0 && (
                        <div key={section.type} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                <h2 className="text-sm font-semibold">
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
                                        ? "Deselect all"
                                        : "Select all"}
                                </Button>
                            </div>
                            <div className="divide-y divide-border">
                                {section.items.map(item => (
                                    <label
                                        key={item.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
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
                        </div>
                    ),
            )}

            {sections.every(s => s.items.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-8">
                    Nothing to export yet.
                </p>
            )}
        </div>
    )
}
