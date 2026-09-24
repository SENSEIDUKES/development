import { memo, type Dispatch, type SetStateAction } from 'react';
import { GitBranch, HelpCircle, Shield } from 'lucide-react';
import { LibraryCharactersIcon as SENCharactersIcon } from '@seihouse/library-ui';
import { type StorySeedInput, type WorldBlueprint } from '@seihouse/sen/story-seed';
import { type UpdateSeed } from '../seedState';
import { AdditionalCharactersEditor } from '../workspaces/CharactersWorkspace';
import { FactionsEditor } from '../workspaces/FactionsWorkspace';
import { NarrativePanel as LibraryPanel, NarrativeTextArea as LibraryTextArea } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading, EditableChip } from './BlueprintDossierPrimitives';

interface BlueprintCollectionSectionsProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  survivalEnabled: boolean;
  majorMysteries?: WorldBlueprint['majorMysteries'];
  unresolvedPlotThreads?: WorldBlueprint['unresolvedPlotThreads'];
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
}

/** Side characters and factions are the Seed's own lists; mysteries and threads stay Blueprint proposals. */
export const BlueprintCollectionSections = memo(({
  seed,
  updateSeed,
  survivalEnabled,
  majorMysteries,
  unresolvedPlotThreads,
  setBlueprint,
}: BlueprintCollectionSectionsProps) => (
  <>
    <LibraryPanel as="section" aria-labelledby="blueprint-side-characters-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-side-characters-heading"
        icon={SENCharactersIcon}
        title="Side Characters"
        tagline="Cast members the story can draw on. Edits save to the Story Seed."
      />

      <div className="mt-5 space-y-4">
        <AdditionalCharactersEditor seed={seed} updateSeed={updateSeed} />
      </div>
    </LibraryPanel>

    <LibraryPanel as="section" aria-labelledby="blueprint-factions-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-factions-heading"
        icon={Shield}
        title="Factions"
        tagline="Sects, guilds, and powers that already shape the world. Edits save to the Story Seed."
      />

      <div className="mt-5 space-y-4">
        <FactionsEditor seed={seed} updateSeed={updateSeed} />
      </div>
    </LibraryPanel>

    <LibraryPanel as="section" aria-labelledby="blueprint-mysteries-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-mysteries-heading"
        icon={HelpCircle}
        title="Fate Survival"
        tagline={survivalEnabled
          ? 'Survival is on. These mysteries and unresolved threads enter generation as Fate Survival context, never character knowledge.'
          : 'Survival is off. Saved mysteries and unresolved threads are retained here and excluded from chapter generation.'}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <LibraryTextArea
          id="blueprint-major-mysteries"
          label="Major Mysteries (One per line)"
          rightElement={<EditableChip />}
          icon={HelpCircle}
          value={majorMysteries?.join('\n') || ''}
          onChange={value => setBlueprint(current => ({ ...current, majorMysteries: value.split('\n') }))}
          rows={6}
          className="font-mono"
          placeholder="True origin of the Sovereign Ring&#10;Why was the Sect Leader poisoned?"
        />
        <LibraryTextArea
          id="blueprint-unresolved-threads"
          label="Unresolved Plot Threads (One per line)"
          rightElement={<EditableChip />}
          icon={GitBranch}
          value={unresolvedPlotThreads?.join('\n') || ''}
          onChange={value => setBlueprint(current => ({ ...current, unresolvedPlotThreads: value.split('\n') }))}
          rows={6}
          className="font-mono"
          placeholder="Sever the engagement with Chu family&#10;Win the Inner Sect tournament"
        />
      </div>
    </LibraryPanel>
  </>
));

BlueprintCollectionSections.displayName = 'BlueprintCollectionSections';
