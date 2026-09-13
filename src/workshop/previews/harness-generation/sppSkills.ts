import { intakePack, type PackContent, type PackInput } from 'seihouse-productions-package';
import { createHarnessSkillCatalog, HARNESS_SKILL_INSTRUCTION_LIMIT, validateHarnessSkillManifest, harnessSkillKey, type HarnessSkillManifest, type HarnessSkillSlotId } from '@seihouse/sen/harness-generation';

export const SPP_SKILL_TEXT_LIMIT = HARNESS_SKILL_INSTRUCTION_LIMIT;
export const SPP_SKILL_STORAGE_KEY = 'seihouse.harness.imported-skills.v1';

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

export function readHarnessSppText(content: PackContent, path: string): string {
  const record = content.manifest.files.find(file => file.path === path);
  const bytes = content.assets.get(path);
  if (!record || !bytes) throw new Error('Select a file from this validated package.');
  if (!['text/plain', 'text/markdown'].includes(record.mediaType)) {
    throw new Error('Only plain text and Markdown files can be installed as generation instructions.');
  }
  if (bytes.length > SPP_SKILL_TEXT_LIMIT * 4) throw new Error('This instruction file exceeds the Harness skill text limit.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.length > SPP_SKILL_TEXT_LIMIT) throw new Error(`Select a shorter instruction file (maximum ${SPP_SKILL_TEXT_LIMIT.toLocaleString()} characters).`);
  if (!text.trim() || text.includes('\0')) throw new Error('Instructions must contain readable, nonempty UTF-8 text.');
  return text;
}

export function createHarnessSppSkill(content: PackContent, path: string, slot: HarnessSkillSlotId): HarnessSkillManifest {
  const instructions = readHarnessSppText(content, path);
  const { manifest } = content;
  const record = manifest.files.find(file => file.path === path)!;
  return validateHarnessSkillManifest({
    id: `spp:${encodeURIComponent(manifest.id)}:${encodeURIComponent(path)}:${slot}`,
    version: manifest.version,
    name: `${manifest.name.trim()} · ${path.split('/').pop()}`,
    description: manifest.description || `Instructions from ${manifest.name.trim()}`,
    author: manifest.publisher,
    slot,
    applications: ['generation'],
    instructions,
    assetCount: 1,
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
