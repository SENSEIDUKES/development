import { Route } from 'lucide-react';
import { SENAbilityIcon } from '../../../sen-icons';
import type { StorySeedInput } from '../../shared/storySeedSchema';
import { getSeedSection } from '../seedSections';
import { patchAbilities, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '../../../../presentation';
import { GuidanceNote, WorkspaceShell } from './WorkspaceShell';

interface AbilitiesWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** Optional World workspace (`world.optional.worldFoundations.abilities`). */
export const AbilitiesWorkspace = ({ seed, updateSeed }: AbilitiesWorkspaceProps) => {
  const section = getSeedSection('abilities');
  const abilities = worldFoundations(seed).abilities || {};

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <div className="grid grid-cols-1 gap-4">
        <LibraryTextBox
          id="a11y-control-itgsjgw"
          label="Starting Ability"
          icon={SENAbilityIcon}
          value={abilities.startingPowerConcept || ''}
          onChange={(val) => updateSeed(patchAbilities({ startingPowerConcept: val }))}
          placeholder="e.g., Qi Condensation Tier 1, Feng Shui Level 1..."
        />
        <LibraryTextArea
          id="unique-path-input"
          label="Unique Growth Path"
          icon={Route}
          maxLength={1200}
          helpText="What makes the main character's way of growing power unlike anyone else's — a forbidden method, a twisted bloodline, a borrowed system."
          value={abilities.uniquePath || ''}
          onChange={(val) => updateSeed(patchAbilities({ uniquePath: val }))}
          rows={2}
          placeholder="e.g., Cultivates by severing other people's fates instead of gathering qi..."
        />
      </div>

      <GuidanceNote title="Abilities vs. Power System" tone="world">
        Abilities belong to the main character — what they start with and what sets them apart.
        The Power System section belongs to the world — the ladder everyone climbs.
      </GuidanceNote>
    </WorkspaceShell>
  );
};
