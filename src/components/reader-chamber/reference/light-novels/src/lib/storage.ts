/**
 * WORKSHOP SEAM — not production code.
 *
 * Production's `src/lib/storage.ts` (Light-Novels main @ 647165a) re-exports
 * `storyStorage`, the PersistentStorageManager that keeps chapter bodies in
 * IndexedDB and syncs them to Firebase Data Connect. In production the Story
 * document carries only chapter scaffolds; the Reader loads each body through
 * `storyStorage.getChapterContent`. This stand-in keeps that split: the
 * Workshop seeds chapter bodies here, and the copied Reader loads them the
 * same way it does in production, from memory instead of a database.
 */
import type { ChapterContent } from '../types';

const contents = new Map<string, ChapterContent>();
const audioBlobs = new Map<string, Blob>();

const keyOf = (storyId: string, chapterNumber: number) => `${storyId}:${chapterNumber}`;

class WorkshopStoryStorage {
  async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
    const content = contents.get(keyOf(storyId, chapterNumber));
    return content ? { ...content } : null;
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    contents.set(keyOf(content.storyId, content.chapterNumber), { ...content });
  }

  async getAudioBlob(url: string): Promise<Blob | null> {
    return audioBlobs.get(url) ?? null;
  }
}

export const storyStorage = new WorkshopStoryStorage();

/** Workshop only: replace every stored chapter body with the preview story's. */
export function seedWorkshopChapterContents(next: ChapterContent[]): void {
  contents.clear();
  audioBlobs.clear();
  for (const content of next) contents.set(keyOf(content.storyId, content.chapterNumber), content);
}
