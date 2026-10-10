/**
 * Development scenes: where the reader is in the story when the app's Reader
 * opens. Each scene starts from a fresh copy of the story with only its
 * chapters written, so writing in one never changes another.
 */
export type ReaderSceneId = 'first-chapter' | 'middle' | 'write-next' | 'newest' | 'story-start';

export interface ReaderScene {
  id: ReaderSceneId;
  label: string;
  note: string;
  /** How many of the story's chapters are written. */
  chapters: number;
  /** The chapter the Reader opens on; none before the first chapter. */
  reading?: number;
}

/** The scenes for a story of `total` chapters. */
export function readerScenes(total: number): ReaderScene[] {
  const start: ReaderScene = { id: 'story-start', label: 'Story start', note: 'No chapter yet. Write Chapter 1 writes it from its saved reply.', chapters: 0 };
  if (total < 1) return [start];
  const middle = Math.ceil(total / 2);
  const scenes: ReaderScene[] = [
    { id: 'first-chapter', label: 'Chapter 1', note: `All ${total} chapters written; the Reader opens on Chapter 1.`, chapters: total, reading: 1 },
    { id: 'middle', label: `Chapter ${middle}`, note: `The middle of the story: the Reader opens on Chapter ${middle}.`, chapters: total, reading: middle },
    {
      id: 'write-next', label: `Write Chapter ${total}`, chapters: total - 1, reading: total - 1,
      note: `Chapter ${total} is not written yet. Next writes it again from the reply it was written with, behind the writing screen.`,
    },
    {
      id: 'newest', label: `Chapter ${total}, the newest`, chapters: total, reading: total,
      note: `Rewrite writes Chapter ${total} again from the same reply. Write Chapter ${total + 1} shows what the Reader says when the writer cannot help.`,
    },
    start,
  ];
  // A short story has fewer distinct places: keep the first scene for each.
  return scenes.filter((scene, index) => scenes.findIndex(other => other.chapters === scene.chapters && other.reading === scene.reading) === index);
}

/** Reader pages a Workshop shortcut opens by pressing the Reader's own button. */
export type ReaderPage = 'fate' | 'holdings' | 'settings';

export const READER_PAGES: ReadonlyArray<{ id: ReaderPage; label: string; button: string }> = [
  { id: 'fate', label: 'Fate', button: 'Open Fate' },
  { id: 'holdings', label: 'Holdings', button: 'Open Holdings' },
  { id: 'settings', label: 'Reader Settings', button: 'Reader Settings' },
];
