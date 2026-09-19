import { useMemo, useState } from 'react';
import { HarnessGenerationWorkspace as HarnessGenerationSurface } from '@seihouse/library/generation';
import { HarnessGenerationHttpClient } from '../../../host/generation/httpClient';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { mediaPackKey, type MediaPackEntitlement, type MediaPackReference } from '@seihouse/library/media';
import { HarnessGenerationReference } from '../../../components/harness-generation/reference/HarnessGenerationReference';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createWorkshopStorySeedSource } from './storySeedHandoff';
import { WORKSHOP_HARNESS_SKILLS } from './skillCatalog';
import { SppSkillImport } from './SppSkillImport';
import { loadHarnessSppSkills, saveHarnessSppSkill } from './sppSkills';
import { WORKSHOP_MEDIA_PACKS } from './mediaPackFixtures';

const storySeedSource = createWorkshopStorySeedSource();

export function HarnessGenerationWorkspace() {
  const [repository] = useState(() => new IndexedDbHarnessGenerationRepository());
  const [modelAdapter] = useState(() => new HarnessGenerationHttpClient());
  const [saved] = useState(() => {
    try { return { skills: loadHarnessSppSkills(localStorage), error: '' }; }
    catch { return { skills: [] as HarnessSkillManifest[], error: 'Saved SPP skills could not be loaded. Reimport the packages to restore their skills.' }; }
  });
  const [importedSkills, setImportedSkills] = useState(saved.skills);
  const [mediaPackEntitlements, setMediaPackEntitlements] = useState<MediaPackEntitlement[]>([]);
  const [storageError, setStorageError] = useState(saved.error);
  const installedSkills = useMemo(() => [...WORKSHOP_HARNESS_SKILLS, ...importedSkills], [importedSkills]);
  const entry = workshopEntries.find(item => item.id === 'harness-generation')!;
  /** The host owns the browser inventory; both import entry points save through it. */
  const install = (skill: HarnessSkillManifest) => {
    setImportedSkills(saveHarnessSppSkill(localStorage, importedSkills, skill));
    setStorageError('');
  };
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      renderReference={() => <HarnessGenerationReference />}
      renderDevelopment={() => <HarnessGenerationSurface repository={repository} modelAdapter={modelAdapter} storySeedSource={storySeedSource} installedSkills={installedSkills}
        registeredMediaPacks={WORKSHOP_MEDIA_PACKS} mediaPackEntitlements={mediaPackEntitlements}
        onGrantDevelopmentMediaReward={(reference: MediaPackReference) => {
          const unlockedAt = new Date();
          const entitlement: MediaPackEntitlement = {
            pack: { id: reference.id, version: reference.version },
            unlockedAt: unlockedAt.toISOString(),
            expiresAt: new Date(unlockedAt.getTime() + 60 * 60 * 1_000).toISOString(),
          };
          setMediaPackEntitlements(current => [
            ...current.filter(item => mediaPackKey(item.pack) !== mediaPackKey(reference)),
            entitlement,
          ]);
        }}
        renderSkillImport={busy => <>
          {storageError && <p role="alert">{storageError}</p>}
          <SppSkillImport busy={busy} onInstall={install} />
        </>}
        renderSlotSkillImport={(slot, busy, equip) => (
          <SppSkillImport busy={busy} destinationSlot={slot} onInstall={async skill => {
            install(skill);
            await equip(skill);
          }} />
        )} />}
    />
  );
}

export default HarnessGenerationWorkspace;
