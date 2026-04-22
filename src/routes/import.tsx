import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

type ImportResult = {
    name: string
    type: string
    status: "imported" | "duplicate" | "error"
    id?: string
    reason?: string
}

export const Route = createFileRoute("/import")({
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
            const formData = new FormData()
            files.forEach(f => formData.append("file", f))
            const res = await fetch("/api/import", { method: "POST", body: formData })
            const data = (await res.json()) as { results: ImportResult[] }
            setResults(data.results)
            setFiles([])
        } finally {
            setUploading(false)
        }
    }

    function getResultLink(r: ImportResult) {
        if (!r.id) return null
        if (r.type === "song") {
            return (
                <Button variant="outline" size="sm" asChild>
                    <Link to="/songs/$id" params={{ id: r.id }}>
                        View
                    </Link>
                </Button>
            )
        }
        if (r.type === "show") {
            return (
                <Button variant="outline" size="sm" asChild>
                    <Link to="/shows/$id" params={{ id: r.id }}>
                        View
                    </Link>
                </Button>
            )
        }
        if (r.type === "project") {
            return (
                <Button variant="outline" size="sm" asChild>
                    <Link to="/projects/$id" params={{ id: r.id }}>
                        View
                    </Link>
                </Button>
            )
        }
        return null
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold">Import FreeShow Files</h1>

            {/* Drop zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"}`}
                onDragOver={e => {
                    e.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">Drag & drop .show files here</p>
                <label className="cursor-pointer">
                    <span className="text-sm text-primary underline">or click to browse</span>
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

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-medium">Selected files ({files.length})</h2>
                    {files.map((f, i) => (
                        <div
                            key={`${f.name}-${i}`}
                            className="flex items-center justify-between rounded border p-2 text-sm"
                        >
                            <span>{f.name}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                    <Button onClick={handleUpload} disabled={uploading} className="w-full">
                        {uploading
                            ? "Uploading..."
                            : `Import ${files.length} file${files.length === 1 ? "" : "s"}`}
                    </Button>
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="space-y-2">
                    <h2 className="text-sm font-medium">Results</h2>
                    {results.map((r, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-between rounded border p-3 text-sm ${
                                r.status === "imported"
                                    ? "border-green-500/30 bg-green-500/5"
                                    : r.status === "error"
                                      ? "border-destructive/30 bg-destructive/5"
                                      : "border-yellow-500/30 bg-yellow-500/5"
                            }`}
                        >
                            <div>
                                <span className="font-medium">{r.name}</span>
                                <span className="ml-2 text-muted-foreground capitalize">
                                    ({r.type})
                                </span>
                                {r.reason && (
                                    <span className="ml-2 text-destructive">{r.reason}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={
                                        r.status === "imported"
                                            ? "text-green-600"
                                            : r.status === "error"
                                              ? "text-destructive"
                                              : "text-yellow-600"
                                    }
                                >
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
            )}
        </div>
    )
}
