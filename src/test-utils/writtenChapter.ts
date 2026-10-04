import { HARNESS_CHAPTER_TARGET_MIN_WORDS, HARNESS_FAILED_WRITE_SHARE } from '../components/harness-generation/shared/chapterBody';

/**
 * The rest of a written chapter, for a test reply that stands for one. The
 * HARNESS refuses a reply under a quarter of the chapter's minimum words as a
 * failed write, so a test chapter closes with this paragraph to be long
 * enough. Plain narration with no quotes, tags, marks, names or numbers, so
 * nothing a test reads changes.
 */
const SENTENCE = 'The night went on, and the town kept its quiet watch until dawn.';
export const REST_OF_CHAPTER = Array.from(
  { length: Math.ceil((HARNESS_CHAPTER_TARGET_MIN_WORDS * HARNESS_FAILED_WRITE_SHARE) / SENTENCE.split(' ').length) },
  () => SENTENCE,
).join(' ');

/** A test reply body that stands for a written chapter: its paragraphs, or its prose, end with the rest of the chapter. */
export function writtenChapter<T extends object>(body: T): T {
  const fields = body as { paragraphs?: unknown; prose?: unknown };
  if (Array.isArray(fields.paragraphs)) return { ...body, paragraphs: [...fields.paragraphs, REST_OF_CHAPTER] };
  if (typeof fields.prose === 'string') return { ...body, prose: `${fields.prose}\n\n${REST_OF_CHAPTER}` };
  return body;
}

/** The same for a reply already written as JSON text; anything else is returned as it is. */
export function writtenChapterReply(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? JSON.stringify(writtenChapter(parsed)) : raw;
  } catch {
    return raw;
  }
}

/** A test provider response whose reply stands for a written chapter (see `writtenChapterReply`). */
export function asWrittenChapter<T extends { rawProviderResponse: string }>(response: T): T {
  return { ...response, rawProviderResponse: writtenChapterReply(response.rawProviderResponse) };
}

/**
 * A failed write, as a real writer returned it: the reply that came back for
 * Chapter 3 of the owner's Goblin test story (2026-10-03). The writer stopped
 * after four paragraphs and wrote its own notes about the task into two of
 * them; it carries none of the fields that follow a chapter.
 */
export const STOPPED_WRITE_REPLY = JSON.stringify({
  title: 'Chapter 3: The Gutter Becomes a Front Line',
  paragraphs: [
    'The inspection began with the chamber’s waterline. Grit crouched at the basin’s edge while Slink traced the higher channels with one finger, careful not to disturb the silt. Behind them, workers waited for instructions and Krag watched the bypass.',
    '[[ @MC]] is invalid tag whitespace. Need fix tag syntax only speakers as [[@MC]].',
    'Slink had found no fresh tracks in the chamber, but the mud near the access tunnel told a different story. Several boot prints overlapped the old impressions there. Their heels pointed inward, toward the gutter, not back toward the surface.',
    '[[ @Slink]] likewise invalid. Need no spaces. We can generate clean. We must ensure 50.',
  ],
});
