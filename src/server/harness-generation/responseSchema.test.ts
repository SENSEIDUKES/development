import { describe, expect, it } from 'vitest';
import { HARNESS_HARD_RULES, HARNESS_READING_GUIDE, HARNESS_RETURN_FORMAT, HARNESS_ROLE, HARNESS_WRITING_RULES, buildHarnessChapterResponseSchema, presentChapterPlan, presentImmediateChapterRequest, presentPlanFact } from './prompt';

/** Every HARNESS part of the system instruction, together. */
const HARNESS_RESPONSE_CONTRACT = [HARNESS_ROLE, HARNESS_WRITING_RULES, HARNESS_READING_GUIDE, HARNESS_RETURN_FORMAT, HARNESS_HARD_RULES].join('\n\n');

/** The schema every story receives: sound words travel in the CAPA Prompt, never here. */
const HARNESS_CHAPTER_RESPONSE_SCHEMA = buildHarnessChapterResponseSchema();

/** Shape metrics of a serialized provider schema; see the PR for before/after values. */
export const describeSchemaShape = (schema: unknown) => {
  let maxObjectDepth = 0; let objectSchemas = 0; let arraySchemas = 0; let enumValues = 0; let anyOfBranches = 0; let properties = 0;
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(item => walk(item, depth)); return; }
    const record = node as Record<string, unknown>;
    if (record.type === 'object') { objectSchemas += 1; maxObjectDepth = Math.max(maxObjectDepth, depth); }
    if (record.type === 'array') arraySchemas += 1;
    if (Array.isArray(record.enum)) enumValues += record.enum.length;
    for (const key of ['anyOf', 'oneOf', 'allOf']) if (Array.isArray(record[key])) { anyOfBranches += (record[key] as unknown[]).length; walk(record[key], depth); }
    if (record.properties && typeof record.properties === 'object') {
      const props = record.properties as Record<string, unknown>;
      properties += Object.keys(props).length;
      Object.values(props).forEach(value => walk(value, depth + 1));
    }
    if (record.items) walk(record.items, depth + 1);
    if (record.additionalProperties && typeof record.additionalProperties === 'object') walk(record.additionalProperties, depth + 1);
  };
  walk(schema, 1);
  return { serializedBytes: JSON.stringify(schema).length, maxObjectDepth, objectSchemas, arraySchemas, properties, enumValues, anyOfBranches };
};

describe('HARNESS chapter response schema shape', () => {
  it('asks for no separate list of signals: sounds travel as tags inside the paragraphs, each paragraph\'s speaker beside its text', () => {
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties).not.toHaveProperty('soundCues');
    expect(buildHarnessChapterResponseSchema(50, { speakers: ['Old Wu'] }).properties).not.toHaveProperty('soundCues');
    expect(JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA)).not.toMatch(/sound"|mark"/i);
    // How to tag lives in the CAPA skills, never in the permanent contract.
    expect(HARNESS_RESPONSE_CONTRACT).not.toMatch(/Sound Cue|soundCues|sound tag|\[\[/);
  });

  it('holds every chapter to the point of view the story opened in, and leaves the first choice to the Style skill', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('POINT OF VIEW: Current Story Information\'s pointOfView is the point of view the story has been told in since it opened');
    expect(HARNESS_RESPONSE_CONTRACT).toContain('Write this whole chapter in that point of view and never switch it. When pointOfView is absent, your Style skill chooses it.');
  });

  it('asks for the chapter\'s name alone as its title, since the HARNESS numbers chapters', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('title is optional; it is the chapter\'s name alone, never its number, which the HARNESS assigns.');
  });

  it('holds the paragraphs to the exact count the HARNESS rolled, and leaves them free without one', () => {
    expect(buildHarnessChapterResponseSchema(73).properties.paragraphs).toMatchObject({ type: 'array', items: { type: 'object', required: ['speaker', 'text'] }, minItems: 73, maxItems: 73 });
    expect(buildHarnessChapterResponseSchema().properties.paragraphs).not.toHaveProperty('minItems');
    expect(presentImmediateChapterRequest({ chapterNumber: 3, continuation: true, chapterScale: { minWords: 1_800, maxWords: 2_500, paragraphs: 73 } }))
      .toContain('CHAPTER SCALE: exactly 73 paragraph entries, 1,800 to 2,500 words in all: about 25 to 34 words a paragraph.');
  });

  it('tells the writer where the chapter sits in its arc: the first chapter of the story or of an arc grounds the reader, any other opens in motion', () => {
    const request = (chapterNumber: number) => presentImmediateChapterRequest({ chapterNumber, continuation: chapterNumber > 1, chapterScale: { minWords: 1_800, maxWords: 2_500, paragraphs: 50 } });
    expect(request(1)).toContain('WHERE THIS CHAPTER SITS: Chapter 1 of 30 in Arc 1. The reader meets this world, its places and its people for the first time.');
    expect(request(7)).toContain('WHERE THIS CHAPTER SITS: Chapter 7 of 30 in Arc 1. The reader is already in the story: pick up from where the latest Previously On recap leaves off');
    expect(request(30)).toContain('Chapter 30 of 30 in Arc 1. The reader is already in the story');
    expect(request(31)).toContain('WHERE THIS CHAPTER SITS: Chapter 1 of 30 in Arc 2. A new stretch of the story begins: ground the reader again in the world, its places and its people, then move.');
    expect(request(38)).toContain('Chapter 8 of 30 in Arc 2. The reader is already in the story');
    // It follows the chapter it describes, before the scale.
    expect(request(7).indexOf('Write Chapter 7')).toBeLessThan(request(7).indexOf('WHERE THIS CHAPTER SITS'));
    expect(request(7).indexOf('WHERE THIS CHAPTER SITS')).toBeLessThan(request(7).indexOf('CHAPTER SCALE'));
  });

  it('lets openings vary naturally, keeps full character portraits for the moments that earn them, and limits pet words within the chapter', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('Let openings vary naturally from chapter to chapter; describing the place or its weather is one way to begin, never a habit to open every chapter with.');
    // The setting is never forbidden as an opening, only as a habit.
    expect(HARNESS_RESPONSE_CONTRACT).not.toMatch(/Never open it by describing/);
    expect(HARNESS_RESPONSE_CONTRACT).toContain('when they first appear, when they return after time away, and when something about them changes: a breakthrough, a power-up, new gear, an injury, a new rank.');
    expect(HARNESS_RESPONSE_CONTRACT).toContain('A distinctive word or phrase appears at most twice in a chapter; find a fresh way to say it.');
    // The writer sees recaps, never earlier chapters' prose, so it is never asked to avoid words it cannot see.
    expect(HARNESS_RESPONSE_CONTRACT).not.toContain('not carried from chapter to chapter');
  });

  it('gives each paragraph\'s speaker a menu: MC, each character of the Chapter Plan\'s cast, someone else, or none', () => {
    const speaker = (speakers?: string[]) => buildHarnessChapterResponseSchema(50, speakers ? { speakers } : {}).properties.paragraphs.items.properties.speaker;
    expect(speaker(['Old Wu', 'Lan Yue']).enum).toEqual(['MC', 'Old Wu', 'Lan Yue', 'someone else', 'none']);
    expect(speaker().enum).toEqual(['MC', 'someone else', 'none']);
    // A name given twice, or the main character's tag, is one choice.
    expect(speaker(['MC', 'Old Wu', 'Old Wu']).enum).toEqual(['MC', 'Old Wu', 'someone else', 'none']);
  });

  it('is compact, shallow, and free of conditional or nested application contracts', () => {
    const shape = describeSchemaShape(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    expect(shape.anyOfBranches).toBe(0);
    // root → the paragraphs → a paragraph: nothing deeper.
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(3);
    expect(shape.objectSchemas).toBeLessThanOrEqual(2);
    expect(shape.serializedBytes).toBeLessThan(2_400);
    // The writer narrates and never decides (SENSEI, 2026-10-20): no plan, arc goal, ending or chapter function of its own.
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.required).toEqual(['paragraphs', 'recap', 'nextProgression', 'nextWorldBuilding', 'nextConflict']);
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).toEqual(['title', 'paragraphs', 'recap', 'nextProgression', 'nextWorldBuilding', 'nextConflict']);
    const serialized = JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    for (const forbidden of ['prose', 'blocks', 'memory', 'metadata', 'status', 'worldNotice', 'fateResult', 'blockId', 'url', 'asset', 'catalog', 'trackId', 'id"',
      'dialogue', 'manifestations', 'systemPanels', 'soundscapes', 'creatureEvents', 'anchorText', 'occurrenceIndex', 'category', 'variation']) {
      expect(serialized, forbidden).not.toContain(`"${forbidden}"`);
    }
  });

  it('keeps the recap and three suggestions as shallow root strings', () => {
    const { recap, nextProgression, nextWorldBuilding, nextConflict } = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties;
    for (const field of [recap, nextProgression, nextWorldBuilding, nextConflict]) expect(field.type).toBe('string');
    // Story direction is author-owned, and what happens is the planner's: the writer is never asked for either.
    for (const forbidden of ['hardPins', 'fatePressure', 'destinedEnding', 'rhythmRecommendation', 'missionReminder', 'chapterFunction', 'arcCompletion', 'storyEnded', 'plan']) {
      expect(JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA)).not.toContain(`"${forbidden}"`);
    }
  });

  it('keeps the model-authored chapter body to one array of paragraphs, each its speaker and its text (SENSEI, 2026-10-19: as the original Light Novels app asked)', () => {
    const body = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties.paragraphs;
    expect(body.type).toBe('array');
    expect(body.items).toMatchObject({
      type: 'object', required: ['speaker', 'text'],
      properties: { speaker: { type: 'string' }, text: { type: 'string' } },
    });
    expect(Object.keys(body.items.properties)).toEqual(['speaker', 'text']);
    // A one-string body cannot be requested, so a lost blank line cannot
    // collapse a chapter into a single block.
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).not.toContain('prose');
  });


});

describe('the Chapter Plan the writer reads', () => {
  it('shows its cast, each as the record had them and someone new in full, then its events with what each changes', () => {
    expect(presentChapterPlan({
      cast: [
        { name: 'Ye Chen', kind: 'character', mainCharacter: true, look: { summary: 'A lean young man.', traits: { hair: 'dark' } }, status: 'wounded (a cut arm)', rank: 'Qi Condensation 3', inHand: ['Rusted Iron Sword'] },
        { name: 'Old Wu', kind: 'character', new: true, who: 'The armory\'s smith.', gender: 'male', age: 'elder', look: { summary: 'A stooped old smith.', traits: {} } },
        { name: 'Jade Gourd', kind: 'thing', heldBy: 'Old Wu' },
      ],
      events: [{
        kind: 'gain', actor: { name: 'MC' }, targets: [{ name: 'Old Wu' }], attempt: 'to buy the gourd', outcome: 'success at a cost', presses: [{ who: { name: 'MC' }, level: 'light' }],
        how: 'Ye Chen trades his sword for the gourd.',
        facts: [
          { type: 'holding', who: { name: 'MC' }, change: 'loses', what: { name: 'Rusted Iron Sword' } },
          { type: 'holding', who: { name: 'MC' }, change: 'gains', what: { name: 'Jade Gourd' } },
          { type: 'commitment', who: { name: 'Old Wu' }, toWhom: { name: 'MC' }, change: 'entered', what: 'a new blade by spring' },
        ],
      }],
    })).toBe([
      'THE CHAPTER PLAN (decided before this chapter; narrate it, never change it)',
      'CAST',
      '- MC: Ye Chen (main character) · look: A lean young man.; hair: dark · wounded (a cut arm) · rank: Qi Condensation 3 · in hand: Rusted Iron Sword',
      '- Old Wu (new: The armory\'s smith.) · male, elder · look: A stooped old smith.',
      '- Jade Gourd (thing) · held by Old Wu',
      'EVENTS',
      '1. Gain. MC tries to buy the gourd. Outcome: success at a cost.',
      '   How: Ye Chen trades his sword for the gourd.',
      '   Pressure: MC, light.',
      '   Changes: MC loses Rusted Iron Sword. MC gains Jade Gourd. Old Wu commits to MC: a new blade by spring.',
    ].join('\n'));
  });

  it('says each fact in one plain sentence from a fixed table, never a model\'s words', () => {
    const who = { name: 'MC' };
    expect(presentPlanFact({ type: 'holding', who, change: 'improves', what: { name: 'Cloud Step' }, level: 'First Stage' })).toBe('MC improves Cloud Step to First Stage.');
    expect(presentPlanFact({ type: 'holding', who, change: 'rank', what: { name: 'Qi Condensation 4' } })).toBe('MC reaches Qi Condensation 4.');
    expect(presentPlanFact({ type: 'status', who: { name: 'a guard', unnamed: true }, state: 'dead', how: 'an arrow to the throat' })).toBe('A guard is dead (an arrow to the throat).');
    expect(presentPlanFact({ type: 'look', who, change: 'a scar across the left cheek' })).toBe('MC\'s look changes: a scar across the left cheek.');
    expect(presentPlanFact({ type: 'goal', who, change: 'set', what: 'avenge his master' })).toBe('MC sets a goal: avenge his master.');
    expect(presentPlanFact({ type: 'value', who, stance: 'rejected', what: 'mercy for traitors' })).toBe('MC rejects a value: mercy for traitors.');
    expect(presentPlanFact({ type: 'commitment', who, toWhom: { name: 'Lan Yue' }, change: 'broken', what: 'to wait at the gate' })).toBe('MC breaks a commitment to Lan Yue: to wait at the gate.');
    expect(presentPlanFact({ type: 'stance', who, towardWhom: { name: 'Old Wu' }, mode: 'acted', polarity: 'hostile' })).toBe('MC\'s stance toward Old Wu, acted: hostile.');
  });
});
