import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATION_CONSUMERS, PROVIDER_ADAPTERS } from './catalog';

/**
 * Keeps the Model Router's "Used by" section truthful. Any file that calls a
 * generation provider (an SDK, a provider URL, or a router provider factory)
 * must be registered in `GENERATION_CONSUMERS` or `PROVIDER_ADAPTERS`.
 */
const ROOT = path.resolve(__dirname, '../../..');
const SCANNED_DIRECTORIES = ['src', 'api', 'scripts'];
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const IGNORED = /(?:\.test\.|\.spec\.|\/node_modules\/|^src\/server\/model-router\/)/;

/** Markers of a model call: provider SDKs and endpoints, or the router's provider factories. */
const GENERATION_CALL = /@google\/genai|generativelanguage\.googleapis\.com|openrouter\.ai|elevenlabs\.io|api\.openai\.com|api\.anthropic\.com|\bcreate(?:Harness|Chapter)TextProvider\(|\bcreateWorldBlueprintProvider\(|\bgenerateOpenRouterText\(/;

const sourceFiles = (directory: string): string[] => readdirSync(path.join(ROOT, directory)).flatMap(name => {
  const relative = `${directory}/${name}`;
  if (name === 'node_modules' || name.startsWith('.')) return [];
  return statSync(path.join(ROOT, relative)).isDirectory() ? sourceFiles(relative) : [relative];
});

describe('Model Router "Used by" registry', () => {
  it('registers every file that calls a generation model', () => {
    const registered = new Set([...GENERATION_CONSUMERS.map(consumer => consumer.entry), ...PROVIDER_ADAPTERS]);
    const unregistered = SCANNED_DIRECTORIES
      .filter(directory => existsSync(path.join(ROOT, directory)))
      .flatMap(sourceFiles)
      .filter(file => SOURCE.test(file) && !IGNORED.test(file))
      .filter(file => GENERATION_CALL.test(readFileSync(path.join(ROOT, file), 'utf8')))
      .filter(file => !registered.has(file));
    expect(unregistered, [
      'These files call a generation model but are not in the Model Router registry.',
      'Add the feature to GENERATION_CONSUMERS (or the adapter to PROVIDER_ADAPTERS)',
      'in src/server/model-router/catalog.ts so the Router shows what uses each model.',
    ].join(' ')).toEqual([]);
  });

  it('only lists files that exist', () => {
    const missing = [...GENERATION_CONSUMERS.map(consumer => consumer.entry), ...PROVIDER_ADAPTERS]
      .filter(file => !existsSync(path.join(ROOT, file)));
    expect(missing).toEqual([]);
  });
});
