import { describe, expect, it } from 'vitest';
import { castVoice } from '../../../audio/voiceCast';
import type { CodexEntry } from '../../../narrative/holdings';
import { SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from '../../../narrative/speech';
import { createCodexEntryResolver } from './holdings';
import { firstVoices, fullNameOf, readAloudVoicesOf, resolveSpeakers, speakerGender } from './voices';

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

  it('tells a gender only from the author\'s own notes, never from the chapter\'s prose', () => {
    expect(speakerGender('A young woman of the Lan family.')).toBe('female');
    expect(speakerGender('Age: Appears in his late thirties. A lean man.')).toBe('male');
    expect(speakerGender('Age: 27; skin tone: warm beige; eyes: dark brown.')).toBeUndefined();
    expect(speakerGender(undefined)).toBeUndefined();
  });

  it('lets a first name alone stand for the one character it belongs to', () => {
    const names = ['Mina Kisaragi', 'Toma Iori', 'Soren', 'Lan Yue', 'Lan Feng'];
    expect(fullNameOf('Mina', names)).toBe('Mina Kisaragi');
    expect(fullNameOf('toma', names)).toBe('Toma Iori');
    expect(fullNameOf('Lan', names)).toBeUndefined();
    expect(fullNameOf('Soren', names)).toBeUndefined();
    expect(fullNameOf('Mina Kisaragi', names)).toBeUndefined();
  });

  it('gives each character who first speaks a voice of the cast, of the gender the Story Seed gives, different from the others\', and never changes one already on a card', () => {
    const entries = [
      entry('e-main', 'Ye Chen', { mainCharacter: true }),
      entry('e-wu', 'Old Wu', { voice: { key: 'old-grandmaster-male', chosen: 'reader', at: 'before' } }),
      entry('e-lan', 'Lan Yue'),
      entry('e-quiet', 'Stranger'),
      { ...entry('e-sword', 'Rusted Sword'), kind: 'thing' as const },
    ];
    const speakers = [record('c1-p1', 'Ye Chen', true, 'e-main'), record('c1-p2', 'Old Wu', false, 'e-wu'), record('c1-p3', 'Lan Yue', false, 'e-lan'), record('c1-p4', 'Rusted Sword', false, 'e-sword'), record('c1-p5', 'Stranger', false, 'e-quiet')];
    const notes: Record<string, string> = { 'Ye Chen': 'A lean young man.', 'Lan Yue': 'A swordswoman; her blade is old.' };
    const voices = firstVoices({ speakers, entries, at: 'now', notesOf: entry => notes[entry.name] });
    // Nothing in the Story Seed tells the stranger's gender: their role's voice reads them until the reader chooses.
    expect([...voices.keys()]).toEqual(['e-main', 'e-lan']);
    expect(voices.get('e-main')).toMatchObject({ chosen: 'auto', at: 'now', key: expect.stringMatching(/protagonist-male$/) });
    expect(castVoice(voices.get('e-lan')!.key)?.gender).toBe('female');
    expect(voices.get('e-lan')!.key).not.toBe('old-grandmaster-male');
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
