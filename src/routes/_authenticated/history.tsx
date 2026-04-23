import { useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useVirtualizer } from "@tanstack/react-virtual"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getHistory, restoreSongHistory, restoreShowHistory } from "@/server/history"

type HistoryEntry = {
    id: string
    contentType: string
    contentId: string
    contentName: string
    changedByName: string | null
    changedAt: Date
}

export const Route = createFileRoute("/_authenticated/history")({
    loader: async () => {
        const entries = await getHistory({ data: { limit: 200 } })
        return { entries: entries as HistoryEntry[] }
    },
    component: HistoryPage,
})

function HistoryPage() {
    const { entries } = Route.useLoaderData()
    const [typeFilter, setTypeFilter] = useState<"all" | "song" | "show">("all")
    const [userFilter, setUserFilter] = useState("")
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
    const [restoring, setRestoring] = useState(false)

    const filtered = (entries as HistoryEntry[]).filter((e: HistoryEntry) => {
        if (typeFilter !== "all" && e.contentType !== typeFilter) return false
        if (
            userFilter &&
            !(e.changedByName?.toLowerCase().includes(userFilter.toLowerCase()))
        )
            return false
        return true
    })

    const parentRef = useRef<HTMLDivElement>(null)
    const rowVirtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 52,
        overscan: 5,
    })

    async function handleRestore() {
        if (!selectedEntry) return
        setRestoring(true)
        try {
            if (selectedEntry.contentType === "song") {
                await restoreSongHistory({ data: { songId: selectedEntry.contentId, historyId: selectedEntry.id } })
            } else {
                await restoreShowHistory({ data: { showId: selectedEntry.contentId, historyId: selectedEntry.id } })
            }
            toast.success("Restored successfully")
            setSelectedEntry(null)
        } catch {
            toast.error("Restore failed")
        } finally {
            setRestoring(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">History</h1>
                <span className="text-sm text-muted-foreground tabular-nums">
                    {filtered.length} of {entries.length}
                </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <select
                    value={typeFilter}
                    onChange={e =>
                        setTypeFilter(e.target.value as "all" | "song" | "show")
                    }
                    className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="all">All types</option>
                    <option value="song">Songs</option>
                    <option value="show">Shows</option>
                </select>
                <input
                    type="text"
                    placeholder="Filter by user…"
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                />
                {(typeFilter !== "all" || userFilter) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setTypeFilter("all")
                            setUserFilter("")
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">
                    No history entries.
                </p>
            ) : (
                <div
                    ref={parentRef}
                    className="h-[calc(100vh-220px)] overflow-auto border rounded-lg"
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const entry = filtered[virtualRow.index]
                            return (
                                <div
                                    key={virtualRow.index}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className="flex items-center px-4 gap-4 border-b cursor-pointer hover:bg-muted/40 transition-colors"
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0 w-10">
                                        {entry.contentType}
                                    </span>
                                    <span className="font-medium text-sm flex-1 truncate">
                                        {entry.contentName}
                                    </span>
                                    <span className="text-muted-foreground text-sm hidden sm:block shrink-0">
                                        {entry.changedByName ?? "—"}
                                    </span>
                                    <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 tabular-nums">
                                        {new Date(entry.changedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {selectedEntry && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        if (!restoring) setSelectedEntry(null)
                    }}
                >
                    <div
                        className="bg-background border rounded-lg p-6 max-w-md w-full space-y-4 shadow-lg"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold">Restore this version?</h2>
                        <div className="space-y-1.5 text-sm">
                            <p>
                                <span className="text-muted-foreground">Content: </span>
                                <span className="capitalize">{selectedEntry.contentType}</span>
                                {" — "}
                                <span className="font-medium">{selectedEntry.contentName}</span>
                            </p>
                            <p>
                                <span className="text-muted-foreground">Changed by: </span>
                                {selectedEntry.changedByName ?? "Unknown"}
                            </p>
                            <p>
                                <span className="text-muted-foreground">Date: </span>
                                {new Date(selectedEntry.changedAt).toLocaleString()}
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This will overwrite the current version.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedEntry(null)}
                                disabled={restoring}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleRestore} disabled={restoring}>
                                {restoring ? "Restoring…" : "Restore"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
