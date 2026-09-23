import { useLibraryAssets } from '../../../library/assets';
import { UserProfileHome } from './UserProfileHome';
import type { CaveAccountControls } from './caveAccountControls';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Flame,
  Globe,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  LibraryButton,
  LibraryCaveBackdrop,
} from '@seihouse/library-ui';
import {
  SEIDialog,
  SEIDialogContent,
  SEIDialogDescription,
  SEIDialogTitle,
  SEIInlineAlert,
} from '@seihouse/ui';
import { StoryAuthGate, STORY_AUTH_DISSOLVE_MS } from '@seihouse/library/story-seed';
import type { AppUser, Story } from './types';
import { useUserProfileServices } from './userProfileServices';
import {
  DEFAULT_CAVE_ENVIRONMENT_ID,
  getCaveEnvironment,
} from './caveEnvironment';
import { UserProfileCaveDestination, type CaveDestinationId } from './UserProfileCaveDestination';
import { UserProfileAdminPanel } from './UserProfileAdminPanel';
import { UserProfilePortraitModal } from './UserProfilePortraitModal';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';
import { UserProfilePublicPanel } from './UserProfilePublicPanel';
import { UserProfileCreatorPanel } from './UserProfileCreatorPanel';
import { publicCreatorWorlds, type PublicCreator } from './creatorWorlds';
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
import { LibraryNavigationIcon as SENNavigationIcon } from '@seihouse/library-ui';
import { EnergyPanel } from '../../energy/development/EnergyPanel';
import { useEnergyAccount } from '../../energy/shared/useEnergyAccount';
import { CelestialStorePanel } from '../../celestial-store/development/CelestialStorePanel';
import { ownsFamiliar, useUnavailableCelestialStoreAccount } from '../../celestial-store/shared/storeAccount';
import { DaoPillarView } from '../../dao-pillar/development/DaoPillarView';
import { useDaoPillarCalendar } from '../../dao-pillar/shared/useDaoPillarCalendar';
import { useQiAccount, useDaoXpAccount, getDaoRankData, resolvePermanentDaoXp } from '@seihouse/library/cultivation';
import { useAchievements } from '../../../library/rewards/achievementsClient';
import { useRefreshWhenReplaced } from '../../../library/rewards/balanceRefresh';
import { useRelics } from '../../../library/relics/relicsClient';
import { useFamiliars } from '../../../library/familiars/familiarsClient';
import { activeNameEffect, bondRankLabel, familiarTraining } from '../../../library/familiars/contracts';
import { AchievementsPanel } from '../../rewards/development/AchievementsPanel';
import { FateSurvivalRelicsPanel } from '../../relics/development/FateSurvivalRelicsPanel';
import { FamiliarTrainingPanel } from '../../familiar-training/development/FamiliarTrainingPanel';
import { ElementalEffectPanel } from '../../familiar-training/development/ElementalEffectPanel';

interface UserProfileProps {
  currentUser: AppUser | null;
  stories: Story[];
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateLibrary: (location: LibraryLocation) => void;
  accountControls?: CaveAccountControls;
  /** Host-supplied public records, keyed by the viewed creator, never the viewer. */
  publicCreators?: readonly PublicCreator[];
}

/**
 * The Cultivator Cave — the profile page as a place. The home shows the
 * cultivator's portrait, identity, rank and balances over a stock Immortal Land
 * backdrop, within Home, Stories, Rewards, and the moved Settings entry. Every
 * value and action belongs to the controller or to a server-owned client
 * (QI, DAO XP, Energy, Dao Pillar, achievements, Relics, Familiars); the Cave
 * only decides where each one lives.
 *
 * The Cave has one other audience: the **public view**, reached from the header
 * and routed under `/public/...`. It is the same shell, the same backdrop, and
 * the same Home composition in its public mode — the private information areas
 * are swapped for the cultivator's published bio, stats, highlights, and a
 * Boost, and Settings becomes Exit. Public routes render only from the built
 * public presentation, so no private panel is mounted behind a public URL.
 */
export default function UserProfile({ currentUser, stories, onLogout, onNavigateHome, onNavigateLibrary, accountControls, publicCreators = [] }: UserProfileProps) {
  // Production calls `useUserProfile(...)` and reads the Firebase local-only flag
  // directly. Both arrive through the injected services port here, so this file
  // carries no Firebase, PostgreSQL, or generation dependency of its own.
  const { useController: useUserProfile, localOnlyMode, authenticate, familiars = [], celestialStore } = useUserProfileServices();
  const hostController = useUserProfile({ currentUser, stories, onLogout, onNavigateHome });
  // Familiar ownership and purchases are host account state behind the same
  // services port as everything else; without a Store service the page still
  // renders, with purchases plainly disconnected. The chosen hook is pinned for
  // this mount: the fallback calls no hooks and a real one does, so swapping
  // them mid-mount would change the hook sequence and fail the render.
  const [useStoreAccount] = useState(() => celestialStore?.useStoreAccount ?? useUnavailableCelestialStoreAccount);
  const storeAccount = useStoreAccount();
  // Which Familiars the cultivator may equip is ownership, from the Store account.
  const familiarOptions = useMemo(() => celestialStore
    ? familiars.map(option => ({ ...option, available: ownsFamiliar(storeAccount.ownedFamiliarIds, option.id, option.isDefault) }))
    : familiars, [celestialStore, familiars, storeAccount.ownedFamiliarIds]);
  const route = useCaveRoute();
  const isPublicView = route.audience === 'public';
  const signedIn = Boolean(currentUser) && !isPublicView;
  const cultivation = useQiAccount({ enabled: signedIn });
  const daoXpAccount = useDaoXpAccount({ enabled: signedIn });
  const achievements = useAchievements({ enabled: signedIn });
  // Relic names and the Dao Pillar streak also feed the cultivator's own
  // public view, filtered there by their visibility choices.
  const relics = useRelics({ enabled: Boolean(currentUser) });
  const familiarAccount = useFamiliars({ enabled: signedIn });
  // Permanent DAO XP alone sets the rank, and rank only chooses colours. The
  // signed-in cultivator's comes from the DAO XP ledger; a host that mounts no
  // DAO XP client supplies its own projection on the profile record.
  const recordDaoXp = resolvePermanentDaoXp(hostController.profile?.dao_xp, hostController.profile?.dao_rank);
  const daoXp = daoXpAccount.status === 'unavailable' ? recordDaoXp : daoXpAccount.snapshot?.balance ?? null;
  const controller = isPublicView ? hostController : {
    ...hostController,
    profile: hostController.profile ? { ...hostController.profile, dao_xp: daoXp ?? undefined, dao_rank: undefined } : null,
    daoData: getDaoRankData(daoXp ?? 0),
  };
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
    daoData,
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

  const { view, navigate } = route;
  const mainRef = useRef<HTMLDivElement>(null);
  const previousUser = useRef(currentUser);
  const previousPath = useRef(route.path);
  const focusedPath = useRef<string | undefined>(undefined);
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
        ...CAVE_PUBLIC_DESTINATIONS.map(({ id, label, icon }) => ({
          id, label, icon: <SENNavigationIcon name={icon} size={20} />, active: route.destination === id,
          onSelect: () => navigate(publicCavePath(id, route.creatorId)),
        })),
        // Exit leaves the public view and remains an action in Search and the desktop rail.
        { id: 'exit', label: 'Exit', icon: <CAVE_EXIT_ICON size={20} />, active: false,
          onSelect: exitPublicView },
      ];
    }
    return CAVE_DESTINATIONS.filter(item => item.id !== 'settings').map(({ id, label, icon }) => ({
      id, label, icon: <SENNavigationIcon name={icon} size={20} />, active: route.destination === id,
      onSelect: () => navigate(`/${id}`),
    }));
  }, [isPublicView, route.destination, route.creatorId, navigate, exitPublicView]);
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
  const creatorId = route.creatorId ?? profile?.uid;
  const suppliedCreator = publicCreators.find(creator => creator.profile.uid === creatorId);
  const daoPillar = useDaoPillarCalendar({ enabled: Boolean(currentUser) });
  const ownActivity = useMemo(() => ({
    relics: relics.snapshot?.relics.map(({ id, name, rarity }) => ({ id, name, rarity })),
    readingStreakDays: daoPillar.snapshot?.streak.current,
  }), [relics.snapshot, daoPillar.snapshot]);
  const publicCreator = profile && profile.uid === creatorId
    ? { profile, worlds: suppliedCreator?.worlds ?? [], activity: suppliedCreator?.activity ?? ownActivity }
    : suppliedCreator;
  const viewedProfile = publicCreator?.profile;
  const publicProfile = useMemo(
    () => {
      if (!viewedProfile) return undefined;
      // Explicit creator routes consume only published worlds from their public input.
      const viewedStories = route.creatorId && publicCreator
        ? publicCreatorWorlds(viewedProfile.uid, publicCreator.worlds).map(world => ({ ...world, userId: viewedProfile.uid }))
        : stories;
      return buildPublicProfile(developmentPublicRecord(viewedProfile, viewedStories, publicCreator?.activity),
        viewedProfile.uid === profile?.uid ? publicVisibility : DEFAULT_PUBLIC_PROFILE_VISIBILITY);
    },
    [viewedProfile, publicCreator, route.creatorId, profile?.uid, stories, publicVisibility],
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

  const assets = useLibraryAssets();
  const environment = getCaveEnvironment(environmentId);
  const environmentImage = assets.caveImages?.[environment.id];
  const isSignedOut = !currentUser && !localOnlyMode;
  const isPrivileged = profile?.role === 'owner' || profile?.role === 'admin';
  // Energy is server truth read through the host-mounted Energy client. The
  // Cave keeps no balance of its own; without a client the emblem stays a label.
  const energyAccount = useEnergyAccount({ enabled: signedIn });
  const energy = energyAccount.status === 'unavailable' ? undefined
    : { account: energyAccount, onOpen: () => navigate('/home/energy') };
  // A delivered, replayed, or recovered claim invalidates the read projection.
  // Refreshing a ledger never credits anything; only the server moves balances.
  useEffect(() => {
    if (daoPillar.snapshot) void cultivation.refresh();
  }, [daoPillar.snapshot, cultivation.refresh]);
  // An opened scroll lands DAO XP and QI; a Relic lands DAO XP and Energy; a
  // Familiar offering or purchase spends QI or Energy.
  const refreshScrollBalances = useCallback(() => Promise.all([cultivation.refresh(), daoXpAccount.refresh()]), [cultivation.refresh, daoXpAccount.refresh]);
  const refreshRelicBalances = useCallback(() => Promise.all([daoXpAccount.refresh(), energyAccount.refresh()]), [daoXpAccount.refresh, energyAccount.refresh]);
  const refreshSpendBalances = useCallback(() => Promise.all([cultivation.refresh(), energyAccount.refresh()]), [cultivation.refresh, energyAccount.refresh]);
  useRefreshWhenReplaced(achievements.snapshot, refreshScrollBalances);
  useRefreshWhenReplaced(relics.snapshot, refreshRelicBalances);
  useRefreshWhenReplaced(familiarAccount.snapshot, refreshSpendBalances);
  const equippedOption = familiars.find(option => option.id === profile?.familiarId)
    ?? familiars.find(option => option.isDefault);
  // The equipped Familiar is the Active Familiar; the Familiar account resolves
  // the Active Elemental Effect against it.
  const equippedTraining = familiarTraining(familiarAccount.snapshot, equippedOption?.id);
  const nameEffect = activeNameEffect(familiarAccount.snapshot, equippedOption?.id);

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
    if (focusedPath.current !== route.path && (isPublicView || (!isSignedOut && !spiritLinkGateMounted)) && !showPortraitModal && !pendingLanguageChange) {
      mainRef.current?.querySelector<HTMLElement>('h2')?.focus();
      focusedPath.current = route.path;
    }
  }, [route.path, isPublicView, isSignedOut, spiritLinkGateMounted, showPortraitModal, pendingLanguageChange]);

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
    navigate(destination === 'dao-pillar' || destination === 'familiar'
      ? `/home/${destination}` : destination === 'switchboard' ? '/settings/switchboard' : `/${destination}`);
  }, [navigate]);
  const returnHome = useCallback(() => navigate('/home'), [navigate]);
  const returnPublicHome = useCallback(() => navigate(publicCavePath('home', route.creatorId)), [navigate, route.creatorId]);

  const viewedName = viewedProfile?.displayName?.trim() || 'This cultivator';

  const renderPublicView = () => {
    if (route.creatorId && !publicCreator) return (
      <UserProfileCaveDestination id="unavailable" title="Creator unavailable" onBack={returnHome} backLabel="Return to profile">
        <p className="text-neutral-400">This creator’s public profile is not available.</p>
      </UserProfileCaveDestination>
    );
    switch (view) {
      case 'worlds':
      case 'storefront':
        return publicCreator ? (
          <UserProfileCaveDestination id={view} title={view === 'worlds' ? 'Worlds' : 'Store'}
            subtitle={viewedName} icon={<SENNavigationIcon name={view === 'worlds' ? 'discovery' : 'store'} size={18} />}
            onBack={returnPublicHome} backLabel={`Return to ${viewedName}’s profile`}>
            <UserProfileCreatorPanel key={`${creatorId}-${view}`} creator={publicCreator} kind={view} />
          </UserProfileCaveDestination>
        ) : null;
      case 'stories':
        return (
          <UserProfileCaveDestination id="public-stories" title="Stories" subtitle={`Published by ${viewedName}`} icon={<SENNavigationIcon name="scroll" size={18} />} onBack={returnPublicHome} backLabel="Return to public Home">
            <UserProfilePublicPanel kind="stories" displayName={viewedName} titles={publicProfile?.storyTitles ?? null} />
          </UserProfileCaveDestination>
        );
      case 'relics':
        return (
          <UserProfileCaveDestination id="public-relics" title="Relics" subtitle={`Fate Survival Relics published by ${viewedName}`} icon={<SENNavigationIcon name="relic" size={18} />} onBack={returnPublicHome} backLabel="Return to public Home">
            <UserProfilePublicPanel kind="relics" displayName={viewedName} titles={publicProfile?.relicTitles ?? null} />
          </UserProfileCaveDestination>
        );
      case 'home':
        return <UserProfileHome controller={{ ...controller, profile: viewedProfile ?? null,
          formData: { ...controller.formData, avatarUrl: viewedProfile?.avatarUrl ?? '' } }}
          mode="public" publicProfile={publicProfile} boost={boost} />;
      default:
        return (
          <UserProfileCaveDestination id="unavailable" title="Page unavailable" backLabel="Return to public Home" onBack={returnPublicHome}>
            <p className="text-neutral-400">This page is not part of the public view.</p>
          </UserProfileCaveDestination>
        );
    }
  };

  const renderView = () => {
    if (isPublicView) return renderPublicView();
    if (isSignedOut) return null;
    switch (view) {
      case 'inbox':
      case 'redeem-code':
        return (
          <UserProfileCaveDestination id={view} title={view === 'inbox' ? 'Inbox' : 'Redeem Code'}
            onBack={view === 'redeem-code' ? () => navigate('/settings') : returnHome}
            backLabel={view === 'redeem-code' ? 'Return to Settings' : 'Return to cave'}>
            <p className="text-neutral-400">{view === 'inbox' ? 'Inbox is not connected in this preview.' : 'Code redemption is not connected in this preview.'}</p>
          </UserProfileCaveDestination>
        );
      case 'store':
        // The official Celestial Store's dedicated page. The creator's own
        // User Store stays the public `storefront` destination above.
        return (
          <UserProfileCaveDestination id="store" title="Celestial Store" subtitle="Familiars of the Celestial Library"
            icon={<SENNavigationIcon name="store" size={18} />} onBack={returnHome}>
            <CelestialStorePanel
              options={familiarOptions}
              cultivation={cultivation}
              energy={energyAccount}
              equippedFamiliarId={profile?.familiarId}
              ownedFamiliarIds={storeAccount.ownedFamiliarIds}
              onEquip={controller.handleFamiliarChange}
              equipPending={controller.isSavingFamiliar}
              onPurchase={celestialStore ? storeAccount.purchase : undefined}
              purchasePending={storeAccount.pending}
            />
          </UserProfileCaveDestination>
        );
      case 'energy':
        return (
          <UserProfileCaveDestination id="energy" title="Energy, QI & DAO XP" subtitle="Live balances, the current price schedule, and permanent progression" icon={<SENNavigationIcon name="energy" size={18} />} onBack={returnHome}>
            <EnergyPanel account={energyAccount} qi={cultivation} daoXp={daoXp} />
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
              familiarOptions={familiarOptions}
            />
          </UserProfileCaveDestination>
        );
      case 'unavailable':
        return <UserProfileCaveDestination id="unavailable" title="Page unavailable" backLabel={`Return to ${route.destination ?? 'Home'}`} onBack={() => navigate(`/${route.destination ?? 'home'}`)}>
          <p className="text-neutral-400">This Cave page is not available.</p>
        </UserProfileCaveDestination>;
      case 'stories':
        return (
          <UserProfileCaveDestination id="stories" title="Stories" subtitle="Seeds and Manifested Stories" icon={<SENNavigationIcon name="scroll" size={18} />} onBack={returnHome}>
            <UserProfileStoriesPanel profile={profile} currentUser={currentUser} stories={stories} />
          </UserProfileCaveDestination>
        );
      case 'rewards':
        return (
          <UserProfileCaveDestination id="rewards" title="Rewards" subtitle="Achievements, Mystery Scrolls, and Fate Survival Relics" icon={<SENNavigationIcon name="relic" size={18} />} onBack={returnHome}>
            <div className="space-y-6">
              <AchievementsPanel achievements={achievements} />
              <FateSurvivalRelicsPanel relics={relics} />
            </div>
          </UserProfileCaveDestination>
        );
      case 'dao-pillar':
        return (
          <UserProfileCaveDestination id="dao-pillar" title="Dao Pillar" subtitle="SEN Celestial Library" icon={<Flame size={18} />} onBack={returnHome}>
            <DaoPillarView calendar={daoPillar} />
          </UserProfileCaveDestination>
        );
      case 'familiar':
        return (
          <UserProfileCaveDestination id="familiar" title="Familiar" subtitle="Cultivate bonds with QI and master their elements" icon={<Sparkles size={18} />} onBack={returnHome}>
            <div className="space-y-4">
              <ElementalEffectPanel
                familiars={familiarAccount}
                options={familiars}
                activeFamiliarId={equippedOption?.id}
                displayName={profile?.displayName?.trim() || 'Cultivator'}
              />
              <FamiliarTrainingPanel
                familiars={familiarAccount}
                options={familiars}
                qiBalance={cultivation.snapshot?.balance ?? null}
                activeFamiliarId={equippedOption?.id}
              />
            </div>
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
        return <UserProfileHome controller={controller} publicProfile={publicProfile}
          onOpenSettings={() => navigate('/settings')} energy={energy} daoPillar={daoPillar} onOpenDaoPillar={() => navigate('/home/dao-pillar')}
          qi={cultivation.status === 'unavailable' ? undefined : { balance: cultivation.snapshot?.balance ?? null, onOpen: () => navigate('/home/energy') }}
          familiar={familiarAccount.connected && equippedOption ? {
            name: equippedOption.name,
            bondLabel: equippedTraining ? bondRankLabel(equippedTraining.bondRank) : null,
            effect: nameEffect?.effect ?? null,
            onOpen: () => navigate('/home/familiar'),
          } : undefined}
          rewards={achievements.connected || relics.connected ? {
            sealedScrolls: achievements.snapshot ? achievements.snapshot.scrolls.filter(scroll => scroll.status === 'sealed').length : null,
            relics: relics.snapshot?.relics.length ?? null,
            onOpen: () => navigate('/rewards'),
          } : undefined}
          accountControls={{
          ...accountControls,
          onOpenInbox: accountControls?.onOpenInbox ?? (() => navigate('/home/inbox')),
          onOpenStore: accountControls?.onOpenStore ?? (() => navigate('/home/store')),
        }} />;
    }
  };

  const caveSidebarMounted = isPublicView || (!isSignedOut && !spiritLinkGateMounted);
  return (
    <LibraryNavigation location={{ screen: 'profile', cave: route.path }} onNavigate={target => {
      if (target.screen === 'profile') navigate(target.cave ?? '/home');
      else onNavigateLibrary(target);
    }} sectionMenu={caveSidebarMounted ? navigationDefinition : undefined}>
    <div className="cave-workspace relative min-h-[100dvh] bg-[#03060c] text-neutral-200" data-cave-environment={environment.id} data-cave-audience={route.audience}>
      {environmentImage && <LibraryCaveBackdrop src={environmentImage} ambientMotes={ambientMotes} />}

      <WorkspaceShell
        className="cave-shell relative z-10"
        mainClassName="cave-workspace-main"
        sidebarLabel={navigationDefinition.label}
        sidebar={caveSidebarMounted ? <LibrarySectionSidebar /> : undefined}
        header={<WorkspaceHeader title="Profile" landmark="none"
          emblem={assets.emblem ? { src: assets.emblem, alt: 'SEN' } : undefined}
          home={{ href: '/', label: 'Return to Library', onNavigate: onNavigateHome }}
          contextualItem={isPublicView ? <button type="button" onClick={exitPublicView}
            aria-label="Exit public view" title="Exit public view"
            className="workspace-header-public-view min-h-11 min-w-11 justify-center rounded-full cursor-pointer hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7dd3ff]">
            <Eye size={20} aria-hidden="true" /><span>Public View</span>
          </button> : undefined}
          searchItems={navigationItems.map(item => ({ id: item.id, label: item.label, pressed: item.active, onAction: item.onSelect }))}
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

      {!isPublicView && (isSignedOut || spiritLinkGateMounted) ? (
        <StoryAuthGate
          linked={Boolean(currentUser)}
          context="spirit-link"
          onAuthenticate={authenticate}
          description="Sign in to preserve your stories, cultivation, and rewards, then return to them from any device."
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
