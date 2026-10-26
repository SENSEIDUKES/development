import { describe, expect, it } from 'vitest';
import { HARNESS_HARD_RULES, HARNESS_READING_GUIDE, HARNESS_RETURN_FORMAT, HARNESS_ROLE, HARNESS_WRITING_RULES, buildHarnessChapterResponseSchema, presentHoldings, presentImmediateChapterRequest } from './prompt';
import { SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS } from '../../lib/senLightNovelAuthorInstructions';

/** Every HARNESS part of the system instruction, together. */
const HARNESS_RESPONSE_CONTRACT = [HARNESS_ROLE, HARNESS_WRITING_RULES, HARNESS_READING_GUIDE, HARNESS_RETURN_FORMAT, HARNESS_HARD_RULES].join('\n\n');

/** The schema every story receives: no tag ever travels here. */
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
  it('asks for no separate list of signals: sounds, speakers and holding changes travel as tags inside the paragraphs', () => {
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties).not.toHaveProperty('soundCues');
    expect(buildHarnessChapterResponseSchema(50).properties).not.toHaveProperty('soundCues');
    expect(JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA)).not.toMatch(/sound|mark"/i);
    // How to tag lives in the CAPA skills, never in the permanent contract.
    expect(HARNESS_RESPONSE_CONTRACT).not.toMatch(/Sound Cue|soundCues|sound tag|\[\[/);
  });

  it('holds every chapter to the point of view the story opened in, and leaves the first choice to the Style skill', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('POINT OF VIEW: Current Story Information\'s pointOfView is the point of view the story has been told in since it opened');
    expect(HARNESS_RESPONSE_CONTRACT).toContain('Write this whole chapter in that point of view and never switch it. When pointOfView is absent, your Style skill chooses it.');
  });

  it('asks for the chapter\'s name alone as its title, since the HARNESS numbers chapters', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('title is the chapter\'s name alone, never its number, which the HARNESS assigns.');
  });

  it('holds the paragraphs to the exact count the HARNESS rolled, and leaves them free without one', () => {
    expect(buildHarnessChapterResponseSchema(73).properties.paragraphs).toMatchObject({ type: 'array', items: { type: 'string' }, minItems: 73, maxItems: 73 });
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

  it('leaves craft to the Author skill and keeps only what the app depends on', () => {
    // SENSEI, 2026-10-26: "a lot of it seems like we're restricting the
    // creativity too much, not actually simply enforcing the structure." How a
    // chapter opens, when a character is described in full and how often a word
    // may repeat are the Author's, which any author can replace; the HARNESS
    // rules, which no skill can, keep only what the app itself reads back.
    for (const craft of ['OPENINGS:', 'CHARACTER DESCRIPTIONS:', 'WORD CHOICE:']) {
      expect(HARNESS_RESPONSE_CONTRACT, craft).not.toContain(craft);
    }
    for (const kept of ['POINT OF VIEW:', 'Carry relationships, decisions, unresolved consequences']) {
      expect(HARNESS_RESPONSE_CONTRACT, kept).toContain(kept);
    }
    // Said once: the recap rule above it already tells the writer to continue from there.
    expect(HARNESS_RESPONSE_CONTRACT.split('continue from the latest Previously On recap')).toHaveLength(2);
    expect(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS).toContain('Open every chapter the same way. Scenery is one way to begin, not a habit.');
    expect(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS).toContain('Repeat a character\u2019s full portrait chapter after chapter. Give the full picture when the moment earns it, a light touch between.');
    expect(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS).toContain('Lean on a pet word or image.');
  });

  it('asks every chapter for the closing list of the main character\'s holdings, as a plain list of names', () => {
    const withHoldings = buildHarnessChapterResponseSchema(50);
    expect(withHoldings.properties.mainCharacterHoldings).toEqual({
      type: 'array', items: { type: 'string' },
      description: 'After the chapter: every thing the main character has and every ability they know or are learning, each by its exact name.',
    });
    // Right after the chapter body, while it is fresh, and required.
    expect(Object.keys(withHoldings.properties).slice(0, 4)).toEqual(['title', 'plan', 'paragraphs', 'mainCharacterHoldings']);
    expect(withHoldings.required.slice(0, 2)).toEqual(['paragraphs', 'mainCharacterHoldings']);
    // A list of strings adds no structure: the schema stays as shallow and as small as before.
    const shape = describeSchemaShape(withHoldings);
    expect(shape.objectSchemas).toBe(describeSchemaShape(buildHarnessChapterResponseSchema(50)).objectSchemas);
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(3);
    expect(shape.serializedBytes).toBeLessThan(2_200);
    // The writer places no tags, so this list is the one thing it is asked for
    // beside the prose: the Holdings fixer's independent cross-check against
    // the tagger's own holding tags (SENSEI, 2026-10-24).
    expect(buildHarnessChapterResponseSchema().properties).toHaveProperty('mainCharacterHoldings');
  });

  it('is compact, shallow, and free of conditional or nested application contracts', () => {
    const shape = describeSchemaShape(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    expect(shape.anyOfBranches).toBe(0);
    // root → arc completion or story ending: nothing deeper.
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(2);
    expect(shape.objectSchemas).toBeLessThanOrEqual(3);
    expect(shape.serializedBytes).toBeLessThan(2_000);
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.required).toEqual([
      'paragraphs', 'mainCharacterHoldings', 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict',
    ]);
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).toEqual([
      'title', 'plan', 'paragraphs', 'mainCharacterHoldings', 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict',
      'storyEnded',
    ]);
    const serialized = JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    for (const forbidden of ['prose', 'blocks', 'memory', 'metadata', 'status', 'worldNotice', 'fateResult', 'blockId', 'url', 'asset', 'catalog', 'trackId', 'id"',
      'dialogue', 'manifestations', 'systemPanels', 'soundscapes', 'creatureEvents', 'anchorText', 'occurrenceIndex', 'category', 'variation']) {
      expect(serialized, forbidden).not.toContain(`"${forbidden}"`);
    }
  });

  it('keeps the recap, chapter function, and three suggestions as shallow root strings', () => {
    const { recap, chapterFunction, nextProgression, nextWorldBuilding, nextConflict } = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties;
    for (const field of [recap, nextProgression, nextWorldBuilding, nextConflict]) expect(field.type).toBe('string');
    expect(chapterFunction).toMatchObject({ type: 'string', enum: ['progression', 'worldBuilding', 'conflict'] });
    // Story direction is author-owned: the provider is never asked for it.
    for (const forbidden of ['hardPins', 'fatePressure', 'destinedEnding', 'rhythmRecommendation', 'missionReminder']) {
      expect(JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA)).not.toContain(`"${forbidden}"`);
    }
  });

  it('keeps the model-authored chapter body to one shallow array of paragraph strings', () => {
    const body = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties.paragraphs;
    expect(body.type).toBe('array');
    expect(body.items).toEqual({ type: 'string' });
    // A one-string body cannot be requested, so a lost blank line cannot
    // collapse a chapter into a single block.
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).not.toContain('prose');
  });


});

describe('the Holdings section the writer reads', () => {
  it('shows the main character even with nothing recorded', () => {
    expect(presentHoldings({ characters: [{ name: 'Ye Chen', mainCharacter: true }] })).toBe('Ye Chen (main character): nothing recorded yet.');
  });

  it('puts rank beside the name and gives each list one line, by exact name', () => {
    expect(presentHoldings({ characters: [
      { name: 'Ye Chen', mainCharacter: true, rank: 'Qi Condensation 3', inHand: ['Rusted Iron Sword'], carries: ['Jade Pendant', 'Spirit Pill ×3'], knows: ['Iron Palm (Minor Success)', 'Cloud Step (sealed)'], learning: ['Wind Step'] },
      { name: 'Elder Qin', carries: ['Jade Gourd'] },
    ] })).toBe([
      'Ye Chen (main character) · rank: Qi Condensation 3',
      '- in hand: Rusted Iron Sword',
      '- carries: Jade Pendant; Spirit Pill ×3',
      '- knows: Iron Palm (Minor Success); Cloud Step (sealed)',
      '- learning: Wind Step',
      '',
      'Elder Qin',
      '- carries: Jade Gourd',
    ].join('\n'));
  });
});
