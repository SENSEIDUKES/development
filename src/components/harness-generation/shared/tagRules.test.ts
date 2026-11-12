import { describe, expect, it } from 'vitest';
import {
  HARNESS_TAG_RULES,
  HARNESS_TAG_RULES_WITHOUT_CARDS,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_APPEARANCE_INSTRUCTIONS_WITHOUT_CARDS,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  assembleCapaPrompt,
} from '@seihouse/sen/harness-generation';
import { presentTaggerTagTeaching } from '../../../server/harness-generation/tagger';
import { composeHarnessSystemInstruction } from '../../../server/harness-generation/prompt';

const EVERY_KIND = [
  SEN_SOUND_CUES_INSTRUCTIONS, SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS, SEN_HOLDINGS_INSTRUCTIONS, SEN_APPEARANCE_INSTRUCTIONS,
];

describe('HARNESS tag rules', () => {
  it('are said once, before the first kind of tag, in the tagger\'s prompt', () => {
    const teaching = presentTaggerTagTeaching({
      subjects: [{ name: 'Ye Chen', kind: 'character', mainCharacter: true, card: true }],
      soundWords: [{ word: 'blade drawn', example: 'drew his sword' }],
      soundtrack: { music: ['Ambient'], atmospheres: ['Rain'] },
    });
    expect(teaching.split(HARNESS_TAG_RULES)).toHaveLength(2);
    expect(teaching.startsWith(`${HARNESS_TAG_RULES}\n\n`)).toBe(true);
    for (const kind of EVERY_KIND) expect(teaching.indexOf(kind)).toBeGreaterThan(teaching.indexOf(HARNESS_TAG_RULES));
  });

  it('hold only what every tag shares, said once, so no kind repeats them', () => {
    expect(HARNESS_TAG_RULES.split('\n')).toEqual([
      'HARNESS TAG RULES',
      'A tag is a note in the margin, never a mark on the page: it names a paragraph, the exact words it belongs to, and the tag. The chapter is not retyped and not changed; the app places each note on the words it names.',
      'Tag only what the prose shows, where it shows it.',
      'In every tag, Name is MC for the main character; anyone else goes by the name listed below.',
      'The story\'s cards are listed below: its characters, things, abilities and places. Your work is to find them on the page. When the prose shows one of them, by name or by a description that fits its card, tag it by the card\'s name.',
      'Anyone who is not a card is a minor figure. A minor figure gets two tags only: appears, where they first step onto the page, and their speaker tag on each line they speak. Never a holding, a condition, a place, a tie or a look of their own.',
      'A thing or place that is not a card is named only in a card character\'s own tag (what they gained, where they arrived). It gets no appears tag.',
      'Each example below is one note, written as you return it.',
    ]);
    for (const instructions of EVERY_KIND) {
      expect(instructions).not.toMatch(/note in the margin|Name is MC for the main character/i);
      // Written for a tagger reading finished prose, never for an author composing it (SENSEI, 2026-10-29).
      expect(instructions).not.toMatch(/your sentence|your prose|describe them there|Start each paragraph|One speaker per paragraph|Story Information|Appeared/);
      // SENSEI, 2026-10-17: short, with no FORMAT / REQUIRED / FORBIDDEN / CHECK wall.
      expect(instructions).not.toMatch(/^(JOB|FORMAT|REQUIRED|FORBIDDEN|CHECK BEFORE YOU RETURN)\b/m);
    }
  });

  it('teach a story with no cards as before: everyone it names is tagged in full (SENSEI, 2026-11-11)', () => {
    // Chapters brought in from outside have no cards to tell a minor figure from.
    for (const subjects of [undefined, [], [{ name: 'Ye Chen', kind: 'character' as const, mainCharacter: true as const }]]) {
      const teaching = presentTaggerTagTeaching({ ...(subjects ? { subjects } : {}) });
      expect(teaching.startsWith(`${HARNESS_TAG_RULES_WITHOUT_CARDS}\n\n`)).toBe(true);
      expect(teaching).toContain(SEN_APPEARANCE_INSTRUCTIONS_WITHOUT_CARDS);
      expect(teaching).not.toMatch(/minor figure|is a card|card's name/);
    }
    expect(HARNESS_TAG_RULES_WITHOUT_CARDS.split('\n')).toEqual([
      'HARNESS TAG RULES',
      'A tag is a note in the margin, never a mark on the page: it names a paragraph, the exact words it belongs to, and the tag. The chapter is not retyped and not changed; the app places each note on the words it names.',
      'Tag only what the prose shows, where it shows it.',
      'In every tag, Name is MC for the main character; anyone else goes by the name the story already has, listed below.',
      'Each example below is one note, written as you return it.',
    ]);
    // The appears teaching differs in its first line and its naming line, and nowhere else.
    const [cards, none] = [SEN_APPEARANCE_INSTRUCTIONS, SEN_APPEARANCE_INSTRUCTIONS_WITHOUT_CARDS].map(text => text.split('\n'));
    expect(cards.map((line, index) => line === none[index])).toEqual([false, true, true, true, true, true, false]);
    expect(cards[0]).toBe('When a character, or a thing or place that is a card, steps onto the page for the first time in the story, tag the sentence that shows what they look like:');
    expect(cards.at(-1)).toBe('Use the card\'s name. A minor figure goes by the name the chapter calls them most, or by what it calls them when it gives no name (the innkeeper). Only who is on the page, not mentioned or remembered.');
    expect(none[0]).toBe('When someone, a named thing or a named place steps onto the page for the first time in the story, tag the sentence that shows what they look like:');
    expect(none.at(-1)).toBe('Use the full name the story will keep using. Only who is on the page, not mentioned or remembered.');
  });

  it('never reach the chapter writer: it places no tags (SENSEI, 2026-10-24)', () => {
    const system = composeHarnessSystemInstruction(assembleCapaPrompt({
      capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL],
    }));
    expect(system).not.toContain('HARNESS TAG RULES');
    expect(system).not.toContain('HOW TO TAG');
    for (const kind of EVERY_KIND) expect(system).not.toContain(kind);
    // Nor any tag form, by the one shape every kind of tag is written in.
    expect(system).not.toMatch(/\[\[[a-z@]/);
  });
});
