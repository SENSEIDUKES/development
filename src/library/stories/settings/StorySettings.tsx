import { useMemo, useState } from 'react';
import type { SoundWord, SoundtrackVocabulary } from '@seihouse/sen/audio';
import type { ChapterWritingStyle } from '@seihouse/sen/contracts';
import {
  activeAttemptForStory, findFoundationRevision, findStory, harnessStoryMode,
  type HarnessSkillReference, type HarnessSkillSlotId,
} from '@seihouse/sen/harness-generation';
import type { MediaPackReference, StoryMediaLoadoutSlot } from '../../media/mediaPacks';
import type { LibraryStories } from '../useLibraryStories';
import { MediaLoadoutPanel } from './MediaLoadoutPanel';
import { AuthorNotesPanel } from './AuthorNotesPanel';
import { StorySettingsPanel } from './StorySettingsPanel';
import { StorySkillSlots } from './StorySkillSlots';

const NO_SOUNDTRACK: SoundtrackVocabulary = { moods: [], atmospheres: [] };

/**
 * Story Settings, inside World Info's Settings card: the only place a reader
 * meets the HARNESS. The story's language and Reading Mode, its CAPA skill
 * slots, its Media Loadout and its Author's notes; the card keeps them closed
 * until the reader opens it. A change applies to chapters
 * written from then on; while a chapter is being written they wait, and say so.
 */
export function StorySettings({ stories, storyId }: { stories: LibraryStories; storyId: string }) {
  const { state, controller } = stories;
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string>();
  const story = state ? findStory(state, storyId) : undefined;
  const writing = Boolean(state && activeAttemptForStory(state, storyId));
  const fateMode = harnessStoryMode(state && story ? findFoundationRevision(state, story.activeFoundationRevisionId)?.input : undefined);
  // What the next chapter would use, as loadout freezing reads it.
  const soundWords = useMemo<SoundWord[]>(() => {
    if (!story) return [];
    try { return controller.describeSoundVocabulary(story.id); } catch { return []; }
  }, [controller, story]);
  const soundtrackWords = useMemo<SoundtrackVocabulary>(() => {
    if (!story) return NO_SOUNDTRACK;
    try { return controller.describeSoundtrackVocabulary(story.id); } catch { return NO_SOUNDTRACK; }
  }, [controller, story]);
  if (!story) return null;

  const change = (save: () => Promise<unknown>) => {
    setSaving(true);
    setProblem(undefined);
    void save().catch(error => setProblem(error instanceof Error ? error.message : 'This setting could not be saved.'))
      .finally(() => setSaving(false));
  };
  const busy = saving || writing;

  return <section className="space-y-4" data-testid="story-view-settings" aria-label="Story Settings">
      {writing && <p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.06] p-3 text-sm text-cyan-50/85" data-testid="story-settings-writing">
        A chapter is being written. Settings can change again once it is finished.
      </p>}
      {problem && <p role="alert" className="rounded-xl border border-human/30 bg-human-brand/10 p-3 text-sm text-human">{problem}</p>}
      <StorySettingsPanel title="Language and Reading Mode" story={story} installedSkills={stories.skills} busy={busy}
        onReadingModeChange={(mode: ChapterWritingStyle) => change(() => controller.setChapterWritingStyle(story.id, mode))} />
      <StorySkillSlots story={story} fateMode={fateMode} installedSkills={stories.skills}
        soundWords={soundWords} soundtrackWords={soundtrackWords} busy={busy}
        onChange={(slot: HarnessSkillSlotId, reference?: HarnessSkillReference) => change(() => controller.setSkillSlot(story.id, slot, reference))} />
      <MediaLoadoutPanel story={story} packs={stories.mediaPacks} entitlements={stories.mediaPackEntitlements}
        soundWords={soundWords} busy={busy}
        onChange={(slot: StoryMediaLoadoutSlot, reference?: MediaPackReference) => change(() => controller.setMediaSelection(story.id, slot, reference))} />
      <AuthorNotesPanel story={story} busy={busy}
        onSave={notes => change(() => controller.setAuthorNotes(story.id, notes))} />
  </section>;
}
