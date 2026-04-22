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
  const title = show.meta?.title ?? show.name ?? "";
  const author = show.meta?.author ?? null;
  const copyright = show.meta?.copyright ?? null;
  const ccliNumber = show.meta?.CCLI != null ? String(show.meta.CCLI) : null;

  // Determine slide order from first layout, or fall back to Object.entries order
  let slideIds: string[];
  const layoutEntries = Object.entries(show.layouts);
  if (layoutEntries.length > 0) {
    const [, firstLayout] = layoutEntries[0];
    slideIds = Array.isArray(firstLayout.slides)
      ? firstLayout.slides.map((s) => s.id).filter((id) => id in show.slides)
      : [];
  } else {
    slideIds = Object.keys(show.slides);
  }

  const sections = slideIds
    .filter((id) => id in show.slides)
    .map((id, index) => {
      const slide = show.slides[id];
      const rawGroup = (typeof slide.group === "string" ? slide.group.trim() : "") || "unknown";
      const type = rawGroup.toLowerCase();
      const label = rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1);

      const items = Array.isArray(slide.items) ? slide.items : [];
      const content = items
        .map((item) => {
          const lines = Array.isArray(item.lines) ? item.lines : [];
          return lines.map((parts) => (Array.isArray(parts) ? parts.join("") : String(parts))).join("\n");
        })
        .join("\n\n")
        .trim();

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
