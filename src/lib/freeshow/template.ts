import type { FreeshowShow } from "./types.ts";

export function newShowTemplate(name: string): FreeshowShow {
  const slideId = crypto.randomUUID();
  const layoutId = crypto.randomUUID();
  const now = Date.now();

  return {
    name,
    slides: {
      [slideId]: {
        group: "verse",
        color: null,
        settings: {},
        notes: "",
        items: [{ lines: [[""]] }],
      },
    },
    layouts: {
      [layoutId]: {
        name: "default",
        notes: "",
        slides: [{ id: slideId }],
      },
    },
    media: {},
    timestamps: { created: now, modified: now },
  };
}

export function newProjectTemplate(name: string): FreeshowShow {
  const now = Date.now();
  return {
    name,
    category: "project",
    slides: {},
    layouts: {},
    media: {},
    timestamps: { created: now, modified: now },
  };
}
