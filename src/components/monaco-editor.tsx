import { lazy, Suspense } from "react"

const MonacoEditorBase = lazy(() => import("@monaco-editor/react"))

interface MonacoEditorProps {
    value: string
    onChange?: (value: string) => void
    readOnly?: boolean
    height?: string
}

export function MonacoEditor({ value, onChange, readOnly = false, height = "400px" }: MonacoEditorProps) {
    return (
        <Suspense
            fallback={
                <div
                    className="flex items-center justify-center border rounded-md"
                    style={{ height }}
                >
                    <span className="text-muted-foreground text-sm">Loading editor...</span>
                </div>
            }
        >
            <MonacoEditorBase
                height={height}
                defaultLanguage="json"
                value={value}
                onChange={(val) => onChange?.(val ?? "")}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    theme: "vs-dark",
                    fontSize: 13,
                    tabSize: 2,
                }}
            />
        </Suspense>
    )
}
