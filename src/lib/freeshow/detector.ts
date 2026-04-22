import type { FreeshowShow } from "./types.ts";

export function detectContentType(show: FreeshowShow): "song" | "show" {
  const title = show.meta?.title;
  const author = show.meta?.author;
  if (typeof title === "string" && title.length > 0 && typeof author === "string" && author.length > 0) {
    return "song";
  }
  return "show";
}
