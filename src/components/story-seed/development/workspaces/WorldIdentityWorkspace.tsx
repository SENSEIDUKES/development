import { Globe, Landmark, MapPin } from 'lucide-react';
import type { StorySeedInput } from '../../shared/storySeedSchema';
import { getSeedSection } from '../seedSections';
import { patchWorldIdentity, worldIdentity, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '../../../../presentation';
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
          icon={Globe}
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
    </WorkspaceShell>
  );
};
