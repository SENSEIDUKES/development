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
    archiveSha256: '5210a911e243aacfd51a943e4899c51b94a076fc1ca1e54afc23f686b7951380',
    packageId: 'e103be1b-ade1-4670-867a-13cb0fa1d7ba', packageName: 'CAPA AUTHOR', packageVersion: '1.0.1', slot: 'author',
    instructionSourcePath: 'assets/1-CAPA - AUTHOR.docx', instructionPath: 'assets/1-CAPA - AUTHOR.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - AUTHOR.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '2d020251bbadec8eeae99f044b9ff9c6c3ed1d47a309e1994fa52e81ad827bb1' },
      { path: 'assets/1-CAPA - AUTHOR.docx.txt', mediaType: 'text/plain', sha256: 'da47c181fb3c6a022fb603779f916a85d2d775d7feb422773de16e56f4b7280a' },
    ],
  },
  {
    key: 'pacing', archiveFile: 'CAPA-Pacing.spp', archiveUrl: pacingArchiveUrl,
    archiveSha256: '6bad51fffe602921483e7f21a7018ef4c8aab4a7b8583e7f057851b78afb13bc',
    packageId: '38720040-ce9c-402b-ad91-d1dd6d840aa3', packageName: 'CAPA Pacing', packageVersion: '1.0.1', slot: 'pacing',
    instructionSourcePath: 'assets/1-CAPA - PACING.docx', instructionPath: 'assets/1-CAPA - PACING.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - PACING.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '2b1f11fe1fcca88854eef5ba2f30e9579fda027344e8b3ca049a0b4eda22da68' },
      { path: 'assets/1-CAPA - PACING.docx.txt', mediaType: 'text/plain', sha256: '488fc6db5f3ddfacd580e484e6ea7d8bbb67c4fbd9eecb0dada4df836eefca95' },
    ],
  },
  {
    key: 'continuity', archiveFile: 'CAPA-Continuity.spp', archiveUrl: continuityArchiveUrl,
    archiveSha256: 'ca37414fb6b0b73aaba85b8432a2f051d6a9dbe3d6a0eec3442090c6f29fc97c',
    packageId: '831e2788-76b1-48b3-924e-445153c3eb7a', packageName: 'CAPA Continuity', packageVersion: '1.0.1', slot: 'continuity',
    instructionSourcePath: 'assets/1-CAPA - CONITINUITY.docx', instructionPath: 'assets/1-CAPA - CONITINUITY.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - CONITINUITY.docx', mediaType: DOCX_MEDIA_TYPE, sha256: 'a3a28c1687a2687c57c1183c55ffcbc3b0474872ff2a9917036265b46dbd26a3' },
      { path: 'assets/1-CAPA - CONITINUITY.docx.txt', mediaType: 'text/plain', sha256: '6e3d06a92be5f4694aaed5c4f4c3f74eb8689a182807362c3726969fc4c845a2' },
    ],
  },
  {
    key: 'style-chinese', archiveFile: 'CAPA-STYLE-CHINESE.spp', archiveUrl: chineseStyleArchiveUrl,
    archiveSha256: 'bd9c79e8b856ab79a2c1bfd765a8058e99f2420b5c81695ac512ff2267568a12',
    packageId: '4fe6006b-a152-46e7-a4af-6255eabad4a9', packageName: 'STYLE - CHINESE', packageVersion: '1.0.0', slot: 'style', storyStyle: 'chinese',
    instructionSourcePath: 'assets/1-1-CAPA - STYLE CHINESE.docx', instructionPath: 'assets/1-1-CAPA - STYLE CHINESE.docx.txt',
    resources: [
      { path: 'assets/1-1-CAPA - STYLE CHINESE.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '9382f8b6918607dcf6536667b1101e7f0eebe12a4e4c67193f79fea438b9af34' },
      { path: 'assets/1-1-CAPA - STYLE CHINESE.docx.txt', mediaType: 'text/plain', sha256: '869a1f921429c1dcc1fea732f9e79fe4e9ef3905327ddf06413cf4081ac94a7b' },
    ],
  },
  {
    key: 'style-japanese', archiveFile: 'CAPA-STYLE-JAPANESE.spp', archiveUrl: japaneseStyleArchiveUrl,
    archiveSha256: '0233e82545e82645fbdf49eeafa03ae3791a1739c845d4e06bca3954d1c6659e',
    packageId: 'a776656d-20fa-42a6-bf84-790a4e9d6bb2', packageName: 'STYLE - JAPANESE', packageVersion: '1.0.0', slot: 'style', storyStyle: 'japanese',
    instructionSourcePath: 'assets/1-CAPA - STYLE JAPANESE.docx', instructionPath: 'assets/1-CAPA - STYLE JAPANESE.docx.txt',
    resources: [
      { path: 'assets/1-CAPA - STYLE JAPANESE.docx', mediaType: DOCX_MEDIA_TYPE, sha256: '9b490776db6c154830dd715aa3a7afff4ba055da617850f49303068712a46cc1' },
      { path: 'assets/1-CAPA - STYLE JAPANESE.docx.txt', mediaType: 'text/plain', sha256: '1c72cf2017c4759c73a79498d180bcc7cffa3ed1d051a8db37521acbc45b2932' },
    ],
  },
  {
    key: 'style-korean', archiveFile: 'CAPA-STYLE-KOREAN.spp', archiveUrl: koreanStyleArchiveUrl,
    archiveSha256: '6a9f2ede69a0a1c5d2e332452f7981e95c8c9c31cd56f6061bf6717f5d5bae09',
    packageId: '565b9514-aeed-4719-b5f5-1a000afd92c3', packageName: 'STYLE - KOREAN', packageVersion: '1.0.0', slot: 'style', storyStyle: 'korean',
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
