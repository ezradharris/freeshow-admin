import { Button } from "@/components/ui/button"

export type SongSection = {
    id?: string
    type: string
    label: string
    content: string
    sortOrder: number
}

export type Settings = {
    max_line_chars?: number
    warn_line_chars?: number
    auto_line_break?: boolean
    line_break_strategy?: string
}

interface SectionItemProps {
    section: SongSection
    index: number
    onChange: (updated: SongSection) => void
    onRemove: () => void
    settings: Settings
    dragHandleProps?: Record<string, unknown>
}

function validateLines(content: string, settings: Settings) {
    const maxChars = settings.max_line_chars ?? 50
    const warnChars = settings.warn_line_chars ?? 40
    return content.split("\n").map(line => ({
        line,
        status: line.length > maxChars ? "error" : line.length >= warnChars ? "warn" : "ok"
    }))
}

const SECTION_TYPES = ["verse", "chorus", "bridge", "tag", "pre-chorus", "outro", "intro", "custom"]

export function SectionItem({ section, index, onChange, onRemove, settings, dragHandleProps }: SectionItemProps) {
    const validatedLines = validateLines(section.content, settings)

    return (
        <div className="border rounded-lg p-4 bg-card space-y-3">
            <div className="flex items-center gap-2">
                <div
                    {...(dragHandleProps ?? {})}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground select-none px-1"
                    aria-label="Drag to reorder"
                >
                    ⠿
                </div>
                <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                <select
                    value={section.type}
                    onChange={e => onChange({ ...section, type: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {SECTION_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={section.label}
                    onChange={e => onChange({ ...section, label: e.target.value })}
                    placeholder="Label (e.g. Verse 1)"
                    className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button variant="destructive" size="sm" onClick={onRemove}>Remove</Button>
            </div>

            <textarea
                value={section.content}
                onChange={e => onChange({ ...section, content: e.target.value })}
                placeholder="Enter lyrics here..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
            />

            {validatedLines.filter(l => l.status !== "ok").length > 0 && (
                <div className="mt-1 space-y-0.5 text-xs">
                    {validatedLines.map((v, i) => v.status !== "ok" && (
                        <p key={i} className={v.status === "error" ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}>
                            Line {i + 1}: {v.line.length} chars {v.status === "error" ? "(exceeds max)" : "(approaching limit)"}
                        </p>
                    ))}
                </div>
            )}
        </div>
    )
}
