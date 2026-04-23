import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createShare } from "@/server/shares"

interface SharePanelProps {
    songId: string
}

export function SharePanel({ songId }: SharePanelProps) {
    const [shareUrl, setShareUrl] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleCreateShare() {
        setCreating(true)
        setError(null)
        try {
            const data = await createShare({ data: { songId } })
            setShareUrl(window.location.origin + data.shareUrl)
        } catch {
            setError("Failed to create share link")
        } finally {
            setCreating(false)
        }
    }

    async function copyToClipboard() {
        if (!shareUrl) return
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="border rounded-lg p-4 bg-card space-y-3">
            <h3 className="text-sm font-semibold">Share song</h3>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {shareUrl ? (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Share link created:</p>
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={shareUrl}
                            className="flex-1 h-8 rounded-md border border-input bg-muted px-2 text-xs font-mono focus:outline-none"
                        />
                        <Button size="sm" variant="outline" onClick={copyToClipboard}>
                            {copied ? "Copied!" : "Copy"}
                        </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleCreateShare} disabled={creating}>
                        Generate new link
                    </Button>
                </div>
            ) : (
                <Button size="sm" onClick={handleCreateShare} disabled={creating}>
                    {creating ? "Creating…" : "Create Share Link"}
                </Button>
            )}
        </div>
    )
}
