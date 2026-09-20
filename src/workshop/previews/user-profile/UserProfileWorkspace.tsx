import { QiClientProvider, createHttpQiClient } from '@seihouse/library/cultivation';
import { handleQiHttp } from '../../../server/qi/http';
/**
 * Workshop preview for the User Profile replica.
 *
 * Preview-only shell. It owns the scenario selector, the account identity the
 * page is rendered for, the mock services, and the excluded-action log. None of
 * this is part of the portable component — `src/components/user-profile/*`
 * renders identically under a real adapter in Light-Novels.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LibraryProfile as DevelopmentUserProfile } from '@seihouse/library/profile';
import ReferenceUserProfile from '../../../components/user-profile/reference/UserProfile';
import { UserProfileServicesProvider } from '@seihouse/library/profile';
import { EnergyClientProvider, createHttpEnergyClient } from '@seihouse/library/energy';
import { developmentIdentityToken } from '../../../server/identity/authentication';
import { DaoPillarClientProvider, createHttpDaoPillarClient } from '@seihouse/library/dao-pillar';
import { createLocalDaoPillarClient } from '../dao-pillar/localDaoPillarClient';
import { type AppUser } from '@seihouse/library/profile';
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

const entry = workshopEntries.find(candidate => candidate.id === 'user-profile')!;

const MAX_LOGGED_ACTIONS = 8;

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
  }), [previewState, logExcludedAction, reportProfile]);

  const currentUser = scenario.currentUser ?? linkedAccount;
  // Energy is never mocked: the Development pane reads the real server-owned
  // ledger behind `/api/energy`, identified as the scenario's account.
  const currentUid = currentUser?.uid ?? null;
  useEffect(() => {
    // Switch the companion's Energy identity immediately, before the delayed profile fixture loads.
    reportProfile?.({ uid: currentUid, familiarId: PREVIEW_FAMILIAR_ID });
  }, [currentUid, reportProfile]);
  const energyClient = useMemo(
    () => createHttpEnergyClient({ token: () => (currentUid ? developmentIdentityToken(currentUid) : null) }),
    [currentUid],
  );

  // The Daily Dao Pillar reads the real server-owned calendar behind
  // `/api/dao-pillar` for the same account. The three claim scenarios stand
  // in an in-process calendar instead so their outcomes are reproducible.
  const daoPillarClient = useMemo(() => {
    if (!currentUid) return createHttpDaoPillarClient({ token: () => null });
    if (previewState === 'claim-failed') return createLocalDaoPillarClient({ uid: currentUid, mode: 'claim-failed', collectedDays: [9, 10, 11, 12] });
    if (previewState === 'claim-unresolved') return createLocalDaoPillarClient({ uid: currentUid, mode: 'claim-unresolved', collectedDays: [9, 10, 11, 12] });
    if (previewState === 'collected-today') return createLocalDaoPillarClient({ uid: currentUid, collectedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], collectedToday: true });
    return createHttpDaoPillarClient({ token: () => developmentIdentityToken(currentUid) });
  }, [currentUid, previewState]);

  const qiClient = useMemo(() => {
    if ('repository' in daoPillarClient && currentUid) {
      const local = daoPillarClient as ReturnType<typeof createLocalDaoPillarClient>;
      return { async getSnapshot() {
        await local.getCalendar().catch(() => undefined);
        const result = await handleQiHttp({ method: 'GET' }, { ledger: local.repository.qi, resolvePrincipal: async () => ({ uid: currentUid, role: 'user', identity: 'development', developmentAccess: true }) });
        if (result.status !== 200 || !('balance' in result.body)) throw new Error('Preview cultivation unavailable.');
        return result.body;
      } };
    }
    return createHttpQiClient({ endpoint: '/api/library-economy?capability=cultivation', token: () => currentUid ? developmentIdentityToken(currentUid) : null });
  }, [daoPillarClient, currentUid]);

  const renderPane = (Component: typeof DevelopmentUserProfile, pane: string) => (
    // Remounting on scenario change throws away the mock's in-memory account
    // state, so each scenario starts from its own snapshot rather than
    // inheriting edits made in the previous one.
    <div key={`${pane}-${previewState}-${currentUser?.uid ?? 'anonymous'}`} className="pb-16">
      <UserProfileServicesProvider services={pane === 'development' ? developmentServices : services}>
        <EnergyClientProvider client={pane === 'development' ? energyClient : null}>
        <DaoPillarClientProvider client={pane === 'development' ? daoPillarClient : null}>
        <QiClientProvider client={pane === 'development' ? qiClient : null}>
        <Component
          currentUser={currentUser}
          stories={scenario.stories}
          {...(pane === 'development' ? { publicCreators: previewPublicCreators(scenario.profile), accountControls: {
            inboxUnreadCount: currentUser ? 2 : 0,
          } } : {})}
          onLogout={() => {
            logExcludedAction('Sign out — mock account unlinked locally instead');
            setLinkedAccount(null);
            if (pane === 'development') reportProfile?.({ uid: null });
            if (scenario.currentUser) setPreviewState('signed-out');
          }}
          onNavigateHome={() => logExcludedAction('Navigate to Library home (production router)')}
          onNavigateLibrary={navigateLibraryPreview}
        />
        </QiClientProvider>
        </DaoPillarClientProvider>
        </EnergyClientProvider>
      </UserProfileServicesProvider>

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

  if (embedded) return <ProductFamiliarSurface headerRecall bottomInset={72}>{renderPane(DevelopmentUserProfile, 'development')}</ProductFamiliarSurface>;

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        description:
          'Each scenario fixes the account and its profile snapshot. Everything inside a scenario — the Cave destinations, Settings edits, check-in, attunement, offerings, portrait generation, admin edits — runs for real against local state.',
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
      renderReference={() => renderPane(ReferenceUserProfile, 'reference')}
      renderDevelopment={() => <ProductFamiliarSurface headerRecall bottomInset={72}>{renderPane(DevelopmentUserProfile, 'development')}</ProductFamiliarSurface>}
    />
  );
}
