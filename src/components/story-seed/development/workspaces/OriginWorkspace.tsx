import { useCallback, useMemo } from 'react';
import { SENStoryIcon } from '../../../sen-icons';
import type { StorySeedInput } from '../../shared/storySeedSchema';
import { normalizeStoryStyle } from '../../shared/storyStyle';
import { getSeedSection } from '../seedSections';
import {
  patchStoryRequired,
  patchWorldIdentity,
  storyRequired,
  worldIdentity,
  type UpdateSeed,
} from '../seedState';
import { NarrativeTextBox as LibraryTextBox } from '../../../../presentation';
import { WorkspaceShell } from './WorkspaceShell';
import { OriginGenrePicker } from './origin/OriginGenrePicker';
import { OriginPremiseAndTags } from './origin/OriginPremiseAndTags';
import { OriginStyleSelector } from './origin/OriginStyleSelector';

interface OriginWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

const ORIGIN_SECTION = getSeedSection('origin');

/** Keeps all four Story essentials in one mobile-first creation flow. */
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
      label="Story Title"
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
      {titleField}

      {styleSelector}

      <OriginPremiseAndTags
        premise={premise}
        genre={genre}
        storyTags={storyTags}
        selectedStyle={selectedStyle}
        onPremiseChange={updatePremise}
        updateSeed={updateSeed}
        genrePicker={genrePicker}
      />
    </WorkspaceShell>
  );
};
