import { cloneHarnessValue } from './ids';
import type {
  HarnessSkillLoadoutSnapshot,
  HarnessSkillManifest,
  HarnessSkillReference,
  HarnessSkillSlotId,
  HarnessStory,
} from './types';

export interface HarnessSkillSlotDefinition {
  id: HarnessSkillSlotId;
  label: string;
  description: string;
}

export const HARNESS_SKILL_SLOTS: readonly HarnessSkillSlotDefinition[] = [
  { id: 'pacing', label: 'Pacing', description: 'Controls event spacing, arc pressure, and payoff timing.' },
  { id: 'continuity', label: 'Continuity', description: 'Adds specialized canon and long-range consistency guidance.' },
  { id: 'style', label: 'Style', description: 'Shapes prose tradition, voice, rhythm, and presentation.' },
  { id: 'accessibility', label: 'Accessibility', description: 'Adapts reading and generation for specific access needs.' },
  { id: 'translation', label: 'Translation', description: 'Adds language and cultural-translation capability.' },
  { id: 'media', label: 'Media', description: 'Connects music, sound, imagery, and other story media packs.' },
] as const;

export const harnessSkillKey = (reference: HarnessSkillReference) => `${reference.id}@${reference.version}`;

const nonEmpty = (value: string, label: string) => {
  if (!value.trim()) throw new Error(`Harness skill ${label} cannot be empty.`);
};

export const validateHarnessSkillManifest = (manifest: HarnessSkillManifest): HarnessSkillManifest => {
  nonEmpty(manifest.id, 'id');
  nonEmpty(manifest.version, 'version');
  nonEmpty(manifest.name, 'name');
  nonEmpty(manifest.description, 'description');
  if (!HARNESS_SKILL_SLOTS.some(slot => slot.id === manifest.slot)) {
    throw new Error(`Harness skill ${manifest.name} uses an unsupported slot.`);
  }
  if (!manifest.applications.length) throw new Error(`Harness skill ${manifest.name} must declare at least one application.`);
  if (manifest.applications.includes('generation') && !manifest.instructions?.trim()) {
    throw new Error(`Generation skill ${manifest.name} must include model instructions.`);
  }
  return cloneHarnessValue({ ...manifest, instructions: manifest.instructions?.trim() });
};

export const createHarnessSkillCatalog = (manifests: HarnessSkillManifest[]) => {
  const catalog = new Map<string, HarnessSkillManifest>();
  for (const source of manifests) {
    const manifest = validateHarnessSkillManifest(source);
    const key = harnessSkillKey(manifest);
    if (catalog.has(key)) throw new Error(`Harness skill ${key} was installed more than once.`);
    catalog.set(key, manifest);
  }
  return catalog;
};

export const resolveHarnessSkill = (
  catalog: ReadonlyMap<string, HarnessSkillManifest>,
  reference: HarnessSkillReference,
) => catalog.get(harnessSkillKey(reference));

export const freezeHarnessSkillLoadout = (
  story: HarnessStory,
  catalog: ReadonlyMap<string, HarnessSkillManifest>,
  capturedAt: string,
): HarnessSkillLoadoutSnapshot => {
  const skills = HARNESS_SKILL_SLOTS.flatMap(slot => {
    const reference = story.skillLoadout?.[slot.id];
    if (!reference) return [];
    const manifest = resolveHarnessSkill(catalog, reference);
    if (!manifest) {
      throw new Error(`${slot.label} skill ${harnessSkillKey(reference)} is equipped but is not installed. Reinstall it or empty that slot before generating.`);
    }
    if (manifest.slot !== slot.id) {
      throw new Error(`${manifest.name} cannot run from the ${slot.label} slot.`);
    }
    return [cloneHarnessValue(manifest)];
  });
  return { skills, capturedAt };
};
