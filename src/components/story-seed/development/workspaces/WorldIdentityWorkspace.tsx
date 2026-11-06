import { Sparkles, ShieldAlert } from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchWorldFoundations, worldFoundations, setMakeItWorkInstruction, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { SeedSectionFrame } from './SeedSectionFrame';

interface WorldIdentityWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/**
 * Optional World workspace: Make It Work and the main opposition. What kind of
 * world it is and who rules it are on the World card (Power System workspace),
 * and where the story opens is its first Place (SENSEI, 2026-11-06).
 */
export const WorldIdentityWorkspace = ({ seed, updateSeed }: WorldIdentityWorkspaceProps) => {
  const section = getSeedSection('world-identity');

  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <LibraryTextArea id="make-it-work-instruction-input" label="Make It Work" icon={Sparkles} maxLength={1500}
        helpText="Use this for strange, difficult, contradictory, or highly specific ideas the Library must preserve and make believable inside the story."
        value={seed.story.optional.makeItWorkInstruction || ''} onChange={value => updateSeed(setMakeItWorkInstruction(value))} rows={5} />
      <LibraryTextBox id="main-opposition-input" label="Main Opposition" icon={ShieldAlert}
        helpText="Who or what pushes back against the main character the hardest."
        value={worldFoundations(seed).mainOpposition || ''} onChange={value => updateSeed(patchWorldFoundations({ mainOpposition: value }))} />
    </SeedSectionFrame>
  );
};
