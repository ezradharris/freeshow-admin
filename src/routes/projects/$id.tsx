import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/monaco-editor"
import { ShowHistorySidebar } from "@/components/show-history-sidebar"

type ProjectRecord = {
    id: string
    name: string
    type: string
    rawJson: unknown
    updatedAt: string
}

export const Route = createFileRoute("/projects/$id")({
    loader: async ({ params }) => {
        const res = await fetch(`/api/shows/${params.id}`)
        if (!res.ok) throw new Error("Project not found")
        const project = await res.json() as ProjectRecord
        return { project }
    },
    component: ProjectEditorPage,
})

function ProjectEditorPage() {
    const { project: initialProject } = Route.useLoaderData()
    const [project] = useState<ProjectRecord>(initialProject)
    const [rawJsonString, setRawJsonString] = useState(
        JSON.stringify(initialProject.rawJson, null, 2)
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
            setJsonError("Invalid JSON — please fix before saving")
            return
        }
        setSaving(true)
        try {
            const res = await fetch(`/api/shows/${project.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: project.name, rawJson: parsedJson }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Save failed" })) as { error?: string }
                alert(err.error ?? "Failed to save")
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/projects">← Projects</Link>
                    </Button>
                    <h1 className="text-xl font-bold">{project.name}</h1>
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
                        {saving ? "Saving..." : "Save"}
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
                            showId={project.id}
                            onRestore={() => window.location.reload()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
