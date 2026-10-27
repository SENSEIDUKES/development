import { useMemo } from 'react';
import type { ChapterWritingStyle, SenLanguageCode } from '@seihouse/sen/contracts';
import type { HarnessSkillManifest, HarnessSkillReference, HarnessSkillSlotId, HarnessStoryMode } from '@seihouse/sen/harness-generation';
import type { LibraryStories } from '../useLibraryStories';
import { MediaLoadoutPanel } from './MediaLoadoutPanel';
import { SoundWordsPanel } from './SoundWordsPanel';
import { SkillPackageImport } from './SkillPackageImport';
import { StorySkillSlots } from './StorySkillSlots';
import { applyStorySettingsDraft, createSoundWords, type StorySettingsDraft } from './storySettingsDraft';
import type { StorySettingsValues } from './storySettingsValues';

export interface CreateStorySettingsProps {
  stories: Pick<LibraryStories, 'controller' | 'skills' | 'mediaPacks' | 'mediaPackEntitlements' | 'soundWordPresets' | 'importSoundWords'
    | 'mediaDefaults' | 'importMediaPack' | 'skillIntake' | 'installSkill'>;
  /** The skills the story starts with unless the reader changes them (the host's defaults for its Story Seed). */
  defaults: Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;
  /** The Story Seed's own settings, which fill the managed slots. */
  originalLanguage: SenLanguageCode;
  chapterWritingStyle?: ChapterWritingStyle;
  fateMode: HarnessStoryMode;
  draft: StorySettingsDraft;
  onDraftChange: (draft: StorySettingsDraft) => void;
}

/**
 * Story Settings in Create: the CAPA skill slots, Media Loadout and Sound
 * Words the story will start with, beside the Story Seed's language and
 * Reading Mode. What the reader changes is a draft the host keeps until
 * Manifest applies it; unchanged, the story starts with the first preset's
 * sound words.
 */
export function CreateStorySettings({ stories, defaults, originalLanguage, chapterWritingStyle, fateMode, draft, onDraftChange }: CreateStorySettingsProps) {
  const values: StorySettingsValues = {
    originalLanguage,
    ...(chapterWritingStyle ? { chapterWritingStyle } : {}),
    skillLoadout: applyStorySettingsDraft(defaults, draft, stories.skills),
    ...(draft.media ? { mediaLoadout: draft.media } : {}),
  };
  const soundWords = useMemo(() => createSoundWords(draft, stories.soundWordPresets), [draft, stories.soundWordPresets]);
  const { sounds, soundtrack, answered } = useMemo(() => stories.controller.describeMediaSelection(draft.media, soundWords), [stories.controller, draft.media, soundWords]);
  return <div className="space-y-3" data-testid="create-story-settings">
    <StorySkillSlots stacked story={values} fateMode={fateMode} installedSkills={stories.skills}
      busy={false}
      onChange={(slot, reference) => onDraftChange({ ...draft, skills: { ...draft.skills, [slot]: reference ?? null } })}
      {...(stories.skillIntake && stories.installSkill ? {
        renderSlotSkillImport: (slot: HarnessSkillSlotId, slotBusy: boolean, equip: (skill: HarnessSkillManifest) => Promise<void>) =>
          <SkillPackageImport intake={stories.skillIntake!} busy={slotBusy} destinationSlot={slot} onInstall={equip} />,
        onInstalled: async (slot: HarnessSkillSlotId, skill: HarnessSkillManifest) => {
          stories.installSkill!(skill);
          onDraftChange({ ...draft, skills: { ...draft.skills, [slot]: { id: skill.id, version: skill.version } } });
        },
      } : {})} />
    <MediaLoadoutPanel stacked story={values} packs={stories.mediaPacks} entitlements={stories.mediaPackEntitlements} busy={false}
      defaults={stories.mediaDefaults} onImport={stories.importMediaPack}
      onChange={(slot, reference) => {
        const { [slot]: _previous, ...rest } = draft.media ?? {};
        const media = reference ? { ...rest, [slot]: reference } : rest;
        const { media: _media, ...without } = draft;
        onDraftChange(Object.keys(media).length ? { ...without, media } : without);
      }} />
    <SoundWordsPanel words={soundWords ?? sounds.map(sound => sound.word)} answered={answered} presets={stories.soundWordPresets} busy={false}
      onChange={words => onDraftChange({ ...draft, soundWords: words })} onImport={stories.importSoundWords} />
  </div>;
}

