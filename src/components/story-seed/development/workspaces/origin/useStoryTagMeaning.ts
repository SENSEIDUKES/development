import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeFingerprint, type Fingerprint } from '@seihouse/sen/meaning-engine';
import { getTagMetadata, loadStoryTagFingerprints, normalizeStoryTagIdentity, type StoryTagMeaning } from '@seihouse/sen/story-seed';
import { useOptionalStoryCreationRuntime } from '../../../../../library/story-seed/runtime';

/** A synopsis shorter than this says too little to fingerprint. */
const MINIMUM_SYNOPSIS_LENGTH = 24;
/** Wait for a pause in typing: one fingerprint per finished thought, not per keystroke. */
const TYPING_PAUSE_MS = 900;

/** Text already fingerprinted this session, so nothing is asked for twice. */
const known = new Map<string, Fingerprint>();

/**
 * What the tag engine needs to compare by meaning: the stored tag
 * fingerprints, plus fingerprints of this story's synopsis and of the creator's
 * own tags from the host's model. Without a host model it stays undefined and
 * suggestions come from the genre and the words of the synopsis.
 */
export const useStoryTagMeaning = (synopsis: string, storyTags: readonly string[], search = ''): StoryTagMeaning | undefined => {
  const fingerprintMeaning = useOptionalStoryCreationRuntime()?.fingerprintMeaning;
  const [tags, setTags] = useState<Map<string, Fingerprint>>();
  const [arrived, setArrived] = useState(0);
  // While the creator is still typing, the last fingerprint stands in: close beats nothing.
  const lastSynopsis = useRef<Fingerprint | undefined>(undefined);
  const unavailable = useRef(false);
  const text = synopsis.trim();
  // A word or two is found by name; a described tag ("enemies who fall in love") needs its meaning.
  const phrase = search.trim().split(/\s+/).length >= 2 ? search.trim() : '';
  // Keyed by their text, so picking a catalog tag changes nothing here and never restarts a request.
  const customTagKey = storyTags.map(tag => tag.trim()).filter(tag => tag && !getTagMetadata(tag)).join('\u0000');
  const customTags = useMemo(() => customTagKey ? customTagKey.split('\u0000') : [], [customTagKey]);
  const wanted = useMemo(
    () => [...new Set([...(text.length >= MINIMUM_SYNOPSIS_LENGTH ? [text] : []), ...customTags, ...(phrase ? [phrase] : [])])].filter(entry => !known.has(entry)),
    [text, customTags, phrase],
  );

  useEffect(() => {
    if (!fingerprintMeaning) return undefined;
    let current = true;
    void loadStoryTagFingerprints().then(loaded => { if (current) setTags(loaded); }).catch(() => undefined);
    return () => { current = false; };
  }, [fingerprintMeaning]);

  useEffect(() => {
    if (!fingerprintMeaning || unavailable.current || wanted.length === 0) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fingerprintMeaning(wanted, controller.signal).then(encoded => {
        wanted.forEach((entry, index) => known.set(entry, decodeFingerprint(encoded[index])));
        setArrived(count => count + 1);
      }).catch(() => {
        if (controller.signal.aborted) return;
        // No model, or the day's allowance is spent: stop asking, and drop the earlier synopsis's
        // fingerprint so it is never read as the meaning of this one.
        unavailable.current = true;
        lastSynopsis.current = undefined;
        setArrived(count => count + 1);
      });
    }, TYPING_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fingerprintMeaning, wanted]);

  return useMemo(() => {
    if (!tags) return undefined;
    const custom = new Map(customTags.flatMap(tag => {
      const fingerprint = known.get(tag);
      return fingerprint ? [[normalizeStoryTagIdentity(tag), fingerprint] as const] : [];
    }));
    if (text.length < MINIMUM_SYNOPSIS_LENGTH) lastSynopsis.current = undefined;
    else lastSynopsis.current = known.get(text) ?? (unavailable.current ? undefined : lastSynopsis.current);
    return { tags, synopsis: lastSynopsis.current, custom, search: phrase ? known.get(phrase) : undefined };
    // `arrived` re-reads the session's fingerprints when new ones land.
  }, [tags, text, customTags, phrase, arrived]);
};
