import { describe, expect, it } from 'vitest';
import { HOLDING_CHANGE_KIND, type CodexEntry, type HoldingChangeAttachment, type HoldingVerb } from '../../../narrative/holdings';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { APPEARANCE_KIND, type AppearanceAttachment, type AppearancePayload } from '../../../narrative/appearances';
import { deriveStoryCodex, type StoryCodexChapter } from './storyCodex';

const MC: CodexEntry = { id: 'hcx_mc', storyId: 's', kind: 'character', name: 'Han Shuo', mainCharacter: true, origin: { source: 'foundation' }, createdAt: '' };
const SWORD: CodexEntry = { id: 'hcx_sword', storyId: 's', kind: 'thing', name: 'Broken Broadsword', origin: { source: 'tag', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };

const speaker = (chapter: number, paragraph: number, text: string, words: string, name: string, protagonist = false): SpeakerAttachment => {
  const start = text.indexOf(words);
  const blockId = `c${chapter}-p${paragraph}`;
  return { id: `speaker:${blockId}:${start}`, kind: SPEAKER_KIND, anchor: { level: 'span', blockId, startOffset: start, endOffset: start + words.length, selectedText: words }, payload: { origin: 'harness', speaker: name, protagonist } } as SpeakerAttachment;
};
const change = (chapter: number, paragraph: number, verb: HoldingVerb, target?: CodexEntry, holder = MC): HoldingChangeAttachment => ({
  id: `holding:c${chapter}-p${paragraph}:${verb}`, kind: HOLDING_CHANGE_KIND,
  anchor: { level: 'span', blockId: `c${chapter}-p${paragraph}`, startOffset: 0, endOffset: 4, selectedText: 'Then' },
  payload: { origin: 'harness', verb, holder: { name: holder.name, entryId: holder.id }, ...(target ? { target: { name: target.name, entryId: target.id } } : {}) },
} as HoldingChangeAttachment);

const ONE = ['Ash fell.', 'Then he drew the blade. "Who dares?" the sword said.', 'Then "Quiet," Han Shuo said.'];
const TWO = ['Then the Sovereign laughed. "Fool," she said.', 'Then he set the blade down.'];
const chapters: StoryCodexChapter[] = [
  { id: 'c2', chapterNumber: 2, paragraphs: TWO, holdingChanges: [change(2, 2, 'lost', SWORD)],
    speakers: [speaker(2, 1, TWO[0], '"Fool,"', 'Chi Lian')] },
  { id: 'c1', chapterNumber: 1, paragraphs: ONE, holdingChanges: [change(1, 2, 'gained', SWORD), change(1, 2, 'equipped', SWORD)],
    speakers: [speaker(1, 2, ONE[1], '"Who dares?"', 'Scarlet Sovereign Chi Lian'), speaker(1, 3, ONE[2], '"Quiet,"', 'MC', true)] },
];

describe('the Codex record', () => {
  it('meets characters by what they hold and what they say, the main character first', () => {
    const codex = deriveStoryCodex({
      entries: [MC, SWORD], chapters,
      declared: [{ name: 'Han Shuo', mainCharacter: true }, { name: 'Scarlet Sovereign Chi Lian', aliases: ['Chi Lian'] }, { name: 'Lin Qinghan' }],
    });
    // A declared character the chapters have not reached stays out of the Codex.
    expect(codex.characters.map(character => character.name)).toEqual(['Han Shuo', 'Scarlet Sovereign Chi Lian']);
    const [mc, spirit] = codex.characters;
    expect(mc.voice).toMatchObject({ lines: 1, chapters: [1], first: { chapterNumber: 1, blockId: 'c1-p3', text: '"Quiet,"' } });
    expect(mc.firstSeen).toMatchObject({ chapterNumber: 1, blockId: 'c1-p2' });
    // Speech under a declared alias belongs to the same character.
    expect(spirit.voice).toMatchObject({ lines: 2, chapters: [1, 2], first: { text: '"Who dares?"' } });
  });

  it('keeps sects and other factions out of the characters, declared or named as a body of people', () => {
    const text = 'Then the crowd roared. "Kneel!" the sect cried. "Run," the tribe said.';
    const codex = deriveStoryCodex({
      entries: [MC], declaredFactions: [{ name: 'Iron Crane Sect', aliases: ['the Crane'] }],
      chapters: [{ id: 'c1', chapterNumber: 1, paragraphs: [text], speakers: [
        speaker(1, 1, text, '"Kneel!"', 'the Crane'),
        speaker(1, 1, text, '"Run,"', 'Black Wolf Tribe'),
      ] }],
    });
    expect(codex.characters).toEqual([]);
    expect(codex.factions.map(faction => [faction.name, faction.voice.first.text])).toEqual([
      ['Iron Crane Sect', '"Kneel!"'],
      ['Black Wolf Tribe', '"Run,"'],
    ]);
  });

  it('follows each thing to whoever holds it now, keeping what happened to it after it was lost', () => {
    const codex = deriveStoryCodex({ entries: [MC, SWORD], chapters });
    expect(codex.items).toHaveLength(1);
    const [sword] = codex.items;
    expect(sword).toMatchObject({ name: 'Broken Broadsword', firstSeen: { chapterNumber: 1 } });
    expect(sword.holder).toBeUndefined();
    expect(sword.events.map(event => `${event.passage.chapterNumber} ${event.verb} ${event.holder}`)).toEqual(['1 gained Han Shuo', '1 equipped Han Shuo', '2 lost Han Shuo']);
  });

  it('points each check at its paragraph', () => {
    const codex = deriveStoryCodex({ entries: [MC, SWORD], chapters: [{ ...chapters[1], holdingChanges: [change(1, 2, 'lost', SWORD)] }] });
    expect(codex.checks).toEqual([expect.objectContaining({ kind: 'not-held', chapterNumber: 1, blockId: 'c1-p2' })]);
  });

  it('meets whoever and whatever stepped onto the page, with the latest look and every change to it', () => {
    const ELDER: CodexEntry = { id: 'hcx_mo', storyId: 's', kind: 'character', name: 'Elder Mo Tieshan', aliases: ['Elder Mo'], origin: { source: 'foundation' }, createdAt: '' };
    const FURNACE: CodexEntry = { id: 'hcx_furnace', storyId: 's', kind: 'thing', name: 'Heavenly Furnace', origin: { source: 'tag', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };
    const shown = (chapter: number, paragraph: number, payload: Omit<AppearancePayload, 'origin'>): AppearanceAttachment => ({
      id: `appearance:c${chapter}-p${paragraph}`, kind: APPEARANCE_KIND,
      anchor: { level: 'span', blockId: `c${chapter}-p${paragraph}`, startOffset: 0, endOffset: 4, selectedText: 'Then' },
      payload: { origin: 'harness', ...payload },
    });
    const text = 'Then "Work," Elder Mo said.';
    const codex = deriveStoryCodex({
      entries: [MC, ELDER, FURNACE],
      chapters: [
        { id: 'c1', chapterNumber: 1, paragraphs: ['Then the forge.', 'Then the elder.', 'Then the furnace.'],
          appearances: [
            shown(1, 2, { event: 'appears', subject: { name: 'Elder Mo Tieshan', entryId: ELDER.id }, entity: 'character' }),
            shown(1, 3, { event: 'appears', subject: { name: 'Heavenly Furnace', entryId: FURNACE.id }, entity: 'thing' }),
            // A sect tagged as a character is never one.
            shown(1, 1, { event: 'appears', subject: { name: 'Iron Bastion Sect' }, entity: 'character' }),
          ],
          looks: { status: 'described', at: '', looks: [
            { appearanceId: 'appearance:c1-p2', summary: 'A broad old smith.', traits: { build: 'broad' } },
            { appearanceId: 'appearance:c1-p3', summary: 'A bronze furnace taller than a man.', traits: { material: 'bronze' } },
          ] } },
        { id: 'c2', chapterNumber: 2, paragraphs: [text, 'Then sparks flew.'], speakers: [speaker(2, 1, text, '"Work,"', 'Elder Mo')],
          appearances: [shown(2, 2, { event: 'look', subject: { name: 'Elder Mo Tieshan', entryId: ELDER.id }, change: 'a burnt sleeve' })],
          looks: { status: 'described', at: '', looks: [{ appearanceId: 'appearance:c2-p2', summary: 'A broad old smith, one sleeve burnt.', traits: { build: 'broad', clothing: 'one sleeve burnt' } }] } },
      ],
    });
    expect(codex.characters.map(character => character.name)).toEqual(['Elder Mo Tieshan']);
    const [elder] = codex.characters;
    // Met where he stepped onto the page; his words under his alias are his.
    expect(elder.firstSeen).toMatchObject({ chapterNumber: 1, blockId: 'c1-p2' });
    expect(elder.voice).toMatchObject({ lines: 1, first: { text: '"Work,"' } });
    expect(elder.appearance).toEqual({
      first: { chapterNumber: 1, blockId: 'c1-p2', text: 'Then' },
      look: { summary: 'A broad old smith, one sleeve burnt.', traits: { build: 'broad', clothing: 'one sleeve burnt' }, passage: { chapterNumber: 2, blockId: 'c2-p2', text: 'Then' } },
      changes: [{ change: 'a burnt sleeve', passage: { chapterNumber: 2, blockId: 'c2-p2', text: 'Then' } }],
    });
    // A thing that stepped onto the page joins the items, held by no one.
    expect(codex.items).toEqual([expect.objectContaining({ key: FURNACE.id, name: 'Heavenly Furnace', count: 0, events: [],
      appearance: expect.objectContaining({ look: expect.objectContaining({ summary: 'A bronze furnace taller than a man.' }) }) })]);
    expect(codex.items[0].holder).toBeUndefined();
    expect(codex.checks).toEqual([]);
  });

  it('adds the appearance checks to the record\'s checks, in story order', () => {
    const text = 'Then "Kneel," Old Wu said.';
    const codex = deriveStoryCodex({
      entries: [MC],
      chapters: [{ id: 'c1', chapterNumber: 1, paragraphs: [text], appearances: [], speakers: [speaker(1, 1, text, '"Kneel,"', 'Old Wu')] }],
    });
    expect(codex.checks).toEqual([expect.objectContaining({ kind: 'speaks-unseen', chapterNumber: 1, blockId: 'c1-p1', message: 'Chapter 1: ‘Old Wu’ speaks before any tag shows them appearing.' })]);
  });
});
