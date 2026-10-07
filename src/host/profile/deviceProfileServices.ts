/**
 * The Cave's services for a host with no account server yet (the NovelExpanded
 * app, until its database). The profile record lives on this device
 * (`deviceProfile.ts`); balances, rewards and Familiar ownership come from the
 * Library economy's own clients, mounted by the host; and the account and
 * server pieces (portrait generation, sign-out, sync, backup, the Aether
 * Router, code redemption, the Inbox) still show, each with the host's note.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { DEFAULT_SEN_LANGUAGE_CODE, type SenLanguageCode } from '@seihouse/sen/contracts';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { downloadStorySeed, downloadStorySeedCollection, reconcileStorySeedBlueprint, type StorySeedRecord, type StorySeedRepository } from '@seihouse/sen/story-seed';
import { getDaoRankData, resolvePermanentDaoXp } from '@seihouse/library/cultivation';
import { normalizeFamiliarSize, type FamiliarOption } from '@seihouse/library/familiar';
import type { CelestialStoreAccountServices } from '@seihouse/library/celestial-store';
import type {
  ChapterWritingStyle, UserProfile, UserProfileController, UserProfileControllerProps, UserProfileNotYetBuilt, UserProfileServices,
} from '@seihouse/library/profile';
import { useDeviceProfile, type DeviceProfileStore } from './deviceProfile';

/** How long a language change waits for the reader's confirmation before it reverts. */
const LANGUAGE_CONFIRM_SECONDS = 30;

/** The fields the Cave's identity form saves; everything else has its own control. */
const IDENTITY_FIELDS = ['displayName', 'displayNameColor'] as const;

const noop = () => undefined;

/** A seed exported the way Story Seed exports it: its Blueprint reconciled with the seed first. */
function exportedSeed(record: StorySeedRecord) {
  const reconciled = record.blueprint
    ? reconcileStorySeedBlueprint(record.seed, record.blueprint, { createdAt: record.createdAt, updatedAt: record.updatedAt })
    : undefined;
  return { seed: reconciled?.seed ?? record.seed, blueprint: reconciled?.blueprint, originalLanguage: record.originalLanguage };
}

export interface DeviceProfileServicesOptions {
  store: DeviceProfileStore;
  /** The host's Familiar catalogue. Which ones the reader owns comes from the Store account. */
  familiars: readonly FamiliarOption[];
  celestialStore?: CelestialStoreAccountServices;
  /** The host's device preferences, for Settings › Sound (Menu music). */
  soundPreferences?: ReaderPreferenceStorage;
  /** The reader's Story Seeds, for the Cave's Stories page and its exports. */
  storySeeds?: { repository: StorySeedRepository; ownerId: string };
  /** What this host has not built yet, each shown with the note. */
  notYetBuilt?: UserProfileNotYetBuilt;
}

export function createDeviceProfileServices({ store, familiars, celestialStore, soundPreferences, storySeeds, notYetBuilt }: DeviceProfileServicesOptions): UserProfileServices {
  const records = async () => storySeeds ? storySeeds.repository.list(storySeeds.ownerId) : [];
  const generationNote = notYetBuilt?.features.includes('portrait-generation') ? notYetBuilt.note : undefined;
  return {
    notYetBuilt,
    familiars,
    celestialStore,
    soundPreferences,
    useController: props => useDeviceProfileController(store, props, { familiars, generationNote }),
    // The host signs its one device reader in; the Spirit Link gate never shows.
    authenticate: noop,
    localOnlyMode: false,
    setLocalOnlyMode: noop,
    requestLibrarySync: noop,
    listStorySeeds: async () => (await records()).map(({ id, userId, title, createdAt, updatedAt }) => ({ id, userId, title, createdAt, updatedAt })),
    downloadStorySeed: async seed => {
      const record = (await records()).find(candidate => candidate.id === seed.id);
      if (!record) throw new Error('That Story Seed is no longer on this device.');
      const { seed: input, blueprint, originalLanguage } = exportedSeed(record);
      await downloadStorySeed(input, blueprint, originalLanguage);
    },
    downloadStorySeedCollection: async seeds => {
      const ids = new Set(seeds.map(seed => seed.id));
      await downloadStorySeedCollection((await records()).filter(record => ids.has(record.id)).map(exportedSeed));
    },
  };
}

/**
 * The Cave's controller over the device record: edits, the 30-second
 * language confirmation, the default Reading Mode, the equipped Familiar and
 * its size, and the portrait builder's reference image. Saves are immediate;
 * there is no server to wait on.
 */
export function useDeviceProfileController(
  store: DeviceProfileStore,
  { currentUser, stories }: UserProfileControllerProps,
  { familiars, generationNote }: { familiars: readonly FamiliarOption[]; generationNote?: string },
): UserProfileController {
  const record = useDeviceProfile(store);
  const profile = currentUser ? record : null;
  const [formData, setFormData] = useState<Partial<UserProfile>>(() => store.read());
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'stories'>('users');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [pendingLanguageChange, setPendingLanguageChange] = useState<UserProfileController['pendingLanguageChange']>(null);
  const [countdown, setCountdown] = useState(LANGUAGE_CONFIRM_SECONDS);
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [portraitUploadFile, setPortraitUploadFile] = useState<File | null>(null);
  const [portraitUploadBase64, setPortraitUploadBase64] = useState('');
  const [portraitDesc, setPortraitDesc] = useState('');
  const [portraitError, setPortraitError] = useState('');

  /** Saves `changes` and brings the form's copy of exactly those fields up to date, leaving other drafts alone. */
  const commit = useCallback((changes: Partial<UserProfile>) => {
    store.save(changes);
    setFormData(previous => ({ ...previous, ...changes }));
  }, [store]);

  // A language change reverts on its own unless the reader confirms it in time.
  useEffect(() => {
    if (!pendingLanguageChange) return;
    if (countdown <= 0) {
      setFormData(previous => ({
        ...previous,
        interfaceLanguage: pendingLanguageChange.previousInterfaceLanguage,
        defaultReadingLanguage: pendingLanguageChange.previousReadingLanguage,
      }));
      setPendingLanguageChange(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, pendingLanguageChange]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(previous => ({ ...previous, [event.target.name]: event.target.value }));
  }, []);

  const performSave = useCallback((interfaceLanguage: SenLanguageCode, defaultReadingLanguage: SenLanguageCode) => {
    if (!profile) return;
    const changes: Partial<UserProfile> = { interfaceLanguage, defaultReadingLanguage };
    for (const field of IDENTITY_FIELDS) {
      if (formData[field] !== undefined && formData[field] !== profile[field]) changes[field] = formData[field];
    }
    setError('');
    commit(changes);
    setIsEditing(false);
  }, [commit, formData, profile]);

  const openLanguageConfirmation = useCallback((interfaceLanguage: SenLanguageCode, readingLanguage: SenLanguageCode) => {
    if (!profile) return;
    setPendingLanguageChange({
      interfaceLanguage,
      readingLanguage,
      previousInterfaceLanguage: profile.interfaceLanguage || DEFAULT_SEN_LANGUAGE_CODE,
      previousReadingLanguage: profile.defaultReadingLanguage || DEFAULT_SEN_LANGUAGE_CODE,
    });
    setCountdown(LANGUAGE_CONFIRM_SECONDS);
  }, [profile]);

  const handleSave = useCallback(() => {
    if (!profile) return;
    const interfaceLanguage = formData.interfaceLanguage || DEFAULT_SEN_LANGUAGE_CODE;
    const readingLanguage = formData.defaultReadingLanguage || DEFAULT_SEN_LANGUAGE_CODE;
    const languageChanged = interfaceLanguage !== profile.interfaceLanguage || readingLanguage !== profile.defaultReadingLanguage;
    if (languageChanged && !pendingLanguageChange) {
      openLanguageConfirmation(interfaceLanguage, readingLanguage);
      return;
    }
    performSave(interfaceLanguage, readingLanguage);
  }, [formData, openLanguageConfirmation, pendingLanguageChange, performSave, profile]);

  const handleLanguageChangeDirect = useCallback((name: 'interfaceLanguage' | 'defaultReadingLanguage', value: SenLanguageCode) => {
    if (!profile) return;
    setFormData(previous => ({ ...previous, [name]: value }));
    if (pendingLanguageChange) return;
    openLanguageConfirmation(
      name === 'interfaceLanguage' ? value : formData.interfaceLanguage || profile.interfaceLanguage || DEFAULT_SEN_LANGUAGE_CODE,
      name === 'defaultReadingLanguage' ? value : formData.defaultReadingLanguage || profile.defaultReadingLanguage || DEFAULT_SEN_LANGUAGE_CODE,
    );
  }, [formData, openLanguageConfirmation, pendingLanguageChange, profile]);

  const confirmLanguageChange = useCallback(() => {
    if (!pendingLanguageChange) return;
    setPendingLanguageChange(null);
    performSave(pendingLanguageChange.interfaceLanguage, pendingLanguageChange.readingLanguage);
  }, [pendingLanguageChange, performSave]);

  const revertLanguageChange = useCallback(() => {
    if (!pendingLanguageChange) return;
    setFormData(previous => ({
      ...previous,
      interfaceLanguage: pendingLanguageChange.previousInterfaceLanguage,
      defaultReadingLanguage: pendingLanguageChange.previousReadingLanguage,
    }));
    setPendingLanguageChange(null);
  }, [pendingLanguageChange]);

  const handleDefaultChapterWritingStyleChange = useCallback(async (value: ChapterWritingStyle) => {
    if (!profile) return;
    commit({ defaultChapterWritingStyle: value });
  }, [commit, profile]);

  const handleFamiliarChange = useCallback((id: string) => {
    if (!profile) return;
    if (!familiars.some(option => option.id === id)) {
      setError('This Familiar is not available for selection.');
      return;
    }
    setError('');
    commit({ familiarId: id });
  }, [commit, familiars, profile]);

  const handleFamiliarSizeChange = useCallback((size: number) => {
    if (!profile) return;
    commit({ familiarSize: normalizeFamiliarSize(size) });
  }, [commit, profile]);

  // The portrait builder keeps its reference image in the page; generating needs the host's image service.
  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setPortraitError('The Divine Mirror only accepts visual images.');
      return;
    }
    setPortraitError('');
    setPortraitUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => setPortraitUploadBase64(String(reader.result ?? ''));
    reader.onerror = () => setPortraitError('Failed to read mortal image stream.');
    reader.readAsDataURL(file);
  }, []);
  const handleDrag = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const handleDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  }, [handleFileChange]);
  const handleGeneratePortrait = useCallback(() => {
    setPortraitError(generationNote ?? 'Portrait generation is not available.');
  }, [generationNote]);

  const rank = getDaoRankData(resolvePermanentDaoXp(profile?.dao_xp, profile?.dao_rank) ?? 0);
  return {
    handleFamiliarChange,
    isSavingFamiliar: false,
    handleFamiliarSizeChange,
    syncStatus: 'idle',
    lastSavedTime: profile ? new Date(profile.updatedAt) : null,
    setIsSettingsOpen: noop,
    setIsShortcutsOpen: noop,
    handleExportLibrary: noop,
    handleImportLibrary: noop,
    profile,
    formData,
    setFormData,
    isEditing,
    setIsEditing,
    isLoading: false,
    error,
    colorInputRef,
    handleChange,
    handleSave,
    showAdvanced,
    setShowAdvanced,
    // The device reader is never an owner or admin: the Switchboard needs the account server.
    isAdminPanelOpen,
    setIsAdminPanelOpen,
    adminTab,
    setAdminTab,
    allUsers: [],
    allStories: [],
    isFetchingAdminData: false,
    adminSearchQuery,
    setAdminSearchQuery,
    adminError: '',
    fetchAdminData: noop,
    handleUpdateUserRole: noop,
    handleUpdateUserTier: noop,
    handleDeleteStoryAdmin: noop,
    pendingLanguageChange,
    countdown,
    confirmLanguageChange,
    revertLanguageChange,
    handleLanguageChangeDirect,
    handleDefaultChapterWritingStyleChange,
    isSavingChapterWritingStyle: false,
    showPortraitModal,
    setShowPortraitModal,
    portraitUploadFile,
    setPortraitUploadFile,
    portraitUploadBase64,
    setPortraitUploadBase64,
    portraitDesc,
    setPortraitDesc,
    isGeneratingPortrait: false,
    isSavingPortrait: false,
    generatedPortraitUrl: '',
    portraitError,
    generationStep: 0,
    handleFileChange,
    handleDrag,
    handleDrop,
    handleGeneratePortrait,
    handleApplyPortrait: noop,
    handleLogin: noop,
    daoData: rank,
    activeStoriesCount: stories.filter(story => !story.deleted).length,
    storageType: 'device',
    activeStoryId: null,
    routingConfig: null,
  };
}
