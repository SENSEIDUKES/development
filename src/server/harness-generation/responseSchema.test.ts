import { describe, expect, it } from 'vitest';
import { HARNESS_RESPONSE_CONTRACT, buildHarnessChapterResponseSchema, buildHarnessMemoryRecoveryPrompt, presentHoldings, presentImmediateChapterRequest } from './prompt';

const WORDS = [{ word: 'blade drawn', example: 'drew his sword' }, { word: 'beast roar', example: 'the beast roared' }];
/** The schema a story with sound words receives. */
const HARNESS_CHAPTER_RESPONSE_SCHEMA = buildHarnessChapterResponseSchema(WORDS);

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
  it('asks for Sound Cues as {mark, sound, energy?} right after the paragraphs, with the story\'s words as the only choices', () => {
    const soundCues = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties.soundCues;
    expect(soundCues).toEqual({
      type: 'array', maxItems: 10,
      items: {
        type: 'object',
        properties: {
          mark: { type: 'integer', minimum: 1 },
          sound: { type: 'string', enum: ['blade drawn', 'beast roar'] },
          energy: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['mark', 'sound'],
      },
    });
    // How to mark lives in the CAPA Sound Cues skill, never in the permanent contract.
    expect(JSON.stringify(soundCues)).not.toMatch(/\bwords?\b|description/i);
    expect(HARNESS_RESPONSE_CONTRACT).not.toMatch(/Sound Cue|soundCues|\[\[/);
  });

  it('holds every chapter to the point of view the story opened in, and leaves the first choice to the Style skill', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('POINT OF VIEW: Current Story Information\'s pointOfView is the point of view the story has been told in since it opened');
    expect(HARNESS_RESPONSE_CONTRACT).toContain('Write this whole chapter in that point of view and never switch it. When pointOfView is absent, your Style skill chooses it.');
  });

  it('asks for the chapter\'s name alone as its title, since the HARNESS numbers chapters', () => {
    expect(HARNESS_RESPONSE_CONTRACT).toContain('title is the chapter\'s name alone, never its number, which the HARNESS assigns.');
  });

  it('holds the paragraphs to the exact count the HARNESS rolled, and leaves them free without one', () => {
    expect(buildHarnessChapterResponseSchema(WORDS, 73).properties.paragraphs).toMatchObject({ type: 'array', items: { type: 'string' }, minItems: 73, maxItems: 73 });
    expect(buildHarnessChapterResponseSchema(WORDS).properties.paragraphs).not.toHaveProperty('minItems');
    expect(presentImmediateChapterRequest({ chapterNumber: 3, continuation: true, chapterScale: { minWords: 1_800, maxWords: 2_500, paragraphs: 73 } }))
      .toContain('CHAPTER SCALE: exactly 73 paragraph entries, 1,800 to 2,500 words in all.');
  });

  it('asks for the closing list of the main character\'s holdings only when the Holdings skill is loaded, as a plain list of names', () => {
    const withHoldings = buildHarnessChapterResponseSchema(WORDS, 50, { holdings: true });
    expect(withHoldings.properties.mainCharacterHoldings).toEqual({
      type: 'array', items: { type: 'string' },
      description: 'After the chapter: every thing the main character has and every ability they know or are learning, each by its exact name.',
    });
    // Right after the chapter body, while it is fresh, and required.
    expect(Object.keys(withHoldings.properties).slice(0, 5)).toEqual(['title', 'plan', 'paragraphs', 'soundCues', 'mainCharacterHoldings']);
    expect(withHoldings.required.slice(0, 2)).toEqual(['paragraphs', 'mainCharacterHoldings']);
    // A list of strings adds no structure: the schema stays as shallow and as small as before.
    const shape = describeSchemaShape(withHoldings);
    expect(shape.objectSchemas).toBe(describeSchemaShape(buildHarnessChapterResponseSchema(WORDS, 50)).objectSchemas);
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(3);
    expect(shape.serializedBytes).toBeLessThan(2_200);
    expect(buildHarnessChapterResponseSchema(WORDS).properties).not.toHaveProperty('mainCharacterHoldings');
  });

  it('carries no Sound Cue field at all for a story without sound words', () => {
    expect(buildHarnessChapterResponseSchema([]).properties).not.toHaveProperty('soundCues');
    expect(buildHarnessChapterResponseSchema().properties).not.toHaveProperty('soundCues');
  });

  it('is compact, shallow, and free of conditional or nested application contracts', () => {
    const shape = describeSchemaShape(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    expect(shape.anyOfBranches).toBe(0);
    // root → Sound Cue list → signal: nothing deeper.
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(3);
    expect(shape.objectSchemas).toBeLessThanOrEqual(4);
    expect(shape.serializedBytes).toBeLessThan(2_000);
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.required).toEqual([
      'paragraphs', 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict',
    ]);
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).toEqual([
      'title', 'plan', 'paragraphs', 'soundCues', 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict',
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

  it('keeps the thirteen-category memory contract on the separate extraction call only', () => {
    const memory = buildHarnessMemoryRecoveryPrompt({
      operation: 'recover-memory', storyId: 's', chapterId: 'c', model: 'google/gemini-3.1-flash-lite', prose: 'Saved prose.',
      foundation: { id: 'f', storyId: 's', revision: 1, createdAt: 'now', input: { premise: 'A premise.' } },
    });
    const memorySchema = memory.responseJsonSchema as { properties: { memory: { properties: Record<string, unknown> } } };
    expect(Object.keys(memorySchema.properties.memory.properties)).toHaveLength(13);
    expect(JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA)).not.toContain('characters');
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
