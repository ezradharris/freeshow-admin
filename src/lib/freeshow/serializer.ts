import type { FreeshowShow, FreeshowMeta } from "./types.ts";

export function serializeSong(song: {
  title: string;
  author: string | null;
  copyright: string | null;
  ccliNumber: string | null;
  rawImport: unknown;
  sections: Array<{ type: string; label: string; content: string; sortOrder: number }>;
}): FreeshowShow {
  const base = typeof song.rawImport === "object" && song.rawImport !== null
    ? (song.rawImport as Record<string, unknown>)
    : {};

  const existingMeta: FreeshowMeta =
    typeof base.meta === "object" && base.meta !== null
      ? (base.meta as FreeshowMeta)
      : {};

  const sorted = [...song.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  // Note: slide IDs are not preserved on round-trip. Per-slide media bindings
  // from rawImport that reference original slide UUIDs will be lost.
  const slideIds: string[] = sorted.map(() => crypto.randomUUID());

  const slides: FreeshowShow["slides"] = {};
  for (let i = 0; i < sorted.length; i++) {
    const section = sorted[i];
    const id = slideIds[i];
    const slideItems = section.content.split("\n\n").map((block) => ({
      lines: block.split("\n").map((line) => [line]),
    }));
    slides[id] = {
      group: section.type,
      color: null,
      settings: {},
      notes: "",
      items: slideItems,
    };
  }

  const layoutId = crypto.randomUUID();
  const layouts: FreeshowShow["layouts"] = {
    [layoutId]: {
      name: "default",
      notes: "",
      slides: slideIds.map((id) => ({ id })),
    },
  };

  const existingTimestamps =
    typeof base.timestamps === "object" && base.timestamps !== null
      ? (base.timestamps as { created?: number; modified?: number })
      : {};

  return {
    ...base,
    name: song.title,
    meta: {
      ...existingMeta,
      title: song.title,
      ...(song.author !== null ? { author: song.author } : {}),
      ...(song.copyright !== null ? { copyright: song.copyright } : {}),
      ...(song.ccliNumber !== null ? { CCLI: song.ccliNumber } : {}),
    },
    slides,
    layouts,
    timestamps: {
      ...existingTimestamps,
      modified: Date.now(),
    },
  } as FreeshowShow;
}
