import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FrozenNarrativeMedia, SoundWordsPreset } from '@seihouse/sen/audio';
import {
  HarnessGenerationController,
  includeBundledHarnessSkills,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRepository,
  type HarnessHoldingsFixerPolicy,
  type HarnessGenerationServerInfo,
  type HarnessSkillManifest,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { createLibraryMediaPort, type MediaPack, type MediaPackEntitlement, type StoryMediaLoadoutSlot } from '../media/mediaPacks';
import type { SkillPackageIntake } from './settings/SkillPackageImport';

export interface LibraryStoriesOptions {
  /** Host-owned story storage. */
  repository: HarnessGenerationRepository;
  /** Host-owned writer: the server route that calls the model. */
  modelAdapter: HarnessGenerationModelAdapter;
  /** Host-owned skill inventory; SEN's bundled skills are always included. */
  installedSkills?: HarnessSkillManifest[];
  /** Host-owned runtime catalog. Media Packs are never merged into installedSkills. */
  registeredMediaPacks?: MediaPack[];
  /** Current account/reward truth supplied by the host. */
  mediaPackEntitlements?: MediaPackEntitlement[];
  /** Host-selected first-party records (the base sound words and recordings). */
  baseMedia?: FrozenNarrativeMedia;
  /**
   * Ready lists of sound words a story can start from, for Story Settings'
   * Sound Words. The first is the one a new story starts with.
   */
  soundWordPresets?: readonly SoundWordsPreset[];
  /** Installs a Sound Words `.spp` package as a preset, where the host allows it. */
  importSoundWords?: (file: Blob) => Promise<SoundWordsPreset>;
  /** Checks a skill `.spp` package, where the host lets readers install skills. */
  skillIntake?: SkillPackageIntake;
  /** Keeps an installed skill in the host's inventory, which then returns in `installedSkills`. */
  installSkill?: (skill: HarnessSkillManifest) => void;
  /**
   * Installs a Soundscape or Sound Cue `.spp` package and returns it with the
   * reader's unlock for it; both then return in `registeredMediaPacks` and
   * `mediaPackEntitlements`.
   */
  importMediaPack?: (file: Blob) => Promise<{ pack: MediaPack; entitlement: MediaPackEntitlement }>;
  /** Host-remembered model choice (the Model Router); used whenever the server offers it. */
  preferredModel?: string;
  /**
   * How far SEN's Holdings fixer may go after each chapter: the Library's
   * control over it, where the Familiar will take over. Absent: records and,
   * one at a time, sentences.
   */
  holdingsFixer?: HarnessHoldingsFixerPolicy;
}

/** A reader's HARNESS stories, open and ready to read and continue. */
export interface LibraryStories {
  controller: HarnessGenerationController;
  /** The stories; absent until storage is open, so a missing story is never reported early. */
  state?: HarnessWorkspaceState;
  serverInfo?: HarnessGenerationServerInfo;
  /** The model chapters are written with. */
  model: string;
  setModel: (model: string) => void;
  /** Why the stories or the writer could not be reached. */
  loadError?: string;
  /** Tries again whichever failed: opening the stories, reaching the writer, or both. */
  retry: () => void;
  /** True when a chapter can be written now. */
  canGenerate: boolean;
  /**
   * Writes the story's next chapter with the current model, or finishes the
   * one a closed browser interrupted (from its saved reply when there is one).
   */
  generateNextChapter: (storyId: string) => Promise<void>;
  /** Writes the story's latest chapter again with the current model, with the reader's optional note. */
  rewriteLatestChapter: (storyId: string, note?: string) => Promise<void>;
  /** Plans the goals of the arc a story's next chapter begins, with the chosen model. */
  planArc: (storyId: string) => Promise<void>;
  /** The skills Story Settings offers: the host's installed skills and SEN's bundled ones. */
  skills: HarnessSkillManifest[];
  /** The host's registered Media Packs, and the reader's unlocks, for Story Settings' Media Loadout. */
  mediaPacks: readonly MediaPack[];
  mediaPackEntitlements: readonly MediaPackEntitlement[];
  /** The host's Sound Words presets; the first is a new story's. */
  soundWordPresets: readonly SoundWordsPreset[];
  /** Installs a Sound Words package, when the host offers it. */
  importSoundWords?: (file: Blob) => Promise<SoundWordsPreset>;
  /** What each Media Loadout slot plays with no pack: the Library's own, where the host has it. */
  mediaDefaults: Partial<Record<StoryMediaLoadoutSlot, string>>;
  /** Installs a media package, when the host offers it. */
  importMediaPack?: (file: Blob) => Promise<MediaPack>;
  /** Checks a skill package, when the host lets readers install skills. */
  skillIntake?: SkillPackageIntake;
  /** Installs a skill: it can be equipped at once. */
  installSkill?: (skill: HarnessSkillManifest) => void;
}

const EMPTY_SKILLS: HarnessSkillManifest[] = [];
const EMPTY_MEDIA_PACKS: MediaPack[] = [];
const EMPTY_ENTITLEMENTS: MediaPackEntitlement[] = [];
const EMPTY_PRESETS: SoundWordsPreset[] = [];

/**
 * The Library's HARNESS stories for one host: one controller with the
 * Library's defaults, opened from the host's storage and kept current. The
 * Codex waits, so story memory is read from a chapter only on request: a
 * chapter is ready to read as soon as it is saved.
 */
export function useLibraryStories({
  repository,
  modelAdapter,
  installedSkills = EMPTY_SKILLS,
  registeredMediaPacks = EMPTY_MEDIA_PACKS,
  mediaPackEntitlements = EMPTY_ENTITLEMENTS,
  baseMedia,
  soundWordPresets = EMPTY_PRESETS,
  importSoundWords,
  skillIntake,
  installSkill: keepSkill,
  importMediaPack: installMediaPack,
  preferredModel,
  holdingsFixer = 'records-and-sentences',
}: LibraryStoriesOptions): LibraryStories {
  const controller = useMemo(
    () => new HarnessGenerationController({ repository, modelAdapter, media: createLibraryMediaPort({ registered: registeredMediaPacks, entitlements: mediaPackEntitlements, base: baseMedia }) }),
    // The inventory and media follow below without replacing the controller.
    [repository, modelAdapter],
  );
  useEffect(() => controller.setInstalledSkills(installedSkills), [controller, installedSkills]);
  useEffect(() => controller.setHoldingsFixer(holdingsFixer), [controller, holdingsFixer]);
  useEffect(() => controller.setMediaPort(createLibraryMediaPort({ registered: registeredMediaPacks, entitlements: mediaPackEntitlements, base: baseMedia })), [controller, registeredMediaPacks, mediaPackEntitlements, baseMedia]);
  const [snapshot, setSnapshot] = useState<HarnessWorkspaceState>();
  // The controller's snapshot before storage opens is empty: it is held back,
  // so a host never reports a stored story missing while it is still opening.
  const [opened, setOpened] = useState(false);
  const [serverInfo, setServerInfo] = useState<HarnessGenerationServerInfo>();
  const [model, setModel] = useState('');
  const [storageError, setStorageError] = useState<string>();
  const [writerError, setWriterError] = useState<string>();
  const [storageAttempt, setStorageAttempt] = useState(0);
  const [writerAttempt, setWriterAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setOpened(false);
    setStorageError(undefined);
    const unsubscribe = controller.subscribe(next => {
      if (active) setSnapshot(next);
    });
    void controller.hydrate().then(
      () => { if (active) setOpened(true); },
      error => { if (active) setStorageError(error instanceof Error ? error.message : 'Your stories could not be opened.'); },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [controller, storageAttempt]);

  useEffect(() => {
    let active = true;
    setWriterError(undefined);
    void modelAdapter.getServerInfo().then(
      info => {
        if (!active) return;
        setServerInfo(info);
        setModel(current => current || info.defaultModel);
      },
      error => { if (active) setWriterError(error instanceof Error ? error.message : 'The writer could not be reached.'); },
    );
    return () => { active = false; };
  }, [modelAdapter, writerAttempt]);

  // Follow the host's remembered choice (the Model Router) whenever the server offers it.
  useEffect(() => {
    if (preferredModel && serverInfo?.models.some(option => option.id === preferredModel)) setModel(preferredModel);
  }, [preferredModel, serverInfo]);

  const retry = useCallback(() => {
    if (storageError) setStorageAttempt(value => value + 1);
    if (writerError) setWriterAttempt(value => value + 1);
  }, [storageError, writerError]);
  const generateNextChapter = useCallback(async (storyId: string) => {
    await controller.writeNextChapter(storyId, model);
  }, [controller, model]);
  const rewriteLatestChapter = useCallback(async (storyId: string, note?: string) => {
    await controller.rewriteLatestChapter(storyId, model, note);
  }, [controller, model]);
  const planArc = useCallback(async (storyId: string) => {
    await controller.planNextArc(storyId, model);
  }, [controller, model]);
  const state = opened ? snapshot : undefined;
  const skills = useMemo(() => includeBundledHarnessSkills(installedSkills), [installedSkills]);
  // An installed skill joins the controller's catalog at once, so it can be equipped before the host's list returns.
  const installSkill = useMemo(() => keepSkill && ((skill: HarnessSkillManifest) => {
    controller.setInstalledSkills([...installedSkills.filter(item => item.id !== skill.id || item.version !== skill.version), skill]);
    keepSkill(skill);
  }), [controller, installedSkills, keepSkill]);
  // An installed pack joins the controller's media at once, so it can be equipped before the host's lists return.
  const importMediaPack = useMemo(() => installMediaPack && (async (file: Blob) => {
    const { pack, entitlement } = await installMediaPack(file);
    controller.setMediaPort(createLibraryMediaPort({
      registered: [...registeredMediaPacks.filter(item => item.id !== pack.id || item.version !== pack.version), pack],
      entitlements: [...mediaPackEntitlements, entitlement],
      base: baseMedia,
    }));
    return pack;
  }), [controller, installMediaPack, registeredMediaPacks, mediaPackEntitlements, baseMedia]);
  const mediaDefaults = useMemo(() => ({
    ...(baseMedia?.soundscapes.length ? { soundscapes: 'The Library’s own Soundscapes' } : {}),
    ...(baseMedia?.soundCues.length ? { soundCues: 'The Library’s own Sound Cues' } : {}),
  }), [baseMedia]);

  return {
    controller, state, serverInfo, model, setModel, loadError: storageError ?? writerError, retry,
    canGenerate: Boolean(state && serverInfo?.configured && model),
    generateNextChapter,
    rewriteLatestChapter,
    planArc,
    skills,
    mediaPacks: registeredMediaPacks,
    mediaPackEntitlements,
    soundWordPresets,
    ...(importSoundWords ? { importSoundWords } : {}),
    mediaDefaults,
    ...(importMediaPack ? { importMediaPack } : {}),
    ...(skillIntake ? { skillIntake } : {}),
    ...(installSkill ? { installSkill } : {}),
  };
}
