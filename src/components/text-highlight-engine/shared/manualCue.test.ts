import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createMediaCatalog } from '../../../audio/media';
import { resolvePlayableAudioMoment, splitByResolvedAudioMoments } from '../../../audio/inlineAudio';
import { createManualCueMoment } from './manualCue';

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
    const overlap = { id: 'overlap', text: 'aaaaa' };
    expect(createManualCueMoment(overlap, { blockId: 'overlap', selectedText: 'aaa', startOffset: 1, endOffset: 4 }, cue, catalog))
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
});
