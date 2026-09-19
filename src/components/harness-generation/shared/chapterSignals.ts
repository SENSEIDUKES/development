import { SOUNDSCAPE_REGIONS, type SoundscapeRegion } from '../../../audio/soundscapes';
import { INLINE_AUDIO_CUE_CATEGORIES, WORLD_CUE_RELATED_ENTITY_TYPES, type InlineAudioCueCategory, type WorldCueRelatedEntityType } from '../../../audio/inlineAudio';
import { STORY_ENTITY_TYPES, type StoryBlockMetadata, type StoryEntityType, type SystemEvent } from '../../../narrative/chapter';
import type { HarnessWarning } from '../../../narrative/generation';

/**
 * The compact semantic signal contract of the Generation Model Call.
 *
 * The provider returns chapter prose plus shallow signal families. Every signal
 * names an exact `anchorText` copied from the prose and carries only the
 * meaning HARNESS needs. HARNESS matches anchors, validates each signal on its
 * own, and builds the detailed SEN `StoryBlock`, System Panel, and media
 * structures afterward. The detailed contracts never travel to the provider.
 */

export const HARNESS_SIGNAL_FAMILIES = [
  'dialogue', 'manifestations', 'systemPanels', 'soundscapes', 'soundCues', 'creatureEvents',
] as const;
export type HarnessSignalFamily = (typeof HARNESS_SIGNAL_FAMILIES)[number];

export const HARNESS_DIALOGUE_DELIVERIES = [
  'spoken', 'whispered', 'shouted', 'thought', 'transmitted', 'sung', 'narrated',
] as const;
export type HarnessDialogueDelivery = (typeof HARNESS_DIALOGUE_DELIVERIES)[number];

export const HARNESS_MANIFESTATION_TYPES = STORY_ENTITY_TYPES;
export const HARNESS_MANIFESTATION_MENTIONS = ['reveal', 'reference'] as const;

export const HARNESS_SYSTEM_PANEL_PRESENTATIONS = ['narrative', 'mechanical', 'world_notice', 'fate'] as const;
export type HarnessSystemPanelPresentation = (typeof HARNESS_SYSTEM_PANEL_PRESENTATIONS)[number];
export const HARNESS_SYSTEM_PANEL_MEANINGS = [
  'neutral', 'codex_update', 'friendly_scan', 'enemy_scan', 'warning', 'critical_danger',
  'progression', 'breakthrough', 'reward', 'romance', 'karmic_bond', 'mystery', 'fate_event',
  'corruption', 'death_event', 'quest_update', 'choice_consequence', 'system_error',
] as const;
export type HarnessSystemPanelMeaning = (typeof HARNESS_SYSTEM_PANEL_MEANINGS)[number];
export const HARNESS_FATE_OUTCOMES = ['FATE AVERTED', 'FATE SCARRED', 'DOOM MANIFESTED'] as const;
export type HarnessFateOutcome = (typeof HARNESS_FATE_OUTCOMES)[number];

export const HARNESS_SOUNDSCAPE_REGIONS = SOUNDSCAPE_REGIONS;
export const HARNESS_ATMOSPHERE_CATEGORIES = ['wind', 'crowd', 'waves', 'rain', 'combat', 'noise'] as const;
export const HARNESS_SOUND_CUE_CATEGORIES = INLINE_AUDIO_CUE_CATEGORIES;
export const HARNESS_SOUND_CUE_ENTITY_TYPES = WORLD_CUE_RELATED_ENTITY_TYPES;

export const HARNESS_CREATURE_EVENT_TYPES = ['reveal', 'power-up', 'technique', 'injury', 'turning-point', 'death', 'breakthrough'] as const;
export const HARNESS_CREATURE_SIZES = ['tiny', 'small', 'medium', 'large', 'giant', 'colossal'] as const;

/** Upper bounds keep one malformed or runaway family from displacing the chapter. */
export const HARNESS_SIGNAL_LIMITS: Record<HarnessSignalFamily, number> = {
  dialogue: 200, manifestations: 60, systemPanels: 24, soundscapes: 24, soundCues: 24, creatureEvents: 24,
};
const MAX_ANCHOR_LENGTH = 400;
const MAX_TAGS = 8;
const MAX_ENTRIES = 12;

/**
 * Every anchored signal may carry a zero-based `occurrenceIndex` selecting
 * which occurrence of a repeated `anchorText` it means. A unique anchor omits
 * it; a repeated anchor without one is dropped rather than guessed.
 */
export interface HarnessAnchoredSignal { anchorText: string; occurrenceIndex?: number }

export interface HarnessDialogueSignal extends HarnessAnchoredSignal { speaker: string; delivery?: HarnessDialogueDelivery }
export interface HarnessManifestationSignal extends HarnessAnchoredSignal { name: string; type: StoryEntityType; mention: 'reveal' | 'reference' }
export interface HarnessSystemPanelSignal extends HarnessAnchoredSignal {
  presentation: HarnessSystemPanelPresentation;
  title: string;
  meaning?: HarnessSystemPanelMeaning;
  body?: string;
  entries?: Array<{ label: string; value: string }>;
  /** Fate panels only. */
  outcome?: HarnessFateOutcome;
}
export interface HarnessSoundscapeSignal extends HarnessAnchoredSignal { mood: string; region?: SoundscapeRegion; tags?: string[]; intensity?: number }
export interface HarnessSoundCueSignal extends HarnessAnchoredSignal {
  category: InlineAudioCueCategory; variation: string; tags?: string[];
  entityName?: string; entityType?: WorldCueRelatedEntityType;
}
export interface HarnessCreatureEventSignal extends HarnessAnchoredSignal {
  type: (typeof HARNESS_CREATURE_EVENT_TYPES)[number]; name?: string;
  size?: (typeof HARNESS_CREATURE_SIZES)[number]; bodyType?: string; element?: string; movement?: string;
  intelligence?: string; threatTier?: string; signatureSound?: string;
}

export interface HarnessChapterSignals {
  dialogue: HarnessDialogueSignal[];
  manifestations: HarnessManifestationSignal[];
  systemPanels: HarnessSystemPanelSignal[];
  soundscapes: HarnessSoundscapeSignal[];
  soundCues: HarnessSoundCueSignal[];
  creatureEvents: HarnessCreatureEventSignal[];
}

/** The intentionally small transport shape requested from the provider. */
export interface HarnessModelChapterReply extends Partial<HarnessChapterSignals> {
  /** The sole authoritative chapter body: one entry per prose paragraph. */
  paragraphs: string[];
  title?: string;
  plan?: string;
  arcCompletion: { goalId: string; completed: boolean; evidence: string };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 400): string | undefined =>
  typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : undefined;
const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | undefined =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? value as T : undefined;
const tags = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const list = [...new Set(value.map(item => text(item, 48)).filter((item): item is string => Boolean(item)))].slice(0, MAX_TAGS);
  return list.length ? list : undefined;
};

/** A zero-based selector among repeated occurrences of the same anchor phrase. */
const occurrenceSelector = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;

type SignalReader<T> = (value: Record<string, unknown>) => T | undefined;

const readDialogue: SignalReader<HarnessDialogueSignal> = value => {
  const speaker = text(value.speaker, 160);
  const delivery = value.delivery === undefined ? undefined : oneOf(value.delivery, HARNESS_DIALOGUE_DELIVERIES);
  if (!speaker || (value.delivery !== undefined && !delivery)) return undefined;
  return { anchorText: value.anchorText as string, speaker, ...(delivery ? { delivery } : {}) };
};
const readManifestation: SignalReader<HarnessManifestationSignal> = value => {
  const name = text(value.name, 160);
  const type = oneOf(value.type, HARNESS_MANIFESTATION_TYPES);
  const mention = oneOf(value.mention, HARNESS_MANIFESTATION_MENTIONS);
  return name && type && mention ? { anchorText: value.anchorText as string, name, type, mention } : undefined;
};
const readSystemPanel: SignalReader<HarnessSystemPanelSignal> = value => {
  const presentation = oneOf(value.presentation, HARNESS_SYSTEM_PANEL_PRESENTATIONS);
  const title = text(value.title, 160);
  if (!presentation || !title) return undefined;
  const meaning = value.meaning === undefined ? undefined : oneOf(value.meaning, HARNESS_SYSTEM_PANEL_MEANINGS);
  if (value.meaning !== undefined && !meaning) return undefined;
  const body = value.body === undefined ? undefined : text(value.body, 2_000);
  const outcome = value.outcome === undefined ? undefined : oneOf(value.outcome, HARNESS_FATE_OUTCOMES);
  if (value.outcome !== undefined && !outcome) return undefined;
  let entries: HarnessSystemPanelSignal['entries'];
  if (value.entries !== undefined) {
    if (!Array.isArray(value.entries)) return undefined;
    entries = value.entries.flatMap(entry => {
      const label = isRecord(entry) ? text(entry.label, 120) : undefined;
      const entryValue = isRecord(entry) ? text(entry.value, 400) : undefined;
      return label && entryValue ? [{ label, value: entryValue }] : [];
    }).slice(0, MAX_ENTRIES);
  }
  if (presentation === 'fate' && !outcome) return undefined;
  if (presentation === 'mechanical' && !entries?.length) return undefined;
  if (presentation === 'world_notice' && !body && !entries?.length) return undefined;
  return {
    anchorText: value.anchorText as string, presentation, title,
    ...(meaning ? { meaning } : {}), ...(body ? { body } : {}),
    ...(entries?.length ? { entries } : {}), ...(outcome ? { outcome } : {}),
  };
};
const readSoundscape: SignalReader<HarnessSoundscapeSignal> = value => {
  const mood = text(value.mood, 64);
  if (!mood) return undefined;
  const region = value.region === undefined ? undefined : oneOf(value.region, HARNESS_SOUNDSCAPE_REGIONS);
  if (value.region !== undefined && !region) return undefined;
  const intensity = typeof value.intensity === 'number' && Number.isFinite(value.intensity) ? value.intensity : undefined;
  const list = tags(value.tags);
  return {
    anchorText: value.anchorText as string, mood, ...(region ? { region } : {}),
    ...(list ? { tags: list } : {}), ...(intensity === undefined ? {} : { intensity }),
  };
};
const readSoundCue: SignalReader<HarnessSoundCueSignal> = value => {
  const category = oneOf(value.category, HARNESS_SOUND_CUE_CATEGORIES);
  const variation = text(value.variation, 64);
  if (!category || !variation) return undefined;
  const entityName = value.entityName === undefined ? undefined : text(value.entityName, 160);
  const entityType = value.entityType === undefined ? undefined : oneOf(value.entityType, HARNESS_SOUND_CUE_ENTITY_TYPES);
  if (value.entityType !== undefined && !entityType) return undefined;
  const list = tags(value.tags);
  return {
    anchorText: value.anchorText as string, category, variation, ...(list ? { tags: list } : {}),
    ...(entityName ? { entityName } : {}), ...(entityName && entityType ? { entityType } : {}),
  };
};
const readCreatureEvent: SignalReader<HarnessCreatureEventSignal> = value => {
  const type = oneOf(value.type, HARNESS_CREATURE_EVENT_TYPES);
  if (!type) return undefined;
  const size = value.size === undefined ? undefined : oneOf(value.size, HARNESS_CREATURE_SIZES);
  if (value.size !== undefined && !size) return undefined;
  const signal: HarnessCreatureEventSignal = { anchorText: value.anchorText as string, type, ...(size ? { size } : {}) };
  const name = value.name === undefined ? undefined : text(value.name, 160);
  if (name) signal.name = name;
  for (const field of ['bodyType', 'element', 'movement', 'intelligence', 'threatTier', 'signatureSound'] as const) {
    const parsed = value[field] === undefined ? undefined : text(value[field], 96);
    if (parsed) signal[field] = parsed;
  }
  return signal;
};

const READERS: { [Family in HarnessSignalFamily]: SignalReader<HarnessChapterSignals[Family][number]> } = {
  dialogue: readDialogue, manifestations: readManifestation, systemPanels: readSystemPanel,
  soundscapes: readSoundscape, soundCues: readSoundCue, creatureEvents: readCreatureEvent,
};

const familyLabel: Record<HarnessSignalFamily, string> = {
  dialogue: 'dialogue', manifestations: 'manifestation', systemPanels: 'System Panel',
  soundscapes: 'soundscape', soundCues: 'Sound Cue', creatureEvents: 'creature event',
};

export interface HarnessSignalReadResult {
  signals: HarnessChapterSignals;
  warnings: HarnessWarning[];
}

/**
 * Reads every signal family independently. A malformed family or item becomes
 * a warning and is dropped; the chapter prose is never affected.
 */
export const readHarnessChapterSignals = (reply: Record<string, unknown>): HarnessSignalReadResult => {
  const warnings: HarnessWarning[] = [];
  const signals = Object.fromEntries(HARNESS_SIGNAL_FAMILIES.map(family => [family, []])) as unknown as HarnessChapterSignals;
  for (const family of HARNESS_SIGNAL_FAMILIES) {
    const raw = reply[family];
    if (raw === undefined || raw === null) continue;
    if (!Array.isArray(raw)) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `The optional ${familyLabel[family]} signals were not a list and were omitted.` });
      continue;
    }
    let dropped = 0;
    raw.slice(0, HARNESS_SIGNAL_LIMITS[family]).forEach(item => {
      const anchorText = isRecord(item) ? text(item.anchorText, MAX_ANCHOR_LENGTH) : undefined;
      const parsed = anchorText ? READERS[family]({ ...item as Record<string, unknown>, anchorText }) : undefined;
      if (!parsed) { dropped += 1; return; }
      // An unreadable occurrence selector is simply absent; the anchor then has
      // to be unique on its own or the signal is dropped by anchor resolution.
      const occurrenceIndex = isRecord(item) ? occurrenceSelector(item.occurrenceIndex) : undefined;
      (signals[family] as Array<typeof parsed>).push(
        occurrenceIndex === undefined ? parsed : { ...parsed, occurrenceIndex },
      );
    });
    if (raw.length > HARNESS_SIGNAL_LIMITS[family]) dropped += raw.length - HARNESS_SIGNAL_LIMITS[family];
    if (dropped) {
      warnings.push({
        code: 'optional_chapter_structure_omitted',
        message: `Omitted ${dropped} malformed optional ${familyLabel[family]} signal${dropped === 1 ? '' : 's'} without affecting the chapter prose.`,
      });
    }
  }
  return { signals, warnings };
};

export interface HarnessCastMember { name: string; role?: string; isMainCharacter?: boolean }

/** Untrusted candidates: Sound Cue intents receive their block identity from the SEN normalizer. */
interface CandidateBlock {
  text: string;
  type?: 'dialogue';
  metadata?: Omit<StoryBlockMetadata, 'audioMoments'> & { audioMoments?: Array<Record<string, unknown>> };
  system?: SystemEvent;
}

const excerpt = (value: string) => `${value.slice(0, 60)}${value.length > 60 ? '…' : ''}`;

/**
 * Quotation marks that a JSON round trip or a typographic style may swap for
 * one another. They are equivalent for matching only; stored prose keeps the
 * exact characters the writer produced.
 */
const QUOTE_EQUIVALENTS: Record<string, string> = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
};

/**
 * A matching-only projection of a passage: whitespace runs collapse to one
 * space and equivalent quotation marks fold together, while `offsets` maps
 * every projected character back to its exact index in the original text, so a
 * match always resolves to a real prose span.
 */
const normalizeForAnchoring = (value: string): { text: string; offsets: number[] } => {
  const characters: string[] = [];
  const offsets: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (/\s/u.test(character)) { if (characters.length) pendingSpace = true; continue; }
    if (pendingSpace) { characters.push(' '); offsets.push(index); pendingSpace = false; }
    characters.push(QUOTE_EQUIVALENTS[character] ?? character);
    offsets.push(index);
  }
  return { text: characters.join(''), offsets };
};

/** One exact prose span an anchor resolves to. */
interface AnchorOccurrence { blockIndex: number; start: number; end: number }

const findAnchorOccurrences = (blocks: readonly CandidateBlock[], anchorText: string): AnchorOccurrence[] => {
  const needle = normalizeForAnchoring(anchorText).text;
  const occurrences: AnchorOccurrence[] = [];
  if (!needle) return occurrences;
  blocks.forEach((block, blockIndex) => {
    const haystack = normalizeForAnchoring(block.text);
    let cursor = haystack.text.indexOf(needle);
    while (cursor >= 0) {
      occurrences.push({
        blockIndex,
        start: haystack.offsets[cursor],
        end: haystack.offsets[cursor + needle.length - 1] + 1,
      });
      cursor = haystack.text.indexOf(needle, cursor + 1);
    }
  });
  return occurrences;
};

type AnchorFailure = 'missing' | 'ambiguous' | 'occurrence-out-of-range';
type AnchorResolution = { ok: true; occurrence: AnchorOccurrence } | { ok: false; reason: AnchorFailure };

/**
 * An anchor must identify exactly one place in the chapter. `positional` is
 * true for the families whose placement is an offset in the prose: a System
 * Panel and a dialogue span split their block at the anchor, and a Sound Cue
 * plays at the anchor's occurrence. Block-level families only need one block,
 * so a phrase repeated inside a single paragraph is unambiguous for them.
 *
 * A repeated phrase is disambiguated by the signal's zero-based
 * `occurrenceIndex` over every occurrence in reading order. Without one, the
 * HARNESS drops the signal rather than silently choosing the first match.
 */
const resolveAnchor = (
  blocks: readonly CandidateBlock[],
  signal: HarnessAnchoredSignal,
  positional: boolean,
): AnchorResolution => {
  const occurrences = findAnchorOccurrences(blocks, signal.anchorText);
  if (!occurrences.length) return { ok: false, reason: 'missing' };
  if (signal.occurrenceIndex !== undefined) {
    const chosen = occurrences[signal.occurrenceIndex];
    return chosen ? { ok: true, occurrence: chosen } : { ok: false, reason: 'occurrence-out-of-range' };
  }
  const ambiguous = positional
    ? occurrences.length > 1
    : new Set(occurrences.map(occurrence => occurrence.blockIndex)).size > 1;
  return ambiguous ? { ok: false, reason: 'ambiguous' } : { ok: true, occurrence: occurrences[0] };
};

const anchorWarning = (
  family: HarnessSignalFamily,
  anchorText: string,
  reason: AnchorFailure,
): HarnessWarning => ({
  code: 'optional_chapter_structure_omitted',
  message: reason === 'missing'
    ? `Omitted a ${familyLabel[family]} signal whose anchor "${excerpt(anchorText)}" is not in this chapter's paragraphs.`
    : reason === 'occurrence-out-of-range'
      ? `Omitted a ${familyLabel[family]} signal whose anchor "${excerpt(anchorText)}" does not occur as many times as its occurrenceIndex requires.`
      : `Omitted a ${familyLabel[family]} signal whose anchor "${excerpt(anchorText)}" occurs more than once and carries no occurrenceIndex, so the place it marks is ambiguous.`,
});

/**
 * Replaces the anchored block with the prose before the span, the span itself,
 * and the prose after it. The split is the System Panel technique, reused so a
 * dialogue span never stamps the narration around it.
 */
const splitBlockAtSpan = (
  blocks: CandidateBlock[],
  occurrence: AnchorOccurrence,
  span: (text: string) => CandidateBlock,
): void => {
  const block = blocks[occurrence.blockIndex];
  const before = block.text.slice(0, occurrence.start).trim();
  const after = block.text.slice(occurrence.end).trim();
  blocks.splice(occurrence.blockIndex, 1, ...[
    before ? { text: before } : undefined,
    span(block.text.slice(occurrence.start, occurrence.end)),
    after ? { text: after } : undefined,
  ].filter((candidate): candidate is CandidateBlock => Boolean(candidate)));
};

/** Which occurrence of this exact phrase the chosen span is, inside its own block. */
const occurrenceWithinBlock = (text: string, phrase: string, start: number): number => {
  let index = 0;
  let cursor = text.indexOf(phrase);
  while (cursor >= 0 && cursor < start) { index += 1; cursor = text.indexOf(phrase, cursor + 1); }
  return index;
};

const metadataOf = (block: CandidateBlock) => (block.metadata ??= {});

const speakerRole = (speaker: string, cast: readonly HarnessCastMember[]): string | undefined => {
  const member = cast.find(candidate => candidate.name.trim().toLowerCase() === speaker.trim().toLowerCase());
  if (!member) return undefined;
  return member.isMainCharacter ? 'main_character' : member.role?.trim() || undefined;
};

const defaultMeaning: Record<Exclude<HarnessSystemPanelPresentation, 'fate'>, HarnessSystemPanelMeaning> = {
  narrative: 'neutral', mechanical: 'progression', world_notice: 'quest_update',
};

/**
 * Builds the complete SEN System Panel from a compact signal. Presentation
 * families, status screens, World Notice entries, and Fate results are
 * application structures the provider never returns.
 */
export const buildHarnessSystemPanel = (signal: HarnessSystemPanelSignal): SystemEvent => {
  const entries = signal.entries ?? [];
  const rows = entries.slice(0, 3).map(entry => ({ label: entry.label, value: entry.value }));
  if (signal.presentation === 'fate') {
    const costs = entries.filter(entry => /cost|price|loss|lost|sacrific/i.test(entry.label));
    return {
      kind: 'fate_system_prompt', title: signal.title, promptType: signal.meaning ?? 'fate_event',
      ...(rows.length ? { rows } : {}),
      fateResult: {
        outcome: signal.outcome!,
        timelineScar: signal.body ?? signal.title,
        permanentCosts: (costs.length ? costs : entries).map(entry => `${entry.label}: ${entry.value}`),
      },
    };
  }
  const promptType = signal.meaning ?? defaultMeaning[signal.presentation];
  if (signal.presentation === 'mechanical') {
    return {
      kind: 'system_prompt', presentation: 'mechanical', promptType, title: signal.title,
      ...(signal.body ? { flavor: signal.body } : {}), ...(rows.length ? { rows } : {}),
      status: { stats: entries.map(entry => ({ label: entry.label, value: entry.value })) },
    };
  }
  if (signal.presentation === 'world_notice') {
    return {
      kind: 'system_prompt', presentation: 'world_notice', promptType, title: signal.title,
      worldNotice: { entries: [{ title: signal.title, ...(signal.body ? { body: signal.body } : {}), ...(entries.length ? { details: entries } : {}) }] },
    };
  }
  return {
    kind: 'system_prompt', presentation: 'narrative', promptType, title: signal.title,
    ...(signal.body ? { flavor: signal.body } : {}), ...(rows.length ? { rows } : {}),
  };
};

export interface HarnessSignalApplication {
  /** Untrusted candidate blocks for the canonical SEN normalizer. */
  blocks: Array<Record<string, unknown>>;
  warnings: HarnessWarning[];
}

/**
 * Matches accepted signals to exact prose anchors and converts them into the
 * detailed SEN block structures.
 *
 * Order matters. The two span families run first and split their paragraph at
 * the exact anchored text — a System Panel so its readable text becomes the
 * card, a dialogue span so the narration around it stays narration. Block-level
 * families then annotate the final blocks, and Sound Cues resolve last against
 * the exact span they fire on. Nothing ever rewrites prose: a signal that
 * cannot be placed is dropped with a warning and its text stays where it was.
 */
export const applyHarnessChapterSignals = (
  paragraphs: readonly string[],
  signals: HarnessChapterSignals,
  cast: readonly HarnessCastMember[] = [],
): HarnessSignalApplication => {
  const warnings: HarnessWarning[] = [];
  const blocks: CandidateBlock[] = paragraphs.map(text => ({ text }));

  for (const signal of signals.systemPanels) {
    const anchor = resolveAnchor(blocks, signal, true);
    if (!anchor.ok) { warnings.push(anchorWarning('systemPanels', signal.anchorText, anchor.reason)); continue; }
    if (blocks[anchor.occurrence.blockIndex].system) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `Omitted a second System Panel anchored on "${excerpt(signal.anchorText)}"; a block carries one panel.` });
      continue;
    }
    splitBlockAtSpan(blocks, anchor.occurrence, text => ({ text, system: buildHarnessSystemPanel(signal) }));
  }

  // Dialogue metadata belongs to the spoken words alone. The anchored span
  // becomes its own dialogue block, so several speakers can share one original
  // paragraph and the narration between them is never attributed to anyone.
  for (const signal of signals.dialogue) {
    const anchor = resolveAnchor(blocks, signal, true);
    if (!anchor.ok) { warnings.push(anchorWarning('dialogue', signal.anchorText, anchor.reason)); continue; }
    const block = blocks[anchor.occurrence.blockIndex];
    if (block.system || block.type === 'dialogue') {
      warnings.push({
        code: 'optional_chapter_structure_omitted',
        message: block.system
          ? `Omitted a dialogue signal anchored on "${excerpt(signal.anchorText)}"; that passage is a System Panel.`
          : `Omitted a dialogue signal anchored on "${excerpt(signal.anchorText)}"; that passage is already attributed to a speaker.`,
      });
      continue;
    }
    const role = speakerRole(signal.speaker, cast);
    splitBlockAtSpan(blocks, anchor.occurrence, text => ({
      text,
      type: 'dialogue',
      metadata: {
        mode: 'dialogue', speakerName: signal.speaker,
        ...(role ? { speakerRole: role } : {}),
        ...(signal.delivery ? { emotion: signal.delivery } : {}),
      },
    }));
  }

  for (const signal of signals.manifestations) {
    const anchor = resolveAnchor(blocks, signal, false);
    if (!anchor.ok) { warnings.push(anchorWarning('manifestations', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.occurrence.blockIndex]);
    metadata.entities = [...(metadata.entities ?? []).filter(entity => entity.name !== signal.name || entity.type !== signal.type),
      { name: signal.name, type: signal.type, mention: signal.mention }];
  }

  for (const signal of signals.creatureEvents) {
    const anchor = resolveAnchor(blocks, signal, false);
    if (!anchor.ok) { warnings.push(anchorWarning('creatureEvents', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.occurrence.blockIndex]);
    if (metadata.beastEvent) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `Omitted a second creature event anchored on "${excerpt(signal.anchorText)}"; a block carries one.` });
      continue;
    }
    const { anchorText: _anchor, occurrenceIndex: _occurrence, type, name, ...profile } = signal;
    metadata.beastEvent = { type, profile };
    if (name && !metadata.entities?.some(entity => entity.name === name && entity.type === 'creature')) {
      metadata.entities = [...(metadata.entities ?? []), { name, type: 'creature', mention: type === 'reveal' ? 'reveal' : 'reference' }];
    }
  }

  for (const signal of signals.soundscapes) {
    const anchor = resolveAnchor(blocks, signal, false);
    if (!anchor.ok) { warnings.push(anchorWarning('soundscapes', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.occurrence.blockIndex]);
    if (metadata.music) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `Omitted a second soundscape anchored on "${excerpt(signal.anchorText)}"; a block carries one.` });
      continue;
    }
    metadata.music = { mood: signal.mood, ...(signal.region ? { region: signal.region } : {}), ...(signal.intensity === undefined ? {} : { intensity: signal.intensity }) };
    const category = signal.tags?.find(tag => (HARNESS_ATMOSPHERE_CATEGORIES as readonly string[]).includes(tag.toLowerCase()));
    if (category) metadata.atmosphereCategory = category.toLowerCase() as StoryBlockMetadata['atmosphereCategory'];
    if (signal.tags?.length) metadata.atmosphereTags = [...new Set([...(metadata.atmosphereTags ?? []), ...signal.tags])];
  }

  for (const signal of signals.soundCues) {
    const anchor = resolveAnchor(blocks, signal, true);
    if (!anchor.ok) { warnings.push(anchorWarning('soundCues', signal.anchorText, anchor.reason)); continue; }
    const block = blocks[anchor.occurrence.blockIndex];
    // The cue fires at this exact prose span. The trigger phrase is the prose
    // itself, never the model's anchor spelling, and the occurrence is the one
    // the resolver will find at the same place inside this block.
    const triggerPhrase = block.text.slice(anchor.occurrence.start, anchor.occurrence.end);
    const metadata = metadataOf(block);
    metadata.audioMoments = [...(metadata.audioMoments ?? []), {
      triggerPhrase,
      occurrenceIndex: occurrenceWithinBlock(block.text, triggerPhrase, anchor.occurrence.start),
      sourceCategory: signal.category, variation: signal.variation,
      semanticTags: signal.tags ?? [],
      ...(signal.entityName ? { relatedEntity: { name: signal.entityName, ...(signal.entityType ? { type: signal.entityType } : {}) } } : {}),
    }];
  }

  return {
    blocks: blocks.map(block => ({
      type: block.type ?? 'paragraph', text: block.text,
      ...(block.metadata ? { metadata: block.metadata } : {}), ...(block.system ? { system: block.system } : {}),
    })),
    warnings,
  };
};
