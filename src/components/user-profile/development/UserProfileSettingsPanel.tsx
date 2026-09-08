import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Camera,
  Cloud,
  CloudOff,
  Download,
  Globe,
  Keyboard,
  LogOut,
  Mountain,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { LibraryButton, LibraryTextBox } from '@seihouse/library-ui';
import {
  SEIDisclosure,
  SEIDisclosureGroup,
  SEIDrawer,
  SEIDrawerBody,
  SEIDrawerContent,
  SEIDrawerDescription,
  SEIDrawerHeader,
  SEIDrawerTitle,
  SEIField,
  SEISelect,
  SEISwitch,
} from '@seihouse/ui';
import type { AppUser, ChapterWritingStyle, Story } from '../shared/types';
import { useUserProfileServices, type UserProfileController } from '../shared/userProfileServices';
import { CHAPTER_WRITING_STYLE_OPTIONS, normalizeChapterWritingStyle } from './chapterWritingStyle';
import {
  MASTER_RANK,
  RANKS,
  getAuraSelection,
  getAuraSwatchStyle,
  getAuraTextStyle,
  rankToken,
  resolveRankVisual,
} from './qi';
import { CAVE_ENVIRONMENTS } from './caveEnvironment';

/** The persisted language option values, exactly as production stores them. */
const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'Simplified Chinese (简体中文)',
  'Traditional Chinese (繁體中文)',
  'Japanese (日本語)',
  'Korean (한국어)',
  'Vietnamese (Tiếng Việt)',
  'Indonesian (Bahasa Indonesia)',
  'Thai (ภาษาไทย)',
  'Tagalog (Filipino)',
  'Malay (Bahasa Melayu)',
] as const;

const IDENTITY_FIELDS = ['username', 'displayName', 'displayNameColor'] as const;

interface UserProfileSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controller: UserProfileController;
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  environmentId: string;
  onEnvironmentChange: (id: string) => void;
  ambientMotes: boolean;
  onAmbientMotesChange: (on: boolean) => void;
  onOpenPortrait: () => void;
  onOpenSwitchboard: () => void;
}

/**
 * The gear-triggered Settings panel: every profile control that is not one of
 * the four Cave destinations lives here — identity and Celestial Aura editing,
 * portrait controls, the cave environment, language, writing preferences,
 * Harmony sync, backup and import, the advanced tools, Sever Link, and the
 * authorized Akashic Switchboard entry.
 *
 * All state and behaviour is the controller's; this file only arranges it.
 */
export function UserProfileSettingsPanel({
  open,
  onOpenChange,
  controller,
  currentUser,
  stories,
  onLogout,
  environmentId,
  onEnvironmentChange,
  ambientMotes,
  onAmbientMotesChange,
  onOpenPortrait,
  onOpenSwitchboard,
}: UserProfileSettingsPanelProps) {
  // Production reads the local-only flag and its setter from `lib/firebase` and
  // calls the deep library sync on `lib/storage`. All three arrive through the
  // injected services port instead.
  const {
    localOnlyMode: LOCAL_ONLY_MODE,
    setLocalOnlyMode,
    requestLibrarySync,
  } = useUserProfileServices();
  const {
    profile,
    formData,
    setFormData,
    handleChange,
    handleSave,
    colorInputRef,
    syncStatus,
    lastSavedTime,
    handleLanguageChangeDirect,
    handleDefaultChapterWritingStyleChange,
    isSavingChapterWritingStyle,
    setIsSettingsOpen,
    setIsShortcutsOpen,
    handleExportLibrary,
    handleImportLibrary,
  } = controller;

  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const currentXp = profile?.dao_xp || profile?.qi || 0;
  const isMaster = currentXp >= MASTER_RANK.unlockedAt;
  const selectedAura = formData.displayNameColor ?? profile?.displayNameColor;
  const auraSelection = getAuraSelection(selectedAura, currentXp);
  const previewStyle = getAuraTextStyle(auraSelection, profile?.activeStatusEffects, currentXp);
  // A custom spectrum is any stored value that resolves to the cultivator's own
  // colour rather than to a rank on the ladder.
  const isCustomSelected = Boolean(selectedAura) && resolveRankVisual(selectedAura, currentXp).source === 'custom';
  const isIdentityDirty = IDENTITY_FIELDS.some(field => (formData[field] ?? '') !== (profile?.[field] ?? ''));
  const isPrivileged = profile?.role === 'owner' || profile?.role === 'admin';

  const saveIdentity = async () => {
    setIsSavingIdentity(true);
    try {
      await handleSave();
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const discardIdentity = () => {
    setFormData(previous => ({
      ...previous,
      username: profile?.username,
      displayName: profile?.displayName,
      displayNameColor: profile?.displayNameColor,
    }));
  };

  // ---- Harmony (production behaviour, verbatim) ----------------------------
  const isHarmonizing = syncStatus === 'syncing';
  const harmonyDetail = syncStatus === 'offline'
    ? 'Offline'
    : isHarmonizing
      ? 'Harmonizing…'
      : syncStatus === 'error'
        ? 'Needs attention'
        : 'Press to sync';
  const harmonyTitle = syncStatus === 'offline'
    ? LOCAL_ONLY_MODE
      ? 'Harmony is in legacy device-only mode. Activate to reconnect cloud storage.'
      : 'Harmony is offline. Reconnect, then activate it to reconcile your devices.'
    : isHarmonizing
      ? 'Harmony is synchronizing your library.'
      : syncStatus === 'error'
        ? 'Harmony needs attention. Activate it to reconcile queued and remote changes.'
        : 'Activate Harmony to reconcile every story and chapter across your devices.';
  const activateHarmony = () => {
    if (LOCAL_ONLY_MODE) {
      setLocalOnlyMode(false);
      return;
    }
    requestLibrarySync();
  };
  const HarmonyIcon = syncStatus === 'offline'
    ? CloudOff
    : isHarmonizing
      ? RefreshCw
      : syncStatus === 'error'
        ? AlertTriangle
        : Cloud;

  return (
    <SEIDrawer open={open} onOpenChange={next => onOpenChange(next)}>
      <SEIDrawerContent side="right" tone="dark" className="z-[310] sm:max-w-[30rem]" backdropClassName="z-[300]" data-cave-settings>
        <SEIDrawerHeader>
          <div className="flex items-center gap-3">
            <Sliders size={18} aria-hidden="true" className="text-[#e2c46a]" />
            <div>
              <SEIDrawerTitle className="cave-title font-display text-xl">Settings</SEIDrawerTitle>
              <SEIDrawerDescription>Everything about your cultivator that is not a destination.</SEIDrawerDescription>
            </div>
          </div>
        </SEIDrawerHeader>

        <SEIDrawerBody className="text-neutral-300">
          <SEIDisclosureGroup type="multiple" defaultValue={['identity']}>
            {/* ---- Identity & Aura ------------------------------------------ */}
            <SEIDisclosure value="identity" heading="Identity & Celestial Aura" icon={UserIcon} supportingText="Dao name, display name, and the aura your name carries.">
              <div className="space-y-4 pt-1">
                <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center">
                  <p className="font-sc text-[9px] uppercase tracking-widest text-neutral-500">Preview</p>
                  <p className="mt-1 font-serif text-lg italic">
                    <span className={previewStyle.className || 'text-neutral-100'} style={previewStyle.style}>
                      {formData.displayName || profile?.displayName || 'Unknown Ascendant'}
                    </span>
                  </p>
                </div>

                <LibraryTextBox
                  id="cave-username"
                  label="Username (Dao Name)"
                  value={formData.username || ''}
                  onChange={value => setFormData(previous => ({ ...previous, username: value }))}
                  placeholder="Enter Dao Name"
                  size="compact"
                  disabled={!profile}
                />
                <LibraryTextBox
                  id="cave-display-name"
                  label="Display Name"
                  value={formData.displayName || ''}
                  onChange={value => setFormData(previous => ({ ...previous, displayName: value }))}
                  placeholder="Your identity…"
                  size="compact"
                  disabled={!profile}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <Sparkles size={11} aria-hidden="true" className="text-[#7dd3ff]" /> Celestial Aura
                    </p>
                    <p className="font-mono text-[9px] text-neutral-500">Current XP: {currentXp.toLocaleString()} Qi</p>
                  </div>
                  {/* One row per rank: the name, its colour, and the Qi it costs. */}
                  <div role="radiogroup" aria-label="Celestial Aura rank" className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {RANKS.map(rank => {
                      const token = rankToken(rank);
                      const isUnlocked = currentXp >= rank.unlockedAt;
                      const isSelected = auraSelection === token;
                      return (
                        <button
                          key={rank.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={!isUnlocked || !profile}
                          onClick={() => setFormData(previous => ({ ...previous, displayNameColor: token }))}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                            !isUnlocked
                              ? 'cursor-not-allowed border-white/5 bg-black/30 opacity-60'
                              : isSelected
                                ? 'border-[#04ACFF] bg-[#04ACFF]/10'
                                : 'border-white/10 bg-black/30 hover:border-white/25'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-6 w-6 shrink-0 rounded-full border border-black/50 ${!isUnlocked ? 'grayscale' : ''}`}
                            style={getAuraSwatchStyle(rank.visual)}
                          />
                          <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold text-neutral-200">
                            {rank.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] tracking-wider text-neutral-400">
                            {rank.unlockedAt.toLocaleString()} Qi
                          </span>
                          {isSelected ? (
                            <span className="shrink-0 rounded-full bg-[#04ACFF] px-2 py-0.5 font-sc text-[9px] font-bold uppercase tracking-widest text-black">
                              Equipped
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* The Master endgame: the cultivator's own colour, in place of the ladder's. */}
                  <div className={`flex items-center gap-3 border-t border-white/10 pt-3 ${isMaster ? '' : 'opacity-50'}`}>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!isMaster}
                        onClick={() => { if (isMaster) colorInputRef.current?.click(); }}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 motion-reduce:transform-none ${
                          isCustomSelected ? 'border-[#04ACFF] ring-2 ring-[#04ACFF]/30' : 'border-white/20'
                        }`}
                        style={getAuraSwatchStyle(MASTER_RANK.visual)}
                        title={isMaster ? 'Custom Color Spectrum…' : `Locked until ${MASTER_RANK.name}`}
                        aria-label="Custom spectrum"
                      >
                        {isCustomSelected ? (
                          <span className="h-2.5 w-2.5 rounded-full border border-black" style={{ backgroundColor: formData.displayNameColor }} />
                        ) : null}
                      </button>
                      <input
                        ref={colorInputRef}
                        type="color"
                        name="displayNameColor"
                        disabled={!isMaster}
                        value={isCustomSelected && formData.displayNameColor ? formData.displayNameColor : '#00FFFF'}
                        onChange={handleChange}
                        className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-neutral-400">
                        Custom Spectrum
                        {!isMaster ? (
                          <span className="ml-2 rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-neutral-500">
                            Requires {MASTER_RANK.name} ({MASTER_RANK.unlockedAt.toLocaleString()} Qi)
                          </span>
                        ) : null}
                      </p>
                      <p className="font-sans text-[9px] italic text-neutral-500">
                        {isMaster ? 'Click the sphere to define your custom frequency' : 'Transcend normal UI limits'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <LibraryButton
                    variant="primary"
                    fullWidth
                    loading={isSavingIdentity}
                    disabled={!profile || !isIdentityDirty || isSavingIdentity}
                    onClick={() => void saveIdentity()}
                  >
                    Guard Changes
                  </LibraryButton>
                  <LibraryButton variant="ghost" fullWidth disabled={!isIdentityDirty || isSavingIdentity} onClick={discardIdentity}>
                    Discard
                  </LibraryButton>
                </div>
              </div>
            </SEIDisclosure>

            {/* ---- Portrait -------------------------------------------------- */}
            <SEIDisclosure value="portrait" heading="Cultivator Portrait" icon={Camera} supportingText="Cast your likeness through the Divine Mirror.">
              <div className="flex items-center gap-4 pt-1">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#d4af37]/50 bg-black">
                  {formData.avatarUrl || profile?.avatarUrl ? (
                    <img src={formData.avatarUrl || profile?.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-neutral-600"><UserIcon size={24} aria-hidden="true" /></span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-sans text-[11px] text-neutral-400">
                    {profile?.activePortraitId ? 'A sealed portrait is active.' : 'No portrait has been sealed yet.'}
                  </p>
                  <LibraryButton variant="secondary" size="sm" icon={Sparkles} disabled={!profile} onClick={onOpenPortrait}>
                    Open Divine Mirror
                  </LibraryButton>
                </div>
              </div>
            </SEIDisclosure>

            {/* ---- Cave environment ------------------------------------------ */}
            <SEIDisclosure value="environment" heading="Cave Environment" icon={Mountain} supportingText="The realm seen from your cave mouth.">
              <div className="space-y-3 pt-1">
                <div role="radiogroup" aria-label="Cave environment" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CAVE_ENVIRONMENTS.map(environment => {
                    const isSelected = environment.id === environmentId;
                    return (
                      <button
                        key={environment.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onEnvironmentChange(environment.id)}
                        className={`group relative overflow-hidden rounded-lg border text-left transition-colors ${
                          isSelected ? 'border-[#e2c46a]' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={environment.src} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-4">
                          <span className="block truncate font-sc text-[10px] font-bold uppercase tracking-wider text-neutral-100">{environment.name}</span>
                          <span className="block truncate font-sans text-[9px] text-neutral-400">{environment.mood}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <SEISwitch isSelected={ambientMotes} onChange={onAmbientMotesChange} size="compact">
                  Ambient spirit motes
                </SEISwitch>
              </div>
            </SEIDisclosure>

            {/* ---- Language -------------------------------------------------- */}
            <SEIDisclosure value="language" heading="Language" icon={Globe} supportingText="Interface dialect and automatic translation.">
              <div className="space-y-3 pt-1">
                <SEIField label="Preferred Language" htmlFor="cave-preferred-language" helperText="Active UI dialect" size="compact">
                  <SEISelect
                    id="cave-preferred-language"
                    name="preferredLanguage"
                    size="compact"
                    disabled={!profile}
                    value={formData.preferredLanguage || profile?.preferredLanguage || 'English'}
                    onChange={event => handleLanguageChangeDirect('preferredLanguage', event.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </SEISelect>
                </SEIField>
                <SEIField label="Translation Default" htmlFor="cave-translation-language" helperText="Automatic translation" size="compact">
                  <SEISelect
                    id="cave-translation-language"
                    name="defaultTranslationLanguage"
                    size="compact"
                    disabled={!profile}
                    value={formData.defaultTranslationLanguage || profile?.defaultTranslationLanguage || 'English'}
                    onChange={event => handleLanguageChangeDirect('defaultTranslationLanguage', event.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </SEISelect>
                </SEIField>
                <p className="font-sans text-[10px] text-neutral-500">
                  A language change asks for confirmation and reverts on its own after 30 seconds.
                </p>
              </div>
            </SEIDisclosure>

            {/* ---- Writing preferences -------------------------------------- */}
            <SEIDisclosure value="writing" heading="Writing Preferences" icon={BookOpen} supportingText="Defaults copied onto newly created stories.">
              <div className="pt-1">
                <SEIField label="Default Chapter Writing Style" htmlFor="cave-writing-style" helperText="Used when a new story is created" size="compact" disabled={!profile || isSavingChapterWritingStyle}>
                  <SEISelect
                    id="cave-writing-style"
                    size="compact"
                    value={normalizeChapterWritingStyle(formData.defaultChapterWritingStyle ?? profile?.defaultChapterWritingStyle)}
                    onChange={event => { void handleDefaultChapterWritingStyleChange(event.target.value as ChapterWritingStyle); }}
                    disabled={!profile || isSavingChapterWritingStyle}
                    loading={isSavingChapterWritingStyle}
                    loadingLabel="Saving writing style"
                  >
                    {CHAPTER_WRITING_STYLE_OPTIONS.map(style => <option key={style} value={style}>{style}</option>)}
                  </SEISelect>
                </SEIField>
              </div>
            </SEIDisclosure>

            {/* ---- Sync ------------------------------------------------------ */}
            <SEIDisclosure value="sync" heading="Harmony & Sync" icon={Cloud} supportingText={LOCAL_ONLY_MODE ? 'Legacy device-only mode.' : 'Cloud storage across your devices.'}>
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={activateHarmony}
                  disabled={isHarmonizing}
                  title={harmonyTitle}
                  aria-label={`Harmony: ${harmonyDetail}`}
                  aria-busy={isHarmonizing}
                  className={`flex w-full items-center gap-3 rounded-lg border bg-black/40 px-4 py-3 text-left transition-colors disabled:cursor-wait ${
                    syncStatus === 'error'
                      ? 'border-[#ff3333]/40 text-[#ff3333] hover:bg-[#ff3333]/10'
                      : syncStatus === 'offline'
                        ? 'border-white/10 text-neutral-500 hover:border-[#04ACFF]/40 hover:text-[#7dd3ff]'
                        : 'border-[#04ACFF]/30 text-[#7dd3ff] hover:border-[#04ACFF]/60 hover:bg-[#04ACFF]/5'
                  }`}
                >
                  <HarmonyIcon size={16} aria-hidden="true" className={isHarmonizing ? 'animate-spin motion-reduce:animate-none' : ''} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-sc text-[11px] font-bold uppercase tracking-widest">Harmony</span>
                    <span aria-live="polite" className="font-sans text-[9px] font-medium uppercase tracking-[0.16em] opacity-70">{harmonyDetail}</span>
                  </span>
                  {isHarmonizing ? (
                    <span className="sr-only">Library synchronization is in progress.</span>
                  ) : (
                    <span className="sr-only">Activate to reconcile every story and chapter now.</span>
                  )}
                </button>
                {lastSavedTime ? (
                  <p className="font-mono text-[10px] tracking-wider text-neutral-500">
                    Saved on device: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                ) : null}
              </div>
            </SEIDisclosure>

            {/* ---- Backup & import ------------------------------------------ */}
            <SEIDisclosure value="backup" heading="Backup, Import & Export" icon={Archive} supportingText="Move your whole library as a scroll.">
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <input
                  ref={importInputRef}
                  id="cave-import-scroll"
                  type="file"
                  accept=".json"
                  onChange={handleImportLibrary}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <LibraryButton variant="secondary" fullWidth icon={Upload} onClick={() => importInputRef.current?.click()}>
                  Import Scroll
                </LibraryButton>
                <LibraryButton variant="secondary" fullWidth icon={Download} disabled={stories.length === 0} onClick={handleExportLibrary}>
                  Backup All
                </LibraryButton>
              </div>
            </SEIDisclosure>

            {/* ---- Advanced tools ------------------------------------------- */}
            <SEIDisclosure value="advanced" heading="Advanced Tools" icon={Sliders} supportingText="Model presets, routing overrides, and shortcuts.">
              <div className="space-y-3 pt-1">
                <p className="font-sans text-[10px] text-neutral-500">
                  Configure custom model presets, routing overrides, or API credential endpoints.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LibraryButton variant="secondary" fullWidth icon={Sliders} title="Aether Router" onClick={() => setIsSettingsOpen(true)}>
                    Aether Router
                  </LibraryButton>
                  <LibraryButton variant="secondary" fullWidth icon={Keyboard} title="Shortcuts Manual (or press ? key)" onClick={() => setIsShortcutsOpen(true)}>
                    Shortcuts
                  </LibraryButton>
                </div>
              </div>
            </SEIDisclosure>

            {/* ---- Authorized controls --------------------------------------- */}
            {isPrivileged ? (
              <SEIDisclosure value="authorized" heading="Authorized Controls" icon={Shield} supportingText={`Signed in with ${profile?.role} authority.`}>
                <div className="pt-1">
                  <LibraryButton variant="danger" fullWidth icon={Shield} onClick={onOpenSwitchboard}>
                    Open Akashic Switchboard
                  </LibraryButton>
                </div>
              </SEIDisclosure>
            ) : null}

            {/* ---- Account --------------------------------------------------- */}
            <SEIDisclosure value="account" heading="Account" icon={LogOut} supportingText={currentUser?.email ? `Linked as ${currentUser.email}` : 'Linked spirit'}>
              <div className="pt-1">
                <LibraryButton variant="danger" fullWidth icon={LogOut} onClick={onLogout}>
                  Sever Link
                </LibraryButton>
              </div>
            </SEIDisclosure>
          </SEIDisclosureGroup>
        </SEIDrawerBody>
      </SEIDrawerContent>
    </SEIDrawer>
  );
}
