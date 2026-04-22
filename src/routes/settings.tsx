import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

type Settings = {
    max_line_chars: number
    warn_line_chars: number
    auto_line_break: boolean
    line_break_strategy: "word" | "char"
}

export const Route = createFileRoute("/settings")({
    loader: async () => {
        const res = await fetch("/api/settings")
        const data = (await res.json()) as Partial<Settings>
        return { settings: data }
    },
    component: SettingsPage,
})

function SettingsPage() {
    const { settings: initial } = Route.useLoaderData()
    const [values, setValues] = useState<Settings>({
        max_line_chars: initial.max_line_chars ?? 50,
        warn_line_chars: initial.warn_line_chars ?? 40,
        auto_line_break: initial.auto_line_break ?? false,
        line_break_strategy: initial.line_break_strategy ?? "word",
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const warnError =
        values.warn_line_chars >= values.max_line_chars
            ? "Warn limit must be less than max limit"
            : null

    async function handleSave() {
        if (warnError) return
        setSaving(true)
        setSaved(false)
        setError(null)
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })
            if (!res.ok) {
                const err = (await res
                    .json()
                    .catch(() => ({ error: "Save failed" }))) as {
                    error?: string
                }
                setError(err.error ?? "Failed to save settings")
            } else {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-lg space-y-8">
            <h1 className="text-2xl font-bold">Settings</h1>

            <div className="border rounded-lg p-6 space-y-6">
                <h2 className="font-semibold">Line Length Validation</h2>
                <p className="text-sm text-muted-foreground">
                    Control when the song editor shows warnings about lyrics
                    lines that may not display correctly on screen.
                </p>

                {/* max_line_chars */}
                <div className="space-y-1">
                    <label
                        className="text-sm font-medium"
                        htmlFor="max_line_chars"
                    >
                        Max line length (characters)
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Lines at or above this length show a red error
                    </p>
                    <input
                        id="max_line_chars"
                        type="number"
                        min={1}
                        max={500}
                        value={values.max_line_chars}
                        onChange={(e) =>
                            setValues((prev) => ({
                                ...prev,
                                max_line_chars:
                                    parseInt(e.target.value, 10) || 50,
                            }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                </div>

                {/* warn_line_chars */}
                <div className="space-y-1">
                    <label
                        className="text-sm font-medium"
                        htmlFor="warn_line_chars"
                    >
                        Warn line length (characters)
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Lines at or above this length show a yellow warning
                    </p>
                    <input
                        id="warn_line_chars"
                        type="number"
                        min={1}
                        max={500}
                        value={values.warn_line_chars}
                        onChange={(e) =>
                            setValues((prev) => ({
                                ...prev,
                                warn_line_chars:
                                    parseInt(e.target.value, 10) || 40,
                            }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                    {warnError && (
                        <p className="text-xs text-destructive">{warnError}</p>
                    )}
                </div>

                {/* auto_line_break */}
                <div className="flex items-center justify-between">
                    <div>
                        <label
                            className="text-sm font-medium"
                            htmlFor="auto_line_break"
                        >
                            Auto line break on paste
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Suggest line breaks when pasting text that exceeds
                            max length
                        </p>
                    </div>
                    <input
                        id="auto_line_break"
                        type="checkbox"
                        checked={values.auto_line_break}
                        onChange={(e) =>
                            setValues((prev) => ({
                                ...prev,
                                auto_line_break: e.target.checked,
                            }))
                        }
                        className="h-4 w-4 rounded border-input"
                    />
                </div>

                {/* line_break_strategy */}
                {values.auto_line_break && (
                    <div className="space-y-1">
                        <label
                            className="text-sm font-medium"
                            htmlFor="line_break_strategy"
                        >
                            Break strategy
                        </label>
                        <select
                            id="line_break_strategy"
                            value={values.line_break_strategy}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    line_break_strategy: e.target
                                        .value as "word" | "char",
                                }))
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                            <option value="word">Word boundary</option>
                            <option value="char">Character boundary</option>
                        </select>
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && (
                <p className="text-sm text-green-600">Settings saved</p>
            )}

            <Button
                onClick={handleSave}
                disabled={saving || !!warnError}
                className="w-full"
            >
                {saving ? "Saving..." : "Save Settings"}
            </Button>
        </div>
    )
}
