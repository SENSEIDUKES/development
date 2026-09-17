import { describe, expect, it } from 'vitest';
import { HARNESS_CHAPTER_RESPONSE_SCHEMA, buildHarnessMemoryRecoveryPrompt } from './prompt';

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
  it('is compact, shallow, and free of conditional or nested application contracts', () => {
    const shape = describeSchemaShape(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    expect(shape.anyOfBranches).toBe(0);
    // root → signal list → signal → label/value list → entry: nothing deeper.
    expect(shape.maxObjectDepth).toBeLessThanOrEqual(5);
    expect(shape.objectSchemas).toBeLessThanOrEqual(12);
    expect(shape.serializedBytes).toBeLessThan(5_000);
    expect(HARNESS_CHAPTER_RESPONSE_SCHEMA.required).toEqual(['prose', 'arcCompletion']);
    expect(Object.keys(HARNESS_CHAPTER_RESPONSE_SCHEMA.properties)).toEqual([
      'title', 'plan', 'prose', 'arcCompletion', 'dialogue', 'manifestations', 'systemPanels', 'soundscapes', 'soundCues', 'creatureEvents',
    ]);
    const serialized = JSON.stringify(HARNESS_CHAPTER_RESPONSE_SCHEMA);
    for (const forbidden of ['blocks', 'memory', 'metadata', 'status', 'worldNotice', 'fateResult', 'blockId', 'url', 'asset', 'catalog', 'trackId', 'id"']) {
      expect(serialized, forbidden).not.toContain(`"${forbidden}"`);
    }
    for (const family of ['dialogue', 'manifestations', 'systemPanels', 'soundscapes', 'soundCues', 'creatureEvents'] as const) {
      const items = HARNESS_CHAPTER_RESPONSE_SCHEMA.properties[family].items as { properties: { anchorText: unknown }; required: readonly string[] };
      expect(items.properties.anchorText).toBeDefined();
      expect(items.required).toContain('anchorText');
    }
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
