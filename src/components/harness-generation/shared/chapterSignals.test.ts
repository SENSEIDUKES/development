import { describe, expect, it } from 'vitest';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import { HARNESS_SOUND_CUE_SIGNAL_LIMIT, readHarnessSoundCueSignals, stripReplyMarks } from './chapterSignals';

describe('HARNESS Sound Cue signals', () => {
  it('reads {mark, sound, energy?} and nothing else', () => {
    const { signals, warnings } = readHarnessSoundCueSignals({ soundCues: [
      { mark: 1, sound: ' blade drawn ', energy: 'HIGH', category: 'weapons', anchorText: 'drew his sword' },
      { mark: '2', sound: 'beast roar', energy: 'deafening' },
    ] });
    expect(signals).toEqual([{ mark: 1, sound: 'blade drawn', energy: 'high' }, { mark: 2, sound: 'beast roar' }]);
    expect(warnings).toEqual([]);
  });

  it('sets aside malformed entries with one warning and never throws', () => {
    const { signals, warnings } = readHarnessSoundCueSignals({ soundCues: [
      { mark: 0, sound: 'beast roar' }, { mark: 1.5, sound: 'beast roar' }, { mark: 'one', sound: 'beast roar' },
      { mark: 3, sound: '' }, { mark: 4, sound: 'x'.repeat(49) }, 'beast roar', null,
      { mark: 5, sound: 'beast roar' },
    ] });
    expect(signals).toEqual([{ mark: 5, sound: 'beast roar' }]);
    expect(warnings).toEqual([{ code: 'sound_cue_set_aside', message: 'Set aside 7 malformed Sound Cue signals without affecting the chapter prose.' }]);
    expect(readHarnessSoundCueSignals({ soundCues: { mark: 1 } }).warnings[0].code).toBe('sound_cue_set_aside');
    expect(readHarnessSoundCueSignals({})).toEqual({ signals: [], warnings: [] });
  });

  it('keeps every readable signal, leaving the chapter cap to placement in reading order', () => {
    const many = Array.from({ length: 14 }, (_, index) => ({ mark: index + 1, sound: 'beast roar' }));
    expect(readHarnessSoundCueSignals({ soundCues: many }).signals).toHaveLength(14);
    expect(HARNESS_SOUND_CUE_SIGNAL_LIMIT).toBe(SOUND_CUE_RULES.maxPerChapter);
  });

  it('strips marks from every reply field except the paragraphs and the signals that read them', () => {
    const reply = stripReplyMarks({
      title: 'The [[1|Fox]]',
      paragraphs: ['The [[1|fox growled]].'],
      soundCues: [{ mark: 1, sound: 'beast growl' }],
      recap: 'The [[2|fox growled]] once.',
      arcCompletion: { goalId: 'g', completed: true, evidence: 'The [[1|fox growled]].' },
      storyEnded: { ended: false, evidence: '' },
      nextConflict: ['[[3|x]]'],
    });
    expect(reply).toEqual({
      title: 'The Fox',
      paragraphs: ['The [[1|fox growled]].'],
      soundCues: [{ mark: 1, sound: 'beast growl' }],
      recap: 'The fox growled once.',
      arcCompletion: { goalId: 'g', completed: true, evidence: 'The fox growled.' },
      storyEnded: { ended: false, evidence: '' },
      nextConflict: ['x'],
    });
  });
});
