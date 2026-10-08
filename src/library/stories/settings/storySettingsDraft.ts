import { useCallback, useState } from 'react';
import type { HarnessSkillReference, HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import type { MediaPackReference, StoryMediaLoadoutSlot } from '../../media/mediaPacks';

/**
 * The Story Settings a reader chose in Create, before the story exists: only
 * what they changed from the story's defaults. A skill slot set to `null` was
 * emptied on purpose. Manifest applies it to the new story, then clears it.
 */
export interface StorySettingsDraft {
  skills?: Partial<Record<HarnessSkillSlotId, HarnessSkillReference | null>>;
  media?: Partial<Record<StoryMediaLoadoutSlot, MediaPackReference>>;
}

/** Where a host's device preferences keep the Create draft. */
export const STORY_SETTINGS_DRAFT_KEY = 'create-story-settings';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const reference = (value: unknown): { id: string; version: string } | undefined =>
  isRecord(value) && typeof value.id === 'string' && value.id && typeof value.version === 'string' && value.version
    ? { id: value.id, version: value.version } : undefined;

/** Reads a saved draft defensively: anything damaged or hand-edited reads as no change. */
export function readStorySettingsDraft(storage: ReaderPreferenceStorage): StorySettingsDraft {
  let parsed: unknown;
  try { parsed = JSON.parse(storage.read(STORY_SETTINGS_DRAFT_KEY) ?? 'null'); } catch { return {}; }
  if (!isRecord(parsed)) return {};
  const draft: StorySettingsDraft = {};
  if (isRecord(parsed.skills)) {
    const skills: NonNullable<StorySettingsDraft['skills']> = {};
    for (const [slot, value] of Object.entries(parsed.skills)) {
      if (value === null) skills[slot as HarnessSkillSlotId] = null;
      else if (reference(value)) skills[slot as HarnessSkillSlotId] = reference(value);
    }
    if (Object.keys(skills).length) draft.skills = skills;
  }
  if (isRecord(parsed.media)) {
    const media: NonNullable<StorySettingsDraft['media']> = {};
    for (const slot of ['soundscapes', 'soundCues'] as const) {
      const value = reference(parsed.media[slot]);
      if (value) media[slot] = value;
    }
    if (Object.keys(media).length) draft.media = media;
  }
  return draft;
}

/** Saves the draft; an empty one is removed. A device that refuses keeps it for the visit. */
export function writeStorySettingsDraft(storage: ReaderPreferenceStorage, draft: StorySettingsDraft): void {
  try {
    if (!draft.skills && !draft.media) storage.remove(STORY_SETTINGS_DRAFT_KEY);
    else storage.write(STORY_SETTINGS_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The visit keeps the draft in memory.
  }
}

/**
 * The skill loadout a new story starts with: its defaults, with the reader's
 * changes on top. Given the installed skills, a chosen skill no longer
 * installed leaves its slot at the default.
 */
export function applyStorySettingsDraft(
  defaults: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>,
  draft: StorySettingsDraft,
  installed?: readonly HarnessSkillReference[],
): Partial<Record<HarnessSkillSlotId, HarnessSkillReference>> {
  const loadout = { ...defaults };
  for (const [slot, value] of Object.entries(draft.skills ?? {}) as [HarnessSkillSlotId, HarnessSkillReference | null][]) {
    if (!value) delete loadout[slot];
    else if (!installed || installed.some(skill => skill.id === value.id && skill.version === value.version)) loadout[slot] = value;
  }
  // Author is never empty: a story needs someone to write it.
  if (!loadout.author && defaults.author) loadout.author = defaults.author;
  return loadout;
}

/** The Create draft, kept on the host's device preferences as it changes. */
export function useStorySettingsDraft(storage: ReaderPreferenceStorage) {
  const [draft, setDraft] = useState<StorySettingsDraft>(() => readStorySettingsDraft(storage));
  const update = useCallback((next: StorySettingsDraft) => {
    setDraft(next);
    writeStorySettingsDraft(storage, next);
  }, [storage]);
  return [draft, update] as const;
}
