import { memo } from 'react';
import { Shield } from 'lucide-react';
import { LibraryCharactersIcon as SENCharactersIcon } from '@seihouse/library-ui';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { type UpdateSeed } from '../seedState';
import { AdditionalCharactersEditor } from '../workspaces/CharactersWorkspace';
import { FactionsEditor } from '../workspaces/FactionsWorkspace';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { BlueprintSectionHeading } from './BlueprintDossierPrimitives';

interface BlueprintCollectionSectionsProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** Side characters and factions: the Seed's own lists, edited from the Blueprint review. */
export const BlueprintCollectionSections = memo(({
  seed,
  updateSeed,
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

  </>
));

BlueprintCollectionSections.displayName = 'BlueprintCollectionSections';
