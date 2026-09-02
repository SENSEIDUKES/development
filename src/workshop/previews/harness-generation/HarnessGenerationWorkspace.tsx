import { HarnessGenerationWorkspace as HarnessGenerationSurface } from '@seihouse/sen/harness-generation';
import { HarnessGenerationReference } from '../../../components/harness-generation/reference/HarnessGenerationReference';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

export function HarnessGenerationWorkspace() {
  const entry = workshopEntries.find(item => item.id === 'harness-generation')!;
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      renderReference={() => <HarnessGenerationReference />}
      renderDevelopment={() => <HarnessGenerationSurface />}
    />
  );
}

export default HarnessGenerationWorkspace;
