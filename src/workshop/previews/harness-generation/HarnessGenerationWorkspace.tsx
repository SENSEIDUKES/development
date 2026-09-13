import { useMemo, useState } from 'react';
import { HarnessGenerationWorkspace as HarnessGenerationSurface, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { HarnessGenerationReference } from '../../../components/harness-generation/reference/HarnessGenerationReference';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createWorkshopStorySeedSource } from './storySeedHandoff';
import { WORKSHOP_HARNESS_SKILLS } from './skillCatalog';
import { SppSkillImport } from './SppSkillImport';
import { loadHarnessSppSkills, saveHarnessSppSkill } from './sppSkills';

const storySeedSource = createWorkshopStorySeedSource();

export function HarnessGenerationWorkspace() {
  const [saved] = useState(() => {
    try { return { skills: loadHarnessSppSkills(localStorage), error: '' }; }
    catch { return { skills: [] as HarnessSkillManifest[], error: 'Saved SPP skills could not be loaded. Reimport the packages to restore their skills.' }; }
  });
  const [importedSkills, setImportedSkills] = useState(saved.skills);
  const [storageError, setStorageError] = useState(saved.error);
  const installedSkills = useMemo(() => [...WORKSHOP_HARNESS_SKILLS, ...importedSkills], [importedSkills]);
  const entry = workshopEntries.find(item => item.id === 'harness-generation')!;
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      renderReference={() => <HarnessGenerationReference />}
      renderDevelopment={() => <HarnessGenerationSurface storySeedSource={storySeedSource} installedSkills={installedSkills}
        renderSkillImport={busy => <>
          {storageError && <p role="alert">{storageError}</p>}
          <SppSkillImport busy={busy} onInstall={skill => {
            setImportedSkills(saveHarnessSppSkill(localStorage, importedSkills, skill));
            setStorageError('');
          }} />
        </>} />}
    />
  );
}

export default HarnessGenerationWorkspace;
