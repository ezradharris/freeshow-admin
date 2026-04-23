import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getShowHistory, restoreShowHistory } from "@/server/history"

interface HistoryEntry {
    id: string
    changedAt: Date | string
    changedByName: string | null
}

interface ShowHistorySidebarProps {
    showId: string
    onRestore: () => void
}

export function ShowHistorySidebar({ showId, onRestore }: ShowHistorySidebarProps) {
    const [entries, setEntries] = useState<HistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [restoringId, setRestoringId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        getShowHistory({ data: { showId } })
            .then((data) => {
                if (!cancelled) {
                    setEntries(data)
                    setLoading(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Failed to load history")
                    setLoading(false)
                }
            })
        return () => { cancelled = true }
    }, [showId])

    async function handleRestore(historyId: string) {
        setRestoringId(historyId)
        try {
            await restoreShowHistory({ data: { showId, historyId } })
            onRestore()
        } catch {
            setError("Restore failed")
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <div className="border rounded-lg p-4 bg-card space-y-3">
            <h3 className="text-sm font-semibold">Change history</h3>

            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && entries.length === 0 && (
                <p className="text-sm text-muted-foreground">No history yet.</p>
            )}

            <div className="space-y-2">
                {entries.map(entry => (
                    <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0"
                    >
                        <div className="min-w-0">
                            <p className="text-xs text-foreground">
                                {new Date(entry.changedAt).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {entry.changedByName ?? "Unknown"}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(entry.id)}
                            disabled={restoringId === entry.id}
                        >
                            {restoringId === entry.id ? "Restoring..." : "Restore"}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
