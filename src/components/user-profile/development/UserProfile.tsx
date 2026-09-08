import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronRight,
  CloudOff,
  Flame,
  Gem,
  Globe,
  Orbit,
  Settings,
  Shield,
  Sparkles,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import {
  LibraryButton,
  LibraryCard,
  LibraryCardDescription,
  LibraryCardTitle,
  LibraryPanel,
  ParticleEffect,
} from '@seihouse/library-ui';
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogDescription,
  SEIDialogTitle,
  SEIInlineAlert,
  SEILoadingState,
  SEIProgressBar,
} from '@seihouse/ui';
import type { AppUser, Story } from '../shared/types';
import { useUserProfileServices } from '../shared/userProfileServices';
import { getAuraColorForXp, getAuraGlowStyle, getAuraTextStyle } from './qi';
import {
  CAVE_EMBLEM_SRC,
  CAVE_MOTTO,
  DEFAULT_CAVE_ENVIRONMENT_ID,
  RELICS_TILE_SRC,
  STORIES_TILE_SRC,
  getCaveEnvironment,
  getCultivationStage,
} from './caveEnvironment';
import { UserProfileCaveDestination, type CaveDestinationId } from './UserProfileCaveDestination';
import { UserProfileAdminPanel } from './UserProfileAdminPanel';
import { UserProfileDaoPillarPanel } from './UserProfileDaoPillarPanel';
import { UserProfileInventoryPanel } from './UserProfileInventoryPanel';
import { UserProfilePortraitModal } from './UserProfilePortraitModal';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';
import { UserProfileStatusEffectsPanel } from './UserProfileStatusEffectsPanel';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';
import './userProfile.css';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
}

type CaveView = 'home' | CaveDestinationId;

/** The three Qi cores and their production descriptions, verbatim. */
const QI_CORES = [
  {
    id: 'heavenly',
    label: 'Heavenly Qi',
    accent: '#04ACFF',
    description:
      'Your fundamental essence gained from reading realms, making choices, and overcoming tribulations. Tracks your progression to higher cultivator ranks and determines your celestial aura color.',
  },
  {
    id: 'sect',
    label: 'Sect Qi',
    accent: '#c43a3a',
    description:
      'Essence stored for your upcoming community contribution achievements. Utilized to exchange for special titles, customize sect affiliations, and fund cooperative arrays when the contribution hall is unlocked.',
  },
  {
    id: 'demonic',
    label: 'Demonic Qi',
    accent: '#f59e0b',
    description:
      'Corrupted cultivation power, unlocked from demonic artifacts or taboos. Proceed with caution when harnessing this forbidden essence.',
  },
] as const;

const formatQi = (value: number | undefined | null): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

/**
 * The Cultivator Cave — the profile page as a place. The home shows the
 * cultivator's portrait, identity, rank, and Qi over a stock Immortal Land
 * backdrop, with four destinations (Stories, Relics, Dao Pillar, Active Status
 * Effects) and one gear-triggered Settings panel. Every value and action is the
 * controller's; the Cave only decides where each one lives.
 */
export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome }: UserProfileProps) {
  // Production calls `useUserProfile(...)` and reads the Firebase local-only flag
  // directly. Both arrive through the injected services port here, so this file
  // carries no Firebase, PostgreSQL, or generation dependency of its own.
  const { useController: useUserProfile, localOnlyMode } = useUserProfileServices();
  const controller = useUserProfile({ currentUser, stories, onLogout, onNavigateHome });
  const {
    profile,
    formData,
    isLoading,
    error,
    activeQiTooltip,
    setActiveQiTooltip,
    setIsAdminPanelOpen,
    allUsers,
    allStories,
    adminTab,
    setAdminTab,
    isFetchingAdminData,
    adminSearchQuery,
    setAdminSearchQuery,
    adminError,
    fetchAdminData,
    handleUpdateUserRole,
    handleUpdateUserTier,
    handleDeleteStoryAdmin,
    pendingLanguageChange,
    countdown,
    confirmLanguageChange,
    revertLanguageChange,
    handleLogin,
    handleAttuneArtifact,
    activeStoriesCount,
    currentStreak,
    isCracked,
    daysTo3,
    daysTo10,
    handleRepairPillar,
    handleCheckIn,
    daoData,
    equippedArtifact,
    showPortraitModal,
    setShowPortraitModal,
    portraitUploadFile,
    setPortraitUploadFile,
    portraitUploadBase64,
    setPortraitUploadBase64,
    portraitDesc,
    setPortraitDesc,
    isGeneratingPortrait,
    isSavingPortrait,
    generatedPortraitUrl,
    portraitError,
    generationStep,
    handleGeneratePortrait,
    handleApplyPortrait,
  } = controller;

  const [view, setView] = useState<CaveView>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState(DEFAULT_CAVE_ENVIRONMENT_ID);
  const [ambientMotes, setAmbientMotes] = useState(true);

  const environment = getCaveEnvironment(environmentId);
  const isSignedOut = !currentUser && !localOnlyMode;
  const isPrivileged = profile?.role === 'owner' || profile?.role === 'admin';

  // The Akashic Switchboard is a destination here; the controller still owns
  // when its registries are fetched, keyed off this flag exactly as in production.
  useEffect(() => {
    setIsAdminPanelOpen(view === 'switchboard');
  }, [setIsAdminPanelOpen, view]);

  // Severing the link (or the account changing) always returns to the cave mouth.
  useEffect(() => {
    if (!currentUser) {
      setView('home');
      setSettingsOpen(false);
    }
  }, [currentUser]);

  const openDestination = useCallback((destination: CaveDestinationId) => {
    setSettingsOpen(false);
    setView(destination);
  }, []);
  const returnHome = useCallback(() => setView('home'), []);

  const auraColor = getAuraColorForXp(profile?.displayNameColor, profile?.dao_xp ?? profile?.qi);
  const nameStyle = getAuraTextStyle(auraColor, profile?.activeStatusEffects);
  const heavenlyQi = profile?.heavenly_qi !== undefined ? profile.heavenly_qi : daoData.currentQi;
  const stage = getCultivationStage(daoData.progress, daoData.nextRank);
  const attunedArtifact = (profile?.cosmicInventory || []).find(a => a.id === profile?.equippedArtifactId);
  const activeEffects = profile?.activeStatusEffects ?? [];
  const activeCore = QI_CORES.find(core => core.id === activeQiTooltip);
  const qiValues: Record<(typeof QI_CORES)[number]['id'], number | undefined> = {
    heavenly: profile ? heavenlyQi : undefined,
    sect: profile ? profile.sect_qi || 0 : undefined,
    demonic: profile ? profile.demonic_qi || 0 : undefined,
  };
  const showsRankParticles =
    auraColor === '#FFD700' || auraColor === 'gradient-violet-gold' || auraColor === 'animated-custom';

  const renderHome = () => (
    <div className="md:grid md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
      {/* Portrait and identity */}
      <section aria-labelledby="cave-cultivator-name" className="relative md:sticky md:top-6">
        <div className="relative mx-auto mt-2 flex items-center justify-center">
          <span aria-hidden="true" className="cave-plaque absolute left-0 top-1/2 hidden -translate-y-1/2 min-[380px]:block md:-left-2">
            守心见道
          </span>
          <span aria-hidden="true" className="cave-plaque absolute right-0 top-1/2 hidden -translate-y-1/2 min-[380px]:block md:-right-2">
            静修成空
          </span>

          <div className="relative aspect-square w-[min(58vw,15rem)] md:w-56 lg:w-60">
            <div
              aria-hidden="true"
              className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(4,172,255,0.28),rgba(4,172,255,0.06)_45%,transparent_70%)] blur-xl"
            />
            <div aria-hidden="true" className="cave-portrait-ring cave-drift absolute -inset-1.5 rounded-full opacity-90" />
            <span aria-hidden="true" className="cave-diamond left-1/2 top-[-6px]" />
            <span aria-hidden="true" className="cave-diamond left-1/2 bottom-[-15px]" />
            <span aria-hidden="true" className="cave-diamond left-[-6px] top-1/2" />
            <span aria-hidden="true" className="cave-diamond right-[-15px] top-1/2" />
            <div
              className={`absolute inset-1 rounded-full border p-1 transition-all duration-700 ${getAuraGlowStyle(auraColor, profile?.activeStatusEffects)}`}
              data-cave-portrait
            >
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#04070f]">
                {formData.avatarUrl || profile?.avatarUrl ? (
                  <img
                    src={formData.avatarUrl || profile?.avatarUrl}
                    alt={profile ? `${profile.displayName || profile.username} portrait` : 'Cultivator portrait'}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={56} aria-hidden="true" className="text-neutral-700" />
                )}
                {showsRankParticles ? (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen">
                    <div className="absolute inset-x-0 bottom-2 flex h-8 justify-around opacity-75">
                      <span className="h-1 w-1 animate-ping rounded-full bg-yellow-400 motion-reduce:animate-none" style={{ animationDuration: '3s' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-300 motion-reduce:animate-none" style={{ animationDuration: '2s' }} />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-amber-400 motion-reduce:animate-none" style={{ animationDuration: '2.5s' }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <LibraryPanel
          as="div"
          padding="md"
          className="relative -mt-6 !rounded-[1.35rem] !border-[#d4af37]/45 pt-9 text-center sm:pt-10"
          data-cave-identity
        >
          <span aria-hidden="true" className="cave-diamond left-1/2 top-0" />
          {isLoading && !profile ? (
            <SEILoadingState size="sm" title="Reading your celestial record" className="mx-auto" />
          ) : (
            <>
              <h2 id="cave-cultivator-name" className="flex flex-wrap items-center justify-center gap-2 font-display text-3xl leading-tight sm:text-4xl">
                <span className={nameStyle.className || 'text-neutral-100'} style={nameStyle.style}>
                  {profile?.displayName || 'Unknown Ascendant'}
                </span>
                {attunedArtifact ? (
                  <span
                    className="inline-flex items-center text-[#e2c46a]"
                    title={`Soul Attuned: ${attunedArtifact.name}${attunedArtifact.attributeBoost ? ` (${attunedArtifact.attributeBoost})` : ''}`}
                  >
                    <Award size={20} aria-hidden="true" />
                    <span className="sr-only">
                      Soul Attuned: {attunedArtifact.name}
                      {attunedArtifact.attributeBoost ? ` (${attunedArtifact.attributeBoost})` : ''}
                    </span>
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 font-serif text-sm text-neutral-400">
                @{profile?.username || 'anonymous_cultivator'}
              </p>

              <p className="mt-3 flex items-center justify-center gap-2 font-serif text-base text-neutral-200 sm:text-lg" data-cave-rank>
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border border-[#04ACFF]/60 bg-[#04ACFF]/15 text-[#7dd3ff]">
                  <Sparkles size={12} />
                </span>
                <span>
                  {daoData.rank} · {stage}
                </span>
              </p>

              <div className="mx-auto mt-4 max-w-xs">
                <SEIProgressBar
                  size="sm"
                  tone="sea"
                  value={daoData.progress}
                  aria-label={daoData.nextRank ? `Cultivation toward ${daoData.nextRank}` : 'Cultivation at the peak rank'}
                  valueText={`${formatQi(heavenlyQi)} of ${daoData.maxQi ? formatQi(daoData.maxQi) : 'peak'} Heavenly Qi`}
                  className="[&_[data-slot=progress-bar-track]]:bg-black/70 [&_[data-slot=progress-bar-track]]:ring-1 [&_[data-slot=progress-bar-track]]:ring-[#d4af37]/40"
                />
                <p className="mt-2 font-mono text-sm tracking-wide" data-cave-qi>
                  <span className="text-[#7dd3ff]">{formatQi(heavenlyQi)}</span>
                  <span className="text-neutral-500"> / {daoData.maxQi ? formatQi(daoData.maxQi) : '∞'}</span>
                </p>
                {daoData.nextRank ? (
                  <p className="font-sc text-[9px] uppercase tracking-widest text-neutral-500">
                    Cultivation to {daoData.nextRank}
                  </p>
                ) : (
                  <p className="font-sc text-[9px] uppercase tracking-widest text-[#e2c46a]">Peak of the Dao</p>
                )}
              </div>

              <div role="group" aria-label="Qi cores" className="mt-4 flex flex-wrap justify-center gap-1.5">
                {QI_CORES.map(core => {
                  const isActive = activeQiTooltip === core.id;
                  return (
                    <button
                      key={core.id}
                      type="button"
                      aria-pressed={isActive}
                      aria-describedby={isActive ? 'cave-qi-core-description' : undefined}
                      onClick={() => setActiveQiTooltip(isActive ? null : core.id)}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sc text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-white/5"
                      style={{ borderColor: `${core.accent}66`, color: isActive ? '#fafafa' : core.accent }}
                    >
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: core.accent, boxShadow: `0 0 6px ${core.accent}` }} />
                      {core.label}
                      <span className="font-mono text-[10px] normal-case tracking-normal text-neutral-200">{formatQi(qiValues[core.id])}</span>
                    </button>
                  );
                })}
              </div>
              {activeCore ? (
                <p id="cave-qi-core-description" className="mx-auto mt-2 max-w-xs font-sans text-[11px] leading-relaxed text-neutral-400">
                  {activeCore.description}
                </p>
              ) : null}

              <div className="cave-rule mt-5" aria-hidden="true" />
              <p className="mt-3 font-serif text-sm italic text-[#e2c46a]/90">{CAVE_MOTTO}</p>
            </>
          )}
        </LibraryPanel>
      </section>

      {/* Destinations */}
      <nav aria-label="Cave destinations" className="mt-5 md:mt-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <LibraryCard
            interactive
            padding="none"
            accentColor="#D4AF37"
            aria-label="Stories: Seeds and Manifested Stories"
            onClick={() => openDestination('stories')}
            data-cave-card="stories"
            media={
              <div className="relative aspect-[5/4] sm:aspect-[16/9]">
                <img src={STORIES_TILE_SRC} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" loading="lazy" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/35 to-transparent" />
                <BookOpen aria-hidden="true" size={26} className="absolute bottom-3 left-4 text-[#f5b942] drop-shadow-[0_0_10px_rgba(245,185,66,0.55)]" />
              </div>
            }
          >
            <div className="flex items-end justify-between gap-2 p-3 sm:p-4">
              <div className="min-w-0">
                <LibraryCardTitle as="h3" className="break-normal font-display text-lg font-medium text-neutral-100 sm:text-2xl">Stories</LibraryCardTitle>
                <LibraryCardDescription className="mt-0.5 truncate font-serif text-[11px] text-neutral-400 sm:text-sm">
                  Seeds · Manifested Stories
                </LibraryCardDescription>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                  {activeStoriesCount} manifested
                </p>
              </div>
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/60 text-[#e2c46a]">
                <ChevronRight size={16} />
              </span>
            </div>
          </LibraryCard>

          <LibraryCard
            interactive
            padding="none"
            accentColor="#D4AF37"
            aria-label="Relics: Inventory and Offering Hall"
            onClick={() => openDestination('relics')}
            data-cave-card="relics"
            media={
              <div className="relative aspect-[5/4] sm:aspect-[16/9]">
                <img src={RELICS_TILE_SRC} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" loading="lazy" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/35 to-transparent" />
                <Gem aria-hidden="true" size={26} className="absolute bottom-3 left-4 text-[#7dd3ff] drop-shadow-[0_0_10px_rgba(4,172,255,0.6)]" />
              </div>
            }
          >
            <div className="flex items-end justify-between gap-2 p-3 sm:p-4">
              <div className="min-w-0">
                <LibraryCardTitle as="h3" className="break-normal font-display text-lg font-medium text-neutral-100 sm:text-2xl">Relics</LibraryCardTitle>
                <LibraryCardDescription className="mt-0.5 truncate font-serif text-[11px] text-neutral-400 sm:text-sm">
                  Inventory · Offering Hall
                </LibraryCardDescription>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                  {(profile?.cosmicInventory || []).length} gathered
                </p>
              </div>
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/60 text-[#e2c46a]">
                <ChevronRight size={16} />
              </span>
            </div>
          </LibraryCard>

          <LibraryCard
            interactive
            padding="sm"
            accentColor={isCracked ? '#ff3333' : '#f97316'}
            aria-label={`Dao Pillar: ${isCracked ? 'cracked' : `${currentStreak} day streak`}`}
            onClick={() => openDestination('dao-pillar')}
            data-cave-card="dao-pillar"
            contentClassName="gap-0"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex h-11 w-7 shrink-0 items-center justify-center rounded-md border font-serif text-base sm:h-12 sm:w-8 sm:text-lg ${
                  isCracked
                    ? 'border-[#ff3333]/40 bg-[#ff3333]/10 text-[#ff3333]'
                    : 'border-[#04ACFF]/40 bg-[#04ACFF]/10 text-[#7dd3ff] shadow-[0_0_16px_rgba(4,172,255,0.3)]'
                }`}
              >
                道
              </span>
              <div className="min-w-0 flex-1">
                <LibraryCardTitle as="h3" className="break-normal font-display text-base font-medium leading-snug text-neutral-100 sm:text-lg">Dao Pillar</LibraryCardTitle>
                <p className={`mt-0.5 break-normal font-serif text-[11px] sm:text-sm ${isCracked ? 'text-[#ff3333]' : 'text-[#7dd3ff]'}`}>
                  {isCracked ? 'Cracked · Repair' : `${currentStreak} Day Streak`}
                </p>
              </div>
              <span aria-hidden="true" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/60 text-[#e2c46a] sm:flex">
                <ChevronRight size={14} />
              </span>
            </div>
          </LibraryCard>

          <LibraryCard
            interactive
            padding="sm"
            accentColor="#8b5cf6"
            aria-label={`Active Status Effects: ${activeEffects.length}`}
            onClick={() => openDestination('status-effects')}
            data-cave-card="status-effects"
            contentClassName="gap-0"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/40 sm:h-12 sm:w-12 bg-violet-950/40 text-violet-300 shadow-[0_0_16px_rgba(139,92,246,0.35)]">
                <Orbit size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <LibraryCardTitle as="h3" className="break-normal font-display text-base font-medium leading-snug text-neutral-100 sm:text-lg">Active Status Effects</LibraryCardTitle>
                <p className="mt-0.5 line-clamp-2 break-normal font-serif text-[11px] text-neutral-400 sm:text-sm">
                  {activeEffects.length === 0
                    ? 'None active'
                    : activeEffects.map(effect => effect.effectDef.name).join(' + ')}
                </p>
              </div>
              <span aria-hidden="true" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/60 text-[#e2c46a] sm:flex">
                <ChevronRight size={14} />
              </span>
            </div>
          </LibraryCard>
        </div>
        <div className="cave-rule mt-8" aria-hidden="true" />
      </nav>
    </div>
  );

  const renderSignedOut = () => (
    <LibraryPanel as="section" aria-labelledby="cave-unlinked-title" padding="lg" className="mx-auto max-w-md !border-[#d4af37]/40 text-center">
      <CloudOff size={48} aria-hidden="true" className="mx-auto text-neutral-600 drop-shadow-[0_0_30px_rgba(4,172,255,0.12)]" />
      <h2 id="cave-unlinked-title" className="cave-title mt-5 font-display text-3xl">Spirit Unlinked</h2>
      <p className="mx-auto mt-3 max-w-sm font-serif text-sm leading-relaxed text-neutral-400">
        Link your soul to the Celestial Cloud to permanently etch your stories into the matrix and sync
        across different planes of existence.
      </p>
      <LibraryButton variant="primary" size="lg" icon={Sparkles} className="mt-6" onClick={() => void handleLogin()}>
        Link Spirit Realm
      </LibraryButton>
    </LibraryPanel>
  );

  const renderView = () => {
    if (isSignedOut) return renderSignedOut();
    switch (view) {
      case 'stories':
        return (
          <UserProfileCaveDestination id="stories" title="Stories" subtitle="Seeds and Manifested Stories" icon={<BookOpen size={18} />} onBack={returnHome}>
            <UserProfileStoriesPanel profile={profile} currentUser={currentUser} stories={stories} />
          </UserProfileCaveDestination>
        );
      case 'relics':
        return (
          <UserProfileCaveDestination id="relics" title="Relics" subtitle="Inventory, attunement, and the Offering Hall" icon={<Gem size={18} />} onBack={returnHome}>
            <UserProfileInventoryPanel profile={profile} handleAttuneArtifact={handleAttuneArtifact} />
          </UserProfileCaveDestination>
        );
      case 'dao-pillar':
        return (
          <UserProfileCaveDestination id="dao-pillar" title="Dao Pillar" subtitle="Daily refinement and the streak it builds" icon={<Flame size={18} />} onBack={returnHome}>
            <UserProfileDaoPillarPanel
              profile={profile}
              currentStreak={currentStreak}
              isCracked={isCracked}
              daysTo3={daysTo3}
              daysTo10={daysTo10}
              handleRepairPillar={handleRepairPillar}
              handleCheckIn={handleCheckIn}
            />
          </UserProfileCaveDestination>
        );
      case 'status-effects':
        return (
          <UserProfileCaveDestination id="status-effects" title="Active Status Effects" subtitle="Blessings, curses, and their counterplay" icon={<Orbit size={18} />} onBack={returnHome}>
            <UserProfileStatusEffectsPanel effects={activeEffects} />
          </UserProfileCaveDestination>
        );
      case 'switchboard':
        return (
          <UserProfileCaveDestination id="switchboard" title="Akashic Switchboard" subtitle="Authorized account and story registries" icon={<Shield size={18} />} onBack={returnHome}>
            {isPrivileged ? (
              <UserProfileAdminPanel
                profile={profile}
                currentUser={currentUser}
                allUsers={allUsers}
                allStories={allStories}
                adminSearchQuery={adminSearchQuery}
                setAdminSearchQuery={setAdminSearchQuery}
                adminTab={adminTab}
                setAdminTab={setAdminTab}
                isFetchingAdminData={isFetchingAdminData}
                fetchAdminData={fetchAdminData}
                adminError={adminError}
                handleUpdateUserTier={handleUpdateUserTier}
                handleUpdateUserRole={handleUpdateUserRole}
                handleDeleteStoryAdmin={handleDeleteStoryAdmin}
              />
            ) : (
              <SEIInlineAlert tone="warning" title="Authorization required">
                Only owner and admin accounts may open the Switchboard.
              </SEIInlineAlert>
            )}
          </UserProfileCaveDestination>
        );
      default:
        return renderHome();
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#03060c] text-neutral-200" data-cave-environment={environment.id}>
      {/* Backdrop: stock Immortal Land art, cooled into the cave palette */}
      <div aria-hidden="true" className="absolute inset-0">
        <img
          key={environment.src}
          src={environment.src}
          alt=""
          className="h-full w-full object-cover object-center opacity-55"
          data-cave-backdrop
        />
        <div className="absolute inset-0 bg-[#061022]/45 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,transparent_25%,rgba(3,6,12,0.55)_60%,rgba(3,6,12,0.92)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#03060c] via-[#03060c]/70 to-transparent" />
        {ambientMotes ? (
          <div className="absolute inset-0 opacity-60" data-cave-motes>
            <ParticleEffect accent="#04ACFF" dispersion={0.7} speedScale={0.45} foregroundSelector="[data-cave-identity]" />
          </div>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-12 pt-3 sm:px-6 sm:pt-5">
        {/* Cave header */}
        <header className="flex items-center justify-between gap-3">
          <img src={CAVE_EMBLEM_SRC} alt="" aria-hidden="true" className="h-9 w-9 opacity-90 sm:h-10 sm:w-10" />
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <span aria-hidden="true" className="hidden h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/70 sm:block" />
            <h1 className="cave-title truncate font-display text-2xl sm:text-4xl">Cultivator Cave</h1>
            <span aria-hidden="true" className="hidden h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/70 sm:block" />
          </div>
          {currentUser ? (
            <LibraryButton
              variant="ghost"
              size="icon"
              icon={Settings}
              aria-label="Open settings"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen(true)}
              className="!rounded-full !border-[#d4af37]/50 text-[#e2c46a]"
              data-cave-settings-trigger
            />
          ) : (
            <span aria-hidden="true" className="h-9 w-9 sm:h-10 sm:w-10" />
          )}
        </header>
        <div className="cave-rule mt-3 sm:mt-4" aria-hidden="true" />

        {error ? (
          <SEIInlineAlert tone="danger" role="alert" className="mt-4">
            {error}
          </SEIInlineAlert>
        ) : null}

        <main className="mt-5 sm:mt-6">{renderView()}</main>
      </div>

      {currentUser ? (
        <UserProfileSettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          controller={controller}
          currentUser={currentUser}
          stories={stories}
          onLogout={onLogout}
          environmentId={environmentId}
          onEnvironmentChange={setEnvironmentId}
          ambientMotes={ambientMotes}
          onAmbientMotesChange={setAmbientMotes}
          onOpenPortrait={() => {
            setSettingsOpen(false);
            setShowPortraitModal(true);
          }}
          onOpenSwitchboard={() => openDestination('switchboard')}
        />
      ) : null}

      {/* Divine Mirror of the Soul Modal */}
      {showPortraitModal && (
        <UserProfilePortraitModal
          showPortraitModal={showPortraitModal}
          setShowPortraitModal={setShowPortraitModal}
          portraitUploadFile={portraitUploadFile}
          setPortraitUploadFile={setPortraitUploadFile}
          portraitUploadBase64={portraitUploadBase64}
          setPortraitUploadBase64={setPortraitUploadBase64}
          portraitDesc={portraitDesc}
          setPortraitDesc={setPortraitDesc}
          isGeneratingPortrait={isGeneratingPortrait}
          isSavingPortrait={isSavingPortrait}
          portraitError={portraitError}
          generatedPortraitUrl={generatedPortraitUrl}
          generationStep={generationStep}
          handleGeneratePortrait={handleGeneratePortrait}
          handleApplyPortrait={handleApplyPortrait}
          daoData={daoData}
          equippedArtifact={equippedArtifact}
          profile={profile}
        />
      )}

      {/* Language safeguard: must be answered, or it reverts on its own */}
      <SEIDialog open={Boolean(pendingLanguageChange)}>
        <SEIDialogContent variant="dark" hideClose className="z-[310] sm:max-w-sm" backdropClassName="z-[300]" data-cave-language-confirm>
          <div className="space-y-5 text-center">
            <Globe size={32} aria-hidden="true" className="mx-auto text-[#7dd3ff]" />
            <SEIDialogTitle className="font-sc text-lg font-bold uppercase tracking-widest text-[#7dd3ff]">
              Confirm Language Change
            </SEIDialogTitle>
            <SEIDialogDescription className="font-sans text-sm leading-relaxed text-neutral-400">
              Are you able to read the interface and content in your newly selected language?
              <br />
              It will revert automatically in{' '}
              <span className="font-mono text-lg font-bold text-neutral-100">{countdown}</span> seconds.
            </SEIDialogDescription>
            <div className="flex flex-col gap-2">
              <LibraryButton variant="primary" fullWidth onClick={confirmLanguageChange}>
                Yes, Keep Changes
              </LibraryButton>
              <LibraryButton variant="ghost" fullWidth onClick={revertLanguageChange}>
                No, Revert Back
              </LibraryButton>
            </div>
          </div>
        </SEIDialogContent>
      </SEIDialog>
    </div>
  );
}
