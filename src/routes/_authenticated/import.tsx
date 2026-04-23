import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Upload, Check, X, Minus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { importFiles } from "@/server/import"

type ImportResult = {
    name: string
    type: string
    status: "imported" | "duplicate" | "error"
    id?: string
    reason?: string
}

export const Route = createFileRoute("/_authenticated/import" as any)({
    component: ImportPage,
})

function ImportPage() {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [results, setResults] = useState<ImportResult[] | null>(null)
    const [dragOver, setDragOver] = useState(false)

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setDragOver(false)
        const dropped = Array.from(e.dataTransfer.files).filter(
            f => f.name.endsWith(".show") || f.name.endsWith(".json"),
        )
        setFiles(prev => [...prev, ...dropped])
    }

    async function handleUpload() {
        if (!files.length) return
        setUploading(true)
        try {
            const fileContents = await Promise.all(
                files.map(async (f) => {
                    const text = await f.text()
                    let content: unknown
                    try { content = JSON.parse(text) } catch { content = null }
                    return { filename: f.name, content }
                })
            )
            const { results } = await importFiles({ data: { files: fileContents } })
            setResults(results)
            setFiles([])
        } catch {
            toast.error("Import failed")
        } finally {
            setUploading(false)
        }
    }

    function getResultLink(r: ImportResult) {
        if (!r.id) return null
        if (r.type === "song") {
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link to={"/_authenticated/songs/$id" as any} params={{ id: r.id } as any}>View</Link>
                </Button>
            )
        }
        if (r.type === "show") {
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link to={"/_authenticated/shows/$id" as any} params={{ id: r.id } as any}>View</Link>
                </Button>
            )
        }
        if (r.type === "project") {
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link to={"/_authenticated/projects/$id" as any} params={{ id: r.id } as any}>View</Link>
                </Button>
            )
        }
        return null
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Import</h1>

            <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragOver
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                }`}
                onDragOver={e => {
                    e.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop <code className="text-xs">.show</code> files here
                </p>
                <label className="cursor-pointer">
                    <span className="text-sm text-primary underline underline-offset-2">
                        or click to browse
                    </span>
                    <input
                        type="file"
                        multiple
                        accept=".show,.json"
                        className="sr-only"
                        onChange={e =>
                            setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])
                        }
                    />
                </label>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">{files.length} file{files.length === 1 ? "" : "s"} selected</p>
                    <div className="divide-y divide-border border rounded-lg overflow-hidden">
                        {files.map((f, i) => (
                            <div
                                key={`${f.name}-${i}`}
                                className="flex items-center justify-between px-3 py-2 text-sm bg-background"
                            >
                                <span className="truncate font-mono text-xs">{f.name}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleUpload} disabled={uploading} className="w-full">
                        {uploading
                            ? "Importing…"
                            : `Import ${files.length} file${files.length === 1 ? "" : "s"}`}
                    </Button>
                </div>
            )}

            {results && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">
                        {results.filter(r => r.status === "imported").length} imported
                        {results.filter(r => r.status === "duplicate").length > 0 &&
                            `, ${results.filter(r => r.status === "duplicate").length} skipped`}
                        {results.filter(r => r.status === "error").length > 0 &&
                            `, ${results.filter(r => r.status === "error").length} failed`}
                    </p>
                    <div className="divide-y divide-border border rounded-lg overflow-hidden">
                        {results.map((r, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-3 py-2.5 text-sm bg-background"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {r.status === "imported" && (
                                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                    )}
                                    {r.status === "error" && (
                                        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                                    )}
                                    {r.status === "duplicate" && (
                                        <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{r.name}</span>
                                    <span className="text-muted-foreground capitalize shrink-0">
                                        {r.type}
                                    </span>
                                    {r.reason && (
                                        <span className="text-destructive text-xs shrink-0">{r.reason}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className={`text-xs ${
                                        r.status === "imported"
                                            ? "text-primary"
                                            : r.status === "error"
                                              ? "text-destructive"
                                              : "text-muted-foreground"
                                    }`}>
                                        {r.status === "imported"
                                            ? "Imported"
                                            : r.status === "duplicate"
                                              ? "Duplicate"
                                              : "Error"}
                                    </span>
                                    {getResultLink(r)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
