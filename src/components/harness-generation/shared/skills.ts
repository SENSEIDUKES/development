import { cloneHarnessValue } from './ids';
import { getSenLanguageLabel, type SenLanguageCode } from '../../../lib/language';
import { normalizeChapterWritingStyle } from '../../../narrative/readingMode';
import { HARNESS_CANONICAL_LANGUAGE, buildSelectedTranslationGlossary, presentSelectedTranslationGlossary, resolveTranslationPackage, translationMatchSource, translationTargetLanguage, validateTranslationSkillMetadata } from '../../../narrative/translationSkill';
import type { CapaPrompt, HarnessSelectedTranslationGlossary, HarnessSkillLoadoutSnapshot, HarnessSkillApplication, HarnessSkillManifest, HarnessSkillReference, HarnessSkillSlotId, HarnessStory, HarnessStoryMode, ImmediateChapterRequest, StoryInformationPacket } from '../../../narrative/generation';
import { SEN_FATE_SURVIVAL_SKILL } from './fateSurvivalSkill';
import { SEN_READING_MODE_SKILLS } from './readingModeSkills';

/**
 * Which model call reads a CAPA slot's skill: the chapter writer, or the World
 * Blueprint call that builds the world before the story exists (SENSEI,
 * 2026-11-05: split the Blueprint into Origin, World and Arc skills, so a
 * publisher can replace the Origin). One schema holds both, so a slot has one
 * definition wherever it is read.
 */
export type CapaSlotReader = 'writer' | 'blueprint';

/** The story state that fills a managed CAPA slot. */
export type CapaSlotManager = 'fate-mode' | 'story-language' | 'reading-mode';

export interface CapaSlotDefinition {
  id: HarnessSkillSlotId;
  label: string;
  description: string;
  /** The model call that reads this slot's skill. */
  readBy: CapaSlotReader;
  /**
   * Which story state fills this slot. A managed slot is never equipped by
   * hand: loadout freezing resolves it on every chapter call, and the result is
   * frozen on the attempt like any other skill.
   * - `fate-mode`: the chapter's Fate mode. Fate Survival loads SEN's Fate
   *   Survival skill; Regular Reader mode leaves the slot empty.
   * - `story-language`: the story's Original Language (its Story Language).
   *   English leaves the slot empty; any other language loads the one installed
   *   Translation package that writes in it, when one is installed.
   * - `reading-mode`: the story's Reading Mode. Standard leaves the slot empty;
   *   each other mode loads SEN's matching bundled skill.
   */
  managedBy?: CapaSlotManager;
  /**
   * Whether a host may install packages for this slot. Separate from equipping:
   * Translation packages are installed but never equipped by hand, while the
   * slots SEN fills with its own bundled skills take no packages at all.
   */
  installable: boolean;
}

/**
 * The CAPA Schema: the single authoritative definition of every CAPA skill
 * slot, its order, and its responsibility. Loadout freezing and CAPA Prompt
 * assembly both iterate this array, so its order is the assembled order.
 * See ARCHITECTURE_VOCABULARY.md.
 */
export const CAPA_SCHEMA: readonly CapaSlotDefinition[] = [
  { id: 'author', label: 'Author', description: 'Defines how the writing model approaches and writes the chapter.', readBy: 'writer', installable: true },
  { id: 'pacing', label: 'Pacing', description: 'Controls event spacing, arc pressure, and payoff timing.', readBy: 'writer', installable: true },
  { id: 'fate', label: 'Fate', description: 'Carries the Fate mode\'s writing rules: the reader\'s direction, honest pursuit, lasting consequences, and endings.', readBy: 'writer', managedBy: 'fate-mode', installable: false },
  { id: 'continuity', label: 'Continuity', description: 'Adds specialized canon and long-range consistency guidance.', readBy: 'writer', installable: true },
  { id: 'style', label: 'Style', description: 'Shapes prose tradition, voice, rhythm, and presentation.', readBy: 'writer', installable: true },
  { id: 'accessibility', label: 'Accessibility', description: 'Writes chapters in the story\'s Reading Mode.', readBy: 'writer', managedBy: 'reading-mode', installable: false },
  { id: 'translation', label: 'Translation', description: 'Writes chapters in the story\'s Story Language when it is not English.', readBy: 'writer', managedBy: 'story-language', installable: true },
  { id: 'origin', label: 'Origin', description: 'The kind of fiction the World Blueprint builds in: its tradition, tropes, names and style.', readBy: 'blueprint', installable: false },
  { id: 'world', label: 'World', description: 'How the World Blueprint builds the world as Chapter 1 opens: its cards and the main character.', readBy: 'blueprint', installable: false },
  { id: 'arc', label: 'Arc', description: 'How the World Blueprint chooses the Destined Ending, the story\'s length and Arc 1.', readBy: 'blueprint', installable: false },
] as const;

/** The slots a story equips and the chapter writer reads, in assembled order. */
export const CAPA_WRITER_SLOTS: readonly CapaSlotDefinition[] = CAPA_SCHEMA.filter(slot => slot.readBy === 'writer');

/** The slots the World Blueprint call reads, in assembled order: Origin, World, Arc. */
export const CAPA_BLUEPRINT_SLOTS: readonly CapaSlotDefinition[] = CAPA_SCHEMA.filter(slot => slot.readBy === 'blueprint');


const HARNESS_SKILL_APPLICATIONS: readonly HarnessSkillApplication[] = [
  'generation',
  'post-commit',
  'reader',
];

export const harnessSkillKey = (reference: HarnessSkillReference) => `${reference.id}@${reference.version}`;

const MANAGED_SLOT_REASONS: Record<CapaSlotManager, string> = {
  'fate-mode': 'The Fate slot follows the story\'s Fate mode: Fate Survival loads its skill on every chapter, and Regular Reader mode leaves it empty.',
  'story-language': 'The Translation slot follows the story\'s Story Language: a non-English story loads that language\'s installed writing package on every chapter, and an English story leaves it empty.',
  'reading-mode': 'The Accessibility slot follows the story\'s Reading Mode: Clear Reading, Easy Read and Literal Reading load SEN\'s matching skill on every chapter, and Standard leaves it empty.',
};

/** Why a slot cannot be equipped by hand, when it cannot. */
export const managedCapaSlotReason = (slot: HarnessSkillSlotId) => {
  const manager = CAPA_SCHEMA.find(definition => definition.id === slot)?.managedBy;
  return manager ? MANAGED_SLOT_REASONS[manager] : undefined;
};

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

/** How a story's Story Language is written, given the host's installed packages. */
export type StoryLanguagePackage =
  /** English: Story Information is already in the writing language, so nothing loads. */
  | { status: 'not-needed' }
  /** The one installed writing package for this language loads on every chapter. */
  | { status: 'loaded'; skill: HarnessSkillManifest }
  /** No writing package is installed for this language. Chapters are still written in it. */
  | { status: 'missing' }
  /** Competing packages: the HARNESS never chooses between them, so chapters wait until one remains. */
  | { status: 'ambiguous'; message: string };

/**
 * Resolves the Translation package for a story's Original Language through the
 * shared Translation rule, restricted to packages that declare `generation`.
 */
export const resolveStoryLanguagePackage = (
  installed: Iterable<HarnessSkillManifest>,
  originalLanguage: SenLanguageCode,
): StoryLanguagePackage => {
  if (originalLanguage === HARNESS_CANONICAL_LANGUAGE) return { status: 'not-needed' };
  const resolution = resolveTranslationPackage([...installed], originalLanguage, 'generation');
  const language = getSenLanguageLabel(originalLanguage);
  switch (resolution.status) {
    case 'resolved':
      return { status: 'loaded', skill: resolution.skill };
    case 'missing':
      return { status: 'missing' };
    case 'ambiguous':
      return { status: 'ambiguous', message: `More than one ${language} writing package is installed, so new chapters can't be written until only one remains.` };
    case 'conflicting-content':
      return { status: 'ambiguous', message: `The ${language} writing package is installed with different content for version ${resolution.version}. Reinstall it before writing new chapters.` };
  }
};

const resolveManagedSkill = (
  manager: CapaSlotManager,
  story: HarnessStory,
  catalog: ReadonlyMap<string, HarnessSkillManifest>,
  fateMode: HarnessStoryMode,
): HarnessSkillManifest | undefined => {
  switch (manager) {
    case 'fate-mode': {
      if (fateMode !== 'survival') return undefined;
      const manifest = resolveHarnessSkill(catalog, SEN_FATE_SURVIVAL_SKILL);
      if (!manifest) throw new Error('The Fate Survival skill is not installed in this host, so a Fate Survival chapter cannot be written.');
      return manifest;
    }
    case 'story-language': {
      const language = resolveStoryLanguagePackage(catalog.values(), story.originalLanguage);
      if (language.status === 'ambiguous') throw new Error(language.message);
      return language.status === 'loaded' ? language.skill : undefined;
    }
    case 'reading-mode': {
      const mode = normalizeChapterWritingStyle(story.chapterWritingStyle);
      if (mode === 'Standard') return undefined;
      const manifest = resolveHarnessSkill(catalog, SEN_READING_MODE_SKILLS[mode]);
      if (!manifest) throw new Error(`The ${mode} Reading Mode skill is not installed in this host, so a ${mode} chapter cannot be written.`);
      return manifest;
    }
  }
};

/**
 * The skill each managed slot resolves to from story state right now, keyed by
 * slot; an empty slot has no entry. It throws exactly as loadout freezing
 * would, for example on competing Translation packages.
 */
export const resolveManagedCapaSkills = (
  story: HarnessStory,
  catalog: ReadonlyMap<string, HarnessSkillManifest>,
  fateMode: HarnessStoryMode = 'regular',
): Partial<Record<HarnessSkillSlotId, HarnessSkillManifest>> => Object.fromEntries(
  CAPA_SCHEMA.flatMap(slot => {
    if (!slot.managedBy) return [];
    const skill = resolveManagedSkill(slot.managedBy, story, catalog, fateMode);
    return skill ? [[slot.id, skill]] : [];
  }),
);

/**
 * One comparable line for the managed slots of a skill list (a frozen CAPA
 * Prompt's skills, or a fresh resolution). Two lists with the same signature
 * load the same managed skills at the same versions.
 */
export const managedCapaSkillSignature = (skills: ReadonlyArray<Pick<HarnessSkillManifest, 'id' | 'version' | 'slot'>>) =>
  CAPA_SCHEMA.filter(slot => slot.managedBy).map(slot => {
    const skill = skills.find(entry => entry.slot === slot.id);
    return `${slot.id}=${skill ? harnessSkillKey(skill) : 'none'}`;
  }).join('|');

export const freezeHarnessSkillLoadout = (
  story: HarnessStory,
  catalog: ReadonlyMap<string, HarnessSkillManifest>,
  capturedAt: string,
  /** The Fate mode of the chapter being frozen. Fate Survival loads its skill into the Fate slot. */
  fateMode: HarnessStoryMode = 'regular',
): HarnessSkillLoadoutSnapshot => {
  const unsupportedSlot = Object.keys(story.skillLoadout ?? {})
    .find(slot => !CAPA_WRITER_SLOTS.some(definition => definition.id === slot));
  if (unsupportedSlot) {
    throw new Error(`${unsupportedSlot} is not a supported CAPA skill slot.`);
  }
  const managed = resolveManagedCapaSkills(story, catalog, fateMode);
  const skills = CAPA_WRITER_SLOTS.flatMap(slot => {
    // A managed slot ignores the story's loadout: story state decides it.
    if (slot.managedBy) {
      const skill = managed[slot.id];
      return skill ? [cloneHarnessValue(skill)] : [];
    }
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
  if (!skills.some(skill => skill.slot === 'author' && skill.applications.includes('generation'))) {
    throw new Error('Equip an installed Author skill before generating a chapter.');
  }
  return { skills, capturedAt, originalLanguage: story.originalLanguage };
};

/**
 * A soft ceiling on the assembled authoring instruction. Story Information has
 * its own selection budget; CAPA never spends it.
 */
export const CAPA_PROMPT_TOKEN_LIMIT = 6_000;

/**
 * Permanent HARNESS authority appended after the replaceable CAPA Skills, only
 * when a chapter needs it: when an Accessibility or Translation skill is
 * loaded, or when the story is written in a language other than English. A
 * chapter with neither carries no such text. It is deliberately not a CAPA
 * Skill: authors can inspect it, but no installed package can replace,
 * remove, or reorder it.
 */
export const buildHarnessOfficialOutputRequirements = (input: {
  /** The story's Original Language. Anything but English adds the Story Language requirement. */
  originalLanguage?: SenLanguageCode;
  accessibility: boolean;
  translation: boolean;
}): string | undefined => {
  const language = input.originalLanguage && input.originalLanguage !== HARNESS_CANONICAL_LANGUAGE
    ? input.originalLanguage
    : undefined;
  const adapters = [input.accessibility ? 'Accessibility' : '', input.translation ? 'Translation' : ''].filter(Boolean);
  if (!language && !adapters.length) return undefined;
  const named = adapters.join(' and ');
  return [
    'HARNESS OFFICIAL OUTPUT REQUIREMENTS',
    ...(language ? [`Write all reader-facing chapter content in ${getSenLanguageLabel(language)}, this story's Original Language (${language}).`] : []),
    ...(adapters.length ? [
      `The ${named} instructions are mandatory for all reader-facing chapter content.`,
      'Apply them consistently to prose, dialogue, narration, reader-visible System Panels, Manifestation text, captions, and other text intended to be experienced by the reader. Do not weaken or selectively ignore them to preserve another prose preference. When necessary, Style must operate within their reader-facing requirements.',
      `${named} ${adapters.length > 1 ? 'do' : 'does'} not apply to machine-facing output.`,
    ] : []),
    'Keep all structured field names, IDs, enum values, triggers, technical metadata, internal tags, routing instructions, media-generation prompts, asset-search descriptions, audio directions, sound words, and backend effect payloads in canonical English and in the exact required structure. A sound tag\'s words are the story\'s own, in its language.',
    ...(adapters.length ? [
      `When an output object contains both reader-facing and machine-facing information, apply ${named} only to the reader-facing fields. Preserve the machine-facing fields in canonical English.`,
      'These requirements change how reader-facing content is communicated. They must not change established facts, character intent, plot events, emotional meaning, canonical terminology, or the technical meaning of any media effect.',
    ] : []),
  ].join('\n\n');
};

const slotDefinition = (slot: HarnessSkillSlotId) => CAPA_SCHEMA.find(definition => definition.id === slot)!;
const slotLabel = (slot: HarnessSkillSlotId) => slotDefinition(slot).label;

const isAuthoringSkill = (skill: HarnessSkillManifest) =>
  skill.applications.includes('generation') && Boolean(skill.instructions?.trim());

/**
 * Assembles the CAPA Prompt: every equipped generation skill that writes,
 * Author first, once each, in CAPA Schema order, then the official
 * requirements when the chapter needs them. It is all writing: the tag
 * teaching left the writer when the tagger took the tags (SENSEI, 2026-10-24),
 * and lives in the tagger's own prompt. Non-generation skills are recorded for
 * their host runtime but contribute no authoring text.
 */
export const assembleCapaPrompt = (
  loadout: HarnessSkillLoadoutSnapshot,
  generationInputs?: {
    storyInformation: StoryInformationPacket;
    immediateChapterRequest: ImmediateChapterRequest;
  },
): CapaPrompt => {
  const unsupportedSkill = loadout.skills.find(skill => !CAPA_WRITER_SLOTS.some(slot => slot.id === skill.slot));
  if (unsupportedSkill) {
    throw new Error(`${unsupportedSkill.slot} is not a supported CAPA skill slot.`);
  }
  const ordered = CAPA_WRITER_SLOTS.flatMap(slot => loadout.skills.filter(skill => skill.slot === slot.id));
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

  const authoring = ordered.filter(isAuthoringSkill);
  const sections = authoring.map(skill => [
    `CAPA SKILL [${slotLabel(skill.slot)}] — ${skill.name} v${skill.version}`,
    skill.instructions!.trim(),
    // The selected reference belongs to the Translation section, not its own.
    ...(skill === translationSkill && translationGlossary
      ? [presentSelectedTranslationGlossary(translationGlossary)]
      : []),
  ].join('\n'));
  // The official requirements travel only when a reader-facing adapter is
  // loaded or the story is not written in English.
  const officialRequirements = buildHarnessOfficialOutputRequirements({
    originalLanguage: loadout.originalLanguage,
    accessibility: ordered.some(skill => skill.slot === 'accessibility' && isAuthoringSkill(skill)),
    translation: Boolean(translationSkill),
  });
  const text = [...sections, ...(officialRequirements ? [officialRequirements] : [])].join('\n\n');
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

/**
 * The World Blueprint's skills, assembled the way the CAPA Prompt assembles
 * the writer's: one skill per Blueprint slot, in CAPA Schema order (Origin,
 * World, Arc), each under a plain heading. The heading names no app machinery
 * ("CAPA", "HARNESS"): the Blueprint model reads only about the story. The
 * Blueprint's permanent rules follow these in its own prompt and are never a
 * skill.
 */
export const assembleBlueprintSkills = (skills: readonly HarnessSkillManifest[]): string => {
  const misplaced = skills.find(skill => !CAPA_BLUEPRINT_SLOTS.some(slot => slot.id === skill.slot));
  if (misplaced) throw new Error(`${misplaced.name} is not a World Blueprint skill.`);
  return CAPA_BLUEPRINT_SLOTS.map(slot => {
    const filling = skills.filter(skill => skill.slot === slot.id);
    if (filling.length !== 1) throw new Error(`The World Blueprint needs exactly one ${slot.label} skill.`);
    const [skill] = filling;
    validateHarnessSkillManifest(skill);
    if (!isAuthoringSkill(skill)) throw new Error(`${skill.name} has no instructions for the World Blueprint.`);
    return `[${slot.label}] ${skill.name} ${skill.version}\n${skill.instructions!.trim()}`;
  }).join('\n\n');
};
