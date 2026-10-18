import { castVoice, chooseCastVoice } from '../../../audio/voiceCast';
import type { CodexEntry, CodexEntryVoice } from '../../../narrative/holdings';
import type { SpeakerAttachment } from '../../../narrative/speech';
import type { ReadAloudCharacterVoices } from '../../../narrative/readAloud';
import { factionNamed, type DeclaredFaction } from './factions';
import type { CodexEntryResolver } from './holdings';

/**
 * Character voices (SENSEI, 2026-10-18): a speaker tag names a Codex
 * character, and the character's voice lives on its card, a key of the
 * SEIHouse voice cast, so Read Aloud voices each character as itself in any
 * speech engine. Narrator, main-character and side-character voices remain
 * only for a line no character's voice answers.
 */

/**
 * Each speaker record of a chapter, pointed at its Codex character when the
 * chapter commits: the main character for `MC`, else the character the name
 * names, made when it is new (by the resolver the chapter's other tags share,
 * so a name both tagged is one entry). A group (a faction) speaks as itself
 * and has no entry.
 */
export function resolveSpeakers({ speakers, resolver, declaredFactions = [] }: {
  speakers: readonly SpeakerAttachment[];
  resolver: CodexEntryResolver;
  declaredFactions?: readonly DeclaredFaction[];
}): SpeakerAttachment[] {
  return speakers.map(record => {
    const { speaker, protagonist } = record.payload;
    if (!protagonist && factionNamed(speaker, declaredFactions)) return record;
    const entry = resolver.character(protagonist ? 'MC' : speaker);
    return { ...record, payload: { ...record.payload, entryId: entry.id } };
  });
}

const HE = /\b(?:he|him|his|himself)\b/giu;
const SHE = /\b(?:she|her|hers|herself)\b/giu;
const MALE = /\b(?:male|man|boy|son|brother|father|king|prince|lord|master)\b/iu;
const FEMALE = /\b(?:female|woman|girl|daughter|sister|mother|queen|princess|lady|mistress)\b/iu;

/**
 * Whether a character sounds like a man or a woman, only for their first
 * voice: from the author's notes on them when those say, else from the
 * pronouns of the paragraphs they speak in, when one side clearly outweighs
 * the other. Unknown otherwise; the reader can always change the voice.
 */
export function speakerGender({ notes, paragraphs }: { notes?: string; paragraphs: readonly string[] }): 'male' | 'female' | undefined {
  if (notes) {
    const male = MALE.test(notes);
    const female = FEMALE.test(notes);
    if (male !== female) return male ? 'male' : 'female';
  }
  const text = paragraphs.join('\n');
  const he = text.match(HE)?.length ?? 0;
  const she = text.match(SHE)?.length ?? 0;
  // At least two, and three times the other: "he told her" says nothing.
  if (he >= 2 && he >= 3 * she) return 'male';
  if (she >= 2 && she >= 3 * he) return 'female';
  return undefined;
}

/**
 * The first voice of each character who speaks in a committed chapter and has
 * none yet, chosen by code (`chooseCastVoice`): of their gender, a
 * protagonist's voice for the main character, and one no other character of
 * the story has while any is left. Only when their gender can be told: a
 * man's voice for a woman is worse than the shared side or main character
 * voice, which reads them until a chapter tells, or the reader chooses on
 * their card. A voice already on a card is never changed here.
 */
export function firstVoices({ speakers, paragraphOf, entries, notesOf, at }: {
  speakers: readonly SpeakerAttachment[];
  /** The text around a speaker record: its paragraph, and the narration after it. */
  paragraphOf: (record: SpeakerAttachment) => string | undefined;
  /** The story's entries, those this chapter made included. */
  entries: readonly CodexEntry[];
  /** The author's notes on a character, when the Story Seed has any. */
  notesOf?: (entry: CodexEntry) => string | undefined;
  at: string;
}): Map<string, CodexEntryVoice> {
  const voices = new Map<string, CodexEntryVoice>();
  const taken = entries.flatMap(entry => (entry.voice && castVoice(entry.voice.key) ? [entry.voice.key] : []));
  const spoken = new Map<string, string[]>();
  for (const record of speakers) {
    const id = record.payload.entryId;
    if (!id) continue;
    const text = paragraphOf(record);
    spoken.set(id, [...(spoken.get(id) ?? []), ...(text ? [text] : [])]);
  }
  for (const [id, paragraphs] of spoken) {
    const entry = entries.find(candidate => candidate.id === id);
    if (!entry || entry.kind !== 'character' || (entry.voice && castVoice(entry.voice.key))) continue;
    const gender = speakerGender({ notes: notesOf?.(entry), paragraphs });
    if (!gender) continue;
    const key = chooseCastVoice({ seed: entry.id, gender, mainCharacter: Boolean(entry.mainCharacter), taken });
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
  return { byEntry, byName, ...(main ? { main } : {}) };
}
