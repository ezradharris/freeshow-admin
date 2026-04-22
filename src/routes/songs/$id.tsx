import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { MetadataPanel } from "@/components/song-editor/metadata-panel"
import { SectionList } from "@/components/song-editor/section-list"
import { HistorySidebar } from "@/components/song-editor/history-sidebar"
import { SharePanel } from "@/components/song-editor/share-panel"
import type { SongSection, Settings } from "@/components/song-editor/section-item"
import { db } from "@/database/db"
import { songs, songSections, settings as settingsTable } from "@/database/schema"
import { eq, asc } from "drizzle-orm"

type SongData = {
    id: string
    title: string
    author: string | null
    copyright: string | null
    ccliNumber: string | null
    sections: SongSection[]
}

export const Route = createFileRoute("/songs/$id")({
    loader: async ({ params }) => {
        const [songRows, sectionRows, allSettings] = await Promise.all([
            db.select().from(songs).where(eq(songs.id, params.id)).limit(1),
            db.select().from(songSections).where(eq(songSections.songId, params.id)).orderBy(asc(songSections.sortOrder)),
            db.select().from(settingsTable),
        ])
        if (!songRows.length) throw new Error("Song not found")
        const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]))
        return { song: { ...songRows[0], sections: sectionRows } as SongData, settings: settingsMap as Settings }
    },
    component: SongEditorPage,
})

function SongEditorPage() {
    const { song: initialSong, settings } = Route.useLoaderData()
    const [song, setSong] = useState<SongData>(initialSong)
    const [saving, setSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showShare, setShowShare] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            const res = await fetch(`/api/songs/${song.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: song.title,
                    author: song.author,
                    copyright: song.copyright,
                    ccliNumber: song.ccliNumber,
                    sections: song.sections.map((s: SongSection, i: number) => ({ ...s, sortOrder: i })),
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Save failed" })) as { error?: string }
                alert(err.error ?? "Failed to save song")
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
                        <Link to="/songs">← Songs</Link>
                    </Button>
                    <h1 className="text-xl font-bold">{song.title || "Untitled"}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                        History
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowShare(!showShare)}>
                        Share
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <MetadataPanel
                        title={song.title ?? ""}
                        author={song.author ?? ""}
                        copyright={song.copyright ?? ""}
                        ccliNumber={song.ccliNumber ?? ""}
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
                    {showHistory && (
                        <HistorySidebar songId={song.id} onRestore={() => window.location.reload()} />
                    )}
                    {showShare && <SharePanel songId={song.id} />}
                </div>
            </div>
        </div>
    )
}
