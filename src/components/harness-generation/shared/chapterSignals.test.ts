import { describe, expect, it } from 'vitest';
import { ignoredSoundCueListWarning, stripReplyMarks } from './chapterSignals';

describe('HARNESS chapter signals', () => {
  it('strips every tag from every reply field except the paragraphs, keeping the words a sound tag wraps', () => {
    const reply = stripReplyMarks({
      title: 'The [[sound: beast growl | Fox | low]]',
      paragraphs: ['The [[sound: beast growl | fox growled | low]].'],
      recap: '[[@MC]] The [[sound: beast growl | fox growled]] once. [[gained: MC | Fox Pelt]]',
      arcCompletion: { goalId: 'g', completed: true, evidence: 'The [[sound: beast growl | fox growled]].' },
      storyEnded: { ended: false, evidence: '' },
      nextConflict: ['[[3|x]]'],
    });
    expect(reply).toEqual({
      title: 'The Fox',
      paragraphs: ['The [[sound: beast growl | fox growled | low]].'],
      recap: 'The fox growled once.',
      arcCompletion: { goalId: 'g', completed: true, evidence: 'The fox growled.' },
      storyEnded: { ended: false, evidence: '' },
      nextConflict: ['x'],
    });
  });

  it('says so when a writer still returns the retired Sound Cue list, which places nothing', () => {
    expect(ignoredSoundCueListWarning({ paragraphs: [], soundCues: [{ mark: 1, sound: 'beast growl' }] })).toEqual({
      code: 'sound_cue_set_aside',
      message: 'Ignored a separate soundCues list: sounds are placed only from the sound tags in the paragraphs.',
    });
    expect(ignoredSoundCueListWarning({ paragraphs: [] })).toBeUndefined();
    expect(ignoredSoundCueListWarning({ paragraphs: [], soundCues: null })).toBeUndefined();
  });
});
