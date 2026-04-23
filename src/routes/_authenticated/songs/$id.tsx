// src/routes/_authenticated/songs/$id.tsx
import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MetadataPanel } from "@/components/song-editor/metadata-panel"
import { SectionList } from "@/components/song-editor/section-list"
import { HistorySidebar } from "@/components/song-editor/history-sidebar"
import { SharePanel } from "@/components/song-editor/share-panel"
import type { SongSection, Settings } from "@/components/song-editor/section-item"
import { getSong, updateSong } from "@/server/songs"
import { getSettings } from "@/server/settings"

type SongData = {
    id: string
    title: string
    author: string | null
    copyright: string | null
    ccliNumber: string | null
    sections: SongSection[]
}

export const Route = createFileRoute("/_authenticated/songs/$id" as any)({
    loader: async ({ params }) => {
        const [song, settings] = await Promise.all([
            getSong({ data: { id: params.id } }),
            getSettings(),
        ])
        return { song: song as SongData, settings: settings as Settings }
    },
    component: SongEditorPage,
})

function SongEditorPage() {
    const { song: initialSong, settings } = Route.useLoaderData() as { song: SongData; settings: Settings }
    const [song, setSong] = useState<SongData>(initialSong)
    const [saving, setSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showShare, setShowShare] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            await updateSong({
                data: {
                    id: song.id,
                    title: song.title,
                    author: song.author,
                    copyright: song.copyright,
                    ccliNumber: song.ccliNumber,
                    sections: song.sections.map((s: SongSection, i: number) => ({ ...s, sortOrder: i })),
                },
            })
            toast.success("Saved")
        } catch {
            toast.error("Failed to save")
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
                    <h1 className="text-xl font-bold">{song.title || "Untitled"}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>History</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowShare(!showShare)}>Share</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MetadataPanel
                        title={song.title}
                        author={song.author ?? ""}
                        copyright={song.copyright ?? ""}
                        ccliNumber={song.ccliNumber ?? ""}
                        onChange={(field, value) => setSong(prev => ({ ...prev, [field]: value }))}
                    />
                    <SectionList
                        sections={song.sections}
                        onChange={(sections) => setSong((s) => ({ ...s, sections }))}
                        settings={settings}
                    />
                    <Button
                        variant="outline"
                        onClick={() =>
                            setSong(prev => ({
                                ...prev,
                                sections: [
                                    ...prev.sections,
                                    { type: "verse", label: "New Section", content: "", sortOrder: prev.sections.length },
                                ],
                            }))
                        }
                    >
                        + Add Section
                    </Button>
                </div>
                <div className="space-y-4">
                    {showHistory && <HistorySidebar songId={song.id} onRestore={() => window.location.reload()} />}
                    {showShare && <SharePanel songId={song.id} />}
                </div>
            </div>
        </div>
    )
}
