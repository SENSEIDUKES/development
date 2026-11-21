/**
 * Rebuilds the stored meaning fingerprint of every Story Tag.
 *
 * Run it (`npm run build:tag-fingerprints`) after adding a tag or changing a
 * tag's meaning; `storyTagEngine.test.ts` fails until it has been. It asks the
 * Meaning model once for the tags whose text changed and leaves the rest as
 * they are. Needs `OPENROUTER_API_KEY` (or `OpenRouter-Dev`). `--all` rebuilds
 * every tag, which a change of model requires.
 *
 * Node runs the three TypeScript sources directly; they import nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeFingerprint, packFingerprint, textStamp, FINGERPRINT_DIMENSIONS } from '../src/components/meaning-engine/shared/fingerprint.ts';
import { STORY_TAG_CATALOG } from '../src/components/story-seed/shared/storyTagCatalog.ts';
import { STORY_TAG_MEANINGS, storyTagMeaningText } from '../src/components/story-seed/shared/storyTagMeanings.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/components/story-seed/shared/storyTagFingerprints.json');
// Keep in step with DEFAULT_MEANING_MODEL in src/library/model-router/catalog.ts.
const MODEL = 'openrouter/google/gemini-embedding-2';
const apiKey = process.env['OpenRouter-Dev']?.trim() || process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) throw new Error('Set OPENROUTER_API_KEY to rebuild the tag fingerprints.');

let stored = { model: MODEL, dimensions: FINGERPRINT_DIMENSIONS, tags: {} };
try {
  stored = JSON.parse(readFileSync(output, 'utf8'));
} catch { /* first build */ }
const rebuildAll = process.argv.includes('--all') || stored.model !== MODEL || stored.dimensions !== FINGERPRINT_DIMENSIONS;

const tags = {};
const stale = [];
for (const { label } of STORY_TAG_CATALOG) {
  const meaning = STORY_TAG_MEANINGS[label];
  if (!meaning) throw new Error(`"${label}" has no meaning in storyTagMeanings.ts.`);
  const text = storyTagMeaningText(label, meaning);
  const stamp = textStamp(text);
  const kept = stored.tags?.[label];
  if (!rebuildAll && kept?.[0] === stamp) tags[label] = kept;
  else stale.push({ label, text, stamp });
}

for (let start = 0; start < stale.length; start += 100) {
  const batch = stale.slice(start, start + 100);
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL.replace(/^openrouter\//, ''), input: batch.map(entry => entry.text) }),
  });
  const body = await response.json();
  if (!response.ok || body.data?.length !== batch.length) throw new Error(`Embedding request failed (${response.status}): ${JSON.stringify(body).slice(0, 300)}`);
  body.data.sort((a, b) => a.index - b.index).forEach((entry, index) => {
    tags[batch[index].label] = [batch[index].stamp, encodeFingerprint(packFingerprint(entry.embedding))];
  });
  console.log(`fingerprinted ${Math.min(start + 100, stale.length)}/${stale.length}`);
}

// Catalog order, one tag per line, so a diff shows exactly which tags changed.
const lines = STORY_TAG_CATALOG.map(({ label }) => `    ${JSON.stringify(label)}: ${JSON.stringify(tags[label])}`);
writeFileSync(output, `{\n  "model": ${JSON.stringify(MODEL)},\n  "dimensions": ${FINGERPRINT_DIMENSIONS},\n  "tags": {\n${lines.join(',\n')}\n  }\n}\n`);
console.log(`${stale.length} rebuilt, ${STORY_TAG_CATALOG.length - stale.length} kept.`);
