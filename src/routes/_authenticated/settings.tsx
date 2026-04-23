import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getSettings, updateSettings } from "@/server/settings"

type Settings = {
    max_line_chars: number
    warn_line_chars: number
    auto_line_break: boolean
    line_break_strategy: "word" | "char"
}

export const Route = createFileRoute("/_authenticated/settings" as any)({
    loader: async () => {
        const data = await getSettings()
        return { settings: data as Partial<Settings> }
    },
    component: SettingsPage,
})

function SettingsPage() {
    const { settings: initial } = Route.useLoaderData()
    const [values, setValues] = useState<Settings>({
        max_line_chars: (initial.max_line_chars as number) ?? 50,
        warn_line_chars: (initial.warn_line_chars as number) ?? 40,
        auto_line_break: (initial.auto_line_break as boolean) ?? false,
        line_break_strategy: (initial.line_break_strategy as "word" | "char") ?? "word",
    })
    const [saving, setSaving] = useState(false)

    const warnError =
        values.warn_line_chars >= values.max_line_chars
            ? "Warn limit must be less than max limit"
            : null

    async function handleSave() {
        if (warnError) return
        setSaving(true)
        try {
            await updateSettings({ data: values as unknown as Record<string, unknown> })
            toast.success("Settings saved")
        } catch {
            toast.error("Failed to save settings")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-lg space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="border rounded-lg p-6 space-y-6">
                <div>
                    <h2 className="text-base font-semibold">Line length validation</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control when the song editor warns about lyrics lines that may not display correctly on screen.
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="max_line_chars">
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
                                max_line_chars: parseInt(e.target.value, 10) || 50,
                            }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="warn_line_chars">
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
                                warn_line_chars: parseInt(e.target.value, 10) || 40,
                            }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    />
                    {warnError && (
                        <p className="text-xs text-destructive">{warnError}</p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium" htmlFor="auto_line_break">
                            Auto line break on paste
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Suggest line breaks when pasting text that exceeds max length
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

                {values.auto_line_break && (
                    <div className="space-y-1">
                        <label className="text-sm font-medium" htmlFor="line_break_strategy">
                            Break strategy
                        </label>
                        <select
                            id="line_break_strategy"
                            value={values.line_break_strategy}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    line_break_strategy: e.target.value as "word" | "char",
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

            <Button
                onClick={handleSave}
                disabled={saving || !!warnError}
                className="w-full"
            >
                {saving ? "Saving…" : "Save Settings"}
            </Button>
        </div>
    )
}
