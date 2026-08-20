import {
  canonicalLivingStoryEntityKey,
  type LivingStoryRecord,
} from '../../components/chapter-generation/shared/packets/livingStoryEntityIdentity';
import { scrubProviderVoiceFields } from '../../components/chapter-generation/shared/packets/creatureCodex';
import {
  getByInternalKey,
  getTtsAvailable,
  loadVoiceCatalog,
  type PublicVoiceMeta,
} from './voiceCatalog';

/**
 * A validated dialogue moment can request a voice for its named speaker.
 * It deliberately carries no quote text, provider ID, or catalog selection.
 */
export interface DialogueSpeakerReference {
  speakerName: string;
  /** Prefer the canonical Character ID when the audio-moment resolver has it. */
  characterId?: string;
}

export type CharacterVoiceAssignmentWarningCode =
  | 'character-not-found'
  | 'ambiguous-character'
  | 'missing-character-id'
  | 'ineligible-character'
  | 'invalid-existing-voice-key'
  | 'no-available-voices';

export interface CharacterVoiceAssignmentWarning {
  code: CharacterVoiceAssignmentWarningCode;
  speakerName: string;
  message: string;
}

export interface CharacterVoiceResolution {
  characterId: string;
  characterName: string;
  /** Provider-neutral catalog key. Never a provider voice ID. */
  voiceKey: string;
  /** True only when this call assigned the key for the first time. */
  assigned: boolean;
}

export interface AssignCharacterVoicesInput {
  /** Pass normalized Character records only, never Bestiary species records. */
  characters: readonly LivingStoryRecord[];
  /** Only deliberate spoken-dialogue moments make a Character eligible. */
  dialogueSpeakers: readonly DialogueSpeakerReference[];
  /** Test/integration override; defaults to the server-only voice catalog. */
  voices?: readonly PublicVoiceMeta[];
}

export interface AssignCharacterVoicesResult {
  /** Sanitized clones of the canonical Character records. */
  characters: LivingStoryRecord[];
  /** Full records whose voice identity was assigned or invalid identity was removed. */
  changedCharacters: LivingStoryRecord[];
  resolutions: CharacterVoiceResolution[];
  warnings: CharacterVoiceAssignmentWarning[];
}

const CHARACTER_ID_FIELDS = ['id', 'persistenceId'] as const;
const CHARACTER_NAME_FIELDS = ['name', 'title', 'label'] as const;
const CHARACTER_ALIAS_FIELDS = ['aliases', 'alternateNames'] as const;

const nonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const isRecord = (value: unknown): value is LivingStoryRecord => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const stringList = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.flatMap(candidate => {
        const stringValue = nonEmptyString(candidate);
        return stringValue ? [stringValue] : [];
      })
    : []
);

const sanitizeCharacter = (record: LivingStoryRecord): LivingStoryRecord => (
  scrubProviderVoiceFields(record, { preserveRootVoiceKey: true })
);

const characterId = (record: LivingStoryRecord): string | undefined => {
  for (const field of CHARACTER_ID_FIELDS) {
    const value = nonEmptyString(record[field]);
    if (value) return value;
  }
  return undefined;
};

const characterName = (record: LivingStoryRecord): string | undefined => {
  for (const field of CHARACTER_NAME_FIELDS) {
    const value = nonEmptyString(record[field]);
    if (value) return value;
  }
  return undefined;
};

const characterIdentityKeys = (record: LivingStoryRecord): Set<string> => {
  const keys = new Set<string>();
  for (const field of CHARACTER_NAME_FIELDS) {
    const value = nonEmptyString(record[field]);
    if (value) keys.add(canonicalLivingStoryEntityKey(value));
  }
  for (const field of CHARACTER_ALIAS_FIELDS) {
    for (const value of stringList(record[field])) {
      keys.add(canonicalLivingStoryEntityKey(value));
    }
  }
  keys.delete('');
  return keys;
};

const INTELLIGENCE_EVIDENCE = /\b(?:advanced|ancient|awakened|conscious|cunning|genius|high|human[- ]?like|intelligen\w*|reason\w*|sapien\w*|self[- ]?aware|sentien\w*|speak\w*|strateg\w*|wise)\b/iu;
const NON_INTELLIGENCE_EVIDENCE = /\b(?:animal[- ]?level|feral|instinct(?:ual)?|low|mindless|non[- ]?sentient|none|unintelligent)\b/iu;

/**
 * Human Characters are intelligent by their canonical identity. A non-human
 * Character needs explicit semantic evidence; being named or having a
 * Portrait is not enough to turn a creature into a speaking identity.
 */
export const isCharacterVoiceEligible = (record: LivingStoryRecord): boolean => {
  if (record.portraitKind !== 'non-human') return true;
  if (record.isIntelligent === true || record.intelligent === true) return true;
  const profile = isRecord(record.creatureProfile) ? record.creatureProfile : undefined;
  const intelligence = nonEmptyString(profile?.intelligence)
    ?? nonEmptyString(record.intelligence);
  if (!intelligence || NON_INTELLIGENCE_EVIDENCE.test(intelligence)) return false;
  return INTELLIGENCE_EVIDENCE.test(intelligence);
};

const stableVoiceIndex = (characterIdentity: string, voiceCount: number): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < characterIdentity.length; index += 1) {
    hash ^= characterIdentity.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % voiceCount;
};

const findCharacterIndexes = (
  characters: readonly LivingStoryRecord[],
  reference: DialogueSpeakerReference,
): number[] => {
  const requestedId = nonEmptyString(reference.characterId);
  if (requestedId) {
    const idKey = canonicalLivingStoryEntityKey(requestedId);
    return characters.flatMap((record, index) => {
      const id = characterId(record);
      return id && canonicalLivingStoryEntityKey(id) === idKey ? [index] : [];
    });
  }

  const nameKey = canonicalLivingStoryEntityKey(reference.speakerName);
  if (!nameKey) return [];
  return characters.flatMap((record, index) => (
    characterIdentityKeys(record).has(nameKey) ? [index] : []
  ));
};

/**
 * Assigns one stable, provider-neutral voiceKey to each named Character that
 * owns a validated dialogue moment. Existing keys are immutable and reused.
 *
 * This helper intentionally accepts no Bestiary collection and returns no
 * provider IDs. Application code persists `changedCharacters` into the
 * canonical Codex identity before later dialogue is generated.
 */
export function assignCharacterVoices(
  input: AssignCharacterVoicesInput,
): AssignCharacterVoicesResult {
  const catalog = loadVoiceCatalog();
  const providerVoiceIds = new Set(
    catalog.entries.flatMap(entry => entry.voice_id ? [entry.voice_id] : []),
  );
  const changedIndexes = new Set<number>();
  const characters = input.characters.map((record, index) => {
    const character = sanitizeCharacter(record);
    const existingVoiceKey = nonEmptyString(character.voiceKey);
    if (
      existingVoiceKey
      && (
        providerVoiceIds.has(existingVoiceKey)
        || !isCharacterVoiceEligible(character)
      )
    ) {
      delete character.voiceKey;
      changedIndexes.add(index);
    }
    return character;
  });
  const voices = [...(input.voices ?? catalog.publicView)];
  const availableVoices = getTtsAvailable(voices)
    .slice()
    .sort((left, right) => left.internalKey.localeCompare(right.internalKey));
  const resolvedIndexes = new Set<number>();
  const resolutions: CharacterVoiceResolution[] = [];
  const warnings: CharacterVoiceAssignmentWarning[] = [];

  for (const reference of input.dialogueSpeakers) {
    const speakerName = reference.speakerName.trim();
    const matches = findCharacterIndexes(characters, reference);
    if (matches.length === 0) {
      warnings.push({
        code: 'character-not-found',
        speakerName,
        message: `No canonical Character matches dialogue speaker "${speakerName}".`,
      });
      continue;
    }
    if (matches.length > 1) {
      warnings.push({
        code: 'ambiguous-character',
        speakerName,
        message: `Dialogue speaker "${speakerName}" matches more than one Character.`,
      });
      continue;
    }

    const index = matches[0];
    if (resolvedIndexes.has(index)) continue;
    const character = characters[index];
    const id = characterId(character);
    const name = characterName(character);
    if (!id || !name) {
      warnings.push({
        code: 'missing-character-id',
        speakerName,
        message: `Dialogue speaker "${speakerName}" is not a persisted named Character.`,
      });
      continue;
    }

    if (!isCharacterVoiceEligible(character)) {
      if (nonEmptyString(character.voiceKey)) {
        delete character.voiceKey;
        changedIndexes.add(index);
      }
      warnings.push({
        code: 'ineligible-character',
        speakerName,
        message: `Non-human Character "${name}" needs explicit intelligence metadata before receiving a voiceKey.`,
      });
      resolvedIndexes.add(index);
      continue;
    }

    const existingVoiceKey = nonEmptyString(character.voiceKey);
    if (existingVoiceKey) {
      const existingVoice = getByInternalKey(voices, existingVoiceKey);
      if (!existingVoice?.ttsAvailable) {
        warnings.push({
          code: 'invalid-existing-voice-key',
          speakerName,
          message: `Character "${name}" keeps its existing voiceKey, but that key is not currently synthesizable.`,
        });
        resolvedIndexes.add(index);
        continue;
      }
      resolutions.push({
        characterId: id,
        characterName: name,
        voiceKey: existingVoiceKey,
        assigned: false,
      });
      resolvedIndexes.add(index);
      continue;
    }

    if (availableVoices.length === 0) {
      warnings.push({
        code: 'no-available-voices',
        speakerName,
        message: 'No server catalog voice is currently available for synthesis.',
      });
      continue;
    }

    const selectedVoice = availableVoices[stableVoiceIndex(id, availableVoices.length)];
    character.voiceKey = selectedVoice.internalKey;
    changedIndexes.add(index);
    resolvedIndexes.add(index);
    resolutions.push({
      characterId: id,
      characterName: name,
      voiceKey: selectedVoice.internalKey,
      assigned: true,
    });
  }

  return {
    characters,
    changedCharacters: [...changedIndexes].map(index => structuredClone(characters[index])),
    resolutions,
    warnings,
  };
}
