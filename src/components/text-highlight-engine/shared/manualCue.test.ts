import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createMediaCatalog } from '../../../audio/media';
import { resolvePlayableSoundCue, splitBySoundCues } from '../../../audio/inlineAudio';
import { createManualSoundCue, snapSoundCueSelection } from './manualCue';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);
const cue = catalog.soundCues.cues.find(item => item.category === 'locations' && item.metadata.sound)!;
const block = { id: 'one', text: 'The blue door waited. The blue door opened.' };
const phrase = 'The blue door';

describe('manual Sound Cue placement', () => {
  it('places the same Sound Cue record the HARNESS stores, on the exact occurrence selected, with origin manual', () => {
    const startOffset = block.text.lastIndexOf(phrase);
    const result = createManualSoundCue(block, { blockId: block.id, selectedText: phrase,
      startOffset, endOffset: startOffset + phrase.length }, cue, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cue).toMatchObject({
      id: `sound-cue:one:${startOffset}-${startOffset + phrase.length}`,
      kind: 'sound-cue',
      anchor: { level: 'span', blockId: 'one', startOffset, endOffset: startOffset + phrase.length, selectedText: phrase },
      payload: { origin: 'manual', sound: cue.metadata.sound, cue: { publicUrl: cue.public_url, category: 'locations', provenance: { catalogId: 'library-default-cues' } } },
    });
    expect(resolvePlayableSoundCue(result.cue).ok).toBe(true);
    const segments = splitBySoundCues(block.text, [result.cue]);
    expect(segments.filter(segment => segment.cue)).toHaveLength(1);
    expect(segments[0].text).toBe('The blue door waited. ');
    expect(segments.map(segment => segment.text).join('')).toBe(block.text);
  });

  it('rejects stale offsets, overlapping placements and unapproved recordings or ones without a sound word', () => {
    const selected = { blockId: 'one', selectedText: phrase, startOffset: 0, endOffset: phrase.length };
    expect(createManualSoundCue(block, { ...selected, startOffset: 1 }, cue, catalog))
      .toMatchObject({ ok: false, reason: 'stale-selection' });
    expect(createManualSoundCue(block, selected, cue, catalog, [{
      blockId: 'one', selectedText: 'blue door', startOffset: 4, endOffset: 13,
    }])).toMatchObject({ ok: false, reason: 'overlapping-placement' });
    expect(createManualSoundCue(block, selected, { ...cue, public_url: 'https://unapproved.example/cue.mp3' }, catalog))
      .toMatchObject({ ok: false, reason: 'unavailable-cue' });
    const wordless = catalog.soundCues.cues.find(item => !item.metadata.sound)!;
    expect(createManualSoundCue(block, selected, wordless, catalog))
      .toMatchObject({ ok: false, reason: 'unavailable-cue' });
  });

  it('places a cue only on 1–5 whole words, and snaps a selection to its whole words', () => {
    const scene = { id: 'scene', text: 'Lin Wei drew his sword, planted his feet on the cracked tiles.' };
    const select = (start: number, end: number) => ({ blockId: 'scene', selectedText: scene.text.slice(start, end), startOffset: start, endOffset: end });
    const sword = scene.text.indexOf('sword');
    expect(createManualSoundCue(scene, select(sword, sword + 3), cue, catalog)).toMatchObject({ ok: false, reason: 'partial-word' });
    expect(createManualSoundCue(scene, select(sword, sword + 6), cue, catalog)).toMatchObject({ ok: false, reason: 'partial-word' });
    expect(createManualSoundCue(scene, select(0, scene.text.indexOf(' on')), cue, catalog)).toMatchObject({ ok: false, reason: 'too-many-words' });
    const drew = scene.text.indexOf('drew');
    expect(createManualSoundCue(scene, select(drew, sword + 5), cue, catalog).ok).toBe(true);

    expect(snapSoundCueSelection(scene, select(drew + 1, sword + 3))).toEqual({ ok: true, selection: select(drew, sword + 5) });
    expect(snapSoundCueSelection(scene, select(sword + 5, sword + 7))).toEqual({ ok: false, reason: 'no-words' });
    expect(snapSoundCueSelection(scene, select(0, scene.text.length))).toEqual({ ok: false, reason: 'too-many-words' });
  });
});
