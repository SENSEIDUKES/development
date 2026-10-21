import { castVoice, chooseCastVoice } from '../../../audio/voiceCast';
import type { CodexEntry, CodexEntryVoice } from '../../../narrative/holdings';
import type { PlanAge, PlanGender } from '../../../narrative/chapterPlan';
import { UNNAMED_SPEAKER, type SpeakerAttachment } from '../../../narrative/speech';
import type { ReadAloudCharacterVoices } from '../../../narrative/readAloud';
import { factionNamed, type DeclaredFaction } from './factions';
import type { CodexEntryResolver, DeclaredCharacter } from './holdings';
import { normalizeIdentityLabel } from './canonicalProjection';

/**
 * Character voices (SENSEI, 2026-10-18): each paragraph's speaker names a
 * Codex character, and the character's voice lives on its card, a key of the
 * SEIHouse voice cast, so Read Aloud voices each character as itself in any
 * speech engine. Narrator, main-character and side-character voices remain
 * only for a line no character's voice answers.
 */

/**
 * The one full name a short name stands for: "Mina" for Mina Kisaragi, when no
 * other name the story knows has that word. A name that is already full, or
 * shared by two, stands for none.
 */
export function fullNameOf(name: string, names: readonly string[]): string | undefined {
  const key = normalizeIdentityLabel(name);
  if (!key || key.includes(' ')) return undefined;
  const matches = [...new Set(names)].filter(other => {
    const parts = normalizeIdentityLabel(other).split(' ');
    return parts.length > 1 && parts.includes(key);
  });
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Each speaker record of a chapter, pointed at its Codex character when the
 * chapter commits, only when they have one (SENSEI, 2026-10-18: not every
 * speaker gets a card; a crowd or a passing guard speaks, and is read in the
 * side voice). A speaker joins the main character for `MC`, a character the
 * Story Seed declares (made now, if this is their first chapter), or a card
 * the record already holds, made by a plan (the chapter's own cast included,
 * through the resolver they share). A first name alone finds the one
 * character it belongs to ("Mina", Mina Kisaragi). A speaker never makes a
 * card of its own, `someone else` is never anyone's, and a group (a faction)
 * speaks as itself.
 */
export function resolveSpeakers({ speakers, resolver, entries = [], declared = [], declaredFactions = [] }: {
  speakers: readonly SpeakerAttachment[];
  resolver: CodexEntryResolver;
  /** The story's character entries, whose full names a first name may stand for. */
  entries?: readonly CodexEntry[];
  /** The characters the Story Seed declares, who have a card from the moment they speak. */
  declared?: readonly DeclaredCharacter[];
  declaredFactions?: readonly DeclaredFaction[];
}): SpeakerAttachment[] {
  const isDeclared = (name: string) => declared.some(character => [character.name, ...(character.aliases ?? [])]
    .some(other => normalizeIdentityLabel(other) === normalizeIdentityLabel(name)));
  const knownNames = [
    ...entries.filter(entry => entry.kind === 'character').flatMap(entry => [entry.name, ...(entry.aliases ?? [])]),
    ...declared.flatMap(character => [character.name, ...(character.aliases ?? [])]),
    ...resolver.created.filter(entry => entry.kind === 'character').map(entry => entry.name),
  ];
  return speakers.map(record => {
    const { protagonist } = record.payload;
    if (!protagonist && (normalizeIdentityLabel(record.payload.speaker) === UNNAMED_SPEAKER || factionNamed(record.payload.speaker, declaredFactions))) return record;
    const exact = resolver.existing(record.payload.speaker) || isDeclared(record.payload.speaker);
    const speaker = exact ? record.payload.speaker : fullNameOf(record.payload.speaker, knownNames) ?? record.payload.speaker;
    const known = resolver.existing(speaker);
    const entry = protagonist || isDeclared(speaker) ? resolver.character(protagonist ? 'MC' : speaker)
      : known?.kind === 'character' ? known : undefined;
    return entry ? { ...record, payload: { ...record.payload, entryId: entry.id } } : record;
  });
}

/**
 * The first voice of each character who speaks in a committed chapter and has
 * none yet, chosen by code (`chooseCastVoice`): of their gender and age as the
 * record has them (SENSEI, 2026-10-20: the plan that cast them gave both), a
 * protagonist's voice for the main character, and one no other character of
 * the story has while any is left. A character whose gender the record does
 * not hold as male or female is given none: a man's voice for a woman is worse
 * than the shared side or main character voice, which reads them until the
 * reader chooses on their card. A voice already on a card is never changed here.
 */
export function firstVoices({ speakers, entries, castOf, at }: {
  speakers: readonly SpeakerAttachment[];
  /** The story's entries, those this chapter made included. */
  entries: readonly CodexEntry[];
  /** A character's gender and age, as the record holds them. */
  castOf: (entry: CodexEntry) => { gender?: PlanGender; age?: PlanAge } | undefined;
  at: string;
}): Map<string, CodexEntryVoice> {
  const voices = new Map<string, CodexEntryVoice>();
  const taken = entries.flatMap(entry => (entry.voice && castVoice(entry.voice.key) ? [entry.voice.key] : []));
  const spoke = new Set(speakers.flatMap(record => (record.payload.entryId ? [record.payload.entryId] : [])));
  for (const id of spoke) {
    const entry = entries.find(candidate => candidate.id === id);
    if (!entry || entry.kind !== 'character' || (entry.voice && castVoice(entry.voice.key))) continue;
    const { gender, age } = castOf(entry) ?? {};
    if (gender !== 'male' && gender !== 'female') continue;
    const key = chooseCastVoice({ seed: entry.id, gender, ...(age ? { age } : {}), mainCharacter: Boolean(entry.mainCharacter), taken });
    taken.push(key);
    voices.set(id, { key, chosen: 'auto', at });
  }
  return voices;
}

/**
 * The voices a chapter is read with, from the story's Codex cards: each
 * character's by entry and by every name they answer to, and the main
 * character's for their lines nobody tagged. A card without a voice of the
 * cast leaves its lines to their role's voice.
 */
export function readAloudVoicesOf(entries: readonly CodexEntry[]): ReadAloudCharacterVoices {
  const byEntry: Record<string, string> = {};
  const byName: Record<string, string> = {};
  let main: string | undefined;
  for (const entry of entries) {
    const key = entry.kind === 'character' && entry.voice && castVoice(entry.voice.key) ? entry.voice.key : undefined;
    if (!key) continue;
    byEntry[entry.id] = key;
    for (const name of [entry.name, ...(entry.aliases ?? [])]) byName[name.trim().toLowerCase().replace(/\s+/g, ' ')] = key;
    if (entry.mainCharacter) main = key;
  }
  // A first name alone reads in the voice of the one character it belongs to.
  const names = entries.filter(entry => entry.kind === 'character').flatMap(entry => [entry.name, ...(entry.aliases ?? [])]);
  for (const name of names) {
    for (const part of normalizeIdentityLabel(name).split(' ')) {
      const full = fullNameOf(part, names);
      const voice = full ? byName[full.trim().toLowerCase().replace(/\s+/g, ' ')] : undefined;
      if (voice && !byName[part]) byName[part] = voice;
    }
  }
  return { byEntry, byName, ...(main ? { main } : {}) };
}
