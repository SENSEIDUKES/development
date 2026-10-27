import { vi } from 'vitest';
import type { HarnessProviderReceipt, HarnessTagRequest } from '@seihouse/sen/harness-generation';
import { readMarks } from '../narrative/marks';

/**
 * A tagger for tests, built from the chapter fixtures themselves. The writer is
 * taught no tags (SENSEI, 2026-10-24), so a test chapter reaches the Reader,
 * the Codex and the Holdings fixer only through the tagging call. Each fixture
 * reply is written as the tagged chapter: `teach` remembers each paragraph by
 * the prose it strips down to, which is exactly what the writer's reply is
 * accepted as, and the tagging call puts those same tags back on those same
 * words. A paragraph no fixture taught comes back untouched, which is what a
 * tagger with nothing to mark does.
 *
 * `teach` hands back the writer's version of that reply: the same JSON with
 * every tag taken out of its paragraphs, which is what a writer taught no tags
 * returns. Other fields are left alone, so a fixture can still check that a tag
 * strayed into a title or a recap is ignored.
 */
export const createReplayTagger = (providerReceipt: HarnessProviderReceipt) => {
  const tagged = new Map<string, string>();
  const teach = (reply: string) => {
    const parsed = JSON.parse(reply) as { paragraphs?: unknown };
    if (!Array.isArray(parsed.paragraphs)) return reply;
    const written = parsed.paragraphs.map(paragraph => {
      const prose = readMarks(String(paragraph)).text;
      tagged.set(prose, String(paragraph));
      return prose;
    });
    return JSON.stringify({ ...parsed, paragraphs: written });
  };
  const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
    rawProviderResponse: JSON.stringify({ paragraphs: request.paragraphs.map(paragraph => tagged.get(paragraph) ?? paragraph) }),
    providerReceipt,
  }));
  return { tagChapter, teach };
};
