import {
  getByUrl,
  loadLibraryCues,
  type LibraryCue,
  type LibraryCueCategory,
  type LibraryCuesLoadResult,
} from './libraryCues';
import { extractReaderVisibleAudioText } from './readerVisibleText';

export const INLINE_AUDIO_CUE_CATEGORIES = [
  'beasts',
  'weapons',
  'artifacts',
  'locations',
  'factions',
] as const satisfies readonly LibraryCueCategory[];

export type InlineAudioCueCategory = (typeof INLINE_AUDIO_CUE_CATEGORIES)[number];

export const WORLD_CUE_RELATED_ENTITY_TYPES = [
  'character',
  'artifact',
  'location',
  'creature',
  'faction',
] as const;

export type WorldCueRelatedEntityType = (typeof WORLD_CUE_RELATED_ENTITY_TYPES)[number];

export interface WorldCueRelatedEntityContext {
  name: string;
  type?: WorldCueRelatedEntityType;
}

export interface RelatedWorldCueEntity extends WorldCueRelatedEntityContext {
  id?: string;
}

/**
 * Model-safe description of one deliberate audible event. It deliberately
 * cannot name a catalog row, file, asset, provider, or URL.
 */
export interface WorldCueIntent {
  blockId: string;
  triggerPhrase: string;
  /** Zero-based among exact, case-sensitive occurrences in the named block. */
  occurrenceIndex?: number;
  sourceCategory: InlineAudioCueCategory;
  /** Catalog broad variation, such as `growl`, `unsheathe`, or `activation`. */
  variation: string;
  semanticTags: string[];
  relatedEntity?: WorldCueRelatedEntityContext;
}

/**
 * Persistable application-owned annotation. Only application resolution adds
 * the client-safe Library URL; no catalog/file/asset identifier is persisted.
 */
export interface ResolvedWorldCueMoment {
  id: string;
  blockId: string;
  triggerPhrase: string;
  /** Zero-based among exact, case-sensitive occurrences in the named block. */
  occurrenceIndex: number;
  sourceCategory: InlineAudioCueCategory;
  variation: string;
  semanticTags: string[];
  relatedEntity?: RelatedWorldCueEntity;
  cue: {
    publicUrl: string;
  };
}

/** World Cues are the only inline prose annotation. Character voice lives in Reader Codex. */
export type ResolvedAudioMoment = ResolvedWorldCueMoment;

export type WorldCueIntentValidation =
  | { ok: true; intent: WorldCueIntent & { occurrenceIndex: number } }
  | {
      ok: false;
      reason: 'forbidden-field' | 'forbidden-selector' | 'invalid-intent' | 'ineligible-phrase';
      message: string;
    };

export type WorldCueResolution =
  | { ok: true; moment: ResolvedWorldCueMoment }
  | {
      ok: false;
      reason:
        | 'forbidden-field'
        | 'forbidden-selector'
        | 'invalid-intent'
        | 'ineligible-phrase'
        | 'block-mismatch'
        | 'reserved-block'
        | 'phrase-not-found'
        | 'occurrence-not-found'
        | 'unresolved-cue'
        | 'overlapping-placement';
      message: string;
    };

export type ResolvedWorldCueValidation =
  | { ok: true; cue: LibraryCue & { category: InlineAudioCueCategory } }
  | {
      ok: false;
      reason:
        | 'invalid-moment'
        | 'not-found'
        | 'reserved-category'
        | 'category-mismatch'
        | 'variation-mismatch';
      message: string;
    };

export type PlayableAudioMomentResolution =
  | { ok: true; publicUrl: string; actionLabel: 'World Cue' }
  | {
      ok: false;
      reason: string;
      message: string;
    };

export interface WorldCueChapterBlock {
  id: string;
  type?: string;
  text?: string;
  metadata?: unknown;
  system?: unknown;
}

export interface ChapterAudioMomentsResolution {
  audioMoments: ResolvedWorldCueMoment[];
  issues: Array<Extract<WorldCueResolution, { ok: false }> & { intentIndex: number }>;
}

export interface InlineAudioTextSegment {
  text: string;
  moment?: ResolvedAudioMoment;
}

const DEFAULT_LIBRARY_CUES = loadLibraryCues();
const INLINE_CATEGORY_SET = new Set<LibraryCueCategory>(INLINE_AUDIO_CUE_CATEGORIES);
const RELATED_ENTITY_TYPE_SET = new Set<string>(WORLD_CUE_RELATED_ENTITY_TYPES);
export const MAX_WORLD_CUE_MOMENTS_PER_CHAPTER = 24;
export const MAX_WORLD_CUE_TRIGGER_LENGTH = 240;
export const MAX_WORLD_CUE_TAGS = 8;
const MAX_BLOCK_ID_LENGTH = 160;
const MAX_VARIATION_LENGTH = 64;
const MAX_TAG_LENGTH = 48;
const MAX_RELATED_ENTITY_NAME_LENGTH = 160;
const MAX_RELATED_ENTITY_TYPE_LENGTH = 64;
const MAX_AUDIO_MOMENT_ID_LENGTH = 240;
const INTENT_FIELDS = new Set([
  'blockId',
  'triggerPhrase',
  'occurrenceIndex',
  'sourceCategory',
  'variation',
  'semanticTags',
  'relatedEntity',
]);
const RELATED_ENTITY_FIELDS = new Set(['name', 'type']);
const FORBIDDEN_MODEL_FIELD_FRAGMENTS = [
  'url',
  'uri',
  'file',
  'asset',
  'catalog',
  'provider',
  'voicekey',
  'voiceid',
  'cueid',
  'audioid',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizedFieldName = (field: string) => field.toLocaleLowerCase().replace(/[^a-z0-9]/gu, '');
const isForbiddenModelField = (field: string) => {
  const normalized = normalizedFieldName(field);
  return FORBIDDEN_MODEL_FIELD_FRAGMENTS.some(fragment => normalized.includes(fragment));
};

const hasForbiddenModelField = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = hasForbiddenModelField(item);
      if (nested) return nested;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isForbiddenModelField(key)) return key;
    const nested = hasForbiddenModelField(nestedValue);
    if (nested) return nested;
  }
  return null;
};

const FORBIDDEN_SELECTOR_VALUE_NAMES = new Set([
  'assetid',
  'assetkey',
  'assetpath',
  'audiourl',
  'catalogentry',
  'catalogid',
  'catalogkey',
  'cueid',
  'cueurl',
  'file',
  'fileid',
  'filename',
  'filepath',
  'providerid',
  'providerkey',
  'publicurl',
  'voiceid',
  'voicekey',
]);

const looksLikeForbiddenSelectorValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = normalizedFieldName(trimmed);
  return FORBIDDEN_SELECTOR_VALUE_NAMES.has(normalized)
    || /(?:https?|ftp|s3|gs|data|blob):(?:\/\/)?/iu.test(trimmed)
    || /(?:asset|audio|catalog|cue|provider|voice):\/\//iu.test(trimmed)
    || /(?:^|\s)www\.[^\s]+/iu.test(trimmed)
    || /^(?:[a-z]:\\|\/(?:home|private|tmp|users|var)\/)/iu.test(trimmed)
    || /(?:^|[\\/])DEFAULT[\\/](?:Artifacts|Beasts|Factions|Locations|Weapons)(?:[\\/]|$)/iu.test(trimmed)
    || /(?:^|[\\/])(?:artifacts|beasts|factions|locations|weapons)[\\/][a-z0-9_-]+(?:[\\/][a-z0-9_.-]+)*/iu.test(trimmed)
    || /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)(?:[?#\s]|$)/iu.test(trimmed)
    || /\b(?:asset|audio|catalog|cue|file|provider|public\s*url|voice)[_ -]*(?:entry|id|key|name|path|uri|url)\s*[:=]/iu.test(trimmed)
    || /^(?:asset|audio|catalog|cue|file|provider|voice)[_-](?:entry|id|key|path|url)[_-]?[a-z0-9_-]+$/iu.test(trimmed)
    || /^(?:asset|catalog|cue|file|provider|voice)[_:-][a-z0-9_-]{3,}$/iu.test(trimmed)
    || /\belevenlabs\b/iu.test(trimmed);
};

const findForbiddenModelSelectorValue = (value: unknown, path = 'intent'): string | null => {
  if (typeof value === 'string') return looksLikeForbiddenSelectorValue(value) ? path : null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = findForbiddenModelSelectorValue(value[index], `${path}[${index}]`);
      if (nested) return nested;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;
  for (const [key, nestedValue] of Object.entries(value)) {
    const nested = findForbiddenModelSelectorValue(nestedValue, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
};

const normalizeComparablePhrase = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/^(?:a|an|the)\s+/u, '')
  .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
  .replace(/\s+/gu, ' ');

const AUDIBLE_VARIATION_PATTERNS: Record<
  InlineAudioCueCategory,
  Readonly<Record<string, RegExp>>
> = {
  beasts: {
    call: /\b(?:bark(?:ed|s|ing)|call(?:ed|s|ing)|cr(?:ies|ied|ying))\b/iu,
    growl: /\b(?:growl(?:ed|s|ing)|snarl(?:ed|s|ing))\b/iu,
    hiss: /\bhiss(?:ed|es|ing)\b/iu,
    howl: /\bhowl(?:ed|s|ing)\b/iu,
    roar: /\broar(?:ed|s|ing)\b/iu,
    screech: /\b(?:screech(?:ed|es|ing)|shriek(?:ed|s|ing))\b/iu,
    wingbeat: /\bwing(?:s)?\s+(?:beat|flap)(?:s|ping|ped)?\b/iu,
  },
  weapons: {
    electric: /\b(?:arc(?:ed|s|ing)|buzz(?:ed|es|ing)|crackl(?:ed|es|ing)|spark(?:ed|s|ing)|zapp?(?:ed|s|ing))\b/iu,
    magic: /\b(?:(?:cast|casts|casting)\s+(?:a\s+)?spell|chime(?:d|s|ing)|crackl(?:ed|es|ing)|erupt(?:ed|s|ing)|flare(?:d|s|ing)|humm?(?:ed|s|ing)|spell\s+(?:burst|fired|flared|struck)|whoosh(?:ed|es|ing))\b/iu,
    reload: /\b(?:cock(?:ed|s|ing)?|magazine\s+(?:clicked|locked|slid)|rack(?:ed|s|ing)?\s+(?:the\s+)?slide|reload(?:ed|s|ing)?|work(?:ed|s|ing)?\s+(?:the\s+)?bolt)\b/iu,
    unsheathe: /\bunsheath(?:e|ed|es|ing)?\b|\b(?:drew|draw(?:s|ing|n)?)\s+(?:(?:a|an|his|her|its|my|our|the|their|this|your|[\p{L}'’-]+)\s+){0,3}(?:blade|dagger|sword|weapon)\b/iu,
  },
  artifacts: {
    activation: /\b(?:activat(?:ed|es|ing)|awaken(?:ed|s|ing)|chime(?:d|s|ing)|flare(?:d|s|ing)|humm?(?:ed|s|ing)|pulse(?:d|s|ing))\b/iu,
    relics: /\b(?:chime(?:d|s|ing)|humm?(?:ed|s|ing)|pulse(?:d|s|ing)|rang|resonat(?:ed|es|ing)|ringing)\b/iu,
    upgrade: /\b(?:chime(?:d|s|ing)|evolv(?:ed|es|ing)|humm?(?:ed|s|ing)|pulse(?:d|s|ing)|resonat(?:ed|es|ing)|upgrad(?:ed|es|ing))\b/iu,
  },
  locations: {
    signatures: /\b(?:blar(?:ed|es|ing)|boom(?:ed|s|ing)|chime(?:d|s|ing)|crack(?:ed|s|ing)|echo(?:ed|es|ing)|peal(?:ed|s|ing)|rang|rumbl(?:ed|es|ing)|thunder(?:ed|s|ing)|toll(?:ed|s|ing))\b|\b(?:alarm|bell|gong|horn|klaxon|siren|whistle)(?:\s+[\p{L}'’-]+){0,3}\s+sound(?:ed|s|ing)\b/iu,
  },
  factions: {
    general: /\b(?:blar(?:ed|es|ing)|chant(?:ed|s|ing)|cheer(?:ed|s|ing)|cries|cried|crying|drum(?:med|s|ming)|roar(?:ed|s|ing)|sang|shout(?:ed|s|ing)|sing(?:s|ing))\b/iu,
  },
};
const NEGATED_OR_INAUDIBLE_ACTION = /\b(?:cannot|can't|could\s+not|couldn't|did\s+not|didn't|does\s+not|doesn't|failed\s+to|had\s+not|hadn't|never|no\s+sound|not|refused\s+to|silent|silently|soundless|without\s+(?:a\s+)?sound)\b/iu;
const TERMINAL_INLINE_AUDIO_PUNCTUATION = /[,.;:!?…—–"'”’)}\]]+$/u;
const LEADING_INLINE_AUDIO_PUNCTUATION = /^[,.;:!?…—–"'”’)}\]]+/u;

export const matchLeadingInlineAudioPunctuation = (value: string): string => (
  value.match(LEADING_INLINE_AUDIO_PUNCTUATION)?.[0] ?? ''
);
/** Entity labels alone are informational Codex text, never audible events. */
export function isEligibleWorldCueTriggerPhrase(
  triggerPhrase: string,
  sourceCategory: InlineAudioCueCategory,
  variation: string,
  relatedEntity?: WorldCueRelatedEntityContext,
): boolean {
  if (!triggerPhrase || triggerPhrase !== triggerPhrase.trim()) return false;
  if (TERMINAL_INLINE_AUDIO_PUNCTUATION.test(triggerPhrase)) return false;
  if (NEGATED_OR_INAUDIBLE_ACTION.test(triggerPhrase)) return false;
  if (
    relatedEntity
    && normalizeComparablePhrase(triggerPhrase) === normalizeComparablePhrase(relatedEntity.name)
  ) return false;
  const variationPattern = AUDIBLE_VARIATION_PATTERNS[sourceCategory][normalizedValue(variation)];
  return Boolean(variationPattern?.test(triggerPhrase));
}

/** Validate untrusted generation output before any catalog lookup occurs. */
export function validateWorldCueIntent(candidate: unknown): WorldCueIntentValidation {
  const forbiddenField = hasForbiddenModelField(candidate);
  if (forbiddenField) {
    return {
      ok: false,
      reason: 'forbidden-field',
      message: `World Cue intents cannot contain ${forbiddenField}.`,
    };
  }
  const forbiddenSelectorPath = findForbiddenModelSelectorValue(candidate);
  if (forbiddenSelectorPath) {
    return {
      ok: false,
      reason: 'forbidden-selector',
      message: `World Cue intents cannot contain a media or catalog selector in ${forbiddenSelectorPath}.`,
    };
  }
  if (!isPlainObject(candidate)) {
    return { ok: false, reason: 'invalid-intent', message: 'World Cue intent must be an object.' };
  }
  const unexpectedField = Object.keys(candidate).find(field => !INTENT_FIELDS.has(field));
  if (unexpectedField) {
    return {
      ok: false,
      reason: 'invalid-intent',
      message: `World Cue intent contains unsupported field ${unexpectedField}.`,
    };
  }

  const {
    blockId,
    triggerPhrase,
    occurrenceIndex = 0,
    sourceCategory,
    variation,
    semanticTags,
    relatedEntity,
  } = candidate;
  if (
    typeof blockId !== 'string'
    || !blockId.trim()
    || blockId !== blockId.trim()
    || blockId.length > MAX_BLOCK_ID_LENGTH
  ) {
    return { ok: false, reason: 'invalid-intent', message: 'blockId must be a non-empty exact block reference.' };
  }
  if (
    typeof triggerPhrase !== 'string'
    || !triggerPhrase.trim()
    || triggerPhrase !== triggerPhrase.trim()
    || triggerPhrase.length > MAX_WORLD_CUE_TRIGGER_LENGTH
  ) {
    return { ok: false, reason: 'invalid-intent', message: 'triggerPhrase must be a non-empty exact phrase.' };
  }
  if (!Number.isInteger(occurrenceIndex) || (occurrenceIndex as number) < 0) {
    return { ok: false, reason: 'invalid-intent', message: 'occurrenceIndex must be a zero-based integer.' };
  }
  if (typeof sourceCategory !== 'string' || !INLINE_CATEGORY_SET.has(sourceCategory as LibraryCueCategory)) {
    return {
      ok: false,
      reason: 'invalid-intent',
      message: 'sourceCategory must belong to an inline World Cue category.',
    };
  }
  if (
    typeof variation !== 'string'
    || !variation.trim()
    || variation !== variation.trim()
    || variation.length > MAX_VARIATION_LENGTH
  ) {
    return { ok: false, reason: 'invalid-intent', message: 'variation must be a non-empty catalog variation.' };
  }
  if (
    !Array.isArray(semanticTags)
    || semanticTags.length > MAX_WORLD_CUE_TAGS
    || semanticTags.some(tag => (
      typeof tag !== 'string'
      || !tag.trim()
      || tag.length > MAX_TAG_LENGTH
    ))
  ) {
    return { ok: false, reason: 'invalid-intent', message: 'semanticTags must contain only non-empty strings.' };
  }

  let normalizedRelatedEntity: WorldCueRelatedEntityContext | undefined;
  if (relatedEntity !== undefined) {
    if (!isPlainObject(relatedEntity)) {
      return { ok: false, reason: 'invalid-intent', message: 'relatedEntity must be an object when supplied.' };
    }
    const unexpectedEntityField = Object.keys(relatedEntity)
      .find(field => !RELATED_ENTITY_FIELDS.has(field));
    if (unexpectedEntityField) {
      return {
        ok: false,
        reason: 'invalid-intent',
        message: `relatedEntity contains unsupported field ${unexpectedEntityField}.`,
      };
    }
    if (
      typeof relatedEntity.name !== 'string'
      || !relatedEntity.name.trim()
      || relatedEntity.name.length > MAX_RELATED_ENTITY_NAME_LENGTH
    ) {
      return { ok: false, reason: 'invalid-intent', message: 'relatedEntity.name is required.' };
    }
    if (
      relatedEntity.type !== undefined
      && (
        typeof relatedEntity.type !== 'string'
        || !relatedEntity.type.trim()
        || relatedEntity.type.length > MAX_RELATED_ENTITY_TYPE_LENGTH
        || !RELATED_ENTITY_TYPE_SET.has(relatedEntity.type)
      )
    ) {
      return { ok: false, reason: 'invalid-intent', message: 'relatedEntity.type must be a non-empty string.' };
    }
    normalizedRelatedEntity = {
      name: relatedEntity.name,
      ...(relatedEntity.type ? { type: relatedEntity.type as WorldCueRelatedEntityType } : {}),
    };
  }
  if (!isEligibleWorldCueTriggerPhrase(
    triggerPhrase,
    sourceCategory as InlineAudioCueCategory,
    variation,
    normalizedRelatedEntity,
  )) {
    return {
      ok: false,
      reason: 'ineligible-phrase',
      message: 'A World Cue must annotate the audible action phrase, not an entity name.',
    };
  }

  const normalizedTags = [...new Map((semanticTags as string[]).map(tag => [
    tag.trim().toLocaleLowerCase(),
    tag.trim(),
  ])).values()];
  return {
    ok: true,
    intent: {
      blockId,
      triggerPhrase,
      occurrenceIndex: occurrenceIndex as number,
      sourceCategory: sourceCategory as InlineAudioCueCategory,
      variation,
      semanticTags: normalizedTags,
      ...(normalizedRelatedEntity ? { relatedEntity: normalizedRelatedEntity } : {}),
    },
  };
}

const normalizedValue = (value: string) => value.trim().toLocaleLowerCase();
const compareStrings = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

/**
 * Resolve only an exact category/variation match. Tags rank candidates,
 * confidence breaks semantic ties, and URL order makes the result stable.
 */
export function resolveLibraryCueForWorldCue(
  intent: Pick<WorldCueIntent, 'sourceCategory' | 'variation' | 'semanticTags'>,
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): LibraryCue & { category: InlineAudioCueCategory } | null {
  if (!INLINE_CATEGORY_SET.has(intent.sourceCategory)) return null;
  const variation = normalizedValue(intent.variation);
  const tags = new Set(intent.semanticTags.map(normalizedValue).filter(Boolean));
  const candidates = loaded.cues.filter(cue => (
    cue.category === intent.sourceCategory
    && normalizedValue(cue.metadata.broad_variation) === variation
  ));
  const tagScore = (cue: LibraryCue) => new Set(
    cue.metadata.soft_tags.map(normalizedValue).filter(tag => tags.has(tag)),
  ).size;
  const ranked = [...candidates].sort((left, right) => (
    tagScore(right) - tagScore(left)
    || right.metadata.confidence_score - left.metadata.confidence_score
    || compareStrings(left.public_url, right.public_url)
  ));
  return (ranked[0] as LibraryCue & { category: InlineAudioCueCategory } | undefined) ?? null;
}

const exactOccurrenceOffset = (text: string, phrase: string, occurrenceIndex: number): number => {
  let fromIndex = 0;
  for (let index = 0; index <= occurrenceIndex; index += 1) {
    const found = text.indexOf(phrase, fromIndex);
    if (found < 0) return -1;
    if (index === occurrenceIndex) return found;
    fromIndex = found + phrase.length;
  }
  return -1;
};

const getReaderVisibleBlockText = (block: WorldCueChapterBlock) => (
  extractReaderVisibleAudioText(block.text ?? '').cleanText
);

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

/** Validate placement and resolve an approved Library Cue after generation. */
export function resolveWorldCueIntent(
  candidate: unknown,
  block: WorldCueChapterBlock,
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): WorldCueResolution {
  const validation = validateWorldCueIntent(candidate);
  if (!validation.ok) return validation;
  const intent = validation.intent;
  if (intent.blockId !== block.id) {
    return { ok: false, reason: 'block-mismatch', message: 'World Cue block reference does not match the supplied block.' };
  }
  if (block.system) {
    return { ok: false, reason: 'reserved-block', message: 'Structured System blocks retain their existing sound owner.' };
  }
  const blockText = getReaderVisibleBlockText(block);
  const firstOffset = exactOccurrenceOffset(blockText, intent.triggerPhrase, 0);
  if (firstOffset < 0) {
    return { ok: false, reason: 'phrase-not-found', message: 'The exact triggering phrase is absent from the referenced block.' };
  }
  const selectedOffset = exactOccurrenceOffset(blockText, intent.triggerPhrase, intent.occurrenceIndex);
  if (selectedOffset < 0) {
    return { ok: false, reason: 'occurrence-not-found', message: 'The requested zero-based phrase occurrence is absent.' };
  }
  const cue = resolveLibraryCueForWorldCue(intent, loaded);
  if (!cue) {
    return { ok: false, reason: 'unresolved-cue', message: 'No approved Library Cue matches this category and variation.' };
  }
  const idSeed = [
    intent.blockId,
    intent.triggerPhrase,
    String(intent.occurrenceIndex),
    intent.sourceCategory,
    normalizedValue(intent.variation),
  ].join('\u001f');
  return {
    ok: true,
    moment: {
      id: `world-cue:${intent.blockId}:${intent.occurrenceIndex}:${stableHash(idSeed)}`,
      blockId: intent.blockId,
      triggerPhrase: intent.triggerPhrase,
      occurrenceIndex: intent.occurrenceIndex,
      sourceCategory: intent.sourceCategory,
      variation: intent.variation,
      semanticTags: [...intent.semanticTags],
      ...(intent.relatedEntity ? { relatedEntity: { ...intent.relatedEntity } } : {}),
      cue: { publicUrl: cue.public_url },
    },
  };
}

const getEmbeddedIntents = (blocks: readonly WorldCueChapterBlock[]): unknown[] => blocks.flatMap((block) => {
  if (!isPlainObject(block.metadata)) return [];
  const audioMoments = block.metadata.audioMoments;
  return Array.isArray(audioMoments) ? audioMoments : [];
});

/**
 * Resolve a chapter only after its final block text exists. Callers may pass
 * validated generation intents explicitly or place them in
 * `block.metadata.audioMoments`; failures are reported and never rendered.
 */
export function resolveChapterAudioMoments(
  blocks: readonly WorldCueChapterBlock[],
  intents?: readonly unknown[],
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): ChapterAudioMomentsResolution {
  const candidates = intents ? [...intents] : getEmbeddedIntents(blocks);
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const visibleTextByBlockId = new Map(
    blocks.map(block => [block.id, getReaderVisibleBlockText(block)]),
  );
  const audioMoments: ResolvedWorldCueMoment[] = [];
  const issues: ChapterAudioMomentsResolution['issues'] = [];
  const seenIds = new Set<string>();
  const placementsByBlock = new Map<string, Array<{ start: number; end: number }>>();

  if (candidates.length > MAX_WORLD_CUE_MOMENTS_PER_CHAPTER) {
    issues.push({
      ok: false,
      reason: 'invalid-intent',
      message: `A chapter may contain at most ${MAX_WORLD_CUE_MOMENTS_PER_CHAPTER} World Cue intents.`,
      intentIndex: MAX_WORLD_CUE_MOMENTS_PER_CHAPTER,
    });
  }

  candidates.slice(0, MAX_WORLD_CUE_MOMENTS_PER_CHAPTER).forEach((candidate, intentIndex) => {
    const validation = validateWorldCueIntent(candidate);
    if (!validation.ok) {
      issues.push({ ...validation, intentIndex });
      return;
    }
    const block = blockById.get(validation.intent.blockId);
    if (!block) {
      issues.push({
        ok: false,
        reason: 'block-mismatch',
        message: 'World Cue references a block that is not present in the final chapter.',
        intentIndex,
      });
      return;
    }
    const resolution = resolveWorldCueIntent(validation.intent, block, loaded);
    if (!resolution.ok) {
      issues.push({ ...resolution, intentIndex });
      return;
    }
    const start = exactOccurrenceOffset(
      visibleTextByBlockId.get(block.id) ?? '',
      resolution.moment.triggerPhrase,
      resolution.moment.occurrenceIndex,
    );
    const end = start + resolution.moment.triggerPhrase.length;
    const placements = placementsByBlock.get(block.id) ?? [];
    if (placements.some(placement => start < placement.end && end > placement.start)) {
      issues.push({
        ok: false,
        reason: 'overlapping-placement',
        message: 'World Cue placements may not overlap within a chapter block.',
        intentIndex,
      });
      return;
    }
    if (!seenIds.has(resolution.moment.id)) {
      seenIds.add(resolution.moment.id);
      audioMoments.push(resolution.moment);
      placements.push({ start, end });
      placementsByBlock.set(block.id, placements);
    }
  });

  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  audioMoments.sort((left, right) => (
    (blockOrder.get(left.blockId) ?? Number.MAX_SAFE_INTEGER)
    - (blockOrder.get(right.blockId) ?? Number.MAX_SAFE_INTEGER)
    || exactOccurrenceOffset(
      visibleTextByBlockId.get(left.blockId) ?? '',
      left.triggerPhrase,
      left.occurrenceIndex,
    ) - exactOccurrenceOffset(
      visibleTextByBlockId.get(right.blockId) ?? '',
      right.triggerPhrase,
      right.occurrenceIndex,
    )
    || compareStrings(left.id, right.id)
  ));
  return { audioMoments, issues };
}

/** Revalidate persisted resolution so stale/unapproved URLs never get a glyph. */
export function resolveResolvedAudioMomentCue(
  moment: ResolvedWorldCueMoment,
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): ResolvedWorldCueValidation {
  if (
    !isPlainObject(moment)
    || typeof moment.id !== 'string'
    || !moment.id.trim()
    || typeof moment.blockId !== 'string'
    || !moment.blockId.trim()
    || typeof moment.triggerPhrase !== 'string'
    || !moment.triggerPhrase.trim()
    || !Number.isInteger(moment.occurrenceIndex)
    || moment.occurrenceIndex < 0
    || typeof moment.sourceCategory !== 'string'
    || !INLINE_CATEGORY_SET.has(moment.sourceCategory)
    || typeof moment.variation !== 'string'
    || !moment.variation.trim()
    || !Array.isArray(moment.semanticTags)
    || !isPlainObject(moment.cue)
    || typeof moment.cue.publicUrl !== 'string'
  ) {
    return { ok: false, reason: 'invalid-moment', message: 'This World Cue annotation is invalid.' };
  }
  const cue = getByUrl(loaded, moment.cue.publicUrl);
  if (!cue) {
    return { ok: false, reason: 'not-found', message: 'This World Cue is no longer available in the Library catalog.' };
  }
  if (!INLINE_CATEGORY_SET.has(cue.category)) {
    return { ok: false, reason: 'reserved-category', message: `${cue.category} cues belong to another audio surface.` };
  }
  if (cue.category !== moment.sourceCategory) {
    return { ok: false, reason: 'category-mismatch', message: 'The resolved cue no longer matches its World Cue category.' };
  }
  if (normalizedValue(cue.metadata.broad_variation) !== normalizedValue(moment.variation)) {
    return { ok: false, reason: 'variation-mismatch', message: 'The resolved cue no longer matches its World Cue variation.' };
  }
  if (!isEligibleWorldCueTriggerPhrase(
    moment.triggerPhrase,
    moment.sourceCategory,
    moment.variation,
    moment.relatedEntity,
  )) {
    return { ok: false, reason: 'invalid-moment', message: 'This World Cue action placement is invalid.' };
  }
  return { ok: true, cue: cue as LibraryCue & { category: InlineAudioCueCategory } };
}

/** Resolve an application-owned World Cue artifact to the shared playback source. */
export function resolvePlayableAudioMoment(
  moment: ResolvedAudioMoment,
  loaded: LibraryCuesLoadResult = DEFAULT_LIBRARY_CUES,
): PlayableAudioMomentResolution {
  const resolution = resolveResolvedAudioMomentCue(moment, loaded);
  return resolution.ok
    ? { ok: true, publicUrl: resolution.cue.public_url, actionLabel: 'World Cue' }
    : resolution;
}

/** Annotation-scoped identity prevents equal catalog cues sharing UI state. */
export function getInlineCueTrackId(moment: ResolvedAudioMoment): string {
  return `reader-inline:${moment.id}`;
}

/** Split only the exact persisted occurrence; invalid or overlapping placements stay plain prose. */
export function splitByResolvedAudioMoments(
  text: string,
  moments: readonly ResolvedAudioMoment[],
): InlineAudioTextSegment[] {
  const placements = moments
    .map(moment => ({
      moment,
      start: exactOccurrenceOffset(text, moment.triggerPhrase, moment.occurrenceIndex),
    }))
    .filter((placement): placement is { moment: ResolvedAudioMoment; start: number } => placement.start >= 0)
    .map(placement => ({
      ...placement,
      end: placement.start + placement.moment.triggerPhrase.length,
    }))
    .sort((left, right) => left.start - right.start || right.end - left.end || compareStrings(left.moment.id, right.moment.id));

  const segments: InlineAudioTextSegment[] = [];
  let cursor = 0;
  for (const placement of placements) {
    if (placement.start < cursor) continue;
    if (placement.start > cursor) segments.push({ text: text.slice(cursor, placement.start) });
    segments.push({
      text: text.slice(placement.start, placement.end),
      moment: placement.moment,
    });
    cursor = placement.end;
  }
  if (cursor < text.length || segments.length === 0) segments.push({ text: text.slice(cursor) });
  return segments;
}
