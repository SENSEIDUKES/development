import { useCallback, useMemo } from 'react';
import { LibraryStoryIcon as SENStoryIcon } from '@seihouse/library-ui';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { normalizeStoryStyle } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import {
  patchStoryRequired,
  patchFateSurvival,
  patchWorldIdentity,
  storyRequired,
  worldIdentity,
  type UpdateSeed,
} from '../seedState';
import { NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { WorkspaceShell } from './WorkspaceShell';
import { OriginGenrePicker } from './origin/OriginGenrePicker';
import { OriginPremiseAndTags } from './origin/OriginPremiseAndTags';
import { OriginFateControls } from './origin/OriginFateControls';
import { OriginStyleSelector } from './origin/OriginStyleSelector';

interface OriginWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

const ORIGIN_SECTION = getSeedSection('origin');

/** One Origin flow over the canonical Story Seed values. */
export const OriginWorkspace = ({ seed, updateSeed }: OriginWorkspaceProps) => {
  const { premise, genre, storyTags, style } = storyRequired(seed);
  const identity = worldIdentity(seed);
  const selectedStyle = normalizeStoryStyle(style);
  const originComplete = ORIGIN_SECTION.isFilled(seed);
  const updateTitle = useCallback(
    (title: string) => updateSeed(patchWorldIdentity({ title })),
    [updateSeed],
  );
  const updateStyle = useCallback(
    (nextStyle: NonNullable<typeof selectedStyle>) => updateSeed(patchStoryRequired({ style: nextStyle })),
    [updateSeed],
  );
  const updatePremise = useCallback(
    (nextPremise: string) => updateSeed(patchStoryRequired({ premise: nextPremise })),
    [updateSeed],
  );
  const updateGenre = useCallback(
    (nextGenre: string) => updateSeed(patchStoryRequired({ genre: nextGenre })),
    [updateSeed],
  );
  const titleField = useMemo(() => (
    <LibraryTextBox
      id="origin-story-title-input"
      label="Title"
      icon={SENStoryIcon}
      helpText="Optional — the Library will generate a title if you leave this blank."
      value={identity.title || ''}
      onChange={updateTitle}
      placeholder="e.g., Ashes of the Ninth Meridian"
    />
  ), [identity.title, updateTitle]);
  const styleSelector = useMemo(() => (
    <OriginStyleSelector selectedStyle={selectedStyle} onSelect={updateStyle} />
  ), [selectedStyle, updateStyle]);
  const genrePicker = useMemo(() => (
    <OriginGenrePicker genre={genre} onChange={updateGenre} />
  ), [genre, updateGenre]);

  return (
    <WorkspaceShell section={ORIGIN_SECTION} complete={originComplete}>
      {styleSelector}

      {genrePicker}

      {titleField}

      <OriginPremiseAndTags
        premise={premise}
        genre={genre}
        storyTags={storyTags}
        selectedStyle={selectedStyle}
        onPremiseChange={updatePremise}
        updateSeed={updateSeed}
        beforeTags={<OriginFateControls
          settings={seed.story.optional.fateSurvival}
          onChange={patch => updateSeed(patchFateSurvival(patch))}
        />}
      />
    </WorkspaceShell>
  );
};
