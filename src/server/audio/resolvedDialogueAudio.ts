import {
  DIALOGUE_ARTIFACT_PUBLIC_ORIGIN,
  isApplicationOwnedDialogueArtifactUrl,
} from '../../audio/dialogueArtifacts';
import type { ResolvedDialogueAudioMoment } from '../../audio/inlineAudio';
import { extractReaderVisibleAudioText } from '../../audio/readerVisibleText';
import {
  canonicalLivingStoryEntityKey,
  type LivingStoryRecord,
} from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';
import { getByInternalKey, loadVoiceCatalog } from './voiceCatalog';
import { isCharacterVoiceEligible } from './characterVoiceAssignments';

export { DIALOGUE_ARTIFACT_PUBLIC_ORIGIN } from '../../audio/dialogueArtifacts';

export interface DialogueArtifactBlock {
  id: string;
  type: string;
  text: string;
  metadata?: unknown;
}

export interface ConstructResolvedDialogueAudioInput {
  /** Canonical persisted Character record, never a Bestiary species. */
  character: LivingStoryRecord;
  /** Must exactly equal the Character's persisted provider-neutral voiceKey. */
  voiceKey: string;
  /** Validated Manifest block that owns the literal quoted phrase. */
  block: DialogueArtifactBlock;
  triggerPhrase: string;
  occurrenceIndex: number;
  artifact: { publicUrl: string };
  semanticTags?: readonly string[];
}

/** Completed synthesis metadata returned by a server-side voice adapter. */
export interface CompletedDialogueArtifactCandidate {
  characterId: string;
  blockId: string;
  triggerPhrase: string;
  occurrenceIndex: number;
  publicUrl: string;
  semanticTags?: readonly string[];
}

export interface FinalizeResolvedDialogueAudioInput {
  characters: readonly LivingStoryRecord[];
  blocks: readonly DialogueArtifactBlock[];
  candidates: readonly CompletedDialogueArtifactCandidate[];
}

export type DialogueArtifactConstructionFailureReason =
  | 'invalid-character'
  | 'ineligible-character'
  | 'invalid-dialogue-block'
  | 'speaker-mismatch'
  | 'voice-key-mismatch'
  | 'invalid-voice-key'
  | 'provider-exposure'
  | 'invalid-placement'
  | 'invalid-artifact';

export type DialogueArtifactConstructionResult =
  | { ok: true; moment: ResolvedDialogueAudioMoment }
  | {
      ok: false;
      reason: DialogueArtifactConstructionFailureReason;
      message: string;
    };

const MAX_ID_LENGTH = 160;
const MAX_TRIGGER_LENGTH = 240;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 48;
const MAX_ARTIFACT_URL_LENGTH = 2048;
const QUOTED_PHRASE = /^(?:"[^"\r\n]+"|“[^”\r\n]+”|'[^'\r\n]+'|‘[^’\r\n]+’)$/u;

const nonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const isRecord = (value: unknown): value is LivingStoryRecord => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const aliases = (character: LivingStoryRecord): string[] => [
  ...(Array.isArray(character.aliases) ? character.aliases : []),
  ...(Array.isArray(character.alternateNames) ? character.alternateNames : []),
].flatMap(value => {
  const alias = nonEmptyString(value);
  return alias ? [alias] : [];
});

const speakerMatchesCharacter = (speakerName: string, character: LivingStoryRecord): boolean => {
  const speakerKey = canonicalLivingStoryEntityKey(speakerName);
  const names = [nonEmptyString(character.name), ...aliases(character)]
    .filter((value): value is string => Boolean(value));
  return names.some(value => canonicalLivingStoryEntityKey(value) === speakerKey);
};

const exactOccurrenceOffset = (
  text: string,
  phrase: string,
  occurrenceIndex: number,
): number => {
  let fromIndex = 0;
  for (let index = 0; index <= occurrenceIndex; index += 1) {
    const offset = text.indexOf(phrase, fromIndex);
    if (offset < 0) return -1;
    if (index === occurrenceIndex) return offset;
    fromIndex = offset + phrase.length;
  }
  return -1;
};

const stableHash = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const normalizedTags = (tags: readonly string[] | undefined): string[] | undefined => {
  const source = tags ?? [];
  if (
    source.length > MAX_TAGS - 1
    || source.some(tag => !tag.trim() || tag.length > MAX_TAG_LENGTH)
  ) return undefined;
  const unique = new Map<string, string>([['dialogue', 'dialogue']]);
  for (const tag of source) {
    const trimmed = tag.trim();
    const key = canonicalLivingStoryEntityKey(trimmed);
    if (key && !unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()];
};

const validateApplicationArtifactUrl = (value: unknown): string | undefined => {
  const publicUrl = nonEmptyString(value);
  if (!publicUrl || publicUrl.length > MAX_ARTIFACT_URL_LENGTH) return undefined;
  try {
    const parsed = new URL(publicUrl);
    if (!isApplicationOwnedDialogueArtifactUrl(publicUrl)) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
};

/**
 * Server-owned construction and validation boundary for a completed dialogue
 * artifact. It verifies canonical Character identity, the exact persisted
 * voiceKey, literal quote placement, and an application-owned public URL.
 * Provider IDs are only compared internally and never returned.
 */
export function constructResolvedDialogueAudioMoment(
  input: ConstructResolvedDialogueAudioInput,
): DialogueArtifactConstructionResult {
  const characterId = nonEmptyString(input.character.id);
  const characterName = nonEmptyString(input.character.name);
  if (!characterId || characterId.length > MAX_ID_LENGTH || !characterName) {
    return {
      ok: false,
      reason: 'invalid-character',
      message: 'Dialogue audio requires a canonical persisted Character ID and name.',
    };
  }
  if (!isCharacterVoiceEligible(input.character)) {
    return {
      ok: false,
      reason: 'ineligible-character',
      message: 'Dialogue audio is limited to an intelligent named Character identity.',
    };
  }

  const blockId = nonEmptyString(input.block.id);
  const rawBlockText = nonEmptyString(input.block.text);
  const blockText = rawBlockText
    ? nonEmptyString(extractReaderVisibleAudioText(rawBlockText).cleanText)
    : undefined;
  const metadata = isRecord(input.block.metadata) ? input.block.metadata : undefined;
  const speakerName = nonEmptyString(metadata?.speakerName);
  const mode = metadata?.mode;
  if (
    input.block.type !== 'dialogue'
    || !blockId
    || blockId.length > MAX_ID_LENGTH
    || !blockText
    || !speakerName
    || (mode !== undefined && mode !== 'dialogue')
  ) {
    return {
      ok: false,
      reason: 'invalid-dialogue-block',
      message: 'Dialogue audio requires a validated dialogue block and named speaker.',
    };
  }
  if (!speakerMatchesCharacter(speakerName, input.character)) {
    return {
      ok: false,
      reason: 'speaker-mismatch',
      message: 'The dialogue speaker does not match the canonical Character identity.',
    };
  }

  const persistedVoiceKey = nonEmptyString(input.character.voiceKey);
  const requestedVoiceKey = nonEmptyString(input.voiceKey);
  if (!persistedVoiceKey || !requestedVoiceKey || requestedVoiceKey !== persistedVoiceKey) {
    return {
      ok: false,
      reason: 'voice-key-mismatch',
      message: 'Dialogue audio must use the Character\'s persisted voiceKey.',
    };
  }
  const catalog = loadVoiceCatalog();
  if (catalog.entries.some(entry => entry.voice_id === requestedVoiceKey)) {
    return {
      ok: false,
      reason: 'provider-exposure',
      message: 'A provider voice ID cannot be used as a Character voiceKey.',
    };
  }
  const voice = getByInternalKey(catalog.publicView, requestedVoiceKey);
  if (!voice?.ttsAvailable) {
    return {
      ok: false,
      reason: 'invalid-voice-key',
      message: 'The persisted Character voiceKey is not available in the server catalog.',
    };
  }

  const triggerPhrase = input.triggerPhrase;
  if (
    typeof triggerPhrase !== 'string'
    || triggerPhrase !== triggerPhrase.trim()
    || !QUOTED_PHRASE.test(triggerPhrase)
    || triggerPhrase.length > MAX_TRIGGER_LENGTH
    || !Number.isInteger(input.occurrenceIndex)
    || input.occurrenceIndex < 0
    || exactOccurrenceOffset(blockText, triggerPhrase, input.occurrenceIndex) < 0
  ) {
    return {
      ok: false,
      reason: 'invalid-placement',
      message: 'Dialogue audio requires an exact quoted phrase occurrence in its persisted block.',
    };
  }

  const semanticTags = normalizedTags(input.semanticTags);
  if (!semanticTags) {
    return {
      ok: false,
      reason: 'invalid-placement',
      message: 'Dialogue audio semantic tags are invalid.',
    };
  }
  const publicUrl = validateApplicationArtifactUrl(input.artifact?.publicUrl);
  if (!publicUrl) {
    return {
      ok: false,
      reason: 'invalid-artifact',
      message: 'Dialogue audio requires an application-owned public artifact.',
    };
  }

  return {
    ok: true,
    moment: {
      id: `dialogue:${blockId}:${input.occurrenceIndex}:${stableHash([
        characterId,
        triggerPhrase,
      ].join('\u001f'))}`,
      blockId,
      triggerPhrase,
      occurrenceIndex: input.occurrenceIndex,
      sourceCategory: 'voice',
      actionType: 'spoken-dialogue',
      semanticTags,
      relatedEntity: {
        id: characterId,
        name: characterName,
        type: 'character',
      },
      voiceKey: requestedVoiceKey,
      artifact: { publicUrl },
    },
  };
}

/**
 * Server integration boundary used after synthesis. It binds completed
 * artifacts to canonical Character identities and accepted chapter blocks;
 * invalid or stale candidates simply do not become Reader annotations.
 */
export function finalizeResolvedDialogueAudioMoments(
  input: FinalizeResolvedDialogueAudioInput,
): ResolvedDialogueAudioMoment[] {
  const charactersById = new Map(input.characters.flatMap(character => {
    const id = nonEmptyString(character.id) ?? nonEmptyString(character.persistenceId);
    return id ? [[id, character] as const] : [];
  }));
  const blocksById = new Map(input.blocks.map(block => [block.id, block]));
  const accepted: ResolvedDialogueAudioMoment[] = [];
  const seenIds = new Set<string>();

  for (const candidate of input.candidates) {
    const character = charactersById.get(candidate.characterId);
    const block = blocksById.get(candidate.blockId);
    const voiceKey = character ? nonEmptyString(character.voiceKey) : undefined;
    if (!character || !block || !voiceKey) continue;
    const result = constructResolvedDialogueAudioMoment({
      character,
      voiceKey,
      block,
      triggerPhrase: candidate.triggerPhrase,
      occurrenceIndex: candidate.occurrenceIndex,
      artifact: { publicUrl: candidate.publicUrl },
      semanticTags: candidate.semanticTags,
    });
    if (!result.ok || seenIds.has(result.moment.id)) continue;
    seenIds.add(result.moment.id);
    accepted.push(result.moment);
  }
  return accepted;
}
