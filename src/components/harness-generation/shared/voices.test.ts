import { describe, expect, it } from 'vitest';
import { castVoice } from '../../../audio/voiceCast';
import type { CodexEntry } from '../../../narrative/holdings';
import { SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from '../../../narrative/speech';
import { createCodexEntryResolver } from './holdings';
import { firstVoices, fullNameOf, readAloudVoicesOf, resolveSpeakers } from './voices';

const record = (blockId: string, name: string, protagonist = false, entryId?: string): SpeakerAttachment => ({
  id: speakerAttachmentId(blockId, 0, 6), kind: SPEAKER_KIND,
  anchor: { level: 'span', blockId, startOffset: 0, endOffset: 6, selectedText: '"Run!"' },
  payload: { origin: 'harness', speaker: name, protagonist, ...(entryId ? { entryId } : {}) },
});
const entry = (id: string, name: string, extra: Partial<CodexEntry> = {}): CodexEntry => ({
  id, storyId: 's', kind: 'character', name, origin: { source: 'foundation' }, createdAt: 'now', ...extra,
});

describe('Character voices', () => {
  it('points a speaker at their card only when they have one, and never makes a card for a speaker alone', () => {
    let ids = 0;
    const declared = [{ name: 'Ye Chen', mainCharacter: true as const }, { name: 'Lan Yue', aliases: ['Miss Lan'] }];
    const resolver = createCodexEntryResolver({
      storyId: 's', chapter: { id: 'ch1', chapterNumber: 1 }, entries: [entry('e-wu', 'Old Wu')],
      declared, createdAt: 'now', createId: () => `new-${++ids}`,
    });
    const resolved = resolveSpeakers({
      speakers: [
        record('c1-p1', 'Ye Chen', true), record('c1-p2', 'old wu'), record('c1-p3', 'Miss Lan'),
        record('c1-p4', 'The Crowd'), record('c1-p5', 'A guard'), record('c1-p6', 'Iron Crane Sect'),
      ],
      resolver, declared,
    });
    const main = resolver.created.find(created => created.mainCharacter)!;
    const lan = resolver.created.find(created => created.name === 'Lan Yue')!;
    // The main character, a card the record holds, a character the Story Seed declares; a crowd, a guard and a sect have none.
    expect(resolved.map(speaker => speaker.payload.entryId)).toEqual([main.id, 'e-wu', lan.id, undefined, undefined, undefined]);
    expect(resolver.created.map(created => created.name)).toEqual(['Ye Chen', 'Lan Yue']);
  });

  it('lets a first name alone stand for the one character it belongs to', () => {
    const names = ['Mina Kisaragi', 'Toma Iori', 'Soren', 'Lan Yue', 'Lan Feng'];
    expect(fullNameOf('Mina', names)).toBe('Mina Kisaragi');
    expect(fullNameOf('toma', names)).toBe('Toma Iori');
    expect(fullNameOf('Lan', names)).toBeUndefined();
    expect(fullNameOf('Soren', names)).toBeUndefined();
    expect(fullNameOf('Mina Kisaragi', names)).toBeUndefined();
  });

  it('gives each character who first speaks a voice of the cast, of the gender and age the record holds, different from the others\', and never changes one already on a card', () => {
    const entries = [
      entry('e-main', 'Ye Chen', { mainCharacter: true }),
      entry('e-wu', 'Old Wu', { voice: { key: 'old-grandmaster-male', chosen: 'reader', at: 'before' } }),
      entry('e-lan', 'Lan Yue'),
      entry('e-elder', 'Elder Mu'),
      entry('e-quiet', 'Stranger'),
      entry('e-spirit', 'The Lantern Spirit'),
      { ...entry('e-sword', 'Rusted Sword'), kind: 'thing' as const },
    ];
    const speakers = ['Ye Chen', 'Old Wu', 'Lan Yue', 'Elder Mu', 'Rusted Sword', 'Stranger', 'The Lantern Spirit']
      .map((name, index) => record(`c1-p${index + 1}`, name, name === 'Ye Chen', entries.find(candidate => candidate.name === name)!.id));
    // As the plans that cast them gave them.
    const cast: Record<string, { gender?: 'male' | 'female' | 'other'; age?: 'young' | 'adult' | 'elder' | 'ageless' }> = {
      'Ye Chen': { gender: 'male', age: 'young' }, 'Lan Yue': { gender: 'female', age: 'adult' }, 'Elder Mu': { gender: 'male', age: 'elder' },
      'The Lantern Spirit': { gender: 'other', age: 'ageless' },
    };
    const voices = firstVoices({ speakers, entries, at: 'now', castOf: candidate => cast[candidate.name] });
    // The record holds no gender for the stranger, and the spirit is neither: their role's voice reads them until the reader chooses.
    expect([...voices.keys()]).toEqual(['e-main', 'e-lan', 'e-elder']);
    expect(voices.get('e-main')).toMatchObject({ chosen: 'auto', at: 'now', key: expect.stringMatching(/protagonist-male$/) });
    expect(castVoice(voices.get('e-lan')!.key)?.gender).toBe('female');
    expect(castVoice(voices.get('e-elder')!.key)).toMatchObject({ gender: 'male', age: 'elder' });
    // Old Wu keeps the reader's choice, and nobody else is given it.
    expect([...voices.values()].map(voice => voice.key)).not.toContain('old-grandmaster-male');
  });

  it('reads each character in the voice on their card, by entry and by every name, and the main character\'s for their untagged lines', () => {
    const voices = readAloudVoicesOf([
      entry('e-main', 'Ye Chen', { mainCharacter: true, voice: { key: 'dark-protagonist-male', chosen: 'auto', at: 'now' } }),
      entry('e-wu', 'Old Wu', { aliases: ['The Smith'], voice: { key: 'old-grandmaster-male', chosen: 'auto', at: 'now' } }),
      entry('e-gone', 'Nobody', { voice: { key: 'retired-voice', chosen: 'auto', at: 'now' } }),
    ]);
    expect(voices).toMatchObject({
      byEntry: { 'e-main': 'dark-protagonist-male', 'e-wu': 'old-grandmaster-male' },
      byName: { 'ye chen': 'dark-protagonist-male', 'old wu': 'old-grandmaster-male', 'the smith': 'old-grandmaster-male' },
      main: 'dark-protagonist-male',
    });
    expect(Object.keys(voices.byEntry)).toEqual(['e-main', 'e-wu']);
    // A first name alone reads in the voice of the one character it belongs to.
    expect(voices.byName).toMatchObject({ ye: 'dark-protagonist-male', wu: 'old-grandmaster-male' });
  });
});
