import { useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Button } from "@/components/ui/button"

type HistoryEntry = {
    id: string
    contentType: string
    contentId: string
    contentName: string
    changedByName: string | null
    changedAt: string
}

export const Route = createFileRoute("/history")({
    loader: async () => {
        const res = await fetch("/api/history?limit=200")
        const data = await res.json()
        return { entries: Array.isArray(data) ? (data as HistoryEntry[]) : [] }
    },
    component: HistoryPage,
})

function HistoryPage() {
    const { entries } = Route.useLoaderData()
    const [typeFilter, setTypeFilter] = useState<"all" | "song" | "show">("all")
    const [userFilter, setUserFilter] = useState("")
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
    const [restoring, setRestoring] = useState(false)
    const [restoreSuccess, setRestoreSuccess] = useState(false)

    const filtered = entries.filter(e => {
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
        estimateSize: () => 56,
        overscan: 5,
    })

    async function handleRestore() {
        if (!selectedEntry) return
        setRestoring(true)
        setRestoreSuccess(false)
        try {
            const endpoint =
                selectedEntry.contentType === "song"
                    ? `/api/songs/${selectedEntry.contentId}/history`
                    : `/api/shows/${selectedEntry.contentId}/history`
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ historyId: selectedEntry.id }),
            })
            if (res.ok) {
                setRestoreSuccess(true)
                setTimeout(() => {
                    setSelectedEntry(null)
                    setRestoreSuccess(false)
                }, 1500)
            } else {
                alert("Restore failed")
            }
        } finally {
            setRestoring(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">History Timeline</h1>
                <span className="text-sm text-muted-foreground">
                    {filtered.length} of {entries.length} entries
                </span>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <select
                    value={typeFilter}
                    onChange={e =>
                        setTypeFilter(e.target.value as "all" | "song" | "show")
                    }
                    className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="all">All Types</option>
                    <option value="song">Songs</option>
                    <option value="show">Shows</option>
                </select>
                <input
                    type="text"
                    placeholder="Filter by user..."
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
                        Clear filters
                    </Button>
                )}
            </div>

            {/* Virtualized list */}
            {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">
                    No history entries found.
                </p>
            ) : (
                <div
                    ref={parentRef}
                    className="h-[calc(100vh-200px)] overflow-auto border rounded-lg"
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
                                    className="flex items-center px-4 gap-4 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                                            entry.contentType === "song"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                        }`}
                                    >
                                        {entry.contentType}
                                    </span>
                                    <span className="font-medium text-sm flex-1 truncate">
                                        {entry.contentName}
                                    </span>
                                    <span className="text-muted-foreground text-sm hidden sm:block shrink-0">
                                        {entry.changedByName ?? "—"}
                                    </span>
                                    <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0">
                                        {new Date(entry.changedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Modal */}
            {selectedEntry && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        if (!restoring) setSelectedEntry(null)
                    }}
                >
                    <div
                        className="bg-background border rounded-lg p-6 max-w-md w-full space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold">History Entry</h2>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Content:</span>{" "}
                                <span className="capitalize">{selectedEntry.contentType}</span>{" "}
                                — {selectedEntry.contentName}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Changed by:</span>{" "}
                                {selectedEntry.changedByName ?? "Unknown"}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Date:</span>{" "}
                                {new Date(selectedEntry.changedAt).toLocaleString()}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Entry ID:</span>{" "}
                                <span className="font-mono text-xs">{selectedEntry.id}</span>
                            </div>
                        </div>
                        {restoreSuccess && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                Restored successfully.
                            </p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedEntry(null)}
                                disabled={restoring}
                            >
                                Close
                            </Button>
                            <Button onClick={handleRestore} disabled={restoring || restoreSuccess}>
                                {restoring ? "Restoring..." : "Restore"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
