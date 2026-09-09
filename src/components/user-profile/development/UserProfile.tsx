import { UserProfileHome, isEffectActive } from './UserProfileHome';
import type { CaveAccountControls } from './caveAccountControls';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Eye,
  Flame,
  Gem,
  Globe,
  Orbit,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  LibraryButton,
  ParticleEffect,
} from '@seihouse/library-ui';
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogDescription,
  SEIDialogTitle,
  SEIInlineAlert,
} from '@seihouse/ui';
import { StoryAuthGate, STORY_AUTH_DISSOLVE_MS } from '@seihouse/sen/story-seed';
import type { AppUser, Story } from '../shared/types';
import { useUserProfileServices } from '../shared/userProfileServices';
import {
  CAVE_EMBLEM_SRC,
  DEFAULT_CAVE_ENVIRONMENT_ID,
  getCaveEnvironment,
} from './caveEnvironment';
import { UserProfileCaveDestination, type CaveDestinationId } from './UserProfileCaveDestination';
import { UserProfileAdminPanel } from './UserProfileAdminPanel';
import { UserProfileDaoPillarPanel } from './UserProfileDaoPillarPanel';
import { UserProfileInventoryPanel } from './UserProfileInventoryPanel';
import { UserProfilePortraitModal } from './UserProfilePortraitModal';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';
import { UserProfileStatusEffectsPanel } from './UserProfileStatusEffectsPanel';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';
import { UserProfilePublicPanel } from './UserProfilePublicPanel';
import {
  DEFAULT_PUBLIC_PROFILE_VISIBILITY,
  buildPublicProfile,
  developmentPublicRecord,
  type PublicProfileVisibility,
} from './publicProfile';
import './userProfile.css';
import {
  CAVE_DESTINATIONS,
  CAVE_EXIT_ICON,
  CAVE_PUBLIC_DESTINATIONS,
  publicCavePath,
  useCaveRoute,
} from './caveNavigation';
import { LibraryNavigation, LibrarySectionSidebar } from '../../library-shell/development/LibraryNavigation';
import type { LibraryLocation } from '../../library-shell/development/libraryRoutes';
import { WorkspaceShell } from '../../library-shell/development/WorkspaceShell';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateLibrary: (location: LibraryLocation) => void;
  accountControls?: CaveAccountControls;
}

/**
 * The Cultivator Cave — the profile page as a place. The home shows the
 * cultivator's portrait, identity, rank, and Qi over a stock Immortal Land
 * backdrop, within Home, Stories, Relics, and the moved Settings entry. Every
 * value and action is the controller's; the Cave only decides where each one lives.
 *
 * The Cave has one other audience: the **public view**, reached from the header
 * and routed under `/public/...`. It is the same shell, the same backdrop, and
 * the same Home composition in its public mode — the private information areas
 * are swapped for the cultivator's published bio, stats, highlights, and a
 * Boost, and Settings becomes Exit. Public routes render only from the built
 * public presentation, so no private panel is mounted behind a public URL.
 */
export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome, onNavigateLibrary, accountControls }: UserProfileProps) {
  // Production calls `useUserProfile(...)` and reads the Firebase local-only flag
  // directly. Both arrive through the injected services port here, so this file
  // carries no Firebase, PostgreSQL, or generation dependency of its own.
  const { useController: useUserProfile, localOnlyMode, authenticate } = useUserProfileServices();
  const controller = useUserProfile({ currentUser, stories, onLogout, onNavigateHome });
  const {
    profile,
    error,
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
    handleAttuneArtifact,
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

  const route = useCaveRoute();
  const { view, navigate } = route;
  const mainRef = useRef<HTMLDivElement>(null);
  const previousUser = useRef(currentUser);
  const previousPath = useRef(route.path);
  const focusedPath = useRef<string | undefined>(undefined);
  const isPublicView = route.audience === 'public';
  // Where Exit lands. Set as the public view is opened, so leaving returns to
  // the Cave page the cultivator was on; a direct public link falls back Home.
  const publicReturnPath = useRef<string | null>(null);
  const exitPublicView = useCallback(() => {
    const destination = publicReturnPath.current ?? '/home';
    publicReturnPath.current = null;
    navigate(destination);
  }, [navigate]);
  const openPublicView = useCallback(() => {
    publicReturnPath.current = route.path;
    navigate(publicCavePath('home'));
  }, [navigate, route.path]);

  const navigationItems = useMemo(() => {
    if (isPublicView) {
      return [
        ...CAVE_PUBLIC_DESTINATIONS.map(({ id, label, icon: Icon }) => ({
          id, label, icon: <Icon size={20} />, active: route.destination === id,
          onSelect: () => navigate(publicCavePath(id)),
        })),
        // Exit leaves the public view and remains an action in Search and the desktop rail.
        { id: 'exit', label: 'Exit', icon: <CAVE_EXIT_ICON size={20} />, active: false,
          onSelect: exitPublicView },
      ];
    }
    return CAVE_DESTINATIONS.filter(item => item.id !== 'settings').map(({ id, label, icon: Icon }) => ({
      id, label, icon: <Icon size={20} />, active: route.destination === id,
      onSelect: () => navigate(`/${id}`),
    }));
  }, [isPublicView, route.destination, navigate, exitPublicView]);
  const navigationDefinition = useMemo(() => ({
    label: isPublicView ? 'Public profile navigation' : 'Cultivator Cave navigation',
    sections: [{ id: 'cave', items: navigationItems }],
  }), [isPublicView, navigationItems]);
  const [environmentId, setEnvironmentId] = useState(DEFAULT_CAVE_ENVIRONMENT_ID);
  const [ambientMotes, setAmbientMotes] = useState(true);
  const [spiritLinkGateMounted, setSpiritLinkGateMounted] = useState(
    !currentUser && !localOnlyMode,
  );

  // A local visibility configuration, held beside the other transient Cave
  // presentation state. Persisting it is a production schema decision.
  const [publicVisibility, setPublicVisibility] = useState<PublicProfileVisibility>(
    DEFAULT_PUBLIC_PROFILE_VISIBILITY,
  );
  // The viewed cultivator is the signed-in one previewing their own public
  // view, so the record is built from this profile and these stories. A host
  // showing someone else's profile passes that cultivator's record instead.
  const publicProfile = useMemo(
    () => (profile ? buildPublicProfile(developmentPublicRecord(profile, stories), publicVisibility) : undefined),
    [profile, stories, publicVisibility],
  );
  // Boost is a local endorsement only: no Qi, reward, ranking, or economy.
  // Count and pressed state are one value so the updater stays pure — nesting
  // a second setState inside an updater double-counts under StrictMode.
  const [boostState, setBoostState] = useState({ count: 0, boosted: false });
  const boost = useMemo(() => ({
    ...boostState,
    toggle: () => setBoostState(previous => ({
      boosted: !previous.boosted,
      count: Math.max(0, previous.count + (previous.boosted ? -1 : 1)),
    })),
  }), [boostState]);

  const environment = getCaveEnvironment(environmentId);
  const isSignedOut = !currentUser && !localOnlyMode;
  const isPrivileged = profile?.role === 'owner' || profile?.role === 'admin';

  // The way in and the way out, through the header's existing action slots.
  const canPreviewPublicView = Boolean(profile) && !isSignedOut && !spiritLinkGateMounted;
  const headerActions = useMemo(() => {
    if (isPublicView) {
      return [{ id: 'exit-public-view', label: 'Exit', icon: CAVE_EXIT_ICON,
        title: 'Leave the public view and return to your Cave', onAction: exitPublicView }];
    }
    return canPreviewPublicView
      ? [{ id: 'preview-public-view', label: 'View Public Profile', icon: Eye,
          title: 'See your Cave the way other cultivators see it', onAction: openPublicView }]
      : [];
  }, [isPublicView, canPreviewPublicView, exitPublicView, openPublicView]);

  // The Akashic Switchboard is a destination here; the controller still owns
  // when its registries are fetched, keyed off this flag exactly as in production.
  useEffect(() => {
    setIsAdminPanelOpen(view === 'switchboard' && isPrivileged && !isSignedOut);
  }, [setIsAdminPanelOpen, view, isPrivileged, isSignedOut]);

  // Signing out returns to Home; initial signed-out deep links survive linking.
  useEffect(() => {
    if (previousUser.current && !currentUser) navigate('/home', true);
    previousUser.current = currentUser;
  }, [currentUser, navigate]);

  useEffect(() => {
    if (previousPath.current !== route.path) {
      setShowPortraitModal(false);
      if (pendingLanguageChange) revertLanguageChange();
      previousPath.current = route.path;
    }
  }, [route.path, setShowPortraitModal, pendingLanguageChange, revertLanguageChange]);

  useEffect(() => {
    if (focusedPath.current !== route.path && !isSignedOut && !spiritLinkGateMounted && !showPortraitModal && !pendingLanguageChange) {
      mainRef.current?.querySelector<HTMLElement>('h2')?.focus();
      focusedPath.current = route.path;
    }
  }, [route.path, isSignedOut, spiritLinkGateMounted, showPortraitModal, pendingLanguageChange]);

  // Keep the recovered OAuth gate mounted long enough to complete its existing
  // post-link dissolve before revealing the linked Cultivator Cave.
  useEffect(() => {
    if (isSignedOut) {
      setSpiritLinkGateMounted(true);
      return;
    }
    if (!spiritLinkGateMounted) return;
    const timer = window.setTimeout(
      () => setSpiritLinkGateMounted(false),
      STORY_AUTH_DISSOLVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isSignedOut, spiritLinkGateMounted]);

  const openDestination = useCallback((destination: Exclude<CaveDestinationId, 'unavailable' | 'public-stories' | 'public-relics'>) => {
    navigate(destination === 'dao-pillar' || destination === 'status-effects'
      ? `/home/${destination}` : destination === 'switchboard' ? '/settings/switchboard' : `/${destination}`);
  }, [navigate]);
  const returnHome = useCallback(() => navigate('/home'), [navigate]);
  const returnPublicHome = useCallback(() => navigate(publicCavePath('home')), [navigate]);

  const [effectsNow, setEffectsNow] = useState(Date.now);
  useEffect(() => {
    const refreshEffects = () => setEffectsNow(Date.now());
    window.addEventListener('focus', refreshEffects);
    document.addEventListener('visibilitychange', refreshEffects);
    const timer = window.setInterval(refreshEffects, 1000);
    return () => {
      window.removeEventListener('focus', refreshEffects);
      document.removeEventListener('visibilitychange', refreshEffects);
      window.clearInterval(timer);
    };
  }, []);
  const activeEffects = (profile?.activeStatusEffects ?? []).filter((effect) =>
    isEffectActive(effect, effectsNow),
  );

  const viewedName = profile?.displayName?.trim() || 'This cultivator';

  const renderPublicView = () => {
    switch (view) {
      case 'stories':
        return (
          <UserProfileCaveDestination id="public-stories" title="Stories" subtitle={`Published by ${viewedName}`} icon={<BookOpen size={18} />} onBack={returnPublicHome} backLabel="Return to public Home">
            <UserProfilePublicPanel kind="stories" displayName={viewedName} titles={publicProfile?.storyTitles ?? null} />
          </UserProfileCaveDestination>
        );
      case 'relics':
        return (
          <UserProfileCaveDestination id="public-relics" title="Relics" subtitle={`Published by ${viewedName}`} icon={<Gem size={18} />} onBack={returnPublicHome} backLabel="Return to public Home">
            <UserProfilePublicPanel kind="relics" displayName={viewedName} titles={publicProfile?.relicTitles ?? null} />
          </UserProfileCaveDestination>
        );
      case 'home':
        return <UserProfileHome controller={controller} mode="public" publicProfile={publicProfile} boost={boost} />;
      default:
        return (
          <UserProfileCaveDestination id="unavailable" title="Page unavailable" backLabel="Return to public Home" onBack={returnPublicHome}>
            <p className="text-neutral-400">This page is not part of the public view.</p>
          </UserProfileCaveDestination>
        );
    }
  };

  const renderView = () => {
    if (isSignedOut) return null;
    if (isPublicView) return renderPublicView();
    switch (view) {
      case 'inbox':
      case 'store':
      case 'redeem-code':
        return (
          <UserProfileCaveDestination id={view} title={view === 'inbox' ? 'Inbox' : view === 'store' ? 'Store' : 'Redeem Code'}
            onBack={view === 'redeem-code' ? () => navigate('/settings') : returnHome}
            backLabel={view === 'redeem-code' ? 'Return to Settings' : 'Return to cave'}>
            <p className="text-neutral-400">{view === 'inbox' ? 'Inbox is not connected in this preview.' : view === 'store' ? 'The Store is not available yet.' : 'Code redemption is not connected in this preview.'}</p>
          </UserProfileCaveDestination>
        );
      case 'settings':
        return (
          <UserProfileCaveDestination id="settings" title="Settings" onBack={returnHome}>
            <UserProfileSettingsPanel
              controller={controller}
              currentUser={currentUser}
              stories={stories}
              onLogout={onLogout}
              environmentId={environmentId}
              onEnvironmentChange={setEnvironmentId}
              ambientMotes={ambientMotes}
              onAmbientMotesChange={setAmbientMotes}
              onOpenPortrait={() => setShowPortraitModal(true)}
              onOpenSwitchboard={() => openDestination('switchboard')}
              publicVisibility={publicVisibility}
              onPublicVisibilityChange={setPublicVisibility}
              onPreviewPublicView={openPublicView}
              onRedeemCode={accountControls?.onRedeemCode ?? (() => navigate('/settings/redeem-code'))}
            />
          </UserProfileCaveDestination>
        );
      case 'unavailable':
        return <UserProfileCaveDestination id="unavailable" title="Page unavailable" backLabel={`Return to ${route.destination ?? 'Home'}`} onBack={() => navigate(`/${route.destination ?? 'home'}`)}>
          <p className="text-neutral-400">This Cave page is not available.</p>
        </UserProfileCaveDestination>;
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
              dailyClaim={controller.dailyClaim}
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
          <UserProfileCaveDestination id="switchboard" title="Akashic Switchboard" subtitle="Authorized account and story registries" icon={<Shield size={18} />} onBack={() => navigate('/settings')} backLabel="Return to Settings">
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
        return <UserProfileHome controller={controller} onOpenSettings={() => navigate('/settings')} accountControls={{
          ...accountControls,
          onOpenInbox: accountControls?.onOpenInbox ?? (() => navigate('/home/inbox')),
          onOpenStore: accountControls?.onOpenStore ?? (() => navigate('/home/store')),
        }} />;
    }
  };

  const caveSidebarMounted = !isSignedOut && !spiritLinkGateMounted;
  return (
    <LibraryNavigation location={{ screen: 'profile', cave: route.path }} onNavigate={target => {
      if (target.screen === 'profile') navigate(target.cave ?? '/home');
      else onNavigateLibrary(target);
    }} sectionMenu={caveSidebarMounted ? navigationDefinition : undefined}>
    <div className="cave-workspace relative min-h-[100dvh] bg-[#03060c] text-neutral-200" data-cave-environment={environment.id} data-cave-audience={route.audience}>
      {/* Backdrop: stock Immortal Land art, cooled into the cave palette */}
      <div
        aria-hidden="true"
        data-cave-backdrop-layer
        className="pointer-events-none absolute inset-0 overflow-clip"
      >
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

      <WorkspaceShell
        className="cave-shell relative z-10"
        mainClassName="cave-workspace-main"
        sidebarLabel={navigationDefinition.label}
        sidebar={caveSidebarMounted ? <LibrarySectionSidebar /> : undefined}
        header={<WorkspaceHeader title="Cultivator Cave" landmark="none"
          emblem={{ src: CAVE_EMBLEM_SRC, alt: 'Library sacred tree' }}
          home={{ href: '/', label: 'Return to Library', onNavigate: onNavigateHome }}
          contextualItem={isPublicView ? <p role="status" className="workspace-header-public-view" title="Public View">
            <Eye size={20} aria-hidden="true" /><span>Public View</span>
          </p> : undefined}
          searchItems={navigationItems.filter(item => item.id !== 'exit').map(item => ({ id: item.id, label: item.label, pressed: item.active, onAction: item.onSelect }))}
          secondaryActions={headerActions}
        />}
      >
        <div className="cave-workspace-body mx-auto w-full max-w-7xl px-4 pb-12 pt-3 sm:px-6 sm:pt-5">
          <div className="cave-rule" aria-hidden="true" />

          {error ? (
            <SEIInlineAlert tone="danger" role="alert" className="mt-4">
              {error}
            </SEIInlineAlert>
          ) : null}

          <div ref={mainRef} className="mt-5 min-w-0 sm:mt-6" data-cave-page={route.destination ?? 'unavailable'} data-cave-audience={route.audience}>{renderView()}</div>
        </div>
      </WorkspaceShell>

      {isSignedOut || spiritLinkGateMounted ? (
        <StoryAuthGate
          linked={Boolean(currentUser)}
          context="spirit-link"
          onAuthenticate={authenticate}
          description="Sign in to preserve your stories, cultivation, and relics, then return to them from any device."
          reassurance="Your Cultivator Cave will remain intact."
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
    </LibraryNavigation>
  );
}
