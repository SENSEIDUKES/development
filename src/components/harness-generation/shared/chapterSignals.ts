import { SOUNDSCAPE_REGIONS, type SoundscapeRegion } from '../../../audio/soundscapes';
import { INLINE_AUDIO_CUE_CATEGORIES, WORLD_CUE_RELATED_ENTITY_TYPES, type InlineAudioCueCategory, type WorldCueRelatedEntityType } from '../../../audio/inlineAudio';
import { STORY_ENTITY_TYPES, type StoryBlockMetadata, type StoryEntityType, type SystemEvent } from '../../chapter-generation/shared/types';
import type { HarnessWarning } from './types';

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

export interface HarnessDialogueSignal { anchorText: string; speaker: string; delivery?: HarnessDialogueDelivery }
export interface HarnessManifestationSignal { anchorText: string; name: string; type: StoryEntityType; mention: 'reveal' | 'reference' }
export interface HarnessSystemPanelSignal {
  anchorText: string;
  presentation: HarnessSystemPanelPresentation;
  title: string;
  meaning?: HarnessSystemPanelMeaning;
  body?: string;
  entries?: Array<{ label: string; value: string }>;
  /** Fate panels only. */
  outcome?: HarnessFateOutcome;
}
export interface HarnessSoundscapeSignal { anchorText: string; mood: string; region?: SoundscapeRegion; tags?: string[]; intensity?: number }
export interface HarnessSoundCueSignal {
  anchorText: string; category: InlineAudioCueCategory; variation: string; tags?: string[];
  entityName?: string; entityType?: WorldCueRelatedEntityType;
}
export interface HarnessCreatureEventSignal {
  anchorText: string; type: (typeof HARNESS_CREATURE_EVENT_TYPES)[number]; name?: string;
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
  prose: string;
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
      (signals[family] as Array<typeof parsed>).push(parsed);
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

/** Paragraph boundaries are the canonical SEN block boundaries. */
export const splitHarnessProseParagraphs = (prose: string): string[] => prose
  .replace(/\r\n?/g, '\n')
  .split(/\n[ \t]*\n+/)
  .map(paragraph => paragraph.trim())
  .filter(Boolean);

export interface HarnessCastMember { name: string; role?: string; isMainCharacter?: boolean }

/** Untrusted candidates: Sound Cue intents receive their block identity from the SEN normalizer. */
interface CandidateBlock {
  text: string;
  type?: 'dialogue';
  metadata?: Omit<StoryBlockMetadata, 'audioMoments'> & { audioMoments?: Array<Record<string, unknown>> };
  system?: SystemEvent;
}

const excerpt = (value: string) => `${value.slice(0, 60)}${value.length > 60 ? '…' : ''}`;

type AnchorResolution = { ok: true; index: number } | { ok: false; reason: 'missing' | 'ambiguous' };

/**
 * An anchor must identify exactly one place in the chapter. A phrase found in
 * more than one block — or, when the signal's position inside its block decides
 * where the effect lands, more than once within that block — is ambiguous, and
 * the HARNESS drops the signal rather than silently annotating the wrong
 * sentence. `positional` is true for the families whose placement is an offset
 * in the prose: a System Panel splits its block at the anchor, and a Sound Cue
 * plays at the anchor's occurrence.
 */
const resolveAnchor = (
  blocks: readonly CandidateBlock[],
  anchorText: string,
  positional: boolean,
): AnchorResolution => {
  const matches: number[] = [];
  blocks.forEach((block, index) => { if (block.text.includes(anchorText)) matches.push(index); });
  if (!matches.length) return { ok: false, reason: 'missing' };
  if (matches.length > 1) return { ok: false, reason: 'ambiguous' };
  const [index] = matches;
  const text = blocks[index].text;
  if (positional && text.indexOf(anchorText) !== text.lastIndexOf(anchorText)) {
    return { ok: false, reason: 'ambiguous' };
  }
  return { ok: true, index };
};

const anchorWarning = (
  family: HarnessSignalFamily,
  anchorText: string,
  reason: 'missing' | 'ambiguous',
): HarnessWarning => ({
  code: 'optional_chapter_structure_omitted',
  message: reason === 'missing'
    ? `Omitted a ${familyLabel[family]} signal whose anchor "${excerpt(anchorText)}" is not in the chapter prose.`
    : `Omitted a ${familyLabel[family]} signal whose anchor "${excerpt(anchorText)}" occurs more than once, so the place it marks is ambiguous.`,
});

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
 * detailed SEN block structures. A System Panel anchor that sits inside a
 * larger paragraph is split into its own block so its readable text becomes
 * the card content; every other signal annotates the block containing it.
 */
export const applyHarnessChapterSignals = (
  paragraphs: readonly string[],
  signals: HarnessChapterSignals,
  cast: readonly HarnessCastMember[] = [],
): HarnessSignalApplication => {
  const warnings: HarnessWarning[] = [];
  const blocks: CandidateBlock[] = paragraphs.map(text => ({ text }));

  for (const signal of signals.systemPanels) {
    const anchor = resolveAnchor(blocks, signal.anchorText, true);
    if (!anchor.ok) { warnings.push(anchorWarning('systemPanels', signal.anchorText, anchor.reason)); continue; }
    const block = blocks[anchor.index];
    if (block.system) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `Omitted a second System Panel anchored on "${excerpt(signal.anchorText)}"; a block carries one panel.` });
      continue;
    }
    const start = block.text.indexOf(signal.anchorText);
    const before = block.text.slice(0, start).trim();
    const after = block.text.slice(start + signal.anchorText.length).trim();
    const panel: CandidateBlock = { text: signal.anchorText, system: buildHarnessSystemPanel(signal) };
    blocks.splice(anchor.index, 1, ...[before ? { text: before } : undefined, panel, after ? { text: after } : undefined]
      .filter((candidate): candidate is CandidateBlock => Boolean(candidate)));
  }

  for (const signal of signals.dialogue) {
    const anchor = resolveAnchor(blocks, signal.anchorText, false);
    if (!anchor.ok) { warnings.push(anchorWarning('dialogue', signal.anchorText, anchor.reason)); continue; }
    const block = blocks[anchor.index];
    if (block.system) continue;
    const metadata = metadataOf(block);
    if (!block.type) {
      block.type = 'dialogue';
      metadata.mode = 'dialogue';
      metadata.speakerName = signal.speaker;
      const role = speakerRole(signal.speaker, cast);
      if (role) metadata.speakerRole = role;
      if (signal.delivery) metadata.emotion = signal.delivery;
    }
  }

  for (const signal of signals.manifestations) {
    const anchor = resolveAnchor(blocks, signal.anchorText, false);
    if (!anchor.ok) { warnings.push(anchorWarning('manifestations', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.index]);
    metadata.entities = [...(metadata.entities ?? []).filter(entity => entity.name !== signal.name || entity.type !== signal.type),
      { name: signal.name, type: signal.type, mention: signal.mention }];
  }

  for (const signal of signals.creatureEvents) {
    const anchor = resolveAnchor(blocks, signal.anchorText, false);
    if (!anchor.ok) { warnings.push(anchorWarning('creatureEvents', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.index]);
    if (metadata.beastEvent) {
      warnings.push({ code: 'optional_chapter_structure_omitted', message: `Omitted a second creature event anchored on "${excerpt(signal.anchorText)}"; a block carries one.` });
      continue;
    }
    const { anchorText: _anchor, type, name, ...profile } = signal;
    metadata.beastEvent = { type, profile };
    if (name && !metadata.entities?.some(entity => entity.name === name && entity.type === 'creature')) {
      metadata.entities = [...(metadata.entities ?? []), { name, type: 'creature', mention: type === 'reveal' ? 'reveal' : 'reference' }];
    }
  }

  for (const signal of signals.soundscapes) {
    const anchor = resolveAnchor(blocks, signal.anchorText, false);
    if (!anchor.ok) { warnings.push(anchorWarning('soundscapes', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.index]);
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
    // The cue plays at this exact phrase, so occurrence 0 is only correct when
    // the anchor occurs exactly once in exactly one block.
    const anchor = resolveAnchor(blocks, signal.anchorText, true);
    if (!anchor.ok) { warnings.push(anchorWarning('soundCues', signal.anchorText, anchor.reason)); continue; }
    const metadata = metadataOf(blocks[anchor.index]);
    metadata.audioMoments = [...(metadata.audioMoments ?? []), {
      triggerPhrase: signal.anchorText, occurrenceIndex: 0, sourceCategory: signal.category, variation: signal.variation,
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
