/**
 * Portable Story Seed files. The canonical Creator / Story / World seed stays
 * intact while a reviewed World Blueprint may travel as an optional sibling
 * artifact. Pre-hierarchy seed migration remains isolated in
 * `legacySeedImport.ts`; this boundary preserves its sibling Blueprint.
 */

import {
  STORY_SEED_SCHEMA_VERSION,
  normalizeStorySeedInput,
  normalizeWorldBlueprint,
  type StorySeedInput,
} from './storySeedSchema';
import { importLegacyStorySeed, isLegacyStorySeedShape } from './legacySeedImport';
import type { StorySeedArtifact } from './storySeedRepository';
import type { WorldBlueprint } from './types';

export const STORY_SEED_FORMAT = 'seihouse-story-seed' as const;
export const STORY_SEED_COLLECTION_FORMAT = 'seihouse-story-seed-collection' as const;
export const STORY_SEED_FORMAT_VERSION = STORY_SEED_SCHEMA_VERSION;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Strips the local-only entity ids so a shared file carries no internal keys. */
const portableSeed = (seed: StorySeedInput): Record<string, unknown> => {
  const normalized = normalizeStorySeedInput(seed);
  const { worldIdentity, worldFoundations } = normalized.world.optional;
  const additionalCharacters = worldFoundations.additionalCharacters
    ?.map(({ id: _id, ...character }) => character);
  const factions = worldFoundations.factions?.map(({ id: _id, ...faction }) => faction);
  return {
    ...normalized,
    world: {
      required: {},
      optional: {
        worldIdentity,
        worldFoundations: {
          ...worldFoundations,
          ...(additionalCharacters ? { additionalCharacters } : {}),
          ...(factions ? { factions } : {}),
        },
      },
    },
  };
};

/**
 * Story Title is one canonical value in the current editor. Older artifacts
 * could save an edited Blueprint title separately, so the reviewed artifact
 * wins once at the portable boundary and the imported seed is reconciled to it.
 */
export interface RawStorySeedArtifact {
  seed: StorySeedInput;
  blueprint?: unknown;
}

function reconcileArtifact(
  seed: StorySeedInput,
  blueprintValue: unknown,
  normalizeBlueprint: false,
): RawStorySeedArtifact;
function reconcileArtifact(
  seed: StorySeedInput,
  blueprintValue?: unknown,
  normalizeBlueprint?: true,
): StorySeedArtifact;
function reconcileArtifact(
  seed: StorySeedInput,
  blueprintValue?: unknown,
  normalizeBlueprint = true,
): RawStorySeedArtifact {
  const normalizedSeed = normalizeStorySeedInput(seed);
  if (!isRecord(blueprintValue)) return { seed: normalizedSeed };
  const blueprintTitle = typeof blueprintValue.title === 'string'
    ? blueprintValue.title.trim()
    : undefined;
  const reconciledSeed = blueprintTitle === undefined
    ? normalizedSeed
    : normalizeStorySeedInput({
        ...normalizedSeed,
        world: {
          ...normalizedSeed.world,
          optional: {
            ...normalizedSeed.world.optional,
            worldIdentity: {
              ...normalizedSeed.world.optional.worldIdentity,
              title: blueprintTitle,
            },
          },
        },
      });
  return {
    seed: reconciledSeed,
    blueprint: normalizeBlueprint
      ? normalizeWorldBlueprint(blueprintValue, reconciledSeed)
      : blueprintValue,
  };
}

const createReconciledStorySeedExport = (artifact: StorySeedArtifact) => ({
    format: STORY_SEED_FORMAT,
    version: STORY_SEED_FORMAT_VERSION,
    seed: portableSeed(artifact.seed),
    ...(artifact.blueprint ? { blueprint: artifact.blueprint } : {}),
  });

export const createStorySeedExport = (
  seed: StorySeedInput,
  blueprint?: WorldBlueprint,
) => createReconciledStorySeedExport(reconcileArtifact(seed, blueprint));

type StorySeedExportArtifact = StorySeedInput | StorySeedArtifact;

const exportArtifact = (value: StorySeedExportArtifact): StorySeedArtifact =>
  'seed' in value ? value : { seed: value };

export const createStorySeedCollectionExport = (values: StorySeedExportArtifact[]) => {
  const artifacts = values
    .map(exportArtifact)
    .map(artifact => reconcileArtifact(artifact.seed, artifact.blueprint));
  const hasBlueprints = artifacts.some(artifact => artifact.blueprint);
  return {
    format: STORY_SEED_COLLECTION_FORMAT,
    version: STORY_SEED_FORMAT_VERSION,
    seeds: artifacts.map(artifact => portableSeed(artifact.seed)),
    // Parallel entries keep the established `seeds` array backward-compatible
    // for seed-only readers while preserving reviewed Blueprint artifacts.
    ...(hasBlueprints ? {
      blueprints: artifacts.map(artifact => artifact.blueprint ?? null),
    } : {}),
  };
};

const isGeneratedStoryPackage = (value: Record<string, unknown>): boolean =>
  'memory' in value || 'arcs' in value || 'chapters' in value || 'imageHistory' in value || 'codex' in value;

const isCanonicalShape = (value: Record<string, unknown>): boolean =>
  isRecord(value.creator)
  && isRecord(value.story)
  && isRecord((value.story as Record<string, unknown>).required)
  && isRecord(value.world);

function extractStorySeedArtifact(
  value: unknown,
  normalizeBlueprint: false,
): RawStorySeedArtifact;
function extractStorySeedArtifact(
  value: unknown,
  normalizeBlueprint: true,
): StorySeedArtifact;
function extractStorySeedArtifact(
  value: unknown,
  normalizeBlueprint: boolean,
): RawStorySeedArtifact {
  if (!isRecord(value)) throw new Error('Each seed must be a JSON object.');
  if (isGeneratedStoryPackage(value)) {
    throw new Error('This is a generated story package, not a portable story seed.');
  }
  if (isRecord(value.seed)) {
    const nested = normalizeBlueprint
      ? extractStorySeedArtifact(value.seed, true)
      : extractStorySeedArtifact(value.seed, false);
    return isRecord(value.blueprint)
      ? normalizeBlueprint
        ? reconcileArtifact(nested.seed, value.blueprint, true)
        : reconcileArtifact(nested.seed, value.blueprint, false)
      : nested;
  }
  const seed = isCanonicalShape(value)
    ? normalizeStorySeedInput(value)
    : isLegacyStorySeedShape(value)
      ? importLegacyStorySeed(value)
      : null;
  if (!seed) throw new Error('No reusable Story Seed data was found in this JSON file.');
  return normalizeBlueprint
    ? reconcileArtifact(seed, value.blueprint, true)
    : reconcileArtifact(seed, value.blueprint, false);
}

export interface ParseStorySeedJsonOptions {
  /** Preserve raw Blueprint fields so a stricter downstream boundary can reject partial artifacts. */
  normalizeBlueprint?: boolean;
}

export function parseStorySeedJson(
  input: string,
  options: { normalizeBlueprint: false },
): RawStorySeedArtifact[];
export function parseStorySeedJson(
  input: string,
  options?: ParseStorySeedJsonOptions,
): StorySeedArtifact[];
export function parseStorySeedJson(
  input: string,
  options: ParseStorySeedJsonOptions = {},
): RawStorySeedArtifact[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.seeds)
      ? parsed.seeds.map((seed, index) => {
          const blueprint = Array.isArray(parsed.blueprints) ? parsed.blueprints[index] : undefined;
          return isRecord(blueprint) ? { seed, blueprint } : seed;
        })
      : [parsed];
  if (candidates.length === 0) throw new Error('The seed file is empty.');
  return options.normalizeBlueprint === false
    ? candidates.map(candidate => extractStorySeedArtifact(candidate, false))
    : candidates.map(candidate => extractStorySeedArtifact(candidate, true));
}

const safeFilenamePart = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'untitled';

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const isMobileShareDevice = (): boolean => {
  const shareNavigator = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return Boolean(shareNavigator.userAgentData?.mobile)
    || /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const downloadJsonFile = async (value: unknown, filename: string): Promise<void> => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && isMobileShareDevice()) {
    const file = new File([blob], filename, { type: blob.type });
    const shareNavigator = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    const shareData: ShareData = { files: [file], title: filename };
    if (
      typeof shareNavigator.share === 'function'
      && (typeof shareNavigator.canShare !== 'function' || shareNavigator.canShare(shareData))
    ) {
      try {
        await shareNavigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
  }
  triggerBrowserDownload(blob, filename);
};

export const downloadStorySeed = (
  seed: StorySeedInput,
  blueprint?: WorldBlueprint,
): Promise<void> => {
  const artifact = reconcileArtifact(seed, blueprint);
  return downloadJsonFile(
    createReconciledStorySeedExport(artifact),
    `seihouse_story_seed_${safeFilenamePart(artifact.seed.world.optional.worldIdentity.title || 'untitled')}.json`,
  );
};

export const downloadStorySeedCollection = (artifacts: StorySeedArtifact[]): Promise<void> =>
  downloadJsonFile(
    createStorySeedCollectionExport(artifacts),
    `seihouse_story_seeds_${new Date().toISOString().slice(0, 10)}.json`,
  );
