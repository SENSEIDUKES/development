import { HarnessGenerationWorkspace as HarnessGenerationSurface } from '@seihouse/sen/harness-generation';
import { HarnessGenerationReference } from '../../../components/harness-generation/reference/HarnessGenerationReference';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createWorkshopStorySeedSource } from './storySeedHandoff';
import { WORKSHOP_HARNESS_SKILLS } from './skillCatalog';

const storySeedSource = createWorkshopStorySeedSource();

export function HarnessGenerationWorkspace() {
  const entry = workshopEntries.find(item => item.id === 'harness-generation')!;
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      renderReference={() => <HarnessGenerationReference />}
      renderDevelopment={() => <HarnessGenerationSurface storySeedSource={storySeedSource} installedSkills={WORKSHOP_HARNESS_SKILLS} />}
    />
  );
}

export default HarnessGenerationWorkspace;
