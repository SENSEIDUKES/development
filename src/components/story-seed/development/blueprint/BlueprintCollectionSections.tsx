import { memo, type Dispatch, type SetStateAction } from 'react';
import { GitBranch, HelpCircle, Shield } from 'lucide-react';
import { SENCharactersIcon } from '../../../sen-icons';
import type { WorldBlueprint } from '../../shared/types';
import { NarrativePanel as LibraryPanel, NarrativeTextArea as LibraryTextArea } from '../../../../presentation';
import { BlueprintSectionHeading, EditableChip } from './BlueprintDossierPrimitives';

interface BlueprintCollectionSectionsProps {
  initialCharacters?: WorldBlueprint['initialCharacters'];
  majorFactions?: WorldBlueprint['majorFactions'];
  majorMysteries?: WorldBlueprint['majorMysteries'];
  unresolvedPlotThreads?: WorldBlueprint['unresolvedPlotThreads'];
  setBlueprint: Dispatch<SetStateAction<WorldBlueprint>>;
}

export const BlueprintCollectionSections = memo(({
  initialCharacters,
  majorFactions,
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
        tagline="Cast members the story can draw on — one per line."
      />

      <div className="mt-5">
        <LibraryTextArea
          id="blueprint-side-characters"
          label="Side Characters (One per line)"
          rightElement={<EditableChip />}
          icon={SENCharactersIcon}
          value={initialCharacters?.join('\n') || ''}
          onChange={value => setBlueprint(current => ({ ...current, initialCharacters: value.split('\n') }))}
          rows={6}
          className="font-mono"
          placeholder="Elder Qin (Protector)&#10;Junior Sister Han (Ally)&#10;Young Master Ye (Rival)"
        />
      </div>
    </LibraryPanel>

    <LibraryPanel as="section" aria-labelledby="blueprint-factions-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-factions-heading"
        icon={Shield}
        title="Factions"
        tagline="Sects, guilds, and powers that already shape the world — one per line."
      />

      <div className="mt-5">
        <LibraryTextArea
          id="blueprint-factions"
          label="Major Factions (One per line)"
          rightElement={<EditableChip />}
          icon={Shield}
          value={majorFactions?.join('\n') || ''}
          onChange={value => setBlueprint(current => ({ ...current, majorFactions: value.split('\n') }))}
          rows={6}
          className="font-mono"
          placeholder="Heavenly Sword Sect&#10;Deep Sea Alliance&#10;Abyssal Cult"
        />
      </div>
    </LibraryPanel>

    <LibraryPanel as="section" aria-labelledby="blueprint-mysteries-heading" padding="md">
      <BlueprintSectionHeading
        id="blueprint-mysteries-heading"
        icon={HelpCircle}
        title="Major Mysteries / Unresolved Plot Threads"
        tagline="Open questions and threads the story promises to resolve."
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
