import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { newShowTemplate } from "@/lib/freeshow"

export const Route = createFileRoute("/shows/new")({
    component: NewShowPage,
})

function NewShowPage() {
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [saving, setSaving] = useState(false)
    const [nameError, setNameError] = useState(false)

    async function handleCreate() {
        if (!name.trim()) {
            setNameError(true)
            return
        }
        setNameError(false)
        setSaving(true)
        try {
            const res = await fetch("/api/shows/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    type: "show",
                    rawJson: newShowTemplate(name.trim()),
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Create failed" })) as { error?: string }
                alert(err.error ?? "Failed to create show")
                return
            }
            const data = await res.json() as { id: string }
            await navigate({ to: "/shows/$id", params: { id: data.id } })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link to="/shows">← Shows</Link>
                </Button>
                <h1 className="text-xl font-bold">New Show</h1>
            </div>

            <div className="border rounded-lg p-6 bg-card space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="show-name">
                        Show Name
                    </label>
                    <input
                        id="show-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
                        placeholder="Enter show name..."
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                    />
                    {nameError && (
                        <p className="mt-1 text-sm text-destructive">Name is required.</p>
                    )}
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                    {saving ? "Creating..." : "Create Show"}
                </Button>
            </div>
        </div>
    )
}
