import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/monaco-editor"
import { ShowHistorySidebar } from "@/components/show-history-sidebar"
import { getShow, updateShow } from "@/server/shows"

type ShowRecord = {
    id: string
    name: string
    type: string
    rawJson: unknown
    updatedAt: Date
}

export const Route = createFileRoute("/_authenticated/shows/$id" as any)({
    loader: async ({ params }) => {
        const show = await getShow({ data: { id: params.id } })
        return { show: show as ShowRecord }
    },
    component: ShowEditorPage,
})

function ShowEditorPage() {
    const { show: initialShow } = Route.useLoaderData()
    const [show] = useState<ShowRecord>(initialShow)
    const [rawJsonString, setRawJsonString] = useState(
        JSON.stringify(initialShow.rawJson, null, 2)
    )
    const [saving, setSaving] = useState(false)
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [showHistory, setShowHistory] = useState(false)

    async function handleSave() {
        let parsedJson: unknown
        try {
            parsedJson = JSON.parse(rawJsonString)
            setJsonError(null)
        } catch {
            setJsonError("Invalid JSON — fix before saving")
            return
        }
        setSaving(true)
        try {
            await updateShow({ data: { id: show.id, name: show.name, rawJson: parsedJson } })
            toast.success("Saved")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/shows">← Shows</Link>
                    </Button>
                    <h1 className="text-xl font-bold">{show.name}</h1>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        History
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {jsonError && (
                        <p className="text-destructive text-sm mb-2">{jsonError}</p>
                    )}
                    <MonacoEditor
                        value={rawJsonString}
                        onChange={setRawJsonString}
                        height="60vh"
                    />
                </div>
                <div>
                    {showHistory && (
                        <ShowHistorySidebar
                            showId={show.id}
                            onRestore={() => window.location.reload()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
