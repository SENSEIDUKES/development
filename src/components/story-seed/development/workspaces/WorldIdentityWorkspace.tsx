import { Landmark, MapPin, Sparkles, ShieldAlert } from 'lucide-react';
import { LibraryWorldIdentityIcon as SENWorldIdentityIcon } from '@seihouse/library-ui';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchWorldIdentity, worldIdentity, patchWorldFoundations, worldFoundations, setMakeItWorkInstruction, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { WorkspaceShell } from './WorkspaceShell';

interface WorldIdentityWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** Optional World workspace (`world.optional.worldIdentity`). */
export const WorldIdentityWorkspace = ({ seed, updateSeed }: WorldIdentityWorkspaceProps) => {
  const section = getSeedSection('world-identity');
  const identity = worldIdentity(seed);

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LibraryTextBox
          id="world-type-input"
          label="World Type"
          icon={SENWorldIdentityIcon}
          value={identity.worldType || ''}
          onChange={(val) => updateSeed(patchWorldIdentity({ worldType: val }))}
          placeholder="e.g., Ancient sect world, tower system..."
        />
        <LibraryTextBox
          id="society-structure-input"
          label="World Order"
          icon={Landmark}
          value={identity.societyStructure || ''}
          onChange={(val) => updateSeed(patchWorldIdentity({ societyStructure: val }))}
          placeholder="e.g., Sect-led, feudal, corporate..."
        />
      </div>

      <LibraryTextArea
        id="starting-location-input"
        label="Opening Location"
        icon={MapPin}
        maxLength={1200}
        helpText="Describe the geography, climate, and immediate atmosphere of the starting zone (e.g. outer sect labor quarry, freezing mortal mountain village)."
        value={identity.startingLocation || ''}
        onChange={(val) => updateSeed(patchWorldIdentity({ startingLocation: val }))}
        rows={3}
        placeholder="e.g., A sprawling outer sect labor quarry built inside a cavernous volcanic rift. The air is heavy with sulfur, and molten ore glows in the deep trenches..."
      />
      <LibraryTextArea id="make-it-work-instruction-input" label="Make It Work" icon={Sparkles} maxLength={1500}
        helpText="Use this for strange, difficult, contradictory, or highly specific ideas the Library must preserve and make believable inside the story."
        value={seed.story.optional.makeItWorkInstruction || ''} onChange={value => updateSeed(setMakeItWorkInstruction(value))} rows={5} />
      <LibraryTextBox id="main-opposition-input" label="Main Opposition" icon={ShieldAlert}
        helpText="Who or what pushes back against the main character the hardest."
        value={worldFoundations(seed).mainOpposition || ''} onChange={value => updateSeed(patchWorldFoundations({ mainOpposition: value }))} />
    </WorkspaceShell>
  );
};
