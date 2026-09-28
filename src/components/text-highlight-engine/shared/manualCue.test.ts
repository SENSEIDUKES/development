import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createMediaCatalog } from '../../../audio/media';
import { resolvePlayableAudioMoment, splitByResolvedAudioMoments } from '../../../audio/inlineAudio';
import { createManualCueMoment, snapSoundCueSelection } from './manualCue';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);
const cue = catalog.soundCues.cues.find(item => item.category === 'locations')!;
const block = { id: 'one', text: 'The blue door waited. The blue door opened.' };
const phrase = 'The blue door';

describe('manual Sound Cue placement', () => {
  it('anchors the selected repeated occurrence and keeps a non-audible author phrase playable', () => {
    const startOffset = block.text.lastIndexOf(phrase);
    const result = createManualCueMoment(block, { blockId: block.id, selectedText: phrase,
      startOffset, endOffset: startOffset + phrase.length }, cue, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moment).toMatchObject({ origin: 'manual', blockId: 'one', triggerPhrase: phrase,
      occurrenceIndex: 1, cue: { publicUrl: cue.public_url } });
    expect(resolvePlayableAudioMoment(result.moment).ok).toBe(true);
    const segments = splitByResolvedAudioMoments(block.text, [result.moment]);
    expect(segments.filter(segment => segment.moment)).toHaveLength(1);
    expect(segments[0].text).toBe('The blue door waited. ');
    expect(segments.map(segment => segment.text).join('')).toBe(block.text);
  });

  it('rejects stale offsets, overlapping occurrences and unapproved or reserved cues', () => {
    const selected = { blockId: 'one', selectedText: phrase, startOffset: 0, endOffset: phrase.length };
    expect(createManualCueMoment(block, { ...selected, startOffset: 1 }, cue, catalog))
      .toMatchObject({ ok: false, reason: 'stale-selection' });
    const overlap = { id: 'overlap', text: 'ha ha ha' };
    expect(createManualCueMoment(overlap, { blockId: 'overlap', selectedText: 'ha ha', startOffset: 3, endOffset: 8 }, cue, catalog))
      .toMatchObject({ ok: false, reason: 'unrepresentable-occurrence' });
    expect(createManualCueMoment(block, selected, cue, catalog, [{
      blockId: 'one', selectedText: 'blue door', startOffset: 4, endOffset: 13,
    }])).toMatchObject({ ok: false, reason: 'overlapping-placement' });
    expect(createManualCueMoment(block, selected, { ...cue, public_url: 'https://unapproved.example/cue.mp3' }, catalog))
      .toMatchObject({ ok: false, reason: 'unavailable-cue' });
    const atmosphere = catalog.soundCues.cues.find(item => item.category === 'atmosphere')!;
    expect(createManualCueMoment(block, selected, atmosphere, catalog))
      .toMatchObject({ ok: false, reason: 'unavailable-cue' });
  });

  it('places a cue only on 1–5 whole words, and snaps a selection to its whole words', () => {
    const scene = { id: 'scene', text: 'Lin Wei drew his sword, planted his feet on the cracked tiles.' };
    const select = (start: number, end: number) => ({ blockId: 'scene', selectedText: scene.text.slice(start, end), startOffset: start, endOffset: end });
    const sword = scene.text.indexOf('sword');
    expect(createManualCueMoment(scene, select(sword, sword + 3), cue, catalog)).toMatchObject({ ok: false, reason: 'partial-word' });
    expect(createManualCueMoment(scene, select(sword, sword + 6), cue, catalog)).toMatchObject({ ok: false, reason: 'partial-word' });
    expect(createManualCueMoment(scene, select(0, scene.text.indexOf(' on')), cue, catalog)).toMatchObject({ ok: false, reason: 'too-many-words' });
    const drew = scene.text.indexOf('drew');
    expect(createManualCueMoment(scene, select(drew, sword + 5), cue, catalog).ok).toBe(true);

    expect(snapSoundCueSelection(scene, select(drew + 1, sword + 3))).toEqual({ ok: true, selection: select(drew, sword + 5) });
    expect(snapSoundCueSelection(scene, select(sword + 5, sword + 7))).toEqual({ ok: false, reason: 'no-words' });
    expect(snapSoundCueSelection(scene, select(0, scene.text.length))).toEqual({ ok: false, reason: 'too-many-words' });
  });
});
