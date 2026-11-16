import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterVoiceLine, ChapterVoiceService } from '@seihouse/library/stories';
import type { ChapterVoiceClient } from './chapterVoiceClient';
import type { StoryCoverStore } from './storyCovers';

/**
 * Character voices kept on this device, until the database keeps them: one
 * clip per spoken line, and each story's cast (which voice each character
 * speaks with). They sit in a keyed store like the covers', in their own
 * database.
 */

/** A short fingerprint of a line's words and speaker: a clip is only played for the words it voiced, said by who it voiced. */
const fingerprint = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const clipKey = (storyId: string, chapterId: string, line: { key: string; text: string; speaker?: string }) =>
  JSON.stringify(['clip', storyId, chapterId, line.key, fingerprint(`${line.speaker ?? ''}\n${line.text}`)]);
const castKey = (storyId: string) => JSON.stringify(['cast', storyId]);

const readCast = async (blob: Blob): Promise<Record<string, string>> => {
  try {
    const parsed: unknown = JSON.parse(await blob.text());
    return parsed && typeof parsed === 'object'
      ? Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {};
  } catch {
    return {};
  }
};

/**
 * The Library's character voices over the host's store and voice server. A
 * line's clip is kept as soon as it is made, so a chapter interrupted partway
 * keeps what it has and only the rest is made (and paid for) next time.
 */
export function useChapterVoices(store: StoryCoverStore, client: ChapterVoiceClient): ChapterVoiceService {
  const [info, setInfo] = useState<{ available: boolean; model?: string }>();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const shown = useRef(new Map<string, string>());
  const casts = useRef(new Map<string, Record<string, string>>());
  const mounted = useRef(true);

  const show = useCallback((key: string, clip: Blob) => {
    if (!mounted.current || shown.current.has(key)) return;
    shown.current.set(key, URL.createObjectURL(clip));
    setUrls(Object.fromEntries(shown.current));
  }, []);

  const hydrate = useCallback(async () => {
    const kept = await store.loadAll();
    for (const entry of kept) {
      if (entry.storyId.startsWith('["cast"')) {
        const storyId = (JSON.parse(entry.storyId) as string[])[1];
        if (!casts.current.has(storyId)) casts.current.set(storyId, await readCast(entry.image));
      } else show(entry.storyId, entry.image);
    }
  }, [store, show]);
  const hydration = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    mounted.current = true;
    hydration.current = hydrate().catch(() => undefined);
    client.info().then(answer => { if (mounted.current) setInfo(answer); });
    const urlsShown = shown.current;
    return () => {
      mounted.current = false;
      for (const url of urlsShown.values()) URL.revokeObjectURL(url);
      urlsShown.clear();
    };
  }, [hydrate, client]);

  const missing = useCallback((storyId: string, chapterId: string, lines: readonly ChapterVoiceLine[]) =>
    lines.filter(line => !urls[clipKey(storyId, chapterId, line)]), [urls]);

  // One chapter is voiced at a time: two at once could each cast the same character differently.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const voice = useCallback<ChapterVoiceService['voice']>((storyId, chapterId, plan, onLine) => {
    const turn = queue.current.catch(() => undefined).then(() => voiceNow(storyId, chapterId, plan, onLine));
    queue.current = turn;
    return turn;
  }, [client, store, show]);
  const voiceNow: ChapterVoiceService['voice'] = async (storyId, chapterId, plan, onLine) => {
    await hydration.current;
    // Each character keeps the voice it was first given; only new speakers are cast.
    const saved = casts.current.get(storyId) ?? {};
    // A minor figure promoted to a card keeps the voice they already speak with.
    const carried = Object.fromEntries(plan.cast.flatMap(character =>
      (character.was && !saved[character.key] && saved[character.was] ? [[character.key, saved[character.was]]] : [])));
    const kept = { ...saved, ...carried };
    let cast = kept;
    if (Object.keys(carried).length && !plan.cast.some(character => !kept[character.key])) {
      await store.save(castKey(storyId), new Blob([JSON.stringify(kept)], { type: 'application/json' }));
      casts.current.set(storyId, kept);
    }
    if (plan.cast.some(character => !kept[character.key])) {
      cast = { ...kept, ...await client.cast(plan.cast, kept) };
      await store.save(castKey(storyId), new Blob([JSON.stringify(cast)], { type: 'application/json' }));
      casts.current.set(storyId, cast);
    }
    const total = plan.lines.length;
    let done = plan.lines.filter(line => shown.current.has(clipKey(storyId, chapterId, line))).length;
    for (const line of plan.lines) {
      const key = clipKey(storyId, chapterId, line);
      if (shown.current.has(key)) continue;
      const voiceKey = cast[line.cardKey];
      if (!voiceKey) throw new Error('A character in this chapter has no voice in the cast yet.');
      const clip = await client.line({ text: line.text, voiceKey });
      await store.save(key, clip);
      show(key, clip);
      done += 1;
      onLine?.(done, total);
    }
  };

  return useMemo(() => ({
    available: info?.available,
    model: info?.model,
    voiced: (storyId, chapterId, lines) => lines.length - missing(storyId, chapterId, lines).length,
    missing,
    clip: (storyId, chapterId, line) => urls[clipKey(storyId, chapterId, line)],
    voice,
  }), [info, urls, missing, voice]);
}
