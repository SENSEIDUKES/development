import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodexPictureRequest, CodexPictureService } from '@seihouse/library/stories';
import { readCharacterReference } from './imageFiles';
import type { StoryCoverStore } from './storyCovers';

/** Makes one Codex card picture; rejects with a reason the reader can read. */
export type CodexPictureMaker = (request: CodexPictureRequest) => Promise<Blob>;

/** Where a card's picture is kept: its story, then its card. */
const pictureKey = (storyId: string, cardKey: string) => `${storyId}/${cardKey}`;

/**
 * The Codex pictures over the host's image store (a keyed store like the
 * covers', in its own database) and the cover server. A picture is kept as
 * soon as it is made, replacing any before it, and shown through its own
 * address, released when it is replaced or the page goes. Saving must succeed
 * before a new picture replaces the kept one. Failed saves can retry the same bytes.
 */
export function useCodexPictures(store: StoryCoverStore, maker: CodexPictureMaker): CodexPictureService {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const shown = useRef(new Map<string, string>());
  const images = useRef(new Map<string, Blob>());
  const unsaved = useRef(new Map<string, { image: Blob; request: string }>());
  const pending = useRef(new Map<string, Promise<void>>());
  const hydration = useRef<Promise<void>>(Promise.resolve());
  const show = useCallback((key: string, image: Blob) => {
    images.current.set(key, image);
    if (!mounted.current) return;
    const url = URL.createObjectURL(image);
    const previous = shown.current.get(key);
    if (previous) URL.revokeObjectURL(previous);
    shown.current.set(key, url);
    setUrls(Object.fromEntries(shown.current));
  }, []);

  const hydrate = useCallback(async () => {
    const pictures = await store.loadAll();
    if (mounted.current) for (const picture of pictures) if (!shown.current.has(picture.storyId)) show(picture.storyId, picture.image);
  }, [store, show]);
  useEffect(() => {
    mounted.current = true;
    hydration.current = hydrate();
    void hydration.current.catch(() => undefined);
    return () => { mounted.current = false; };
  }, [hydrate]);
  const ensureHydrated = useCallback(async () => {
    try { await hydration.current; }
    catch { hydration.current = hydrate(); await hydration.current; }
  }, [hydrate]);
  useEffect(() => {
    const urlsShown = shown.current;
    return () => {
      for (const url of urlsShown.values()) URL.revokeObjectURL(url);
      urlsShown.clear();
    };
  }, []);

  const imageOf = useCallback(async (storyId: string, cardKey: string) => {
    await ensureHydrated();
    return images.current.get(pictureKey(storyId, cardKey));
  }, [ensureHydrated]);

  const referenceOf = useCallback(async (storyId: string, cardKey: string) => {
    const image = await imageOf(storyId, cardKey);
    return image ? readCharacterReference(image) : undefined;
  }, [imageOf]);

  const keep = useCallback(async (storyId: string, cardKey: string, image: Blob) => {
    const key = pictureKey(storyId, cardKey);
    await store.save(key, image);
    show(key, image);
  }, [store, show]);

  const manifest = useCallback((storyId: string, cardKey: string, request: CodexPictureRequest) => {
    const key = pictureKey(storyId, cardKey);
    const existing = pending.current.get(key);
    if (existing) return existing;
    const operation = (async () => {
      await ensureHydrated();
      const requestKey = JSON.stringify(request);
      const failed = unsaved.current.get(key);
      const image = failed?.request === requestKey ? failed.image : await maker(request);
      unsaved.current.set(key, { image, request: requestKey });
      await keep(storyId, cardKey, image);
      unsaved.current.delete(key);
    })().finally(() => pending.current.delete(key));
    pending.current.set(key, operation);
    return operation;
  }, [maker, keep, ensureHydrated]);

  return useMemo(() => ({ pictureOf: (storyId: string, cardKey: string) => urls[pictureKey(storyId, cardKey)], imageOf, referenceOf, keep, manifest }), [urls, imageOf, referenceOf, keep, manifest]);
}
