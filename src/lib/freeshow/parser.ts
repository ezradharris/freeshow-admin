import type { FreeshowShow, ParsedSong } from "./types.ts";

export function parseFreeshowFile(raw: unknown): FreeshowShow {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("slides" in raw) ||
    !("layouts" in raw) ||
    typeof (raw as Record<string, unknown>).slides !== "object" ||
    (raw as Record<string, unknown>).slides === null ||
    typeof (raw as Record<string, unknown>).layouts !== "object" ||
    (raw as Record<string, unknown>).layouts === null
  ) {
    throw new Error("Invalid FreeShow file: missing slides or layouts");
  }
  return raw as FreeshowShow;
}

export function parseSong(show: FreeshowShow): ParsedSong {
  const title = show.meta?.title ?? show.name;
  const author = show.meta?.author ?? null;
  const copyright = show.meta?.copyright ?? null;
  const ccliNumber = show.meta?.CCLI ?? null;

  // Determine slide order from first layout, or fall back to Object.entries order
  let slideIds: string[];
  const layoutEntries = Object.entries(show.layouts);
  if (layoutEntries.length > 0) {
    const [, firstLayout] = layoutEntries[0];
    slideIds = firstLayout.slides.map((s) => s.id);
  } else {
    slideIds = Object.keys(show.slides);
  }

  const sections = slideIds
    .filter((id) => id in show.slides)
    .map((id, index) => {
      const slide = show.slides[id];
      const type = slide.group.trim().toLowerCase();
      const label = type.charAt(0).toUpperCase() + type.slice(1);

      const content = slide.items
        .map((item) => item.lines.map((lineArr) => lineArr.join("")).join("\n"))
        .join("\n\n");

      return {
        type,
        label,
        content,
        sortOrder: index,
      };
    });

  return {
    title,
    author,
    copyright,
    ccliNumber,
    rawImport: show,
    sections,
  };
}
