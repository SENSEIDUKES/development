import { intakePack, type PackContent, type PackInput } from 'seihouse-productions-package';
import { CAPA_SCHEMA, createHarnessSkillCatalog, HARNESS_SKILL_INSTRUCTION_LIMIT, validateHarnessSkillManifest, validateTranslationGlossaryResource, harnessSkillKey, type HarnessSkillApplication, type HarnessSkillManifest, type HarnessSkillSlotId, type HarnessTranslationGlossaryResource } from '@seihouse/sen/harness-generation';
import type { SenLanguageCode } from '@seihouse/sen';
import { extractDocxInstructionText, isDocxInstructionFile } from './docxInstructions';

export const SPP_SKILL_TEXT_LIMIT = HARNESS_SKILL_INSTRUCTION_LIMIT;
export const SPP_GLOSSARY_BYTE_LIMIT = 2 * 1024 * 1024;
/** Bumped when Media left CAPA so stale saved skill inventories reset, not migrate. */
export const SPP_SKILL_STORAGE_KEY = 'seihouse.harness.imported-skills.v3';

/** Intake validates all assets before the host can select any instruction text. */
export async function inspectHarnessSpp(input: PackInput): Promise<PackContent> {
  const result = await intakePack(input, {
    maxArchiveBytes: 8 * 1024 * 1024,
    maxTotalBytes: 16 * 1024 * 1024,
    maxEntryBytes: 4 * 1024 * 1024,
    maxEntries: 128,
  });
  if (!result.content) throw new Error(result.validation.issues
    .map(issue => `${issue.path ? `${issue.path}: ` : ''}${issue.message}`).join('\n'));
  return result.content;
}

/** Namespaced manifest extension a package uses to declare its CAPA slot. */
export const SPP_CAPA_EXTENSION = 'seihouse.capa';

/** Media types that carry instruction text directly. */
const SPP_TEXT_MEDIA_TYPES = ['text/plain', 'text/markdown'];

/**
 * Whether this validated package entry can supply generation instructions:
 * plain text, Markdown, or a Word document whose readable text is extracted.
 * File names decide nothing.
 */
export const isHarnessSppInstructionFile = (mediaType: string, bytes: Uint8Array) =>
  SPP_TEXT_MEDIA_TYPES.includes(mediaType) || isDocxInstructionFile(mediaType, bytes);

/**
 * Every entry of this validated package that could be installed as
 * instructions. The host still selects one explicitly; nothing is guessed.
 */
export function harnessSppInstructionFiles(content: PackContent) {
  return content.manifest.files.filter(file => {
    const bytes = content.assets.get(file.path);
    return Boolean(bytes) && isHarnessSppInstructionFile(file.mediaType, bytes!);
  });
}

/**
 * The only path the importer may preselect: the single eligible instruction
 * file. When a package carries several, the host must choose one.
 */
export function defaultHarnessSppInstructionPath(content: PackContent): string {
  const files = harnessSppInstructionFiles(content);
  return files.length === 1 ? files[0].path : '';
}

export function readHarnessSppText(content: PackContent, path: string): string {
  const record = content.manifest.files.find(file => file.path === path);
  const bytes = content.assets.get(path);
  if (!record || !bytes) throw new Error('Select a file from this validated package.');
  const docx = isDocxInstructionFile(record.mediaType, bytes);
  if (!docx && !SPP_TEXT_MEDIA_TYPES.includes(record.mediaType)) {
    throw new Error('Only plain text, Markdown and Word (.docx) files can be installed as generation instructions.');
  }
  if (!docx && bytes.length > SPP_SKILL_TEXT_LIMIT * 4) throw new Error('This instruction file exceeds the Harness skill text limit.');
  // A Word document contributes its extracted text only; its archive bytes are
  // never retained, installed, or assembled into the CAPA Prompt.
  let text: string;
  if (docx) {
    text = extractDocxInstructionText(bytes);
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('Instructions must contain readable, nonempty UTF-8 text.');
    }
  }
  if (text.length > SPP_SKILL_TEXT_LIMIT) throw new Error(`Select a shorter instruction file (maximum ${SPP_SKILL_TEXT_LIMIT.toLocaleString()} characters).`);
  if (!text.trim() || text.includes('\0')) throw new Error('Instructions must contain readable, nonempty UTF-8 text.');
  return text;
}

/**
 * The CAPA slot a package declares for itself, read only from its namespaced
 * manifest extension. A package name, publisher, or file name never decides a
 * slot; a package that declares none is installed into the slot the host chose.
 */
export function declaredHarnessSppSlot(content: PackContent): HarnessSkillSlotId | undefined {
  const declared = (content.manifest.extensions?.[SPP_CAPA_EXTENSION] as { slot?: unknown } | undefined)?.slot;
  if (declared === undefined || declared === null) return undefined;
  const slot = CAPA_SCHEMA.find(definition => definition.id === declared);
  if (!slot) throw new Error(`This package declares the unsupported CAPA slot “${String(declared)}”.`);
  return slot.id;
}

/**
 * Reads an explicitly selected JSON glossary from the validated package and
 * validates it against the language the host chose. No filename is special and
 * nothing is auto-selected.
 */
export function readHarnessSppGlossary(
  content: PackContent,
  path: string,
  targetLanguage: SenLanguageCode,
): HarnessTranslationGlossaryResource {
  const record = content.manifest.files.find(file => file.path === path);
  const bytes = content.assets.get(path);
  if (!record || !bytes) throw new Error('Select a glossary file from this validated package.');
  if (record.mediaType !== 'application/json') {
    throw new Error('Only JSON files can be installed as a Translation glossary resource.');
  }
  if (bytes.length > SPP_GLOSSARY_BYTE_LIMIT) {
    throw new Error(`Select a smaller glossary file (maximum ${(SPP_GLOSSARY_BYTE_LIMIT / 1024).toLocaleString()} KiB).`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('The selected glossary file is not readable UTF-8 JSON.');
  }
  const resource = validateTranslationGlossaryResource(parsed, targetLanguage);
  return { ...resource, source: { path, sha256: record.sha256 } };
}

const capaSlotLabel = (slot: HarnessSkillSlotId) =>
  CAPA_SCHEMA.find(definition => definition.id === slot)?.label ?? slot;

export interface HarnessSppTranslationSelection {
  /** Explicitly chosen by the host; never inferred from names or contents. */
  targetLanguage: SenLanguageCode;
  /**
   * Where this language package may be used: canonical generation, Reader
   * translation, or both. Also explicit — a package's name, file, or wording
   * never decides whether a reader may translate with it.
   */
  applications?: HarnessSkillApplication[];
  glossaryPath?: string;
}

export function createHarnessSppSkill(
  content: PackContent,
  path: string,
  slot: HarnessSkillSlotId,
  translationSelection?: HarnessSppTranslationSelection,
): HarnessSkillManifest {
  const instructions = readHarnessSppText(content, path);
  const { manifest } = content;
  // A package that declares a CAPA slot may only be installed into that slot,
  // whichever entry point the host used.
  const declaredSlot = declaredHarnessSppSlot(content);
  if (declaredSlot && declaredSlot !== slot) {
    throw new Error(`${manifest.name.trim()} declares the ${capaSlotLabel(declaredSlot)} CAPA slot and cannot be installed into the ${capaSlotLabel(slot)} slot.`);
  }
  const record = manifest.files.find(file => file.path === path)!;
  if (slot === 'translation' && !translationSelection) {
    throw new Error('Choose the target language before installing a Translation skill.');
  }
  // A Translation skill says which jobs it may do; anything else is generation.
  const applications: HarnessSkillApplication[] = slot === 'translation'
    ? [...new Set<HarnessSkillApplication>(translationSelection?.applications ?? ['generation'])]
    : ['generation'];
  if (!applications.length) {
    throw new Error('Choose where this Translation skill may be used before installing it.');
  }
  const translation = slot === 'translation' && translationSelection
    ? {
      targetLanguage: translationSelection.targetLanguage,
      ...(translationSelection.glossaryPath
        ? { glossary: readHarnessSppGlossary(content, translationSelection.glossaryPath, translationSelection.targetLanguage) }
        : {}),
    }
    : undefined;
  return validateHarnessSkillManifest({
    id: `spp:${encodeURIComponent(manifest.id)}:${encodeURIComponent(path)}:${slot}${translationSelection
      ? `:${translationSelection.targetLanguage}:${encodeURIComponent(translationSelection.glossaryPath ?? 'no-glossary')}`
      : ''}`,
    version: manifest.version,
    name: `${manifest.name.trim()} · ${path.split('/').pop()}`,
    description: manifest.description || `Instructions from ${manifest.name.trim()}`,
    author: manifest.publisher,
    slot,
    applications,
    instructions,
    ...(translation ? { translation } : {}),
    assetCount: translation?.glossary ? 2 : 1,
    source: { packageId: manifest.id, packageVersion: manifest.version, path, sha256: record.sha256 },
  });
}

export function loadHarnessSppSkills(storage: Pick<Storage, 'getItem'>): HarnessSkillManifest[] {
  const value: unknown = JSON.parse(storage.getItem(SPP_SKILL_STORAGE_KEY) ?? '[]');
  if (!Array.isArray(value) || value.length > 64) throw new Error('The saved SPP skill inventory is invalid.');
  const skills = value.map(item => {
    const skill = validateHarnessSkillManifest(item);
    if (!skill.source || !skill.instructions || skill.instructions.length > SPP_SKILL_TEXT_LIMIT) throw new Error('A saved SPP skill is invalid.');
    return skill;
  });
  return [...createHarnessSkillCatalog(skills).values()];
}

export function saveHarnessSppSkill(storage: Pick<Storage, 'setItem'>, installed: HarnessSkillManifest[], skill: HarnessSkillManifest) {
  const previous = installed.find(item => harnessSkillKey(item) === harnessSkillKey(skill));
  if (previous && JSON.stringify(previous) !== JSON.stringify(skill)) {
    throw new Error('This package version is already installed with different content. Import a new package version.');
  }
  const next = previous ? installed : [...installed, skill];
  if (next.length > 64) throw new Error('The local SPP skill inventory is full (64 skills).');
  storage.setItem(SPP_SKILL_STORAGE_KEY, JSON.stringify(next));
  return next;
}
