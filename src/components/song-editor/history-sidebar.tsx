import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface HistoryEntry {
    id: string
    createdAt: string
    userId: string | null
    userEmail?: string | null
}

interface HistorySidebarProps {
    songId: string
    onRestore: () => void
}

export function HistorySidebar({ songId, onRestore }: HistorySidebarProps) {
    const [entries, setEntries] = useState<HistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [restoringId, setRestoringId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetch(`/api/songs/${songId}/history`)
            .then(r => r.json())
            .then((data: unknown) => {
                if (!cancelled) {
                    setEntries(Array.isArray(data) ? (data as HistoryEntry[]) : [])
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
    }, [songId])

    async function handleRestore(historyId: string) {
        setRestoringId(historyId)
        try {
            await fetch(`/api/songs/${songId}/history`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ historyId }),
            })
            onRestore()
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <div className="border rounded-lg p-4 bg-card space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change History</h3>

            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && entries.length === 0 && (
                <p className="text-sm text-muted-foreground">No history yet.</p>
            )}

            <div className="space-y-2">
                {entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0">
                        <div className="min-w-0">
                            <p className="text-xs text-foreground">
                                {new Date(entry.createdAt).toLocaleString()}
                            </p>
                            {(entry.userEmail ?? entry.userId) && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {entry.userEmail ?? entry.userId}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(entry.id)}
                            disabled={restoringId === entry.id}
                        >
                            {restoringId === entry.id ? "Restoring…" : "Restore"}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
