import { Layers } from 'lucide-react';
import { SENPowerSystemIcon } from '../../../sen-icons';
import type { StorySeedInput } from '../../shared/storySeedSchema';
import { getSeedSection } from '../seedSections';
import { patchPowerSystem, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '../../../../presentation';
import { WorkspaceShell } from './WorkspaceShell';

interface PowerSystemWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** Optional World workspace (`world.optional.worldFoundations.powerSystem`). */
export const PowerSystemWorkspace = ({ seed, updateSeed }: PowerSystemWorkspaceProps) => {
  const section = getSeedSection('power-system');
  const powerSystem = worldFoundations(seed).powerSystem || {};

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <div className="grid grid-cols-1 gap-4">
        <LibraryTextBox
          id="a11y-control-kytc0oh"
          label="Power Style"
          icon={SENPowerSystemIcon}
          value={powerSystem.flavor || ''}
          onChange={(val) => updateSeed(patchPowerSystem({ flavor: val }))}
          placeholder="e.g., Martial arts, Daoist, Demonic, Sword..."
        />
        <LibraryTextArea
          id="a11y-control-6rmg4xp"
          label="Rank Ladder"
          icon={Layers}
          value={powerSystem.knownRanks || ''}
          onChange={(val) => updateSeed(patchPowerSystem({ knownRanks: val }))}
          rows={3}
          placeholder="Optional. If partial, the Library extrapolates a full wuxia/xianxia ladder."
        />
      </div>
    </WorkspaceShell>
  );
};
