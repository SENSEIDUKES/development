import { useEffect, useMemo, useState } from 'react';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { HarnessGenerationWorkspace as HarnessGenerationSurface } from '@seihouse/library/generation';
import { HarnessGenerationHttpClient } from '../../../host/generation/httpClient';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { useModelPreference } from '../../../host/generation/modelPreference';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { mediaPackKey, type MediaPackEntitlement, type MediaPackReference } from '@seihouse/library/media';
import { HarnessGenerationReference } from '../../../components/harness-generation/reference/HarnessGenerationReference';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createWorkshopStorySeedSource } from './storySeedHandoff';
import { WORKSHOP_HARNESS_SKILLS } from './skillCatalog';
import { SppSkillImport } from './SppSkillImport';
import { loadHarnessSppSkills, saveHarnessSppSkill } from './sppSkills';
import { installOfficialCapaSkills } from './officialCapaSkills';
import { WORKSHOP_MEDIA_PACKS } from './mediaPackFixtures';

const storySeedSource = createWorkshopStorySeedSource();

export function HarnessGenerationWorkspace() {
  const [repository] = useState(() => new IndexedDbHarnessGenerationRepository());
  const [modelAdapter] = useState(() => new HarnessGenerationHttpClient());
  const [chapterModel, setChapterModel] = useModelPreference('chapters');
  const [saved] = useState(() => {
    try { return { skills: loadHarnessSppSkills(localStorage), error: '' }; }
    catch { return { skills: [] as HarnessSkillManifest[], error: 'Saved SPP skills could not be loaded. Reimport the packages to restore their skills.' }; }
  });
  const [importedSkills, setImportedSkills] = useState(saved.skills);
  const [officialInventoryReady, setOfficialInventoryReady] = useState(false);
  const [officialInstallAttempt, setOfficialInstallAttempt] = useState(0);
  const [mediaPackEntitlements, setMediaPackEntitlements] = useState<MediaPackEntitlement[]>([]);
  const [storageError, setStorageError] = useState(saved.error);
  const installedSkills = useMemo(() => [...WORKSHOP_HARNESS_SKILLS, ...importedSkills], [importedSkills]);
  const entry = workshopEntries.find(item => item.id === 'harness-generation')!;
  useEffect(() => {
    let active = true;
    setOfficialInventoryReady(false);
    setStorageError('');
    void installOfficialCapaSkills(localStorage).then(({ installed }) => {
      if (!active) return;
      setImportedSkills(installed);
      setStorageError('');
      setOfficialInventoryReady(true);
    }).catch(error => {
      if (!active) return;
      setStorageError(error instanceof Error
        ? `Official CAPA defaults could not be installed: ${error.message}`
        : 'Official CAPA defaults could not be installed.');
      setOfficialInventoryReady(true);
    });
    return () => { active = false; };
  }, [officialInstallAttempt]);
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
      renderDevelopment={() => !officialInventoryReady
        ? <p role="status">Validating official CAPA defaults…</p>
        : storageError.startsWith('Official CAPA defaults could not be installed')
          ? <div>
              <p role="alert">{storageError}</p>
              <button type="button" onClick={() => setOfficialInstallAttempt(attempt => attempt + 1)}>
                Retry official CAPA installation
              </button>
            </div>
          : <HarnessGenerationSurface repository={repository} modelAdapter={modelAdapter} storySeedSource={storySeedSource} installedSkills={installedSkills}
        registeredMediaPacks={WORKSHOP_MEDIA_PACKS} mediaPackEntitlements={mediaPackEntitlements}
        baseMedia={LIBRARY_BASE_MEDIA}
        preferredModel={chapterModel} onModelChange={setChapterModel}
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
