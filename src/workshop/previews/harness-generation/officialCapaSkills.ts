import { fingerprint } from 'seihouse-productions-package';
import {
  validateHarnessSkillManifest,
  type HarnessSkillManifest,
  type HarnessSkillReference,
  type HarnessSkillSlotId,
} from '@seihouse/sen/harness-generation';
import type { StoryStyle } from '@seihouse/sen/story-seed';
import authorArchiveUrl from './official-capa/CAPA-AUTHOR.spp?url';
import continuityArchiveUrl from './official-capa/CAPA-Continuity.spp?url';
import pacingArchiveUrl from './official-capa/CAPA-Pacing.spp?url';
import chineseStyleArchiveUrl from './official-capa/CAPA-STYLE-CHINESE.spp?url';
import japaneseStyleArchiveUrl from './official-capa/CAPA-STYLE-JAPANESE.spp?url';
import koreanStyleArchiveUrl from './official-capa/CAPA-STYLE-KOREAN.spp?url';
import {
  createHarnessSppSkill,
  inspectHarnessSpp,
  loadHarnessSppSkills,
  saveHarnessSppSkill,
  SPP_SKILL_STORAGE_KEY,
} from './sppSkills';

const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SHARED_PACKAGE_ID = '9a7ce291-b3e7-4938-bc6d-a9bc688137b5';

export interface OfficialCapaPackageDefinition {
  key: 'author' | 'pacing' | 'continuity' | 'style-chinese' | 'style-japanese' | 'style-korean';
  archiveFile: string;
  archiveUrl: string;
  archiveSha256: string;
  packageId: string;
  packageName: string;
  packageVersion: string;
  slot: HarnessSkillSlotId;
  storyStyle?: StoryStyle;
  instructionSourcePath: string;
  instructionPath: string;
  resources: Array<{ path: string; mediaType: string; sha256: string }>;
}

export const OFFICIAL_CAPA_PACKAGES: readonly OfficialCapaPackageDefinition[] = [
  {
    key: 'author', archiveFile: 'CAPA-AUTHOR.spp', archiveUrl: authorArchiveUrl,
    archiveSha256: 'd1b2bac09eef5f8abc148c17d2771f2b5e234096db2859a8f8ac04952e7f354e',
    packageId: SHARED_PACKAGE_ID, packageName: 'CAPA AUTHOR', packageVersion: '1.0.1', slot: 'author',
    instructionSourcePath: 'assets/1-CAPA - AUTHOR.docx', instructionPath: 'assets/1-CAPA - AUTHOR.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - AUTHOR.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '2d020251bbadec8eeae99f044b9ff9c6c3ed1d47a309e1994fa52e81ad827bb1' },
      { path: 'assets/1-CAPA - AUTHOR.docx.txt', mediaType: 'text/plain', sha256: 'da47c181fb3c6a022fb603779f916a85d2d775d7feb422773de16e56f4b7280a' },
    ],
  },
  {
    key: 'pacing', archiveFile: 'CAPA-Pacing.spp', archiveUrl: pacingArchiveUrl,
    archiveSha256: 'afc389b39aaa16b4dd7411c8fd2f6412b583a708a00ebba476ebd0c6fd2eebc9',
    packageId: SHARED_PACKAGE_ID, packageName: 'CAPA Pacing', packageVersion: '1.0.1', slot: 'pacing',
    instructionSourcePath: 'assets/1-CAPA - PACING.docx', instructionPath: 'assets/1-CAPA - PACING.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - PACING.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '2b1f11fe1fcca88854eef5ba2f30e9579fda027344e8b3ca049a0b4eda22da68' },
      { path: 'assets/1-CAPA - PACING.docx.txt', mediaType: 'text/plain', sha256: '488fc6db5f3ddfacd580e484e6ea7d8bbb67c4fbd9eecb0dada4df836eefca95' },
    ],
  },
  {
    key: 'continuity', archiveFile: 'CAPA-Continuity.spp', archiveUrl: continuityArchiveUrl,
    archiveSha256: '2c5fba7c67a1608f04f19ceb7a441ba3a192d7a153ec864da5617d9caca0f108',
    packageId: SHARED_PACKAGE_ID, packageName: 'CAPA Continuity', packageVersion: '1.0.1', slot: 'continuity',
    instructionSourcePath: 'assets/1-CAPA - CONITINUITY.docx', instructionPath: 'assets/1-CAPA - CONITINUITY.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - CONITINUITY.docx', mediaType: DOCX_MEDIA_TYPE, sha256: 'a3a28c1687a2687c57c1183c55ffcbc3b0474872ff2a9917036265b46dbd26a3' },
      { path: 'assets/1-CAPA - CONITINUITY.docx.txt', mediaType: 'text/plain', sha256: '6e3d06a92be5f4694aaed5c4f4c3f74eb8689a182807362c3726969fc4c845a2' },
    ],
  },
  {
    key: 'style-chinese', archiveFile: 'CAPA-STYLE-CHINESE.spp', archiveUrl: chineseStyleArchiveUrl,
    archiveSha256: 'fca99db4dd1db6c5313757bbc009e3764cdabbd94fc860574ec3f1c473a8a919',
    packageId: SHARED_PACKAGE_ID, packageName: 'STYLE - CHINESE', packageVersion: '1.0.0', slot: 'style', storyStyle: 'chinese',
    instructionSourcePath: 'assets/1-1-CAPA - STYLE CHINESE.docx', instructionPath: 'assets/1-1-CAPA - STYLE CHINESE.docx.txt',
    resources: [
      { path: 'assets/1-1-CAPA - STYLE CHINESE.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '9382f8b6918607dcf6536667b1101e7f0eebe12a4e4c67193f79fea438b9af34' },
      { path: 'assets/1-1-CAPA - STYLE CHINESE.docx.txt', mediaType: 'text/plain', sha256: '869a1f921429c1dcc1fea732f9e79fe4e9ef3905327ddf06413cf4081ac94a7b' },
    ],
  },
  {
    key: 'style-japanese', archiveFile: 'CAPA-STYLE-JAPANESE.spp', archiveUrl: japaneseStyleArchiveUrl,
    archiveSha256: 'd9016e4da0ef4138b54627b37b6acc9e923b92ceaded11137440543ab62dcdf3',
    packageId: SHARED_PACKAGE_ID, packageName: 'STYLE - JAPANESE', packageVersion: '1.0.0', slot: 'style', storyStyle: 'japanese',
    instructionSourcePath: 'assets/1-CAPA - STYLE JAPANESE.docx', instructionPath: 'assets/1-CAPA - STYLE JAPANESE.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - STYLE JAPANESE.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '9b490776db6c154830dd715aa3a7afff4ba055da617850f49303068712a46cc1' },
      { path: 'assets/1-CAPA - STYLE JAPANESE.docx.txt', mediaType: 'text/plain', sha256: '1c72cf2017c4759c73a79498d180bcc7cffa3ed1d051a8db37521acbc45b2932' },
    ],
  },
  {
    key: 'style-korean', archiveFile: 'CAPA-STYLE-KOREAN.spp', archiveUrl: koreanStyleArchiveUrl,
    archiveSha256: '5956cc5fafe4bce44811f5b0b3686912b4b011be3dee3d462c073916f40bff39',
    packageId: SHARED_PACKAGE_ID, packageName: 'STYLE - KOREAN', packageVersion: '1.0.0', slot: 'style', storyStyle: 'korean',
    instructionSourcePath: 'assets/1-CAPA - STYLE KOREAN.docx', instructionPath: 'assets/1-CAPA - STYLE KOREAN.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - STYLE KOREAN.docx', mediaType: DOCX_MEDIA_TYPE, sha256: 'a892d48242d660e54ffddd94080191c9805fa56bf71a228599d5f3c9b2f9f47c' },
      { path: 'assets/1-CAPA - STYLE KOREAN.docx.txt', mediaType: 'text/plain', sha256: '96fa36db1d3c946e26fb895bcc626090d7354732def97e0c0cb27f6c41936b30' },
    ],
  },
] as const;

const skillId = (definition: OfficialCapaPackageDefinition) =>
  `spp:${encodeURIComponent(definition.packageId)}:${encodeURIComponent(definition.instructionPath)}:${definition.slot}`;

export const officialCapaReference = (
  definition: OfficialCapaPackageDefinition,
): HarnessSkillReference => ({ id: skillId(definition), version: definition.packageVersion });

const officialByKey = new Map(OFFICIAL_CAPA_PACKAGES.map(definition => [definition.key, definition]));

export const OFFICIAL_CAPA_DEFAULT_REFERENCES = {
  author: officialCapaReference(officialByKey.get('author')!),
  pacing: officialCapaReference(officialByKey.get('pacing')!),
  continuity: officialCapaReference(officialByKey.get('continuity')!),
} as const;

export const OFFICIAL_STYLE_REFERENCES: Record<StoryStyle, HarnessSkillReference> = {
  chinese: officialCapaReference(officialByKey.get('style-chinese')!),
  japanese: officialCapaReference(officialByKey.get('style-japanese')!),
  korean: officialCapaReference(officialByKey.get('style-korean')!),
};

export type OfficialCapaArchiveLoader = (definition: OfficialCapaPackageDefinition) => Promise<Uint8Array>;

export const fetchOfficialCapaArchive: OfficialCapaArchiveLoader = async definition => {
  const response = await fetch(definition.archiveUrl);
  if (!response.ok) throw new Error(`Official CAPA package ${definition.archiveFile} could not be loaded (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
};

const verifyExactPackage = async (definition: OfficialCapaPackageDefinition, bytes: Uint8Array) => {
  const archiveSha256 = await fingerprint(bytes);
  if (archiveSha256 !== definition.archiveSha256) {
    throw new Error(`Official CAPA package ${definition.archiveFile} failed its archive digest check.`);
  }
  const content = await inspectHarnessSpp(bytes);
  if (content.manifest.id !== definition.packageId
    || content.manifest.name !== definition.packageName
    || content.manifest.version !== definition.packageVersion) {
    throw new Error(`Official CAPA package ${definition.archiveFile} has an unexpected identity or version.`);
  }
  const actualResources = content.manifest.files.map(({ path, mediaType, sha256 }) => ({ path, mediaType, sha256 }));
  if (JSON.stringify(actualResources) !== JSON.stringify(definition.resources)) {
    throw new Error(`Official CAPA package ${definition.archiveFile} has an unexpected resource inventory.`);
  }
  const readableExtension = content.manifest.extensions?.['spp.readableText'] as {
    documents?: Array<{ source?: unknown; path?: unknown }>;
  } | undefined;
  const readableDocument = readableExtension?.documents?.find(document =>
    document.source === definition.instructionSourcePath && document.path === definition.instructionPath);
  if (!readableDocument) {
    throw new Error(`Official CAPA package ${definition.archiveFile} does not declare its approved readable instruction file.`);
  }
  const created = createHarnessSppSkill(content, definition.instructionPath, definition.slot);
  if (created.id !== skillId(definition)) {
    throw new Error(`Official CAPA package ${definition.archiveFile} produced an unexpected skill identity.`);
  }
  return validateHarnessSkillManifest({
    ...created,
    assetCount: definition.resources.length,
    source: {
      ...created.source!,
      archiveSha256: definition.archiveSha256,
      resources: definition.resources.map(resource => ({ ...resource })),
    },
  });
};

export async function installOfficialCapaSkills(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  loadArchive: OfficialCapaArchiveLoader = fetchOfficialCapaArchive,
): Promise<{ installed: HarnessSkillManifest[]; official: HarnessSkillManifest[] }> {
  let installed = loadHarnessSppSkills(storage);
  const official: HarnessSkillManifest[] = [];
  for (const definition of OFFICIAL_CAPA_PACKAGES) {
    const skill = await verifyExactPackage(definition, await loadArchive(definition));
    official.push(skill);
  }
  // Stage through the existing inventory writer, then commit once. A missing,
  // altered, or over-capacity set never leaves a partial official install.
  let serialized = JSON.stringify(installed);
  const stagedStorage = { setItem: (_key: string, value: string) => { serialized = value; } };
  for (const skill of official) installed = saveHarnessSppSkill(stagedStorage, installed, skill);
  storage.setItem(SPP_SKILL_STORAGE_KEY, serialized);
  return { installed, official };
}
