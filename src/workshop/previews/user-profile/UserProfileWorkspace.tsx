/**
 * Workshop preview for the User Profile replica.
 *
 * Preview-only shell. It owns the scenario selector, the account identity the
 * page is rendered for, the mock services, the development economy, and the
 * excluded-action log. None of this is part of the portable component —
 * `src/components/user-profile/*` renders identically under a real adapter in
 * Light-Novels.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LibraryProfile as DevelopmentUserProfile, UserProfileServicesProvider, type AppUser } from '@seihouse/library/profile';
import ReferenceUserProfile from '../../../components/user-profile/reference/UserProfile';
import { UserProfileServicesProvider as ReferenceUserProfileServicesProvider } from '../../../components/user-profile/shared/userProfileServices';
import { resolvePermanentDaoXp } from '@seihouse/library/cultivation';
import { useFamiliarStoreAccount } from '@seihouse/library/familiar';
import { navigateLibraryPreview } from '../library-shell/libraryPreviewNavigation';
import { createMockUserProfileServices } from './mockUserProfileServices';
import { getPreviewScenario } from './previewData';
import { previewPublicCreators } from './publicCreatorData';
import { PREVIEW_FAMILIAR_ID, ProductFamiliarSession, ProductFamiliarSurface, useProductFamiliarPreview } from '../familiar/ProductFamiliarPreview';
import {
  DEFAULT_USER_PROFILE_PREVIEW_STATE,
  USER_PROFILE_PREVIEW_STATES,
  type UserProfilePreviewState,
} from './previewStates';
import { createInProcessEconomyFetch, createWorkshopEconomy, createWorkshopEconomyClients } from '../rewards/workshopEconomy';
import { EconomyClientProviders } from '../rewards/WorkshopEconomyProvider';
import { DEVELOPED_CULTIVATOR_SEED, seedWorkshopAccount, type WorkshopAccountSeed } from '../rewards/rewardScenarios';

const entry = workshopEntries.find(candidate => candidate.id === 'user-profile')!;

const MAX_LOGGED_ACTIONS = 8;

/** The Store account behind the development pane: the Familiar account, which charges on the server. */
const FAMILIAR_STORE_ACCOUNT = { useStoreAccount: useFamiliarStoreAccount };

/** What each scenario's account already did in the development economy. */
function economySeedFor(state: UserProfilePreviewState): WorkshopAccountSeed | null {
  const profile = getPreviewScenario(state).profile;
  const openingDaoXp = resolvePermanentDaoXp(profile?.dao_xp, profile?.dao_rank) ?? 0;
  switch (state) {
    case 'developed-cultivator':
    case 'owner-admin':
    case 'home-edge-cases':
    case 'claim-failed':
    case 'claim-unresolved':
      return { ...DEVELOPED_CULTIVATOR_SEED, openingDaoXp };
    case 'collected-today':
      return { ...DEVELOPED_CULTIVATOR_SEED, openingDaoXp, daoPillarDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] };
    case 'new-cultivator':
    case 'error':
      return { openingDaoXp };
    default:
      return null;
  }
}

export function UserProfileWorkspace({ embedded = false, initialState }: { embedded?: boolean; initialState?: UserProfilePreviewState } = {}) {
  return <ProductFamiliarSession initialState={initialState}><UserProfileContent embedded={embedded} initialState={initialState} /></ProductFamiliarSession>;
}

function UserProfileContent({ embedded, initialState }: { embedded: boolean; initialState?: UserProfilePreviewState }) {
  const reportProfile = useProductFamiliarPreview()?.reportProfile;
  const [previewState, setPreviewState] = useState<UserProfilePreviewState>(
    initialState ?? DEFAULT_USER_PROFILE_PREVIEW_STATE,
  );
  const [linkedAccount, setLinkedAccount] = useState<AppUser | null>(null);
  const [excludedActions, setExcludedActions] = useState<string[]>([]);

  const scenario = useMemo(() => getPreviewScenario(previewState), [previewState]);

  const logExcludedAction = useCallback((action: string) => {
    setExcludedActions(previous => [
      `${new Date().toLocaleTimeString()} · ${action}`,
      ...previous,
    ].slice(0, MAX_LOGGED_ACTIONS));
  }, []);

  const selectState = useCallback((next: UserProfilePreviewState) => {
    setPreviewState(next);
    setLinkedAccount(null);
    setExcludedActions([]);
  }, []);

  const services = useMemo(
    () =>
      createMockUserProfileServices({
        state: previewState,
        logExcludedAction,
        onSignIn: setLinkedAccount,
      }),
    [logExcludedAction, previewState],
  );

  const developmentServices = useMemo(() => createMockUserProfileServices({
    state: previewState, logExcludedAction, onSignIn: setLinkedAccount,
    profileOverride: { familiarId: PREVIEW_FAMILIAR_ID },
    onFamiliarProfile: reportProfile,
    celestialStore: FAMILIAR_STORE_ACCOUNT,
  }), [previewState, logExcludedAction, reportProfile]);

  const currentUser = scenario.currentUser ?? linkedAccount;
  const currentUid = currentUser?.uid ?? null;
  useEffect(() => {
    // Switch the companion's identity immediately, before the delayed profile fixture loads.
    reportProfile?.({ uid: currentUid, familiarId: PREVIEW_FAMILIAR_ID });
  }, [currentUid, reportProfile]);

  // Every balance and reward is the development economy's real server code,
  // run in this tab: one fresh economy per scenario and account, seeded with
  // what that account already did, so scenarios never leak into each other.
  const economyKey = `${previewState}|${currentUid ?? 'anonymous'}`;
  const economy = useMemo(() => (currentUid ? createWorkshopEconomy() : null), [previewState, currentUid]);
  const clients = useMemo(() => economy && currentUid
    ? createWorkshopEconomyClients(currentUid, createInProcessEconomyFetch(economy, {
      faults: previewState === 'claim-failed' ? { daoPillarClaim: 'failed' } : previewState === 'claim-unresolved' ? { daoPillarClaim: 'unresolved' } : undefined,
    }))
    : null, [economy, currentUid, previewState]);
  const [seededKey, setSeededKey] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setSeedError(null);
    const seed = economySeedFor(previewState);
    if (!economy || !currentUid || !seed) { setSeededKey(economyKey); return; }
    void seedWorkshopAccount(economy, currentUid, seed).then(
      () => { if (active) setSeededKey(economyKey); },
      reason => { if (active) { setSeedError(reason instanceof Error ? reason.message : String(reason)); setSeededKey(economyKey); } },
    );
    return () => { active = false; };
  }, [economy, currentUid, previewState, economyKey]);
  const economyReady = seededKey === economyKey;

  const renderPane = (pane: 'reference' | 'development') => (
    // Remounting on scenario change throws away the mock's in-memory account
    // state, so each scenario starts from its own snapshot rather than
    // inheriting edits made in the previous one.
    <div key={`${pane}-${previewState}-${currentUser?.uid ?? 'anonymous'}`} className="pb-16">
      {pane === 'development' ? (
        <UserProfileServicesProvider services={developmentServices}>
          {seedError ? <p role="alert" className="mx-auto max-w-4xl px-4 pt-4 text-sm text-red-300">The development economy could not be prepared: {seedError}</p> : null}
          <DevelopmentUserProfile
            currentUser={currentUser}
            stories={scenario.stories}
            publicCreators={previewPublicCreators(scenario.profile)}
            accountControls={{ inboxUnreadCount: currentUser ? 2 : 0 }}
            onLogout={() => {
              logExcludedAction('Sign out — mock account unlinked locally instead');
              setLinkedAccount(null);
              reportProfile?.({ uid: null });
              if (scenario.currentUser) setPreviewState('signed-out');
            }}
            onNavigateHome={() => logExcludedAction('Navigate to Library home (production router)')}
            onNavigateLibrary={navigateLibraryPreview}
          />
        </UserProfileServicesProvider>
      ) : (
        <ReferenceUserProfileServicesProvider services={services}>
          <ReferenceUserProfile
            currentUser={currentUser}
            stories={scenario.stories}
            onLogout={() => {
              logExcludedAction('Sign out — mock account unlinked locally instead');
              setLinkedAccount(null);
              if (scenario.currentUser) setPreviewState('signed-out');
            }}
            onNavigateHome={() => logExcludedAction('Navigate to Library home (production router)')}
          />
        </ReferenceUserProfileServicesProvider>
      )}

      <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-8">
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
            Workshop only · excluded production actions
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Buttons wired to Firebase, PostgreSQL, R2, or the production app shell are recorded
            here instead of performing anything. This panel is preview tooling and is never
            transferred.
          </p>
          {excludedActions.length === 0 ? (
            <p className="mt-3 text-[11px] italic text-white/30">Nothing invoked yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {excludedActions.map(action => (
                <li key={action} className="font-mono text-[10px] leading-relaxed text-cyan-200/60">
                  {action}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );

  const renderDevelopment = () => economyReady ? (
    // The economy providers wrap the Familiar companion too, so it reads the same Energy the Cave shows.
    <EconomyClientProviders key={economyKey} clients={clients}>
      <ProductFamiliarSurface headerRecall bottomInset={72}>{renderPane('development')}</ProductFamiliarSurface>
    </EconomyClientProviders>
  ) : <p role="status" className="mx-auto max-w-4xl px-4 py-10 text-sm text-neutral-400">Preparing this scenario’s development economy…</p>;

  if (embedded) return renderDevelopment();

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        description:
          'Each scenario fixes the account and its profile snapshot. The Development pane’s balances, Dao Pillar, rewards and Familiars run on a fresh in-browser copy of the development economy seeded for the scenario; profile edits and portraits run against local state. The Reference pane keeps production’s retired check-in, attunement and offerings.',
        defaultSection: 'states',
        sections: [
          {
            id: 'states',
            description: USER_PROFILE_PREVIEW_STATES.find(option => option.id === previewState)
              ?.description,
            content: (
              <div className="flex flex-wrap gap-2">
                {USER_PROFILE_PREVIEW_STATES.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={previewState === option.id}
                    onClick={() => selectState(option.id)}
                    className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${
                      previewState === option.id
                        ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ),
          },
        ],
      }}
      renderReference={() => renderPane('reference')}
      renderDevelopment={renderDevelopment}
    />
  );
}
