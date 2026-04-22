export interface FreeshowSlideItem {
  lines: string[][];
  style?: string;
  [key: string]: unknown;
}

export interface FreeshowSlide {
  group: string;
  items: FreeshowSlideItem[];
  color?: string | null;
  settings?: Record<string, unknown>;
  notes?: string;
  [key: string]: unknown;
}

export interface FreeshowLayout {
  name: string;
  slides: Array<{ id: string } & Record<string, unknown>>;
  notes?: string;
  [key: string]: unknown;
}

export interface FreeshowMeta {
  title?: string;
  author?: string;
  CCLI?: string;
  copyright?: string;
  [key: string]: unknown;
}

export interface FreeshowShow {
  name: string;
  category?: string;
  meta?: FreeshowMeta;
  slides: Record<string, FreeshowSlide>;
  layouts: Record<string, FreeshowLayout>;
  media?: Record<string, unknown>;
  timestamps?: { created?: number; modified?: number };
  [key: string]: unknown;
}

export interface ParsedSong {
  title: string;
  author: string | null;
  copyright: string | null;
  ccliNumber: string | null;
  rawImport: FreeshowShow;
  sections: Array<{
    type: string;
    label: string;
    content: string;
    sortOrder: number;
  }>;
}
