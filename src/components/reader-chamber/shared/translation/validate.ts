/**
 * Validation of an untrusted translation response.
 *
 * A translation may only restate reader-facing values that already exist. It
 * cannot create, remove, reorder, or reclassify blocks, and it cannot return
 * machine-facing data at all: a response carrying a block type, an enum, a
 * trigger, a classification, an asset identifier, or any other technical field
 * is rejected outright rather than filtered, because a model that returned one
 * did not follow the contract.
 */

import type {
  ReaderFacingBlock,
  ReaderFacingChapter,
  ReaderFacingLabelledValue,
  ReaderFacingSystem,
} from './contract';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Keys that identify machine-facing data. None of them belongs in a
 * translation response at any depth.
 */
const FORBIDDEN_KEYS = new Set([
  // Block classification and structural enums.
  'type', 'kind', 'blockType', 'metadata', 'promptType', 'presentation',
  'direction', 'tone', 'trend', 'outcome',
  // Entity triggers and speaker identity keys.
  'entities', 'mention', 'speakerName', 'speakerRole', 'mode',
  // Music, atmosphere, and creature classification.
  'music', 'trackId', 'region', 'beastEvent', 'profile', 'audioSignature',
  'atmosphereCategory', 'atmosphereTags', 'sceneType', 'environment', 'theme',
  // World Cue intents and audio routing.
  'audioMoments', 'triggerPhrase', 'occurrenceIndex', 'sourceCategory',
  'variation', 'semanticTags', 'relatedEntity', 'cue', 'publicUrl',
  // Asset identifiers and URLs.
  'assetId', 'assetManifest', 'heroImageAssetId', 'customUrl', 'url', 'src',
  // Numeric drivers that are not reader-facing copy.
  'min', 'max', 'intensity',
]);

const assertNoForbiddenKeys = (value: unknown, path: string): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`The translation returned machine-facing data at ${path}.${key}.`);
    }
    assertNoForbiddenKeys(nested, `${path}.${key}`);
  }
};

const requiredText = (value: unknown, path: string): string => {
  if (typeof value !== 'string') throw new Error(`The translation is missing text at ${path}.`);
  return value;
};

const optionalText = (value: unknown, path: string): string | undefined =>
  value === undefined || value === null ? undefined : requiredText(value, path);

/** Arrays are positional: the same length, or the translation reshaped canon. */
const sameLengthArray = (value: unknown, expected: number, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`The translation expected a list at ${path}.`);
  if (value.length !== expected) {
    throw new Error(`The translation changed ${path} from ${expected} to ${value.length} entries.`);
  }
  return value;
};

const labelled = (value: unknown, path: string): ReaderFacingLabelledValue => {
  if (!isRecord(value)) throw new Error(`The translation expected a label and value at ${path}.`);
  return { label: requiredText(value.label, `${path}.label`), value: requiredText(value.value, `${path}.value`) };
};

const validateSystem = (
  value: unknown,
  canonical: ReaderFacingSystem,
  path: string,
): ReaderFacingSystem => {
  if (!isRecord(value)) throw new Error(`The translation expected a System Panel at ${path}.`);
  const system: ReaderFacingSystem = {};

  if (canonical.title !== undefined) system.title = requiredText(value.title, `${path}.title`);
  if (canonical.flavor !== undefined) {
    const flavor = optionalText(value.flavor, `${path}.flavor`);
    if (flavor !== undefined) system.flavor = flavor;
  }
  if (canonical.rarity !== undefined) {
    const rarity = optionalText(value.rarity, `${path}.rarity`);
    if (rarity !== undefined) system.rarity = rarity;
  }
  if (canonical.rows) {
    system.rows = sameLengthArray(value.rows, canonical.rows.length, `${path}.rows`)
      .map((row, index) => labelled(row, `${path}.rows[${index}]`));
  }
  if (canonical.badge) system.badge = labelled(value.badge, `${path}.badge`);
  if (canonical.changes) {
    system.changes = sameLengthArray(value.changes, canonical.changes.length, `${path}.changes`)
      .map((label, index) => requiredText(label, `${path}.changes[${index}]`));
  }

  if (canonical.worldNotice) {
    if (!isRecord(value.worldNotice)) throw new Error(`The translation expected a World Notice at ${path}.`);
    const entries = sameLengthArray(
      value.worldNotice.entries,
      canonical.worldNotice.entries.length,
      `${path}.worldNotice.entries`,
    );
    system.worldNotice = {
      entries: entries.map((entry, index) => {
        const canonicalEntry = canonical.worldNotice!.entries[index];
        const entryPath = `${path}.worldNotice.entries[${index}]`;
        if (!isRecord(entry)) throw new Error(`The translation expected a notice entry at ${entryPath}.`);
        const body = canonicalEntry.body === undefined
          ? undefined
          : optionalText(entry.body, `${entryPath}.body`);
        const details = canonicalEntry.details
          ? sameLengthArray(entry.details, canonicalEntry.details.length, `${entryPath}.details`)
            .map((detail, detailIndex) => labelled(detail, `${entryPath}.details[${detailIndex}]`))
          : undefined;
        return {
          title: requiredText(entry.title, `${entryPath}.title`),
          ...(body !== undefined ? { body } : {}),
          ...(details ? { details } : {}),
        };
      }),
    };
  }

  if (canonical.status) {
    if (!isRecord(value.status)) throw new Error(`The translation expected a status screen at ${path}.`);
    const canonicalStatus = canonical.status;
    const status: NonNullable<ReaderFacingSystem['status']> = {};
    if (canonicalStatus.level !== undefined) status.level = requiredText(value.status.level, `${path}.status.level`);
    if (canonicalStatus.bars) {
      status.bars = sameLengthArray(value.status.bars, canonicalStatus.bars.length, `${path}.status.bars`)
        .map((bar, index) => {
          const barPath = `${path}.status.bars[${index}]`;
          if (!isRecord(bar)) throw new Error(`The translation expected a bar at ${barPath}.`);
          const display = canonicalStatus.bars![index].display === undefined
            ? undefined
            : optionalText(bar.display, `${barPath}.display`);
          return {
            label: requiredText(bar.label, `${barPath}.label`),
            ...(display !== undefined ? { display } : {}),
          };
        });
    }
    if (canonicalStatus.stats) {
      status.stats = sameLengthArray(value.status.stats, canonicalStatus.stats.length, `${path}.status.stats`)
        .map((stat, index) => labelled(stat, `${path}.status.stats[${index}]`));
    }
    if (canonicalStatus.effects) {
      status.effects = sameLengthArray(value.status.effects, canonicalStatus.effects.length, `${path}.status.effects`)
        .map((effect, index) => {
          const effectPath = `${path}.status.effects[${index}]`;
          if (!isRecord(effect)) throw new Error(`The translation expected an effect at ${effectPath}.`);
          const canonicalEffect = canonicalStatus.effects![index];
          return {
            name: requiredText(effect.name, `${effectPath}.name`),
            ...(canonicalEffect.detail !== undefined
              ? { detail: requiredText(effect.detail, `${effectPath}.detail`) } : {}),
            ...(canonicalEffect.value !== undefined
              ? { value: requiredText(effect.value, `${effectPath}.value`) } : {}),
          };
        });
    }
    if (canonicalStatus.abilities) {
      status.abilities = sameLengthArray(value.status.abilities, canonicalStatus.abilities.length, `${path}.status.abilities`)
        .map((ability, index) => {
          const abilityPath = `${path}.status.abilities[${index}]`;
          if (!isRecord(ability)) throw new Error(`The translation expected an ability at ${abilityPath}.`);
          return {
            name: requiredText(ability.name, `${abilityPath}.name`),
            ...(canonicalStatus.abilities![index].detail !== undefined
              ? { detail: requiredText(ability.detail, `${abilityPath}.detail`) } : {}),
          };
        });
    }
    system.status = status;
  }

  if (canonical.fate) {
    if (!isRecord(value.fate)) throw new Error(`The translation expected Fate detail at ${path}.`);
    const canonicalFate = canonical.fate;
    system.fate = {
      ...(canonicalFate.timelineScar !== undefined
        ? { timelineScar: requiredText(value.fate.timelineScar, `${path}.fate.timelineScar`) } : {}),
      ...(canonicalFate.permanentCosts ? {
        permanentCosts: sameLengthArray(value.fate.permanentCosts, canonicalFate.permanentCosts.length, `${path}.fate.permanentCosts`)
          .map((cost, index) => requiredText(cost, `${path}.fate.permanentCosts[${index}]`)),
      } : {}),
      ...(canonicalFate.newStoryState !== undefined
        ? { newStoryState: requiredText(value.fate.newStoryState, `${path}.fate.newStoryState`) } : {}),
      ...(canonicalFate.newActiveStats ? {
        newActiveStats: sameLengthArray(value.fate.newActiveStats, canonicalFate.newActiveStats.length, `${path}.fate.newActiveStats`)
          .map((stat, index) => requiredText(stat, `${path}.fate.newActiveStats[${index}]`)),
      } : {}),
      ...(canonicalFate.genreShift !== undefined
        ? { genreShift: requiredText(value.fate.genreShift, `${path}.fate.genreShift`) } : {}),
    };
  }

  return system;
};

export interface ValidatedReaderTranslation {
  title: string;
  blocks: ReaderFacingBlock[];
}

/**
 * Validates a provider reply against the exact reader-facing chapter that was
 * sent. The result is in canonical block order regardless of the order the
 * model replied in, so a reordered response cannot reorder the chapter.
 */
export const validateReaderTranslationResponse = (
  value: unknown,
  source: ReaderFacingChapter,
): ValidatedReaderTranslation => {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (!isRecord(parsed)) throw new Error('The translation response must be a JSON object.');
  assertNoForbiddenKeys(parsed, 'response');

  const title = requiredText(parsed.title, 'response.title');
  if (!Array.isArray(parsed.blocks)) throw new Error('The translation response must list blocks.');

  const canonicalById = new Map(source.blocks.map(block => [block.id, block]));
  const seen = new Map<string, ReaderFacingBlock>();
  for (const [index, raw] of parsed.blocks.entries()) {
    if (!isRecord(raw)) throw new Error(`The translation expected a block at response.blocks[${index}].`);
    const id = requiredText(raw.id, `response.blocks[${index}].id`);
    const canonical = canonicalById.get(id);
    if (!canonical) throw new Error(`The translation returned an unknown block ID "${id}".`);
    if (seen.has(id)) throw new Error(`The translation returned block "${id}" more than once.`);
    const path = `response.blocks[${index}]`;
    seen.set(id, {
      id,
      ...(canonical.text !== undefined ? { text: requiredText(raw.text, `${path}.text`) } : {}),
      ...(canonical.system ? { system: validateSystem(raw.system, canonical.system, path) } : {}),
    });
  }

  const missing = source.blocks.filter(block => !seen.has(block.id));
  if (missing.length) {
    throw new Error(`The translation omitted ${missing.length} canonical block(s), starting with "${missing[0].id}".`);
  }

  // Canonical order, not response order.
  return { title, blocks: source.blocks.map(block => seen.get(block.id)!) };
};

const safeParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('The translation response was not valid JSON.');
  }
};
