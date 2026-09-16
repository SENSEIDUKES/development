import { cloneHarnessValue } from './ids';
import {
  buildSelectedTranslationGlossary,
  isTranslationSkillCompatible,
  presentSelectedTranslationGlossary,
  translationCompatibilityError,
  translationMatchSource,
  translationTargetLanguage,
  validateTranslationSkillMetadata,
} from './translationSkill';
import type {
  CapaPrompt,
  HarnessSelectedTranslationGlossary,
  HarnessSkillLoadoutSnapshot,
  HarnessSkillApplication,
  HarnessSkillManifest,
  HarnessSkillReference,
  HarnessSkillSlotId,
  HarnessStory,
  ImmediateChapterRequest,
  StoryInformationPacket,
} from './types';

export interface CapaSlotDefinition {
  id: HarnessSkillSlotId;
  label: string;
  description: string;
}

/**
 * The CAPA Schema: the single authoritative definition of every CAPA skill
 * slot, its order, and its responsibility. Loadout freezing and CAPA Prompt
 * assembly both iterate this array, so its order is the assembled order.
 * See ARCHITECTURE_VOCABULARY.md.
 */
export const CAPA_SCHEMA: readonly CapaSlotDefinition[] = [
  { id: 'author', label: 'Author', description: 'Defines how the writing model approaches and writes the chapter.' },
  { id: 'pacing', label: 'Pacing', description: 'Controls event spacing, arc pressure, and payoff timing.' },
  { id: 'continuity', label: 'Continuity', description: 'Adds specialized canon and long-range consistency guidance.' },
  { id: 'style', label: 'Style', description: 'Shapes prose tradition, voice, rhythm, and presentation.' },
  { id: 'accessibility', label: 'Accessibility', description: 'Adapts reading and generation for specific access needs.' },
  { id: 'translation', label: 'Translation', description: 'Adds language and cultural-translation capability.' },
] as const;

const HARNESS_SKILL_APPLICATIONS: readonly HarnessSkillApplication[] = [
  'generation',
  'post-commit',
  'reader',
];

export const harnessSkillKey = (reference: HarnessSkillReference) => `${reference.id}@${reference.version}`;
export const HARNESS_SKILL_INSTRUCTION_LIMIT = 16_000;

const nonEmpty = (value: string, label: string) => {
  if (!value.trim()) throw new Error(`Harness skill ${label} cannot be empty.`);
};

export const validateHarnessSkillManifest = (manifest: HarnessSkillManifest): HarnessSkillManifest => {
  nonEmpty(manifest.id, 'id');
  nonEmpty(manifest.version, 'version');
  nonEmpty(manifest.name, 'name');
  nonEmpty(manifest.description, 'description');
  if (!CAPA_SCHEMA.some(slot => slot.id === manifest.slot)) {
    throw new Error(`Harness skill ${manifest.name} uses an unsupported slot.`);
  }
  if (!Array.isArray(manifest.applications) || !manifest.applications.length) {
    throw new Error(`Harness skill ${manifest.name} must declare at least one application.`);
  }
  if (manifest.applications.some(application => !HARNESS_SKILL_APPLICATIONS.includes(application))) {
    throw new Error(`Harness skill ${manifest.name} declares an unsupported application.`);
  }
  if (manifest.applications.includes('generation') && !manifest.instructions?.trim()) {
    throw new Error(`Generation skill ${manifest.name} must include model instructions.`);
  }
  if ((manifest.instructions?.length ?? 0) > HARNESS_SKILL_INSTRUCTION_LIMIT) {
    throw new Error(`Harness skill instructions exceed ${HARNESS_SKILL_INSTRUCTION_LIMIT} characters.`);
  }
  // Translation metadata is structural and slot-exclusive: a Translation skill
  // must declare exactly one target language, and no other slot may declare one.
  if (manifest.slot === 'translation') {
    const translation = validateTranslationSkillMetadata(manifest.translation, manifest.name);
    return cloneHarnessValue({ ...manifest, instructions: manifest.instructions?.trim(), translation });
  }
  if (manifest.translation !== undefined) {
    throw new Error(`Harness skill ${manifest.name} occupies the ${manifest.slot} slot and cannot declare Translation metadata.`);
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
  const unsupportedSlot = Object.keys(story.skillLoadout ?? {})
    .find(slot => !CAPA_SCHEMA.some(definition => definition.id === slot));
  if (unsupportedSlot) {
    throw new Error(`${unsupportedSlot} is not a supported CAPA skill slot.`);
  }
  const skills = CAPA_SCHEMA.flatMap(slot => {
    const reference = story.skillLoadout?.[slot.id];
    if (!reference) return [];
    const manifest = resolveHarnessSkill(catalog, reference);
    if (!manifest) {
      throw new Error(`${slot.label} skill ${harnessSkillKey(reference)} is equipped but is not installed. Reinstall it or empty that slot before generating.`);
    }
    if (manifest.slot !== slot.id) {
      throw new Error(`${manifest.name} cannot run from the ${slot.label} slot.`);
    }
    // Compatibility is rechecked at every freeze, so a story whose equipped
    // Translation skill no longer matches its Original Language cannot generate.
    if (slot.id === 'translation' && !isTranslationSkillCompatible(manifest, story.originalLanguage)) {
      throw new Error(translationCompatibilityError(manifest, story.originalLanguage));
    }
    return [cloneHarnessValue(manifest)];
  });
  if (!skills.some(skill => skill.slot === 'author' && skill.applications.includes('generation'))) {
    throw new Error('Equip an installed Author skill before generating a chapter.');
  }
  return { skills, capturedAt };
};

/**
 * A soft ceiling on the assembled authoring instruction. Story Information has
 * its own selection budget; CAPA never spends it.
 */
export const CAPA_PROMPT_TOKEN_LIMIT = 6_000;

/**
 * Permanent HARNESS authority appended after the replaceable CAPA Skills.
 * This is deliberately not a CAPA Skill: authors can inspect it, but no
 * installed package can replace, remove, or reorder it.
 */
export const HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS = [
  'HARNESS OFFICIAL OUTPUT REQUIREMENTS',
  'The equipped Accessibility and Translation instructions are mandatory for all reader-facing chapter content.',
  'Apply them consistently to prose, dialogue, narration, reader-visible System Panels, Manifestation text, captions, and other text intended to be experienced by the reader. Do not weaken or selectively ignore them to preserve another prose preference. When necessary, Style must operate within their reader-facing requirements.',
  'Accessibility and Translation do not apply to machine-facing output.',
  'Keep all structured field names, IDs, enum values, triggers, technical metadata, internal tags, routing instructions, media-generation prompts, asset-search descriptions, audio directions, World Cue instructions, and backend effect payloads in canonical English and in the exact required structure.',
  'When an output object contains both reader-facing and machine-facing information, apply Accessibility and Translation only to the reader-facing fields. Preserve the machine-facing fields in canonical English.',
  'These requirements change how reader-facing content is communicated. They must not change established facts, character intent, plot events, emotional meaning, canonical terminology, or the technical meaning of any media effect.',
].join('\n\n');

const slotLabel = (slot: HarnessSkillSlotId) => CAPA_SCHEMA.find(definition => definition.id === slot)!.label;

const isAuthoringSkill = (skill: HarnessSkillManifest) =>
  skill.applications.includes('generation') && Boolean(skill.instructions?.trim());

/**
 * Assembles the CAPA Prompt: every equipped generation skill, Author first,
 * once each, in CAPA Schema order. Non-generation skills are recorded for
 * their host runtime but contribute no authoring text.
 */
export const assembleCapaPrompt = (
  loadout: HarnessSkillLoadoutSnapshot,
  generationInputs?: {
    storyInformation: StoryInformationPacket;
    immediateChapterRequest: ImmediateChapterRequest;
  },
): CapaPrompt => {
  const unsupportedSkill = loadout.skills.find(skill => !CAPA_SCHEMA.some(slot => slot.id === skill.slot));
  if (unsupportedSkill) {
    throw new Error(`${unsupportedSkill.slot} is not a supported CAPA skill slot.`);
  }
  const ordered = CAPA_SCHEMA.flatMap(slot => loadout.skills.filter(skill => skill.slot === slot.id));
  const author = ordered.find(skill => skill.slot === 'author' && isAuthoringSkill(skill));
  if (!author) throw new Error('Harness Generation requires an equipped Author skill.');

  // The glossary is selected against the already-frozen generation inputs, so
  // the reference below is exactly what this attempt replays with.
  const translationSkill = ordered.find(skill => skill.slot === 'translation' && isAuthoringSkill(skill));
  const translationGlossary: HarnessSelectedTranslationGlossary | undefined =
    translationSkill && generationInputs
      ? buildSelectedTranslationGlossary(translationSkill, translationMatchSource(
          generationInputs.storyInformation,
          generationInputs.immediateChapterRequest,
        ))
      : undefined;

  const sections = ordered.filter(isAuthoringSkill).map(skill => [
    `CAPA SKILL [${slotLabel(skill.slot)}] — ${skill.name} v${skill.version}`,
    skill.instructions!.trim(),
    // The selected reference belongs to the Translation section, not its own.
    ...(skill === translationSkill && translationGlossary
      ? [presentSelectedTranslationGlossary(translationGlossary)]
      : []),
  ].join('\n'));
  const text = [...sections, HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS].join('\n\n');
  const estimatedTokens = Math.max(1, Math.ceil(text.length / 4));
  if (estimatedTokens > CAPA_PROMPT_TOKEN_LIMIT) {
    throw new Error('Equipped skills exceed the CAPA Prompt budget. Empty a skill slot, install shorter instructions, or narrow the Translation glossary.');
  }
  return {
    capturedAt: loadout.capturedAt,
    skills: ordered.map(skill => ({
      id: skill.id,
      version: skill.version,
      name: skill.name,
      slot: skill.slot,
      applications: [...skill.applications],
      authoring: isAuthoringSkill(skill),
      ...(translationTargetLanguage(skill) ? { targetLanguage: translationTargetLanguage(skill) } : {}),
      ...(skill.source ? { source: cloneHarnessValue(skill.source) } : {}),
    })),
    text,
    estimatedTokens,
    ...(translationGlossary ? { translationGlossary: cloneHarnessValue(translationGlossary) } : {}),
  };
};
