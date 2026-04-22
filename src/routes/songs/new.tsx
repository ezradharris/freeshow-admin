import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MetadataPanel } from "@/components/song-editor/metadata-panel"
import { SectionList } from "@/components/song-editor/section-list"
import type { SongSection, Settings } from "@/components/song-editor/section-item"

export const Route = createFileRoute("/songs/new")({
    loader: async () => {
        const res = await fetch("/api/settings")
        const settings = await res.json() as Settings
        return { settings }
    },
    component: NewSongPage,
})

function NewSongPage() {
    const { settings } = Route.useLoaderData()
    const navigate = useNavigate()
    const [song, setSong] = useState({
        title: "",
        author: "",
        copyright: "",
        ccliNumber: "",
        sections: [] as SongSection[],
    })
    const [saving, setSaving] = useState(false)
    const [titleError, setTitleError] = useState(false)

    async function handleSave() {
        if (!song.title.trim()) {
            setTitleError(true)
            return
        }
        setTitleError(false)
        setSaving(true)
        try {
            const res = await fetch("/api/songs/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...song,
                    sections: song.sections.map((s, i) => ({ ...s, sortOrder: i })),
                }),
            })
            const data = await res.json() as { id: string }
            await navigate({ to: "/songs/$id", params: { id: data.id } })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/songs">← Songs</Link>
                    </Button>
                    <h1 className="text-xl font-bold">New Song</h1>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Creating…" : "Save & Create"}
                    </Button>
                </div>
            </div>

            {titleError && (
                <p className="mb-4 text-sm text-destructive">Title is required before saving.</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MetadataPanel
                        title={song.title}
                        author={song.author}
                        copyright={song.copyright}
                        ccliNumber={song.ccliNumber}
                        onChange={(field, value) => setSong(prev => ({ ...prev, [field]: value }))}
                    />
                    <SectionList
                        sections={song.sections}
                        onChange={sections => setSong(prev => ({ ...prev, sections }))}
                        settings={settings}
                    />
                    <Button
                        variant="outline"
                        onClick={() =>
                            setSong(prev => ({
                                ...prev,
                                sections: [
                                    ...prev.sections,
                                    {
                                        type: "verse",
                                        label: "New Section",
                                        content: "",
                                        sortOrder: prev.sections.length,
                                    },
                                ],
                            }))
                        }
                    >
                        + Add Section
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-card text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Tip</p>
                        <p>Add a title and sections, then click "Save & Create" to create the song.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
