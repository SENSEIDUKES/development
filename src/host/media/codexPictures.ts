import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodexPictureRequest, CodexPictureService } from '@seihouse/library/stories';
import type { StoryCoverStore } from './storyCovers';

/** Makes one Codex card picture; rejects with a reason the reader can read. */
export type CodexPictureMaker = (request: CodexPictureRequest) => Promise<Blob>;

/** Where a card's picture is kept: its story, then its card. */
const pictureKey = (storyId: string, cardKey: string) => `${storyId}/${cardKey}`;

/**
 * The Codex pictures over the host's image store (a keyed store like the
 * covers', in its own database) and the cover server. A picture is kept as
 * soon as it is made, replacing any before it, and shown through its own
 * address, released when it is replaced or the page goes. A picture the
 * device cannot keep is still shown for the visit.
 */
export function useCodexPictures(store: StoryCoverStore, maker: CodexPictureMaker): CodexPictureService {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const shown = useRef(new Map<string, string>());
  const show = useCallback((key: string, image: Blob) => {
    const url = URL.createObjectURL(image);
    const previous = shown.current.get(key);
    if (previous) URL.revokeObjectURL(previous);
    shown.current.set(key, url);
    setUrls(Object.fromEntries(shown.current));
  }, []);

  useEffect(() => {
    let active = true;
    void store.loadAll().then(pictures => {
      // A picture made while the device was still opening its pictures is the newer one.
      if (active) for (const picture of pictures) if (!shown.current.has(picture.storyId)) show(picture.storyId, picture.image);
    }, () => undefined);
    return () => { active = false; };
  }, [store, show]);
  useEffect(() => {
    const urlsShown = shown.current;
    return () => {
      for (const url of urlsShown.values()) URL.revokeObjectURL(url);
      urlsShown.clear();
    };
  }, []);

  const manifest = useCallback(async (storyId: string, cardKey: string, request: CodexPictureRequest) => {
    const image = await maker(request);
    const key = pictureKey(storyId, cardKey);
    try { await store.save(key, image); } catch { /* Shown for the visit; the device would not keep it. */ }
    show(key, image);
  }, [maker, store, show]);

  return useMemo(() => ({ pictureOf: (storyId: string, cardKey: string) => urls[pictureKey(storyId, cardKey)], manifest }), [urls, manifest]);
}
