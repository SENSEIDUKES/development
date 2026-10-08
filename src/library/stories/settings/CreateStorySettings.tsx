import { useMemo } from 'react';
import type { ChapterWritingStyle, SenLanguageCode } from '@seihouse/sen/contracts';
import type { HarnessSkillReference, HarnessSkillSlotId, HarnessStoryMode } from '@seihouse/sen/harness-generation';
import type { LibraryStories } from '../useLibraryStories';
import { MediaLoadoutPanel } from './MediaLoadoutPanel';
import { StorySkillSlots } from './StorySkillSlots';
import { applyStorySettingsDraft, type StorySettingsDraft } from './storySettingsDraft';
import type { StorySettingsValues } from './storySettingsValues';

export interface CreateStorySettingsProps {
  stories: Pick<LibraryStories, 'controller' | 'skills' | 'mediaPacks' | 'mediaPackEntitlements'>;
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
 * Story Settings in Create: the CAPA skill slots and Media Loadout the story
 * will start with, beside the Story Seed's language and Reading Mode. What the
 * reader changes is a draft the host keeps until Manifest applies it.
 */
export function CreateStorySettings({ stories, defaults, originalLanguage, chapterWritingStyle, fateMode, draft, onDraftChange }: CreateStorySettingsProps) {
  const values: StorySettingsValues = {
    originalLanguage,
    ...(chapterWritingStyle ? { chapterWritingStyle } : {}),
    skillLoadout: applyStorySettingsDraft(defaults, draft, stories.skills),
    ...(draft.media ? { mediaLoadout: draft.media } : {}),
  };
  const { sounds, soundtrack } = useMemo(() => stories.controller.describeMediaSelection(draft.media), [stories.controller, draft.media]);
  return <div className="space-y-3" data-testid="create-story-settings">
    <StorySkillSlots stacked story={values} fateMode={fateMode} installedSkills={stories.skills}
      soundWords={sounds} soundtrackWords={soundtrack} busy={false}
      onChange={(slot, reference) => onDraftChange({ ...draft, skills: { ...draft.skills, [slot]: reference ?? null } })} />
    <MediaLoadoutPanel stacked story={values} packs={stories.mediaPacks} entitlements={stories.mediaPackEntitlements}
      soundWords={sounds} busy={false}
      onChange={(slot, reference) => {
        const { [slot]: _previous, ...rest } = draft.media ?? {};
        const media = reference ? { ...rest, [slot]: reference } : rest;
        const { media: _media, ...without } = draft;
        onDraftChange(Object.keys(media).length ? { ...without, media } : without);
      }} />
  </div>;
}
