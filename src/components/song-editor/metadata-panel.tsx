interface MetadataPanelProps {
    title: string
    author: string
    copyright: string
    ccliNumber: string
    onChange: (field: string, value: string) => void
}

interface FieldProps {
    label: string
    id: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

function Field({ label, id, value, onChange, placeholder }: FieldProps) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            <input
                id={id}
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
        </div>
    )
}

export function MetadataPanel({ title, author, copyright, ccliNumber, onChange }: MetadataPanelProps) {
    return (
        <div className="border rounded-lg p-4 bg-card space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Song Details</h2>
            <Field
                label="Title"
                id="song-title"
                value={title}
                onChange={v => onChange("title", v)}
                placeholder="Song title"
            />
            <Field
                label="Author"
                id="song-author"
                value={author}
                onChange={v => onChange("author", v)}
                placeholder="Author / Artist"
            />
            <Field
                label="Copyright"
                id="song-copyright"
                value={copyright}
                onChange={v => onChange("copyright", v)}
                placeholder="© Year Name"
            />
            <Field
                label="CCLI Number"
                id="song-ccli"
                value={ccliNumber}
                onChange={v => onChange("ccliNumber", v)}
                placeholder="CCLI #"
            />
        </div>
    )
}
