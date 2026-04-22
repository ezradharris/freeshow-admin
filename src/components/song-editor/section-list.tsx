import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SectionItem, type SongSection, type Settings } from "./section-item"

interface SectionListProps {
    sections: SongSection[]
    onChange: (sections: SongSection[]) => void
    settings: Settings
}

interface SortableSectionProps {
    section: SongSection
    index: number
    onChange: (updated: SongSection) => void
    onRemove: () => void
    settings: Settings
}

function SortableSection({ section, index, onChange, onRemove, settings }: SortableSectionProps) {
    const sortableId = section.id ?? `section-index-${index}`
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const dragHandleProps = { ...attributes, ...listeners }

    return (
        <div ref={setNodeRef} style={style}>
            <SectionItem
                section={section}
                index={index}
                onChange={onChange}
                onRemove={onRemove}
                settings={settings}
                dragHandleProps={dragHandleProps as Record<string, unknown>}
            />
        </div>
    )
}

export function SectionList({ sections, onChange, settings }: SectionListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = sections.findIndex((s, i) => (s.id ?? `section-index-${i}`) === active.id)
        const newIndex = sections.findIndex((s, i) => (s.id ?? `section-index-${i}`) === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
            ...s,
            sortOrder: i,
        }))
        onChange(reordered)
    }

    const sortableIds = sections.map((s, i) => s.id ?? `section-index-${i}`)

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                    {sections.map((section, index) => (
                        <SortableSection
                            key={section.id ?? `section-index-${index}`}
                            section={section}
                            index={index}
                            onChange={updated => {
                                const next = [...sections]
                                next[index] = updated
                                onChange(next)
                            }}
                            onRemove={() => {
                                onChange(sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, sortOrder: i })))
                            }}
                            settings={settings}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}
